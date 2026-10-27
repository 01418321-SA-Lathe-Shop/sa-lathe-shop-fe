import { termsFor } from '../quotations/helpers.ts';
import { visibleRequest } from '../requests/helpers.ts';
// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { find,notFound,type Context,type Json } from "../../core/mock-backend.ts";
export const jobView = (j: Json) => ({ id: j.id, quotation_id: j.quotation_id, request_id: j.request_id, status: j.status, deposit_amount: j.deposit_amount, balance: j.balance, due_at: j.due_at ?? null, created_at: j.created_at });

export function fulfillmentState(c: Context, quotationId: string) {
    const quotation = find(c.db.quotations, quotationId, "Quotation");
    const request = visibleRequest(c, String(quotation.request_id));
    const state = c.db.fulfillments.get(quotationId);
    if (!state)
        throw notFound("Fulfillment");
    const terms = state.terms as ReturnType<typeof termsFor>;
    const evidence = c.db.evidence.filter((e) => e.quotation_id === quotationId);
    const job = c.db.jobs.find((j) => j.quotation_id === quotationId);
    // Backend worker expires missing/rejected requirements after the deadline.
    if (!job && !state.canceled_at && c.now.getTime() > Date.parse(terms.documents_due_at)) {
        const missing = (["deposit", "po"] as const).some((kind) => (kind === "deposit" ? terms.deposit_required : terms.po_required) && !evidence.some((e) => e.kind === kind && e.status !== "rejected"));
        if (missing) {
            state.canceled_at = terms.documents_due_at;
            request.status = "canceled";
        }
    }
    return { quotation, request, state, terms, evidence, job };
}

export function fulfillmentView(c: Context, quotationId: string) {
    const { request, state, terms, evidence, job } = fulfillmentState(c, quotationId);
    return { quotation_id: quotationId, request_status: request.status, terms, evidence: evidence.slice(-100), job: job ? jobView(job) : null, canceled_at: state.canceled_at ?? null };
}
