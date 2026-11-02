import assert from "node:assert/strict";
import test from "node:test";

test("documents never print placeholder shop facts", async () => {
  const { confirmed, jobRef, missingContractInfo } = await import("../../../src/features/documents/documents-domain.ts");
  assert.equal(confirmed("[ที่อยู่ร้าน]"), undefined);
  assert.equal(confirmed("  "), undefined);
  assert.equal(confirmed(" Bangkok Machine Shop "), "Bangkok Machine Shop");
  assert.equal(jobRef("3f2a9c1e-0000-4000-8000-000000000000"), "3F2A9C1E");
  const all = missingContractInfo({});
  assert(all.includes("ชื่อผู้ว่าจ้าง") && all.includes("กำหนดส่งมอบที่ร้านยืนยัน") && all.includes("ระยะเวลาเครดิตของใบแจ้งหนี้"));
  const known = missingContractInfo({ customerName: "บริษัท ตัวอย่าง จำกัด", creditDays: 0 });
  assert(!known.includes("ชื่อผู้ว่าจ้าง") && !known.includes("ระยะเวลาเครดิตของใบแจ้งหนี้"));
  assert(known.includes("กำหนดส่งมอบที่ร้านยืนยัน"), "requested dates are never a confirmed delivery date");
});

test("printed dates use the long Thai form in Bangkok time", async () => {
  const { longDateTH } = await import("../../../src/features/documents/documents-domain.ts");
  assert.equal(longDateTH("2026-11-02T18:30:00Z"), "3 พฤศจิกายน 2569");
  assert.equal(longDateTH(undefined), undefined);
  assert.equal(longDateTH("not a date"), undefined);
});
