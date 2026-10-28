import test from "node:test";
import assert from "node:assert/strict";
import { overviewData, invoiceTotal, dueState } from "../../../src/features/customer/customer-overview-domain.ts";

const now = Date.parse("2026-10-28T06:00:00Z");
const request = { id: "r1", no_request: "9007199254740993", description: "เพลาตามแบบ", status: "ongoing", created_at: "2026-10-20T00:00:00Z" };
const quote = { id: "q1", quotation_no: 1, version: "9007199254740993", status: "approved", final_price: "10000.00", sent_at: "2026-10-21T00:00:00Z" };
const invoice = { id: "i1", number: "INV-1", balance: "8200.01", status: "partial", due_at: "2026-11-02T10:00:00Z", issued_at: "2026-10-27T00:00:00Z" };
const job = { job_id: "j1", request_id: "r1", request_status: "ongoing", job_status: "completed", invoice, deliveries: [{ id: "d1", status: "shipping", shipped_at: "2026-10-28T04:00:00Z" }], payments: [{ status: "pending", amount: "8200.01" }], rework_history: [], events: [] };
const record = { request, quotations: [quote] };

test("dashboard preserves existing action gates, exact references, invoice due and independent receipt/payment", () => {
  const data = overviewData([record], [job], now);
  assert.equal(data.attention.length, 2);
  assert(data.attention.some(a => a.action === "ตรวจรับงาน"));
  assert(data.attention.some(a => a.action === "ดูใบแจ้งหนี้" && a.due === invoice.due_at));
  assert.equal(data.work[0].reference, "คำขอ #9007199254740993");
  assert.equal(data.ready[0].href, "/customer/jobs?job=j1");
  assert.equal(invoiceTotal([job]), "8200.01"); // Pending proof never reduces a balance.
  assert.equal(overviewData([record], [{ ...job, request_status: "completed" }], now).attention.length, 0);
});

test("readiness uses actual production and latest delivery, never requested deadline as a promise", () => {
  const jobs = [job, { ...job, job_id: "delivered", deliveries: [{ status: "delivered" }] }, { ...job, job_id: "queued", job_status: "queued", deliveries: [] }, { ...job, job_id: "done", deliveries: [] }, { ...job, job_id: "rework", job_status: "in_progress", deliveries: [{ status: "returned" }] }];
  const data = overviewData([{ ...record, request: { ...request, deadline: "2026-10-29T01:00:00Z" } }], jobs, now);
  assert.deepEqual(data.ready.map(i => i.job.job_id), ["j1", "done"]);
  assert.equal(data.activeJobs.length, 5);
  assert(!("eta" in data.ready[0]));
});

test("deposit reminders respect approved terms and existing evidence; expired obligations are not new actions", () => {
  const fulfillment = { quotation_id: "q1", request_status: "ongoing", terms: { documents_due_at: "2026-11-01T00:00:00Z", deposit_required: true, po_required: true, deposit_amount: "5000.00" }, evidence: [{ id: "e1", kind: "deposit", status: "pending", submitted_at: "2026-10-26T00:00:00Z" }], job: null };
  const data = overviewData([{ ...record, fulfillment }], [], now);
  assert.equal(data.attention[0].action, "ส่งหลักฐาน");
  assert.equal(data.attention[0].dueLabel, "ส่งหลักฐานภายใน");
  assert.equal(data.attention[0].href, "/customer/deposit-po?request=r1&quotation=q1");
  assert.equal(overviewData([{ ...record, fulfillment }], [], Date.parse("2026-11-02T00:00:00Z")).attention.length, 0);
  assert.equal(overviewData([{ ...record, fulfillment: { ...fulfillment, job: { id: "j1" } } }], [], now).attention.length, 0);
});

test("activity is factual dated history; excludes unknown/internal events and absent/zero production times", () => {
  const data = overviewData([record], [{ ...job, events: [{ id: "private", action: "cost_updated", actor_id: "staff-private", created_at: "2026-10-28T05:00:00Z" }], rework_history: [{ cycle: 1, started_at: "2026-10-23T00:00:00Z", completed_at: "0001-01-01T00:00:00Z" }] }], now);
  assert.deepEqual(data.updates.map(u => u.id), ["shipped:d1", "invoice:i1", "started:j1:1", "quote:q1", "request:r1"]);
  assert(!JSON.stringify(data.updates).includes("staff-private"));
  assert.equal(overviewData([], [{ ...job, invoice: undefined, deliveries: [] }], now).work[0].name, "งานผลิตของคุณ");
});

test("summary money uses exact decimal strings, ignores paid invoices and does not round invalid data", () => {
  assert.equal(invoiceTotal([job, { ...job, invoice: { ...invoice, balance: "9999999999999999.99" } }]), "10000000000008200.00");
  assert.equal(invoiceTotal([{ ...job, invoice: { ...invoice, status: "paid", balance: "100.00" } }]), "0.00");
  assert.equal(invoiceTotal([{ ...job, invoice: { ...invoice, balance: "1.234" } }]), undefined);
  assert.equal(invoiceTotal([]), "0.00");
});

test("due labels use Asia/Bangkok and exact due instant, not a made-up credit term", () => {
  assert.equal(dueState("2026-10-28T06:00:00Z", now), "ครบกำหนดวันนี้");
  assert.equal(dueState("2026-10-28T05:59:59Z", now), "เกินกำหนด");
  assert.equal(dueState("2026-10-28T17:00:00Z", now), "ครบกำหนด");
  assert.equal(dueState("invalid", now), "ยังไม่ระบุกำหนด");
});
