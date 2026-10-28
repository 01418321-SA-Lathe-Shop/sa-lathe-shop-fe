import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as domain from "../../../src/features/customer/customer-domain.ts";
import { availableActions } from "../../../src/features/delivery/delivery-domain.ts";

const require = createRequire(import.meta.url); const mod = { exports: {} };
const source = readFileSync(new URL("../../../src/features/customer/customer-job-cards.tsx", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const stubs = { "next/link": "link", "../../components/appearance/icons": { Icon: "icon" }, "../delivery/delivery-domain": { availableActions }, "./customer-domain": domain, "./customer-ui": { Badge: "badge" }, "./customer-requests.module.css": { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) } };
runInNewContext(output, { module: mod, exports: mod.exports, require: (name) => name === "react/jsx-runtime" ? require(name) : stubs[name] ?? {} });
function nodes(value) { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : []; }
function text(value) { return Array.isArray(value) ? value.map(text).join(" ") : value && typeof value === "object" ? text(value.props?.children) : typeof value === "string" || typeof value === "number" ? String(value) : ""; }
const job = { job_id: "job-id", request_id: "request-id", job_status: "queued", request_status: "ongoing", cycle: 1, deliveries: [] };
const request = { no_request: "9007199254740993", qty: "9223372036854775807", description: "ชิ้นงานตามแบบ", created_at: "2026-10-28T00:00:00Z" };

test("job cards share request-card styles and preserve original detail destinations and exact references", () => {
  const tree = mod.exports.JobCard({ job, request, requestLoading: false }); const link = nodes(tree).find((node) => node.type === "link");
  assert.equal(tree.props.className, "card"); assert.equal(link.props.className, "openCard"); assert.equal(link.props.href, "/customer/jobs?job=job-id");
  assert.match(link.props["aria-label"], /9007199254740993/); assert.match(text(tree), /9223372036854775807/); assert.match(text(tree), /ส่งคำขอเมื่อ/); assert.match(text(tree), /ไม่ใช่กำหนดส่งที่ร้านยืนยัน/); assert.match(text(tree), /ไม่ได้ระบุวันที่ต้องการ/);
});
test("production badges retain original status labels, separate delivery and rework, and never render finance/internal fields", () => {
  for (const status of Object.keys(domain.JOB_LABELS)) {
    const tree = mod.exports.JobCard({ job: { ...job, job_status: status, cycle: 2, invoice: { balance: "500.00" }, internal_costs: "PRIVATE_COST" }, request, requestLoading: false });
    const badge = nodes(tree).find((node) => node.type === "badge"); assert.equal(badge.props.labels, domain.JOB_LABELS); assert.equal(badge.props.value, status);
    assert.match(text(tree), /Job เดิม ไม่เพิ่มราคา/); assert.doesNotMatch(text(tree), /PRIVATE_COST|500.00|%/);
  }
  const tree = mod.exports.JobCard({ job: { ...job, job_status: "completed", deliveries: [{ status: "shipping" }] }, request, requestLoading: false });
  assert.match(text(tree), /จัดส่งแล้ว–รอตรวจรับ/); assert.match(text(tree), /ดูงานและตรวจรับ/);
});
test("missing request data has honest loading/error wording, without inventing dates, quantity or job number", () => {
  const loading = text(mod.exports.JobCard({ job, requestLoading: true })); const failed = text(mod.exports.JobCard({ job, requestLoading: false }));
  assert.match(loading, /กำลังโหลดคำขอ/); assert.match(failed, /ยังโหลดข้อมูลคำขอไม่ได้/); assert.doesNotMatch(failed, /undefined|NaN|0 ชิ้น|job-id|ไม่ได้ระบุวันที่ต้องการ/);
});
test("status pills distinguish unknown counts from zero and loading; skeleton announces one loading region", () => {
  const props = { counts: { all: 0, byStatus: { queued: 0, in_progress: 0, completed: 0, cancelled: 0 } }, query: "เพลา [แบบ]", status: "queued", loading: false, unavailable: false };
  const current = nodes(mod.exports.JobStatusFilters(props)).find((node) => node.props?.["aria-current"] === "page"); assert.equal(current.props.href, domain.customerHref("jobs", { q: props.query, status: "queued" }));
  assert.match(text(mod.exports.JobStatusFilters({ ...props, unavailable: true })), /ยังโหลดจำนวนไม่ได้/); assert.doesNotMatch(text(mod.exports.JobStatusFilters({ ...props, unavailable: true })), /0 รายการ/);
  assert.match(text(mod.exports.JobStatusFilters({ ...props, loading: true })), /กำลังโหลดจำนวน/);
  const skeleton = mod.exports.JobCardSkeleton(); assert.equal(skeleton.props.role, "status"); assert.equal(skeleton.props["aria-label"], "กำลังโหลดงานผลิต"); assert.equal(nodes(skeleton).find((node) => node.props?.["aria-hidden"] === "true").props.children.length, 4);
});
