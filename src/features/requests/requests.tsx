"use client";

import { useState, type FormEvent } from "react";
import { BackendApi, positiveInt64, displayMoney, type Account, type Attachment, type Customer, type Decision, type JobRequest, type Page, type SignedLink, type Terms } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Field, Feedback, Paging, text } from "../../components/ui/backend-ui";
import { LiveQuotations } from "../quotations/quotations";
import { formatBangkok } from "../../lib/formatting/display";

// "all" is the Staff/Admin record. Customer pages focus one step of the same
// request record: details/files (UC1), quotations/decisions (UC3) or the
// approved quotation's Deposit/PO fulfillment (UC4).
export type RequestFocus = "all" | "request" | "quotations" | "fulfillment";
const FOCUS_HINT: Record<RequestFocus, string> = {
  all: "Open a record to view its files, quotation revisions, decisions and Deposit/PO fulfillment.",
  request: "Open a request to view its details and private files. Quotations and Deposit/PO have their own pages.",
  quotations: "Open a request to review sent quotations and your decision history.",
  fulfillment: "Open a request with an accepted quotation to submit Deposit or company PO evidence.",
};

export function LiveRequests({ api, account, focus = "all" }: { api: BackendApi; account: Account; focus?: RequestFocus }) {
  const [offset, setOffset] = useState(0); const [selected, setSelected] = useState(""); const [creating, setCreating] = useState(false);
  const resource = useResource<Page<JobRequest>>(api, `/requests?limit=20&offset=${offset}`);
  function open(id: string) { setSelected(id); setCreating(false); }
  return <section><div className="workflow-toolbar"><h2>{account.role === "customer" ? "Your requests" : "Shop request queue"}</h2><div className="form-actions"><button onClick={resource.reload}>Refresh requests</button>{account.role === "customer" && focus === "request" && <button className="button-primary" onClick={() => setCreating((value) => !value)}>{creating ? "Cancel new request" : "New request"}</button>}</div></div>
    <Feedback busy={resource.loading} error={resource.error} />
    {creating && account.role === "customer" && focus === "request" && <CreateRequest api={api} onCreated={(id) => { resource.reload(); open(id); }} />}
    <div className="record-layout"><div className="record-list" aria-label="Request list">{resource.data && !resource.data.items?.length && <p>No requests on this page. Customers can create a request; staff can refresh when one arrives.</p>}{resource.data?.items?.map((item) => <button className={`record-list-item ${selected === item.id ? "selected" : ""}`} key={item.id} onClick={() => open(item.id)}><span>Request #{item.no_request}</span><strong>{item.description}</strong><span>{item.status} · Qty {item.qty}</span><span>{formatBangkok(item.created_at)}</span></button>)}{resource.data && <Paging offset={offset} count={resource.data.items?.length ?? 0} busy={resource.loading} setOffset={setOffset} />}</div>
      {selected ? <RequestDetail key={selected} api={api} account={account} id={selected} focus={focus} onChanged={resource.reload} /> : <section className="record-detail"><h2>Select a request</h2><p>{FOCUS_HINT[focus]}</p></section>}
    </div>
  </section>;
}

function CreateRequest({ api, onCreated }: { api: BackendApi; onCreated: (id: string) => void }) {
  const profiles = useResource<{ items: Customer[] | null }>(api, "/customers"); const action = useCommand();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void action.run(async (signal) => {
      const description = text(data, "description").trim(); const material = text(data, "material_spec").trim();
      if (!description || [...description].length > 10000) throw new Error("Description is required and must be at most 10,000 characters.");
      if ([...material].length > 2000) throw new Error("Material specification must be at most 2,000 characters.");
      const requested = text(data, "deadline");
      // Explicit +07:00, independent of the device's local timezone.
      const deadline = requested ? new Date(`${requested}:00+07:00`) : undefined;
      if (deadline && (!Number.isFinite(deadline.getTime()) || deadline.getTime() <= Date.now())) throw new Error("Requested deadline must be a future Asia/Bangkok date/time.");
      const result = await api.call<JobRequest>("/requests", "POST", { customer_id: text(data, "customer_id"), description, qty: positiveInt64(text(data, "qty")), material_spec: material, ...(deadline ? { deadline: deadline.toISOString() } : {}) }, signal);
      onCreated(result.id);
    });
  }
  return <section className="workflow-form-panel"><h2>New manufacturing request</h2><Feedback busy={profiles.loading} error={profiles.error} />{profiles.error && <button onClick={profiles.reload}>Reload customer memberships</button>}
    {profiles.data && !profiles.data.items?.length && <p>No active customer membership. Check your memberships before submitting.</p>}
    {Boolean(profiles.data?.items?.length) && <form onSubmit={submit} aria-busy={action.busy}><fieldset disabled={action.busy} className="live-fields"><Field label="Customer / company membership"><select name="customer_id" required>{profiles.data?.items?.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} ({profile.customer_type})</option>)}</select></Field><Field label="Description"><textarea name="description" required rows={3} /></Field><Field label="Quantity (whole number)"><input name="qty" required inputMode="numeric" pattern="[1-9][0-9]*" defaultValue="1" /></Field><Field label="Material specification (optional)"><textarea name="material_spec" rows={2} /></Field><Field label="Requested deadline (optional, Asia/Bangkok)"><input name="deadline" type="datetime-local" /></Field><p>This is a requested date, not a promised production deadline. Upload drawings after the request is saved.</p><button className="button-primary" type="submit">Create request</button></fieldset></form>}<Feedback {...action} />
  </section>;
}

function RequestDetail({ api, account, id, focus, onChanged }: { api: BackendApi; account: Account; id: string; focus: RequestFocus; onChanged: () => void }) {
  const request = useResource<JobRequest>(api, `/requests/${id}`);
  function changed() { request.reload(); onChanged(); }
  return <section className="record-detail"><button onClick={changed}>Reload record</button><Feedback busy={request.loading} error={request.error} />{request.data && <>
    <h2>Request #{request.data.no_request}</h2><p className="record-id">{request.data.id}</p><p className="live-description">{request.data.description}</p><dl className="detail-grid"><div><dt>Status</dt><dd>{request.data.status}</dd></div><div><dt>Quantity</dt><dd>{request.data.qty}</dd></div><div><dt>Material specification</dt><dd>{request.data.material_spec || "Not provided"}</dd></div><div><dt>Requested deadline (ICT)</dt><dd>{request.data.deadline ? formatBangkok(request.data.deadline) : "Not requested"}</dd></div></dl>
    {request.data.status === "canceled" && <Refusal api={api} id={id} />}
    {(focus === "all" || focus === "request") && <RequestFiles api={api} id={id} canUpload={account.role === "customer" && focus === "request"} />}
    {focus !== "request" && <LiveQuotations api={api} account={account} request={request.data} onChanged={changed} only={focus === "fulfillment" ? "fulfillment" : focus === "quotations" ? "quotations" : "all"} />}
    {(focus === "all" || focus === "quotations") && <DecisionHistory api={api} id={id} />}
  </>}</section>;
}

function Refusal({ api, id }: { api: BackendApi; id: string }) {
  const resource = useResource<{ reason: string }>(api, `/requests/${id}/rejection`);
  // A canceled request may instead have six Customer quotation rejections.
  return <div>{resource.data && <p>Worker refusal: {resource.data.reason}</p>}{resource.error && <p>Worker refusal details unavailable. See decision history for Customer rejections.</p>}</div>;
}

function RequestFiles({ api, id, canUpload }: { api: BackendApi; id: string; canUpload: boolean }) {
  const resource = useResource<{ items: Attachment[] | null }>(api, `/requests/${id}/attachments`); const action = useCommand(); const [failed, setFailed] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  return <section className="live-section"><h3>Request attachments</h3><button onClick={resource.reload}>Refresh files</button><Feedback busy={resource.loading} error={resource.error} />
    {resource.data && !resource.data.items?.length && <p>No validated attachments yet.</p>}{resource.data?.items?.map((item) => <div className="attachment-row" key={item.id}><span>{item.file_name} · {item.byte_size} bytes · {item.state}</span><button disabled={action.busy} onClick={() => void action.run(async (signal) => {
      const link = await api.call<SignedLink>(`/attachments/${item.id}/download`, "GET", undefined, signal);
      const url = new URL(link.url);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Invalid download link.");
      // Do not keep signed URLs in rendered state, storage or logs.
      const anchor = document.createElement("a"); anchor.href = url.href; anchor.rel = "noreferrer noopener"; anchor.referrerPolicy = "no-referrer"; anchor.download = item.file_name; document.body.append(anchor); anchor.click(); anchor.remove();
    }, "Private download requested.")}>Download</button></div>)}
    {canUpload && <form aria-busy={action.busy} onSubmit={(event) => { event.preventDefault(); if (!file) return; void action.run(async (signal) => {
      try { await api.upload(id, file, signal); setFailed(false); setFile(null); resource.reload(); }
      catch (error) { if (!signal.aborted) setFailed(true); throw error; }
    }, "File validated and saved by the server."); }}><Field label="Document or image (100 MB maximum)"><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png" disabled={action.busy} aria-describedby={`upload-help-${id}`} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setFailed(false); }} /></Field><p id={`upload-help-${id}`}>PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG/PNG. Each attempt creates a fresh intent. Upload is not saved until server validation succeeds.</p><button type="submit" disabled={action.busy || !file}>{failed ? "Upload again" : "Upload file"}</button></form>}<Feedback {...action} />
  </section>;
}

function DecisionHistory({ api, id }: { api: BackendApi; id: string }) {
  const [offset, setOffset] = useState(0); const resource = useResource<Page<Decision>>(api, `/requests/${id}/quotation-decisions?limit=20&offset=${offset}`);
  return <section className="live-section"><h3>Customer decision history</h3><button onClick={resource.reload}>Refresh decisions</button><Feedback busy={resource.loading} error={resource.error} />{resource.data && <>{!resource.data.items?.length && <p>No Customer decisions on this page.</p>}{resource.data.items?.map((decision) => <article key={decision.quotation_id} className="supplier-order"><p>{decision.outcome} · {formatBangkok(decision.decided_at)}</p><p>{decision.reason}</p><p>Rejections after this decision: {decision.rejection_count} · Historical request status: {decision.request_status}</p>{decision.terms && <AcceptanceTerms terms={decision.terms} />}</article>)}<Paging offset={offset} count={resource.data.items?.length ?? 0} busy={resource.loading} setOffset={setOffset} /></>}</section>;
}

export function AcceptanceTerms({ terms }: { terms: Terms }) {
  return <dl className="detail-grid"><div><dt>Accepted total</dt><dd>{displayMoney(terms.final_price)}</dd></div><div><dt>Customer type at acceptance</dt><dd>{terms.customer_type}</dd></div><div><dt>Deposit required</dt><dd>{terms.deposit_required ? displayMoney(terms.deposit_amount) : "No"}</dd></div><div><dt>PO required</dt><dd>{terms.po_required ? "Yes" : "No"}</dd></div><div><dt>Balance after required deposit (not paid)</dt><dd>{displayMoney(terms.balance_after_deposit)}</dd></div><div><dt>Accepted at (ICT)</dt><dd>{formatBangkok(terms.accepted_at)}</dd></div><div><dt>Submit required Deposit/PO by (ICT)</dt><dd>{formatBangkok(terms.documents_due_at)}</dd></div><div><dt>Next step</dt><dd>Open Deposit & company PO under the approved quotation above. This historical acceptance snapshot is not payment confirmation; current evidence and job status are read separately.</dd></div></dl>;
}
