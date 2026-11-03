import assert from "node:assert/strict";
import test from "node:test";

test("bahtText spells exact baht amounts in Thai", async () => {
  const { bahtText } = await import("../../../src/features/documents/documents-domain.ts");
  const cases = {
    "535.00": "ห้าร้อยสามสิบห้าบาทถ้วน",
    "2500.00": "สองพันห้าร้อยบาทถ้วน",
    "11.00": "สิบเอ็ดบาทถ้วน",
    "21.25": "ยี่สิบเอ็ดบาทยี่สิบห้าสตางค์",
    "101.00": "หนึ่งร้อยเอ็ดบาทถ้วน",
    "1000000.00": "หนึ่งล้านบาทถ้วน",
    "1000001.01": "หนึ่งล้านเอ็ดบาทหนึ่งสตางค์",
    "25000000.00": "ยี่สิบห้าล้านบาทถ้วน",
    "120000001.00": "หนึ่งร้อยยี่สิบล้านเอ็ดบาทถ้วน",
    "0.50": "ห้าสิบสตางค์",
    "0.00": "ศูนย์บาทถ้วน",
  };
  for (const [amount, words] of Object.entries(cases)) assert.equal(bahtText(amount), words, amount);
  for (const bad of ["12", "1.5", "-1.00", "abc", undefined]) assert.equal(bahtText(bad), undefined);
});
