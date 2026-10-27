import test from "node:test";
import assert from "node:assert/strict";
import { createLatheMockBackend, MOCK_LOGINS, MOCK_PASSWORD } from "../../app/mock-seed.ts";
import { fmt2, fmt6, lineSatang, micro, minimumPrice, satang, weightedAverage } from "../../app/mock-decimal.ts";

function session(backend, username) {
  const login = backend.dispatch("POST", "/auth/login", null, { username, password: MOCK_PASSWORD });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const token = login.body.access_token;
  return (method, path, body) => backend.dispatch(method, path, token, body);
}
const key = () => crypto.randomUUID();

test("mock decimals follow backend rounding without floats", () => {
  assert.equal(fmt2(lineSatang(micro("25"), micro("0.335"))), "8.38");
  assert.equal(fmt2(lineSatang(micro("3"), micro("0.335")) * BigInt(2)), "2.02");
  assert.equal(fmt2(minimumPrice(satang("100.01"), satang("0"))), "160.02");
  assert.equal(fmt6(weightedAverage(micro("10"), micro("2"), micro("10"), micro("3"))), "2.500000");
  assert.throws(() => micro("1e2")); assert.throws(() => micro("-1")); assert.throws(() => satang("1.001"));
});

test("seeded scenario covers every workflow stage and every demo login works", () => {
  const backend = createLatheMockBackend();
  for (const login of MOCK_LOGINS) assert.equal(backend.dispatch("POST", "/auth/login", null, { username: login.username, password: login.password }).status, 200);
  const staff = session(backend, "anan.staff");
  const statuses = staff("GET", "/requests?limit=100").body.items.map((r) => r.status);
  assert.ok(statuses.includes("pending") && statuses.includes("ongoing"));
  const jobs = staff("GET", "/production/jobs?limit=100").body.items.map((j) => j.status).sort();
  assert.deepEqual([...new Set(jobs)], ["completed", "in_progress", "queued"]);
  const admin = session(backend, "pim.admin");
  const orders = admin("GET", "/material-orders").body.items.map((o) => `${o.status}/${o.supplier_response}`).sort();
  assert.deepEqual(orders, ["ordered/pending", "partially_received/accepted", "received/accepted"]);
});

test("role gates, scope and error envelope mirror the backend", () => {
  const backend = createLatheMockBackend();
  const staff = session(backend, "anan.staff"); const somchai = session(backend, "somchai"); const nida = session(backend, "nida.company");
  assert.equal(backend.dispatch("GET", "/requests", null).status, 401);
  const forbidden = staff("GET", "/suppliers");
  assert.equal(forbidden.status, 403); assert.equal(forbidden.body.error.code, "forbidden"); assert.ok(forbidden.body.error.request_id);
  assert.equal(somchai("GET", "/materials").status, 403);
  const companyRequest = nida("GET", "/requests").body.items[0];
  assert.equal(somchai("GET", `/requests/${companyRequest.id}`).status, 404, "other customers' records look missing");
  assert.equal(staff("POST", "/quotations/estimate", { material_cost: "1.00", labor_cost: "1.00", extra: 1 }).status, 400, "unknown fields rejected");
  assert.equal(staff("GET", "/not-a-route").status, 404);
});

test("Customer never sees drafts or internal costs; Worker never sees supplier finance or payments", () => {
  const backend = createLatheMockBackend();
  const nida = session(backend, "nida.company"); const staff = session(backend, "anan.staff");
  for (const request of nida("GET", "/requests?limit=100").body.items) {
    for (const q of nida("GET", `/requests/${request.id}/quotations`).body.items) { assert.notEqual(q.status, "draft"); assert.equal(q.internal_costs, undefined); }
  }
  const material = staff("GET", "/materials").body.items[0]; assert.equal(material.avg_cost, undefined);
  const order = staff("GET", "/receiving/orders").body.items[0]; assert.equal(staff("GET", `/receiving/orders/${order.order_id}`).body.finance, undefined);
  for (const job of staff("GET", "/fulfillment/jobs").body.items) assert.equal(job.payments, undefined);
});

test("idempotent retry replays the original result and rejects a changed payload", () => {
  const backend = createLatheMockBackend(); const admin = session(backend, "pim.admin");
  const material = admin("GET", "/materials?search=Hex").body.items[0];
  const body = { idempotency_key: key(), expected_version: material.version, mode: "addition", quantity: "10", unit_cost: "3.2", reason: "Count" };
  const first = admin("POST", `/materials/${material.id}/stock`, body); const replay = admin("POST", `/materials/${material.id}/stock`, body);
  assert.equal(first.status, 200); assert.deepEqual(replay.body, first.body);
  assert.equal(admin("GET", "/materials?search=Hex").body.items[0].qty_on_hand, first.body.qty_on_hand, "replay does not add twice");
  assert.equal(admin("POST", `/materials/${material.id}/stock`, { ...body, quantity: "11" }).status, 409);
  assert.equal(admin("POST", `/materials/${material.id}/stock`, { ...body, idempotency_key: key() }).status, 409, "stale expected_version");
});

test("UC4 approval opens exactly one job; UC5 plan reserves partially; UC8 consumes own reservation first", () => {
  const backend = createLatheMockBackend();
  const somchai = session(backend, "somchai"); const staff = session(backend, "anan.staff"); const admin = session(backend, "pim.admin");
  const request = somchai("GET", "/requests").body.items.find((r) => r.description.startsWith("Brass bushings"));
  const quote = somchai("GET", `/requests/${request.id}/quotations`).body.items[0];
  const state = staff("GET", `/quotations/${quote.id}/fulfillment`).body;
  assert.equal(state.job, null); assert.equal(state.evidence[0].status, "pending");
  const reviewed = staff("POST", `/evidence/${state.evidence[0].id}/review`, { outcome: "approved", expected_version: state.evidence[0].version }).body;
  assert.equal(reviewed.job.status, "queued"); assert.equal(reviewed.job.balance, fmt2(satang("5200.00") - satang(state.terms.deposit_amount)));
  assert.equal(staff("POST", `/evidence/${state.evidence[0].id}/review`, { outcome: "approved", expected_version: 2 }).status, 409);
  const job = reviewed.job.id; const brass = admin("GET", "/materials?search=Brass").body.items[0];
  const plan = staff("PUT", `/jobs/${job}/materials`, { idempotency_key: key(), expected_version: 0, lines: [{ material_id: brass.id, quantity: "999" }] }).body;
  assert.equal(plan.ready, false); assert.equal(plan.lines[0].reserved, brass.qty_available); assert.notEqual(plan.lines[0].shortage, "0.000000");
  assert.equal(admin("PUT", `/jobs/${job}/materials`, { idempotency_key: key(), expected_version: 1, lines: [] }).status, 403, "Admin plans are read-only");
  assert.equal(staff("POST", `/production/jobs/${job}/start`, { idempotency_key: key(), expected_version: 0, expected_plan_version: 1 }).status, 409, "shortage blocks start");
  const ready = staff("PUT", `/jobs/${job}/materials`, { idempotency_key: key(), expected_version: 1, lines: [{ material_id: brass.id, quantity: "1" }] }).body;
  assert.equal(ready.ready, true);
  const started = staff("POST", `/production/jobs/${job}/start`, { idempotency_key: key(), expected_version: 0, expected_plan_version: ready.version }).body;
  const used = staff("POST", `/production/jobs/${job}/usage`, { idempotency_key: key(), expected_version: started.version, lines: [{ material_id: brass.id, quantity: "1.5" }], note: "" }).body;
  assert.equal(used.usage[0].reservation_used, "1.000000"); assert.equal(used.usage[0].unit_cost, undefined, "Worker view hides valuation");
  const completed = staff("POST", `/production/jobs/${job}/complete`, { idempotency_key: key(), expected_version: used.version }).body;
  assert.equal(completed.status, "completed");
  assert.ok(admin("GET", `/production/jobs/${job}`).body.finance.material_cost !== "0.00");
});

test("UC7 receipts reject excess, create claims and allow one settlement after full receipt", () => {
  const backend = createLatheMockBackend(); const staff = session(backend, "anan.staff"); const admin = session(backend, "pim.admin");
  const partial = staff("GET", "/receiving/orders").body.items.find((o) => o.status === "partially_received");
  let state = staff("GET", `/receiving/orders/${partial.order_id}`).body;
  const steel = state.lines.find((l) => l.damaged !== "0.000000");
  assert.equal(staff("POST", `/receiving/orders/${partial.order_id}/receipts`, { idempotency_key: key(), expected_version: state.version, note: "", lines: [{ material_id: steel.material_id, good: "6", damaged: "0" }] }).status, 400, "excess over ordered");
  const claim = state.claims[0]; assert.equal(claim.status, "pending_claim");
  state = staff("POST", `/receiving/orders/${partial.order_id}/claims/${claim.id}/submit`, { idempotency_key: key(), expected_version: state.version, note: "Supplier will replace" }).body;
  const bolts = state.lines.find((l) => l.material_id !== steel.material_id);
  state = staff("POST", `/receiving/orders/${partial.order_id}/receipts`, { idempotency_key: key(), expected_version: state.version, note: "", lines: [{ material_id: steel.material_id, good: "5", damaged: "0", replacement_claim_id: claim.id }, { material_id: steel.material_id, good: "5", damaged: "0" }, { material_id: bolts.material_id, good: "200", damaged: "0" }] }).body;
  assert.equal(state.status, "received"); assert.equal(state.claims[0].status, "resolved");
  assert.equal(staff("POST", `/receiving/orders/${partial.order_id}/credit-terms`, { idempotency_key: key(), expected_version: state.version, credit_days: 0 }).status, 403);
  state = admin("POST", `/receiving/orders/${partial.order_id}/credit-terms`, { idempotency_key: key(), expected_version: state.version, credit_days: 0 }).body;
  assert.equal(state.finance.payment_status, "pending");
  assert.equal(admin("POST", `/receiving/orders/${partial.order_id}/settlement`, { idempotency_key: key(), expected_version: state.version, method: "bank", paid_at: new Date().toISOString() }).status, 400, "bank needs evidence");
  state = admin("POST", `/receiving/orders/${partial.order_id}/settlement`, { idempotency_key: key(), expected_version: state.version, method: "cash", paid_at: new Date().toISOString() }).body;
  assert.equal(state.finance.payment_status, "paid"); assert.equal(state.finance.settlement.amount, state.finance.total_amount);
});

test("UC9 return reopens the same job; installments close the request only when paid and accepted", () => {
  const backend = createLatheMockBackend(); const nida = session(backend, "nida.company"); const admin = session(backend, "pim.admin"); const staff = session(backend, "anan.staff");
  let state = nida("GET", "/fulfillment/jobs").body.items.find((j) => j.deliveries.length);
  const job = state.job_id; const pending = state.payments.find((p) => p.status === "pending");
  state = admin("POST", `/fulfillment/jobs/${job}/payments/review`, { idempotency_key: key(), expected_version: state.version, payment_id: pending.id, outcome: "approved" }).body;
  assert.equal(state.invoice.status, "partial");
  state = nida("POST", `/fulfillment/jobs/${job}/inspection`, { idempotency_key: key(), expected_version: state.version, outcome: "return", reason: "Rail ends out of tolerance" }).body;
  assert.equal(state.job_status, "in_progress"); assert.equal(state.cycle, 2); assert.equal(state.rework_history.length, 1);
  const production = staff("GET", `/production/jobs/${job}`).body;
  staff("POST", `/production/jobs/${job}/complete`, { idempotency_key: key(), expected_version: production.version });
  state = staff("POST", `/fulfillment/jobs/${job}/deliveries`, { idempotency_key: key(), expected_version: nida("GET", `/fulfillment/jobs/${job}`).body.version, method: "self", receiver_name: "Nida" }).body;
  state = nida("POST", `/fulfillment/jobs/${job}/inspection`, { idempotency_key: key(), expected_version: state.version, outcome: "accept" }).body;
  assert.equal(state.request_status, "ongoing", "accepted but not fully paid");
  assert.equal(admin("POST", `/fulfillment/jobs/${job}/payments/cash`, { idempotency_key: key(), expected_version: state.version, amount: "999999.00", paid_at: new Date().toISOString() }).status, 409, "no overpayment");
  state = admin("POST", `/fulfillment/jobs/${job}/payments/cash`, { idempotency_key: key(), expected_version: state.version, amount: state.invoice.balance, paid_at: new Date().toISOString() }).body;
  assert.equal(state.invoice.status, "paid"); assert.equal(state.request_status, "completed");
});

test("signed upload protocol: storage PUT then completion; failed completion needs a new intent", async () => {
  const backend = createLatheMockBackend(); const login = backend.dispatch("POST", "/auth/login", null, { username: "somchai", password: MOCK_PASSWORD }).body;
  const request = backend.dispatch("GET", "/requests", login.access_token).body.items[0];
  const headers = { Authorization: `Bearer ${login.access_token}`, "Content-Type": "application/json" };
  backend.latencyMs = 0;
  const intent = await (await backend.transport.fetch(`${backend.base}/requests/${request.id}/uploads`, { method: "POST", headers, body: JSON.stringify({ file_name: "a.txt", content_type: "text/plain", byte_size: 5 }) })).json();
  assert.equal((await backend.transport.fetch(intent.url, { method: "PUT", body: new Blob(["wrong size"], { type: "text/plain" }) })).status, 200);
  const failed = await backend.transport.fetch(`${backend.base}/uploads/${intent.attachment_id}/complete`, { method: "POST", headers });
  assert.equal(failed.status, 400);
  assert.equal((await backend.transport.fetch(`${backend.base}/uploads/${intent.attachment_id}/complete`, { method: "POST", headers })).status, 409, "no reuse of a finished intent");
});

test("a simulated lost response still commits the write, so the UI must reload or retry identically", async () => {
  const backend = createLatheMockBackend(); backend.latencyMs = 0;
  const login = backend.dispatch("POST", "/auth/login", null, { username: "pim.admin", password: MOCK_PASSWORD }).body;
  const headers = { Authorization: `Bearer ${login.access_token}`, "Content-Type": "application/json" };
  const unread = backend.dispatch("GET", "/notifications", login.access_token).body.items.find((n) => !n.read_at);
  backend.loseNextResponse = true;
  await assert.rejects(backend.transport.fetch(`${backend.base}/notifications/${unread.id}/read`, { method: "PATCH", headers }), TypeError);
  assert.equal(backend.loseNextResponse, false);
  assert.ok(backend.dispatch("GET", "/notifications", login.access_token).body.items.find((n) => n.id === unread.id).read_at);
});
