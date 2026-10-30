import test from "node:test";
import assert from "node:assert/strict";
import { exactCount, countText, jobsPath, queueTotal, noticesOn, calendarWindow, calendarDays, STATUS_LABELS } from "../../../src/features/staff-overview/overview-domain.ts";

test("report counts preserve int64 and never render an invalid count as zero", () => {
  assert.equal(exactCount("9007199254740993"), 9007199254740993n);
  assert.equal(countText("9007199254740993"), "9,007,199,254,740,993");
  assert.equal(countText(NaN), "—"); assert.equal(countText(-1), "—");
  assert.equal(STATUS_LABELS.cancelled, "ยกเลิก"); assert.equal(STATUS_LABELS.canceled, undefined);
});
test("date selections cannot inherit cohort/status and pagination is explicit", () => {
  const path = jobsPath({ range: "7d", status: "queued", day: "2026-10-28", offset: 20 });
  assert(!path.includes("range=")); assert(!path.includes("status="));
  assert(path.includes("first_completed_on=2026-10-28")); assert(path.includes("offset=20"));
  assert(jobsPath({ range: "30d", status: "cancelled", day: "", offset: 0 }).includes("status=cancelled"));
});
test("Bangkok creation cohorts and rolling calendar include leap day correctly", () => {
  const now = new Date("2024-02-28T17:00:00Z");
  const window = calendarWindow("7d", now);
  assert.equal(window.today, "2024-02-29"); assert.equal(window.start, "2023-03-01");
  assert.equal(window.from, "2024-02-22T17:00:00.000Z");
  assert.equal(calendarDays(window.start, window.today).length, 366);
  assert.equal(calendarWindow("year", new Date("2026-01-01T00:00:00+07:00")).from, "2025-12-31T17:00:00.000Z");
});

test("backlog total stays exact, an invalid part never shrinks it, and today's notices use the Bangkok day", () => {
  assert.equal(queueTotal({ pending_requests: "9007199254740993", queued_jobs: 1, receiving_orders: 0 }), "9007199254740994");
  assert.equal(countText(queueTotal({ pending_requests: "x", queued_jobs: 1, receiving_orders: 0 })), "—");
  const items = [{ created_at: "2026-10-29T17:30:00Z" }, { created_at: "2026-10-29T16:30:00Z" }, { created_at: "bad" }];
  assert.deepEqual(noticesOn(items, "2026-10-30"), [items[0]]);
});
