// Explicit test transport only. Mirrors backend docs/014-dashboard.md, never a live fallback.
import { invalid, page, route, type Context, type Json, type Route } from "../core/mock-backend.ts";
import { prod } from "./production/helpers.ts";
import { addDays, bangkokDay, calendarDays, calendarWindow, STATUSES, type Day, type JobStatus, type Range } from "../../features/staff-overview/overview-domain.ts";

function query(c: Context, list: boolean) {
  const allowed = list ? ["range", "status", "first_completed_on", "limit", "offset"] : ["range"];
  for (const key of c.query.keys()) if (!allowed.includes(key) || c.query.getAll(key).length !== 1 || !c.query.get(key)) throw invalid();
  const range = (c.query.get("range") ?? "30d") as Range;
  const status = c.query.get("status") ?? ""; const date = c.query.get("first_completed_on") ?? "";
  if (!["today", "7d", "30d", "year"].includes(range) || (status && !STATUSES.includes(status as JobStatus))) throw invalid();
  const window = calendarWindow(range, c.now);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || date < window.start || date > window.today || c.query.has("range") || status)) throw invalid();
  return { range, status, date, ...window };
}
function firstCompletion(c: Context, job: Json): string | null {
  return prod(job).events.filter((e) => e.action === "complete" && String(e.created_at) <= c.now.toISOString()).map((e) => String(e.created_at)).sort()[0] ?? null;
}
function jobs(c: Context) {
  const filter = query(c, true);
  const items = c.db.jobs.filter((j) => String(j.created_at) <= c.now.toISOString()).filter((j) => {
    const first = firstCompletion(c, j);
    return filter.date ? first !== null && bangkokDay(first) === filter.date : String(j.created_at) >= filter.from && (!filter.status || filter.status === j.status);
  }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || String(b.id).localeCompare(String(a.id)));
  return { as_of: c.now.toISOString(), total: items.length, limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0), items: page(items, c.query).map((j) => {
    const request = c.db.requests.find((r) => r.id === j.request_id)!;
    return { job_id: j.id, request_id: j.request_id, request_number: request.no_request, description: request.description, status: j.status, created_at: j.created_at, started_at: prod(j).started_at ?? null, completed_at: prod(j).completed_at ?? null, first_completed_at: firstCompletion(c, j) };
  }) };
}
function overview(c: Context) {
  const filter = query(c, false);
  const cohort = c.db.jobs.filter((j) => String(j.created_at) >= filter.from && String(j.created_at) <= c.now.toISOString());
  const counts = { queued: 0, in_progress: 0, completed: 0, cancelled: 0, total: cohort.length };
  for (const job of cohort) counts[job.status as JobStatus]++;
  const byDate = new Map<string, number>(); let missing = 0;
  for (const job of c.db.jobs) {
    const first = firstCompletion(c, job);
    const delivery = job.delivery as { rework?: { completed_at?: string }[] };
    if (!first && (job.status === "completed" || prod(job).completed_at || delivery?.rework?.some((r) => r.completed_at))) missing++;
    if (first) { const day = bangkokDay(first); if (day >= filter.start && day <= filter.today) byDate.set(day, (byDate.get(day) ?? 0) + 1); }
  }
  const days: Day[] = calendarDays(filter.start, filter.today).map((date) => ({ date, count: byDate.get(date) ?? 0 }));
  let best: string | null = null; let max = 0; let total = 0; let streak = 0;
  for (const day of days) { const n = Number(day.count); total += n; if (n > 0 && n >= max) { best = day.date; max = n; } }
  for (let date = byDate.get(filter.today) ? filter.today : addDays(filter.today, -1); date >= filter.start && byDate.get(date); date = addDays(date, -1)) streak++;
  const tenths = (BigInt(total) * BigInt(70) + BigInt(Math.floor(days.length / 2))) / BigInt(days.length);
  return { as_of: c.now.toISOString(), range: filter.range, period: { from: filter.from, to: c.now.toISOString() }, counts,
    queue: { pending_requests: c.db.requests.filter((r) => r.status === "pending").length, queued_jobs: c.db.jobs.filter((j) => j.status === "queued").length, receiving_orders: c.db.orders.filter((o) => o.supplier_response === "accepted" && !["received", "cancelled"].includes(String(o.status))).length },
    heatmap: { start_date: filter.start, end_date: filter.today, days, history_complete: missing === 0, missing_history_jobs: missing,
      summary: { total, best_day: best, best_day_count: max, current_streak: missing ? null : streak, average_per_week: missing ? null : `${tenths / BigInt(10)}.${tenths % BigInt(10)}` } } };
}
export const dashboardRoutes: Route[] = [route("GET", "/dashboard/overview", ["worker", "admin"], overview), route("GET", "/dashboard/jobs", ["worker", "admin"], jobs)];
