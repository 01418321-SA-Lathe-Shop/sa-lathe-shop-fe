"use client";

import { useState, type FormEvent } from "react";
import { BackendApi, displayMoney, moneyInput, type Account, type Decision, type Estimate, type JobRequest, type Page, type Quotation } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Feedback, Field, Paging, text } from "../../components/ui/backend-ui";
import { LiveFulfillment } from "../fulfillment/fulfillment";

export function LiveQuotations({ api, account, request, onChanged, only = "all" }: { api: BackendApi; account: Account; request: JobRequest; onChanged: () => void; only?: "all" | "quotations" | "fulfillment" }) {
  const [offset, setOffset] = useState(0);
  // Dedicated pagination keeps historical revisions accessible without N+1 reads.
  const resource = useResource<Page<Quotation>>(api, `/requests/${request.id}/quotations?limit=20&offset=${offset}`);
  const action = useCommand(); const [estimate, setEstimate] = useState<Estimate | null>(null); const [editing, setEditing] = useState<Quotation | null>(null);
  const [reasonFor, setReasonFor] = useState(""); const [outcome, setOutcome] = useState<"accept" | "reject">("accept");
  const current = resource;
  const all = current.data?.items ?? [];
  // The fulfillment page shows only the approved quotation's Deposit/PO record.
  const items = only === "fulfillment" ? all.filter((quote) => quote.status === "approved") : all;
  const worker = account.role === "worker";
  const canCreate = offset === 0 && Boolean(current.data) && !all.some((quote) => ["draft", "sent", "approved"].includes(quote.status));
  function changed() { setEditing(null); setReasonFor(""); setEstimate(null); resource.reload(); onChanged(); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    void action.run(async (signal) => {
      const costs = { material_cost: moneyInput(text(data, "material_cost")), labor_cost: moneyInput(text(data, "labor_cost")) };
      if (submitter?.value === "estimate") {
        setEstimate(await api.call<Estimate>("/quotations/estimate", "POST", costs, signal)); return;
      }
      const input = { ...costs, final_price: moneyInput(text(data, "final_price")) };
      if (editing) await api.call(`/quotations/${editing.id}`, "PATCH", { ...input, expected_lock_version: BigInt(editing.lock_version) }, signal);
      else await api.call(`/requests/${request.id}/quotations`, "POST", input, signal);
      changed();
    }, "Server confirmed the estimate or saved draft.");
  }
  return <section className="live-section"><h3>{only === "fulfillment" ? "Accepted quotation" : "Quotations"}</h3><p>Whole-request totals, not unit prices. Minimum = (material + labor) × 1.60, rounded upward to a satang. No VAT. Five Customer rejections permit revision; the sixth cancels.</p><button onClick={current.reload}>Refresh quotations</button><Feedback busy={current.loading} error={current.error} />
    {current.data && !items.length && <p>{only === "fulfillment" ? "No accepted quotation yet. Accept a sent quotation on the Quotations page first." : "No visible quotations on this page. Customer accounts never receive drafts/internal costs."}</p>}
    {items.map((quote) => <article className="supplier-order" key={`${quote.id}:${quote.lock_version}`}><h4>Quotation #{quote.quotation_no} · revision {quote.version}</h4><p>{quote.status} · {displayMoney(quote.final_price)}</p>{quote.internal_costs && account.role !== "customer" && <p>Material {displayMoney(quote.internal_costs.material_cost)} · Labor {displayMoney(quote.internal_costs.labor_cost)} · Minimum {displayMoney(quote.internal_costs.minimum_price)}</p>}
      <div className="form-actions">{worker && quote.status === "draft" && request.status !== "canceled" && <><button disabled={action.busy} onClick={() => { setEditing(quote); setEstimate(null); }}>Edit draft</button><button disabled={action.busy} onClick={() => { if (!window.confirm("Publish this immutable quotation to the Customer in this system?")) return; void action.run(async (signal) => { await api.call(`/quotations/${quote.id}/send`, "POST", { expected_lock_version: BigInt(quote.lock_version) }, signal); changed(); }, "Quotation published in-system; no email, PDF or LINE delivery is implied."); }}>Send quotation</button></>}
      {account.role === "customer" && only !== "fulfillment" && quote.status === "sent" && request.status !== "canceled" && <><button disabled={action.busy} onClick={() => { setReasonFor(quote.id); setOutcome("accept"); }}>Accept quotation</button><button disabled={action.busy} onClick={() => { setReasonFor(quote.id); setOutcome("reject"); }}>Reject quotation</button></>}</div>
      {reasonFor === quote.id && <form onSubmit={(event) => { event.preventDefault(); const reason = text(new FormData(event.currentTarget), "reason").trim(); void action.run(async (signal) => { if ([...reason].length > 2000) throw new Error("Reason must be at most 2,000 characters."); await api.call<Decision>(`/quotations/${quote.id}/decision`, "POST", { outcome, expected_lock_version: BigInt(quote.lock_version), ...(outcome === "reject" ? { reason } : {}) }, signal); changed(); }, "Decision recorded. Refresh decision history below to see saved terms and rejection count."); }}><p>{outcome === "accept" ? "Confirm acceptance. The server fixes Deposit/PO terms and the 14-day deadline. This is not payment." : "Confirm rejection. The sixth distinct Customer rejection cancels the request."}</p>{outcome === "reject" && <Field label="Reason (optional, up to 2,000 characters)"><textarea name="reason" /></Field>}<button disabled={action.busy} type="submit">Confirm {outcome}</button><button type="button" disabled={action.busy} onClick={() => setReasonFor("")}>Cancel</button></form>}
      {quote.status === "approved" && only !== "quotations" && <LiveFulfillment api={api} account={account} requestId={request.id} quotationId={quote.id} />}
    </article>)}
    {current.data && <Paging offset={offset} count={items.length} busy={action.busy} setOffset={setOffset} />}
    {worker && request.status !== "canceled" && (editing || canCreate) && <form className="workflow-form-panel" key={editing?.id ?? "new"} onSubmit={save} aria-busy={action.busy}><h4>{editing ? `Edit revision ${editing.version}` : "Create draft / revision"}</h4><p>Only one draft/sent/approved quotation may exist. New revisions require prior rejection; the server enforces this.</p><fieldset disabled={action.busy} className="live-fields"><Field label="Total material cost (THB)"><input name="material_cost" required inputMode="decimal" defaultValue={editing?.internal_costs?.material_cost ?? ""} onChange={() => setEstimate(null)} /></Field><Field label="Total labor cost (THB)"><input name="labor_cost" required inputMode="decimal" defaultValue={editing?.internal_costs?.labor_cost ?? ""} onChange={() => setEstimate(null)} /></Field><Field label="Final price (THB, required to save)"><input name="final_price" inputMode="decimal" defaultValue={editing?.final_price ?? ""} /></Field><div className="form-actions"><button type="submit" name="action" value="estimate">Estimate minimum</button><button type="submit" name="action" value="save">Save draft</button>{editing && <button type="button" onClick={() => { setEditing(null); setEstimate(null); }}>Cancel edit</button>}</div></fieldset>{estimate && <p role="status">Server minimum: {displayMoney(estimate.minimum_price)} · Total cost: {displayMoney(estimate.total_cost)}</p>}</form>}
    {worker && request.status === "pending" && <form onSubmit={(event) => { event.preventDefault(); const reason = text(new FormData(event.currentTarget), "reason").trim(); if (!window.confirm("Refuse this pending request? The Customer can read your reason.")) return; void action.run(async (signal) => { if (!reason || [...reason].length > 2000) throw new Error("A refusal reason of 1–2,000 characters is required."); await api.call(`/requests/${request.id}/reject`, "POST", { reason }, signal); changed(); }, "Request refused. This does not count as a Customer quotation rejection."); }}><h4>Refuse pending request</h4><Field label="Customer-visible refusal reason"><textarea name="reason" required /></Field><button disabled={action.busy} type="submit">Refuse request</button></form>}
    <Feedback {...action} />
  </section>;
}
