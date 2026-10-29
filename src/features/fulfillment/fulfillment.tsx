"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BackendApi, displayMoney, type Account, type Evidence, type EvidenceSubmission, type Fulfillment, type SignedLink } from "../../lib/api/backend-api";
import { availableEvidenceKinds, evidencePayload, reviewReason } from "./fulfillment-domain";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Feedback, Field, text } from "../../components/ui/backend-ui";
import { formatBangkok } from "../../lib/formatting/display";

type ReviewAttempt = { outcome: "approved" | "rejected"; expected_version: number | string; reason?: string };

export function LiveFulfillment({ api, account, requestId, quotationId }: { api: BackendApi; account: Account; requestId: string; quotationId: string }) {
  const resource = useResource<Fulfillment>(api, `/quotations/${quotationId}/fulfillment`);
  const [now, setNow] = useState<number | null>(null);
  const [kind, setKind] = useState<"deposit" | "po" | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const start = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(start); clearInterval(timer); };
  }, []);
  function saved(message: string) { setKind(null); setNotice(message); resource.reload(); }
  const state = resource.data;
  const kinds = state && now !== null ? availableEvidenceKinds(state, now) : [];

  return <section className="live-section fulfillment-section" aria-label="Deposit and PO fulfillment">
    <div className="workflow-toolbar"><h3>Deposit & company PO</h3><button onClick={() => { setNotice(""); resource.reload(); }}>Reload fulfillment</button></div>
    <p>Upload a fresh receipt or company PO, then explicitly submit it for manual review. Upload completion alone is not approval, a bank transfer or a queued job.</p>
    <Feedback busy={resource.loading} error={resource.error} message={notice} />
    {state && <>
      <dl className="detail-grid">
        <div><dt>Required deposit minimum</dt><dd>{state.terms.deposit_required ? displayMoney(state.terms.deposit_amount) : "Not required"}</dd></div>
        <div><dt>Company PO</dt><dd>{state.terms.po_required ? "Required" : "Not required"}</dd></div>
        <div><dt>Accepted total</dt><dd>{displayMoney(state.terms.final_price)}</dd></div>
        <div><dt>File finalization and submission due (ICT)</dt><dd>{formatBangkok(state.terms.documents_due_at)}</dd></div>
        <div><dt>Current request status</dt><dd>{state.request_status}</dd></div>
        <div><dt>Verification</dt><dd>Manual Admin / Staff review; not bank-provider verification</dd></div>
      </dl>
      {state.canceled_at && <p className="workflow-error">System canceled fulfillment at {formatBangkok(state.canceled_at)}. New submissions are closed.</p>}
      {!state.job && now !== null && now > new Date(state.terms.documents_due_at).getTime() && !state.canceled_at && <p className="workflow-note">Submission deadline has passed. Timely complete pending evidence can still be reviewed. Missing/rejected required evidence is canceled by the backend worker; this page does not extend the deadline or decide cancellation locally.</p>}
      {account.role === "customer" && !kind && <div className="form-actions">{kinds.map((value) => <button className="button-primary" key={value} onClick={() => { setKind(value); setNotice(""); }}>Submit {value === "deposit" ? "deposit" : "PO"} evidence</button>)}</div>}
      {account.role === "customer" && !kind && !kinds.length && !state.job && !state.canceled_at && now !== null && now <= new Date(state.terms.documents_due_at).getTime() && <p className="workflow-note">All required kinds have pending/approved evidence. Wait for review or reload the current status. Rejected evidence can be replaced before the original deadline.</p>}
      {account.role === "customer" && kind && <SubmitEvidence key={kind} api={api} requestId={requestId} quotationId={quotationId} state={state} kind={kind} onSaved={() => saved("Evidence submitted. Staff approval is still required; no automatic payment is implied.")} onCancel={() => setKind(null)} />}
      <h4>Evidence submissions</h4>
      {!state.evidence?.length && <p>No submitted evidence yet. A request drawing does not automatically count as a receipt or company PO.</p>}
      {state.evidence?.map((item) => <EvidenceRecord key={`${item.id}:${item.version}`} api={api} account={account} item={item} canReview={!state.job && !state.canceled_at && state.request_status !== "canceled"} onReviewed={() => saved("Review saved by the server. Job details below reflect the server fulfillment result.")} />)}
      <p className="workflow-note">The server returns the latest 100 evidence records. Submitted and reviewed records cannot be edited or deleted.</p>
      {state.job ? <section className="live-section" aria-label="Opened job"><h4>Job opened · {state.job.status}</h4><p className="record-id">{state.job.id}</p><dl className="detail-grid"><div><dt>Actual approved deposit</dt><dd>{displayMoney(state.job.deposit_amount)}</dd></div><div><dt>Remaining job balance</dt><dd>{displayMoney(state.job.balance)}</dd></div><div><dt>Job opened (ICT)</dt><dd>{formatBangkok(state.job.created_at)}</dd></div><div><dt>Requested deadline (not a production promise)</dt><dd>{state.job.due_at ? formatBangkok(state.job.due_at) : "Not requested"}</dd></div></dl><p>Exactly one job is opened after all required approvals. Purchasing, production and invoicing are not connected by this frontend phase.</p></section> : <p className="workflow-note">No queued job has been returned by the server. All required evidence approvals must succeed first.</p>}
    </>}
  </section>;
}

function SubmitEvidence({ api, requestId, quotationId, state, kind, onSaved, onCancel }: { api: BackendApi; requestId: string; quotationId: string; state: Fulfillment; kind: "deposit" | "po"; onSaved: () => void; onCancel: () => void }) {
  const action = useCommand(); const [file, setFile] = useState<File | null>(null); const [attempt, setAttempt] = useState<EvidenceSubmission | null>(null);
  const [stage, setStage] = useState("");
  async function send(payload: EvidenceSubmission, signal: AbortSignal) {
    setStage("Submitting ready evidence for manual review…");
    await api.call(`/quotations/${quotationId}/evidence`, "POST", payload, signal);
    onSaved();
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void action.run(async (signal) => {
      if (!file) throw new Error("Choose a new receipt or company PO file.");
      if (!availableEvidenceKinds(state, Date.now()).includes(kind)) throw new Error("This evidence kind is closed or the deadline passed. Reload fulfillment.");
      const key = crypto.randomUUID();
      // Validate money/time before uploading bytes; replace placeholder with the
      // actual ready object only after the server validates the upload.
      const payload = evidencePayload(state.terms, { key, attachmentId: key, kind, amount: text(data, "amount"), paidAt: text(data, "paid_at") }, Date.now());
      setStage("Uploading and validating a new private file…");
      const ready = await api.upload(requestId, file, signal);
      const savedPayload = { ...payload, attachment_id: ready.id };
      setAttempt(savedPayload); // Keep the exact key/payload for uncertain writes.
      await send(savedPayload, signal);
    }, "");
  }
  return <form className="live-editor" onSubmit={submit} aria-busy={action.busy}>
    <h4>Submit {kind === "deposit" ? "deposit receipt" : "company PO"}</h4>
    <fieldset disabled={action.busy || Boolean(attempt)} className="live-fields">
      {kind === "deposit" && <><Field label="Declared deposit amount (THB)"><input name="amount" required inputMode="decimal" defaultValue={state.terms.deposit_amount} /></Field><p>One deposit from {displayMoney(state.terms.deposit_amount)} through {displayMoney(state.terms.final_price)}. No aggregation of smaller deposits. A full deposit is allowed; zero-price quotations use zero confirmation.</p><Field label="Declared payment time (Asia/Bangkok)"><input name="paid_at" type="datetime-local" required /></Field></>}
      <Field label={kind === "deposit" ? "New deposit receipt file" : "New company PO file"}><input type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></Field>
      <p>Documents/images only, maximum 100 MB. Each fresh upload uses a new intent. Both finalization and evidence submission must finish before the deadline.</p>
      <button type="submit" className="button-primary" disabled={!file}>{action.error && !attempt ? "Upload again & submit" : "Upload & submit"} {kind === "deposit" ? "deposit" : "PO"}</button>
    </fieldset>
    {action.busy && <p role="status">{stage}</p>}
    <Feedback error={action.error} />
    {attempt && !action.busy && <div className="workflow-note"><p>The file is ready, but a failed response does not tell you whether evidence committed. Reload status before changing anything. An explicit retry below sends exactly the same submission key and payload—even after deadline, if the original succeeded.</p><button type="button" onClick={() => void action.run((signal) => send(attempt, signal), "")}>Retry identical evidence submission</button></div>}
    {!attempt && action.error && <p className="workflow-note">If file upload failed, choose the file again or press Upload & submit again to start a fresh upload; no automatic retry.</p>}
    <button type="button" disabled={action.busy} onClick={() => { if (attempt && !window.confirm("Leave this retry? Reload fulfillment to check whether it committed before submitting different evidence. This does not delete server data.")) return; onCancel(); }}>Cancel evidence form</button>
  </form>;
}

function EvidenceRecord({ api, account, item, canReview, onReviewed }: { api: BackendApi; account: Account; item: Evidence; canReview: boolean; onReviewed: () => void }) {
  const download = useCommand(); const action = useCommand(); const [outcome, setOutcome] = useState<"approved" | "rejected">("approved");
  const [attempt, setAttempt] = useState<ReviewAttempt | null>(null);
  async function send(payload: ReviewAttempt, signal: AbortSignal) { await api.call(`/evidence/${item.id}/review`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal); onReviewed(); }
  return <article className="live-evidence-record">
    <h4>{item.kind === "po" ? "Company PO" : "Deposit receipt"} · {item.status}</h4>
    <p className="record-id">{item.id} · Submitted by {item.submitted_by}</p>
    <p>Submitted {formatBangkok(item.submitted_at)}{item.amount !== undefined ? ` · Declared amount ${displayMoney(item.amount)}` : ""}{item.paid_at ? ` · Declared paid at ${formatBangkok(item.paid_at)}` : ""}</p>
    {item.reviewed_at && <p>Reviewed {formatBangkok(item.reviewed_at)} · {item.reviewed_by}</p>}
    {item.reason && <p className="workflow-note">Rejection reason: {item.reason}</p>}
    <button disabled={download.busy} onClick={() => void download.run(async (signal) => {
      const link = await api.call<SignedLink>(`/attachments/${item.attachment_id}/download`, "GET", undefined, signal);
      const url = new URL(link.url); if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Invalid private download link.");
      const anchor = document.createElement("a"); anchor.href = url.href; anchor.rel = "noreferrer noopener"; anchor.referrerPolicy = "no-referrer"; document.body.append(anchor); anchor.click(); anchor.remove();
    }, "Private evidence download requested.")}>Download {item.kind === "po" ? "PO" : "receipt"}</button><Feedback {...download} />
    {account.role !== "customer" && item.status === "pending" && canReview && <form onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      void action.run(async (signal) => { const reason = reviewReason(outcome, text(data, "reason")); const payload: ReviewAttempt = { outcome, expected_version: item.version, ...(outcome === "rejected" ? { reason } : {}) }; setAttempt(payload); await send(payload, signal); }, "");
    }} aria-busy={action.busy}>
      <fieldset disabled={action.busy || Boolean(attempt)} className="live-fields">
        <Field label="Evidence review outcome"><select value={outcome} onChange={(event) => setOutcome(event.target.value as "approved" | "rejected")}><option value="approved">Approve evidence</option><option value="rejected">Reject evidence</option></select></Field>
        {outcome === "rejected" && <Field label="Evidence rejection reason"><textarea name="reason" required /></Field>}
        <label className="live-review-confirm"><input type="checkbox" required /> I checked the private evidence. The final required approval can open a job.</label>
        <button type="submit" className="button-primary">Confirm evidence review</button>
      </fieldset><Feedback {...action} />
      {attempt && !action.busy && <><p className="workflow-note">A response failed. Reload fulfillment to inspect current status; do not issue an opposite review. Exact retry preserves the original outcome, reason and version.</p><button type="button" onClick={() => void action.run((signal) => send(attempt, signal), "")}>Retry identical review</button></>}
    </form>}
  </article>;
}
