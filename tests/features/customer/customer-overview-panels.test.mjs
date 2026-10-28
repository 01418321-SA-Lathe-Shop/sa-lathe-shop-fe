import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as domain from "../../../src/features/customer/customer-domain.ts";
import * as overview from "../../../src/features/customer/customer-overview-domain.ts";

const require = createRequire(import.meta.url); const mod = { exports: {} };
let state = 6;
const source = readFileSync(new URL("../../../src/features/customer/customer-overview-panels.tsx", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const stubs = { react: { useState: initial => [state === null ? initial : state, value => { state = typeof value === "function" ? value(state) : value; }] }, "next/link": "link", "../../components/appearance/icons": { Icon: "icon" }, "./customer-overview-domain": overview, "./customer-domain": domain, "./customer-ui": { Badge: "badge" }, "./customer-overview.module.css": { __esModule: true, default: new Proxy({}, { get: (_target, key) => String(key) }) } };
runInNewContext(output, { module: mod, exports: mod.exports, require: name => name === "react/jsx-runtime" ? require(name) : stubs[name] ?? {} });
function nodes(value) { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : []; }
function text(value) { return Array.isArray(value) ? value.map(text).join(" ") : value && typeof value === "object" ? text(value.props?.children) : typeof value === "string" || typeof value === "number" ? String(value) : ""; }
const job = { job_id: "j1", invoice: { number: "INV-1", status: "partial", balance: "90071992547409.99" }, payments: [{ status: "pending" }] };
const item = { job, name: "เพลาตามแบบ", reference: "คำขอ #9007199254740993", href: "/customer/jobs?job=j1", due: "2026-10-20T00:00:00Z" };

test("payment dashboard keeps exact balance, actual deadline, pending-proof warning and existing invoice link", () => {
  const tree = mod.exports.OverviewPayments({ items: [item], now: Date.parse("2026-10-28T00:00:00Z") });
  assert.match(text(tree), /90,071,992,547,409.99 บาท/); assert.match(text(tree), /เกินกำหนด/); assert.match(text(tree), /ยอดยังไม่ลด/);
  assert.equal(nodes(tree).find(node => node.type === "link").props.href, "/customer/payments?job=j1");
  assert.equal(nodes(tree).find(node => node.type === "time").props.dateTime, item.due);
});

test("readiness distinguishes completed and shipped without inventing arrival dates", () => {
  const completed = mod.exports.OverviewReady({ items: [item] }); assert.match(text(completed), /ยังไม่มีการจัดส่งรอบนี้/);
  const shipped = mod.exports.OverviewReady({ items: [{ ...item, job: { ...job, deliveries: [{ status: "shipping", shipped_at: item.due }] } }] });
  assert.match(text(shipped), /จัดส่งเมื่อ/); assert.match(text(shipped), /ตรวจรับงาน/);
  assert(nodes(shipped).some(node => node.type === "link" && node.props.href === "/customer/delivery-payment?job=j1"));
  assert.doesNotMatch(text(shipped), /ETA|คาดว่าจะได้รับ|%/);
});

test("activity expands locally and links dated factual updates directly to their original records", () => {
  state = 6;
  const items = Array.from({ length: 8 }, (_, index) => ({ id: String(index), title: "ผลิตงานเสร็จแล้ว", kind: "job", name: "เพลา", reference: "คำขอ #1", at: item.due, href: item.href }));
  const tree = mod.exports.OverviewActivity({ items, now: null });
  assert.equal(nodes(tree).filter(node => node.type === "li").length, 6);
  nodes(tree).find(node => node.type === "button").props.onClick();
  assert.equal(nodes(mod.exports.OverviewActivity({ items, now: null })).filter(node => node.type === "li").length, 8);
});

test("loading/error and partial empty states never claim a verified all-clear", () => {
  assert.equal(mod.exports.PanelState({ loading: true }).props.role, "status");
  assert.match(text(mod.exports.PanelState({ unavailable: true })), /ยังสรุปรายการนี้ไม่ได้/);
  assert.match(text(mod.exports.OverviewAttention({ items: [], complete: false })), /ข้อมูลที่โหลดได้/);
  assert.doesNotMatch(text(mod.exports.OverviewAttention({ items: [], complete: false })), /ตอนนี้ไม่มีรายการ/);
});
