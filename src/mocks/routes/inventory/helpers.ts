// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { conflict,find,invalid,text,uuid,version,type Context,type Db,type Json } from "../../core/mock-backend.ts";
import { fmt6,minBig,weightedAverage } from "../../core/mock-decimal.ts";
export const ZERO = BigInt(0);

export type PlanLine = {
    material_id: string;
    required: bigint;
    reserved: bigint;
    consumed: bigint;
};

export type Material = Json & {
    id: string;
    name: string;
    unit_id: string;
    is_active: boolean;
    version: number;
    on_hand: bigint;
    avg_cost: bigint;
};

export function materialById(db: Db, id: string): Material | undefined { return db.materials.find((m) => m.id === id) as Material | undefined; }

export const unitName = (db: Db, id: string) => String(db.units.find((u) => u.id === id)?.name ?? "");

export function reservedTotal(db: Db, materialId: string): bigint {
    let total = ZERO;
    for (const job of db.jobs)
        for (const line of (job.plan as {
            lines: PlanLine[];
        }).lines)
            if (line.material_id === materialId)
                total += line.reserved;
    return total;
}

export const freeStock = (db: Db, m: Material) => m.on_hand - reservedTotal(db, m.id);

export function materialView(db: Db, m: Material, role: string) {
    const reserved = reservedTotal(db, m.id);
    return { id: m.id, name: m.name, unit_id: m.unit_id, unit_name: unitName(db, m.unit_id), is_active: m.is_active, version: m.version, qty_on_hand: fmt6(m.on_hand), qty_reserved: fmt6(reserved), qty_available: fmt6(m.on_hand - reserved), ...(role === "admin" ? { avg_cost: fmt6(m.avg_cost) } : {}) };
}

export function movementView(movement: Json, role: string) {
    if (role === "admin")
        return movement;
    const { reason: _r, unit_cost: _u, before_cost: _b, after_cost: _a, ...rest } = movement;
    return rest;
}

// Records one ledger movement and updates the balance/average atomically.
export function moveStock(c: Context, m: Material, mode: string, quantity: bigint, after: bigint, unitCost?: bigint, reason?: string) {
    const beforeCost = m.avg_cost;
    const before = m.on_hand;
    if (mode === "addition" || mode === "purchase_receive")
        m.avg_cost = weightedAverage(m.on_hand, m.avg_cost, quantity, unitCost ?? ZERO);
    m.on_hand = after;
    m.version += 1;
    c.db.movements.unshift({ id: uuid(), material_id: m.id, actor_id: c.actor.id, mode, quantity: fmt6(quantity), before_quantity: fmt6(before), after_quantity: fmt6(after), version: m.version, created_at: c.now.toISOString(), reason: reason ?? "", ...(unitCost !== undefined ? { unit_cost: fmt6(unitCost) } : {}), before_cost: fmt6(beforeCost), after_cost: fmt6(m.avg_cost) });
}

// Allocates genuinely free stock to this job's shortages and releases excess.
// Inactive materials keep/reduce existing reservations but gain none.
export function allocate(db: Db, job: Json) {
    for (const line of (job.plan as {
        lines: PlanLine[];
    }).lines) {
        const target = line.required > line.consumed ? line.required - line.consumed : ZERO;
        if (line.reserved > target) {
            line.reserved = target;
            continue;
        }
        const m = materialById(db, line.material_id);
        if (!m?.is_active)
            continue;
        const add = minBig(freeStock(db, m), target - line.reserved);
        if (add > ZERO)
            line.reserved += add;
    }
}

export function planView(job: Json) {
    const plan = job.plan as {
        version: number;
        lines: PlanLine[];
    };
    const lines = plan.lines.map((l) => { const short = l.required - l.consumed - l.reserved; return { material_id: l.material_id, required: fmt6(l.required), reserved: fmt6(l.reserved), consumed: fmt6(l.consumed), shortage: fmt6(short > ZERO ? short : ZERO) }; });
    return { job_id: job.id, version: plan.version, ready: job.status === "queued" && lines.length > 0 && lines.every((l) => l.shortage === "0.000000"), lines };
}

export function writablePlanJob(c: Context): Json {
    const job = find(c.db.jobs, c.p.id, "Job");
    const request = c.db.requests.find((r) => r.id === job.request_id);
    if (job.status !== "queued" || request?.status !== "ongoing")
        throw conflict("Plans can change only for an ongoing request's queued job");
    if (version(c.body.expected_version) !== (job.plan as {
        version: number;
    }).version)
        throw conflict();
    return job;
}

export function catalogName( items: Json[], value: unknown, max: number, except?: string): string {
    const name = text(value, "name", { max });
    if (/[\r\n]/.test(name))
        throw invalid("Name cannot contain line breaks");
    if (items.some((i) => String(i.name).toLowerCase() === name.toLowerCase() && i.id !== except))
        throw conflict("Name already exists");
    return name;
}
