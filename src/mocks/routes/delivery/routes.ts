// Mock UC8 production/usage/time/photos and UC9 delivery, invoices,
// installment payments and pre-acceptance free rework (backend UC8/UC9.md).
import { activeIds,completeUpload,conflict,downloadLink,fields,idempotent,instant,invalid,isUuid,next,notFound,notify,page,publicFile,route,startUpload,text,uuid,type Route } from "../../core/mock-backend.ts";

import { memberIds } from '../memberships/helpers.ts';

import { prod,productionEvent,requestOf,scopedJob } from '../production/helpers.ts';
import { amountWithin,fulfillmentCommand,fulfillmentEvent,fulfillmentView,paymentEvidence } from './helpers.ts';

export const deliveryRoutes: Route[] = [
// ----- UC9 delivery, invoice, payments and rework -----
route("GET", "/fulfillment/jobs", "session", (c) => {
    const visible = c.db.jobs.filter((j) => { const r = c.db.requests.find((x) => x.id === j.request_id); return c.actor.role !== "customer" || (r && memberIds(c.db, String(r.customer_id)).includes(c.actor.id)); });
    return { items: page(visible.slice().reverse(), c.query, 25).map((j) => fulfillmentView(c, j)) };
}),
route("GET", "/fulfillment/jobs/:id", "session", (c) => fulfillmentView(c, scopedJob(c))),
route("PUT", "/fulfillment/jobs/:id/credit-terms", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "credit_days"]);
    return idempotent(c, `uc9-terms:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "terms");
        const days = c.body.credit_days;
        if (job.status !== "completed" || d.invoice || d.credit_days !== undefined)
            throw conflict("Terms need a completed job without terms or invoice");
        if (typeof days !== "number" || !Number.isInteger(days) || days < 0 || days > 36500)
            throw invalid("credit_days must be an integer 0–36500");
        d.credit_days = days;
        fulfillmentEvent(c, job, "terms");
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/invoice", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version"]);
    return idempotent(c, `uc9-invoice:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "invoice");
        if (job.status !== "completed" || d.invoice || d.credit_days === undefined)
            throw conflict("Invoice needs a completed job with Admin credit terms");
        d.invoice = { id: uuid(), number: `INV-${next(c.db, "invoice")}`, amount: job.balance, credit_days: d.credit_days, issued_at: c.now.toISOString(), due_at: new Date(c.now.getTime() + d.credit_days * 86400000).toISOString() };
        fulfillmentEvent(c, job, "invoice");
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/deliveries", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "method", "receiver_name"]);
    return idempotent(c, `uc9-ship:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "ship");
        const last = d.deliveries.at(-1);
        if (job.status !== "completed" || !d.invoice || (last && last.status !== "returned"))
            throw conflict("Shipping needs a completed job, an invoice and no open delivery");
        if (c.body.method !== "self" && c.body.method !== "third_party")
            throw invalid("method must be self or third_party");
        d.deliveries.push({ id: uuid(), cycle: prod(job).cycle, method: c.body.method, receiver_name: text(c.body.receiver_name, "receiver_name", { max: 200 }), status: "shipping", shipped_at: c.now.toISOString(), reason: "" });
        fulfillmentEvent(c, job, "ship");
        notify(c.db, memberIds(c.db, String(requestOf(c, job).customer_id)), String(job.request_id), "Your order has been shipped. Please inspect it.");
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/inspection", ["customer"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "outcome", "reason"]);
    return idempotent(c, `uc9-inspect:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "inspect");
        const last = d.deliveries.at(-1);
        if (job.status !== "completed" || last?.status !== "shipping")
            throw conflict("There is no shipment awaiting inspection");
        if (c.body.outcome === "accept") {
            if (c.body.reason !== undefined && c.body.reason !== "")
                throw invalid("Acceptance takes no reason");
            Object.assign(last, { status: "delivered", decided_at: c.now.toISOString(), decided_by: c.actor.id });
        }
        else if (c.body.outcome === "return") {
            Object.assign(last, { status: "returned", decided_at: c.now.toISOString(), decided_by: c.actor.id, reason: text(c.body.reason, "reason") });
            const p = prod(job);
            d.rework.push({ cycle: p.cycle, started_at: p.started_at, completed_at: p.completed_at, reopened_at: c.now.toISOString(), delivery_id: last.id });
            job.status = "in_progress";
            p.cycle += 1;
            p.completed_at = undefined;
            productionEvent(c, job, "reopen");
        }
        else
            throw invalid("outcome must be accept or return");
        fulfillmentEvent(c, job, c.body.outcome === "accept" ? "accept" : "return");
        notify(c.db, activeIds(c.db, "admin"), String(job.request_id), `Customer ${c.body.outcome === "accept" ? "accepted" : "returned"} the delivery`);
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/payments/bank", ["customer"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "amount", "paid_at", "evidence_id"]);
    return idempotent(c, `uc9-bank:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "bank");
        const amount = amountWithin(d, c.body.amount);
        const paid_at = instant(c.body.paid_at, "paid_at", { now: c.now });
        const evidence_id = paymentEvidence(c, job, c.body.evidence_id, true);
        d.payments.push({ id: uuid(), submitted_by: c.actor.id, method: "bank", amount, paid_at, status: "pending", evidence_id, reason: "" });
        fulfillmentEvent(c, job, "bank");
        notify(c.db, activeIds(c.db, "admin"), String(job.request_id), "A bank payment proof is waiting for review");
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/payments/cash", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "amount", "paid_at", "evidence_id"]);
    return idempotent(c, `uc9-cash:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "cash");
        const amount = amountWithin(d, c.body.amount);
        const paid_at = instant(c.body.paid_at, "paid_at", { now: c.now });
        const evidence_id = c.body.evidence_id === undefined || c.body.evidence_id === "" ? undefined : paymentEvidence(c, job, c.body.evidence_id, true);
        d.payments.push({ id: uuid(), submitted_by: c.actor.id, method: "cash", amount, paid_at, status: "approved", ...(evidence_id ? { evidence_id } : {}), reason: "", reviewed_by: c.actor.id });
        fulfillmentEvent(c, job, "cash");
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/payments/review", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "payment_id", "outcome", "reason"]);
    return idempotent(c, `uc9-review:${c.p.id}`, () => {
        const { job, d } = fulfillmentCommand(c, "review");
        const payment = d.payments.find((x) => x.id === c.body.payment_id);
        if (!payment)
            throw notFound("Payment");
        if (payment.status !== "pending")
            throw conflict("This payment was already reviewed");
        if (c.body.outcome === "approved") {
            if (c.body.reason)
                throw invalid("Approval takes no reason");
            amountWithin(d, payment.amount);
            Object.assign(payment, { status: "approved", reviewed_by: c.actor.id });
        }
        else if (c.body.outcome === "rejected")
            Object.assign(payment, { status: "rejected", reason: text(c.body.reason, "reason"), reviewed_by: c.actor.id });
        else
            throw invalid("outcome must be approved or rejected");
        fulfillmentEvent(c, job, "review");
        notify(c.db, [String(payment.submitted_by)], String(job.request_id), `Payment ${c.body.outcome}`);
        return fulfillmentView(c, job);
    });
}),
route("POST", "/fulfillment/jobs/:id/evidence/uploads", ["customer", "admin"], (c) => { const job = scopedJob(c); return startUpload(c, "customer-evidence", { job_id: job.id }); }),
route("POST", "/customer-evidence/:id/complete", ["customer", "admin"], (c) => publicFile(completeUpload(c, c.p.id, "customer-evidence"))),
route("GET", "/customer-evidence/:id/download", ["customer", "admin"], (c) => {
    const f = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined;
    if (!f || f.kind !== "customer-evidence" || (c.actor.role === "customer" && f.uploaded_by !== c.actor.id))
        throw notFound("Evidence");
    return downloadLink(c, f);
})
];
