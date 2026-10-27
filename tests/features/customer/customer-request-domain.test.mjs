import assert from "node:assert/strict";
import test from "node:test";
import { quotePreview, requestPayload } from "../../../src/features/customer/customer-request-domain.ts";

const now = Date.parse("2026-10-27T00:00:00Z");
const base = { customerId: "customer", description: " แม่พิมพ์อัดยาง ", qty: "9007199254740993", material: " S45C ", deadline: "2026-11-01T10:00" };
test("wizard retains int64 quantity and explicit Bangkok date", () => {
  const result = requestPayload(base, now);
  assert.equal(result.qty, BigInt("9007199254740993")); assert.equal(result.description, "แม่พิมพ์อัดยาง");
  assert.equal(result.deadline, "2026-11-01T03:00:00.000Z"); assert.equal(result.material_spec, "S45C");
});
test("wizard rejects invalid fields before creating a request", () => {
  for (const invalid of [{ description: " " }, { qty: "0" }, { qty: "1.5" }, { customerId: "" }, { deadline: "2026-02-30T10:00" }, { deadline: "2026-01-01T10:00" }, { material: "a".repeat(2001) }]) assert.throws(() => requestPayload({ ...base, ...invalid }, now));
  assert.equal(requestPayload({ ...base, deadline: "" }, now).deadline, undefined);
});
test("quotation preview preserves 10000 boundary and upward satang rounding", () => {
  assert.deepEqual(quotePreview("10000.00", "company"), { deposit: false, po: true, minimum: "5000.00" });
  assert.deepEqual(quotePreview("10000.01", "company"), { deposit: true, po: true, minimum: "5000.01" });
  assert.deepEqual(quotePreview("1600.01", "individual"), { deposit: true, po: false, minimum: "800.01" });
  assert.equal(quotePreview("0.00", "individual").minimum, "0.00");
});
