"use client";

import { useState } from "react";
import { BackendApi, displayMoney } from "./backend-api";
import { useCommand, useResource } from "./backend-hooks";
import { inventoryDisplay } from "./backend-inventory-domain";
import { MaterialSearch } from "./backend-inventory";
import { allowedActions, lineTotal, orderActionPayload, orderPayload, orderTotal, supplierFields, type DraftLine, type OrderAction, type Supplier, type SupplierOrder } from "./backend-procurement-domain";
import { Feedback, Field, Paging, RetryNote, Status, text } from "./backend-ui";
import { formatBangkok } from "./demo-display";
import type { ProductionSummary } from "./connected-workspace";

type Items<T> = { items: T[] | null };
const ACTION_LABELS: Record<OrderAction, string> = { accept: "Record supplier acceptance", reject: "Record supplier rejection", cancel: "Cancel order" };
const short = (id: string) => id.slice(0, 8);

// UC6 is Admin-only: suppliers, placing immutable orders and recording the
// supplier's response after external contact (no Supplier login exists).
export function LiveProcurement({ api }: { api: BackendApi }) {
  const [offset, setOffset] = useState(0); const [selected, setSelected] = useState(""); const [creating, setCreating] = useState(false);
  const orders = useResource<Items<SupplierOrder>>(api, `/material-orders?limit=20&offset=${offset}`);
  return <>
    <section>
      <div className="workflow-toolbar"><h2>Supplier orders</h2><div className="form-actions"><button onClick={orders.reload}>Refresh orders</button><button className="button-primary" onClick={() => { setCreating((value) => !value); setSelected(""); }}>{creating ? "Close new order" : "New supplier order"}</button></div></div>
      <p className="workflow-note">Orders record what was agreed with a supplier by phone/LINE/email outside this system. Placing, accepting or cancelling never changes stock, reservations or average cost; stock arrives only through Receiving (UC7). Prices in THB, no VAT.</p>
      <Feedback busy={orders.loading} error={orders.error} />
      {creating && <NewOrder api={api} onPlaced={(id) => { setCreating(false); orders.reload(); setSelected(id); }} />}
      <div className="record-layout"><div className="record-list" aria-label="Supplier order list">
        {orders.data && !orders.data.items?.length && <p>No supplier orders on this page.</p>}
        {orders.data?.items?.map((order) => <button key={order.id} className={`record-list-item ${selected === order.id ? "selected" : ""}`} onClick={() => { setSelected(order.id); setCreating(false); }}>
          <span>{order.order_no.slice(0, 11)}… · {formatBangkok(order.created_at)}</span><strong>{order.supplier.name}</strong><span><Status value={order.status} /> <Status value={order.supplier_response} /></span><span>{displayMoney(order.total_amount)} · {order.lines?.length ?? 0} line(s)</span>
        </button>)}
        {orders.data && <Paging offset={offset} count={orders.data.items?.length ?? 0} busy={orders.loading} setOffset={setOffset} />}
      </div>
      {selected ? <OrderDetail key={selected} api={api} id={selected} onChanged={orders.reload} /> : <section className="record-detail"><h2>Select an order</h2><p>Open an order to see its frozen supplier/material snapshot, lines, history and the responses it still accepts.</p></section>}
      </div>
    </section>
    <Suppliers api={api} />
  </>;
}

function OrderDetail({ api, id, onChanged }: { api: BackendApi; id: string; onChanged: () => void }) {
  const order = useResource<SupplierOrder>(api, `/material-orders/${id}`);
  const [action, setAction] = useState<OrderAction | null>(null);
  const o = order.data;
  return <section className="record-detail"><button onClick={() => { setAction(null); order.reload(); }}>Reload order</button><Feedback busy={order.loading} error={order.error} />
    {o && <>
      <h2>{o.order_no}</h2><p className="record-id">{o.id} · version {String(o.version)}</p>
      <dl className="detail-grid">
        <div><dt>Status</dt><dd><Status value={o.status} /></dd></div><div><dt>Supplier response</dt><dd><Status value={o.supplier_response} /></dd></div>
        <div><dt>Supplier (snapshot at placement)</dt><dd>{o.supplier.name}{o.supplier.email ? ` · ${o.supplier.email}` : ""}{o.supplier.phone ? ` · ${o.supplier.phone}` : ""}</dd></div>
        <div><dt>Expected delivery (ICT)</dt><dd>{o.expected_at ? formatBangkok(o.expected_at) : "Not specified"}</dd></div>
        <div><dt>Placed (ICT)</dt><dd>{formatBangkok(o.created_at)}</dd></div>
        <div><dt>Order total (no VAT)</dt><dd>{displayMoney(o.total_amount)}</dd></div>
        <div><dt>Job references</dt><dd>{o.job_ids?.length ? o.job_ids.map(short).join(", ") : "General replenishment"}</dd></div>
      </dl>
      <div className="table-scroll"><table className="workflow-table"><thead><tr><th scope="col">Material</th><th scope="col">Quantity</th><th scope="col">Unit cost (THB)</th><th scope="col">Line total</th></tr></thead>
        <tbody>{o.lines?.map((line) => <tr key={line.material_id}><th scope="row">{line.material_name}</th><td>{inventoryDisplay(line.quantity)} {line.unit_name}</td><td>{inventoryDisplay(line.unit_cost)}</td><td>{displayMoney(line.total_amount)}</td></tr>)}</tbody></table></div>
      <p className="workflow-note">Placed quantities, prices, supplier and job references are immutable. To change them, cancel this order (before any receipt) and place a new one.</p>
      <div className="form-actions">{allowedActions(o).map((value) => <button key={value} className={value === "accept" ? "button-primary" : value === "cancel" ? "button-danger" : undefined} onClick={() => setAction(value)}>{ACTION_LABELS[value]}</button>)}</div>
      {!allowedActions(o).length && <p>No further supplier-response commands for this order.</p>}
      {action && <OrderActionForm key={action} api={api} order={o} action={action} onDone={() => { setAction(null); order.reload(); onChanged(); }} onCancel={() => setAction(null)} />}
      <h3>History</h3>
      <ol className="payment-history">{o.events?.map((event) => <li key={event.id}><strong>{event.action}</strong> · v{String(event.version)} · {formatBangkok(event.created_at)}{event.reason ? ` · ${event.reason}` : ""}</li>)}</ol>
    </>}
  </section>;
}

function OrderActionForm({ api, order, action, onDone, onCancel }: { api: BackendApi; order: SupplierOrder; action: OrderAction; onDone: () => void; onCancel: () => void }) {
  const command = useCommand(); const [attempt, setAttempt] = useState<ReturnType<typeof orderActionPayload> | null>(null);
  async function send(payload: ReturnType<typeof orderActionPayload>, signal: AbortSignal) { await api.call(`/material-orders/${order.id}/actions`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal); onDone(); }
  return <form className="live-editor" aria-busy={command.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void command.run(async (signal) => { const payload = orderActionPayload(action, text(data, "reason"), crypto.randomUUID(), order.version); setAttempt(payload); await send(payload, signal); }, ""); }}>
    <h3>{ACTION_LABELS[action]}</h3>
    <fieldset className="live-fields" disabled={command.busy || Boolean(attempt)}>
      <p>{action === "accept" ? "Record that the supplier confirmed this order. A recorded response is final." : action === "reject" ? "Record that the supplier declined. This cancels the unreceived order." : "Cancel this order. It stays in history as a cancelled commitment, not incoming stock."}</p>
      <Field label={action === "accept" ? "Note (optional)" : "Reason (required)"}><textarea name="reason" required={action !== "accept"} maxLength={2000} /></Field>
      <label className="live-review-confirm"><input type="checkbox" required /> I confirmed this with the supplier outside the system.</label>
      <div className="form-actions"><button className={action === "accept" ? "button-primary" : "button-danger"} type="submit">Confirm</button><button type="button" onClick={onCancel}>Close</button></div>
    </fieldset>
    <Feedback {...command} />
    {attempt && command.error && !command.busy && <RetryNote busy={command.busy} label="Retry identical response" onRetry={() => void command.run((signal) => send(attempt, signal), "")} />}
  </form>;
}

function NewOrder({ api, onPlaced }: { api: BackendApi; onPlaced: (id: string) => void }) {
  const suppliers = useResource<Items<Supplier>>(api, "/suppliers?limit=100");
  const jobs = useResource<Items<ProductionSummary>>(api, "/production/jobs?limit=100");
  const command = useCommand(); const [attempt, setAttempt] = useState<ReturnType<typeof orderPayload> | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]); const [jobIds, setJobIds] = useState<string[]>([]);
  const frozen = command.busy || Boolean(attempt);
  let preview = "";
  try { preview = lines.length ? displayMoney(orderTotal(lines)) : ""; } catch { preview = "Enter valid quantities and unit costs"; }
  async function send(payload: ReturnType<typeof orderPayload>, signal: AbortSignal) { const result = await api.call<SupplierOrder>("/material-orders", "POST", payload, signal); onPlaced(result.id); }
  return <section className="workflow-form-panel" aria-label="New supplier order" aria-busy={command.busy}>
    <h2>New supplier order</h2>
    <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void command.run(async (signal) => {
      const payload = orderPayload({ key: crypto.randomUUID(), supplierId: text(data, "supplier_id"), jobIds, expectedAt: text(data, "expected_at"), lines });
      if (!window.confirm(`Place this immutable order for ${displayMoney(orderTotal(lines))}?`)) return;
      setAttempt(payload); await send(payload, signal);
    }, ""); }}>
      <fieldset className="live-fields" disabled={frozen}>
        <Feedback busy={suppliers.loading} error={suppliers.error} />
        <Field label="Supplier (active only)"><select name="supplier_id" required defaultValue=""><option value="" disabled>Choose a supplier</option>{suppliers.data?.items?.filter((s) => s.is_active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Expected delivery (optional, Asia/Bangkok)"><input name="expected_at" type="datetime-local" /></Field>
        <fieldset className="live-fields"><legend>Job references (optional; leave empty for general stock)</legend>
          <Feedback busy={jobs.loading} error={jobs.error} />
          {jobs.data?.items?.filter((job) => job.status !== "completed").map((job) => <label key={job.job_id} className="live-review-confirm"><input type="checkbox" checked={jobIds.includes(job.job_id)} onChange={(event) => setJobIds((current) => event.target.checked ? [...current, job.job_id] : current.filter((value) => value !== job.job_id))} /> Job {short(job.job_id)} · {job.status}</label>)}
          {jobs.data && !jobs.data.items?.some((job) => job.status !== "completed") && <p>No open jobs to reference.</p>}
        </fieldset>
        <h3>Lines</h3>
        {!lines.length && <p>Add materials below. Orders may exceed shortages or replenish general stock.</p>}
        {lines.map((line, index) => { let total = ""; try { total = displayMoney(lineTotal(line.quantity, line.unit_cost)); } catch { total = "—"; }
          return <div className="live-plan-line" key={line.material_id}><p className="record-id">{line.name} ({line.unit_name})</p>
            <Field label={`Quantity (${line.unit_name})`}><input inputMode="decimal" required value={line.quantity} onChange={(event) => setLines((current) => current.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} /></Field>
            <Field label="Unit cost (THB, up to 6 decimals)"><input inputMode="decimal" required value={line.unit_cost} onChange={(event) => setLines((current) => current.map((value, i) => i === index ? { ...value, unit_cost: event.target.value } : value))} /></Field>
            <span>Line {total}</span><button type="button" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>Remove {line.name}</button></div>; })}
        {preview && <p className="price-summary"><span>Order total preview (server total is authoritative)</span><strong>{preview}</strong></p>}
        <button className="button-primary" type="submit" disabled={!lines.length}>Place supplier order</button>
      </fieldset>
    </form>
    <MaterialSearch api={api} disabled={frozen || lines.length >= 100} isAdded={(id) => lines.some((line) => line.material_id === id)} onAdd={(m) => setLines((current) => [...current, { material_id: m.id, name: m.name, unit_name: m.unit_name, quantity: "", unit_cost: "" }])} label="Find material to order" />
    <Feedback {...command} />
    {attempt && command.error && !command.busy && <RetryNote busy={command.busy} label="Retry identical order" onRetry={() => void command.run((signal) => send(attempt, signal), "")}>The response failed; the order may already exist. Reload orders first. Retrying sends the same order key, so it cannot create a duplicate. A new form creates a new order.</RetryNote>}
  </section>;
}

function Suppliers({ api }: { api: BackendApi }) {
  const [search, setSearch] = useState(""); const [offset, setOffset] = useState(0); const [editing, setEditing] = useState("");
  const list = useResource<Items<Supplier>>(api, `/suppliers?search=${encodeURIComponent(search)}&limit=20&offset=${offset}`);
  const create = useCommand();
  return <section className="record-detail live-section" aria-label="Suppliers">
    <div className="workflow-toolbar"><h2>Suppliers</h2><button onClick={list.reload}>Refresh suppliers</button></div>
    <p>Contacts are optional and not verified. Deactivated suppliers stay in history and cannot receive new orders. There is no delete.</p>
    <form className="workflow-toolbar" onSubmit={(event) => { event.preventDefault(); setSearch(text(new FormData(event.currentTarget), "search").trim()); setOffset(0); }}><Field label="Search supplier name"><input name="search" type="search" maxLength={200} /></Field><button>Search suppliers</button></form>
    <Feedback busy={list.loading} error={list.error} />
    {list.data && <>{!list.data.items?.length && <p>No suppliers on this page.</p>}
      {list.data.items?.map((supplier) => <article className="live-worker-row" key={supplier.id}>
        <h3>{supplier.name} <Status value={supplier.is_active ? "active" : "inactive"} /></h3>
        <p>{supplier.email || "No email"} · {supplier.phone || "No phone"} · version {String(supplier.version)}</p>
        <button onClick={() => setEditing(editing === supplier.id ? "" : supplier.id)}>{editing === supplier.id ? "Close editor" : `Edit ${supplier.name}`}</button>
        {editing === supplier.id && <SupplierEditor key={`${supplier.id}:${supplier.version}`} api={api} supplier={supplier} onSaved={() => { setEditing(""); list.reload(); }} />}
      </article>)}
      <Paging offset={offset} count={list.data.items?.length ?? 0} busy={list.loading} setOffset={setOffset} /></>}
    <form className="live-editor" aria-busy={create.busy} onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); void create.run(async (signal) => { await api.call("/suppliers", "POST", supplierFields(text(data, "name"), text(data, "email"), text(data, "phone")), signal); form.reset(); list.reload(); }, "Supplier created. Reload before repeating an uncertain create; it has no retry key."); }}>
      <h3>Add supplier</h3>
      <fieldset className="live-fields" disabled={create.busy}><Field label="Supplier name"><input name="name" required maxLength={200} /></Field><Field label="Email (optional)"><input name="email" inputMode="email" /></Field><Field label="Phone (optional, digits with optional +)"><input name="phone" inputMode="tel" /></Field><button className="button-primary" type="submit">Create supplier</button></fieldset>
      <Feedback {...create} />
    </form>
  </section>;
}

function SupplierEditor({ api, supplier, onSaved }: { api: BackendApi; supplier: Supplier; onSaved: () => void }) {
  const command = useCommand();
  return <form className="live-editor" aria-busy={command.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); void command.run(async (signal) => {
    // PUT replaces all fields: blank contacts are saved as empty.
    await api.call(`/suppliers/${supplier.id}`, "PUT", { ...supplierFields(text(data, "name"), text(data, "email"), text(data, "phone")), is_active: data.has("is_active"), expected_version: BigInt(supplier.version) }, signal); onSaved();
  }, "Supplier saved."); }}>
    <fieldset className="live-fields" disabled={command.busy}>
      <Field label="Supplier name"><input name="name" required defaultValue={supplier.name} /></Field><Field label="Email (blank clears it)"><input name="email" defaultValue={supplier.email} /></Field><Field label="Phone (blank clears it)"><input name="phone" defaultValue={supplier.phone} /></Field>
      <label className="live-review-confirm"><input name="is_active" type="checkbox" defaultChecked={supplier.is_active} /> Active (can receive new orders)</label>
      <button className="button-primary" type="submit">Save supplier</button>
    </fieldset><Feedback {...command} /><p>A stale version is rejected; reload and edit again rather than overwriting.</p>
  </form>;
}
