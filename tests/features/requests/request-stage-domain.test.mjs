import test from "node:test";
import assert from "node:assert/strict";
import {
  defaultStage, evidenceChecklist, priceCheck, rejectionCount, satang, stageCounts, stageOf, stageRows,
} from "../../../src/features/requests/request-stage-domain.ts";

const request = (no, status = "pending", extra = {}) => ({ no_request: no, description: `Part ${no}`, status, created_at: "2026-10-01T00:00:00Z", ...extra });
const quote = (status, extra = {}) => ({ status, created_at: "2026-10-02T00:00:00Z", ...extra });
const evidence = (kind, status) => ({ kind, status });
const terms = { deposit_required: true, po_required: false, documents_due_at: "2026-11-01T00:00:00Z" };

test("stage follows the latest quotation and Deposit/PO state", () => {
  assert.equal(stageOf({ request: request("R1"), quotations: [] }), "quote");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("draft")] }), "quote");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("rejected")] }), "quote");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("sent")] }), "customer");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("approved")] }), null);
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("approved")], fulfillment: { terms, evidence: [] } }), "evidence");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("approved")], fulfillment: { terms, evidence: [evidence("deposit", "pending")] } }), "review");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("approved")], fulfillment: { terms, job: { id: "J1" }, evidence: [] } }), "opened");
});

test("finished and unreadable requests are placed without a read or as unknown", () => {
  assert.equal(stageOf({ request: request("R1", "completed"), quotations: [] }), "closed");
  assert.equal(stageOf({ request: request("R1", "canceled"), quotations: [quote("sent")] }), "closed");
  assert.equal(stageOf({ request: request("R1"), quotations: [quote("sent")], issue: true }), null);
});

test("counts include every matching record and report unreadable ones separately", () => {
  const records = [
    { request: request("R1") , quotations: [] },
    { request: request("R2"), quotations: [quote("sent")] },
    { request: request("R3", "completed"), quotations: [] },
    { request: request("R4"), quotations: [quote("sent")], issue: true },
  ];
  const all = stageCounts(records, "");
  assert.equal(all.counts.quote, 1);
  assert.equal(all.counts.customer, 1);
  assert.equal(all.counts.closed, 1);
  assert.equal(all.unknown, 1);
  assert.equal(stageCounts(records, "r2").counts.customer, 1);
  assert.equal(stageCounts(records, "R1").counts.customer, 0);
});

test("default stage opens the linked request, else the first stage needing this role", () => {
  const counts = { quote: 0, customer: 2, evidence: 0, review: 1, opened: 0, closed: 0 };
  assert.equal(defaultStage(counts, true), "review");
  assert.equal(defaultStage(counts, false), "review");
  assert.equal(defaultStage({ ...counts, review: 0 }, true), "customer");
  const linked = { request: request("R9"), quotations: [quote("draft")] };
  assert.equal(defaultStage(counts, false, linked), "quote");
});

test("rows sort evidence by the server deadline and closed requests newest first", () => {
  const early = { request: request("A"), quotations: [quote("approved")], fulfillment: { terms: { ...terms, documents_due_at: "2026-11-01T00:00:00Z" }, evidence: [evidence("po", "pending")] } };
  const late = { request: request("B"), quotations: [quote("approved")], fulfillment: { terms: { ...terms, documents_due_at: "2026-11-05T00:00:00Z" }, evidence: [evidence("po", "pending")] } };
  assert.deepEqual(stageRows([late, early], "review", "").map((record) => record.request.no_request), ["A", "B"]);
  const older = { request: request("C", "completed", { created_at: "2026-09-01T00:00:00Z" }), quotations: [] };
  const newer = { request: request("D", "completed", { created_at: "2026-09-20T00:00:00Z" }), quotations: [] };
  assert.deepEqual(stageRows([older, newer], "closed", "").map((record) => record.request.no_request), ["D", "C"]);
});

test("evidence checklist shows the newest state per required kind", () => {
  const fulfillment = { terms: { deposit_required: true, po_required: true }, evidence: [evidence("deposit", "rejected"), evidence("deposit", "pending"), evidence("po", "approved")] };
  assert.deepEqual(evidenceChecklist(fulfillment), [{ kind: "deposit", state: "pending" }, { kind: "po", state: "approved" }]);
  assert.deepEqual(evidenceChecklist({ terms: { deposit_required: true, po_required: false }, evidence: [] }), [{ kind: "deposit", state: "missing" }]);
});

test("satang compares exact two-place amounts and rejects anything else", () => {
  assert.equal(satang("12.5"), 1250n);
  assert.equal(satang(" 0.01 "), 1n);
  for (const bad of ["1.005", "-1", "1,000", "", "abc"]) assert.equal(satang(bad), null);
});

test("price check flags invalid, below-minimum and unknown minimum without computing a minimum", () => {
  assert.equal(priceCheck("2500.00", "2400.00"), "ok");
  assert.equal(priceCheck("2400.00", "2400.00"), "ok");
  assert.equal(priceCheck("2399.99", "2400.00"), "below");
  assert.equal(priceCheck("2500.001", "2400.00"), "invalid");
  assert.equal(priceCheck("2500.00", undefined), "unknown");
});

test("rejection count uses the largest server count", () => {
  assert.equal(rejectionCount([]), 0);
  assert.equal(rejectionCount([{ rejection_count: 2 }, { rejection_count: 4 }]), 4);
});
