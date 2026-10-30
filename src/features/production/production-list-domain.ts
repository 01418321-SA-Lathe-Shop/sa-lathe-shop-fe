// UC8 production queue for Staff/Admin: tabs, literal search, priority order and
// material readiness. Presentation only; the server still authorizes every write.
import type { JobRequest } from "../../lib/api/backend-api.ts";
import type { InventoryPlan } from "../inventory/inventory-domain.ts";

export type ProductionSummary = { job_id: string; request_id: string; status: string; version: number | string; material_plan_version: number | string; cycle: number | string; started_at?: string; completed_at?: string };
export type Readiness = { state: "ready" | "short" | "empty" | "changed"; short: number };
export type ProductionTab = "queued" | "in_progress" | "completed" | "all";
export const PRODUCTION_TABS: readonly ProductionTab[] = ["queued", "in_progress", "completed", "all"];
export type ProductionView = "list" | "cards";

export function productionTab(value: string | null): ProductionTab | null {
  return PRODUCTION_TABS.find((tab) => tab === value) ?? null;
}

export function productionView(value: string | null, fallback?: string | null): ProductionView {
  if (value === "list") return "list";
  if (value === "cards") return "cards";
  if (fallback === "list") return "list";
  return "cards";
}

const at = (value?: string) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const OPEN_ORDER = ["in_progress", "queued", "completed"];
const rank = (status: string) => OPEN_ORDER.includes(status) ? OPEN_ORDER.indexOf(status) : OPEN_ORDER.length;

function matches(request: JobRequest | undefined, query: string) {
  const term = query.trim().toLocaleLowerCase("th-TH");
  return !term || Boolean(request && `${request.no_request} ${request.description}`.toLocaleLowerCase("th-TH").includes(term));
}

export function productionCounts(jobs: ProductionSummary[], requests: JobRequest[], query: string): Record<ProductionTab, number> {
  const byId = new Map(requests.map((request) => [request.id, request]));
  const counts: Record<ProductionTab, number> = { queued: 0, in_progress: 0, completed: 0, all: 0 };
  for (const job of jobs) {
    if (!matches(byId.get(job.request_id), query)) continue;
    counts.all++;
    if (job.status === "queued" || job.status === "in_progress" || job.status === "completed") counts[job.status]++;
  }
  return counts;
}

/** Open the first tab where Staff has work, preferring jobs not yet started. */
export function defaultProductionTab(counts: Record<ProductionTab, number>): ProductionTab {
  return counts.queued ? "queued" : counts.in_progress ? "in_progress" : counts.completed ? "completed" : "queued";
}

// Open work is ordered by the customer's requested date (undated last); finished
// work newest first. Ties keep the server's order.
export function productionRows(jobs: ProductionSummary[], requests: JobRequest[], tab: ProductionTab, query: string) {
  const byId = new Map(requests.map((request) => [request.id, request]));
  return jobs.map((job, index) => ({ job, index, request: byId.get(job.request_id) }))
    .filter(({ job, request }) => (tab === "all" || job.status === tab) && matches(request, query))
    .sort((a, b) => {
      if (rank(a.job.status) !== rank(b.job.status)) return rank(a.job.status) - rank(b.job.status);
      if (a.job.status === "completed") return (at(b.job.completed_at) ?? -Infinity) - (at(a.job.completed_at) ?? -Infinity) || a.index - b.index;
      if (a.job.status === "queued" || a.job.status === "in_progress") return (at(a.request?.deadline) ?? Infinity) - (at(b.request?.deadline) ?? Infinity) || a.index - b.index;
      return a.index - b.index;
    })
    .map(({ job, request }) => ({ job, request }));
}

const positive = (value: string) => /^\d+\.\d+$/.test(value) && /[1-9]/.test(value);

/** Readiness exactly as Start requires: a ready plan saved at the job's plan version. */
export function planReadiness(plan: InventoryPlan, job: Pick<ProductionSummary, "material_plan_version">): Readiness {
  const lines = plan.lines ?? [];
  const short = lines.filter((line) => positive(line.shortage)).length;
  if (!lines.length) return { state: "empty", short };
  if (String(plan.version) !== String(job.material_plan_version)) return { state: "changed", short };
  return plan.ready ? { state: "ready", short } : { state: "short", short };
}

/** Six-place server quantity as an editable input value: "5.000000" → "5". */
export function editableQuantity(value: string): string { return value.replace(/\.?0+$/, ""); }

/** A positive quantity with up to 12 whole digits and six decimal places. */
export function isPositiveQuantity(value: string): boolean { return /^\d{1,12}(?:\.\d{1,6})?$/.test(value.trim()) && /[1-9]/.test(value); }
