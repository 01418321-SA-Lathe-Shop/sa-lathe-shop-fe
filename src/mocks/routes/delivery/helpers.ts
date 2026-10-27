import { prod,requestOf,scopedJob,ZERO } from '../production/helpers.ts';
// Mock UC8 production/usage/time/photos and UC9 delivery, invoices,
// installment payments and pre-acceptance free rework (backend UC8/UC9.md).
import { conflict,invalid,isUuid,uuid,version,type Context,type Json } from "../../core/mock-backend.ts";
import { fmt2,satang } from "../../core/mock-decimal.ts";


export type Delivery = {
    version: number;
    credit_days?: number;
    invoice?: Json;
    deliveries: Json[];
    payments: Json[];
    events: Json[];
    rework: Json[];
};

export function invoiceView(d: Delivery) {
    if (!d.invoice)
        return undefined;
    const amount = satang(d.invoice.amount);
    const paid = d.payments.filter((x) => x.status === "approved").reduce((sum, x) => sum + satang(x.amount), ZERO);
    return { ...d.invoice, paid: fmt2(paid), balance: fmt2(amount - paid), status: paid === amount ? "paid" : paid > ZERO ? "partial" : "unpaid" };
}

export function fulfillmentView(c: Context, job: Json) {
    const d = job.delivery as Delivery;
    const request = requestOf(c, job);
    return { job_id: job.id, request_id: job.request_id, job_status: job.status, request_status: request?.status, version: d.version, cycle: prod(job).cycle, ...(d.credit_days !== undefined ? { credit_days: d.credit_days } : {}), opening_balance: job.balance, deposit: job.deposit_amount, ...(d.invoice ? { invoice: invoiceView(d) } : {}), deliveries: d.deliveries, ...(c.actor.role === "worker" ? {} : { payments: d.payments }), events: d.events, rework_history: d.rework };
}

export function fulfillmentCommand(c: Context, kind: string): {
    job: Json;
    d: Delivery;
} {
    const job = scopedJob(c);
    const d = job.delivery as Delivery;
    const request = requestOf(c, job);
    const lateRejection = request?.status === "completed" && kind === "review" && c.body.outcome === "rejected";
    if ((request?.status !== "ongoing" && !lateRejection) || version(c.body.expected_version) !== d.version)
        throw conflict();
    return { job, d };
}

export function fulfillmentEvent(c: Context, job: Json, action: string) {
    const d = job.delivery as Delivery;
    d.version += 1;
    d.events.push({ id: uuid(), action, version: d.version, actor_id: c.actor.id, created_at: c.now.toISOString() });
    const invoice = invoiceView(d);
    const last = d.deliveries.at(-1);
    if (invoice?.balance === "0.00" && last?.status === "delivered" && job.status === "completed") {
        const r = requestOf(c, job);
        if (r)
            r.status = "completed";
    }
}

export function amountWithin(d: Delivery, value: unknown): string {
    const invoice = invoiceView(d);
    if (!invoice)
        throw conflict("No invoice has been issued");
    const amount = satang(value, { positive: true });
    if (amount > satang(invoice.balance))
        throw conflict("Amount exceeds the remaining invoice balance");
    return fmt2(amount);
}

export function paymentEvidence(c: Context, job: Json, id: unknown, requireOwn: boolean) {
    const file = isUuid(id) ? c.db.files.get(id) : undefined;
    if (!file || file.kind !== "customer-evidence" || file.job_id !== job.id || file.state !== "ready" || (requireOwn && file.uploaded_by !== c.actor.id))
        throw invalid("evidence_id must be your ready payment evidence for this job");
    if ((job.delivery as Delivery).payments.some((x) => x.evidence_id === file.id))
        throw conflict("Each proof can be used once; upload a new file");
    return String(file.id);
}
