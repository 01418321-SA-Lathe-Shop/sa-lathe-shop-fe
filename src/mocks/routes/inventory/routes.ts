// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { conflict,fields,find,idempotent,invalid,isUuid,page,route,text,uuid,version,type Json,type Route } from "../../core/mock-backend.ts";
import { micro } from "../../core/mock-decimal.ts";
import { allocate,catalogName,materialById,materialView,movementView,moveStock,planView,reservedTotal,writablePlanJob,ZERO,type Material,type PlanLine } from './helpers.ts';

export const inventoryRoutes: Route[] = [
// ----- UC5 catalog -----
route("GET", "/units", ["worker", "admin"], (c) => ({ items: c.db.units.slice(0, 1000).map((u) => ({ id: u.id, name: u.name })) })),
route("POST", "/units", ["admin"], (c) => { fields(c.body, ["name"]); const unit = { id: uuid(), name: catalogName( c.db.units, c.body.name, 50) }; c.db.units.push(unit); return unit; }),
route("GET", "/materials", ["worker", "admin"], (c) => {
    const term = (c.query.get("search") ?? "").toLowerCase();
    const items = (c.db.materials as Material[]).filter((m) => m.name.toLowerCase().includes(term)).sort((a, b) => a.name.localeCompare(b.name));
    return { items: page(items, c.query).map((m) => materialView(c.db, m, c.actor.role)) };
}),
route("POST", "/materials", ["admin"], (c) => {
    fields(c.body, ["name", "unit_id"]);
    if (!c.db.units.some((u) => u.id === c.body.unit_id))
        throw invalid("unit_id must reference an existing unit");
    const material: Material = { id: uuid(), name: catalogName( c.db.materials, c.body.name, 200), unit_id: String(c.body.unit_id), is_active: true, version: 1, on_hand: ZERO, avg_cost: ZERO };
    c.db.materials.push(material);
    return materialView(c.db, material, "admin");
}),
route("PATCH", "/materials/:id", ["admin"], (c) => {
    fields(c.body, ["expected_version", "name", "is_active"]);
    const m = find(c.db.materials, c.p.id, "Material") as Material;
    if (version(c.body.expected_version) !== m.version)
        throw conflict();
    if (typeof c.body.is_active !== "boolean")
        throw invalid("is_active must be boolean");
    Object.assign(m, { name: catalogName( c.db.materials, c.body.name, 200, m.id), is_active: c.body.is_active, version: m.version + 1 });
    return materialView(c.db, m, "admin");
}),
route("POST", "/materials/:id/stock", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "mode", "quantity", "unit_cost", "reason"]);
    return idempotent(c, `stock:${c.p.id}`, () => {
        const m = find(c.db.materials, c.p.id, "Material") as Material;
        if (version(c.body.expected_version) !== m.version)
            throw conflict();
        const reason = text(c.body.reason, "reason");
        if (c.body.mode === "addition") {
            if (!m.is_active)
                throw conflict("Reactivate the material before adding stock");
            const quantity = micro(c.body.quantity, { positive: true });
            const cost = micro(c.body.unit_cost);
            moveStock(c, m, "addition", quantity, m.on_hand + quantity, cost, reason);
        }
        else if (c.body.mode === "correction") {
            if (c.body.unit_cost !== undefined)
                throw invalid("Corrections take no unit_cost");
            const counted = micro(c.body.quantity);
            if (counted < reservedTotal(c.db, m.id))
                throw conflict("Counted stock cannot be below active reservations");
            moveStock(c, m, "correction", counted > m.on_hand ? counted - m.on_hand : m.on_hand - counted, counted, undefined, reason);
        }
        else
            throw invalid("mode must be addition or correction");
        return materialView(c.db, m, "admin");
    });
}),
route("GET", "/materials/:id/movements", ["worker", "admin"], (c) => {
    find(c.db.materials, c.p.id, "Material");
    return { items: page(c.db.movements.filter((x) => x.material_id === c.p.id), c.query).map((x) => movementView(x, c.actor.role)) };
}),
// ----- UC5 job material plans -----
route("GET", "/jobs/:id/materials", ["worker", "admin"], (c) => planView(find(c.db.jobs, c.p.id, "Job"))),
route("PUT", "/jobs/:id/materials", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "lines"]);
    return idempotent(c, `plan:${c.p.id}`, () => {
        const job = writablePlanJob(c);
        const plan = job.plan as {
            version: number;
            lines: PlanLine[];
        };
        if (!Array.isArray(c.body.lines) || c.body.lines.length > 500)
            throw invalid("lines must be a complete list of at most 500");
        const seen = new Set<string>();
        const nextLines: PlanLine[] = [];
        for (const raw of c.body.lines as Json[]) {
            if (!isUuid(raw.material_id) || seen.has(raw.material_id))
                throw invalid("Each line needs a distinct material_id");
            seen.add(raw.material_id);
            const m = materialById(c.db, raw.material_id);
            if (!m)
                throw invalid("Unknown material");
            const required = micro(raw.quantity, { positive: true });
            const existing = plan.lines.find((l) => l.material_id === m.id);
            if (!m.is_active && (!existing || required > existing.required))
                throw conflict("Inactive materials cannot be added or increased");
            nextLines.push({ material_id: m.id, required, reserved: existing?.reserved ?? ZERO, consumed: existing?.consumed ?? ZERO });
        }
        plan.lines = nextLines;
        plan.version += 1;
        allocate(c.db, job);
        return planView(job);
    });
}),
route("POST", "/jobs/:id/materials/reserve", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version"]);
    return idempotent(c, `reserve:${c.p.id}`, () => { const job = writablePlanJob(c); (job.plan as {
        version: number;
    }).version += 1; allocate(c.db, job); return planView(job); });
})
];
