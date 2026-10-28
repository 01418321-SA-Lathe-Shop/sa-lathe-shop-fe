import test from "node:test";
import assert from "node:assert/strict";
import { calendarWeeks, heatLevel, keyboardDay } from "../../../src/features/staff-overview/heatmap-domain.ts";
import { calendarDays } from "../../../src/features/staff-overview/overview-domain.ts";

test("calendar pads Monday weeks without inventing future or out-of-period zero days", () => {
  const days = calendarDays("2026-10-01", "2026-10-28").map(date => ({ date, count: 0 }));
  const weeks = calendarWeeks(days);
  assert.equal(weeks[0].days.slice(0, 3).every(d => d === null), true);
  assert.deepEqual(weeks.flatMap(w => w.days).filter(Boolean), days);
  assert.equal(weeks.at(-1).days.at(-1), null);
  assert(weeks[0].month.includes("ต.ค.")); assert.deepEqual(calendarWeeks([]), []);
});
test("heatmap intensity is exact for int64 and has a neutral zero level", () => {
  assert.equal(heatLevel(0, 0), 0); assert.equal(heatLevel(1, 4), 1);
  assert.equal(heatLevel(2, 4), 2); assert.equal(heatLevel(3, 4), 3); assert.equal(heatLevel(4, 4), 4);
  assert.equal(heatLevel("9007199254740993", "9007199254740993"), 4);
});
test("keyboard navigation follows visual calendar axes and stays inside the actual days", () => {
  assert.equal(keyboardDay(15, "ArrowLeft", 365), 8); assert.equal(keyboardDay(15, "ArrowRight", 365), 22);
  assert.equal(keyboardDay(15, "ArrowUp", 365), 14); assert.equal(keyboardDay(15, "ArrowDown", 365), 16);
  assert.equal(keyboardDay(0, "ArrowUp", 365), 0); assert.equal(keyboardDay(364, "ArrowRight", 365), 364);
  assert.equal(keyboardDay(99, "Home", 365), 0); assert.equal(keyboardDay(99, "End", 365), 364);
});
