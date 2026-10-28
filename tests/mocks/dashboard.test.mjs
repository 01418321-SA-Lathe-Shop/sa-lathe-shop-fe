import test from "node:test";
import assert from "node:assert/strict";
import { createLatheMockBackend, MOCK_PASSWORD } from "../../src/mocks/data/mock-seed.ts";
import { bangkokDay } from "../../src/features/staff-overview/overview-domain.ts";
function session(backend, username) {
  const login = backend.dispatch("POST", "/auth/login", null, { username, password: MOCK_PASSWORD });
  return path => backend.dispatch("GET", path, login.body.access_token);
}
test("report routes are staff-only, strict and do not expose internal costs", () => {
  const mock = createLatheMockBackend();
  assert.equal(session(mock, "somchai")("/dashboard/overview").status, 403);
  assert.equal(mock.dispatch("GET", "/dashboard/jobs", null).status, 401);
  for (const name of ["anan.staff", "pim.admin"]) {
    const get = session(mock, name); const report = get("/dashboard/overview");
    assert.equal(report.status, 200); assert.equal(report.body.counts.total, 5);
    assert.equal(get("/dashboard/jobs").body.items.length, 5);
    assert(!JSON.stringify(get("/dashboard/jobs").body).includes("cost"));
    for (const path of ["?range=all", "?range=", "?range=7d&range=30d", "?status=queued"]) assert.equal(get(`/dashboard/overview${path}`).status, 400);
    assert.equal(get("/dashboard/jobs?status=canceled").status, 400);
    assert.equal(get("/dashboard/jobs?range=30d&first_completed_on=2026-10-28").status, 400);
  }
});
test("full totals include >100 jobs and cancelled jobs without request double counting", () => {
  const mock = createLatheMockBackend(); const template = mock.db.jobs[0];
  for (let i = 0; i < 120; i++) mock.db.jobs.push({ ...template, id: crypto.randomUUID(), status: "cancelled" });
  const get = session(mock, "anan.staff");
  assert.equal(get("/dashboard/overview").body.counts.total, 125);
  const page = get("/dashboard/jobs?status=cancelled&limit=20&offset=100").body;
  assert.equal(page.total, 120); assert.equal(page.items.length, 20);
});
test("first completion survives rework, is not renumbered into the window, and missing audit stays unknown", () => {
  const mock = createLatheMockBackend(); const get = session(mock, "anan.staff");
  const job = mock.db.jobs.find(j => j.status === "completed");
  const first = job.production.events.find(e => e.action === "complete");
  job.production.events.push({ ...first, id: crypto.randomUUID(), created_at: new Date().toISOString() });
  job.status = "in_progress"; job.production.completed_at = undefined;
  assert.equal(get("/dashboard/overview").body.heatmap.summary.total, 2);
  assert.equal(get(`/dashboard/jobs?first_completed_on=${bangkokDay(first.created_at)}`).body.total, 2);
  first.created_at = "2020-01-01T00:00:00Z";
  assert.equal(get("/dashboard/overview").body.heatmap.summary.total, 1);
  const other = mock.db.jobs.find(j => j.status === "completed"); other.production.events = [];
  const heatmap = get("/dashboard/overview").body.heatmap;
  assert.equal(heatmap.history_complete, false); assert.equal(heatmap.summary.current_streak, null); assert.equal(heatmap.summary.average_per_week, null);
});
