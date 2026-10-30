import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as domain from "../../../src/features/customer/customer-domain.ts";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../../src/features/customer/customer-request-list.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
const componentModule = { exports: {} };
const stubs = {
  "next/link": "link",
  "../../components/appearance/icons": { Icon: "icon" },
  "./customer-domain": domain,
  "./customer-sales-data": { salesStep: () => "ขั้นตอนเดิม" },
  "./customer-ui": { Badge: "badge" },
  "./customer-requests.module.css": new Proxy({}, { get: (_target, key) => String(key) }),
};
runInNewContext(outputText, { module: componentModule, exports: componentModule.exports, require: (name) => name === "react/jsx-runtime" ? require(name) : stubs[name] ?? {} });
const { RequestCard, RequestCardSkeleton, RequestStatusFilters } = componentModule.exports;
const request = { id: "request-id", customer_id: "customer-id", no_request: "9007199254740993", qty: "9007199254740993", description: "ชิ้นงานตามแบบ", material_spec: "S45C", status: "ongoing", created_at: "2026-10-27T00:00:00Z" };
const base = { request, quotations: [] };
function nodes(value) {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object") return [];
  return [value, ...nodes(value.props?.children)];
}
function text(value) {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (value && typeof value === "object") return text(value.props?.children);
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

test("request cards preserve exact IDs, essential facts and detail links", () => {
  const tree = RequestCard({ record: base });
  const link = nodes(tree).find((node) => node.type === "link");
  assert.equal(link.props.href, "/customer/requests?request=request-id");
  assert.match(link.props["aria-label"], /9007199254740993/);
  assert.match(text(tree), /จำนวน\s+9007199254740993\s+ชิ้น/);
  assert.match(text(tree), /ไม่ได้ระบุ/);
  assert.doesNotMatch(text(tree), /ผู้สั่ง|ข้อกำหนดวัตถุดิบ/);
  assert.doesNotMatch(text(tree), /undefined|NaN|%/);
});
test("request cards reuse the existing badge mapping and never guess customer type", () => {
  for (const status of Object.keys(domain.REQUEST_LABELS)) {
    const tree = RequestCard({ record: { ...base, request: { ...request, status } } });
    const badge = nodes(tree).find((node) => node.type === "badge");
    assert.equal(badge.props.value, status);
    assert.equal(badge.props.labels, domain.REQUEST_LABELS);
  }
});
test("card secondary actions preserve quotation, evidence and job destinations", () => {
  const quotation = { id: "quote-id", version: 1, status: "sent" };
  const hrefs = (record) => nodes(RequestCard({ record })).filter((node) => node.type === "link").map((node) => node.props.href);
  assert.equal(hrefs({ ...base, quotations: [quotation] })[1], "/customer/quotations?request=request-id&quotation=quote-id");
  assert.equal(hrefs({ ...base, quotations: [{ ...quotation, status: "approved" }] })[1], "/customer/deposit-po?request=request-id&quotation=quote-id");
  assert.equal(hrefs({ ...base, quotations: [quotation], fulfillment: { job: { id: "job-id" } } })[1], "/customer/jobs?job=job-id");
  assert.equal(hrefs({ ...base, quotations: [quotation], issue: true }).length, 1);
  assert.equal(hrefs({ ...base, quotations: [quotation], request: { ...request, status: "canceled" } }).length, 1);
});
test("loading is announced once and decorative skeleton cards stay hidden from assistive technology", () => {
  const tree = RequestCardSkeleton();
  assert.equal(tree.props.role, "status");
  const grid = nodes(tree).find((node) => node.props?.["aria-hidden"] === "true");
  assert.equal(grid.props.children.length, 4);
});
test("status pills distinguish unavailable counts from known zero and preserve applied query links", () => {
  const props = { items: [], query: "S45C [test]", status: "completed", layout: "list", loading: false };
  const unknown = RequestStatusFilters({ ...props, countUnavailable: true });
  assert.match(text(unknown), /ยังโหลดจำนวนไม่ได้/);
  assert.doesNotMatch(text(unknown), /0 รายการ/);
  assert.match(text(RequestStatusFilters(props)), /0 รายการที่โหลดสำเร็จ/);
  const completed = nodes(unknown).find((node) => node.props?.["aria-current"] === "page");
  assert.equal(completed.props.href, "/customer/requests?q=S45C+%5Btest%5D&status=completed&layout=list");
});
