import test from "node:test";
import assert from "node:assert/strict";
import { inventoryDecimal, inventoryDisplay, planLines, stockFields, catalogName } from "../../../src/features/inventory/inventory-domain.ts";
const material = { is_active: true, qty_reserved: "2.000001" };
const id = "10000000-0000-4000-8000-000000000001";
test("six-place quantities/unit costs retain full PostgreSQL precision without rounding", () => {
  assert.equal(inventoryDecimal("999999999999.999999"), "999999999999.999999");
  assert.equal(inventoryDecimal("0.000001", true), "0.000001");
  assert.equal(inventoryDecimal("12.5"), "12.500000");
  assert.equal(inventoryDisplay("999999999999.999999"), "999,999,999,999.999999");
  for (const invalid of ["1.0000001", "1000000000000", "-1", "1e2", "NaN", "1.", ".5"]) assert.throws(() => inventoryDecimal(invalid));
  assert.throws(() => inventoryDecimal("0", true));
});
test("plan is full explicit list; empty releases, duplicates/invalid IDs/zero rejected", () => {
  assert.deepEqual(planLines([]), []);
  assert.deepEqual(planLines([{ material_id: id, quantity: "12.5" }]), [{ material_id: id, quantity: "12.500000" }]);
  assert.throws(() => planLines([{ material_id: id, quantity: "1" }, { material_id: id.toUpperCase(), quantity: "2" }]));
  assert.throws(() => planLines([{ material_id: id, quantity: "0" }]));
  assert.throws(() => planLines([{ material_id: "not-id", quantity: "1" }]));
  assert.throws(() => planLines(Array.from({length:501}, () => ({material_id:id,quantity:"1"}))));
});
test("stock addition needs positive quantity, exact cost and reason", () => {
  assert.deepEqual(stockFields(material, "addition", "0.5", "20", " Opening stock "), {mode:"addition",quantity:"0.500000",unit_cost:"20.000000",reason:"Opening stock"});
  assert.throws(() => stockFields(material,"addition","0","0","reason"));
  assert.throws(() => stockFields(material,"addition","1","","reason"));
  assert.throws(() => stockFields(material,"addition","1","0"," "));
});
test("absolute correction cannot undercut reservation; omits cost and permits unreserved zero", () => {
  assert.throws(() => stockFields(material,"correction","2","","count"));
  assert.deepEqual(stockFields(material,"correction","2.000001","999","count"),{mode:"correction",quantity:"2.000001",reason:"count"});
  assert.deepEqual(stockFields({...material,qty_reserved:"0.000000"},"correction","0","","zero"),{mode:"correction",quantity:"0.000000",reason:"zero"});
  assert.throws(() => stockFields({...material,is_active:false},"addition","1","1","reason"));
  assert.deepEqual(stockFields({...material,is_active:false},"correction","3","","count"),{mode:"correction",quantity:"3.000000",reason:"count"});
});
test("catalog labels trim Unicode and reject invalid lengths and control lines", () => {
  assert.equal(catalogName(" เหล็ก S45C ",200),"เหล็ก S45C");
  for(const value of [" ","a\nb","a\0b","x".repeat(51)]) assert.throws(() => catalogName(value,50));
});
