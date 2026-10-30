// Dashboard figures worked out from existing list reads. Nothing here is stored
// or estimated; an unreadable amount yields null rather than a smaller total.
import type { JobRequest } from "../../lib/api/types.ts";
import { requestedDayCountdown, type Countdown } from "../../components/staff-ui/staff-format.ts";
import type { InventoryMaterial } from "../inventory/inventory-domain.ts";
import type { FulfillmentJob } from "../delivery/delivery-domain.ts";
import type { ProductionSummary } from "../production/production-list-domain.ts";
import { satang, type RequestRecord } from "../requests/request-stage-domain.ts";

/** The backend has no minimum-stock field, so the only real alert is nothing left to use. */
export function stockOuts(materials: InventoryMaterial[]): InventoryMaterial[] {
  return materials.filter((item) => item.is_active && /^0+(\.0+)?$/.test(item.qty_available)).sort((a, b) => a.name.localeCompare(b.name, "th-TH"));
}

export type UpcomingJob = { job: ProductionSummary; request: JobRequest; countdown: Countdown | null };
/** Open jobs by the date the customer asked for (not a shop-confirmed due date), soonest first. */
export function upcomingJobs(jobs: ProductionSummary[], requests: JobRequest[], now: number | null): { rows: UpcomingJob[]; overdue: number } {
  const byId = new Map(requests.map((request) => [request.id, request]));
  const rows = jobs.flatMap((job): UpcomingJob[] => {
    const request = byId.get(job.request_id);
    return (job.status === "queued" || job.status === "in_progress") && request?.deadline ? [{ job, request, countdown: requestedDayCountdown(request.deadline, now) }] : [];
  }).sort((a, b) => Date.parse(a.request.deadline!) - Date.parse(b.request.deadline!));
  return { rows, overdue: rows.filter((row) => row.countdown?.tone === "danger").length };
}

const baht = (value: bigint) => `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
export type PaymentSummary = { invoices: number; invoiced: string; paid: string; balance: string; overdue: number; overdueBalance: string; pendingPayments: number };
export function paymentSummary(jobs: FulfillmentJob[], now: number | null): PaymentSummary | null {
  let invoices = 0, invoiced = BigInt(0), paid = BigInt(0), balance = BigInt(0), overdue = 0, overdueBalance = BigInt(0), pendingPayments = 0;
  for (const job of jobs) {
    pendingPayments += job.payments?.filter((payment) => payment.status === "pending").length ?? 0;
    if (!job.invoice) continue;
    const [amount, received, left] = [satang(job.invoice.amount), satang(job.invoice.paid), satang(job.invoice.balance)];
    if (amount === null || received === null || left === null) return null;
    invoices++; invoiced += amount; paid += received; balance += left;
    if (left > BigInt(0) && now !== null && Date.parse(job.invoice.due_at) < now) { overdue++; overdueBalance += left; }
  }
  return { invoices, invoiced: baht(invoiced), paid: baht(paid), balance: baht(balance), overdue, overdueBalance: baht(overdueBalance), pendingPayments };
}

export type EvidenceCounts = Record<"pending" | "approved" | "rejected", number>;
/** Deposit and PO submissions on requests still in the Deposit/PO step or later; closed requests load no evidence. */
export function evidenceSummary(records: RequestRecord[]): Record<"deposit" | "po", EvidenceCounts> {
  const counts = { deposit: { pending: 0, approved: 0, rejected: 0 }, po: { pending: 0, approved: 0, rejected: 0 } };
  for (const record of records) for (const item of record.fulfillment?.evidence ?? []) counts[item.kind][item.status]++;
  return counts;
}

/** `/customers` is Customer-only, so Admin can only count customers that appear on requests. */
export const customersOnRequests = (requests: JobRequest[]) => new Set(requests.map((request) => request.customer_id)).size;
