import test from "node:test";
import assert from "node:assert/strict";
import { claimNote, claimOwed, creditDays, receiptPayload, settlementPayload } from "../../../app/backend-receiving-domain.ts";

const id = (n) => `10000000-0000-4000-8000-00000000000${n}`;
const claim = { id: id(5), receipt_id: id(6), material_id: id(1), quantity: "5.000000", replaced: "2.000000", status: "claimed", note: "x" };

test("receipt rows skip blanks, keep exact decimals and bound replacements", () => {
  const payload = receiptPayload({ key: id(9), version: 3, note: " truck 2 ", claims: [claim], lines: [{ material_id: id(1), good: "4", damaged: "1.5" }, { material_id: id(2), good: "", damaged: "" }, { material_id: id(1), good: "3", damaged: "", replacement_claim_id: id(5) }] });
  assert.equal(payload.note, "truck 2");
  assert.deepEqual(payload.lines, [{ material_id: id(1), good: "4.000000", damaged: "1.500000" }, { material_id: id(1), good: "3.000000", damaged: "0.000000", replacement_claim_id: id(5) }]);
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [claim], lines: [{ material_id: id(1), good: "2", damaged: "2", replacement_claim_id: id(5) }] }), /still owes/);
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [{ ...claim, status: "pending_claim" }], lines: [{ material_id: id(1), good: "1", damaged: "", replacement_claim_id: id(5) }] }));
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [], lines: [{ material_id: id(1), good: "0", damaged: "0" }] }));
  assert.throws(() => receiptPayload({ key: id(9), version: 3, note: "", claims: [], lines: [] }), /at least one/);
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
  assert.throws(() => settlementPayload({ ...base, method: "bank", paidAt: "2026-10-21T09:00" }, now), /proof/);
  assert.equal(settlementPayload({ ...base, method: "bank", paidAt: "2026-10-21T09:00", evidenceId: id(4) }, now).evidence_id, id(4));
  assert.throws(() => settlementPayload({ ...base, method: "cash", paidAt: "2026-10-19T09:00" }, now), /before/);
  assert.throws(() => settlementPayload({ ...base, method: "cash", paidAt: "2026-10-25T09:00" }, now), /future/);
});
