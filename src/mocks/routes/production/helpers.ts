// Mock UC8 production/usage/time/photos and UC9 delivery, invoices,
// installment payments and pre-acceptance free rework (backend UC8/UC9.md).
import { conflict,find,publicFile,uuid,version,type Context,type Json } from "../../core/mock-backend.ts";
import { fmt2,fmt6,micro,satang } from "../../core/mock-decimal.ts";
import { materialById,type PlanLine } from '../inventory/helpers.ts';

import { visibleRequest } from '../requests/helpers.ts';

export const ZERO = BigInt(0);

export type Production = {
    version: number;
    cycle: number;
    started_at?: string;
    completed_at?: string;
    labor_cost?: string;
    events: Json[];
    usage: Json[];
    time: Json[];
};

export type Line = PlanLine & {
    released?: bigint;
};

export type Plan = {
    version: number;
    lines: Line[];
};

export function scopedJob(c: Context): Json {
    const job = find(c.db.jobs, c.p.id, "Job");
    visibleRequest(c, String(job.request_id)); // Customers outside the request scope get 404.
    return job;
}

export const prod = (job: Json) => job.production as Production;

export const plan = (job: Json) => job.plan as Plan;

export const requestOf = (c: Context, job: Json) => c.db.requests.find((r) => r.id === job.request_id) as Json;

export function productionSummary(job: Json) {
    const p = prod(job);
    return { job_id: job.id, request_id: job.request_id, status: job.status, version: p.version, material_plan_version: plan(job).version, cycle: p.cycle, ...(p.started_at ? { started_at: p.started_at } : {}), ...(p.completed_at ? { completed_at: p.completed_at } : {}) };
}

export function productionView(c: Context, job: Json) {
    const p = prod(job);
    const admin = c.actor.role === "admin";
    const ids = [...new Set([...plan(job).lines.map((l) => l.material_id), ...p.usage.map((u) => String(u.material_id))])];
    const materials = ids.map((id) => {
        const line = plan(job).lines.find((l) => l.material_id === id);
        const m = materialById(c.db, id);
        const used = p.usage.filter((u) => u.material_id === id).reduce((sum, u) => sum + micro(u.quantity), ZERO);
        return { material_id: id, name: m?.name ?? "", unit_name: String(c.db.units.find((u) => u.id === m?.unit_id)?.name ?? ""), required: fmt6(line?.required ?? ZERO), reserved: fmt6(line?.reserved ?? ZERO), reservation_consumed: fmt6(line?.consumed ?? ZERO), used: fmt6(used), released: fmt6(line?.released ?? ZERO) };
    });
    const materialCost = p.usage.reduce((sum, u) => sum + satang(u.total_amount), ZERO);
    const labor = p.labor_cost === undefined ? null : p.labor_cost;
    return { ...productionSummary(job), materials, usage: p.usage.map((u) => admin ? u : { ...u, unit_cost: undefined, total_amount: undefined }), time_entries: p.time, labor_minutes: p.time.reduce((sum, t) => sum + Number(t.minutes), 0), events: p.events, photos: [...c.db.files.values()].filter((f) => f.kind === "job-photo" && f.job_id === job.id && f.state === "ready").map(publicFile), ...(admin ? { finance: { material_cost: fmt2(materialCost), labor_cost: labor, total_cost: labor === null ? null : fmt2(materialCost + satang(labor)) } } : {}) };
}

export function productionCommand(c: Context, statuses: string[]): Json {
    const job = scopedJob(c);
    if (!statuses.includes(String(job.status)) || requestOf(c, job)?.status !== "ongoing" || version(c.body.expected_version) !== prod(job).version)
        throw conflict();
    return job;
}

export function productionEvent(c: Context, job: Json, action: string) {
    const p = prod(job);
    p.version += 1;
    p.events.push({ id: uuid(), actor_id: c.actor.id, action, version: p.version, created_at: c.now.toISOString() });
}
