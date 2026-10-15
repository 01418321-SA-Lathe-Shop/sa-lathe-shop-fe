"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { WorkspaceId } from "./demo-access";
import {
  confirmationDeadline, confirmationTerms, inspectDelivery,
  invoiceBalance, invoiceStatus, latestVisibleQuotation as latestQuotation, recordPayment, respondToQuotation,
  submitConfirmation, type Attachment, type CustomerRequest, type CustomerState, type CustomerType,
} from "./customer-domain";
import { useWorkshop } from "./workshop-context";
import { FILE_ACCEPT, fileError, parsePaymentInput } from "./customer-files";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "THB", minimumFractionDigits: 2 });
const dateTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const money = (amount: number) => currency.format(amount / 100);
const date = (value: string | number) => `${dateTime.format(new Date(value))} ICT`;

type Update = { transform: (data: CustomerState) => CustomerState; message?: string; scope?: WorkspaceId };

function Status({ children }: { children: ReactNode }) {
  return <span className={`record-status status-${String(children)}`}>{children}</span>;
}

function AttachmentButton({ attachment, open }: { attachment: Attachment; open: (attachment: Attachment) => void }) {
  return <button type="button" className="attachment-link" onClick={() => open(attachment)}>{attachment.name}<span>View</span></button>;
}

function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} className="customer-dialog" aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); close(); }}>
      <div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="button-secondary" onClick={close} aria-label="Close dialog">Close</button></div>
      {children}
    </dialog>
  );
}

export function FilePreview({ attachment, url, close }: { attachment: Attachment; url: string; close: () => void }) {
  return (
    <Dialog title={attachment.name} close={close}>
      <p className="text-muted">Local demo attachment · {(attachment.size / 1000).toFixed(1)} KB</p>
      {attachment.sample && <p className="workflow-note">Synthetic sample document. This is not proof of a real order or payment.</p>}
      {url && attachment.type.startsWith("image/") ? (
        // A local Blob URL is intentionally rendered without a Next.js image optimization request.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="attachment-preview" src={url} alt={attachment.name} />
      ) : attachment.sample ? <pre className="sample-document">DEMO DOCUMENT{"\n\n"}{attachment.name}{"\n\n"}For prototype testing only.{"\n"}No real payment, order, or delivery is represented.</pre>
        : <p className="workflow-note">Use the download link to open this document in your preferred viewer.</p>}
      {url ? <a className="button-primary" href={url} download={attachment.name}>Download local file</a> : <p role="status">Preparing local preview…</p>}
    </Dialog>
  );
}

export function FilePicker({ label, onSelect, registerFile, busyChange, shouldFail }: {
  label: string; onSelect: (attachment: Attachment) => void;
  registerFile: (file: File) => Attachment; busyChange: (delta: number) => void; shouldFail: () => boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function select(file: File, sample = false) {
    const invalid = fileError(file);
    setError(invalid ?? "");
    if (invalid) { if (input.current) input.current.value = ""; return; }
    setBusy(true);
    busyChange(1);
    try {
      if (shouldFail()) throw new Error("Demo upload failed. Upload again by choosing a file anew.");
      await file.slice(0, 8).arrayBuffer();
      onSelect({ ...registerFile(file), sample });
    } catch {
      setError("The file could not be attached. Upload again by choosing a file anew.");
    } finally {
      setBusy(false);
      busyChange(-1);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <div className="file-picker">
      <label><span>{label}</span><input ref={input} type="file" accept={FILE_ACCEPT} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void select(file); }} /></label>
      <div className="file-picker-hint"><span>Documents and images · up to 100 MB each · local demo</span><button type="button" className="text-action" disabled={busy} onClick={() => void select(new File(["DEMO DOCUMENT — no real transaction.\n"], "demo-document.txt", { type: "text/plain" }), true)}>Use demo document</button></div>
      {busy && <p role="status">Preparing file locally…</p>}
      {error && <div className="field-error" role="alert"><p>{error}</p><button type="button" className="text-action" onClick={() => input.current?.click()}>Upload again</button></div>}
    </div>
  );
}

export default function CustomerWorkspace({ workspaceId, navigate }: { workspaceId: WorkspaceId; navigate: (id: WorkspaceId) => void }) {
  const { state, dispatch: sharedDispatch, registerFile, getFile, resetDemo } = useWorkshop();
  const scope = `Customer:${workspaceId}`;
  const dispatch = (action: Update) => sharedDispatch({ transform: (data) => ({ ...data, requests: action.transform(data).requests }), message: action.message, scope });
  const [selectedId, setSelectedId] = useState("");
  const [creating, setCreating] = useState(false);
  const [details, setDetails] = useState("");
  const [customerType, setCustomerType] = useState<CustomerType>("individual");
  const [requestFiles, setRequestFiles] = useState<Attachment[]>([]);
  const [evidence, setEvidence] = useState<{ requestId: string; deposit?: Attachment; po?: Attachment }>({ requestId: "" });
  const [amount, setAmount] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [uploads, setUploads] = useState(0);
  const [preview, setPreview] = useState<{ attachment: Attachment; url: string }>();
  const [prompt, setPrompt] = useState<{ title: string; body: string; action: () => void }>();
  const previewUrls = useRef(new Set<string>());
  const failNextFile = useRef(false);
  const busyChange = (delta: number) => setUploads((value) => value + delta);

  useEffect(() => {
    const urls = previewUrls.current;
    return () => { urls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);

  function shouldFail() { const fail = failNextFile.current; failNextFile.current = false; return fail; }
  const pickerProps = { registerFile, busyChange, shouldFail };
  function updateRequest(id: string, transform: (request: CustomerRequest) => CustomerRequest, message: string) {
    dispatch({ transform: (data) => ({ ...data, requests: data.requests.map((request) => request.id === id ? transform(request) : request) }), message });
  }
  function selectRequest(id: string) { setSelectedId(id); setEvidence({ requestId: id }); setAmount(""); setPaymentError(""); }
  function respond(id: string, response: "approved" | "rejected", message: string) {
    const at = new Date().toISOString();
    updateRequest(id, (request) => respondToQuotation(request, response, at), message);
  }
  function openPreview(attachment: Attachment) {
      const file = getFile(attachment.id) ?? (attachment.sample ? new File(["DEMO DOCUMENT — no real transaction."], attachment.name, { type: "text/plain" }) : undefined);
      if (!file) return;
      const url = URL.createObjectURL(file);
      previewUrls.current.add(url);
      setPreview({ attachment, url });
  }
  function fileLink(attachment: Attachment) {
    return <AttachmentButton key={attachment.id} attachment={attachment} open={openPreview} />;
  }

  if (workspaceId === "overview") return null;

  const visible = state.data.requests.filter((request) => {
    if (workspaceId === "quotations") return request.quotations.some((quotation) => quotation.status !== "draft");
    if (workspaceId === "deposit-po") return !!request.acceptedAt && !request.invoice;
    if (workspaceId === "delivery-payment") return !!request.delivery && !!request.invoice;
    return true;
  });
  const selected = visible.find((request) => request.id === selectedId) ?? visible[0];
  const quotation = selected && latestQuotation(selected);
  const terms = selected && quotation ? confirmationTerms(selected.customerType, quotation.price) : undefined;
  const deposit = evidence.requestId === selected?.id ? evidence.deposit : undefined;
  const po = evidence.requestId === selected?.id ? evidence.po : undefined;

  const uploadFields = (requestId: string) => <div className="confirmation-files" key={requestId}>
    {!!terms?.deposit && <div><FilePicker label={`Deposit evidence — ${money(terms.deposit)}`} onSelect={(file) => setEvidence((current) => ({ ...(current.requestId === requestId ? current : {}), requestId, deposit: file }))} {...pickerProps} />{deposit && fileLink(deposit)}</div>}
    {terms?.poRequired && <div><FilePicker label="Customer PO document" onSelect={(file) => setEvidence((current) => ({ ...(current.requestId === requestId ? current : {}), requestId, po: file }))} {...pickerProps} />{po && fileLink(po)}</div>}
  </div>;

  return (
    <section className="customer-workflow" aria-label="Customer demo workflow">
      <div className="workflow-toolbar"><p>Shared demo records survive role switches · reload or reset clears all roles</p>{workspaceId === "requests" && <button className="button-primary" onClick={() => setCreating(true)}>+ New request</button>}</div>
      {state.message && state.scope === scope && <p className="workflow-success" role="status">{state.message}</p>}
      {state.error && state.scope === scope && <p className="field-error" role="alert">{state.error}</p>}

      {creating && workspaceId === "requests" && <section className="workflow-form-panel" aria-labelledby="new-request-heading">
        <h2 id="new-request-heading">New manufacturing request</h2>
        <form onSubmit={(event) => {
          event.preventDefault();
          if (!details.trim() || uploads) return;
          const request: CustomerRequest = { id: crypto.randomUUID(), details: details.trim(), customerType, createdAt: new Date().toISOString(), status: "pending", attachments: requestFiles, quotations: [], rejections: 0 };
          dispatch({ transform: (data) => ({ ...data, requests: [request, ...data.requests] }), message: "Demo request submitted. It is pending a Worker estimate." });
          selectRequest(request.id); setCreating(false); setDetails(""); setRequestFiles([]);
        }}>
          <div className="form-field"><label htmlFor="customer-type">Customer type</label><select id="customer-type" value={customerType} onChange={(event) => setCustomerType(event.target.value as CustomerType)}><option value="individual">Individual</option><option value="company">Company</option></select></div>
          <label className="form-field">Job details<textarea required rows={4} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Describe the work you need and refer to your attached drawings." /></label>
          <FilePicker key={requestFiles.length} label="Drawings and supporting documents (optional)" onSelect={(file) => setRequestFiles((items) => [...items, file])} {...pickerProps} />
          <div className="attachment-list">{requestFiles.map((file) => <div key={file.id}>{fileLink(file)}<button type="button" className="text-action" onClick={() => setRequestFiles((items) => items.filter((item) => item.id !== file.id))}>Remove {file.name}</button></div>)}</div>
          <div className="form-actions"><button className="button-primary" disabled={uploads > 0 || !details.trim()}>Submit demo request</button><button type="button" className="button-secondary" disabled={uploads > 0} onClick={() => setCreating(false)}>Cancel</button></div>
        </form>
      </section>}

      {visible.length ? <div className="record-layout">
        <div className="record-list" aria-label="Demo records">{visible.map((request) => <button className={`record-list-item ${request.id === selected?.id ? "selected" : ""}`} key={request.id} aria-pressed={request.id === selected?.id} onClick={() => selectRequest(request.id)}><span>{request.customerType} · demo</span><strong>{request.details}</strong><span className="record-list-bottom"><Status>{workspaceId === "quotations" ? latestQuotation(request)?.status : workspaceId === "delivery-payment" ? invoiceStatus(request) : request.status}</Status><span>{date(request.createdAt)}</span></span></button>)}</div>
        {selected && <article className="record-detail">
          <div className="record-heading"><div><p className="eyebrow">{selected.customerType} · DEMO RECORD</p><h2>{selected.details}</h2></div><Status>{selected.status}</Status></div>
          <p className="record-id">Request ID: {selected.id}</p>

          {workspaceId === "requests" && <>
            <dl className="detail-grid"><div><dt>Submitted</dt><dd>{date(selected.createdAt)}</dd></div><div><dt>Request status</dt><dd>{selected.status}</dd></div><div><dt>Production status</dt><dd>{selected.job?.status ?? "Not opened"}</dd></div><div><dt>Quotation</dt><dd>{quotation?.status ?? "Awaiting Worker estimate"}</dd></div></dl>
            <h3>Attached documents</h3><div className="attachment-list">{selected.attachments.length ? selected.attachments.map(fileLink) : <p className="text-muted">No attachments on this request.</p>}</div>
            {selected.depositProof && fileLink(selected.depositProof)}{selected.poProof && fileLink(selected.poProof)}
            {quotation && <button className="button-secondary" onClick={() => navigate("quotations")}>Open quotations</button>}
          </>}

          {workspaceId === "quotations" && quotation && <>
            <div className="price-summary"><span>Quoted price · no VAT</span><strong>{money(quotation.price)}</strong><span>Revision {quotation.revision} · {quotation.status}</span></div>
            <div className="terms-summary"><strong>Confirmation requirements</strong><p>{terms?.poRequired ? "Customer PO required" : "No PO required"} · {terms?.deposit ? `${money(terms.deposit)} Deposit (50%)` : "No Deposit required"}</p><p>Submit required evidence within 14 days after acceptance.</p></div>
            <p className="workflow-note">Customer rejections: <strong>{selected.rejections} / 5</strong>. The fifth rejection cancels the request.</p>
            {quotation.status === "sent" && selected.status !== "canceled" && <div className="form-actions"><button className="button-primary" onClick={() => setPrompt({ title: "Accept this quotation?", body: `Accept ${money(quotation.price)} and start the 14-day Deposit/PO submission period?`, action: () => respond(selected.id, "approved", "Quotation approved. Continue to Deposit & PO to confirm the order.") })}>Accept quotation</button><button className="button-danger" onClick={() => setPrompt({ title: "Reject this quotation?", body: selected.rejections === 4 ? "This is the fifth rejection. The request will be canceled." : "This response counts toward the five-rejection limit. A Worker must issue another quotation before you can respond again.", action: () => respond(selected.id, "rejected", selected.rejections === 4 ? "Fifth rejection recorded. The request is canceled." : "Quotation rejected. Waiting for a Worker revision.") })}>Reject quotation</button></div>}
            {quotation.status === "approved" && <button className="button-primary" onClick={() => navigate("deposit-po")}>Continue to Deposit & PO</button>}
            <details className="revision-history"><summary>Quotation revision history ({selected.quotations.filter((item) => item.status !== "draft").length})</summary>{selected.quotations.filter((item) => item.status !== "draft").map((item) => <p key={item.id}>Revision {item.revision}<span>{money(item.price)}</span><Status>{item.status}</Status></p>)}</details>
          </>}

          {workspaceId === "deposit-po" && quotation && <>
            <div className="terms-summary"><strong>{money(quotation.price)} · {selected.customerType}</strong><p>{terms?.poRequired ? "PO required" : "No PO required"} · {terms?.deposit ? `Deposit required: ${money(terms.deposit)}` : "No Deposit required"}</p><p>Accepted: {selected.acceptedAt && date(selected.acceptedAt)}</p><p>Deadline: {date(confirmationDeadline(selected)!)}</p></div>
            {selected.status === "canceled" ? <p className="field-error">The request is canceled. Deposit/PO submission is unavailable.</p> : selected.job ? <div className="workflow-success"><strong>Order confirmed · JOB {selected.job.status}</strong><p>Job ID: {selected.job.id}</p>{selected.depositProof && fileLink(selected.depositProof)}{selected.poProof && fileLink(selected.poProof)}</div> : <form onSubmit={(event) => { event.preventDefault(); if (uploads) return; const at = new Date().toISOString(); const jobId = crypto.randomUUID(); updateRequest(selected.id, (request) => submitConfirmation(request, { deposit, po }, at, jobId), "Demo evidence submitted. The production job is queued."); }}>
              {uploadFields(selected.id)}<button className="button-primary" disabled={uploads > 0 || (!!terms?.deposit && !deposit) || (!!terms?.poRequired && !po)}>Submit demo confirmation</button><p className="workflow-note">Local evidence is treated as received for this prototype. Real verification is part of Backend integration.</p>
            </form>}
          </>}

          {workspaceId === "delivery-payment" && selected.invoice && <>
            <dl className="detail-grid"><div><dt>Delivery</dt><dd><Status>{selected.delivery?.status}</Status></dd></div><div><dt>Invoice</dt><dd><Status>{invoiceStatus(selected)}</Status></dd></div><div><dt>Quoted price</dt><dd>{quotation && money(quotation.price)}</dd></div><div><dt>Deposit already deducted</dt><dd>{terms && money(terms.deposit)}</dd></div></dl>
            {selected.delivery?.status === "shipping" && <div className="form-actions"><button className="button-primary" onClick={() => setPrompt({ title: "Accept delivery?", body: "Confirm that the delivered work is accepted in this demo.", action: () => updateRequest(selected.id, (request) => inspectDelivery(request, "delivered"), "Delivery accepted.") })}>Accept delivery</button><button className="button-danger" onClick={() => setPrompt({ title: "Return this work?", body: "Delivery will be returned and the production job will move back to in_progress.", action: () => updateRequest(selected.id, (request) => inspectDelivery(request, "returned"), "Work returned. The job is back in production.") })}>Return work</button></div>}
            <div className="balance-strip"><div><span>Invoice total</span><strong>{money(selected.invoice.total)}</strong></div><div><span>Outstanding balance</span><strong>{money(invoiceBalance(selected))}</strong></div></div>
            {invoiceBalance(selected) > 0 && selected.delivery?.status !== "returned" && <form className="payment-form" onSubmit={(event) => { event.preventDefault(); const value = parsePaymentInput(amount); if (!value) { setPaymentError("Enter a positive amount with at most two decimal places."); return; } setPaymentError(""); const payment = { id: crypto.randomUUID(), amount: value, at: new Date().toISOString() }; updateRequest(selected.id, (request) => recordPayment(request, payment), "Demo installment recorded. The sample invoice has been updated."); setAmount(""); }}>
              <label className="form-field">Installment amount (THB)<input required type="text" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" /></label>{paymentError && <p className="field-error" role="alert">{paymentError}</p>}<button className="button-primary">Record demo installment</button><p className="workflow-note">Updates this local sample only. No money is transferred.</p>
            </form>}
            {selected.delivery?.status === "returned" && <p className="workflow-note">Payment recording is paused while this work is returned.</p>}
            <h3>Payment history</h3>{selected.invoice.payments.length ? <ul className="payment-history">{selected.invoice.payments.map((payment) => <li key={payment.id}><span>{date(payment.at)}</span><strong>{money(payment.amount)}</strong></li>)}</ul> : <p className="text-muted">No installments recorded yet.</p>}
          </>}
        </article>}
      </div> : <div className="empty-panel"><h2>No records here yet</h2><p className="text-muted">Accept a quotation to see its Deposit/PO requirements.</p><button className="button-secondary" onClick={() => navigate("quotations")}>Open quotations</button></div>}

      <details className="demo-tools"><summary>Demo tools</summary><p>These controls affect shared sample data for all roles in this browser view.</p><button className="button-secondary" onClick={() => { failNextFile.current = true; dispatch({ transform: (data) => data, message: "The next file attachment will fail once so you can try Upload again." }); }}>Fail next file attachment</button><button className="button-secondary" onClick={() => setPrompt({ title: "Reset sample data?", body: "All roles' local demo changes and attachments will be replaced with the original sample scenarios.", action: () => { selectRequest(""); setCreating(false); setRequestFiles([]); failNextFile.current = false; resetDemo(scope); } })}>Reset sample data</button></details>
      {prompt && <Dialog title={prompt.title} close={() => setPrompt(undefined)}><p className="text-muted">{prompt.body}</p><div className="form-actions"><button className="button-primary" onClick={() => { prompt.action(); setPrompt(undefined); }}>Confirm</button><button className="button-secondary" onClick={() => setPrompt(undefined)}>Cancel</button></div></Dialog>}
      {preview && <FilePreview attachment={preview.attachment} url={preview.url} close={() => { URL.revokeObjectURL(preview.url); previewUrls.current.delete(preview.url); setPreview(undefined); }} />}
    </section>
  );
}
