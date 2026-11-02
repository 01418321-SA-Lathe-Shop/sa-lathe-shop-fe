import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as customerDomain from "../../../src/features/customer/customer-domain.ts";
import * as requestDomain from "../../../src/features/customer/customer-request-domain.ts";
import * as procurement from "../../../src/features/procurement/procurement-domain.ts";
import * as staffFormat from "../../../src/components/staff-ui/staff-format.ts";
import * as staffLabels from "../../../src/components/staff-ui/staff-labels.ts";
import * as documents from "../../../src/features/documents/documents-domain.ts";

const require = createRequire(import.meta.url); const mod = { exports: {} };
const modules = { "react/jsx-runtime": require("react/jsx-runtime"), "../customer/customer-domain": customerDomain, "../customer/customer-request-domain": requestDomain, "../procurement/procurement-domain": procurement, "../../components/staff-ui/staff-format": staffFormat, "../../components/staff-ui/staff-labels": staffLabels, "./documents-domain": documents };
const source = readFileSync(new URL("../../../src/features/documents/business-documents.tsx", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
runInNewContext(output, { module: mod, exports: mod.exports, Intl, BigInt, String, require: (name) => modules[name] ?? {} });
// Render function components (not DOM) down to their text.
function text(node) {
  if (Array.isArray(node)) return node.map(text).join(" ");
  if (node && typeof node === "object") return typeof node.type === "function" ? text(node.type(node.props)) : text(node.props?.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
const request = { customer_id: "abcdef12-0000-4000-8000-000000000000", no_request: "9007199254740993", description: "ชิ้นงานตามแบบ", qty: "9223372036854775807", material_spec: "S45C", created_at: "2026-10-01T03:00:00Z" };
const quote = { id: "q1", quotation_no: "9007199254740994", version: 2, status: "approved", final_price: "9999999999999999.99", sent_at: "2026-10-20T03:00:00Z", internal_costs: { material_cost: "SECRET_MATERIAL", labor_cost: "SECRET_LABOR", total_cost: "SECRET_TOTAL", minimum_price: "SECRET_MIN" } };
const terms = { customer_type: "company", final_price: "9999999999999999.99", deposit_required: false, po_required: true, deposit_amount: "0.00", balance_after_deposit: "9999999999999999.99", accepted_at: "2026-10-28T05:00:00Z", documents_due_at: "2026-11-11T05:00:00Z" };
const clean = (result) => assert.doesNotMatch(result, /SECRET_|undefined|NaN|\[ที่อยู่ร้าน\]|\[เบอร์โทรศัพท์\]|ส่วนลด|ภาษีมูลค่าเพิ่ม 7/);

test("quotation keeps exact identifiers and money, never leaks internal costs or placeholders", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote, customer: { name: "บริษัททดสอบ", customer_type: "company" } }));
  for (const value of ["9007199254740993", "9007199254740994", "9,223,372,036,854,775,807", "9,999,999,999,999,999.99 บาท", "บริษัททดสอบ", "ABCDEF12", "ไม่ได้คิดภาษีมูลค่าเพิ่ม", "ไม่ใช่กำหนดส่งที่ร้านยืนยัน", "QUOTATION"]) assert(result.includes(value), value);
  clean(result);
});

test("accepted quotation prints the saved terms, not a recalculation from the current profile", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote, customer: { name: "ผู้สั่ง", customer_type: "individual" }, terms }));
  assert.match(result, /นิติบุคคล/); assert.match(result, /ไม่ต้องวางมัดจำ/); assert.match(result, /ต้องส่งใบสั่งซื้อ \(PO\)/); assert.match(result, /11 พฤศจิกายน 2569/);
  assert.doesNotMatch(result, /บุคคลธรรมดา|50%/); clean(result);
});

test("purchase order lists every line with exact quantities, unit costs and totals", () => {
  const order = { id: "o1", order_no: "PO-0001", supplier: { name: "ร้านเหล็กดี", email: "", phone: "021234567" }, job_ids: ["3f2a9c1e-0000-4000-8000-000000000000"], status: "ordered", supplier_response: "pending", total_amount: "1250.50", created_at: "2026-11-01T03:00:00Z",
    lines: [{ material_id: "m1", material_name: "เหล็กเพลา S45C", unit_id: "u1", unit_name: "เส้น", quantity: "12.500000", unit_cost: "100.040000", total_amount: "1250.50" }] };
  const result = text(mod.exports.PurchaseOrderDocument({ order }));
  for (const value of ["PURCHASE ORDER", "PO-0001", "ร้านเหล็กดี", "021234567", "เหล็กเพลา S45C", "12.5", "เส้น", "100.04", "1,250.50 บาท", "3F2A9C1E", "รอผู้ขายตอบ"]) assert(result.includes(value), value);
  clean(result);
});

test("job contract is formal Thai built from recorded terms, with fill-in lines for missing facts", () => {
  const job = { id: "3f2a9c1e-0000-4000-8000-000000000000", quotation_id: "q1", request_id: "r1", status: "queued", deposit_amount: "0.00", balance: "9999999999999999.99", due_at: "2026-11-30T17:00:00Z", created_at: "2026-11-01T03:00:00Z" };
  const result = text(mod.exports.JobContractDocument({ request, quote, terms, job, customer: { name: "บริษัททดสอบ", customer_type: "company" } }));
  for (const value of ["สัญญาจ้างทำของ", "JOB-3F2A9C1E", "ผู้รับจ้าง", "ผู้ว่าจ้าง", "บริษัททดสอบ", "ผู้มีอำนาจลงนาม", "9,999,999,999,999,999.99 บาท", "ต้องส่งใบสั่งซื้อ (PO)", "แก้ไขงานโดยไม่คิดค่าใช้จ่ายเพิ่ม", "พยาน", "ข้อตกลงเพิ่มเติม"]) assert(result.includes(value), value);
  assert.match(result, /ใบเสนอราคาเลขที่ #\s*9007199254740994/); assert.doesNotMatch(result, /ภายในวันที่ [0-9]|1 ธันวาคม 2569/);
  clean(result);
});
