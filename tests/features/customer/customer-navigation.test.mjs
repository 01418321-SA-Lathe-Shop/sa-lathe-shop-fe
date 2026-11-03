import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { CUSTOMER_NAV } from "../../../src/features/customer/customer-navigation.ts";
import { canAccessWorkspace } from "../../../src/features/workspace/workspace-access.ts";

const ROUTES = ["/customer", "/customer/requests", "/customer/jobs", "/customer/quotations", "/customer/deposit-po", "/customer/payments", "/customer/documents", "/customer/inbox", "/customer/memberships", "/customer/delivery-payment"];

function pageWorkspace(path) {
  const file = new URL(`../../../app${path}/page.tsx`, import.meta.url);
  assert(existsSync(file), `${path} has no page`);
  const source = readFileSync(file, "utf8");
  const target = source.match(/redirect\("([^"]+)"\)/)?.[1];
  return target ? pageWorkspace(target) : source.match(/role="Customer" workspaceId="([^"]+)"/)?.[1];
}

test("every Customer route has a page the Customer route guard admits", () => {
  for (const path of ROUTES) assert(canAccessWorkspace("Customer", pageWorkspace(path)), path);
});

test("the Customer menu keeps its Thai groups and points only at Customer routes", () => {
  assert.deepEqual(CUSTOMER_NAV.map((group) => group.label), ["WORKSPACE", "งานของฉัน", "เอกสารและการชำระเงิน", "บัญชี"]);
  const hrefs = CUSTOMER_NAV.flatMap((group) => group.items.map((item) => item.href));
  assert.equal(new Set(hrefs).size, hrefs.length);
  for (const href of hrefs) assert(ROUTES.includes(href.split("?")[0]), href);
});
