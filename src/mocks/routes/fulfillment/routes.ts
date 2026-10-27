// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { activeIds,conflict,fields,find,idempotent,instant,invalid,isUuid,notify,route,text,uuid,version,type Route } from "../../core/mock-backend.ts";
import { fmt2,satang } from "../../core/mock-decimal.ts";
import { memberIds } from '../memberships/helpers.ts';
import { fulfillmentState,fulfillmentView } from './helpers.ts';

export const fulfillmentRoutes: Route[] = [
// ----- UC4 deposit / company PO evidence -----
route("GET", "/quotations/:id/fulfillment", "session", (c) => fulfillmentView(c, c.p.id)),
route("POST", "/quotations/:id/evidence", ["customer"], (c) => {
    fields(c.body, ["idempotency_key", "attachment_id", "kind", "amount", "paid_at"]);
    return idempotent(c, `evidence:${c.p.id}`, () => {
        const { request, state, terms, evidence, job } = fulfillmentState(c, c.p.id);
        if (job || state.canceled_at || request.status !== "ongoing" || c.now.getTime() > Date.parse(terms.documents_due_at))
            throw conflict("Submissions are closed for this quotation");
        const kind = c.body.kind;
        if (kind !== "deposit" && kind !== "po")
            throw invalid("kind must be deposit or po");
        if (!(kind === "deposit" ? terms.deposit_required : terms.po_required))
            throw invalid(`This quotation does not require ${kind}`);
        if (evidence.some((e) => e.kind === kind && e.status !== "rejected"))
            throw conflict(`An active ${kind} submission already exists`);
        const file = isUuid(c.body.attachment_id) ? c.db.files.get(c.body.attachment_id) : undefined;
        if (!file || file.kind !== "attachment" || file.request_id !== request.id || file.state !== "ready" || file.uploaded_by !== c.actor.id)
            throw invalid("attachment_id must be your ready file on this request");
        if (c.db.evidence.some((e) => e.attachment_id === file.id))
            throw conflict("This file was already submitted; upload a new one");
        let extra = {};
        if (kind === "deposit") {
            const amount = satang(c.body.amount);
            if (amount < satang(terms.deposit_amount) || amount > satang(terms.final_price))
                throw invalid("Deposit must be between the minimum and the full total");
            extra = { amount: fmt2(amount), paid_at: instant(c.body.paid_at, "paid_at", { now: c.now }) };
        }
        else if (c.body.amount !== undefined || c.body.paid_at !== undefined)
            throw invalid("PO evidence takes no amount or paid_at");
        const record = { id: uuid(), quotation_id: c.p.id, idempotency_key: c.body.idempotency_key, attachment_id: file.id, kind, ...extra, submitted_by: c.actor.id, status: "pending", version: 1, submitted_at: c.now.toISOString(), reviewed_by: null, reviewed_at: null };
        c.db.evidence.push(record);
        notify(c.db, [...activeIds(c.db, "worker"), ...activeIds(c.db, "admin")], String(request.id), `${kind === "po" ? "Company PO" : "Deposit"} evidence submitted`);
        return record;
    });
}),
route("POST", "/evidence/:id/review", ["worker", "admin"], (c) => {
    fields(c.body, ["outcome", "expected_version", "reason"]);
    const record = find(c.db.evidence, c.p.id, "Evidence");
    const { request, state, terms, evidence, job, quotation } = fulfillmentState(c, String(record.quotation_id));
    if (record.status !== "pending" || job || state.canceled_at || request.status !== "ongoing" || version(c.body.expected_version) !== record.version)
        throw conflict();
    if (c.body.outcome === "approved") {
        if (c.body.reason !== undefined)
            throw invalid("Approval takes no reason");
    }
    else if (c.body.outcome === "rejected")
        record.reason = text(c.body.reason, "reason");
    else
        throw invalid("outcome must be approved or rejected");
    Object.assign(record, { status: c.body.outcome, version: Number(record.version) + 1, reviewed_by: c.actor.id, reviewed_at: c.now.toISOString() });
    const approved = (kind: string) => evidence.find((e) => e.kind === kind && e.status === "approved");
    if ((!terms.deposit_required || approved("deposit")) && (!terms.po_required || approved("po"))) {
        const deposit = terms.deposit_required ? satang(approved("deposit")?.amount) : BigInt(0);
        c.db.jobs.push({ id: uuid(), quotation_id: quotation.id, request_id: request.id, status: "queued", deposit_amount: fmt2(deposit), balance: fmt2(satang(terms.final_price) - deposit), due_at: request.deadline ?? null, created_at: c.now.toISOString(), plan: { version: 0, lines: [] }, production: { version: 0, cycle: 1, events: [], usage: [], time: [] }, delivery: { version: 0, deliveries: [], payments: [], events: [], rework: [] } });
    }
    notify(c.db, memberIds(c.db, String(request.customer_id)), String(request.id), `Evidence ${c.body.outcome}`);
    return fulfillmentView(c, String(quotation.id));
})
];
