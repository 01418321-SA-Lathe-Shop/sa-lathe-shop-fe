"use client";

import { useState, type ReactNode } from "react";
import { BackendApi, displayMoney, type Account } from "./backend-api";
import { useCommand, useResource, useRetryableWrite } from "./backend-hooks";
import { availableActions, inspectPayload, paymentPayload, reviewPayload, shipPayload, type FulfillmentJob, type Payment } from "./backend-delivery-domain";
import { creditDays } from "./backend-receiving-domain";
import { RequestLabel } from "./backend-production";
import { Feedback, Field, Paging, PrivateUpload, RetryNote, Status, text, type ReadyFile } from "./backend-ui";
import { formatBangkok } from "./demo-display";

const short = (id: string) => id.slice(0, 8);
const command = (state: FulfillmentJob) => ({ idempotency_key: crypto.randomUUID(), expected_version: state.version });

// UC9: Admin sets invoice terms and reviews/records payments; Staff and Admin
// issue the invoice and ship; scoped Customers inspect and submit bank proof.
// The request closes only when the latest delivery is accepted and fully paid.
export function LiveDelivery({ api, account }: { api: BackendApi; account: Account }) {
  const [offset, setOffset] = useState(0); const [selected, setSelected] = useState("");
  const jobs = useResource<{ items: FulfillmentJob[] | null }>(api, `/fulfillment/jobs?limit=20&offset=${offset}`);
  const customer = account.role === "customer";
  return <section>
    <div className="workflow-toolbar"><h2>{customer ? "Your jobs, deliveries and invoices" : "Delivery and invoices"}</h2><button onClick={jobs.reload}>Refresh jobs</button></div>
    <p className="workflow-note">One invoice per job for the balance after the approved deposit (no VAT, no shipping fee). {customer ? "Inspect each delivery: accept it, or return it with a reason for free rework of the same job. Submit bank transfer proof for any amount up to the remaining balance; Admin reviews every proof." : "A job closes only when the latest delivery is accepted and the invoice is fully paid, in either order."}</p>
    <Feedback busy={jobs.loading} error={jobs.error} />
    <div className="record-layout"><div className="record-list" aria-label="Fulfillment job list">
      {jobs.data && !jobs.data.items?.length && <p>No jobs yet.</p>}
      {jobs.data?.items?.map((job) => { const last = job.deliveries?.at(-1);
        return <button key={job.job_id} className={`record-list-item ${selected === job.job_id ? "selected" : ""}`} onClick={() => setSelected(job.job_id)}>
          <span className="record-code">Job {short(job.job_id)} · request {short(job.request_id)}</span><strong>{job.invoice ? `${job.invoice.number} · balance ${displayMoney(job.invoice.balance)}` : "No invoice yet"}</strong>
          <span><Status value={job.job_status} /> {job.invoice && <Status value={job.invoice.status} />} {last && <Status value={last.status} />} {job.request_status === "completed" && <Status value="completed" />}</span>
        </button>; })}
      {jobs.data && <Paging offset={offset} count={jobs.data.items?.length ?? 0} busy={jobs.loading} setOffset={setOffset} />}
    </div>
    {selected ? <DeliveryDetail key={selected} api={api} account={account} id={selected} onChanged={jobs.reload} /> : <section className="record-detail"><h2>Select a job</h2><p>Open a job to see its invoice, deliveries{customer || account.role === "admin" ? ", payments" : ""} and rework history.</p></section>}
    </div>
  </section>;
}

function DeliveryDetail({ api, account, id, onChanged }: { api: BackendApi; account: Account; id: string; onChanged: () => void }) {
  const resource = useResource<FulfillmentJob>(api, `/fulfillment/jobs/${id}`);
  const [notice, setNotice] = useState("");
  // Forms render only from settled data so a landing reload cannot clear input.
  const state = resource.data; const actions = state && !resource.loading ? availableActions(state, account.role) : [];
  function saved(message: string) { setNotice(message); resource.reload(); onChanged(); }
  return <section className="record-detail"><button onClick={() => { setNotice(""); resource.reload(); }}>Reload job</button><Feedback busy={resource.loading} error={resource.error} message={notice} />
    {state && <>
      <h2>Job {short(state.job_id)} <Status value={state.job_status} /></h2><RequestLabel api={api} id={state.request_id} /><p className="record-id">{state.job_id} · fulfillment version {String(state.version)}</p>
      {state.request_status === "completed" && <p className="workflow-success">Closed: the latest delivery was accepted and the invoice is fully paid.</p>}
      <dl className="detail-grid">
        <div><dt>Request status</dt><dd><Status value={state.request_status} /></dd></div><div><dt>Production cycle</dt><dd>{state.cycle}{state.cycle > 1 ? " (free rework)" : ""}</dd></div>
        <div><dt>Approved deposit</dt><dd>{displayMoney(state.deposit)}</dd></div><div><dt>Balance to invoice</dt><dd>{displayMoney(state.opening_balance)}</dd></div>
        <div><dt>Invoice credit days</dt><dd>{state.credit_days ?? "Not set"}</dd></div>
      </dl>
      {state.invoice && <section className="live-section" aria-label="Invoice"><h3>Invoice {state.invoice.number} <Status value={state.invoice.status} /></h3>
        <div className="balance-strip"><span>Amount <strong>{displayMoney(state.invoice.amount)}</strong></span><span>Paid <strong>{displayMoney(state.invoice.paid)}</strong></span><span>Balance <strong>{displayMoney(state.invoice.balance)}</strong></span></div>
        <p>Issued {formatBangkok(state.invoice.issued_at)} · due {formatBangkok(state.invoice.due_at)} ({state.invoice.credit_days} day(s)). Amount, terms and dates are immutable. No VAT.</p></section>}
      {actions.includes("terms") && <TermsForm api={api} state={state} onSaved={() => saved("Invoice credit days set.")} />}
      {actions.includes("invoice") && <IssueInvoice api={api} state={state} onSaved={() => saved("Invoice issued.")} />}
      {actions.includes("ship") && <ShipForm key={`ship:${state.version}`} api={api} state={state} onSaved={() => saved("Shipment recorded. The customer is notified to inspect it.")} />}
      {actions.includes("inspect") && <InspectForm key={`inspect:${state.version}`} api={api} state={state} onSaved={(outcome) => saved(outcome === "accept" ? "Delivery accepted. Thank you." : "Delivery returned. The same job reopens for free rework.")} />}
      {actions.includes("bank") && <PaymentForm key={`bank:${state.version}`} api={api} state={state} method="bank" onSaved={() => saved("Payment proof submitted. It counts only after Admin approval.")} />}
      {actions.includes("cash") && <PaymentForm key={`cash:${state.version}`} api={api} state={state} method="cash" onSaved={() => saved("Cash receipt recorded and allocated.")} />}
      <h3>Deliveries</h3>
      {!state.deliveries?.length ? <p>Nothing shipped yet.</p> : <ol className="payment-history">{state.deliveries.map((d) => <li key={d.id}><strong>Cycle {d.cycle} · {d.method === "self" ? "Self delivery" : "Third-party carrier"} · to {d.receiver_name}</strong> <Status value={d.status} /><br />Shipped {formatBangkok(d.shipped_at)}{d.decided_at ? ` · decided ${formatBangkok(d.decided_at)}` : ""}{d.reason ? ` · ${d.reason}` : ""}</li>)}</ol>}
      {state.payments !== undefined && <PaymentList api={api} account={account} state={state} canReview={actions.includes("review")} onSaved={saved} />}
      {Boolean(state.rework_history?.length) && <><h3>Rework history</h3><ol className="payment-history">{state.rework_history?.map((r) => <li key={r.cycle}><strong>Cycle {r.cycle}</strong> · completed {formatBangkok(r.completed_at)} · returned and reopened {formatBangkok(r.reopened_at)}</li>)}</ol></>}
      <h3>Events</h3>
      <ol className="payment-history">{state.events?.map((e) => <li key={e.id}><strong>{e.action}</strong> · v{String(e.version)} · {formatBangkok(e.created_at)}</li>)}</ol>
    </>}
  </section>;
}

function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="live-editor"><h3>{title}</h3>{children}</section>; }
function Retry({ write, label, onDiscard }: { write: ReturnType<typeof useRetryableWrite>; label: string; onDiscard: () => void }) {
  return <><Feedback error={write.error} />{write.uncertain && <RetryNote busy={write.busy} label={label} onRetry={write.retry} onDiscard={() => { write.discard(); onDiscard(); }} />}</>;
}

function TermsForm({ api, state, onSaved }: { api: BackendApi; state: FulfillmentJob; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved);
  return <Section title="Set invoice credit days (Admin)">
    <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/credit-terms`, "PUT", () => { const days = creditDays(text(data, "days")); return window.confirm(`Set ${days} credit day(s)? Terms can be set only once.`) ? { ...command(state), credit_days: days } : null; }, ""); }}>
      <fieldset className="live-fields" disabled={write.frozen}><Field label="Credit days (0 = due on issue)"><input name="days" required inputMode="numeric" /></Field><p>No default period. The due time is the invoice issue time plus these days.</p><button type="submit">Set credit days</button></fieldset>
    </form><Retry write={write} label="Retry identical terms" onDiscard={onSaved} />
  </Section>;
}

function IssueInvoice({ api, state, onSaved }: { api: BackendApi; state: FulfillmentJob; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved);
  return <Section title="Issue invoice">
    <p>The invoice amount is fixed at the job balance {displayMoney(state.opening_balance)}, due {state.credit_days} day(s) after issue. It cannot be edited afterwards.</p>
    <button className="button-primary" disabled={write.frozen} onClick={() => write.submit(`/fulfillment/jobs/${state.job_id}/invoice`, "POST", () => window.confirm(`Issue the invoice for ${displayMoney(state.opening_balance)}?`) ? command(state) : null, "")}>Issue invoice</button>
    <Retry write={write} label="Retry identical invoice" onDiscard={onSaved} />
  </Section>;
}

function ShipForm({ api, state, onSaved }: { api: BackendApi; state: FulfillmentJob; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved);
  return <Section title={state.deliveries?.length ? "Ship the reworked job" : "Record shipment"}>
    <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/deliveries`, "POST", () => shipPayload(command(state), text(data, "method"), text(data, "receiver")), ""); }}>
      <fieldset className="live-fields" disabled={write.frozen}>
        <Field label="Delivery method"><select name="method" defaultValue="self"><option value="self">Self delivery / pickup</option><option value="third_party">Third-party carrier</option></select></Field>
        <Field label="Receiver name"><input name="receiver" required maxLength={200} /></Field>
        <p>This records dispatch of the whole job, not customer acceptance. No carrier tracking or shipping fee.</p><button className="button-primary" type="submit">Record shipment</button>
      </fieldset>
    </form><Retry write={write} label="Retry identical shipment" onDiscard={onSaved} />
  </Section>;
}

function InspectForm({ api, state, onSaved }: { api: BackendApi; state: FulfillmentJob; onSaved: (outcome: "accept" | "return") => void }) {
  const [outcome, setOutcome] = useState<"accept" | "return">("accept"); const write = useRetryableWrite(api, () => onSaved(outcome));
  return <Section title="Inspect the delivery">
    <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/inspection`, "POST", () => inspectPayload(command(state), outcome, text(data, "reason")), ""); }}>
      <fieldset className="live-fields" disabled={write.frozen}>
        <Field label="Inspection result"><select value={outcome} onChange={(event) => setOutcome(event.target.value as "accept" | "return")}><option value="accept">Accept — the work is correct</option><option value="return">Return for free rework</option></select></Field>
        {outcome === "return" && <Field label="What needs rework (required)"><textarea name="reason" required maxLength={2000} /></Field>}
        <label className="live-review-confirm"><input type="checkbox" required /> {outcome === "accept" ? "I inspected the delivery. Acceptance is final." : "Return this delivery. The same job reopens for rework at no extra charge; the invoice stays unchanged."}</label>
        <button className={outcome === "accept" ? "button-primary" : "button-danger"} type="submit">{outcome === "accept" ? "Accept delivery" : "Return delivery"}</button>
      </fieldset>
    </form><Retry write={write} label="Retry identical inspection" onDiscard={() => onSaved(outcome)} />
  </Section>;
}

function PaymentForm({ api, state, method, onSaved }: { api: BackendApi; state: FulfillmentJob; method: "bank" | "cash"; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved); const [proof, setProof] = useState<ReadyFile | null>(null);
  const balance = state.invoice?.balance ?? "0.00";
  return <Section title={method === "bank" ? "Submit bank transfer proof" : "Record cash receipt (Admin)"}>
    <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/payments/${method}`, "POST", () => paymentPayload(command(state), { amount: text(data, "amount"), paidAt: text(data, "paid_at"), evidenceId: proof?.id, balance, requireEvidence: method === "bank" }, Date.now()), ""); }}>
      <fieldset className="live-fields" disabled={write.frozen}>
        <Field label={`Amount (THB, up to ${displayMoney(balance)})`}><input name="amount" required inputMode="decimal" /></Field>
        <Field label="Paid at (Asia/Bangkok)"><input name="paid_at" type="datetime-local" required /></Field>
        <PrivateUpload api={api} label={method === "bank" ? "Transfer proof (required, single use)" : "Receipt or photo (optional)"} intentPath={`/fulfillment/jobs/${state.job_id}/evidence/uploads`} completePath={(fileId) => `/customer-evidence/${fileId}/complete`} ready={proof} onReady={setProof} />
        <p>{method === "bank" ? "Installments are allowed; no overpayment, refund or discount. A pending proof does not reduce the balance until Admin approves it." : "Cash is recorded and allocated immediately. It cannot exceed the remaining balance."}</p>
        <button className="button-primary" type="submit">{method === "bank" ? "Submit payment proof" : "Record cash receipt"}</button>
      </fieldset>
    </form><Retry write={write} label="Retry identical payment" onDiscard={onSaved} />
  </Section>;
}

function PaymentList({ api, account, state, canReview, onSaved }: { api: BackendApi; account: Account; state: FulfillmentJob; canReview: boolean; onSaved: (message: string) => void }) {
  const download = useCommand();
  return <><h3>Payments</h3>
    {!state.payments?.length ? <p>No payments submitted.</p> : state.payments.map((payment) => <article className="live-evidence-record" key={`${payment.id}:${payment.status}`}>
      <h4>{payment.method === "bank" ? "Bank transfer" : "Cash"} · {displayMoney(payment.amount)} <Status value={payment.status} /></h4>
      <p>Paid {formatBangkok(payment.paid_at)}{payment.reason ? ` · Rejected: ${payment.reason}` : ""}{payment.submitted_by === account.id ? " · submitted by you" : ""}</p>
      {payment.evidence_id && (account.role === "admin" || payment.submitted_by === account.id) && <button disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/customer-evidence/${payment.evidence_id}/download`, undefined, signal), "Private proof download requested.")}>Download proof</button>}
      {canReview && payment.status === "pending" && <ReviewForm key={state.version} api={api} state={state} payment={payment} onSaved={onSaved} />}
    </article>)}
    <Feedback {...download} />
  </>;
}

function ReviewForm({ api, state, payment, onSaved }: { api: BackendApi; state: FulfillmentJob; payment: Payment; onSaved: (message: string) => void }) {
  const [outcome, setOutcome] = useState<"approved" | "rejected">("approved"); const write = useRetryableWrite(api, () => onSaved(`Payment ${outcome}.`));
  return <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/payments/review`, "POST", () => reviewPayload(command(state), payment.id, outcome, text(data, "reason")), ""); }}>
    <fieldset className="live-fields" disabled={write.frozen}>
      <Field label="Review outcome"><select value={outcome} onChange={(event) => setOutcome(event.target.value as "approved" | "rejected")}><option value="approved">Approve and allocate</option><option value="rejected">Reject proof</option></select></Field>
      {outcome === "rejected" && <Field label="Rejection reason (shown to the customer)"><textarea name="reason" required maxLength={2000} /></Field>}
      <label className="live-review-confirm"><input type="checkbox" required /> I checked the private proof against the bank statement.</label>
      <button className="button-primary" type="submit">Confirm payment review</button>
    </fieldset><Retry write={write} label="Retry identical review" onDiscard={() => onSaved("Reloaded.")} />
  </form>;
}
