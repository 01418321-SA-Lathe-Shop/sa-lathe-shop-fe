"use client";

import { useState } from "react";
import { BackendApi, displayMoney, type Account } from "./backend-api";
import { useCommand, useResource } from "./backend-hooks";
import { inventoryDisplay } from "./backend-inventory-domain";
import { claimNote, claimOwed, creditDays, receiptPayload, settlementPayload, type Claim, type DraftReceipt, type ReceivingState, type ReceivingSummary } from "./backend-receiving-domain";
import { Feedback, Field, Paging, PrivateUpload, RetryNote, Status, text, type ReadyFile } from "./backend-ui";
import { formatBangkok } from "./demo-display";

const name = (state: ReceivingState, materialId: string) => state.lines?.find((line) => line.material_id === materialId);

// UC7: Admin and Staff receive accepted orders and manage replacement claims.
// Supplier prices, credit terms, settlement and proof are Admin-only.
export function LiveReceiving({ api, account }: { api: BackendApi; account: Account }) {
  const [offset, setOffset] = useState(0); const [selected, setSelected] = useState("");
  const orders = useResource<{ items: ReceivingSummary[] | null }>(api, `/receiving/orders?limit=20&offset=${offset}`);
  return <section>
    <div className="workflow-toolbar"><h2>Accepted supplier orders</h2><button onClick={orders.reload}>Refresh receiving</button></div>
    <p className="workflow-note">Only good units enter usable stock (at the order's fixed unit cost). Damaged units stay outstanding until the supplier sends good replacements; there is no refund or write-off. New stock is never reserved automatically — recheck job plans afterwards.{account.role === "worker" ? " Supplier prices, credit terms and payment are handled by Admin." : ""}</p>
    <Feedback busy={orders.loading} error={orders.error} />
    <div className="record-layout"><div className="record-list" aria-label="Receiving order list">
      {orders.data && !orders.data.items?.length && <p>No accepted supplier orders to receive.</p>}
      {orders.data?.items?.map((order) => <button key={order.order_id} className={`record-list-item ${selected === order.order_id ? "selected" : ""}`} onClick={() => setSelected(order.order_id)}>
        <span className="record-code">{order.order_no.slice(0, 11)}…</span><strong>{order.supplier_name}</strong><span><Status value={order.status} /></span><span>{order.full_received_at ? `Fully received ${formatBangkok(order.full_received_at)}` : "Awaiting goods"}</span>
      </button>)}
      {orders.data && <Paging offset={offset} count={orders.data.items?.length ?? 0} busy={orders.loading} setOffset={setOffset} />}
    </div>
    {selected ? <ReceivingDetail key={selected} api={api} account={account} id={selected} onChanged={orders.reload} /> : <section className="record-detail"><h2>Select an order</h2><p>Open an accepted order to record a delivery, claim damaged goods or {account.role === "admin" ? "settle the supplier." : "check outstanding quantities."}</p></section>}
    </div>
  </section>;
}

function ReceivingDetail({ api, account, id, onChanged }: { api: BackendApi; account: Account; id: string; onChanged: () => void }) {
  const resource = useResource<ReceivingState>(api, `/receiving/orders/${id}`);
  const [notice, setNotice] = useState("");
  // Forms render only from settled data so a landing reload cannot clear input.
  const state = resource.data; const settled = !resource.loading;
  function saved(message: string) { setNotice(message); resource.reload(); onChanged(); }
  return <section className="record-detail"><button onClick={() => { setNotice(""); resource.reload(); }}>Reload order</button><Feedback busy={resource.loading} error={resource.error} message={notice} />
    {state && <>
      <h2>{state.order_no}</h2><p className="record-id">{state.order_id} · version {String(state.version)}</p>
      <dl className="detail-grid"><div><dt>Supplier</dt><dd>{state.supplier_name}</dd></div><div><dt>Status</dt><dd><Status value={state.status} /></dd></div><div><dt>Fully received (ICT)</dt><dd>{state.full_received_at ? formatBangkok(state.full_received_at) : "Not yet"}</dd></div></dl>
      <div className="table-scroll"><table className="workflow-table"><thead><tr><th scope="col">Material</th><th scope="col">Ordered</th><th scope="col">Good received</th><th scope="col">Damaged (history)</th><th scope="col">Outstanding</th></tr></thead>
        <tbody>{state.lines?.map((line) => <tr key={line.material_id}><th scope="row">{line.material_name}</th><td>{inventoryDisplay(line.ordered)} {line.unit_name}</td><td>{inventoryDisplay(line.good)}</td><td>{inventoryDisplay(line.damaged)}</td><td>{inventoryDisplay(line.outstanding)}</td></tr>)}</tbody></table></div>
      {settled && state.status !== "received" && <ReceiptForm key={`receipt:${state.version}`} api={api} state={state} onSaved={() => saved("Receipt saved. Good units are now in stock; recheck job plans to reserve them.")} />}
      <h3>Damaged-goods claims</h3>
      {!state.claims?.length && <p>No damaged goods recorded.</p>}
      {state.claims?.map((claim) => <ClaimRow key={`${claim.id}:${claim.status}`} api={api} state={state} claim={claim} settled={settled} onSaved={() => saved("Supplier contact recorded. Receive the replacement against this claim when it arrives.")} />)}
      <h3>Receipts</h3>
      {!state.receipts?.length && <p>Nothing received yet.</p>}
      <ol className="payment-history">{state.receipts?.map((receipt) => <li key={receipt.id}><strong>{formatBangkok(receipt.created_at)}</strong>{receipt.note ? ` · ${receipt.note}` : ""}<br />{receipt.lines?.map((line) => `${name(state, line.material_id)?.material_name ?? line.material_id}: good ${inventoryDisplay(line.good)}, damaged ${inventoryDisplay(line.damaged)}${line.replacement_claim_id ? " (replacement)" : ""}`).join(" · ")}</li>)}</ol>
      {account.role === "admin" && settled && state.finance && <FinancePanel api={api} state={state} onSaved={saved} />}
    </>}
  </section>;
}

function ReceiptForm({ api, state, onSaved }: { api: BackendApi; state: ReceivingState; onSaved: () => void }) {
  const claimed = (state.claims ?? []).filter((claim) => claim.status === "claimed");
  const [rows, setRows] = useState<DraftReceipt[]>(() => [...(state.lines ?? []).filter((line) => line.outstanding !== "0.000000").map((line) => ({ material_id: line.material_id, good: "", damaged: "" })), ...claimed.map((claim) => ({ material_id: claim.material_id, good: "", damaged: "", replacement_claim_id: claim.id }))]);
  const command = useCommand(); const [attempt, setAttempt] = useState<ReturnType<typeof receiptPayload> | null>(null);
  const frozen = command.busy || Boolean(attempt);
  async function send(payload: ReturnType<typeof receiptPayload>, signal: AbortSignal) { await api.call(`/receiving/orders/${state.order_id}/receipts`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal); onSaved(); }
  const update = (index: number, field: "good" | "damaged", value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  return <form className="live-editor" aria-busy={command.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void command.run(async (signal) => { const payload = receiptPayload({ key: crypto.randomUUID(), version: state.version, note: text(data, "note"), lines: rows, claims: state.claims ?? [] }); setAttempt(payload); await send(payload, signal); }, ""); }}>
    <h3>Record a delivery</h3>
    <p>Count what physically arrived in each material's base unit. Leave rows blank if nothing arrived. Original deliveries cannot exceed the ordered quantity.</p>
    <fieldset className="live-fields" disabled={frozen}>
      {rows.map((row, index) => { const line = name(state, row.material_id); const claim = claimed.find((c) => c.id === row.replacement_claim_id);
        return <div className="live-plan-line" key={`${row.material_id}:${row.replacement_claim_id ?? ""}`}><p className="record-id">{line?.material_name} · {claim ? `replacement for claim (still owed ${inventoryDisplay(claimOwed(claim))})` : `original delivery · outstanding ${inventoryDisplay(line?.outstanding ?? "")}`}</p>
          <Field label={`Good ${line?.unit_name ?? ""}${claim ? " (replacement)" : ""} · ${line?.material_name ?? ""}`}><input inputMode="decimal" value={row.good} onChange={(event) => update(index, "good", event.target.value)} /></Field>
          <Field label={`Damaged ${line?.unit_name ?? ""}${claim ? " (replacement)" : ""} · ${line?.material_name ?? ""}`}><input inputMode="decimal" value={row.damaged} onChange={(event) => update(index, "damaged", event.target.value)} /></Field></div>; })}
      <Field label="Delivery note (optional)"><textarea name="note" maxLength={2000} /></Field>
      <label className="live-review-confirm"><input type="checkbox" required /> I counted the delivery. Damaged units will open a claim and will not enter stock.</label>
      <button className="button-primary" type="submit">Save receipt</button>
    </fieldset>
    <Feedback {...command} />
    {attempt && command.error && !command.busy && <RetryNote busy={command.busy} label="Retry identical receipt" onRetry={() => void command.run((signal) => send(attempt, signal), "")}>The response failed; the receipt may already be saved. Reload the order before counting again. Retrying sends the same receipt key, so stock cannot be added twice.</RetryNote>}
  </form>;
}

function ClaimRow({ api, state, claim, settled, onSaved }: { api: BackendApi; state: ReceivingState; claim: Claim; settled: boolean; onSaved: () => void }) {
  const command = useCommand(); const [attempt, setAttempt] = useState<{ idempotency_key: string; expected_version: number | string; note: string } | null>(null);
  const line = name(state, claim.material_id);
  async function send(payload: NonNullable<typeof attempt>, signal: AbortSignal) { await api.call(`/receiving/orders/${state.order_id}/claims/${claim.id}/submit`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal); onSaved(); }
  return <article className="live-evidence-record">
    <h4>{line?.material_name} · {inventoryDisplay(claim.quantity)} {line?.unit_name} damaged <Status value={claim.status} /></h4>
    <p>Replaced with good units: {inventoryDisplay(claim.replaced)} {line?.unit_name}{claim.claimed_at ? ` · Supplier contacted ${formatBangkok(claim.claimed_at)}` : ""}{claim.note ? ` · ${claim.note}` : ""}</p>
    {settled && claim.status === "pending_claim" && <form aria-busy={command.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void command.run(async (signal) => { const payload = { idempotency_key: crypto.randomUUID(), expected_version: state.version, note: claimNote(text(data, "note")) }; setAttempt(payload); await send(payload, signal); }, ""); }}>
      <fieldset className="live-fields" disabled={command.busy || Boolean(attempt)}><Field label="Supplier contact note (required)"><textarea name="note" required maxLength={2000} placeholder="e.g. Called sales, replacement promised for next delivery" /></Field><button type="submit">Record supplier contact</button></fieldset>
      <Feedback {...command} />{attempt && command.error && !command.busy && <RetryNote busy={command.busy} label="Retry identical claim" onRetry={() => void command.run((signal) => send(attempt, signal), "")} />}
    </form>}
  </article>;
}

function FinancePanel({ api, state, onSaved }: { api: BackendApi; state: ReceivingState; onSaved: (message: string) => void }) {
  const finance = state.finance!;
  const credit = useCommand(); const settle = useCommand(); const download = useCommand();
  const [creditAttempt, setCreditAttempt] = useState<{ idempotency_key: string; expected_version: number | string; credit_days: number } | null>(null);
  const [settleAttempt, setSettleAttempt] = useState<ReturnType<typeof settlementPayload> | null>(null);
  const [method, setMethod] = useState<"bank" | "cash">("bank"); const [proof, setProof] = useState<ReadyFile | null>(null);
  async function sendCredit(payload: NonNullable<typeof creditAttempt>, signal: AbortSignal) { await api.call(`/receiving/orders/${state.order_id}/credit-terms`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal); onSaved("Credit days saved. They cannot be edited."); }
  async function sendSettle(payload: ReturnType<typeof settlementPayload>, signal: AbortSignal) { await api.call(`/receiving/orders/${state.order_id}/settlement`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal); onSaved("Supplier settlement recorded. This records an external payment; it does not transfer money."); }
  return <section className="live-section" aria-label="Supplier payment">
    <h3>Supplier payment (Admin)</h3>
    <dl className="detail-grid"><div><dt>Order total (no VAT)</dt><dd>{displayMoney(finance.total_amount)}</dd></div><div><dt>Credit days</dt><dd>{finance.credit_days ?? "Not set"}</dd></div><div><dt>Payment due (ICT)</dt><dd>{finance.payment_due_at ? formatBangkok(finance.payment_due_at) : "After full receipt and credit days"}</dd></div><div><dt>Payment status</dt><dd><Status value={finance.payment_status} /></dd></div></dl>
    {finance.credit_days === null && <form className="live-editor" aria-busy={credit.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void credit.run(async (signal) => { const payload = { idempotency_key: crypto.randomUUID(), expected_version: state.version, credit_days: creditDays(text(data, "days")) }; if (!window.confirm(`Set ${payload.credit_days} credit day(s)? This can be set only once.`)) return; setCreditAttempt(payload); await sendCredit(payload, signal); }, ""); }}>
      <fieldset className="live-fields" disabled={credit.busy || Boolean(creditAttempt)}><Field label="Credit days agreed with the supplier (0 = immediate)"><input name="days" required inputMode="numeric" /></Field><p>There is no default credit period. Due time counts from full good receipt.</p><button type="submit">Set credit days</button></fieldset>
      <Feedback {...credit} />{creditAttempt && credit.error && !credit.busy && <RetryNote busy={credit.busy} label="Retry identical credit days" onRetry={() => void credit.run((signal) => sendCredit(creditAttempt, signal), "")} />}
    </form>}
    {finance.settlement ? <div className="workflow-success"><p>Paid {displayMoney(finance.settlement.amount)} by {finance.settlement.method} at {formatBangkok(finance.settlement.paid_at)}.</p>{finance.settlement.evidence_id && <button disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/order-evidence/${finance.settlement!.evidence_id}/download`, undefined, signal), "Private proof download requested.")}>Download payment proof</button>}<Feedback {...download} /></div>
      : finance.payment_status === "pending" && state.full_received_at ? <form className="live-editor" aria-busy={settle.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void settle.run(async (signal) => { const payload = settlementPayload({ key: crypto.randomUUID(), version: state.version, method, paidAt: text(data, "paid_at"), evidenceId: proof?.id, fullReceivedAt: state.full_received_at! }, Date.now()); if (!window.confirm(`Record full settlement of ${displayMoney(finance.total_amount)}? There is only one settlement per order.`)) return; setSettleAttempt(payload); await sendSettle(payload, signal); }, ""); }}>
        <h4>Record full settlement · {displayMoney(finance.total_amount)}</h4>
        <fieldset className="live-fields" disabled={settle.busy || Boolean(settleAttempt)}>
          <Field label="Method"><select value={method} onChange={(event) => setMethod(event.target.value as "bank" | "cash")}><option value="bank">Bank transfer (proof required)</option><option value="cash">Cash (proof optional)</option></select></Field>
          <Field label="Paid at (Asia/Bangkok)"><input name="paid_at" type="datetime-local" required /></Field>
          <PrivateUpload api={api} label={method === "bank" ? "Transfer proof (required)" : "Receipt or photo (optional)"} intentPath={`/material-orders/${state.order_id}/evidence/uploads`} completePath={(fileId) => `/order-evidence/${fileId}/complete`} ready={proof} onReady={setProof} />
          <button className="button-primary" type="submit">Record settlement</button>
        </fieldset>
        <Feedback {...settle} />{settleAttempt && settle.error && !settle.busy && <RetryNote busy={settle.busy} label="Retry identical settlement" onRetry={() => void settle.run((signal) => sendSettle(settleAttempt, signal), "")} />}
      </form> : <p>Settlement opens after full good receipt and credit days are set.</p>}
  </section>;
}
