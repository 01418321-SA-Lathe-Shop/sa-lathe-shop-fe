// Read-only DTOs from backend docs/014-dashboard.md. No workflow projections.
export type Count = number | string;
export type Range = "today" | "7d" | "30d" | "year";
export type JobStatus = "queued" | "in_progress" | "completed" | "cancelled";
export const STATUSES: JobStatus[] = ["queued", "in_progress", "completed", "cancelled"];
export const STATUS_LABELS: Record<JobStatus, string> = { queued: "รอเริ่มงาน", in_progress: "กำลังผลิต", completed: "ผลิตเสร็จ", cancelled: "ยกเลิก" };
export const RANGES: Record<Range, string> = { today: "วันนี้", "7d": "7 วัน", "30d": "30 วัน", year: "ปีนี้" };
export type Day = { date: string; count: Count };
export type HeatmapData = {
  start_date: string; end_date: string; days: Day[]; history_complete: boolean; missing_history_jobs: Count;
  summary: { total: Count; best_day: string | null; best_day_count: Count; current_streak: Count | null; average_per_week: string | null };
};
export type OverviewReport = {
  as_of: string; range: Range; period: { from: string; to: string };
  counts: Record<JobStatus | "total", Count>;
  queue: { pending_requests: Count; queued_jobs: Count; receiving_orders: Count };
  heatmap: HeatmapData;
};
export type ReportJob = {
  job_id: string; request_id: string; request_number: Count; description: string; status: JobStatus;
  created_at: string; started_at: string | null; completed_at: string | null; first_completed_at: string | null;
};
export type JobReport = { as_of: string; items: ReportJob[]; total: Count; limit: number; offset: number };
export type Filter = { range: Range; status: JobStatus | ""; day: string; offset: number };

export function exactCount(value: Count): bigint {
  if ((typeof value === "number" && !Number.isSafeInteger(value)) || !/^\d+$/.test(String(value))) throw new Error("Invalid report count");
  return BigInt(value);
}
export function countText(value: Count): string {
  try { return new Intl.NumberFormat("th-TH").format(exactCount(value)); } catch { return "—"; }
}
/** All-date backlog total; an invalid part yields NaN, which countText shows as a dash, never as a smaller sum. */
export function queueTotal(queue: OverviewReport["queue"]): Count {
  try { return (exactCount(queue.pending_requests) + exactCount(queue.queued_jobs) + exactCount(queue.receiving_orders)).toString(); } catch { return NaN; }
}
export function noticesOn<T extends { created_at: string }>(items: T[], day: string): T[] { return items.filter(item => Number.isFinite(Date.parse(item.created_at)) && bangkokDay(item.created_at) === day); }
export function bangkokTime(instant: string): string { return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(instant)); }
export function jobsPath(filter: Filter, limit = 20): string {
  const query = new URLSearchParams({ limit: String(limit), offset: String(filter.offset) });
  if (filter.day) query.set("first_completed_on", filter.day);
  else { query.set("range", filter.range); if (filter.status) query.set("status", filter.status); }
  return `/dashboard/jobs?${query}`;
}
export function dayLabel(value: string, short = false): string {
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: short ? "short" : "long", ...(short ? {} : { year: "numeric" }) }).format(new Date(`${value}T00:00:00+07:00`));
}
export function bangkokDay(instant: string | number): string { return new Date(new Date(instant).getTime() + 25200000).toISOString().slice(0, 10); }
export function addDays(day: string, count: number): string { return new Date(Date.parse(`${day}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10); }
export function calendarWindow(range: Range, now: Date) {
  const today = bangkokDay(now.toISOString());
  const [year, month, date] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year - 1, month, 0)).getUTCDate();
  const prior = `${year - 1}-${String(month).padStart(2, "0")}-${String(Math.min(date, lastDay)).padStart(2, "0")}`;
  const fromDay = range === "year" ? `${year}-01-01` : addDays(today, range === "7d" ? -6 : range === "30d" ? -29 : 0);
  return { today, start: addDays(prior, 1), from: new Date(`${fromDay}T00:00:00+07:00`).toISOString() };
}
export function calendarDays(start: string, end: string): string[] {
  const days: string[] = [];
  for (let day = start; day <= end && days.length < 367; day = addDays(day, 1)) days.push(day);
  return days;
}
