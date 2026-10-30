import test from "node:test";
import assert from "node:assert/strict";
import { claimNote, claimOwed, creditDays, defaultReceivingTab, inReceivingTab, originalRemaining, plainQuantity, receiptPayload, receiptRowError, receivingCounts, receivingTab, settlementPayload } from "../../../src/features/receiving/receiving-domain.ts";

const id = (n) => `10000000-0000-4000-8000-00000000000${n}`;
const claim = { id: id(5), receipt_id: id(6), material_id: id(1), quantity: "5.000000", replaced: "2.000000", status: "claimed", note: "x" };

test("receipt rows skip blanks, keep exact decimals and bound replacements", () => {
  const payload = receiptPayload({ key: id(9), version: 3, note: " truck 2 ", claims: [claim], lines: [{ material_id: id(1), good: "4", damaged: "1.5" }, { material_id: id(2), good: "", damaged: "" }, { material_id: id(1), good: "3", damaged: "", replacement_claim_id: id(5) }] });
  assert.equal(payload.note, "truck 2");
  assert.deepEqual(payload.lines, [{ material_id: id(1), good: "4.000000", damaged: "1.500000" }, { material_id: id(1), good: "3.000000", damaged: "0.000000", replacement_claim_id: id(5) }]);
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [claim], lines: [{ material_id: id(1), good: "2", damaged: "2", replacement_claim_id: id(5) }] }), /ค้างส่ง/);
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [{ ...claim, status: "pending_claim" }], lines: [{ material_id: id(1), good: "1", damaged: "", replacement_claim_id: id(5) }] }));
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [], lines: [{ material_id: id(1), good: "0", damaged: "0" }] }));
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [], lines: [] }), /อย่างน้อย/);
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [], lines: [{ material_id: id(1), good: "-1", damaged: "" }] }));
});

test("claim owed quantity is exact", () => { assert.equal(claimOwed({ quantity: "5.000000", replaced: "4.500001" }), "0.499999"); });

test("claims need a note; credit days are whole 0–36500", () => {
  assert.equal(claimNote(" called supplier "), "called supplier");
  assert.throws(() => claimNote("  "));
  assert.equal(creditDays("0"), 0); assert.equal(creditDays("36500"), 36500);
  for (const bad of ["-1", "1.5", "36501", ""]) assert.throws(() => creditDays(bad));
});

test("settlement needs bank proof and a time between full receipt and now", () => {
  const base = { key: id(9), version: 8, fullReceivedAt: "2026-10-20T00:00:00.000Z" };
  const now = Date.parse("2026-10-24T00:00:00Z");
  assert.deepEqual(settlementPayload({ ...base, method: "cash", paidAt: "2026-10-21T09:00" }, now), { idempotency_key: id(9), expected_version: 8, method: "cash", paid_at: "2026-10-21T02:00:00.000Z" });
  assert.throws(() => settlementPayload({ ...base, method: "bank", paidAt: "2026-10-21T09:00" }, now), /หลักฐาน/);
  assert.equal(settlementPayload({ ...base, method: "bank", paidAt: "2026-10-21T09:00", evidenceId: id(4) }, now).evidence_id, id(4));
  assert.throws(() => settlementPayload({ ...base, method: "cash", paidAt: "2026-10-19T09:00" }, now), /ก่อน/);
  assert.throws(() => settlementPayload({ ...base, method: "cash", paidAt: "2026-10-25T09:00" }, now), /อนาคต/);
});

test("tabs: status from the summary, damaged and unpaid from the detail", () => {
  const row = (n, status) => ({ order_id: id(n), order_no: `PO-${n}`, supplier_name: "S", status, version: 1 });
  const rows = [row(1, "ordered"), row(2, "partially_received"), row(3, "received"), row(4, "received")];
  const states = { [id(2)]: { ...rows[1], lines: [], receipts: [], claims: [claim] }, [id(3)]: { ...rows[2], lines: [], receipts: [], claims: [{ ...claim, status: "resolved" }], finance: { total_amount: "1.00", credit_days: null, payment_status: "unpaid" } }, [id(4)]: { ...rows[3], lines: [], receipts: [], claims: [], finance: { total_amount: "1.00", credit_days: 0, payment_status: "paid" } } };
  assert.deepEqual(receivingCounts(rows, states), { waiting: 1, partial: 1, received: 2, damaged: 1, unpaid: 1 });
  assert.equal(inReceivingTab("unpaid", rows[0]), false);
  assert.equal(receivingTab("unpaid", false), null); assert.equal(receivingTab("unpaid", true), "unpaid"); assert.equal(receivingTab("x", true), null);
  assert.equal(defaultReceivingTab({ waiting: 0, partial: 0, received: 3, damaged: 2, unpaid: 1 }), "damaged");
  assert.equal(defaultReceivingTab({ waiting: 0, partial: 0, received: 0, damaged: 0, unpaid: 0 }), "waiting");
});

test("original remaining excludes what open claims still owe", () => {
  const state = { lines: [{ material_id: id(1), ordered: "10.000000", good: "6.000000", damaged: "5.000000", outstanding: "4.000000" }], claims: [claim] };
  assert.equal(originalRemaining(state, id(1)), "1.000000");
  assert.equal(originalRemaining({ ...state, claims: [{ ...claim, quantity: "9.000000" }] }, id(1)), "0.000000");
  assert.equal(originalRemaining(state, id(2)), "0.000000");
  for (const [raw, plain] of [["10.000000", "10"], ["5.500000", "5.5"], ["0.000001", "0.000001"], ["0.000000", "0"]]) assert.equal(plainQuantity(raw), plain);
});

test("receipt row check: blank ok, bad decimals and over-remaining flagged", () => {
  assert.equal(receiptRowError({ good: "", damaged: "" }, "1.000000"), "");
  assert.equal(receiptRowError({ good: "0.5", damaged: "0.5" }, "1.000000"), "");
  assert.match(receiptRowError({ good: "1", damaged: "0.000001" }, "1.000000"), /ไม่เกิน 1$/);
  assert.match(receiptRowError({ good: "-1", damaged: "" }, "1.000000"), /ทศนิยม/);
});
