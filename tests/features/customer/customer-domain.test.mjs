import assert from "node:assert/strict";
import test from "node:test";
import { customerHref, customerRequestLayout, dateTH, isBangkokToday, latestQuote, matchingRequests, moneyTH, readCollection, requestStatusCounts, unreadCount } from "../../../src/features/customer/customer-domain.ts";

test("customer amounts and quotation versions do not lose integer precision", () => {
  assert.equal(moneyTH("9999999999999999.99"), "9,999,999,999,999,999.99 บาท");
  assert.equal(latestQuote([{ id: "old", version: "9007199254740992" }, { id: "new", version: "9007199254740993" }]).id, "new");
});
test("customer links encode selectors and remain inside the customer area", () => {
  assert.equal(customerHref("requests", { request: "abc", view: undefined }), "/customer/requests?request=abc");
  assert.equal(customerHref("", { view: "settings" }), "/customer?view=settings");
});
test("request search is literal and combines with actual request status", () => {
  const data = [{ id: "a", no_request: "9007199254740993", description: "S45C [test]", status: "pending", created_at: "2026-10-27T00:00:00Z" }];
  assert.equal(matchingRequests(data, "[test]", "pending").length, 1);
  assert.equal(matchingRequests(data, "9007199254740993", "").length, 1);
  assert.equal(matchingRequests(data, "[test]", "canceled").length, 0);
});
test("request list sorts by exact request number descending and parses its layout strictly", () => {
  const items = [
    { id: "new-complete", no_request: "3", description: "C", status: "completed", created_at: "2026-10-29T00:00:00Z" },
    { id: "old-pending", no_request: "1", description: "A", status: "pending", created_at: "2026-10-27T00:00:00Z" },
    { id: "new-pending", no_request: "2", description: "B", status: "pending", created_at: "2026-10-28T00:00:00Z" },
  ];
  assert.deepEqual(matchingRequests(items, "", "").map((item) => item.id), ["new-complete", "new-pending", "old-pending"]);
  assert.deepEqual(matchingRequests([
    { ...items[0], id: "unsafe-low", no_request: "9007199254740993" },
    { ...items[0], id: "unsafe-high", no_request: "9007199254740994" },
  ], "", "").map((item) => item.id), ["unsafe-high", "unsafe-low"]);
  assert.equal(customerRequestLayout("list"), "list");
  assert.equal(customerRequestLayout("cards"), "cards");
  assert.equal(customerRequestLayout("unexpected"), "cards");
});
test("collection reads all pages and discloses a safety boundary", async () => {
  const paths = [];
  const api = { async call(path) { paths.push(path); return { items: path.includes("offset=0") ? Array(100).fill({ id: "a" }) : [{ id: "last" }] }; } };
  const result = await readCollection(api, "/requests", new AbortController().signal);
  assert.equal(result.items.length, 101); assert.equal(result.complete, true);
  assert.deepEqual(paths, ["/requests?limit=100&offset=0", "/requests?limit=100&offset=100"]);
  assert.equal((await readCollection(api, "/requests", new AbortController().signal, 1)).complete, false);
});
test("request tab counts use the applied literal query across all real statuses", () => {
  const items = ["pending", "ongoing", "completed", "canceled"].map((status, index) => ({ id: String(index), no_request: index, description: index === 1 ? "Other" : "S45C [test]", status, created_at: "2026-10-27T00:00:00Z" }));
  assert.deepEqual(requestStatusCounts(items, "[test]"), { all: 3, byStatus: { pending: 1, ongoing: 0, completed: 1, canceled: 1 } });
  assert.equal(requestStatusCounts(items, "").all, 4);
  assert.deepEqual(requestStatusCounts([], ""), { all: 0, byStatus: { pending: 0, ongoing: 0, completed: 0, canceled: 0 } });
  assert.equal(requestStatusCounts(items, "not found").all, 0);
});
test("notification badge never claims a partial count as total", () => {
  assert.equal(unreadCount([], true), ""); assert.equal(unreadCount([{ id: "a" }], true), "1");
  assert.equal(unreadCount([{ id: "a" }], false), "•"); assert.equal(unreadCount(Array(100).fill({}), true), "99+");
});
test("customer day grouping and display use Bangkok time", () => {
  const now = Date.parse("2026-10-27T18:00:00Z");
  assert.equal(isBangkokToday("2026-10-27T17:01:00Z", now), true);
  assert.equal(isBangkokToday("2026-10-27T16:59:00Z", now), false);
  assert.match(dateTH("2026-10-27T17:01:00Z"), /28/);
});
