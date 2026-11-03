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
const shop = { name: "ร้านทดสอบ", address: "1 ถนนทดสอบ", phone: "021111111", taxId: "0105555555555", bankName: "ธนาคารทดสอบ", bankAccountName: "ร้านทดสอบ", bankAccountNo: "123-4-56789-0" };
const clean = (result) => assert.doesNotMatch(result, /SECRET_|undefined|NaN|\[ที่อยู่ร้าน\]|\[เบอร์โทรศัพท์\]|ส่วนลด|ภาษีมูลค่าเพิ่ม 7/);

test("quotation keeps exact identifiers and money, never leaks internal costs or placeholders", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote: { ...quote, notes: "ราคานี้ไม่รวมค่าขนส่ง", valid_until: "2026-11-30" }, shop, customer: { name: "บริษัททดสอบ", taxId: "0109999999999" }, customerType: "company" }));
  for (const value of ["9007199254740993", "9007199254740994", "9,223,372,036,854,775,807", "9,999,999,999,999,999.99 บาท", "บริษัททดสอบ", "0109999999999", "ไม่ได้คิดภาษีมูลค่าเพิ่ม", "Quotation", "ราคานี้ไม่รวมค่าขนส่ง", "30 พฤศจิกายน 2569", "123-4-56789-0", "0105555555555", "เก้าพันเก้าร้อยเก้าสิบเก้าล้านเก้าแสนเก้าหมื่นเก้าพันเก้าร้อยเก้าสิบเก้าล้านเก้าแสนเก้าหมื่นเก้าพันเก้าร้อยเก้าสิบเก้าบาทเก้าสิบเก้าสตางค์"]) assert(result.includes(value), value);
  clean(result);
});

test("accepted quotation prints the saved terms, not a recalculation from the current profile", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote, shop, customer: { name: "ผู้สั่ง" }, customerType: "individual", terms }));
  assert.match(result, /นิติบุคคล/); assert.match(result, /ไม่ต้องวางมัดจำ/); assert.match(result, /ต้องส่งใบสั่งซื้อ \(PO\)/); assert.match(result, /11 พฤศจิกายน 2569/);
  assert.doesNotMatch(result, /บุคคลธรรมดา|50%/); clean(result);
});

test("quotation hides unsaved details, dates the signature from the record and has no closing message", () => {
  const result = text(mod.exports.QuotationDocument({ request, quote, shop: { name: "ร้านทดสอบ" }, customer: { name: "ผู้สั่ง" }, customerType: "individual" }));
  assert.doesNotMatch(result, /ที่อยู่|เลขประจำตัวผู้เสียภาษี|เบอร์ติดต่อ|ช่องทางการชำระเงิน|Thank You|ขอบคุณ/);
  assert.equal(result.match(/20 ตุลาคม 2569/g)?.length, 2, "header date and signature date"); clean(result);
});

test("purchase order lists every line with exact quantities, unit costs and totals", () => {
  const order = { id: "o1", order_no: "PO-0001", supplier: { name: "ร้านเหล็กดี", email: "", phone: "021234567" }, job_ids: ["3f2a9c1e-0000-4000-8000-000000000000"], status: "ordered", supplier_response: "pending", total_amount: "1250.50", created_at: "2026-11-01T03:00:00Z",
    lines: [{ material_id: "m1", material_name: "เหล็กเพลา S45C", unit_id: "u1", unit_name: "เส้น", quantity: "12.500000", unit_cost: "100.040000", total_amount: "1250.50" }] };
  const result = text(mod.exports.PurchaseOrderDocument({ order, shop }));
  for (const value of ["MATERIAL PURCHASE ORDER", "ใบสั่งซื้อวัสดุ", "PO-0001", "ร้านเหล็กดี", "021234567", "เหล็กเพลา S45C", "12.5", "เส้น", "100.04", "1,250.50 บาท", "3F2A9C1E", "รอผู้ขายตอบ"]) assert(result.includes(value), value);
  clean(result);
});

test("job contract is formal Thai built from recorded terms, with fill-in lines for missing facts", () => {
  const job = { id: "3f2a9c1e-0000-4000-8000-000000000000", quotation_id: "q1", request_id: "r1", status: "queued", deposit_amount: "0.00", balance: "9999999999999999.99", due_at: "2026-11-30T17:00:00Z", created_at: "2026-11-01T03:00:00Z" };
  const result = text(mod.exports.JobContractDocument({ request, quote, terms, job, shop, customer: { name: "บริษัททดสอบ", address: "99 ถนนลูกค้า", taxId: "0109999999999" } }));
  for (const value of ["สัญญาจ้างทำของ", "JOB-3F2A9C1E", "ผู้รับจ้าง", "ผู้ว่าจ้าง", "บริษัททดสอบ", "99 ถนนลูกค้า", "0109999999999", "0105555555555", "ผู้มีอำนาจลงนาม", "9,999,999,999,999,999.99 บาท", "ต้องส่งใบสั่งซื้อ (PO)", "แก้ไขงานโดยไม่คิดค่าใช้จ่ายเพิ่ม", "พยาน", "ข้อตกลงเพิ่มเติม"]) assert(result.includes(value), value);
  assert.match(result, /ใบเสนอราคาเลขที่ #\s*9007199254740994/); assert.doesNotMatch(result, /ภายในวันที่ [0-9]|1 ธันวาคม 2569/);
  clean(result);
});

test("customer PO is bilingual, uses the accepted price and spells the total without VAT", () => {
  const poMod = { exports: {} };
  const poSource = readFileSync(new URL("../../../src/features/documents/customer-po-document.tsx", import.meta.url), "utf8");
  const poOut = ts.transpileModule(poSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  runInNewContext(poOut, { module: poMod, exports: poMod.exports, Intl, BigInt, String, require: (name) => ({ ...modules, "./business-documents": mod.exports })[name] ?? {} });
  const po = { quotation_id: "q1", po_no: "PO-2026/0042", issued_on: "2026-11-03", remarks: "ส่งของพร้อมใบกำกับ", lock_version: 1, updated_at: "2026-11-03T03:00:00Z" };
  const result = text(poMod.exports.CustomerPurchaseOrderDocument({ po, request, quote, terms: { ...terms, final_price: "535.00" }, shop, customer: { name: "บริษัททดสอบ", taxId: "0109999999999" } }));
  for (const value of ["ใบสั่งซื้อ", "Purchase Order", "PO-2026/0042", "3 พฤศจิกายน 2569", "Payee", "Issuer", "ร้านทดสอบ", "บริษัททดสอบ", "0109999999999", "535.00 บาท", "ห้าร้อยสามสิบห้าบาทถ้วน", "ส่งของพร้อมใบกำกับ", "Approved by", "Accepted by", "#", "9007199254740994", "ไม่ได้คิดภาษีมูลค่าเพิ่ม"]) assert(result.includes(value), value);
  assert.doesNotMatch(result, /9,999,999/); clean(result);
});
