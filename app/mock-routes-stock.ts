// Mock UC5 catalog/stock/job plans, UC6 Admin supplier orders and UC7
// receiving/claims/supplier settlement, following backend UC5–UC7.md.
import { completeUpload, conflict, downloadLink, fields, find, idempotent, instant, invalid, isUuid, notFound, page, publicFile, route, startUpload, text, uuid, version, type Context, type Db, type Json, type Route } from "./mock-backend.ts";
import { fmt2, fmt6, lineSatang, micro, minBig, weightedAverage } from "./mock-decimal.ts";

const ZERO = BigInt(0);
export type PlanLine = { material_id: string; required: bigint; reserved: bigint; consumed: bigint };
type Material = Json & { id: string; name: string; unit_id: string; is_active: boolean; version: number; on_hand: bigint; avg_cost: bigint };

export function materialById(db: Db, id: string): Material | undefined { return db.materials.find((m) => m.id === id) as Material | undefined; }
const unitName = (db: Db, id: string) => String(db.units.find((u) => u.id === id)?.name ?? "");
export function reservedTotal(db: Db, materialId: string): bigint {
  let total = ZERO;
  for (const job of db.jobs) for (const line of (job.plan as { lines: PlanLine[] }).lines) if (line.material_id === materialId) total += line.reserved;
  return total;
}
export const freeStock = (db: Db, m: Material) => m.on_hand - reservedTotal(db, m.id);

function materialView(db: Db, m: Material, role: string) {
  const reserved = reservedTotal(db, m.id);
  return { id: m.id, name: m.name, unit_id: m.unit_id, unit_name: unitName(db, m.unit_id), is_active: m.is_active, version: m.version, qty_on_hand: fmt6(m.on_hand), qty_reserved: fmt6(reserved), qty_available: fmt6(m.on_hand - reserved), ...(role === "admin" ? { avg_cost: fmt6(m.avg_cost) } : {}) };
}
function movementView(movement: Json, role: string) {
  if (role === "admin") return movement;
  const { reason: _r, unit_cost: _u, before_cost: _b, after_cost: _a, ...rest } = movement;
  return rest;
}

// Records one ledger movement and updates the balance/average atomically.
export function moveStock(c: Context, m: Material, mode: string, quantity: bigint, after: bigint, unitCost?: bigint, reason?: string) {
  const beforeCost = m.avg_cost; const before = m.on_hand;
  if (mode === "addition" || mode === "purchase_receive") m.avg_cost = weightedAverage(m.on_hand, m.avg_cost, quantity, unitCost ?? ZERO);
  m.on_hand = after; m.version += 1;
  c.db.movements.unshift({ id: uuid(), material_id: m.id, actor_id: c.actor.id, mode, quantity: fmt6(quantity), before_quantity: fmt6(before), after_quantity: fmt6(after), version: m.version, created_at: c.now.toISOString(), reason: reason ?? "", ...(unitCost !== undefined ? { unit_cost: fmt6(unitCost) } : {}), before_cost: fmt6(beforeCost), after_cost: fmt6(m.avg_cost) });
}

// Allocates genuinely free stock to this job's shortages and releases excess.
// Inactive materials keep/reduce existing reservations but gain none.
export function allocate(db: Db, job: Json) {
  for (const line of (job.plan as { lines: PlanLine[] }).lines) {
    const target = line.required > line.consumed ? line.required - line.consumed : ZERO;
    if (line.reserved > target) { line.reserved = target; continue; }
    const m = materialById(db, line.material_id);
    if (!m?.is_active) continue;
    const add = minBig(freeStock(db, m), target - line.reserved);
    if (add > ZERO) line.reserved += add;
  }
}
export function planView(job: Json) {
  const plan = job.plan as { version: number; lines: PlanLine[] };
  const lines = plan.lines.map((l) => { const short = l.required - l.consumed - l.reserved; return { material_id: l.material_id, required: fmt6(l.required), reserved: fmt6(l.reserved), consumed: fmt6(l.consumed), shortage: fmt6(short > ZERO ? short : ZERO) }; });
  return { job_id: job.id, version: plan.version, ready: job.status === "queued" && lines.length > 0 && lines.every((l) => l.shortage === "0.000000"), lines };
}
function writablePlanJob(c: Context): Json {
  const job = find(c.db.jobs, c.p.id, "Job");
  const request = c.db.requests.find((r) => r.id === job.request_id);
  if (job.status !== "queued" || request?.status !== "ongoing") throw conflict("Plans can change only for an ongoing request's queued job");
  if (version(c.body.expected_version) !== (job.plan as { version: number }).version) throw conflict();
  return job;
}
function catalogName(db: Db, items: Json[], value: unknown, max: number, except?: string): string {
  const name = text(value, "name", { max });
  if (/[\r\n]/.test(name)) throw invalid("Name cannot contain line breaks");
  if (items.some((i) => String(i.name).toLowerCase() === name.toLowerCase() && i.id !== except)) throw conflict("Name already exists");
  return name;
}

// ----- UC6/UC7 helpers -----
type OrderLine = { material_id: string; material_name: string; unit_id: string; unit_name: string; quantity: string; unit_cost: string; total_amount: string };
type Receipt = { id: string; actor_id: string; note: string; created_at: string; lines: { material_id: string; good: string; damaged: string; replacement_claim_id?: string }[] };
type Claim = { id: string; receipt_id: string; material_id: string; quantity: string; replaced: string; status: string; claimed_by?: string; claimed_at?: string; note: string };
type Order = Json & { id: string; order_no: string; supplier: Json; job_ids: string[]; lines: OrderLine[]; total_amount: string; status: string; supplier_response: string; version: number; events: Json[]; receipts: Receipt[]; claims: Claim[]; credit_days: number | null; full_received_at?: string; settlement?: Json };

function orderView(o: Order) {
  const { receipts: _r, claims: _c, credit_days: _d, full_received_at: _f, settlement: _s, ...view } = o;
  return view;
}
function event(c: Context, o: Order, action: string, reason = "") {
  o.version += 1; o.events.push({ id: uuid(), actor_id: c.actor.id, action, reason, version: o.version, created_at: c.now.toISOString() });
}
function received(o: Order, materialId: string) {
  let good = ZERO; let damaged = ZERO; let originalGood = ZERO; let originalDamaged = ZERO;
  for (const r of o.receipts) for (const l of r.lines) if (l.material_id === materialId) {
    good += micro(l.good); damaged += micro(l.damaged);
    if (!l.replacement_claim_id) { originalGood += micro(l.good); originalDamaged += micro(l.damaged); }
  }
  return { good, damaged, original: originalGood + originalDamaged };
}
function receivingView(c: Context, o: Order) {
  const lines = o.lines.map((l) => { const r = received(o, l.material_id); const ordered = micro(l.quantity); return { material_id: l.material_id, material_name: l.material_name, unit_name: l.unit_name, ordered: l.quantity, good: fmt6(r.good), damaged: fmt6(r.damaged), outstanding: fmt6(ordered - r.good) }; });
  const due = o.full_received_at && o.credit_days !== null ? new Date(Date.parse(o.full_received_at) + o.credit_days * 86400000).toISOString() : undefined;
  const finance = { total_amount: o.total_amount, credit_days: o.credit_days, ...(due ? { payment_due_at: due } : {}), payment_status: o.settlement ? "paid" : o.full_received_at && o.credit_days !== null ? "pending" : "unpaid", ...(o.settlement ? { settlement: o.settlement } : {}) };
  return { order_id: o.id, order_no: o.order_no, supplier_name: o.supplier.name, status: o.status, version: o.version, ...(o.full_received_at ? { full_received_at: o.full_received_at } : {}), lines, receipts: o.receipts, claims: o.claims, ...(c.actor.role === "admin" ? { finance } : {}) };
}
function receivingOrder(c: Context): Order {
  const o = find(c.db.orders, c.p.id, "Order") as Order;
  if (o.supplier_response !== "accepted" || o.status === "cancelled") throw notFound("Receiving order");
  return o;
}
function supplierInput(body: Json) {
  const name = text(body.name, "name", { max: 200 });
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if ((body.email !== undefined && typeof body.email !== "string") || (body.phone !== undefined && typeof body.phone !== "string")) throw invalid("Contacts must be strings");
  if (email && !/^[^\s@<>()",]+@[^\s@<>()",]+\.[^\s@<>()",]+$/.test(email)) throw invalid("Email must be a plain address");
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) throw invalid("Phone must be 7–15 digits with an optional leading +, without punctuation");
  return { name, email, phone };
}

export const stockRoutes: Route[] = [
  // ----- UC5 catalog -----
  route("GET", "/units", ["worker", "admin"], (c) => ({ items: c.db.units.slice(0, 1000).map((u) => ({ id: u.id, name: u.name })) })),
  route("POST", "/units", ["admin"], (c) => { fields(c.body, ["name"]); const unit = { id: uuid(), name: catalogName(c.db, c.db.units, c.body.name, 50) }; c.db.units.push(unit); return unit; }),
  route("GET", "/materials", ["worker", "admin"], (c) => {
    const term = (c.query.get("search") ?? "").toLowerCase();
    const items = (c.db.materials as Material[]).filter((m) => m.name.toLowerCase().includes(term)).sort((a, b) => a.name.localeCompare(b.name));
    return { items: page(items, c.query).map((m) => materialView(c.db, m, c.actor.role)) };
  }),
  route("POST", "/materials", ["admin"], (c) => {
    fields(c.body, ["name", "unit_id"]);
    if (!c.db.units.some((u) => u.id === c.body.unit_id)) throw invalid("unit_id must reference an existing unit");
    const material: Material = { id: uuid(), name: catalogName(c.db, c.db.materials, c.body.name, 200), unit_id: String(c.body.unit_id), is_active: true, version: 1, on_hand: ZERO, avg_cost: ZERO };
    c.db.materials.push(material); return materialView(c.db, material, "admin");
  }),
  route("PATCH", "/materials/:id", ["admin"], (c) => {
    fields(c.body, ["expected_version", "name", "is_active"]);
    const m = find(c.db.materials, c.p.id, "Material") as Material;
    if (version(c.body.expected_version) !== m.version) throw conflict();
    if (typeof c.body.is_active !== "boolean") throw invalid("is_active must be boolean");
    Object.assign(m, { name: catalogName(c.db, c.db.materials, c.body.name, 200, m.id), is_active: c.body.is_active, version: m.version + 1 });
    return materialView(c.db, m, "admin");
  }),
  route("POST", "/materials/:id/stock", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "mode", "quantity", "unit_cost", "reason"]);
    return idempotent(c, `stock:${c.p.id}`, () => {
      const m = find(c.db.materials, c.p.id, "Material") as Material;
      if (version(c.body.expected_version) !== m.version) throw conflict();
      const reason = text(c.body.reason, "reason");
      if (c.body.mode === "addition") {
        if (!m.is_active) throw conflict("Reactivate the material before adding stock");
        const quantity = micro(c.body.quantity, { positive: true }); const cost = micro(c.body.unit_cost);
        moveStock(c, m, "addition", quantity, m.on_hand + quantity, cost, reason);
      } else if (c.body.mode === "correction") {
        if (c.body.unit_cost !== undefined) throw invalid("Corrections take no unit_cost");
        const counted = micro(c.body.quantity);
        if (counted < reservedTotal(c.db, m.id)) throw conflict("Counted stock cannot be below active reservations");
        moveStock(c, m, "correction", counted > m.on_hand ? counted - m.on_hand : m.on_hand - counted, counted, undefined, reason);
      } else throw invalid("mode must be addition or correction");
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
      const job = writablePlanJob(c); const plan = job.plan as { version: number; lines: PlanLine[] };
      if (!Array.isArray(c.body.lines) || c.body.lines.length > 500) throw invalid("lines must be a complete list of at most 500");
      const seen = new Set<string>(); const nextLines: PlanLine[] = [];
      for (const raw of c.body.lines as Json[]) {
        if (!isUuid(raw.material_id) || seen.has(raw.material_id)) throw invalid("Each line needs a distinct material_id");
        seen.add(raw.material_id); const m = materialById(c.db, raw.material_id);
        if (!m) throw invalid("Unknown material");
        const required = micro(raw.quantity, { positive: true });
        const existing = plan.lines.find((l) => l.material_id === m.id);
        if (!m.is_active && (!existing || required > existing.required)) throw conflict("Inactive materials cannot be added or increased");
        nextLines.push({ material_id: m.id, required, reserved: existing?.reserved ?? ZERO, consumed: existing?.consumed ?? ZERO });
      }
      plan.lines = nextLines; plan.version += 1; allocate(c.db, job);
      return planView(job);
    });
  }),
  route("POST", "/jobs/:id/materials/reserve", ["worker"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version"]);
    return idempotent(c, `reserve:${c.p.id}`, () => { const job = writablePlanJob(c); (job.plan as { version: number }).version += 1; allocate(c.db, job); return planView(job); });
  }),

  // ----- UC6 suppliers and orders (Admin only) -----
  route("POST", "/suppliers", ["admin"], (c) => {
    fields(c.body, ["name", "email", "phone"]);
    const supplier = { id: uuid(), ...supplierInput(c.body), is_active: true, version: 1 }; c.db.suppliers.push(supplier); return supplier;
  }),
  route("GET", "/suppliers", ["admin"], (c) => {
    const term = (c.query.get("search") ?? "").toLowerCase();
    return { items: page(c.db.suppliers.filter((s) => String(s.name).toLowerCase().includes(term)), c.query) };
  }),
  route("PUT", "/suppliers/:id", ["admin"], (c) => {
    fields(c.body, ["name", "email", "phone", "is_active", "expected_version"]);
    const supplier = find(c.db.suppliers, c.p.id, "Supplier");
    if (version(c.body.expected_version) !== supplier.version) throw conflict();
    if (typeof c.body.is_active !== "boolean") throw invalid("is_active must be boolean");
    Object.assign(supplier, supplierInput(c.body), { is_active: c.body.is_active, version: Number(supplier.version) + 1 });
    return supplier;
  }),
  route("POST", "/material-orders", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "supplier_id", "job_ids", "expected_at", "lines"]);
    return idempotent(c, "order", () => {
      const supplier = find(c.db.suppliers, String(c.body.supplier_id), "Supplier");
      if (!supplier.is_active) throw conflict("Supplier is inactive");
      const jobIds = (c.body.job_ids ?? []) as unknown[];
      if (!Array.isArray(jobIds) || jobIds.length > 100 || new Set(jobIds).size !== jobIds.length || jobIds.some((id) => !isUuid(id) || !c.db.jobs.some((j) => j.id === id))) throw invalid("job_ids must be up to 100 distinct existing jobs");
      const rawLines = c.body.lines as Json[];
      if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 100) throw invalid("An order needs 1–100 lines");
      const seen = new Set<string>(); let total = ZERO;
      const lines: OrderLine[] = rawLines.map((raw) => {
        if (!isUuid(raw.material_id) || seen.has(raw.material_id)) throw invalid("Each line needs a distinct material_id");
        seen.add(raw.material_id); const m = materialById(c.db, raw.material_id);
        if (!m) throw invalid("Unknown material");
        if (!m.is_active) throw conflict("Material is inactive");
        const quantity = micro(raw.quantity, { positive: true }); const cost = micro(raw.unit_cost); const amount = lineSatang(quantity, cost); total += amount;
        return { material_id: m.id, material_name: m.name, unit_id: m.unit_id, unit_name: unitName(c.db, m.unit_id), quantity: fmt6(quantity), unit_cost: fmt6(cost), total_amount: fmt2(amount) };
      });
      let expected_at: string | undefined;
      if (c.body.expected_at !== undefined) { expected_at = instant(c.body.expected_at, "expected_at", { future: true, now: c.now }); const year = new Date(expected_at).getUTCFullYear(); if (year < 2000 || year > 9999) throw invalid("expected_at year must be 2000–9999"); }
      const id = uuid();
      const order: Order = { id, order_no: `MO-${id}`, supplier: { ...supplier }, job_ids: jobIds as string[], lines, total_amount: fmt2(total), status: "ordered", supplier_response: "pending", version: 0, ...(expected_at ? { expected_at } : {}), created_at: c.now.toISOString(), created_by: c.actor.id, events: [], receipts: [], claims: [], credit_days: null };
      event(c, order, "place"); c.db.orders.unshift(order);
      return orderView(order);
    });
  }),
  route("GET", "/material-orders", ["admin"], (c) => {
    const job = c.query.get("job_id");
    if (job && !isUuid(job)) throw invalid("Invalid job_id");
    return { items: page((c.db.orders as Order[]).filter((o) => !job || o.job_ids.includes(job)), c.query).map(orderView) };
  }),
  route("GET", "/material-orders/:id", ["admin"], (c) => orderView(find(c.db.orders, c.p.id, "Order") as Order)),
  route("POST", "/material-orders/:id/actions", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "action", "reason"]);
    return idempotent(c, `order-action:${c.p.id}`, () => {
      const o = find(c.db.orders, c.p.id, "Order") as Order;
      if (version(c.body.expected_version) !== o.version || o.status === "cancelled") throw conflict();
      const action = c.body.action;
      if (action === "accept" || action === "reject") {
        if (o.supplier_response !== "pending") throw conflict("A supplier response is already recorded");
        if (action === "accept") { o.supplier_response = "accepted"; event(c, o, "accept", text(c.body.reason, "reason", { required: false })); }
        else { o.supplier_response = "rejected"; o.status = "cancelled"; event(c, o, "reject", text(c.body.reason, "reason")); }
      } else if (action === "cancel") {
        if (o.receipts.length) throw conflict("An order with receipts cannot be cancelled");
        o.status = "cancelled"; event(c, o, "cancel", text(c.body.reason, "reason"));
      } else throw invalid("action must be accept, reject or cancel");
      return orderView(o);
    });
  }),

  // ----- UC7 receiving, claims and supplier settlement -----
  route("GET", "/receiving/orders", ["worker", "admin"], (c) => ({ items: page((c.db.orders as Order[]).filter((o) => o.supplier_response === "accepted" && o.status !== "cancelled"), c.query).map((o) => ({ order_id: o.id, order_no: o.order_no, supplier_name: o.supplier.name, status: o.status, version: o.version, ...(o.full_received_at ? { full_received_at: o.full_received_at } : {}) })) })),
  route("GET", "/receiving/orders/:id", ["worker", "admin"], (c) => receivingView(c, receivingOrder(c))),
  route("POST", "/receiving/orders/:id/receipts", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "note", "lines"]);
    return idempotent(c, `receipt:${c.p.id}`, () => {
      const o = receivingOrder(c);
      if (version(c.body.expected_version) !== o.version || o.status === "received") throw conflict();
      const rawLines = c.body.lines as Json[];
      if (!Array.isArray(rawLines) || rawLines.length < 1 || rawLines.length > 100) throw invalid("A receipt needs 1–100 lines");
      const receipt: Receipt = { id: uuid(), actor_id: c.actor.id, note: text(c.body.note, "note", { required: false }), created_at: c.now.toISOString(), lines: [] };
      const pairs = new Set<string>(); const pendingClaim = new Map<string, bigint>();
      const effects: (() => void)[] = [];
      for (const raw of rawLines) {
        const claimId = raw.replacement_claim_id === undefined || raw.replacement_claim_id === "" ? undefined : String(raw.replacement_claim_id);
        const line = o.lines.find((l) => l.material_id === raw.material_id);
        if (!line) throw invalid("Material is not on this order");
        const pair = `${line.material_id}:${claimId ?? ""}`;
        if (pairs.has(pair)) throw invalid("Each material/claim pair may appear once");
        pairs.add(pair);
        const good = micro(raw.good); const damaged = micro(raw.damaged);
        if (good + damaged === ZERO) throw invalid("Each line needs a positive good or damaged quantity");
        const m = materialById(c.db, line.material_id)!;
        if (good > ZERO && !m.is_active) throw conflict(`Reactivate ${m.name} before receiving good stock`);
        if (claimId) {
          const claim = o.claims.find((x) => x.id === claimId);
          if (!claim || claim.material_id !== line.material_id || claim.status !== "claimed") throw invalid("Replacement must reference a claimed defect of this material");
          const owed = micro(claim.quantity) - micro(claim.replaced) - (pendingClaim.get(claimId) ?? ZERO);
          if (good + damaged > owed) throw invalid("Replacement exceeds the quantity still owed for this claim");
          pendingClaim.set(claimId, (pendingClaim.get(claimId) ?? ZERO) + good);
          effects.push(() => { claim.replaced = fmt6(micro(claim.replaced) + good); if (micro(claim.replaced) === micro(claim.quantity)) claim.status = "resolved"; });
        } else {
          // Pairs are distinct, so a material has at most one original line here.
          if (received(o, line.material_id).original + good + damaged > micro(line.quantity)) throw invalid(`Delivery exceeds the ordered ${line.material_name} quantity`);
          if (damaged > ZERO) effects.push(() => o.claims.push({ id: uuid(), receipt_id: receipt.id, material_id: line.material_id, quantity: fmt6(damaged), replaced: "0.000000", status: "pending_claim", note: "" }));
        }
        if (good > ZERO) effects.push(() => moveStock(c, m, "purchase_receive", good, m.on_hand + good, micro(line.unit_cost), `Receipt ${o.order_no}`));
        receipt.lines.push({ material_id: line.material_id, good: fmt6(good), damaged: fmt6(damaged), ...(claimId ? { replacement_claim_id: claimId } : {}) });
      }
      o.receipts.push(receipt); effects.forEach((apply) => apply());
      const full = o.lines.every((l) => received(o, l.material_id).good === micro(l.quantity));
      o.status = full ? "received" : "partially_received";
      if (full) o.full_received_at = c.now.toISOString();
      event(c, o, "receive");
      return receivingView(c, o);
    });
  }),
  route("POST", "/receiving/orders/:id/claims/:claim/submit", ["worker", "admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "note"]);
    return idempotent(c, `claim:${c.p.claim}`, () => {
      const o = receivingOrder(c); const claim = o.claims.find((x) => x.id === c.p.claim);
      if (!claim) throw notFound("Claim");
      if (version(c.body.expected_version) !== o.version || claim.status !== "pending_claim") throw conflict();
      Object.assign(claim, { status: "claimed", claimed_by: c.actor.id, claimed_at: c.now.toISOString(), note: text(c.body.note, "note") });
      event(c, o, "claim"); return receivingView(c, o);
    });
  }),
  route("POST", "/receiving/orders/:id/credit-terms", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "credit_days"]);
    return idempotent(c, `credit:${c.p.id}`, () => {
      const o = receivingOrder(c);
      if (version(c.body.expected_version) !== o.version || o.credit_days !== null) throw conflict("Credit days are already set");
      const days = c.body.credit_days;
      if (typeof days !== "number" || !Number.isInteger(days) || days < 0 || days > 36500) throw invalid("credit_days must be an integer 0–36500");
      o.credit_days = days; event(c, o, "credit_terms"); return receivingView(c, o);
    });
  }),
  route("POST", "/receiving/orders/:id/settlement", ["admin"], (c) => {
    fields(c.body, ["idempotency_key", "expected_version", "method", "paid_at", "evidence_id"]);
    return idempotent(c, `settle:${c.p.id}`, () => {
      const o = receivingOrder(c);
      if (version(c.body.expected_version) !== o.version || o.settlement || !o.full_received_at || o.credit_days === null) throw conflict("Settlement needs full good receipt, credit days and no prior settlement");
      const method = c.body.method;
      if (method !== "bank" && method !== "cash") throw invalid("method must be bank or cash");
      const paidAt = instant(c.body.paid_at, "paid_at", { now: c.now });
      if (Date.parse(paidAt) < Date.parse(o.full_received_at)) throw invalid("paid_at cannot be before full receipt");
      const evidence = c.body.evidence_id ? c.db.files.get(String(c.body.evidence_id)) : undefined;
      if (c.body.evidence_id !== undefined && (!evidence || evidence.kind !== "order-evidence" || evidence.order_id !== o.id || evidence.state !== "ready")) throw invalid("evidence_id must be ready evidence for this order");
      if (method === "bank" && !evidence) throw invalid("Bank settlement requires ready evidence");
      o.settlement = { actor_id: c.actor.id, amount: o.total_amount, method, paid_at: paidAt, ...(evidence ? { evidence_id: evidence.id } : {}) };
      event(c, o, "settle"); return receivingView(c, o);
    });
  }),
  route("POST", "/material-orders/:id/evidence/uploads", ["admin"], (c) => { const o = find(c.db.orders, c.p.id, "Order"); return startUpload(c, "order-evidence", { order_id: o.id }); }),
  route("POST", "/order-evidence/:id/complete", ["admin"], (c) => publicFile(completeUpload(c, c.p.id, "order-evidence"))),
  route("GET", "/order-evidence/:id/download", ["admin"], (c) => { const f = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined; return downloadLink(c, f?.kind === "order-evidence" ? f : undefined); }),
];
