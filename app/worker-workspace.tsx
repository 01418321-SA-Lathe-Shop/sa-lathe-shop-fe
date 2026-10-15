"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Role, WorkspaceId } from "./demo-access";
import { invoiceBalance, invoiceStatus, recordPayment, type Attachment, type CustomerRequest } from "./customer-domain";
import { FilePicker, FilePreview } from "./customer-workspace";
import { parsePaymentInput } from "./customer-files";
import { useWorkshop } from "./workshop-context";
import * as rules from "./worker-domain";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "THB", minimumFractionDigits: 2 });
const dates = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });
const money = (value: number) => currency.format(value / 100);
const date = (value: string) => `${dates.format(new Date(value))} ICT`;
const uuid = () => crypto.randomUUID();
function amount(form: FormData, name: string): number {
  const value = String(form.get(name) ?? "").trim();
  if (/^0(\.0{1,2})?$/.test(value)) return 0;
  const result = parsePaymentInput(value);
  if (result === undefined) throw new Error(`${name}: enter a nonnegative amount with at most two decimal places.`);
  return result;
}
function count(form: FormData, name: string) { return Number(form.get(name)); }
function Status({ children }: { children: ReactNode }) { return <span className={`record-status status-${String(children)}`}>{children}</span>; }
function Empty({ children }: { children: ReactNode }) { return <p className="workflow-note" role="status">{children}</p>; }
function MoneyInput({ name, value = "" }: { name: string; value?: string }) { return <label className="form-field">{name}<input name={name} required inputMode="decimal" defaultValue={value} placeholder="0.00" /></label>; }
function QuantityInput({ name, value = 1, zero = false }: { name: string; value?: number; zero?: boolean }) { return <label className="form-field">{name}<input name={name} required type="number" min={zero ? 0 : 1} max={1000000} step={1} defaultValue={value} /></label>; }
function useActions(scope: string) {
  const { state, dispatch } = useWorkshop();
  function act(transform: (data: rules.WorkshopState) => rules.WorkshopState, message: string) { dispatch({ transform, message, scope }); }
  return { data: state.data, act };
}
function Attachments({ files }: { files: Attachment[] }) {
  const { getFile } = useWorkshop();
  const [preview, setPreview] = useState<{ attachment: Attachment; url: string }>();
  const urls = useRef(new Set<string>());
  useEffect(() => { const current = urls.current; return () => current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  function open(attachment: Attachment) {
    const file = getFile(attachment.id) ?? (attachment.sample ? new File(["Synthetic demo document; no real transaction."], attachment.name, { type: "text/plain" }) : undefined);
    if (!file) return;
    const url = URL.createObjectURL(file); urls.current.add(url); setPreview({ attachment, url });
  }
  return <div className="attachment-list">{files.map((file) => <button type="button" key={file.id} className="attachment-link" onClick={() => open(file)}>{file.name}<span>View</span></button>)}{preview && <FilePreview {...preview} close={() => { URL.revokeObjectURL(preview.url); urls.current.delete(preview.url); setPreview(undefined); }} />}</div>;
}
function Evidence({ value, change, busyChange }: { value: Attachment[]; change: (value: Attachment[]) => void; busyChange: (delta: number) => void }) {
  const { registerFile } = useWorkshop();
  const failNext = useRef(false);
  return <><FilePicker label="Evidence documents / images (optional)" registerFile={registerFile} busyChange={busyChange} shouldFail={() => { const fail = failNext.current; failNext.current = false; return fail; }} onSelect={(file) => change([...value, file])} /><Attachments files={value} /><button type="button" className="text-action" onClick={() => { failNext.current = true; }}>Fail next evidence upload (demo)</button></>;
}
function JobPicker({ requests, value, change }: { requests: CustomerRequest[]; value: string; change: (id: string) => void }) {
  return <label className="form-field">Production job<select aria-label="Production job" value={value} onChange={(event) => change(event.target.value)}>{requests.map((request) => <option key={request.id} value={request.job!.id}>{request.details} · {request.job!.status}</option>)}</select></label>;
}
function PlanFacts({ data, jobId }: { data: rules.WorkshopState; jobId: string }) {
  const plans = data.plans.filter((plan) => plan.jobId === jobId);
  return plans.length ? <div className="table-scroll" tabIndex={0} role="region" aria-label="Planned material quantities"><table className="workflow-table"><thead><tr><th>Planned material</th><th>Required</th><th>Used</th><th>Reserved for job</th><th>Free stock</th><th>Incoming for job</th></tr></thead><tbody>{plans.map((plan) => {
    const need = rules.materialNeed(data, jobId, plan.materialId);
    return <tr key={plan.materialId}><th>{data.materials.find((material) => material.id === plan.materialId)?.name}</th><td>{need.planned}</td><td>{need.used}</td><td>{need.reserved}</td><td>{need.available}</td><td>{need.incoming}</td></tr>;
  })}</tbody></table></div> : <Empty>No planned materials yet. Save a plan in Materials.</Empty>;
}

function Quotations({ scope }: { scope: string }) {
  const { data, act } = useActions(scope);
  const [selectedId, setSelectedId] = useState("");
  const request = data.requests.find((item) => item.id === selectedId) ?? data.requests[0];
  if (!request) return <Empty>No requests awaiting an estimate.</Empty>;
  const quotation = request.quotations.at(-1);
  const editable = !request.job && !request.acceptedAt && request.status !== "canceled" && (!quotation || quotation.status === "draft" || quotation.status === "rejected");
  return <div className="record-layout"><div className="record-list" aria-label="Estimate requests">{data.requests.map((item) => <button key={item.id} className={`record-list-item ${request.id === item.id ? "selected" : ""}`} aria-pressed={request.id === item.id} onClick={() => setSelectedId(item.id)}><strong>{item.details}</strong><span>{item.customerType} · {item.rejections}/5 Customer rejections</span><Status>{item.quotations.at(-1)?.status ?? item.status}</Status></button>)}</div><article className="record-detail"><div className="record-heading"><h2>{request.details}</h2><Status>{request.status}</Status></div><p className="record-id">Request ID: {request.id}</p><Attachments files={request.attachments} />
    {editable ? <form key={`${request.id}:${quotation?.id}`} onSubmit={(event) => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const id = uuid();
      const send = (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "send";
      act((current) => rules.saveQuotation(current, request.id, { material: amount(form, "Material cost (THB)"), labor: amount(form, "Labor cost (THB)") }, amount(form, "Final price (THB)"), id, send), send ? "Demo quotation sent to Customer." : "Quotation draft saved; not visible to Customer.");
    }}><div className="worker-form-grid"><MoneyInput name="Material cost (THB)" value={quotation?.costs ? String(quotation.costs.material / 100) : ""} /><MoneyInput name="Labor cost (THB)" value={quotation?.costs ? String(quotation.costs.labor / 100) : ""} /><MoneyInput name="Final price (THB)" value={quotation ? String(quotation.price / 100) : ""} /></div><p className="workflow-note">Minimum price = (material + labor) × 1.60. No VAT. Two-decimal demo input; prices requiring half-satang Deposit are rejected, not rounded.</p><div className="form-actions"><button className="button-secondary" name="action" value="draft">Save draft</button><button className="button-primary" name="action" value="send">Send quotation</button><button type="button" className="button-danger" onClick={() => { if (window.confirm("Reject this demo request and set JOB_REQUEST to canceled?")) act((current) => rules.rejectRequest(current, request.id), "Request canceled by Worker."); }}>Reject request</button></div></form> : <Empty>{request.status === "canceled" ? "This request is canceled." : "Quotation is awaiting Customer action, or this request already has a job."}</Empty>}
    <h3>Quotation revisions</h3>{request.quotations.length ? request.quotations.map((item) => <div className="worker-history-row" key={item.id}><span>Revision {item.revision}</span><strong>{money(item.price)}</strong><Status>{item.status}</Status></div>) : <Empty>No quotation yet.</Empty>}
    {request.poProof && <><h3>Customer PO</h3><Attachments files={[request.poProof]} /></>}{request.depositProof && <Attachments files={[request.depositProof]} />}
  </article></div>;
}

function Materials({ scope, navigate }: { scope: string; navigate: (id: WorkspaceId) => void }) {
  const { data, act } = useActions(scope);
  const [search, setSearch] = useState(""); const [jobId, setJobId] = useState("");
  const jobs = data.requests.filter((request) => request.job?.status === "queued");
  const job = jobs.find((request) => request.job?.id === jobId) ?? jobs[0];
  const materials = data.materials.filter((material) => material.name.toLowerCase().includes(search.toLowerCase().trim()));
  return <><section className="workflow-form-panel"><h2>Inventory at a glance</h2><label className="form-field">Search materials<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search existing material names" /></label>{materials.length ? <div className="stock-cards">{materials.map((material) => <article key={material.id} className="stock-card"><h3>{material.name}</h3><dl className="detail-grid"><div><dt>On hand ({material.unit})</dt><dd>{material.onHand}</dd></div><div><dt>Active reservations</dt><dd>{rules.reservedQuantity(data, material.id)}</dd></div><div><dt>Available</dt><dd>{rules.availableQuantity(data, material.id)}</dd></div><div><dt>Moving Average / {material.unit}</dt><dd>{money(rules.costForDisplay(material.avgCost))}</dd></div></dl></article>)}</div> : <Empty>No materials match this search.</Empty>}</section>
    <section className="workflow-form-panel"><h2>Saved material plan & reservation</h2><p className="workflow-note">Demo uses whole pieces. Automatic shortage recommendations are disabled: the formula is To be defined. Counts below are facts, not an order recommendation.</p>{job ? <><JobPicker requests={jobs} value={job.job!.id} change={setJobId} /><PlanFacts data={data} jobId={job.job!.id} />
      <form key={job.job!.id} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); act((current) => { const materialId = String(form.get("Material")); return rules.savePlan(current, job.job!.id, [...current.plans.filter((plan) => plan.jobId === job.job!.id && plan.materialId !== materialId), { materialId, quantity: count(form, "Required quantity (pcs)") }]); }, "Planned material saved for this JOB."); }}><div className="worker-form-grid"><label className="form-field">Material<select aria-label="Material" name="Material">{data.materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select></label><QuantityInput name="Required quantity (pcs)" /></div><button className="button-secondary" disabled={data.reservations.some((line) => line.jobId === job.job!.id) || data.orders.some((order) => order.jobId === job.job!.id && order.status !== "cancelled")}>Save / update planned material</button></form>
      <div className="form-actions"><button className="button-primary" onClick={() => { const ids = Object.fromEntries(data.materials.map((material) => [material.id, uuid()])); act((current) => rules.reserveJob(current, job.job!.id, ids), "Available planned materials reserved. Check quantities before continuing."); }}>Reserve available planned stock</button><button className="button-secondary" onClick={() => navigate("orders")}>Open material orders</button></div><p className="workflow-note">Demo safety gate: edit plans before reservations/orders. Release and variance rules are To be defined. Receiving never starts production automatically; recheck stock manually.</p></> : <Empty>No queued jobs. Confirm a Customer quotation and required Deposit/PO first.</Empty>}</section>
    <section className="workflow-form-panel"><h2>Stock movement ledger</h2><div className="worker-ledger">{data.movements.toReversed().map((movement) => <div key={movement.id} className="worker-history-row"><span>{data.materials.find((material) => material.id === movement.materialId)?.name}<small>{date(movement.at)} · {movement.reference}</small></span><strong>{movement.quantity > 0 ? "+" : ""}{movement.quantity} pcs</strong><Status>{movement.kind}</Status></div>)}</div><p className="workflow-note">Cost is stored as an exact ratio internally; displayed average is formatted to two decimals only. Production precision remains open.</p></section>
  </>;
}

function Orders({ scope, role, navigate }: { scope: string; role: Role; navigate: (id: WorkspaceId) => void }) {
  const { data, act } = useActions(scope); const [jobId, setJobId] = useState("");
  const jobs = data.requests.filter((request) => request.job?.status === "queued");
  const job = jobs.find((request) => request.job?.id === jobId) ?? jobs[0];
  const plans = data.plans.filter((plan) => plan.jobId === job?.job?.id);
  return <><section className="workflow-form-panel"><h2>Order from a Supplier</h2><p className="workflow-note">Admin and Worker may perform UC6. Quantities are manually entered for this demo; automatic shortage calculation and order validation policy are To be defined. Review active orders before adding another.</p>{job ? <><JobPicker requests={jobs} value={job.job!.id} change={setJobId} /><PlanFacts data={data} jobId={job.job!.id} />{plans.length ? <form key={job.job!.id} onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const id = uuid(), itemId = uuid(), at = new Date().toISOString(); act((current) => rules.createOrder(current, job.job!.id, String(form.get("Supplier")), [{ id: itemId, materialId: String(form.get("Order material")), quantity: count(form, "Order quantity (pcs)"), unitPrice: amount(form, "Unit price (THB)") }], id, at), "Demo material order created. No real Supplier was contacted."); }}><div className="worker-form-grid"><label className="form-field">Supplier<select aria-label="Supplier" name="Supplier">{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><label className="form-field">Order material<select aria-label="Order material" name="Order material">{plans.map((plan) => <option key={plan.materialId} value={plan.materialId}>{data.materials.find((material) => material.id === plan.materialId)?.name}</option>)}</select></label><QuantityInput name="Order quantity (pcs)" /><MoneyInput name="Unit price (THB)" /></div><button className="button-primary">Create demo material order</button></form> : <Empty>This job needs a saved material plan. A Worker can save it in Materials.</Empty>}</> : <Empty>No queued jobs available for material ordering.</Empty>}</section>
    <section className="workflow-form-panel"><h2>Material orders ({data.orders.length})</h2>{data.orders.length ? data.orders.toReversed().map((order) => <article className="supplier-order" key={order.id}><div className="record-heading"><h3>{data.suppliers.find((supplier) => supplier.id === order.supplierId)?.name}</h3><Status>{order.status}</Status></div><p className="record-id">Order ID: {order.id} · {date(order.at)}</p><p className="workflow-note">{data.requests.find((request) => request.job?.id === order.jobId)?.details} · Supplier payment: {order.paymentStatus}</p>{order.items.map((item) => <div className="worker-history-row" key={item.id}><span>{data.materials.find((material) => material.id === item.materialId)?.name}<small>{item.quantity} pcs × {money(item.unitPrice)} · Good {item.good} / defective {item.defective}</small></span><Status>{item.status}</Status></div>)}{role === "Worker" && order.status === "ordered" && <button className="button-danger" onClick={() => { if (window.confirm("Simulate Supplier rejecting this untouched demo order?")) act((current) => rules.cancelSupplierOrder(current, order.id), "Supplier rejection simulated. Order cancelled."); }}>Simulate Supplier rejection</button>}</article>) : <Empty>No material orders yet.</Empty>}{role === "Worker" && <button className="button-secondary" onClick={() => navigate("receiving")}>Open receiving</button>}</section></>;
}

function Receiving({ scope, navigate }: { scope: string; navigate: (id: WorkspaceId) => void }) {
  const { data, act } = useActions(scope);
  const [orderId, setOrderId] = useState("");
  const orders = data.orders.filter((order) => order.status !== "cancelled");
  const order = orders.find((item) => item.id === orderId) ?? orders[0];
  return <><section className="workflow-form-panel"><h2>Receive good & defective goods</h2><p className="workflow-note">Good receipts update on-hand stock, Moving Average, and the ledger together. Defects never enter usable stock. Partial item status is a documented proposal, shown here for demo review.</p>{order ? <><label className="form-field">Material order<select aria-label="Material order" value={order.id} onChange={(event) => setOrderId(event.target.value)}>{orders.map((item) => <option key={item.id} value={item.id}>{item.id.slice(-12)} · {data.suppliers.find((supplier) => supplier.id === item.supplierId)?.name} · {item.status}</option>)}</select></label><p className="workflow-note">Order status: {order.status} · Supplier payment: {order.paymentStatus}</p>{order.items.map((item) => <article className="supplier-order" key={item.id}><h3>{data.materials.find((material) => material.id === item.materialId)?.name}</h3><p className="workflow-note">Ordered {item.quantity} · Good {item.good} · Defective {item.defective} · Remaining {item.quantity - item.good - item.defective}</p>{item.quantity > item.good + item.defective && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); const ids = { receipt: uuid(), movement: uuid(), defect: uuid() }, at = new Date().toISOString(); act((current) => rules.receiveMaterial(current, order.id, item.id, count(form, "Good quantity (pcs)"), count(form, "Defective quantity (pcs)"), ids, at), "Receipt recorded. Good stock and defect log updated together."); }}><div className="worker-form-grid"><QuantityInput name="Good quantity (pcs)" zero value={0} /><QuantityInput name="Defective quantity (pcs)" zero value={0} /></div><button className="button-primary">Record demo receipt</button></form>}</article>)}
      {order.paymentStatus === "unpaid" && <div className="form-actions"><button className="button-secondary" onClick={() => act((current) => rules.recordSupplierPayment(current, order.id, false), "Demo Supplier payment marked paid. No money transferred.")}>Simulate Supplier paid</button><button className="button-secondary" onClick={() => act((current) => rules.recordSupplierPayment(current, order.id, true), "CREDIT marked pending; settlement workflow is To be defined.")}>Record CREDIT pending</button></div>}<p className="workflow-note">Payment methods and pending-credit settlement are To be defined. This is a status simulation only.</p><button className="button-secondary" onClick={() => navigate("materials")}>Recheck stock manually</button>
    </> : <Empty>No active material orders. Create one in Material orders.</Empty>}</section>
    <section className="workflow-form-panel"><h2>Receipt history</h2>{data.receipts.length ? data.receipts.toReversed().map((receipt) => <div key={receipt.id} className="worker-history-row"><span>{date(receipt.at)}<small>Order {receipt.orderId}</small></span><strong>Good {receipt.good} / defective {receipt.defective}</strong></div>) : <Empty>No receipts recorded.</Empty>}<h3>Defect & claim log</h3>{data.defects.length ? data.defects.map((defect) => <div key={defect.id} className="worker-history-row"><span>{data.materials.find((material) => material.id === defect.materialId)?.name} · {defect.quantity} pcs</span><Status>{defect.status}</Status>{defect.status === "PENDING_CLAIM" && <button className="button-secondary" onClick={() => act((current) => rules.recordClaim(current, defect.id), "Supplier notification simulated; claim marked CLAIMED.")}>Simulate claim notification</button>}</div>) : <Empty>No defective materials recorded.</Empty>}<p className="workflow-note">No real notification is sent. RESOLVED and WRITTEN_OFF transitions remain To be defined.</p></section></>;
}

function ProductionJob({ request, scope }: { request: CustomerRequest; scope: string }) {
  const { data, act } = useActions(scope); const job = request.job!;
  const [evidence, setEvidence] = useState<Attachment[]>(job.actual?.evidence ?? []); const [uploads, setUploads] = useState(0);
  const plans = data.plans.filter((plan) => plan.jobId === job.id);
  const ready = plans.length > 0 && plans.every((plan) => { const need = rules.materialNeed(data, job.id, plan.materialId); return need.used + need.reserved >= need.planned; });
  return <><div className="record-heading"><h2>{request.details}</h2><Status>{job.status}</Status></div><p className="record-id">Job ID: {job.id}</p><PlanFacts data={data} jobId={job.id} />{job.status === "queued" && <><button className="button-primary" disabled={!ready} onClick={() => act((current) => rules.startJob(current, job.id), "Production started.")}>Start production</button><p className="workflow-note">Demo safety gate: all saved planned quantities must be reserved before starting. Final shortage/handoff policy is To be defined.</p></>}
    {job.status === "in_progress" && <><h3>Issue reserved material</h3>{plans.length ? <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget), ids = { usage: uuid(), movement: uuid(), consumed: uuid() }, at = new Date().toISOString(); act((current) => rules.issueMaterial(current, job.id, String(form.get("Issue material")), count(form, "Issue quantity (pcs)"), ids, at), "Material issued: stock, reservation, usage and ledger updated together."); }}><div className="worker-form-grid"><label className="form-field">Issue material<select aria-label="Issue material" name="Issue material">{plans.map((plan) => <option key={plan.materialId} value={plan.materialId}>{data.materials.find((material) => material.id === plan.materialId)?.name}</option>)}</select></label><QuantityInput name="Issue quantity (pcs)" /></div><button className="button-secondary">Issue demo material</button></form> : <Empty>No planned materials are available to issue.</Empty>}
    <h3>Actual cost, time & evidence</h3><form onSubmit={(event) => { event.preventDefault(); if (uploads) return; const form = new FormData(event.currentTarget); act((current) => rules.recordActuals(current, job.id, { cost: amount(form, "Actual cost (THB)"), minutes: count(form, "Actual time (minutes)"), evidence }), "Actual cost/time and evidence saved."); }}><div className="worker-form-grid"><MoneyInput name="Actual cost (THB)" value={job.actual ? String(job.actual.cost / 100) : ""} /><QuantityInput name="Actual time (minutes)" zero value={job.actual?.minutes ?? 0} /></div><Evidence value={evidence} change={setEvidence} busyChange={(delta) => setUploads((count) => count + delta)} /><div className="form-actions"><button className="button-secondary" disabled={uploads > 0}>Save actual cost & time</button><button type="button" className="button-primary" disabled={uploads > 0 || !job.actual} onClick={() => act((current) => rules.completeJob(current, job.id), "Production completed. Continue to Delivery & payments.")}>Complete production</button></div></form><p className="workflow-note">Demo safety gate: issue all planned material before completion to avoid silently releasing reservations. Variance/release policy and the exact meaning of actual cost/time need confirmation.</p></>}
    {job.actual && <dl className="detail-grid"><div><dt>Saved actual cost</dt><dd>{money(job.actual.cost)}</dd></div><div><dt>Saved actual time</dt><dd>{job.actual.minutes} minutes</dd></div></dl>}
    <h3>Material usage</h3>{data.usages.some((usage) => usage.jobId === job.id) ? data.usages.filter((usage) => usage.jobId === job.id).map((usage) => <div key={usage.id} className="worker-history-row"><span>{data.materials.find((material) => material.id === usage.materialId)?.name}<small>{date(usage.at)}</small></span><strong>{usage.quantity} pcs · {money(rules.costForDisplay(usage.cost))}</strong></div>) : <Empty>No materials issued yet.</Empty>}
  </>;
}
function Production({ scope }: { scope: string }) {
  const { data } = useActions(scope); const [jobId, setJobId] = useState("");
  const jobs = data.requests.filter((request) => request.job);
  const job = jobs.find((request) => request.job?.id === jobId) ?? jobs[0];
  return <section className="workflow-form-panel">{job ? <><JobPicker requests={jobs} value={job.job!.id} change={setJobId} /><ProductionJob key={job.job!.id} request={job} scope={scope} /></> : <Empty>No production jobs yet.</Empty>}</section>;
}

function DeliveryJob({ request, scope }: { request: CustomerRequest; scope: string }) {
  const { act } = useActions(scope); const [evidence, setEvidence] = useState<Attachment[]>([]); const [uploads, setUploads] = useState(0);
  const canDeliver = request.job?.status === "completed" && (!request.delivery || request.delivery.status === "returned");
  return <><div className="record-heading"><h2>{request.details}</h2><Status>{request.delivery?.status ?? request.job?.status}</Status></div><p className="record-id">Job ID: {request.job!.id}</p>{canDeliver && <form onSubmit={(event) => { event.preventDefault(); if (uploads) return; const form = new FormData(event.currentTarget), id = uuid(), invoiceId = uuid(); const method = form.get("Handover method") === "pickup" ? "pickup" : "delivery"; act((current) => rules.createDelivery(current, request.id, { id, method, recipient: String(form.get("Recipient")), evidence }, invoiceId), "Demo delivery recorded. Invoice deducts Deposit once; redelivery preserves the existing invoice."); }}><label className="form-field">Handover method<select aria-label="Handover method" name="Handover method"><option value="delivery">Delivery</option><option value="pickup">Customer pickup</option></select></label><label className="form-field">Recipient<input name="Recipient" required /></label><Evidence value={evidence} change={setEvidence} busyChange={(delta) => setUploads((count) => count + delta)} /><div className="form-actions"><button className="button-primary" disabled={uploads > 0}>{request.invoice ? "Record demo redelivery" : "Create delivery & invoice"}</button></div></form>}
    {request.delivery && <><dl className="detail-grid"><div><dt>Delivery</dt><dd>{request.delivery.status}</dd></div><div><dt>Method / recipient</dt><dd>{request.delivery.method ?? "Sample handover"} · {request.delivery.recipient ?? "Demo customer"}</dd></div></dl><Attachments files={request.delivery.evidence ?? []} />{request.delivery.status === "returned" && request.job?.status !== "completed" && <Empty>Customer returned this work. Complete rework in Production before redelivery.</Empty>}</>}
    {request.invoice && <><p className="record-id">Invoice ID: {request.invoice.id}</p><div className="balance-strip"><div><span>Invoice total · {invoiceStatus(request)}</span><strong>{money(request.invoice.total)}</strong></div><div><span>Outstanding balance</span><strong>{money(invoiceBalance(request))}</strong></div></div>{invoiceBalance(request) > 0 && request.delivery?.status !== "returned" && <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget), id = uuid(), at = new Date().toISOString(); act((current) => ({ ...current, requests: current.requests.map((item) => item.id === request.id ? recordPayment(item, { id, at, amount: amount(form, "Installment amount (THB)") }) : item) }), "Demo installment recorded; no money transferred."); }}><MoneyInput name="Installment amount (THB)" /><button className="button-primary">Record demo installment</button></form>}<h3>Payment history</h3>{request.invoice.payments.length ? request.invoice.payments.map((payment) => <div className="worker-history-row" key={payment.id}><span>{date(payment.at)}</span><strong>{money(payment.amount)}</strong></div>) : <Empty>No installments recorded.</Empty>}</>}
    <p className="workflow-note">Customer inspects work in their own demo workspace. JOB_REQUEST.completed and invoice due dates remain To be defined. No VAT.</p></>;
}
function Deliveries({ scope }: { scope: string }) {
  const { data } = useActions(scope); const [jobId, setJobId] = useState("");
  const jobs = data.requests.filter((request) => request.job?.status === "completed" || request.delivery);
  const job = jobs.find((request) => request.job?.id === jobId) ?? jobs[0];
  return <section className="workflow-form-panel">{job ? <><JobPicker requests={jobs} value={job.job!.id} change={setJobId} /><DeliveryJob key={job.job!.id} request={job} scope={scope} /></> : <Empty>No completed jobs or deliveries yet. Finish production first.</Empty>}</section>;
}

export default function WorkerWorkspace({ workspaceId, role, navigate }: { workspaceId: WorkspaceId; role: Role; navigate: (id: WorkspaceId) => void }) {
  const { state, resetDemo } = useWorkshop(); const scope = `${role}:${workspaceId}`;
  // Admin is authorized for UC6 only; never mount other Worker actions for Admin.
  if (role !== "Worker" && !(role === "Admin" && workspaceId === "orders")) return null;
  if (workspaceId === "overview") return null;
  return <section className="worker-workflow" aria-label={`${role} demo workflow`}><div className="workflow-toolbar"><p>Local demo · shared across role switches · reload/reset clears records</p><button className="button-secondary" onClick={() => { if (window.confirm("Reset shared sample data and attachments for ALL demo roles?")) resetDemo(scope); }}>Reset sample data</button></div>{state.scope === scope && state.message && <p role="status" className="workflow-success">{state.message}</p>}{state.scope === scope && state.error && <p role="alert" className="field-error">{state.error}</p>}
    {workspaceId === "quotations" && <Quotations scope={scope} />}{workspaceId === "materials" && <Materials scope={scope} navigate={navigate} />}{workspaceId === "orders" && <Orders scope={scope} role={role} navigate={navigate} />}{workspaceId === "receiving" && <Receiving scope={scope} navigate={navigate} />}{workspaceId === "production" && <Production scope={scope} />}{workspaceId === "delivery-payment" && <Deliveries scope={scope} />}
  </section>;
}
