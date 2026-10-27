// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { activeIds,conflict,fields,find,invalid,next,notify,page,route,text,uuid,version,type Route } from "../../core/mock-backend.ts";
import { memberIds } from '../memberships/helpers.ts';
import { visibleRequest } from '../requests/helpers.ts';
import { costs,priced,quotationView,termsFor } from './helpers.ts';

export const quotationsRoutes: Route[] = [
// ----- UC2 quotations -----
route("POST", "/quotations/estimate", ["worker"], (c) => { fields(c.body, ["material_cost", "labor_cost"]); return costs(c).estimate; }),
route("GET", "/requests/:id/quotations", "session", (c) => {
    visibleRequest(c, c.p.id);
    const items = c.db.quotations.filter((q) => q.request_id === c.p.id && (c.actor.role !== "customer" || q.status !== "draft")).slice().reverse();
    return { items: page(items, c.query).map((q) => quotationView(q, c.actor.role)), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) };
}),
route("POST", "/requests/:id/quotations", ["worker"], (c) => {
    fields(c.body, ["material_cost", "labor_cost", "final_price"]);
    const request = visibleRequest(c, c.p.id);
    if (request.status === "canceled" || request.status === "completed")
        throw conflict("Request is closed");
    const existing = c.db.quotations.filter((q) => q.request_id === request.id);
    if (existing.some((q) => ["draft", "sent", "approved"].includes(String(q.status))))
        throw conflict("Only one draft/sent/approved quotation may exist");
    const quotation = { id: uuid(), request_id: request.id, quotation_no: next(c.db, "quotation"), version: existing.length + 1, lock_version: 1, status: "draft", ...priced(c), created_at: c.now.toISOString() };
    c.db.quotations.push(quotation);
    return quotationView(quotation, "worker");
}),
route("PATCH", "/quotations/:id", ["worker"], (c) => {
    fields(c.body, ["material_cost", "labor_cost", "final_price", "expected_lock_version"]);
    const quotation = find(c.db.quotations, c.p.id, "Quotation");
    if (quotation.status !== "draft" || version(c.body.expected_lock_version, "expected_lock_version") !== quotation.lock_version)
        throw conflict();
    Object.assign(quotation, priced(c), { lock_version: Number(quotation.lock_version) + 1 });
    return quotationView(quotation, "worker");
}),
route("POST", "/quotations/:id/send", ["worker"], (c) => {
    fields(c.body, ["expected_lock_version"]);
    const quotation = find(c.db.quotations, c.p.id, "Quotation");
    const request = visibleRequest(c, String(quotation.request_id));
    if (quotation.status !== "draft" || request.status === "canceled" || version(c.body.expected_lock_version, "expected_lock_version") !== quotation.lock_version)
        throw conflict();
    Object.assign(quotation, { status: "sent", sent_at: c.now.toISOString(), lock_version: Number(quotation.lock_version) + 1 });
    if (request.status === "pending")
        request.status = "ongoing";
    notify(c.db, memberIds(c.db, String(request.customer_id)), String(request.id), `Quotation #${quotation.quotation_no} is ready for review`);
    return quotationView(quotation, "worker");
}),
// ----- UC3 customer decisions -----
route("POST", "/quotations/:id/decision", ["customer"], (c) => {
    fields(c.body, ["outcome", "expected_lock_version", "reason"]);
    const quotation = find(c.db.quotations, c.p.id, "Quotation");
    const request = visibleRequest(c, String(quotation.request_id));
    if (quotation.status !== "sent" || request.status !== "ongoing" || version(c.body.expected_lock_version, "expected_lock_version") !== quotation.lock_version)
        throw conflict();
    const outcome = c.body.outcome;
    if (outcome !== "accept" && outcome !== "reject")
        throw invalid("outcome must be accept or reject");
    if (outcome === "accept" && c.body.reason !== undefined)
        throw invalid("Acceptance takes no reason");
    const reason = outcome === "reject" ? text(c.body.reason, "reason", { required: false }) : undefined;
    const previous = c.db.decisions.filter((d) => d.request_id === request.id && d.outcome === "reject").length;
    const rejection_count = previous + (outcome === "reject" ? 1 : 0);
    let terms: ReturnType<typeof termsFor> | undefined;
    quotation.lock_version = Number(quotation.lock_version) + 1;
    if (outcome === "accept") {
        quotation.status = "approved";
        const customer = c.db.customers.find((x) => x.id === request.customer_id);
        terms = termsFor(customer?.customer_type ?? "individual", String(quotation.final_price), c.now);
        c.db.fulfillments.set(String(quotation.id), { terms });
    }
    else {
        quotation.status = "rejected";
        if (rejection_count > 5)
            request.status = "canceled";
    }
    const decision = { quotation_id: quotation.id, request_id: request.id, actor_id: c.actor.id, outcome, ...(reason ? { reason } : {}), expected_lock_version: Number(quotation.lock_version) - 1, decided_at: c.now.toISOString(), rejection_count, request_status: request.status, ...(terms ? { terms } : {}) };
    c.db.decisions.push(decision);
    notify(c.db, [...activeIds(c.db, "worker"), ...activeIds(c.db, "admin")], String(request.id), `Customer ${outcome === "accept" ? "accepted" : "rejected"} quotation #${quotation.quotation_no}`);
    return decision;
}),
route("GET", "/requests/:id/quotation-decisions", "session", (c) => {
    visibleRequest(c, c.p.id);
    return { items: page(c.db.decisions.filter((d) => d.request_id === c.p.id).slice().reverse(), c.query), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) };
})
];
