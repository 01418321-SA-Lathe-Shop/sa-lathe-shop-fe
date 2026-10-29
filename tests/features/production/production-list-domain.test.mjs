import test from "node:test";
import assert from "node:assert/strict";
import { defaultProductionTab, editableQuantity, isPositiveQuantity, planReadiness, productionCounts, productionRows, productionTab } from "../../../src/features/production/production-list-domain.ts";

const requests = [
  { id: "r1", no_request: "9007199254740993", description: "เพลา S45C", deadline: "2026-11-20T03:00:00Z" },
  { id: "r2", no_request: 2, description: "บูช POM", deadline: "2026-11-05T03:00:00Z" },
  { id: "r3", no_request: 3, description: "แผ่นแม่พิมพ์" },
];
const jobs = [
  { job_id: "a", request_id: "r3", status: "queued", material_plan_version: 1 },
  { job_id: "b", request_id: "r1", status: "queued", material_plan_version: 1 },
  { job_id: "c", request_id: "r2", status: "queued", material_plan_version: 1 },
  { job_id: "d", request_id: "r1", status: "in_progress", material_plan_version: 2 },
  { job_id: "e", request_id: "r2", status: "completed", completed_at: "2026-10-01T00:00:00Z" },
  { job_id: "f", request_id: "r3", status: "completed", completed_at: "2026-10-20T00:00:00Z" },
  { job_id: "g", request_id: "missing", status: "queued", material_plan_version: 1 },
];
const ids = (rows) => rows.map((row) => row.job.job_id);

test("open work sorts by the requested date with undated jobs last and stable ties", () => {
  assert.deepEqual(ids(productionRows(jobs, requests, "queued", "")), ["c", "b", "a", "g"]);
  assert.deepEqual(ids(productionRows(jobs, requests, "completed", "")), ["f", "e"]);
  assert.deepEqual(ids(productionRows(jobs, requests, "all", "")), ["d", "c", "b", "a", "g", "f", "e"]);
});

test("search is literal over exact request numbers and descriptions; counts follow the search", () => {
  assert.deepEqual(ids(productionRows(jobs, requests, "all", "9007199254740993")), ["d", "b"]);
  assert.deepEqual(ids(productionRows(jobs, requests, "all", "s45c")), ["d", "b"]);
  assert.deepEqual(productionRows(jobs, requests, "all", ".*"), []);
  assert.deepEqual(productionCounts(jobs, requests, ""), { queued: 4, in_progress: 1, completed: 2, all: 7 });
  assert.deepEqual(productionCounts(jobs, requests, "บูช"), { queued: 1, in_progress: 0, completed: 1, all: 2 });
});

test("tabs parse strictly and default to the first tab with work", () => {
  assert.equal(productionTab("completed"), "completed");
  assert.equal(productionTab("cancelled"), null);
  assert.equal(defaultProductionTab({ queued: 0, in_progress: 2, completed: 1, all: 3 }), "in_progress");
  assert.equal(defaultProductionTab({ queued: 0, in_progress: 0, completed: 0, all: 0 }), "queued");
});

test("readiness mirrors the Start rule: a ready plan at the job's plan version", () => {
  const line = (shortage) => ({ material_id: "m", required: "5.000000", reserved: "5.000000", consumed: "0.000000", shortage });
  assert.deepEqual(planReadiness({ version: 1, ready: true, lines: [line("0.000000")] }, { material_plan_version: 1 }), { state: "ready", short: 0 });
  assert.deepEqual(planReadiness({ version: 1, ready: false, lines: [line("2.500000"), line("0.000000")] }, { material_plan_version: 1 }), { state: "short", short: 1 });
  assert.deepEqual(planReadiness({ version: 2, ready: true, lines: [line("0.000000")] }, { material_plan_version: 1 }), { state: "changed", short: 0 });
  assert.deepEqual(planReadiness({ version: 1, ready: false, lines: null }, { material_plan_version: 1 }), { state: "empty", short: 0 });
});

test("plan and usage inputs edit exact six-place quantities without floats", () => {
  assert.equal(editableQuantity("5.000000"), "5");
  assert.equal(editableQuantity("100.000000"), "100");
  assert.equal(editableQuantity("1.250000"), "1.25");
  assert.equal(editableQuantity("0.000001"), "0.000001");
  for (const ok of ["1", "0.5", " 2.000001 ", "999999999999.999999"]) assert.equal(isPositiveQuantity(ok), true, ok);
  for (const bad of ["", "0", "0.000000", "-1", "1e3", "1.2345678", "1,000", "1000000000000"]) assert.equal(isPositiveQuantity(bad), false, bad);
});
