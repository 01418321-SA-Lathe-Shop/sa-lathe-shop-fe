import test from "node:test";
import assert from "node:assert/strict";
import { laborPayload, timePayload, usagePayload } from "../../../src/features/production/production-domain.ts";

const id = (n) => `10000000-0000-4000-8000-00000000000${n}`;
const command = { idempotency_key: id(9), expected_version: 2 };

test("usage sends only filled rows as exact positive increments", () => {
  const payload = usagePayload(command, " first half ", [{ material_id: id(1), label: "Steel", quantity: "2.5" }, { material_id: id(2), label: "Bolt", quantity: "" }]);
  assert.deepEqual(payload, { ...command, lines: [{ material_id: id(1), quantity: "2.500000" }], note: "first half" });
  assert.throws(() => usagePayload(command, "", [{ material_id: id(1), label: "Steel", quantity: "" }]), /at least one/);
  assert.throws(() => usagePayload(command, "", [{ material_id: id(1), label: "Steel", quantity: "0" }]));
  assert.throws(() => usagePayload(command, "", [{ material_id: id(1), label: "Steel", quantity: "1.0000001" }]));
});

test("time is whole minutes 1–1,000,000; labor cost is two-place THB", () => {
  assert.deepEqual(timePayload(command, "90", ""), { ...command, minutes: 90, note: "" });
  for (const bad of ["0", "1.5", "-3", "1000001", ""]) assert.throws(() => timePayload(command, bad, ""));
  assert.equal(laborPayload(command, "1950").amount, "1950.00");
  assert.equal(laborPayload(command, "0").amount, "0.00");
  assert.throws(() => laborPayload(command, "12.345"));
});

test("usage sends a unit only when one is chosen", () => {
  const unit = "00000000-0000-4000-8000-000000000009";
  const material = "00000000-0000-4000-8000-000000000001";
  const payload = usagePayload({ idempotency_key: unit, expected_version: 1 }, "", [{ material_id: material, label: "Steel", quantity: "0.5", unit_id: unit, unit_name: "sheet" }]);
  assert.deepEqual(payload.lines, [{ material_id: material, quantity: "0.500000", unit_id: unit }]);
});
