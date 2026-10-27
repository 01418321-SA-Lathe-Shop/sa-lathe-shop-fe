// Mock UC8 production/usage/time/photos and UC9 delivery, invoices,
// installment payments and pre-acceptance free rework (backend UC8/UC9.md).
import { completeUpload,conflict,downloadLink,fields,idempotent,invalid,isUuid,page,publicFile,route,startUpload,text,uuid,version,type Json,type Route } from "../../core/mock-backend.ts";
import { fmt2,fmt6,lineSatang,micro,satang } from "../../core/mock-decimal.ts";
import { freeStock,materialById,moveStock } from '../inventory/helpers.ts';


import { plan,prod,productionCommand,productionEvent,productionSummary,productionView,scopedJob,ZERO } from './helpers.ts';

export const productionRoutes: Route[] = [
// ----- UC8 production -----
route("GET", "/production/jobs", ["worker", "admin"], (c) => ({ items: page(c.db.jobs.slice().reverse(), c.query).map(productionSummary) })),
route("GET", "/production/jobs/:id", ["worker", "admin"], (c) => productionView(c, scopedJob(c))),
route("POST", "/production/jobs/:id/start", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "expected_plan_version"]);
    return idempotent(c, `start:${c.p.id}`, () => {
        const job = productionCommand(c, ["queued"]);
        const lines = plan(job).lines;
        if (version(c.body.expected_plan_version, "expected_plan_version") !== plan(job).version)
            throw conflict("The material plan changed; reload it");
        if (!lines.length || lines.some((l) => l.reserved + l.consumed < l.required))
            throw conflict("Start needs a nonempty, fully reserved plan");
        job.status = "in_progress";
        prod(job).started_at = c.now.toISOString();
        productionEvent(c, job, "start");
        return productionView(c, job);
    });
}),
route("POST", "/production/jobs/:id/usage", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "lines", "note"]);
    return idempotent(c, `usage:${c.p.id}`, () => {
        const job = productionCommand(c, ["in_progress"]);
        const raw = c.body.lines as Json[];
        const note = text(c.body.note, "note", { required: false });
        if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100)
            throw invalid("Usage needs 1–100 lines");
        const seen = new Set<string>();
        const checked = raw.map((r) => {
            if (!isUuid(r.material_id) || seen.has(r.material_id))
                throw invalid("Each line needs a distinct material_id");
            seen.add(r.material_id);
            const m = materialById(c.db, r.material_id);
            if (!m)
                throw invalid("Unknown material");
            const quantity = micro(r.quantity, { positive: true });
            const line = plan(job).lines.find((l) => l.material_id === m.id);
            const fromReservation = line ? (line.reserved < quantity ? line.reserved : quantity) : ZERO;
            const extra = quantity - fromReservation;
            if (extra > ZERO && (!m.is_active || extra > freeStock(c.db, m)))
                throw conflict(`Not enough free ${m.name}; other jobs' reservations are protected`);
            return { m, quantity, line, fromReservation };
        });
        for (const { m, quantity, line, fromReservation } of checked) {
            if (line) {
                line.reserved -= fromReservation;
                line.consumed += fromReservation;
            }
            const cost = m.avg_cost;
            moveStock(c, m, "job_issue", quantity, m.on_hand - quantity, cost, note || "Production use");
            prod(job).usage.push({ id: uuid(), material_id: m.id, material_name: m.name, unit_name: String(c.db.units.find((u) => u.id === m.unit_id)?.name ?? ""), quantity: fmt6(quantity), reservation_used: fmt6(fromReservation), actor_id: c.actor.id, created_at: c.now.toISOString(), unit_cost: fmt6(cost), total_amount: fmt2(lineSatang(quantity, cost)) });
        }
        productionEvent(c, job, "use");
        return productionView(c, job);
    });
}),
route("POST", "/production/jobs/:id/time", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "minutes", "note"]);
    return idempotent(c, `time:${c.p.id}`, () => {
        const job = productionCommand(c, ["in_progress"]);
        const minutes = c.body.minutes;
        if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 1 || minutes > 1000000)
            throw invalid("minutes must be a whole number 1–1,000,000");
        prod(job).time.push({ id: uuid(), actor_id: c.actor.id, minutes, note: text(c.body.note, "note", { required: false }), created_at: c.now.toISOString() });
        productionEvent(c, job, "time");
        return productionView(c, job);
    });
}),
route("POST", "/production/jobs/:id/complete", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version"]);
    return idempotent(c, `complete:${c.p.id}`, () => {
        const job = productionCommand(c, ["in_progress"]);
        for (const line of plan(job).lines) {
            line.released = (line.released ?? ZERO) + line.reserved;
            line.reserved = ZERO;
        }
        job.status = "completed";
        prod(job).completed_at = c.now.toISOString();
        productionEvent(c, job, "complete");
        return productionView(c, job);
    });
}),
route("PUT", "/production/jobs/:id/labor-cost", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "amount"]);
    return idempotent(c, `labor:${c.p.id}`, () => {
        const job = scopedJob(c);
        if (!["in_progress", "completed"].includes(String(job.status)) || version(c.body.expected_version) !== prod(job).version)
            throw conflict();
        prod(job).labor_cost = fmt2(satang(c.body.amount));
        productionEvent(c, job, "labor");
        return productionView(c, job);
    });
}),
route("POST", "/production/jobs/:id/photos/uploads", ["worker"], (c) => { const job = scopedJob(c); if (job.status !== "in_progress")
    throw conflict("Photos can be added only while in progress"); return startUpload(c, "job-photo", { job_id: job.id }, { images: true }); }),
route("POST", "/job-photos/:id/complete", ["worker"], (c) => {
    const file = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined;
    const job = c.db.jobs.find((j) => j.id === file?.job_id);
    if (file?.kind === "job-photo" && job?.status !== "in_progress") {
        file.state = "failed";
        throw conflict("The job is no longer in progress");
    }
    return publicFile(completeUpload(c, c.p.id, "job-photo"));
}),
route("GET", "/job-photos/:id/download", ["worker", "admin"], (c) => { const f = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined; return downloadLink(c, f?.kind === "job-photo" ? f : undefined); })
];
