import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { jobRoutes } from "../../src/mocks/routes/mock-routes-jobs.ts";
import { salesRoutes } from "../../src/mocks/routes/mock-routes-sales.ts";
import { stockRoutes } from "../../src/mocks/routes/mock-routes-stock.ts";

test("mock endpoint order, methods, paths and permissions match the pre-refactor contract", () => {
  const expected = JSON.parse(readFileSync(new URL("./route-contract.json", import.meta.url), "utf8"));
  const actual = [...salesRoutes, ...stockRoutes, ...jobRoutes].map(({ method, parts, access }) => ({ method, path: "/" + parts.join("/"), access }));
  assert.deepEqual(actual, expected.map(({ method, path, access }) => ({ method, path, access: JSON.parse(access) })));
  assert.equal(new Set(actual.map(({ method, path }) => `${method} ${path}`)).size, actual.length);
});
