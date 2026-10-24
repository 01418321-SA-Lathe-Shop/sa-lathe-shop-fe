// Mock UC8 production/usage/time/photos and UC9 delivery, invoices,
// installment payments and pre-acceptance free rework (backend UC8/UC9.md).
import { activeIds, completeUpload, conflict, downloadLink, fields, find, idempotent, instant, invalid, isUuid, next, notFound, notify, page, publicFile, route, startUpload, text, uuid, version, type Context, type Json, type Route } from "./mock-backend.ts";
import { fmt2, fmt6, lineSatang, micro, satang } from "./mock-decimal.ts";
import { freeStock, materialById, moveStock, type PlanLine } from "./mock-routes-stock.ts";
import { memberIds, visibleRequest } from "./mock-routes-sales.ts";

const ZERO = BigInt(0);
type Production = { version: number; cycle: number; started_at?: string; completed_at?: string; labor_cost?: string; events: Json[]; usage: Json[]; time: Json[] };
type Line = PlanLine & { released?: bigint };
type Plan = { version: number; lines: Line[] };
type Delivery = { version: number; credit_days?: number; invoice?: Json; deliveries: Json[]; payments: Json[]; events: Json[]; rework: Json[] };

function scopedJob(c: Context): Json {
  const job = find(c.db.jobs, c.p.id, "Job");
  visibleRequest(c, String(job.request_id)); // Customers outside the request scope get 404.
  return job;
}
const prod = (job: Json) => job.production as Production;
const plan = (job: Json) => job.plan as Plan;
const requestOf = (c: Context, job: Json) => c.db.requests.find((r) => r.id === job.request_id) as Json;

function productionSummary(job: Json) {
  const p = prod(job);
  return { job_id: job.id, request_id: job.request_id, status: job.status, version: p.version, material_plan_version: plan(job).version, cycle: p.cycle, ...(p.started_at ? { started_at: p.started_at } : {}), ...(p.completed_at ? { completed_at: p.completed_at } : {}) };
}
function productionView(c: Context, job: Json) {
  const p = prod(job); const admin = c.actor.role === "admin";
  const ids = [...new Set([...plan(job).lines.map((l) => l.material_id), ...p.usage.map((u) => String(u.material_id))])];
  const materials = ids.map((id) => {
    const line = plan(job).lines.find((l) => l.material_id === id); const m = materialById(c.db, id);
    const used = p.usage.filter((u) => u.material_id === id).reduce((sum, u) => sum + micro(u.quantity), ZERO);
    return { material_id: id, name: m?.name ?? "", unit_name: String(c.db.units.find((u) => u.id === m?.unit_id)?.name ?? ""), required: fmt6(line?.required ?? ZERO), reserved: fmt6(line?.reserved ?? ZERO), reservation_consumed: fmt6(line?.consumed ?? ZERO), used: fmt6(used), released: fmt6(line?.released ?? ZERO) };
  });
  const materialCost = p.usage.reduce((sum, u) => sum + satang(u.total_amount), ZERO);
  const labor = p.labor_cost === undefined ? null : p.labor_cost;
  return { ...productionSummary(job), materials, usage: p.usage.map((u) => admin ? u : { ...u, unit_cost: undefined, total_amount: undefined }), time_entries: p.time, labor_minutes: p.time.reduce((sum, t) => sum + Number(t.minutes), 0), events: p.events, photos: [...c.db.files.values()].filter((f) => f.kind === "job-photo" && f.job_id === job.id && f.state === "ready").map(publicFile), ...(admin ? { finance: { material_cost: fmt2(materialCost), labor_cost: labor, total_cost: labor === null ? null : fmt2(materialCost + satang(labor)) } } : {}) };
}
function productionCommand(c: Context, statuses: string[]): Json {
  const job = scopedJob(c);
  if (!statuses.includes(String(job.status)) || requestOf(c, job)?.status !== "ongoing" || version(c.body.expected_version) !== prod(job).version) throw conflict();
  return job;
}
function productionEvent(c: Context, job: Json, action: string) {
  const p = prod(job); p.version += 1; p.events.push({ id: uuid(), actor_id: c.actor.id, action, version: p.version, created_at: c.now.toISOString() });
}

function invoiceView(d: Delivery) {
  if (!d.invoice) return undefined;
  const amount = satang(d.invoice.amount);
  const paid = d.payments.filter((x) => x.status === "approved").reduce((sum, x) => sum + satang(x.amount), ZERO);
  return { ...d.invoice, paid: fmt2(paid), balance: fmt2(amount - paid), status: paid === amount ? "paid" : paid > ZERO ? "partial" : "unpaid" };
}
function fulfillmentView(c: Context, job: Json) {
  const d = job.delivery as Delivery; const request = requestOf(c, job);
  return { job_id: job.id, request_id: job.request_id, job_status: job.status, request_status: request?.status, version: d.version, cycle: prod(job).cycle, ...(d.credit_days !== undefined ? { credit_days: d.credit_days } : {}), opening_balance: job.balance, deposit: job.deposit_amount, ...(d.invoice ? { invoice: invoiceView(d) } : {}), deliveries: d.deliveries, ...(c.actor.role === "worker" ? {} : { payments: d.payments }), events: d.events, rework_history: d.rework };
}
function fulfillmentCommand(c: Context, kind: string): { job: Json; d: Delivery } {
  const job = scopedJob(c); const d = job.delivery as Delivery; const request = requestOf(c, job);
  const lateRejection = request?.status === "completed" && kind === "review" && c.body.outcome === "rejected";
  if ((request?.status !== "ongoing" && !lateRejection) || version(c.body.expected_version) !== d.version) throw conflict();
  return { job, d };
}
function fulfillmentEvent(c: Context, job: Json, action: string) {
  const d = job.delivery as Delivery; d.version += 1; d.events.push({ id: uuid(), action, version: d.version, actor_id: c.actor.id, created_at: c.now.toISOString() });
  const invoice = invoiceView(d); const last = d.deliveries.at(-1);
  if (invoice?.balance === "0.00" && last?.status === "delivered" && job.status === "completed") { const r = requestOf(c, job); if (r) r.status = "completed"; }
}
function amountWithin(d: Delivery, value: unknown): string {
  const invoice = invoiceView(d);
  if (!invoice) throw conflict("No invoice has been issued");
  const amount = satang(value, { positive: true });
  if (amount > satang(invoice.balance)) throw conflict("Amount exceeds the remaining invoice balance");
  return fmt2(amount);
}
function paymentEvidence(c: Context, job: Json, id: unknown, requireOwn: boolean) {
  const file = isUuid(id) ? c.db.files.get(id) : undefined;
  if (!file || file.kind !== "customer-evidence" || file.job_id !== job.id || file.state !== "ready" || (requireOwn && file.uploaded_by !== c.actor.id)) throw invalid("evidence_id must be your ready payment evidence for this job");
  if ((job.delivery as Delivery).payments.some((x) => x.evidence_id === file.id)) throw conflict("Each proof can be used once; upload a new file");
  return String(file.id);
}

export const jobRoutes: Route[] = [
  // ----- UC8 production -----
  route("GET", "/production/jobs", ["worker", "admin"], (c) => ({ items: page(c.db.jobs.slice().reverse(), c.query).map(productionSummary) })),
  route("GET", "/production/jobs/:id", ["worker", "admin"], (c) => productionView(c, scopedJob(c))),
  route("POST", "/production/jobs/:id/start", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "expected_plan_version"]);
    return idempotent(c, `start:${c.p.id}`, () => {
      const job = productionCommand(c, ["queued"]); const lines = plan(job).lines;
      if (version(c.body.expected_plan_version, "expected_plan_version") !== plan(job).version) throw conflict("The material plan changed; reload it");
      if (!lines.length || lines.some((l) => l.reserved + l.consumed < l.required)) throw conflict("Start needs a nonempty, fully reserved plan");
      job.status = "in_progress"; prod(job).started_at = c.now.toISOString(); productionEvent(c, job, "start");
      return productionView(c, job);
    });
  }),
  route("POST", "/production/jobs/:id/usage", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "lines", "note"]);
    return idempotent(c, `usage:${c.p.id}`, () => {
      const job = productionCommand(c, ["in_progress"]); const raw = c.body.lines as Json[]; const note = text(c.body.note, "note", { required: false });
      if (!Array.isArray(raw) || raw.length < 1 || raw.length > 100) throw invalid("Usage needs 1–100 lines");
      const seen = new Set<string>();
      const checked = raw.map((r) => {
        if (!isUuid(r.material_id) || seen.has(r.material_id)) throw invalid("Each line needs a distinct material_id");
        seen.add(r.material_id); const m = materialById(c.db, r.material_id);
        if (!m) throw invalid("Unknown material");
        const quantity = micro(r.quantity, { positive: true }); const line = plan(job).lines.find((l) => l.material_id === m.id);
        const fromReservation = line ? (line.reserved < quantity ? line.reserved : quantity) : ZERO; const extra = quantity - fromReservation;
        if (extra > ZERO && (!m.is_active || extra > freeStock(c.db, m))) throw conflict(`Not enough free ${m.name}; other jobs' reservations are protected`);
        return { m, quantity, line, fromReservation };
      });
      for (const { m, quantity, line, fromReservation } of checked) {
        if (line) { line.reserved -= fromReservation; line.consumed += fromReservation; }
        const cost = m.avg_cost; moveStock(c, m, "job_issue", quantity, m.on_hand - quantity, cost, note || "Production use");
        prod(job).usage.push({ id: uuid(), material_id: m.id, material_name: m.name, unit_name: String(c.db.units.find((u) => u.id === m.unit_id)?.name ?? ""), quantity: fmt6(quantity), reservation_used: fmt6(fromReservation), actor_id: c.actor.id, created_at: c.now.toISOString(), unit_cost: fmt6(cost), total_amount: fmt2(lineSatang(quantity, cost)) });
      }
      productionEvent(c, job, "use"); return productionView(c, job);
    });
  }),
  route("POST", "/production/jobs/:id/time", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "minutes", "note"]);
    return idempotent(c, `time:${c.p.id}`, () => {
      const job = productionCommand(c, ["in_progress"]); const minutes = c.body.minutes;
      if (typeof minutes !== "number" || !Number.isInteger(minutes) || minutes < 1 || minutes > 1000000) throw invalid("minutes must be a whole number 1–1,000,000");
      prod(job).time.push({ id: uuid(), actor_id: c.actor.id, minutes, note: text(c.body.note, "note", { required: false }), created_at: c.now.toISOString() });
      productionEvent(c, job, "time"); return productionView(c, job);
    });
  }),
  route("POST", "/production/jobs/:id/complete", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version"]);
    return idempotent(c, `complete:${c.p.id}`, () => {
      const job = productionCommand(c, ["in_progress"]);
      for (const line of plan(job).lines) { line.released = (line.released ?? ZERO) + line.reserved; line.reserved = ZERO; }
      job.status = "completed"; prod(job).completed_at = c.now.toISOString(); productionEvent(c, job, "complete");
      return productionView(c, job);
    });
  }),
  route("PUT", "/production/jobs/:id/labor-cost", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "amount"]);
    return idempotent(c, `labor:${c.p.id}`, () => {
      const job = scopedJob(c);
      if (!["in_progress", "completed"].includes(String(job.status)) || version(c.body.expected_version) !== prod(job).version) throw conflict();
      prod(job).labor_cost = fmt2(satang(c.body.amount)); productionEvent(c, job, "labor"); return productionView(c, job);
    });
  }),
  route("POST", "/production/jobs/:id/photos/uploads", ["worker"], (c) => { const job = scopedJob(c); if (job.status !== "in_progress") throw conflict("Photos can be added only while in progress"); return startUpload(c, "job-photo", { job_id: job.id }, { images: true }); }),
  route("POST", "/job-photos/:id/complete", ["worker"], (c) => {
    const file = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined; const job = c.db.jobs.find((j) => j.id === file?.job_id);
    if (file?.kind === "job-photo" && job?.status !== "in_progress") { file.state = "failed"; throw conflict("The job is no longer in progress"); }
    return publicFile(completeUpload(c, c.p.id, "job-photo"));
  }),
  route("GET", "/job-photos/:id/download", ["worker", "admin"], (c) => { const f = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined; return downloadLink(c, f?.kind === "job-photo" ? f : undefined); }),

  // ----- UC9 delivery, invoice, payments and rework -----
  route("GET", "/fulfillment/jobs", "session", (c) => {
    const visible = c.db.jobs.filter((j) => { const r = c.db.requests.find((x) => x.id === j.request_id); return c.actor.role !== "customer" || (r && memberIds(c.db, String(r.customer_id)).includes(c.actor.id)); });
    return { items: page(visible.slice().reverse(), c.query, 25).map((j) => fulfillmentView(c, j)) };
  }),
  route("GET", "/fulfillment/jobs/:id", "session", (c) => fulfillmentView(c, scopedJob(c))),
  route("PUT", "/fulfillment/jobs/:id/credit-terms", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "credit_days"]);
    return idempotent(c, `uc9-terms:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "terms"); const days = c.body.credit_days;
      if (job.status !== "completed" || d.invoice || d.credit_days !== undefined) throw conflict("Terms need a completed job without terms or invoice");
      if (typeof days !== "number" || !Number.isInteger(days) || days < 0 || days > 36500) throw invalid("credit_days must be an integer 0–36500");
      d.credit_days = days; fulfillmentEvent(c, job, "terms"); return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/invoice", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version"]);
    return idempotent(c, `uc9-invoice:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "invoice");
      if (job.status !== "completed" || d.invoice || d.credit_days === undefined) throw conflict("Invoice needs a completed job with Admin credit terms");
      d.invoice = { id: uuid(), number: `INV-${next(c.db, "invoice")}`, amount: job.balance, credit_days: d.credit_days, issued_at: c.now.toISOString(), due_at: new Date(c.now.getTime() + d.credit_days * 86400000).toISOString() };
      fulfillmentEvent(c, job, "invoice"); return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/deliveries", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "method", "receiver_name"]);
    return idempotent(c, `uc9-ship:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "ship"); const last = d.deliveries.at(-1);
      if (job.status !== "completed" || !d.invoice || (last && last.status !== "returned")) throw conflict("Shipping needs a completed job, an invoice and no open delivery");
      if (c.body.method !== "self" && c.body.method !== "third_party") throw invalid("method must be self or third_party");
      d.deliveries.push({ id: uuid(), cycle: prod(job).cycle, method: c.body.method, receiver_name: text(c.body.receiver_name, "receiver_name", { max: 200 }), status: "shipping", shipped_at: c.now.toISOString(), reason: "" });
      fulfillmentEvent(c, job, "ship");
      notify(c.db, memberIds(c.db, String(requestOf(c, job).customer_id)), String(job.request_id), "Your order has been shipped. Please inspect it.");
      return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/inspection", ["customer"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "outcome", "reason"]);
    return idempotent(c, `uc9-inspect:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "inspect"); const last = d.deliveries.at(-1);
      if (job.status !== "completed" || last?.status !== "shipping") throw conflict("There is no shipment awaiting inspection");
      if (c.body.outcome === "accept") { if (c.body.reason !== undefined && c.body.reason !== "") throw invalid("Acceptance takes no reason"); Object.assign(last, { status: "delivered", decided_at: c.now.toISOString(), decided_by: c.actor.id }); }
      else if (c.body.outcome === "return") {
        Object.assign(last, { status: "returned", decided_at: c.now.toISOString(), decided_by: c.actor.id, reason: text(c.body.reason, "reason") });
        const p = prod(job);
        d.rework.push({ cycle: p.cycle, started_at: p.started_at, completed_at: p.completed_at, reopened_at: c.now.toISOString(), delivery_id: last.id });
        job.status = "in_progress"; p.cycle += 1; p.completed_at = undefined; productionEvent(c, job, "reopen");
      } else throw invalid("outcome must be accept or return");
      fulfillmentEvent(c, job, c.body.outcome === "accept" ? "accept" : "return");
      notify(c.db, activeIds(c.db, "admin"), String(job.request_id), `Customer ${c.body.outcome === "accept" ? "accepted" : "returned"} the delivery`);
      return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/payments/bank", ["customer"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "amount", "paid_at", "evidence_id"]);
    return idempotent(c, `uc9-bank:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "bank");
      const amount = amountWithin(d, c.body.amount); const paid_at = instant(c.body.paid_at, "paid_at", { now: c.now }); const evidence_id = paymentEvidence(c, job, c.body.evidence_id, true);
      d.payments.push({ id: uuid(), submitted_by: c.actor.id, method: "bank", amount, paid_at, status: "pending", evidence_id, reason: "" });
      fulfillmentEvent(c, job, "bank"); notify(c.db, activeIds(c.db, "admin"), String(job.request_id), "A bank payment proof is waiting for review");
      return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/payments/cash", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "amount", "paid_at", "evidence_id"]);
    return idempotent(c, `uc9-cash:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "cash");
      const amount = amountWithin(d, c.body.amount); const paid_at = instant(c.body.paid_at, "paid_at", { now: c.now });
      const evidence_id = c.body.evidence_id === undefined || c.body.evidence_id === "" ? undefined : paymentEvidence(c, job, c.body.evidence_id, true);
      d.payments.push({ id: uuid(), submitted_by: c.actor.id, method: "cash", amount, paid_at, status: "approved", ...(evidence_id ? { evidence_id } : {}), reason: "", reviewed_by: c.actor.id });
      fulfillmentEvent(c, job, "cash"); return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/payments/review", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "payment_id", "outcome", "reason"]);
    return idempotent(c, `uc9-review:${c.p.id}`, () => {
      const { job, d } = fulfillmentCommand(c, "review"); const payment = d.payments.find((x) => x.id === c.body.payment_id);
      if (!payment) throw notFound("Payment");
      if (payment.status !== "pending") throw conflict("This payment was already reviewed");
      if (c.body.outcome === "approved") { if (c.body.reason) throw invalid("Approval takes no reason"); amountWithin(d, payment.amount); Object.assign(payment, { status: "approved", reviewed_by: c.actor.id }); }
      else if (c.body.outcome === "rejected") Object.assign(payment, { status: "rejected", reason: text(c.body.reason, "reason"), reviewed_by: c.actor.id });
      else throw invalid("outcome must be approved or rejected");
      fulfillmentEvent(c, job, "review"); notify(c.db, [String(payment.submitted_by)], String(job.request_id), `Payment ${c.body.outcome}`);
      return fulfillmentView(c, job);
    });
  }),
  route("POST", "/fulfillment/jobs/:id/evidence/uploads", ["customer", "admin"], (c) => { const job = scopedJob(c); return startUpload(c, "customer-evidence", { job_id: job.id }); }),
  route("POST", "/customer-evidence/:id/complete", ["customer", "admin"], (c) => publicFile(completeUpload(c, c.p.id, "customer-evidence"))),
  route("GET", "/customer-evidence/:id/download", ["customer", "admin"], (c) => {
    const f = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined;
    if (!f || f.kind !== "customer-evidence" || (c.actor.role === "customer" && f.uploaded_by !== c.actor.id)) throw notFound("Evidence");
    return downloadLink(c, f);
  }),
];
