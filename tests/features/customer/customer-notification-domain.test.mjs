import assert from "node:assert/strict";
import test from "node:test";
import { markNotifications } from "../../../src/features/customer/customer-notification-domain.ts";

test("partial read-all preserves confirmed reads, refreshes and stops on failure", async () => {
  const calls = [], confirmed = []; let refreshed = 0;
  const error = new Error("connection failed");
  const api = { async call(path) { calls.push(path); if (calls.length === 3) throw error; } };
  await assert.rejects(markNotifications(api, ["a", "b", "c", "d"], new AbortController().signal, (id) => confirmed.push(id), () => refreshed++), (caught) => caught === error);
  assert.deepEqual(confirmed, ["a", "b"]); assert.equal(calls.length, 3); assert.equal(refreshed, 1);
});
test("uncertain first read response reconciles without automatic retry", async () => {
  let calls = 0, confirmed = 0, refreshed = 0;
  await assert.rejects(markNotifications({ async call() { calls++; throw new Error("lost response"); } }, ["a"], new AbortController().signal, () => confirmed++, () => refreshed++));
  assert.equal(calls, 1); assert.equal(confirmed, 0); assert.equal(refreshed, 1);
});
test("successful reads reconcile once and empty commands do nothing", async () => {
  let calls = 0, refreshed = 0; const confirmed = [];
  const api = { async call() { calls++; } };
  for (const ids of [["a", "b"], []]) await markNotifications(api, ids, new AbortController().signal, (id) => confirmed.push(id), () => refreshed++);
  assert.equal(calls, 2); assert.deepEqual(confirmed, ["a", "b"]); assert.equal(refreshed, 1);
});
