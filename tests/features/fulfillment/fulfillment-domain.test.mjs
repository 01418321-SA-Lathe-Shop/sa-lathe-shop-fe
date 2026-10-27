import test from "node:test";
import assert from "node:assert/strict";
import { availableEvidenceKinds, evidencePayload, bangkokInstant, reviewReason, workerContacts } from "../../../app/backend-fulfillment-domain.ts";

const key = "00000000-0000-4000-8000-000000000001";
const attachmentId = "00000000-0000-4000-8000-000000000002";
const now = Date.parse("2026-10-19T03:00:00Z");
const terms = { final_price: "1600.01", deposit_required: true, po_required: false, deposit_amount: "800.01", documents_due_at: "2026-11-01T00:00:00Z" };
const input = { key, attachmentId, kind: "deposit", amount: "1000.00", paidAt: "2026-10-19T09:00" };
test("single deposit exact range, full payment, zero-price and very large money", () => {
  assert.equal(evidencePayload(terms, input, now).amount, "1000.00");
  assert.equal(evidencePayload(terms, { ...input, amount: "1600.01" }, now).amount, "1600.01");
  for (const amount of ["800.00", "1600.02", "0.001", "1e3", "-1"]) assert.throws(() => evidencePayload(terms, { ...input, amount }, now));
  assert.equal(evidencePayload({ ...terms, deposit_amount: "0.00", final_price: "0.00" }, { ...input, amount: "0" }, now).amount, "0.00");
  assert.equal(evidencePayload({ ...terms, deposit_amount: "5000000000000000.00", final_price: "9999999999999999.99" }, { ...input, amount: "9999999999999999.99" }, now).amount, "9999999999999999.99");
});
test("PO contains no deposit-only fields and unsupported kinds are not offered", () => {
  const company = { ...terms, po_required: true, deposit_required: false };
  assert.deepEqual(evidencePayload(company, { ...input, kind: "po" }, now), { idempotency_key: key, attachment_id: attachmentId, kind: "po" });
  assert.throws(() => evidencePayload(company, input, now));
  assert.throws(() => evidencePayload(terms, { ...input, kind: "po" }, now));
});
test("Bangkok timestamps do not depend on host zone and reject future/invalid dates", () => {
  assert.equal(bangkokInstant("2026-10-19T09:00"), "2026-10-19T02:00:00.000Z");
  assert.throws(() => bangkokInstant("2026-02-31T09:00"));
  assert.throws(() => evidencePayload(terms, { ...input, paidAt: "2026-10-20T09:00" }, now));
});
test("active evidence prevents duplicates; rejected evidence can be replaced only before due", () => {
  const state = { terms, evidence: [], request_status: "ongoing", job: null, canceled_at: null };
  assert.deepEqual(availableEvidenceKinds(state, now), ["deposit"]);
  assert.deepEqual(availableEvidenceKinds({ ...state, evidence: [{ kind: "deposit", status: "pending" }] }, now), []);
  assert.deepEqual(availableEvidenceKinds({ ...state, evidence: [{ kind: "deposit", status: "approved" }] }, now), []);
  assert.deepEqual(availableEvidenceKinds({ ...state, evidence: [{ kind: "deposit", status: "rejected" }] }, now), ["deposit"]);
  assert.deepEqual(availableEvidenceKinds(state, Date.parse(terms.documents_due_at) + 1), []);
  assert.deepEqual(availableEvidenceKinds({ ...state, job: { id: "job" } }, now), []);
  assert.deepEqual(availableEvidenceKinds({ ...state, request_status: "canceled" }, now), []);
});
test("review validates trimmed rejection reason and never supplies one for approval", () => {
  assert.equal(reviewReason("rejected", "  Wrong PO  "), "Wrong PO");
  assert.equal(reviewReason("approved", "ignore"), "");
  for (const value of [" ", "x".repeat(2001), "a\0b"]) assert.throws(() => reviewReason("rejected", value));
});
test("Worker contacts required, non-unique, case-preserving and international", () => {
  assert.deepEqual(workerContacts(" Worker@Example.com ", "+66 (81) 234-5678"), { email: "Worker@Example.com", phone: "+66 (81) 234-5678" });
  assert.deepEqual(workerContacts("shared@example.com", "0812345678"), workerContacts("shared@example.com", "0812345678"));
  for (const [email, phone] of [["", "0812345678"], ["worker@example.com", ""], ["a\nb@example.com", "1234567"], ["a@b.com", "123456"], ["a@b.com", "1234567 ext 8"]]) assert.throws(() => workerContacts(email, phone));
});
