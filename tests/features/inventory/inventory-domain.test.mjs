import test from "node:test";
import assert from "node:assert/strict";
import { baseToUnit, convertToBase, restorableConversion, inventoryDecimal, inventoryDisplay, planLines, stockFields, catalogName, stockFilter, stockCounts, filterStock, stockAfter, isBelow, consumedTotal, consumptionByMonth } from "../../../src/features/inventory/inventory-domain.ts";
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

test("usage counts job_issue only, exactly, in Bangkok months with empty months kept", () => {
  const entry = (mode, quantity, created_at) => ({ mode, quantity, created_at });
  const items = [entry("job_issue", "1.500000", "2026-10-31T17:30:00Z"), entry("job_issue", "0.000001", "2026-10-01T00:00:00Z"), entry("addition", "99.000000", "2026-10-02T00:00:00Z"), entry("correction", "5.000000", "2026-10-02T00:00:00Z"), entry("job_issue", "3.000000", "2026-08-10T00:00:00Z")];
  assert.equal(consumedTotal(items), "4.500001");
  const months = consumptionByMonth(items, Date.parse("2026-11-20T00:00:00Z"), 4);
  assert.deepEqual(months.map((item) => [item.month, item.total]), [["2026-08", "3.000000"], ["2026-09", "0.000000"], ["2026-10", "0.000001"], ["2026-11", "1.500000"]]);
  assert.deepEqual(months.map((item) => item.percent), [100, 0, 0, 50]);
  assert.equal(consumptionByMonth([], Date.parse("2026-01-10T00:00:00Z"), 2)[0].month, "2025-12");
});

test("unit conversion is exact and never rounds", () => {
  assert.equal(convertToBase("2", "12.500000"), "25.000000");
  assert.equal(convertToBase("0", "12.5"), "0.000000");
  assert.equal(convertToBase("0.5", "0.333333"), null);
  assert.equal(convertToBase("999999999999", "2"), null);
  assert.equal(convertToBase("abc", "2"), null);
  assert.deepEqual(baseToUnit("25.000000", "12.500000"), { value: "2.000000", exact: true });
  assert.deepEqual(baseToUnit("1.000000", "3.000000"), { value: "0.333333", exact: false });
});

test("entered unit is sent only when chosen", () => {
  const id = "00000000-0000-4000-8000-000000000001"; const unit = "00000000-0000-4000-8000-000000000002";
  assert.deepEqual(planLines([{ material_id: id, quantity: "1", unit_id: unit, unit_name: "sheet" }]), [{ material_id: id, quantity: "1.000000", unit_id: unit }]);
  const material = { id, name: "Steel", unit_id: unit, unit_name: "kg", is_active: true, version: 1, qty_on_hand: "30.000000", qty_reserved: "20.000000", qty_available: "10.000000" };
  const conversion = { unit_id: unit, factor: "12.500000" };
  assert.deepEqual(stockFields(material, "correction", "2", "", "Count", conversion), { mode: "correction", quantity: "2.000000", reason: "Count", unit_id: unit });
  assert.throws(() => stockFields(material, "correction", "1", "", "Count", conversion), /below active reserved/);
  assert.throws(() => stockFields(material, "addition", "0.0000001", "1", "Add", conversion));
  assert.equal("unit_id" in stockFields(material, "correction", "25", "", "Count"), false);
});

test("a saved plan unit is restored only at the same active factor", () => {
  const sheet = { id: "1", material_id: "m", unit_id: "u", unit_name: "sheet", factor: "12.500000", is_active: true, created_at: "" };
  const entered = { entered_quantity: "1.000000", entered_unit_name: "sheet", factor_used: "12.500000" };
  assert.equal(restorableConversion([sheet], entered), sheet);
  assert.equal(restorableConversion([{ ...sheet, factor: "13.000000" }], entered), null);
  assert.equal(restorableConversion([{ ...sheet, is_active: false }], entered), null);
  assert.equal(restorableConversion([], entered), null);
});
