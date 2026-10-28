import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as domain from "../../../src/features/customer/customer-domain.ts";

const require = createRequire(import.meta.url); const mod = { exports: {} };
const source = readFileSync(new URL("../../../src/features/customer/customer-quotation-document.tsx", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
runInNewContext(output, { module: mod, exports: mod.exports, require: (name) => name === "react/jsx-runtime" ? require(name) : name === "./customer-domain" ? domain : {} });
function text(value) { return Array.isArray(value) ? value.map(text).join(" ") : value && typeof value === "object" ? text(value.props?.children) : typeof value === "string" || typeof value === "number" ? String(value) : ""; }
const request = { no_request: "9007199254740993", description: "ชิ้นงานตามแบบ", qty: "9223372036854775807", material_spec: "S45C" };
const quote = { quotation_no: "9007199254740994", version: 2, status: "approved", final_price: "9999999999999999.99", internal_costs: { material_cost: "SECRET_MATERIAL", labor_cost: "SECRET_LABOR", total_cost: "SECRET_TOTAL", minimum_price: "SECRET_MIN" } };

test("rendered/printed quotation preserves real identifiers and money and never leaks internal fields or invents issuer data", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote, customer: { name: "บริษัททดสอบ", customer_type: "company" } }));
  assert.match(result, /9007199254740993/); assert.match(result, /9007199254740994/); assert.match(result, /9223372036854775807/); assert.match(result, /9,999,999,999,999,999\.99/);
  assert.match(result, /ไม่มี VAT/); assert.match(result, /บริษัททดสอบ/); assert.match(result, /ไม่ใช่กำหนดส่งที่ร้านยืนยัน/);
  assert.doesNotMatch(result, /SECRET_|undefined|NaN|เลขทะเบียน|ส่วนลด|ค่าขนส่ง|ลายเซ็น/);
});

test("accepted document uses saved terms rather than recalculating from a changed customer profile", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote, customer: { name: "ผู้สั่ง", customer_type: "individual" }, terms: { customer_type: "company", deposit_required: false, po_required: true, deposit_amount: "0.00", accepted_at: "2026-10-28T05:00:00Z", documents_due_at: "2026-11-11T05:00:00Z" } }));
  assert.match(result, /บริษัท/); assert.match(result, /ไม่ต้องวางมัดจำ/); assert.match(result, /ต้องส่ง/); assert.match(result, /เงื่อนไขที่บันทึกเมื่อตอบรับ/);
  assert.doesNotMatch(result, /บุคคลทั่วไป|50%/);
});
