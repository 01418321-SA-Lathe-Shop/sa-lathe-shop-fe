import test from "node:test";
import assert from "node:assert/strict";
import { bahtTH, dateTimeTH, minutesTH, quantityTH, requestedDayCountdown } from "../../../src/components/staff-ui/staff-format.ts";
import { JOB_STATUS, statusOf } from "../../../src/components/staff-ui/staff-labels.ts";

test("quantities drop trailing zeros exactly and never round", () => {
  assert.equal(quantityTH("5.000000"), "5");
  assert.equal(quantityTH("1234.500000"), "1,234.5");
  assert.equal(quantityTH("999999999999.000001"), "999,999,999,999.000001");
  assert.equal(quantityTH("0.000000"), "0");
  for (const bad of ["", "5", "1e3", "-1.000000", null, undefined]) assert.equal(quantityTH(bad), "—");
});

test("baht keeps two exact places with no VAT, minutes read in Thai", () => {
  assert.equal(bahtTH("2400.00"), "2,400.00 บาท");
  assert.equal(bahtTH("90071992547409930.05"), "90,071,992,547,409,930.05 บาท");
  assert.equal(bahtTH("2400"), "—");
  assert.equal(minutesTH(0), "0 นาที");
  assert.equal(minutesTH(45), "45 นาที");
  assert.equal(minutesTH(120), "2 ชม.");
  assert.equal(minutesTH(90), "1 ชม. 30 นาที");
  assert.equal(dateTimeTH("bad"), "—");
});

test("requested-date countdown uses Bangkok calendar days", () => {
  const now = Date.parse("2026-10-29T05:00:00Z");
  assert.deepEqual(requestedDayCountdown("2026-11-05T10:00:00Z", now), { text: "อีก 7 วัน", tone: "quiet" });
  assert.deepEqual(requestedDayCountdown("2026-10-29T16:00:00Z", now), { text: "ลูกค้าต้องการวันนี้", tone: "today" });
  assert.deepEqual(requestedDayCountdown("2026-10-27T10:00:00Z", now), { text: "เลยวันที่ลูกค้าต้องการ 2 วัน", tone: "danger" });
  assert.equal(requestedDayCountdown(undefined, now), null);
  assert.equal(requestedDayCountdown("2026-11-05T10:00:00Z", null), null);
});

test("status wording falls back without inventing a status", () => {
  assert.deepEqual(statusOf(JOB_STATUS, "queued"), { label: "รอเริ่มงาน", tone: "action" });
  assert.deepEqual(statusOf(JOB_STATUS, "toString"), { label: "สถานะยังไม่ระบุ", tone: "waiting" });
});
