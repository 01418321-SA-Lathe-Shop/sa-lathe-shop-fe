// Seeded mock scenario: one request at each workflow stage (UC1 → UC9),
// created through the mock's own endpoints so every record stays consistent.
// All names and figures are fictional sample data.
import { createMockBackend, uuid, type Db, type Json, type MockAccount } from "./mock-backend.ts";
import { salesRoutes } from "./mock-routes-sales.ts";
import { stockRoutes } from "./mock-routes-stock.ts";
import { jobRoutes } from "./mock-routes-jobs.ts";
import { MOCK_PASSWORD } from "./mock-accounts.ts";

export { MOCK_LOGINS, MOCK_PASSWORD } from "./mock-accounts.ts";

type Run = (username: string, method: string, path: string, body?: unknown) => Json;

function seedAccounts(db: Db) {
  const account = (username: string, name: string, role: MockAccount["role"], extra: Partial<MockAccount> = {}): MockAccount => ({ id: uuid(), person_id: uuid(), username, password: MOCK_PASSWORD, name, role, is_active: true, ...extra });
  const nida = account("nida.company", "Nida Wongsuwan", "customer");
  const ploy = account("ploy.company", "Ploy Charoen", "customer");
  const somchai = account("somchai", "Somchai Jaidee", "customer");
  db.accounts.push(nida, ploy, somchai,
    account("anan.staff", "Anan Srisuk", "worker", { employee_no: "ST-001", position: "Lathe operator", email: "anan@example.com", phone: "0812345678" }),
    account("kittipong.staff", "Kittipong Meesuk", "worker", { employee_no: "ST-002", position: "CNC programmer", email: "kittipong@example.com", phone: "0898765432" }),
    account("legacy.staff", "Legacy Worker", "worker", { employee_no: "ST-000", email: null, phone: null }),
    account("pim.admin", "Pim Rattana", "admin"));
  db.customers.push(
    { id: uuid(), customer_type: "company", name: "Siam Precision Parts Co., Ltd.", members: [{ account_id: nida.id, is_owner: true }, { account_id: ploy.id, is_owner: false }] },
    { id: uuid(), customer_type: "individual", name: "Somchai Jaidee", members: [{ account_id: somchai.id, is_owner: true }] });
}

function seedScenario(db: Db, run: Run) {
  const key = () => uuid();
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600000).toISOString();
  const customerOf = (username: string) => (run(username, "GET", "/customers").items as Json[])[0].id as string;
  const company = customerOf("nida.company"); const individual = customerOf("somchai");
  const companyUser = "nida.company"; const person = "somchai";

  // UC5 master data and opening stock (Admin).
  const unit = (name: string) => run("pim.admin", "POST", "/units", { name }).id as string;
  const kg = unit("kg"); const piece = unit("piece"); const metre = unit("m");
  const material = (name: string, unitId: string, quantity?: string, cost?: string) => {
    const m = run("pim.admin", "POST", "/materials", { name, unit_id: unitId });
    if (quantity) run("pim.admin", "POST", `/materials/${m.id}/stock`, { idempotency_key: key(), expected_version: m.version, mode: "addition", quantity, unit_cost: cost, reason: "Opening stock count" });
    return m.id as string;
  };
  const steel = material("Steel S45C round bar Ø50", kg, "120", "42.50");
  const aluminium = material("Aluminium 6061 plate 10 mm", kg, "40", "118");
  const brass = material("Brass C3604 rod Ø20", kg, "8", "265");
  const bolts = material("Hex bolt M10×40", piece, "500", "3.2");
  const stainless = material("Stainless 304 shaft Ø30", metre);
  const castIron = material("Cast iron FC250 blank", kg, "15", "38");
  const iron = run("pim.admin", "GET", `/materials?search=${encodeURIComponent("Cast iron")}`).items as Json[];
  run("pim.admin", "PATCH", `/materials/${castIron}`, { expected_version: iron[0].version, name: iron[0].name, is_active: false });

  // UC1 helpers.
  const request = (username: string, customer: string, description: string, qty: string, spec: string, deadlineDays?: number) =>
    run(username, "POST", "/requests", { customer_id: customer, description, qty, material_spec: spec, ...(deadlineDays ? { deadline: new Date(Date.now() + deadlineDays * 86400000).toISOString() } : {}) }).id as string;
  const attach = (username: string, requestId: string, name: string, content: string) => {
    const link = run(username, "POST", `/requests/${requestId}/uploads`, { file_name: name, content_type: "text/plain", byte_size: new Blob([content]).size });
    const upload = db.uploads.get(String(link.attachment_id));
    if (upload) upload.received = new Blob([content], { type: "text/plain" });
    return run(username, "POST", `/uploads/${link.attachment_id}/complete`).id as string;
  };
  // UC2/UC3 helpers.
  const quote = (requestId: string, material: string, labor: string, final: string, send = true) => {
    const q = run("anan.staff", "POST", `/requests/${requestId}/quotations`, { material_cost: material, labor_cost: labor, final_price: final });
    return send ? run("anan.staff", "POST", `/quotations/${q.id}/send`, { expected_lock_version: q.lock_version }) : q;
  };
  const accept = (username: string, q: Json) => run(username, "POST", `/quotations/${q.id}/decision`, { outcome: "accept", expected_lock_version: q.lock_version });
  // UC4: submit and approve required evidence so exactly one job opens.
  const openJob = (username: string, requestId: string, q: Json) => {
    const terms = (accept(username, q).terms ?? {}) as Json;
    for (const kind of ["po", "deposit"] as const) {
      if (!(kind === "po" ? terms.po_required : terms.deposit_required)) continue;
      const file = attach(username, requestId, kind === "po" ? "company-po.txt" : "deposit-slip.txt", `${kind} evidence for ${requestId}`);
      const evidence = run(username, "POST", `/quotations/${q.id}/evidence`, { idempotency_key: key(), attachment_id: file, kind, ...(kind === "deposit" ? { amount: terms.deposit_amount, paid_at: hoursAgo(2) } : {}) });
      run("pim.admin", "POST", `/evidence/${evidence.id}/review`, { outcome: "approved", expected_version: evidence.version });
    }
    return (run("pim.admin", "GET", `/quotations/${q.id}/fulfillment`).job as Json).id as string;
  };
  // UC5/UC8 helpers.
  const savePlan = (jobId: string, lines: { material_id: string; quantity: string }[]) => {
    const plan = run("anan.staff", "GET", `/jobs/${jobId}/materials`);
    return run("anan.staff", "PUT", `/jobs/${jobId}/materials`, { idempotency_key: key(), expected_version: plan.version, lines });
  };
  const production = (jobId: string) => run("anan.staff", "GET", `/production/jobs/${jobId}`);
  const start = (jobId: string) => { const p = production(jobId); return run("anan.staff", "POST", `/production/jobs/${jobId}/start`, { idempotency_key: key(), expected_version: p.version, expected_plan_version: p.material_plan_version }); };
  const consume = (jobId: string, lines: { material_id: string; quantity: string }[], note: string) => run("anan.staff", "POST", `/production/jobs/${jobId}/usage`, { idempotency_key: key(), expected_version: production(jobId).version, lines, note });
  const log = (jobId: string, minutes: number, note: string) => run("anan.staff", "POST", `/production/jobs/${jobId}/time`, { idempotency_key: key(), expected_version: production(jobId).version, minutes, note });
  const complete = (jobId: string) => run("anan.staff", "POST", `/production/jobs/${jobId}/complete`, { idempotency_key: key(), expected_version: production(jobId).version });
  const fulfillment = (jobId: string) => run("pim.admin", "GET", `/fulfillment/jobs/${jobId}`);

  // R1 UC1 — new pending request with a drawing, awaiting Staff quotation.
  const r1 = request(person, individual, "Custom pulley shaft for a rice mill, keyway both ends", "4", "S45C, induction hardened journals", 21);
  attach(person, r1, "pulley-shaft-drawing.txt", "Shaft Ø48 × 620 mm, keyway 14 × 9 both ends, tolerance h7 on journals.");
  // R2 UC2 — Staff has a saved draft that is not yet sent.
  const r2 = request(companyUser, company, "Hydraulic cylinder end caps, batch of 30", "30", "Aluminium 6061, anodised", 30);
  attach(companyUser, r2, "end-cap-spec.txt", "End cap Ø80, O-ring groove AS568-228, 4 × M8 holes on PCD 64.");
  quote(r2, "8400", "6200", "24000", false);
  // R3 UC3 — quotation sent, awaiting the Customer's decision (one earlier rejection).
  const r3 = request(person, individual, "Replacement gearbox input shaft", "1", "S45C", 14);
  const rejected = quote(r3, "900", "1400", "4200");
  run(person, "POST", `/quotations/${rejected.id}/decision`, { outcome: "reject", expected_lock_version: rejected.lock_version, reason: "Please review the labour estimate" });
  quote(r3, "900", "1200", "3600");
  // R4 UC4 — company quotation over 10,000 THB accepted: PO + 50% deposit outstanding.
  const r4 = request(companyUser, company, "Conveyor roller set with bearing housings", "40", "Steel S45C + bolts", 45);
  accept(companyUser, quote(r4, "16000", "12000", "48000"));
  // R5 UC4 — individual deposit submitted and waiting for manual review.
  const r5 = request(person, individual, "Brass bushings for water pump", "12", "Brass C3604");
  const q5 = quote(r5, "1500", "1300", "5200"); const terms5 = accept(person, q5).terms as Json;
  const slip = attach(person, r5, "deposit-transfer-slip.txt", "Bank transfer slip (sample)");
  run(person, "POST", `/quotations/${q5.id}/evidence`, { idempotency_key: key(), attachment_id: slip, kind: "deposit", amount: terms5.deposit_amount, paid_at: hoursAgo(1) });
  // R6 UC5 — company job queued; plan saved with a stainless shortage.
  const r6 = request(companyUser, company, "Stainless agitator shafts", "6", "Stainless 304 shaft Ø30, steel couplings", 20);
  const j6 = openJob(companyUser, r6, quote(r6, "3000", "2800", "9800"));
  savePlan(j6, [{ material_id: stainless, quantity: "30" }, { material_id: steel, quantity: "20" }]);
  // R7 UC5 → UC8 — queued job with a fully reserved plan, ready to start.
  const r7 = request(person, individual, "Aluminium motor mounting plates", "8", "Aluminium 6061 plate 10 mm");
  const j7 = openJob(person, r7, quote(r7, "2200", "1800", "6800"));
  savePlan(j7, [{ material_id: aluminium, quantity: "12" }, { material_id: bolts, quantity: "40" }]);
  // R8 UC8 — company job in progress with partial usage and time logged.
  const r8 = request(companyUser, company, "Spindle adaptor flanges", "16", "Steel S45C", 10);
  const j8 = openJob(companyUser, r8, quote(r8, "3400", "4100", "12500"));
  savePlan(j8, [{ material_id: steel, quantity: "25" }, { material_id: bolts, quantity: "64" }]);
  start(j8); consume(j8, [{ material_id: steel, quantity: "10.5" }, { material_id: bolts, quantity: "32" }], "First 8 flanges turned"); log(j8, 210, "Rough and finish turning, first half");
  // R9 UC8 → UC9 — completed production, waiting for Admin credit terms and invoice.
  const r9 = request(person, individual, "Brass valve stems", "20", "Brass C3604 rod Ø20");
  const j9 = openJob(person, r9, quote(r9, "1800", "2000", "6400"));
  savePlan(j9, [{ material_id: brass, quantity: "3" }]);
  start(j9); consume(j9, [{ material_id: brass, quantity: "2.75" }], "All stems turned"); log(j9, 150, "Turning and threading"); complete(j9);
  run("pim.admin", "PUT", `/production/jobs/${j9}/labor-cost`, { idempotency_key: key(), expected_version: production(j9).version, amount: "1950.00" });
  // R10 UC9 — invoiced and shipped; Customer has a bank payment waiting for review.
  const r10 = request(companyUser, company, "Machined guide rails, second batch", "10", "Steel S45C", 7);
  const j10 = openJob(companyUser, r10, quote(r10, "2600", "2300", "8200"));
  savePlan(j10, [{ material_id: steel, quantity: "6" }]);
  start(j10); consume(j10, [{ material_id: steel, quantity: "6" }], "All rails machined"); log(j10, 300, "Milling and grinding"); complete(j10);
  run("pim.admin", "PUT", `/fulfillment/jobs/${j10}/credit-terms`, { idempotency_key: key(), expected_version: fulfillment(j10).version, credit_days: 30 });
  run("anan.staff", "POST", `/fulfillment/jobs/${j10}/invoice`, { idempotency_key: key(), expected_version: fulfillment(j10).version });
  run("anan.staff", "POST", `/fulfillment/jobs/${j10}/deliveries`, { idempotency_key: key(), expected_version: fulfillment(j10).version, method: "third_party", receiver_name: "Nida Wongsuwan" });
  const proof = run(companyUser, "POST", `/fulfillment/jobs/${j10}/evidence/uploads`, { file_name: "transfer-proof.txt", content_type: "text/plain", byte_size: 22 });
  const proofUpload = db.uploads.get(String(proof.attachment_id)); if (proofUpload) proofUpload.received = new Blob(["Bank transfer (sample)"], { type: "text/plain" });
  run(companyUser, "POST", `/customer-evidence/${proof.attachment_id}/complete`);
  run(companyUser, "POST", `/fulfillment/jobs/${j10}/payments/bank`, { idempotency_key: key(), expected_version: fulfillment(j10).version, amount: "2000.00", paid_at: hoursAgo(3), evidence_id: proof.attachment_id });

  // UC6 suppliers and orders; UC7 receiving states.
  const supplier = (name: string, email: string, phone: string) => run("pim.admin", "POST", "/suppliers", { name, email, phone });
  const siamSteel = supplier("Siam Steel Supply", "sales@siamsteel.example", "+6627001234");
  const metals = supplier("Bangkok Metals Trading", "order@bkkmetals.example", "021234567");
  const old = supplier("Old Hardware Shop", "", "");
  run("pim.admin", "PUT", `/suppliers/${old.id}`, { name: old.name, email: "", phone: "", is_active: false, expected_version: old.version });
  const order = (supplierId: unknown, jobIds: string[], lines: { material_id: string; quantity: string; unit_cost: string }[], expectedDays?: number) =>
    run("pim.admin", "POST", "/material-orders", { idempotency_key: key(), supplier_id: supplierId, job_ids: jobIds, ...(expectedDays ? { expected_at: new Date(Date.now() + expectedDays * 86400000).toISOString() } : {}), lines });
  const act = (o: Json, action: string, reason = "") => run("pim.admin", "POST", `/material-orders/${o.id}/actions`, { idempotency_key: key(), expected_version: o.version, action, ...(reason ? { reason } : {}) });
  // O1 pending supplier response for the R6 stainless shortage.
  order(metals.id, [j6], [{ material_id: stainless, quantity: "30", unit_cost: "410" }], 5);
  // O2 accepted, partially received with a damaged line awaiting a claim.
  const o2 = act(order(siamSteel.id, [], [{ material_id: steel, quantity: "50", unit_cost: "41.75" }, { material_id: bolts, quantity: "200", unit_cost: "3.05" }], 3), "accept", "Confirmed by phone");
  run("anan.staff", "POST", `/receiving/orders/${o2.id}/receipts`, { idempotency_key: key(), expected_version: o2.version, note: "First truck — two bars bent", lines: [{ material_id: steel, good: "40", damaged: "5" }] });
  // O3 fully received with credit terms; supplier payment pending.
  const o3 = act(order(metals.id, [j7], [{ material_id: aluminium, quantity: "20", unit_cost: "115.5" }]), "accept");
  const received = run("anan.staff", "POST", `/receiving/orders/${o3.id}/receipts`, { idempotency_key: key(), expected_version: o3.version, note: "Complete delivery checked", lines: [{ material_id: aluminium, good: "20", damaged: "0" }] });
  run("pim.admin", "POST", `/receiving/orders/${o3.id}/credit-terms`, { idempotency_key: key(), expected_version: received.version, credit_days: 30 });
}

// A fresh, seeded in-memory backend. Reloading the page discards it.
export function createLatheMockBackend() {
  return createMockBackend([...salesRoutes, ...stockRoutes, ...jobRoutes], (db, run) => { seedAccounts(db); seedScenario(db, run); db.notifications.forEach((n, i) => { if (i % 3 === 2) n.read_at = n.created_at; }); });
}
