import { moneyInput } from "../../lib/api/backend-api.ts";
import type { FulfillmentJob, Invoice, Payment } from "../delivery/delivery-domain.ts";
import { INVOICE_LABELS } from "./customer-domain.ts";
import { dueState, invoiceTotal } from "./customer-overview-domain.ts";

// Presentation-only projections for the Customer invoice screens. Money stays in
// exact cents (BigInt); nothing here changes what the server accepts or returns.
const cents = (value: string) => /^\d+\.\d{2}$/.test(value) ? BigInt(value.replace(".", "")) : null;
const money = (value: bigint) => `${value / BigInt(100)}.${String(value % BigInt(100)).padStart(2, "0")}`;
const bangkokDay = (instant: number) => Math.floor((instant + 7 * 3600000) / 86400000);

function sumCents(values: string[]): string | undefined {
  let total = BigInt(0);
  for (const value of values) {
    const amount = cents(value);
    if (amount === null) return undefined;
    total += amount;
  }
  return money(total);
}

/** Whole percent of the invoice amount already approved; pending proof is excluded. */
export function paidPercent(invoice: Pick<Invoice, "amount" | "paid" | "status">): number | null {
  const amount = cents(invoice.amount); const paid = cents(invoice.paid);
  if (amount === null || paid === null) return null;
  if (amount === BigInt(0)) return invoice.status === "paid" ? 100 : 0;
  const percent = Number(paid * BigInt(100) / amount);
  return Math.min(100, Math.max(0, percent));
}

/** Due-date wording that matches the overview, plus a Bangkok calendar-day count. */
export function dueCountdown(invoice: Pick<Invoice, "due_at" | "status">, now: number | null): { text: string; tone: "danger" | "today" | "quiet" } | null {
  if (invoice.status === "paid" || now === null || !Number.isFinite(Date.parse(invoice.due_at))) return null;
  const state = dueState(invoice.due_at, now);
  const days = bangkokDay(Date.parse(invoice.due_at)) - bangkokDay(now);
  if (state === "เกินกำหนด") return { text: days < 0 ? `เกินกำหนด ${-days} วัน` : "เกินกำหนด", tone: "danger" };
  if (state === "ครบกำหนดวันนี้") return { text: state, tone: "today" };
  return { text: `อีก ${days} วัน`, tone: "quiet" };
}

/** Sum of pending proof amounts; these do not reduce the balance until approved. */
export function pendingAmount(payments: Pick<Payment, "status" | "amount">[] | null | undefined): string | undefined {
  let total = BigInt(0);
  for (const payment of payments ?? []) {
    if (payment.status !== "pending") continue;
    const value = cents(payment.amount);
    if (value === null) return undefined;
    total += value;
  }
  return money(total);
}

export function invoicedJobs(jobs: FulfillmentJob[], status = "") {
  return jobs.filter((job) => job.invoice && (!status || job.invoice.status === status));
}

export function invoiceStatusCounts(jobs: FulfillmentJob[]) {
  const invoiced = invoicedJobs(jobs);
  const byStatus = Object.fromEntries(Object.keys(INVOICE_LABELS).map((status) => [status, 0]));
  for (const job of invoiced) if (Object.hasOwn(byStatus, job.invoice!.status)) byStatus[job.invoice!.status]++;
  return { all: invoiced.length, byStatus };
}

/** Loaded-data summary: outstanding balance, unpaid invoices, overdue and pending-proof counts. */
export function invoiceSummary(jobs: FulfillmentJob[], now: number | null) {
  const open = invoicedJobs(jobs).filter((job) => job.invoice!.status !== "paid");
  return {
    outstanding: invoiceTotal(open),
    open: open.length,
    overdue: now === null ? null : open.filter((job) => dueCountdown(job.invoice!, now)?.tone === "danger").length,
    pending: invoicedJobs(jobs).filter((job) => job.payments?.some((payment) => payment.status === "pending")).length,
    paid: sumCents(invoicedJobs(jobs).map((job) => job.invoice!.paid)),
  };
}

export type LedgerRow = { key: string; job: FulfillmentJob; kind: "deposit" | "invoice"; reference?: string; amount: string; paidAt?: string; method?: Payment["method"]; status: Payment["status"]; hasEvidence: boolean };

/** One row per approved deposit or invoice payment, newest first. The API gives a job's deposit no date, so those rows sort last. */
export function paymentLedger(jobs: FulfillmentJob[]): LedgerRow[] {
  const rows = jobs.flatMap((job): LedgerRow[] => [
    ...(cents(job.deposit) ? [{ key: `deposit:${job.job_id}`, job, kind: "deposit" as const, amount: job.deposit, status: "approved" as const, hasEvidence: true }] : []),
    ...(job.payments ?? []).map((payment) => ({ key: payment.id, job, kind: "invoice" as const, reference: payment.id.slice(0, 8).toUpperCase(), amount: payment.amount, paidAt: payment.paid_at, method: payment.method, status: payment.status, hasEvidence: Boolean(payment.evidence_id) })),
  ]);
  return rows.sort((a, b) => (Date.parse(b.paidAt ?? "") || 0) - (Date.parse(a.paidAt ?? "") || 0));
}

/** Inline guidance while typing; the submit path still runs paymentPayload unchanged. */
export function amountFeedback(input: string, balance: string): { amount?: string; problem?: string } {
  const value = input.trim();
  if (!value) return {};
  let amount: string;
  try { amount = moneyInput(value); } catch { return { problem: "กรอกเป็นตัวเลข เช่น 1500 หรือ 1500.50 ไม่ต้องใส่จุลภาค" }; }
  const typed = cents(amount)!; const limit = cents(balance);
  if (typed === BigInt(0)) return { problem: "จำนวนเงินต้องมากกว่า 0 บาท" };
  if (limit !== null && typed > limit) return { problem: "เกินยอดคงเหลือ ระบบไม่รับชำระเกินยอด" };
  return { amount };
}
