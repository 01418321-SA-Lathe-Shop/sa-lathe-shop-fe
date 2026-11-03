import assert from "node:assert/strict";
import test from "node:test";

test("documents never print placeholder shop facts", async () => {
  const { confirmed, jobRef, missingContractInfo } = await import("../../../src/features/documents/documents-domain.ts");
  assert.equal(confirmed("[ที่อยู่ร้าน]"), undefined);
  assert.equal(confirmed("  "), undefined);
  assert.equal(confirmed(" Bangkok Machine Shop "), "Bangkok Machine Shop");
  assert.equal(jobRef("3f2a9c1e-0000-4000-8000-000000000000"), "3F2A9C1E");
  const all = missingContractInfo({ shop: {}, customer: {} });
  assert(["ชื่อผู้ว่าจ้าง", "ที่อยู่ผู้ว่าจ้าง", "เลขประจำตัวผู้เสียภาษีของร้าน", "กำหนดส่งมอบที่ร้านยืนยัน", "ระยะเวลาเครดิตของใบแจ้งหนี้"].every((item) => all.includes(item)));
  const known = missingContractInfo({ shop: { address: "a", phone: "p", taxId: "t" }, customer: { name: "บริษัท ตัวอย่าง จำกัด", address: "a", phone: "p", taxId: "t" }, creditDays: 0 });
  assert.deepEqual(known, ["กำหนดส่งมอบที่ร้านยืนยัน", "สถานที่ส่งมอบ"]);
  assert(known.includes("กำหนดส่งมอบที่ร้านยืนยัน"), "requested dates are never a confirmed delivery date");
});

test("shop details come from the saved profile; landing facts fill only empty fields", async () => {
  const { shopParty, customerParty } = await import("../../../src/features/documents/documents-domain.ts");
  const empty = { name: "", address: "", tax_id: "", phone: "", email: "", bank_name: "", bank_account_name: "", bank_account_no: "" };
  assert.equal(shopParty({ ...empty, name: " ร้านจริง " }).name, "ร้านจริง");
  assert.equal(shopParty(empty).name, "Bangkok Machine Shop");
  assert.equal(shopParty(empty).address, undefined, "landing placeholders never print");
  assert.equal(shopParty(empty).taxId, undefined);
  assert.deepEqual(customerParty({ name: "ก", address: "", tax_id: " 1 ", phone: "", email: "" }), { name: "ก", address: undefined, taxId: "1", phone: undefined, email: undefined });
});

test("printed dates use the long Thai form in Bangkok time", async () => {
  const { longDateTH } = await import("../../../src/features/documents/documents-domain.ts");
  assert.equal(longDateTH("2026-11-02T18:30:00Z"), "3 พฤศจิกายน 2569");
  assert.equal(longDateTH(undefined), undefined);
  assert.equal(longDateTH("not a date"), undefined);
});
