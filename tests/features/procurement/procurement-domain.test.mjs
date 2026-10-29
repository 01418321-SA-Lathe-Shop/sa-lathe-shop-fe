import test from "node:test";
import assert from "node:assert/strict";
import { allowedActions, defaultOrderTab, matchOrder, orderCounts, orderTab, orderTabOf, lineTotal, orderActionPayload, orderPayload, orderTotal, supplierFields } from "../../../src/features/procurement/procurement-domain.ts";

const id = (n) => `10000000-0000-4000-8000-00000000000${n}`;

test("UC6 line totals round half-up per line before summing", () => {
  assert.equal(lineTotal("25", "0.335"), "8.38");
  assert.equal(orderTotal([{ quantity: "3", unit_cost: "0.335" }, { quantity: "3", unit_cost: "0.335" }]), "2.02");
  assert.equal(lineTotal("1", "0"), "0.00");
  assert.equal(lineTotal("999999999999.999999", "1"), "1000000000000.00");
});

test("supplier contacts are optional but strictly formatted", () => {
  assert.deepEqual(supplierFields("  Steel Co ", "", ""), { name: "Steel Co", email: "", phone: "" });
  assert.deepEqual(supplierFields("A", "sales@example.com", "+66812345678").phone, "+66812345678");
  assert.throws(() => supplierFields("", "", ""));
  assert.throws(() => supplierFields("A", "Sales <sales@example.com>", ""));
  assert.throws(() => supplierFields("A", "", "081-234-5678"), /ไม่ต้องเว้นวรรค/);
});

test("order payload is exact, distinct and bounded", () => {
  const line = { material_id: id(1), name: "Steel", unit_name: "kg", quantity: "25", unit_cost: "0.335" };
  const payload = orderPayload({ key: id(9), supplierId: id(2), jobIds: [id(3)], expectedAt: "2026-11-01T09:00", lines: [line] });
  assert.deepEqual(payload.lines, [{ material_id: id(1), quantity: "25.000000", unit_cost: "0.335000" }]);
  assert.equal(payload.expected_at, "2026-11-01T02:00:00.000Z");
  assert.equal(orderPayload({ key: id(9), supplierId: id(2), jobIds: [], expectedAt: "", lines: [line] }).expected_at, undefined);
  assert.throws(() => orderPayload({ key: id(9), supplierId: id(2), jobIds: [], expectedAt: "", lines: [] }));
  assert.throws(() => orderPayload({ key: id(9), supplierId: id(2), jobIds: [], expectedAt: "", lines: [line, line] }));
  assert.throws(() => orderPayload({ key: id(9), supplierId: id(2), jobIds: [], expectedAt: "", lines: [{ ...line, quantity: "0" }] }));
  assert.throws(() => orderPayload({ key: id(9), supplierId: id(2), jobIds: [id(3), id(3)], expectedAt: "", lines: [line] }));
});

test("supplier responses follow the UC6 state table", () => {
  assert.deepEqual(allowedActions({ status: "ordered", supplier_response: "pending" }), ["accept", "reject", "cancel"]);
  assert.deepEqual(allowedActions({ status: "ordered", supplier_response: "accepted" }), ["cancel"]);
  assert.deepEqual(allowedActions({ status: "partially_received", supplier_response: "accepted" }), []);
  assert.deepEqual(allowedActions({ status: "cancelled", supplier_response: "rejected" }), []);
  assert.throws(() => orderActionPayload("reject", " ", id(1), 1));
  assert.deepEqual(orderActionPayload("accept", "", id(1), 1), { idempotency_key: id(1), expected_version: 1, action: "accept" });
});

test("order tabs follow status plus supplier response", () => {
  assert.equal(orderTabOf({ status: "ordered", supplier_response: "pending" }), "pending");
  assert.equal(orderTabOf({ status: "ordered", supplier_response: "accepted" }), "accepted");
  assert.equal(orderTabOf({ status: "partially_received", supplier_response: "accepted" }), "partial");
  assert.equal(orderTabOf({ status: "received", supplier_response: "accepted" }), "received");
  assert.equal(orderTabOf({ status: "cancelled", supplier_response: "rejected" }), "cancelled");
  assert.equal(orderTabOf({ status: "cancelled", supplier_response: "accepted" }), "cancelled");
  assert.equal(orderTabOf({ status: "mystery", supplier_response: "pending" }), null);
  const counts = orderCounts([{ status: "ordered", supplier_response: "accepted" }, { status: "cancelled", supplier_response: "rejected" }, { status: "mystery", supplier_response: "x" }]);
  assert.deepEqual(counts, { pending: 0, accepted: 1, partial: 0, received: 0, cancelled: 1 });
  assert.equal(defaultOrderTab(counts), "accepted");
  assert.equal(defaultOrderTab({ pending: 0, accepted: 0, partial: 0, received: 3, cancelled: 0 }), "pending");
  assert.equal(orderTab("received"), "received");
  assert.equal(orderTab("all"), null);
  const order = { order_no: "MO-2026-0007", supplier: { name: "Steel Co" } };
  assert.ok(matchOrder(order, " steel ") && matchOrder(order, "0007") && matchOrder(order, ""));
  assert.ok(!matchOrder(order, "copper"));
});
