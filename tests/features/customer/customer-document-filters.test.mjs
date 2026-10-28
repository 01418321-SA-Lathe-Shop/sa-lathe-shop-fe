import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as domain from "../../../src/features/customer/customer-documents-domain.ts";

const require = createRequire(import.meta.url); const mod = { exports: {} };
const source = readFileSync(new URL("../../../src/features/customer/customer-document-filters.tsx", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const stubs = { "next/navigation": { useRouter: () => ({ replace: () => {} }) }, "next/link": "link", "./customer-documents-domain": domain, "./customer-ui": { Field: "field" } };
runInNewContext(output, { module: mod, exports: mod.exports, URLSearchParams, require: (name) => name === "react/jsx-runtime" ? require(name) : stubs[name] ?? {} });
function nodes(value) { return Array.isArray(value) ? value.flatMap(nodes) : value && typeof value === "object" ? [value, ...nodes(value.props?.children)] : []; }
function render(query) { const params = domain.documentParams(new URLSearchParams(query)); return nodes(mod.exports.DocumentFilters({ section: "quotations", params, view: "quotes", labels: { sent: "รอพิจารณา" }, counts: {}, loading: false, unavailable: false })); }

test("URL filter changes remount the draft form, resetting stale text/select inputs after chip removal, clear and history", () => {
  const initial = render(""); const applied = render("q=shaft&type=company&min=100&sort=oldest"); const removed = render("type=company&min=100&sort=oldest"); const cleared = render("");
  const form = (tree) => tree.find((node) => node.type === "form");
  assert.notEqual(form(initial).key, form(applied).key); assert.notEqual(form(applied).key, form(removed).key); assert.notEqual(form(removed).key, form(cleared).key);
  const value = (tree, name) => tree.find((node) => node.props?.name === name).props.defaultValue;
  assert.equal(value(removed, "q"), ""); assert.equal(value(removed, "type"), "company"); assert.equal(value(cleared, "type"), ""); assert.equal(value(cleared, "min"), ""); assert.equal(value(cleared, "sort"), "newest");
  assert.equal(form(render("q=shaft&type=company&min=100&sort=oldest")).key, form(applied).key);
});
