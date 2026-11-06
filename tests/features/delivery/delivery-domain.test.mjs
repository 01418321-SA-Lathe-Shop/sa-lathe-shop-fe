import test from "node:test";
import assert from "node:assert/strict";
import { availableActions, defaultDeliveryTab, deliveryCounts, deliveryTab, inDeliveryTab, inspectPayload, paymentPayload, reviewPayload, shipPayload } from "../../../src/features/delivery/delivery-domain.ts";

const command = { idempotency_key: "10000000-0000-4000-8000-000000000009", expected_version: 4 };
const base = { job_id: "j", request_id: "r", job_status: "completed", request_status: "ongoing", version: 4, cycle: 1, opening_balance: "8200.00", deposit: "0.00", deliveries: [], payments: [], events: [], rework_history: [] };
const invoice = { id: "i", number: "INV-1", amount: "8200.00", paid: "2000.00", balance: "6200.00", status: "partial", credit_days: 30, issued_at: "", due_at: "" };

test("actions follow the UC9 lifecycle per role; Worker and Admin share every staff action", () => {
  assert.deepEqual(availableActions(base, "admin"), ["terms"]);
  assert.deepEqual(availableActions(base, "worker"), ["terms"]);
  assert.deepEqual(availableActions({ ...base, credit_days: 30 }, "worker"), ["invoice"]);
  const invoiced = { ...base, credit_days: 30, invoice };
  assert.deepEqual(availableActions(invoiced, "worker"), ["ship", "cash"]);
  assert.deepEqual(availableActions(invoiced, "customer"), ["bank"]);
  const shipped = { ...invoiced, deliveries: [{ status: "shipping" }], payments: [{ status: "pending" }] };
  assert.deepEqual(availableActions(shipped, "customer"), ["inspect", "bank"]);
  assert.deepEqual(availableActions(shipped, "admin"), ["cash", "review"]);
  assert.deepEqual(availableActions(shipped, "worker"), ["cash", "review"]);
  // Rework in progress: no shipping, but the open invoice can still be settled.
  assert.deepEqual(availableActions({ ...shipped, deliveries: [{ status: "returned" }], job_status: "in_progress" }, "worker"), ["cash", "review"]);
  assert.deepEqual(availableActions({ ...shipped, request_status: "completed" }, "admin"), ["review"]);
  assert.deepEqual(availableActions({ ...shipped, request_status: "completed" }, "worker"), ["review"]);
  assert.deepEqual(availableActions({ ...invoiced, invoice: { ...invoice, balance: "0.00" } }, "customer"), []);
});

test("shipping, inspection and review payloads", () => {
  // No shipping fee is ever sent (removed from UC9).
  assert.deepEqual(shipPayload(command, "third_party", " Nida "), { ...command, method: "third_party", receiver_name: "Nida" });
  assert.equal("shipping_cost" in shipPayload(command, "self", "Nida"), false);
  assert.throws(() => shipPayload(command, "post", "Nida")); assert.throws(() => shipPayload(command, "self", " "));
  assert.deepEqual(inspectPayload(command, "accept", "ignored"), { ...command, outcome: "accept" });
  assert.throws(() => inspectPayload(command, "return", ""));
  assert.deepEqual(reviewPayload(command, "p", "approved", "x"), { ...command, payment_id: "p", outcome: "approved" });
  assert.throws(() => reviewPayload(command, "p", "rejected", " "));
});

test("payments are positive, within balance, not future, with bank proof", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  const ok = paymentPayload(command, { amount: "6200", paidAt: "2026-10-24T09:00", evidenceId: "e", balance: "6200.00", requireEvidence: true }, now);
  assert.deepEqual(ok, { ...command, amount: "6200.00", paid_at: "2026-10-24T02:00:00.000Z", evidence_id: "e" });
  assert.throws(() => paymentPayload(command, { amount: "6200.01", paidAt: "2026-10-24T09:00", evidenceId: "e", balance: "6200.00", requireEvidence: true }, now), /ชำระเกินไม่ได้/);
  assert.throws(() => paymentPayload(command, { amount: "0", paidAt: "2026-10-24T09:00", evidenceId: "e", balance: "6200.00", requireEvidence: true }, now));
  assert.throws(() => paymentPayload(command, { amount: "10", paidAt: "2026-10-24T09:00", balance: "6200.00", requireEvidence: true }, now), /หลักฐาน/);
  assert.equal(paymentPayload(command, { amount: "10", paidAt: "2026-10-24T09:00", balance: "6200.00", requireEvidence: false }, now).evidence_id, undefined);
  assert.throws(() => paymentPayload(command, { amount: "10", paidAt: "2026-10-25T09:00", balance: "6200.00", requireEvidence: false }, now), /อนาคต/);
});

test("delivery tabs follow the action rules for all staff", () => {
  const ship = (status) => ({ id: "d", cycle: 1, method: "self", receiver_name: "N", status, shipped_at: "", reason: "" });
  const jobs = [
    base,
    { ...base, credit_days: 14 },
    { ...base, credit_days: 14, invoice },
    { ...base, credit_days: 14, invoice: { ...invoice, balance: "0.00", status: "paid" }, deliveries: [ship("shipping")], payments: [{ id: "p", status: "pending" }] },
    { ...base, request_status: "completed", credit_days: 14, invoice: { ...invoice, balance: "0.00", status: "paid" }, deliveries: [ship("delivered")] },
    { ...base, job_status: "in_progress" },
  ];
  assert.deepEqual(deliveryCounts(jobs), { terms: 1, invoice: 1, ship: 1, inspect: 1, review: 1, unpaid: 1, closed: 1 });
  assert.equal(inDeliveryTab("ship", { ...jobs[2], deliveries: [ship("returned")] }), true);
  assert.equal(deliveryTab("review"), "review"); assert.equal(deliveryTab("bogus"), null);
  assert.equal(defaultDeliveryTab(deliveryCounts(jobs)), "review");
  assert.equal(defaultDeliveryTab({ terms: 0, invoice: 0, ship: 0, inspect: 0, review: 0, unpaid: 0, closed: 2 }), "closed");
  assert.equal(defaultDeliveryTab({ terms: 0, invoice: 0, ship: 0, inspect: 0, review: 0, unpaid: 0, closed: 0 }), "terms");
});

test("malformed payment amounts get a Thai message", () => {
  assert.throws(() => paymentPayload(command, { amount: "1,000", paidAt: "2026-10-24T09:00", balance: "6200.00", requireEvidence: false }, Date.parse("2026-10-25T00:00:00Z")), /ทศนิยมไม่เกิน 2/);
});
