// Mock AUTH, memberships, inbox, UC1 requests/files, UC2 quotations,
// UC3 decisions and UC4 deposit/PO evidence. Shapes follow backend AUTH.md,
// UC1–UC4.md and the DTOs the connected frontend already consumes.
import { activeIds, completeUpload, conflict, downloadLink, fields, find, forbidden, idempotent, instant, invalid, isUuid, MockError, next, notFound, notify, page, publicFile, route, startUpload, text, uuid, version, type Context, type Db, type Json, type MockAccount, type Route } from "./mock-backend.ts";
import { fmt2, halfUp, minimumPrice, satang } from "./mock-decimal.ts";

const SESSION_MS = 12 * 3600000;
export const publicAccount = (a: MockAccount) => ({ id: a.id, person_id: a.person_id, username: a.username, name: a.name, role: a.role, is_active: a.is_active });
export const workerView = (a: MockAccount) => ({ ...publicAccount(a), employee_no: a.employee_no ?? "", position: a.position || undefined, email: a.email ?? null, phone: a.phone ?? null });

function workerById(c: Context): MockAccount {
  if (!isUuid(c.p.id)) throw invalid("Invalid worker id");
  const worker = c.db.accounts.find((a) => a.role === "worker" && a.id === c.p.id);
  if (!worker) throw notFound("Worker");
  return worker;
}
export function memberCustomers(db: Db, account: MockAccount) { return db.customers.filter((c) => c.members.some((m) => m.account_id === account.id)); }
export function memberIds(db: Db, customerId: string) { return db.customers.find((c) => c.id === customerId)?.members.map((m) => m.account_id) ?? []; }
export function visibleRequest(c: Context, id: string): Json {
  const request = find(c.db.requests, id, "Request");
  // Unrelated customer scope is indistinguishable from a missing record.
  if (c.actor.role === "customer" && !memberIds(c.db, String(request.customer_id)).includes(c.actor.id)) throw notFound("Request");
  return request;
}
const requestView = (r: Json) => ({ id: r.id, no_request: r.no_request, customer_id: r.customer_id, description: r.description, qty: r.qty, material_spec: r.material_spec, ...(r.deadline ? { deadline: r.deadline } : {}), status: r.status, created_at: r.created_at });

function quotationView(q: Json, role: string) {
  const { internal_costs, created_at: _, ...rest } = q;
  return role === "customer" ? rest : { ...rest, internal_costs };
}
function costs(c: Context) {
  const material = satang(c.body.material_cost); const labor = satang(c.body.labor_cost);
  return { material, labor, estimate: { material_cost: fmt2(material), labor_cost: fmt2(labor), total_cost: fmt2(material + labor), minimum_price: fmt2(minimumPrice(material, labor)) } };
}
function priced(c: Context) {
  const { material, labor, estimate } = costs(c); const final = satang(c.body.final_price);
  if (final < minimumPrice(material, labor)) throw invalid(`Final price must be at least the minimum ${estimate.minimum_price}`);
  return { final_price: fmt2(final), internal_costs: estimate };
}

function password(value: unknown): string {
  if (typeof value !== "string" || [...value].length < 12 || new TextEncoder().encode(value).length > 128) throw invalid("Password needs at least 12 characters and at most 128 bytes");
  return value;
}
function username(db: Db, value: unknown, except?: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_.-]{3,64}$/.test(value)) throw invalid("Username must be 3–64 letters, digits, dot, dash or underscore");
  if (db.accounts.some((a) => a.username.toLowerCase() === value.toLowerCase() && a.id !== except)) throw conflict("Username is already used");
  return value;
}
function contacts(body: Json) {
  const email = text(body.email, "email", { max: 254 });
  if (!/^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(email)) throw invalid("Email address is invalid");
  const raw = text(body.phone, "phone", { max: 64 }); const phone = raw.replace(/[ ().-]/g, "");
  if (!/^\+?[0-9]{7,15}$/.test(phone)) throw invalid("Phone needs 7–15 digits with an optional leading +");
  return { email, phone };
}

export function termsFor(customerType: string, finalPrice: string, acceptedAt: Date) {
  const total = satang(finalPrice); const company = customerType === "company";
  const deposit_required = !company || total > BigInt(1000000); const po_required = company;
  const deposit = deposit_required ? halfUp(total) : BigInt(0);
  return { customer_type: customerType, final_price: fmt2(total), deposit_required, po_required, deposit_amount: fmt2(deposit), balance_after_deposit: fmt2(total - deposit), accepted_at: acceptedAt.toISOString(), documents_due_at: new Date(acceptedAt.getTime() + 336 * 3600000).toISOString() };
}
export const jobView = (j: Json) => ({ id: j.id, quotation_id: j.quotation_id, request_id: j.request_id, status: j.status, deposit_amount: j.deposit_amount, balance: j.balance, due_at: j.due_at ?? null, created_at: j.created_at });

function fulfillmentState(c: Context, quotationId: string) {
  const quotation = find(c.db.quotations, quotationId, "Quotation"); const request = visibleRequest(c, String(quotation.request_id));
  const state = c.db.fulfillments.get(quotationId);
  if (!state) throw notFound("Fulfillment");
  const terms = state.terms as ReturnType<typeof termsFor>;
  const evidence = c.db.evidence.filter((e) => e.quotation_id === quotationId);
  const job = c.db.jobs.find((j) => j.quotation_id === quotationId);
  // Backend worker expires missing/rejected requirements after the deadline.
  if (!job && !state.canceled_at && c.now.getTime() > Date.parse(terms.documents_due_at)) {
    const missing = (["deposit", "po"] as const).some((kind) => (kind === "deposit" ? terms.deposit_required : terms.po_required) && !evidence.some((e) => e.kind === kind && e.status !== "rejected"));
    if (missing) { state.canceled_at = terms.documents_due_at; request.status = "canceled"; }
  }
  return { quotation, request, state, terms, evidence, job };
}
function fulfillmentView(c: Context, quotationId: string) {
  const { request, state, terms, evidence, job } = fulfillmentState(c, quotationId);
  return { quotation_id: quotationId, request_status: request.status, terms, evidence: evidence.slice(-100), job: job ? jobView(job) : null, canceled_at: state.canceled_at ?? null };
}

export const salesRoutes: Route[] = [
  // ----- AUTH -----
  route("POST", "/auth/login", "public", (c) => {
    fields(c.body, ["username", "password"]);
    const account = c.db.accounts.find((a) => a.username === c.body.username && a.password === c.body.password && a.is_active);
    if (!account) throw new MockError(401, "invalid_credentials", "Invalid username or password");
    const access_token = `mock-${uuid()}`; const expires_at = new Date(c.now.getTime() + SESSION_MS).toISOString();
    c.db.sessions.set(access_token, { account_id: account.id, expires_at });
    return { access_token, token_type: "Bearer", expires_at, account: publicAccount(account) };
  }),
  route("GET", "/auth/me", "session", (c) => publicAccount(c.actor)),
  route("POST", "/auth/logout", "session", (c) => { for (const [token, s] of c.db.sessions) if (s.account_id === c.actor.id) c.db.sessions.delete(token); return undefined; }),
  route("POST", "/auth/register", "public", (c) => {
    fields(c.body, ["username", "password", "name", "customer_type", "company_name", "invitation"]);
    const account: MockAccount = { id: uuid(), person_id: uuid(), username: username(c.db, c.body.username), password: password(c.body.password), name: text(c.body.name, "name", { max: 200 }), role: "customer", is_active: true };
    if (c.body.customer_type === "individual") {
      if (c.body.company_name !== undefined || c.body.invitation !== undefined) throw invalid("Individuals do not join companies");
      c.db.accounts.push(account); c.db.customers.push({ id: uuid(), customer_type: "individual", name: account.name, members: [{ account_id: account.id, is_owner: true }] });
    } else if (c.body.customer_type === "company") {
      if (c.body.invitation !== undefined) {
        const invitation = c.db.invitations.get(String(c.body.invitation));
        if (!invitation || invitation.used || Date.parse(invitation.expires_at) < c.now.getTime()) throw invalid("Invitation is invalid or expired");
        invitation.used = true; c.db.accounts.push(account);
        c.db.customers.find((x) => x.id === invitation.customer_id)?.members.push({ account_id: account.id, is_owner: false });
      } else {
        const name = text(c.body.company_name, "company_name", { max: 200 }); c.db.accounts.push(account);
        c.db.customers.push({ id: uuid(), customer_type: "company", name, members: [{ account_id: account.id, is_owner: true }] });
      }
    } else throw invalid("customer_type must be individual or company");
    return publicAccount(account);
  }),

  // ----- Admin Worker management -----
  route("GET", "/admin/workers", ["admin"], (c) => ({ items: page(c.db.accounts.filter((a) => a.role === "worker"), c.query).map(workerView), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) })),
  route("GET", "/admin/workers/:id", ["admin"], (c) => { const w = workerById(c); return workerView(w); }),
  route("POST", "/admin/workers", ["admin"], (c) => {
    fields(c.body, ["name", "username", "employee_no", "position", "email", "phone", "password"]);
    const employee_no = text(c.body.employee_no, "employee_no", { max: 30 });
    if (c.db.accounts.some((a) => a.employee_no === employee_no)) throw conflict("Employee number is already used");
    const worker: MockAccount = { id: uuid(), person_id: uuid(), username: username(c.db, c.body.username), password: password(c.body.password), name: text(c.body.name, "name", { max: 200 }), role: "worker", is_active: true, employee_no, position: text(c.body.position, "position", { max: 100, required: false }), ...contacts(c.body) };
    c.db.accounts.push(worker); return workerView(worker);
  }),
  route("PATCH", "/admin/workers/:id", ["admin"], (c) => {
    fields(c.body, ["name", "username", "employee_no", "position", "email", "phone", "password", "is_active"]);
    const worker = workerById(c);
    const revoke = () => { for (const [token, s] of c.db.sessions) if (s.account_id === worker.id) c.db.sessions.delete(token); };
    if (c.body.password !== undefined) { worker.password = password(c.body.password); revoke(); }
    if (c.body.is_active !== undefined) { if (typeof c.body.is_active !== "boolean") throw invalid("is_active must be boolean"); worker.is_active = c.body.is_active; if (!worker.is_active) revoke(); }
    if (c.body.name !== undefined) {
      const changedUsername = username(c.db, c.body.username, worker.id);
      if (changedUsername !== worker.username) revoke();
      Object.assign(worker, { name: text(c.body.name, "name", { max: 200 }), username: changedUsername, employee_no: text(c.body.employee_no, "employee_no", { max: 30 }), position: text(c.body.position, "position", { max: 100, required: false }), ...contacts(c.body) });
    }
    return workerView(worker);
  }),

  // ----- Customer memberships -----
  route("GET", "/customers", ["customer"], (c) => ({ items: memberCustomers(c.db, c.actor).map((x) => ({ id: x.id, customer_type: x.customer_type, name: x.name, is_owner: x.members.some((m) => m.account_id === c.actor.id && m.is_owner) })) })),
  route("POST", "/customers/:id/invitations", ["customer"], (c) => {
    const customer = memberCustomers(c.db, c.actor).find((x) => x.id === c.p.id);
    if (!customer) throw notFound("Customer");
    if (customer.customer_type !== "company" || !customer.members.some((m) => m.account_id === c.actor.id && m.is_owner)) throw forbidden();
    const invitation = `inv-${uuid()}`; c.db.invitations.set(invitation, { customer_id: customer.id, expires_at: new Date(c.now.getTime() + 86400000).toISOString(), used: false });
    return { invitation };
  }),
  route("POST", "/customers/join", ["customer"], (c) => {
    fields(c.body, ["invitation"]);
    const invitation = c.db.invitations.get(String(c.body.invitation));
    if (!invitation || invitation.used || Date.parse(invitation.expires_at) < c.now.getTime()) throw invalid("Invitation is invalid or expired");
    const customer = c.db.customers.find((x) => x.id === invitation.customer_id);
    if (!customer || customer.members.some((m) => m.account_id === c.actor.id)) throw conflict("Already a member");
    invitation.used = true; customer.members.push({ account_id: c.actor.id, is_owner: false });
    return { id: customer.id, customer_type: customer.customer_type, name: customer.name, is_owner: false };
  }),

  // ----- Inbox -----
  route("GET", "/notifications", "session", (c) => ({ items: page(c.db.notifications.filter((n) => n.account_id === c.actor.id), c.query).map(({ account_id: _, ...n }) => n), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) })),
  route("PATCH", "/notifications/:id/read", "session", (c) => {
    const item = c.db.notifications.find((n) => n.id === c.p.id && n.account_id === c.actor.id);
    if (!item) throw notFound("Notification");
    item.read_at ??= c.now.toISOString(); return undefined;
  }),

  // ----- UC1 requests and private request files -----
  route("GET", "/requests", "session", (c) => {
    const scope = c.actor.role === "customer" ? new Set(memberCustomers(c.db, c.actor).map((x) => x.id)) : null;
    const items = c.db.requests.filter((r) => !scope || scope.has(String(r.customer_id))).slice().reverse();
    return { items: page(items, c.query).map(requestView), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) };
  }),
  route("POST", "/requests", ["customer"], (c) => {
    fields(c.body, ["customer_id", "description", "qty", "material_spec", "deadline"]);
    const customer = memberCustomers(c.db, c.actor).find((x) => x.id === c.body.customer_id);
    if (!customer) throw invalid("Choose one of your customer memberships");
    const qty = String(c.body.qty ?? "");
    if (!/^[1-9]\d{0,18}$/.test(qty) || BigInt(qty) > BigInt("9223372036854775807")) throw invalid("qty must be a positive int64");
    const deadline = c.body.deadline === undefined ? undefined : instant(c.body.deadline, "deadline", { future: true, now: c.now });
    if (deadline && Date.parse(deadline) <= c.now.getTime()) throw invalid("deadline must be in the future");
    const request = { id: uuid(), no_request: next(c.db, "request"), customer_id: customer.id, created_by: c.actor.id, description: text(c.body.description, "description", { max: 10000 }), qty, material_spec: text(c.body.material_spec, "material_spec", { required: false }), deadline, status: "pending", created_at: c.now.toISOString() };
    c.db.requests.push(request);
    notify(c.db, [...activeIds(c.db, "worker"), ...activeIds(c.db, "admin")], request.id, `New request #${request.no_request}`);
    return requestView(request);
  }),
  route("GET", "/requests/:id", "session", (c) => requestView(visibleRequest(c, c.p.id))),
  route("POST", "/requests/:id/reject", ["worker"], (c) => {
    fields(c.body, ["reason"]);
    const request = visibleRequest(c, c.p.id);
    if (request.status !== "pending") throw conflict("Only a pending request can be refused");
    request.status = "canceled"; request.rejection = { reason: text(c.body.reason, "reason"), actor_id: c.actor.id, rejected_at: c.now.toISOString() };
    notify(c.db, memberIds(c.db, String(request.customer_id)), String(request.id), `Request #${request.no_request} was refused`);
    return requestView(request);
  }),
  route("GET", "/requests/:id/rejection", "session", (c) => { const r = visibleRequest(c, c.p.id); if (!r.rejection) throw notFound("Refusal"); return r.rejection; }),
  route("POST", "/requests/:id/uploads", ["customer"], (c) => {
    const request = visibleRequest(c, c.p.id);
    if (request.status === "canceled" || request.status === "completed") throw conflict("Request is closed");
    return startUpload(c, "attachment", { request_id: request.id });
  }),
  route("POST", "/uploads/:id/complete", ["customer"], (c) => publicFile(completeUpload(c, c.p.id, "attachment"))),
  route("GET", "/requests/:id/attachments", "session", (c) => {
    visibleRequest(c, c.p.id);
    return { items: [...c.db.files.values()].filter((f) => f.kind === "attachment" && f.request_id === c.p.id && f.state === "ready").map(publicFile) };
  }),
  route("GET", "/attachments/:id/download", "session", (c) => {
    const file = isUuid(c.p.id) ? c.db.files.get(c.p.id) : undefined;
    if (!file || file.kind !== "attachment") throw notFound("Attachment");
    visibleRequest(c, String(file.request_id));
    return downloadLink(c, file);
  }),

  // ----- UC2 quotations -----
  route("POST", "/quotations/estimate", ["worker"], (c) => { fields(c.body, ["material_cost", "labor_cost"]); return costs(c).estimate; }),
  route("GET", "/requests/:id/quotations", "session", (c) => {
    visibleRequest(c, c.p.id);
    const items = c.db.quotations.filter((q) => q.request_id === c.p.id && (c.actor.role !== "customer" || q.status !== "draft")).slice().reverse();
    return { items: page(items, c.query).map((q) => quotationView(q, c.actor.role)), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) };
  }),
  route("POST", "/requests/:id/quotations", ["worker"], (c) => {
    fields(c.body, ["material_cost", "labor_cost", "final_price"]);
    const request = visibleRequest(c, c.p.id);
    if (request.status === "canceled" || request.status === "completed") throw conflict("Request is closed");
    const existing = c.db.quotations.filter((q) => q.request_id === request.id);
    if (existing.some((q) => ["draft", "sent", "approved"].includes(String(q.status)))) throw conflict("Only one draft/sent/approved quotation may exist");
    const quotation = { id: uuid(), request_id: request.id, quotation_no: next(c.db, "quotation"), version: existing.length + 1, lock_version: 1, status: "draft", ...priced(c), created_at: c.now.toISOString() };
    c.db.quotations.push(quotation); return quotationView(quotation, "worker");
  }),
  route("PATCH", "/quotations/:id", ["worker"], (c) => {
    fields(c.body, ["material_cost", "labor_cost", "final_price", "expected_lock_version"]);
    const quotation = find(c.db.quotations, c.p.id, "Quotation");
    if (quotation.status !== "draft" || version(c.body.expected_lock_version, "expected_lock_version") !== quotation.lock_version) throw conflict();
    Object.assign(quotation, priced(c), { lock_version: Number(quotation.lock_version) + 1 });
    return quotationView(quotation, "worker");
  }),
  route("POST", "/quotations/:id/send", ["worker"], (c) => {
    fields(c.body, ["expected_lock_version"]);
    const quotation = find(c.db.quotations, c.p.id, "Quotation"); const request = visibleRequest(c, String(quotation.request_id));
    if (quotation.status !== "draft" || request.status === "canceled" || version(c.body.expected_lock_version, "expected_lock_version") !== quotation.lock_version) throw conflict();
    Object.assign(quotation, { status: "sent", sent_at: c.now.toISOString(), lock_version: Number(quotation.lock_version) + 1 });
    if (request.status === "pending") request.status = "ongoing";
    notify(c.db, memberIds(c.db, String(request.customer_id)), String(request.id), `Quotation #${quotation.quotation_no} is ready for review`);
    return quotationView(quotation, "worker");
  }),

  // ----- UC3 customer decisions -----
  route("POST", "/quotations/:id/decision", ["customer"], (c) => {
    fields(c.body, ["outcome", "expected_lock_version", "reason"]);
    const quotation = find(c.db.quotations, c.p.id, "Quotation"); const request = visibleRequest(c, String(quotation.request_id));
    if (quotation.status !== "sent" || request.status !== "ongoing" || version(c.body.expected_lock_version, "expected_lock_version") !== quotation.lock_version) throw conflict();
    const outcome = c.body.outcome;
    if (outcome !== "accept" && outcome !== "reject") throw invalid("outcome must be accept or reject");
    if (outcome === "accept" && c.body.reason !== undefined) throw invalid("Acceptance takes no reason");
    const reason = outcome === "reject" ? text(c.body.reason, "reason", { required: false }) : undefined;
    const previous = c.db.decisions.filter((d) => d.request_id === request.id && d.outcome === "reject").length;
    const rejection_count = previous + (outcome === "reject" ? 1 : 0);
    let terms: ReturnType<typeof termsFor> | undefined;
    quotation.lock_version = Number(quotation.lock_version) + 1;
    if (outcome === "accept") {
      quotation.status = "approved";
      const customer = c.db.customers.find((x) => x.id === request.customer_id);
      terms = termsFor(customer?.customer_type ?? "individual", String(quotation.final_price), c.now);
      c.db.fulfillments.set(String(quotation.id), { terms });
    } else {
      quotation.status = "rejected";
      if (rejection_count > 5) request.status = "canceled";
    }
    const decision = { quotation_id: quotation.id, request_id: request.id, actor_id: c.actor.id, outcome, ...(reason ? { reason } : {}), expected_lock_version: Number(quotation.lock_version) - 1, decided_at: c.now.toISOString(), rejection_count, request_status: request.status, ...(terms ? { terms } : {}) };
    c.db.decisions.push(decision);
    notify(c.db, [...activeIds(c.db, "worker"), ...activeIds(c.db, "admin")], String(request.id), `Customer ${outcome === "accept" ? "accepted" : "rejected"} quotation #${quotation.quotation_no}`);
    return decision;
  }),
  route("GET", "/requests/:id/quotation-decisions", "session", (c) => {
    visibleRequest(c, c.p.id);
    return { items: page(c.db.decisions.filter((d) => d.request_id === c.p.id).slice().reverse(), c.query), limit: Number(c.query.get("limit") ?? 20), offset: Number(c.query.get("offset") ?? 0) };
  }),

  // ----- UC4 deposit / company PO evidence -----
  route("GET", "/quotations/:id/fulfillment", "session", (c) => fulfillmentView(c, c.p.id)),
  route("POST", "/quotations/:id/evidence", ["customer"], (c) => {
    fields(c.body, ["idempotency_key", "attachment_id", "kind", "amount", "paid_at"]);
    return idempotent(c, `evidence:${c.p.id}`, () => {
      const { request, state, terms, evidence, job } = fulfillmentState(c, c.p.id);
      if (job || state.canceled_at || request.status !== "ongoing" || c.now.getTime() > Date.parse(terms.documents_due_at)) throw conflict("Submissions are closed for this quotation");
      const kind = c.body.kind;
      if (kind !== "deposit" && kind !== "po") throw invalid("kind must be deposit or po");
      if (!(kind === "deposit" ? terms.deposit_required : terms.po_required)) throw invalid(`This quotation does not require ${kind}`);
      if (evidence.some((e) => e.kind === kind && e.status !== "rejected")) throw conflict(`An active ${kind} submission already exists`);
      const file = isUuid(c.body.attachment_id) ? c.db.files.get(c.body.attachment_id) : undefined;
      if (!file || file.kind !== "attachment" || file.request_id !== request.id || file.state !== "ready" || file.uploaded_by !== c.actor.id) throw invalid("attachment_id must be your ready file on this request");
      if (c.db.evidence.some((e) => e.attachment_id === file.id)) throw conflict("This file was already submitted; upload a new one");
      let extra = {};
      if (kind === "deposit") {
        const amount = satang(c.body.amount);
        if (amount < satang(terms.deposit_amount) || amount > satang(terms.final_price)) throw invalid("Deposit must be between the minimum and the full total");
        extra = { amount: fmt2(amount), paid_at: instant(c.body.paid_at, "paid_at", { now: c.now }) };
      } else if (c.body.amount !== undefined || c.body.paid_at !== undefined) throw invalid("PO evidence takes no amount or paid_at");
      const record = { id: uuid(), quotation_id: c.p.id, idempotency_key: c.body.idempotency_key, attachment_id: file.id, kind, ...extra, submitted_by: c.actor.id, status: "pending", version: 1, submitted_at: c.now.toISOString(), reviewed_by: null, reviewed_at: null };
      c.db.evidence.push(record);
      notify(c.db, [...activeIds(c.db, "worker"), ...activeIds(c.db, "admin")], String(request.id), `${kind === "po" ? "Company PO" : "Deposit"} evidence submitted`);
      return record;
    });
  }),
  route("POST", "/evidence/:id/review", ["worker", "admin"], (c) => {
    fields(c.body, ["outcome", "expected_version", "reason"]);
    const record = find(c.db.evidence, c.p.id, "Evidence");
    const { request, state, terms, evidence, job, quotation } = fulfillmentState(c, String(record.quotation_id));
    if (record.status !== "pending" || job || state.canceled_at || request.status !== "ongoing" || version(c.body.expected_version) !== record.version) throw conflict();
    if (c.body.outcome === "approved") { if (c.body.reason !== undefined) throw invalid("Approval takes no reason"); }
    else if (c.body.outcome === "rejected") record.reason = text(c.body.reason, "reason");
    else throw invalid("outcome must be approved or rejected");
    Object.assign(record, { status: c.body.outcome, version: Number(record.version) + 1, reviewed_by: c.actor.id, reviewed_at: c.now.toISOString() });
    const approved = (kind: string) => evidence.find((e) => e.kind === kind && e.status === "approved");
    if ((!terms.deposit_required || approved("deposit")) && (!terms.po_required || approved("po"))) {
      const deposit = terms.deposit_required ? satang(approved("deposit")?.amount) : BigInt(0);
      c.db.jobs.push({ id: uuid(), quotation_id: quotation.id, request_id: request.id, status: "queued", deposit_amount: fmt2(deposit), balance: fmt2(satang(terms.final_price) - deposit), due_at: request.deadline ?? null, created_at: c.now.toISOString(), plan: { version: 0, lines: [] }, production: { version: 0, cycle: 1, events: [], usage: [], time: [] }, delivery: { version: 0, deliveries: [], payments: [], events: [], rework: [] } });
    }
    notify(c.db, memberIds(c.db, String(request.customer_id)), String(request.id), `Evidence ${c.body.outcome}`);
    return fulfillmentView(c, String(quotation.id));
  }),
];
