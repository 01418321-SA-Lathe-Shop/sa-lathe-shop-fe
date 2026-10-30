import test from "node:test";
import assert from "node:assert/strict";
import { inventoryDecimal, inventoryDisplay, planLines, stockFields, catalogName, stockFilter, stockCounts, filterStock, stockAfter, isBelow } from "../../../src/features/inventory/inventory-domain.ts";
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
test("stock filter chips count real values; unknown filter falls back to all", () => {
  const items = [
    { id: "a", is_active: true, qty_available: "3.000000", qty_reserved: "1.000000" },
    { id: "b", is_active: true, qty_available: "0.000000", qty_reserved: "2.000000" },
    { id: "c", is_active: false, qty_available: "0.000001", qty_reserved: "0.000000" },
  ];
  assert.deepEqual(stockCounts(items), { all: 3, available: 2, empty: 1, reserved: 2, inactive: 1 });
  assert.deepEqual(filterStock(items, "empty").map((item) => item.id), ["b"]);
  assert.equal(stockFilter("reserved"), "reserved");
  assert.equal(stockFilter("low"), "all");
  assert.equal(stockFilter(null), "all");
});
test("adjustment preview is exact: addition sums, correction is the counted total", () => {
  assert.equal(stockAfter({ qty_on_hand: "10.000000" }, "addition", "5"), "15.000000");
  assert.equal(stockAfter({ qty_on_hand: "999999999999.999999" }, "addition", "0.000001"), "1000000000000.000000");
  assert.equal(stockAfter({ qty_on_hand: "0.000000" }, "addition", "0.5"), "0.500000");
  assert.equal(stockAfter({ qty_on_hand: "10.000000" }, "correction", "0"), "0.000000");
  assert.equal(stockAfter({ qty_on_hand: "10.000000" }, "addition", "0"), null);
  assert.equal(stockAfter({ qty_on_hand: "10.000000" }, "correction", "1e2"), null);
  assert.equal(isBelow("1.999999", "2.000000"), true);
  assert.equal(isBelow("2.000000", "2.000000"), false);
});
test("catalog labels trim Unicode and reject invalid lengths and control lines", () => {
  assert.equal(catalogName(" เหล็ก S45C ",200),"เหล็ก S45C");
  for(const value of [" ","a\nb","a\0b","x".repeat(51)]) assert.throws(() => catalogName(value,50));
});
test("summary helpers: fully reserved, units in use, reserved share", async () => {
  const { fullyReserved, unitsInUse, reservedPercent } = await import("../../../src/features/inventory/inventory-domain.ts");
  const row = (unit_name, qty_on_hand, qty_reserved, qty_available) => ({ unit_name, qty_on_hand, qty_reserved, qty_available });
  assert.equal(fullyReserved(row("กก.", "5.000000", "5.000000", "0.000000")), true);
  assert.equal(fullyReserved(row("กก.", "0.000000", "0.000000", "0.000000")), false);
  assert.equal(fullyReserved(row("กก.", "5.000000", "1.000000", "4.000000")), false);
  assert.deepEqual(unitsInUse([row("ม.", "1.000000"), row("กก.", "1.000000"), row("ม.", "2.000000")]), ["กก.", "ม."]);
  assert.equal(reservedPercent(row("ม.", "3.000000", "1.000000")), 33);
  assert.equal(reservedPercent(row("ม.", "0.000000", "0.000000")), 0);
  assert.equal(reservedPercent(row("ม.", "999999999999.999999", "999999999999.999999")), 100);
});
