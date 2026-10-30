import assert from "node:assert/strict";
import test from "node:test";
import { documentDetailHref, documentFilterError, documentFilters, documentListHref, documentNote, documentRows, fileExtension, fileSize, filterDocuments, poAwaiting, revisionEvents } from "../../../src/features/customer/customer-documents-domain.ts";

const customer = { id: "customer", name: "บริษัททดสอบ", customer_type: "company" };
const request = { id: "request", no_request: "9007199254740993", customer_id: "customer", description: "แม่พิมพ์ [A]", qty: "9007199254740993", material_spec: "S45C", status: "ongoing", created_at: "2026-10-27T00:00:00Z" };
const quote = { id: "quote", request_id: "request", quotation_no: "9007199254740993", version: 1, status: "approved", final_price: "9999999999999999.99", sent_at: "2026-10-27T17:00:00Z" };
const record = { request, quotations: [quote, { ...quote, id: "sent", status: "sent", final_price: "0.01" }, { ...quote, id: "rejected", status: "rejected", final_price: "100.00" }, { ...quote, id: "draft", status: "draft" }], fulfillment: { terms: { customer_type: "individual", accepted_at: "2026-10-28T02:00:00Z" }, evidence: [{ id: "old", kind: "po", status: "rejected", submitted_at: "2026-10-28T03:00:00Z" }, { id: "current", kind: "po", status: "pending", submitted_at: "2026-10-28T04:00:00Z" }, { id: "deposit", kind: "deposit", status: "approved" }] } };
const filters = (values = {}) => documentFilters(new URLSearchParams(values));
test("document projection excludes customer-invisible drafts and retains every PO revision only", () => {
  const quotes = documentRows([record], [customer], "quotes");
  assert.equal(quotes.length, 3); assert(!quotes.some((row) => row.quote.status === "draft"));
  const tasks = documentRows([record], [customer], "tasks"); assert.equal(tasks.length, 1); assert.equal(tasks[0].customerType, "individual");
  const po = documentRows([record], [customer], "po"); assert.deepEqual(po.map((row) => row.id), ["old", "current"]);
  assert(po.every((row) => row.amount === undefined)); assert.equal(po[1].date, "2026-10-28T04:00:00Z");
});
test("literal search and all-status counts share filters without losing unsafe numbers", () => {
  const rows = documentRows([record], [customer], "quotes");
  assert.equal(filterDocuments(rows, filters({ q: "[A]", status: "sent" }), "quotes").length, 1);
  assert.equal(filterDocuments(rows, filters({ q: "[A]", status: "sent" }), "quotes", true).length, 3);
  assert.equal(filterDocuments(rows, filters({ q: "9007199254740993" }), "quotes").length, 3);
  assert.equal(filterDocuments(rows, filters({ q: "บริษัททดสอบ" }), "quotes").length, 3);
  assert.equal(filterDocuments(rows, filters({ type: "individual" }), "quotes").length, 1);
});
test("amount filters and sorting compare exact satang over the full money range", () => {
  const rows = documentRows([record], [customer], "quotes");
  assert.equal(filterDocuments(rows, filters({ min: "9999999999999999.98" }), "quotes")[0].id, "quote");
  assert.deepEqual(filterDocuments(rows, filters({ sort: "price_asc" }), "quotes").map((row) => row.id), ["sent", "rejected", "quote"]);
  assert.deepEqual(filterDocuments(rows, filters({ sort: "price_desc" }), "quotes").map((row) => row.id), ["quote", "rejected", "sent"]);
  assert.equal(filterDocuments(rows, filters({ max: "0.01" }), "quotes").length, 1);
});
test("date filters use Bangkok day boundaries and reject malformed/reversed inputs", () => {
  const rows = documentRows([record], [customer], "quotes");
  assert.equal(filterDocuments(rows, filters({ from: "2026-10-28", to: "2026-10-28" }), "quotes").length, 3);
  assert.equal(filterDocuments(rows, filters({ to: "2026-10-27" }), "quotes").length, 0);
  for (const values of [{ from: "2026-02-30" }, { from: "2026-10-28", to: "2026-10-27" }, { min: "-1" }, { min: "10", max: "9" }]) assert(documentFilterError(filters(values), "quotes"));
  assert.equal(filterDocuments(rows, filters({ from: "invalid" }), "quotes").length, 0);
});
test("navigation preserves only harmless list context, with PO evidence identity scoped to its row", () => {
  const params = new URLSearchParams({ q: "ชิ้นงาน", status: "pending", page: "2", view: "po", request: "untrusted", evidence: "untrusted", returnTo: "https://evil.invalid", token: "do-not-copy" });
  const list = documentListHref("deposit-po", params); assert(!/untrusted|returnTo|token/.test(list));
  const row = documentRows([record], [customer], "po")[0]; const href = documentDetailHref("deposit-po", params, row);
  const values = new URL(href, "http://local").searchParams;
  assert.equal(values.get("request"), "request"); assert.equal(values.get("quotation"), "quote"); assert.equal(values.get("evidence"), "old"); assert.equal(values.get("page"), "2");
  assert.equal(documentFilters(new URLSearchParams({ page: "-4", sort: "unknown" })).page, 0);
});
test("legacy quotation history links exclude sent records without inventing another status", () => {
  assert.equal(filterDocuments(documentRows([record], [customer], "quotes"), filters({ view: "history" }), "quotes").length, 2);
});

const accepted = (evidence, extra = {}) => ({ request, quotations: [quote], quote, fulfillment: { terms: { deposit_required: false, po_required: true, documents_due_at: "2026-11-11T00:00:00Z" }, evidence, job: null, canceled_at: null, request_status: "ongoing", ...extra } });
test("next-step note follows real request, revision and evidence state without inventing statuses", () => {
  assert.deepEqual(documentNote(accepted([])), { text: "ยังไม่ส่งหลักฐานมัดจำ/PO", warn: true });
  assert.deepEqual(documentNote(accepted([{ kind: "po", status: "rejected" }])), { text: "หลักฐานต้องแก้ไข ส่งใหม่", warn: true });
  assert.equal(documentNote(accepted([{ kind: "po", status: "rejected" }, { kind: "po", status: "pending" }])).text, "รอตรวจหลักฐาน");
  assert.equal(documentNote(accepted([{ kind: "po", status: "approved" }])).text, "หลักฐานผ่านแล้ว รอเปิดงาน");
  assert.equal(documentNote(accepted([], { job: { id: "job" } })).text, "เปิดงานผลิตแล้ว");
  assert.equal(documentNote({ request: { ...request, status: "canceled" }, quotations: [quote], quote }).text, "คำขอถูกยกเลิก");
  const old = { ...quote, id: "old", version: 1, status: "rejected" }; const next = { ...quote, id: "next", version: 2, status: "sent" };
  assert.equal(documentNote({ request, quotations: [old, next], quote: old }).text, "มีฉบับใหม่แล้ว");
  assert.equal(documentNote({ request, quotations: [old], quote: old }).text, "รอใบเสนอราคาฉบับใหม่");
});
test("PO upload prompt uses the upload form's own gate and lists the nearest deadline first", () => {
  const now = Date.parse("2026-11-01T00:00:00Z");
  const row = (id, due, evidence = []) => ({ ...accepted(evidence), id, fulfillment: { ...accepted(evidence).fulfillment, terms: { po_required: true, deposit_required: false, documents_due_at: due } } });
  const rows = [row("later", "2026-11-10T00:00:00Z"), row("sooner", "2026-11-05T00:00:00Z"), row("sent", "2026-11-05T00:00:00Z", [{ kind: "po", status: "pending" }]), row("late", "2026-10-30T00:00:00Z"), row("redo", "2026-11-06T00:00:00Z", [{ kind: "po", status: "rejected" }])];
  assert.deepEqual(poAwaiting(rows, now).map((item) => item.id), ["sooner", "redo", "later"]);
});
test("revision timeline merges sent revisions and decisions newest first", () => {
  const first = { ...quote, id: "q1", version: 1, sent_at: "2026-10-01T00:00:00Z" }; const second = { ...quote, id: "q2", version: 2, sent_at: "2026-10-03T00:00:00Z" };
  const events = revisionEvents([first, second], [{ quotation_id: "q1", outcome: "reject", decided_at: "2026-10-02T00:00:00Z" }, { quotation_id: "unknown", outcome: "accept", decided_at: "2026-10-09T00:00:00Z" }]);
  assert.deepEqual(events.map((event) => event.id), ["sent:q2", "decision:q1", "sent:q1"]);
});
test("file helpers format real attachment metadata", () => {
  assert.equal(fileExtension("po_final.PDF"), "PDF"); assert.equal(fileExtension("no-extension"), "ไฟล์");
  assert.equal(fileSize(512), "1 KB"); assert.equal(fileSize(268 * 1024), "268 KB"); assert.equal(fileSize(2202010), "2.1 MB");
});
