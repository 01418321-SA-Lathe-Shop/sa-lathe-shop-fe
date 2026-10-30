import assert from "node:assert/strict";
import test from "node:test";
import { customersOnRequests, evidenceSummary, paymentSummary, stockOuts, upcomingJobs } from "../../../src/features/staff-overview/overview-insights-domain.ts";

const NOW = Date.parse("2026-10-30T05:00:00Z");
const invoice = (amount, paid, balance, due_at) => ({ amount, paid, balance, due_at });

test("payment totals stay exact and only unpaid past-due invoices count as overdue", () => {
  const summary = paymentSummary([
    { invoice: invoice("0.10", "0.00", "0.10", "2026-10-01T00:00:00Z"), payments: [{ status: "pending" }, { status: "approved" }] },
    { invoice: invoice("0.20", "0.20", "0.00", "2026-10-01T00:00:00Z") },
    { invoice: invoice("100.00", "40.00", "60.00", "2026-12-01T00:00:00Z") },
    { deliveries: [] },
  ], NOW);
  assert.deepEqual(summary, { invoices: 3, invoiced: "100.30", paid: "40.20", balance: "60.10", overdue: 1, overdueBalance: "0.10", pendingPayments: 1 });
});

test("an unreadable amount gives no total rather than a smaller one", () => {
  assert.equal(paymentSummary([{ invoice: invoice("x", "0.00", "0.00", "2026-10-01T00:00:00Z") }], NOW), null);
});

test("stock alert lists only active materials with nothing available", () => {
  const item = (name, qty_available, is_active = true) => ({ name, qty_available, is_active });
  assert.deepEqual(stockOuts([item("B", "0.000000"), item("A", "0.000000"), item("C", "0.000001"), item("D", "0.000000", false)]).map((row) => row.name), ["A", "B"]);
});

test("upcoming jobs keep open dated work, soonest first, and count overdue", () => {
  const requests = [{ id: "r1", deadline: "2026-11-05T00:00:00+07:00" }, { id: "r2", deadline: "2026-10-20T00:00:00+07:00" }, { id: "r3" }, { id: "r4", deadline: "2026-10-01T00:00:00+07:00" }];
  const jobs = [{ job_id: "j1", request_id: "r1", status: "queued" }, { job_id: "j2", request_id: "r2", status: "in_progress" }, { job_id: "j3", request_id: "r3", status: "queued" }, { job_id: "j4", request_id: "r4", status: "completed" }];
  const result = upcomingJobs(jobs, requests, NOW);
  assert.deepEqual(result.rows.map((row) => row.job.job_id), ["j2", "j1"]);
  assert.equal(result.overdue, 1);
});

test("customer count and evidence counts come straight from the records", () => {
  assert.equal(customersOnRequests([{ customer_id: "a" }, { customer_id: "a" }, { customer_id: "b" }]), 2);
  const counts = evidenceSummary([{ fulfillment: { evidence: [{ kind: "po", status: "pending" }, { kind: "deposit", status: "approved" }] } }, { fulfillment: { evidence: null } }, {}]);
  assert.deepEqual(counts, { deposit: { pending: 0, approved: 1, rejected: 0 }, po: { pending: 1, approved: 0, rejected: 0 } });
});
