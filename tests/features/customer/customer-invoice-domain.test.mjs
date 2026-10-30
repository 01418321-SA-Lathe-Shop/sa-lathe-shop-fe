import test from "node:test";
import assert from "node:assert/strict";
import { amountFeedback, dueCountdown, invoicedJobs, paymentLedger, invoiceStatusCounts, invoiceSummary, paidPercent, pendingAmount } from "../../../src/features/customer/customer-invoice-domain.ts";

const now = Date.parse("2026-10-29T05:00:00Z"); // 12:00 Bangkok
const invoice = (status, balance, due_at, extra = {}) => ({ id: status, number: `INV-${status}`, amount: "10000.00", paid: "0.00", balance, status, credit_days: 30, issued_at: "2026-10-01T00:00:00Z", due_at, ...extra });
const jobs = [
  { job_id: "j1", invoice: invoice("unpaid", "10000.00", "2026-10-27T10:00:00Z"), payments: [] },
  { job_id: "j2", invoice: invoice("partial", "2500.50", "2026-11-03T10:00:00Z", { paid: "7499.50" }), payments: [{ status: "pending", amount: "1000.25" }, { status: "pending", amount: "0.25" }, { status: "approved", amount: "7499.50" }] },
  { job_id: "j3", invoice: invoice("paid", "0.00", "2026-10-01T00:00:00Z", { paid: "10000.00" }), payments: [] },
  { job_id: "j4", payments: [] },
];

test("paid share uses exact approved cents and ignores pending proof", () => {
  assert.equal(paidPercent(jobs[1].invoice), 74);
  assert.equal(paidPercent(jobs[2].invoice), 100);
  assert.equal(paidPercent({ amount: "0.00", paid: "0.00", status: "unpaid" }), 0);
  assert.equal(paidPercent({ amount: "bad", paid: "0.00", status: "unpaid" }), null);
});

test("due countdown counts Bangkok calendar days and matches overview overdue wording", () => {
  assert.deepEqual(dueCountdown(jobs[0].invoice, now), { text: "เกินกำหนด 2 วัน", tone: "danger" });
  assert.deepEqual(dueCountdown(jobs[1].invoice, now), { text: "อีก 5 วัน", tone: "quiet" });
  assert.deepEqual(dueCountdown({ status: "unpaid", due_at: "2026-10-29T16:00:00Z" }, now), { text: "ครบกำหนดวันนี้", tone: "today" });
  assert.equal(dueCountdown(jobs[2].invoice, now), null);
  assert.equal(dueCountdown(jobs[0].invoice, null), null);
});

test("summary and counts cover only invoiced jobs and keep exact totals", () => {
  assert.deepEqual(invoicedJobs(jobs, "partial").map((job) => job.job_id), ["j2"]);
  assert.deepEqual(invoiceStatusCounts(jobs), { all: 3, byStatus: { unpaid: 1, partial: 1, paid: 1 } });
  assert.deepEqual(invoiceSummary(jobs, now), { outstanding: "12500.50", open: 2, overdue: 1, pending: 1, paid: "17499.50" });
  assert.equal(invoiceSummary(jobs, null).overdue, null);
  assert.equal(pendingAmount(jobs[1].payments), "1000.50");
  assert.equal(pendingAmount([{ status: "pending", amount: "1e3" }]), undefined);
});

test("amount guidance mirrors the payload limits without changing them", () => {
  assert.deepEqual(amountFeedback("", "2500.50"), {});
  assert.deepEqual(amountFeedback(" 2500.5 ", "2500.50"), { amount: "2500.50" });
  assert.match(amountFeedback("2500.51", "2500.50").problem, /เกินยอดคงเหลือ/);
  assert.match(amountFeedback("0", "2500.50").problem, /มากกว่า 0/);
  assert.match(amountFeedback("1,500", "2500.50").problem, /จุลภาค/);
});

test("payment ledger lists approved deposits and invoice payments newest first, with no invented deposit date", () => {
  const rows = paymentLedger([
    { job_id: "a", deposit: "500.00", payments: [{ id: "abcdef12-x", amount: "100.00", paid_at: "2026-10-01T00:00:00Z", method: "bank", status: "pending", evidence_id: "e" }, { id: "22222222-x", amount: "50.00", paid_at: "2026-10-05T00:00:00Z", method: "cash", status: "approved" }] },
    { job_id: "b", deposit: "0.00", payments: null },
  ]);
  assert.deepEqual(rows.map((row) => [row.kind, row.reference, row.amount, row.hasEvidence]), [["invoice", "22222222", "50.00", false], ["invoice", "ABCDEF12", "100.00", true], ["deposit", undefined, "500.00", true]]);
  assert.equal(rows[2].paidAt, undefined);
  assert.equal(rows[2].status, "approved");
});
