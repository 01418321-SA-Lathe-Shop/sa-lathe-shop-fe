"use client";

import { useState, type FormEvent } from "react";
import { type Account, BackendApi } from "../src/lib/api/backend-api";
import { useCommand, useResource } from "../src/hooks/backend-hooks";
import { catalogName, inventoryDisplay, stockFields, type InventoryMaterial, type InventoryMovement } from "./backend-inventory-domain";
import { Field, Feedback, Paging, text } from "../src/components/ui/backend-ui";
import { formatBangkok } from "../src/lib/formatting/display";

type Items<T> = { items: T[] | null };
type Unit = { id: string; name: string };
type StockAttempt = ReturnType<typeof stockFields> & { idempotency_key: string; expected_version: number | string };

export function LiveInventory({ api, account }: { api: BackendApi; account: Account }) {
  const [search, setSearch] = useState(""); const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const resource = useResource<Items<InventoryMaterial>>(api, `/materials?search=${encodeURIComponent(search)}&limit=20&offset=${offset}`);
  const units = useResource<Items<Unit>>(api, "/units");
  const action = useCommand(); const admin = account.role === "admin";
  const material = resource.data?.items?.find((item) => item.id === selected);
  function refreshed() { resource.reload(); setSelected(null); }
  function searchFor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const term = text(new FormData(event.currentTarget), "search").trim();
    void action.run(async () => {
      if ([...term].length > 200 || term.includes("\0")) throw new Error("Search allows up to 200 characters without NUL.");
      setSearch(term); setOffset(0); setSelected(null);
    }, "");
  }
  return <section className="record-detail" aria-label="Live materials">
    <h2>Materials & stock</h2><p>Server balances in each material’s fixed base unit. Reservations do not consume physical stock. Search is a literal name match.</p>
    <form className="workflow-toolbar" onSubmit={searchFor}><Field label="Search material name"><input name="search" type="search" maxLength={400} /></Field><button type="submit">Search materials</button><button type="button" onClick={refreshed}>Refresh stock</button></form>
    <Feedback busy={resource.loading} error={resource.error} /><Feedback {...action} />
    {resource.data && <>{!resource.data.items?.length && <p>No materials on this page. Try another name or the previous page.</p>}
      {resource.data.items?.map((item) => <article className="live-inventory-row" key={item.id}>
        <h3>{item.name} · {item.is_active ? "Active" : "Inactive"}</h3><p className="record-id">{item.id} · {item.unit_name}</p>
        <dl className="detail-grid"><div><dt>On hand</dt><dd>{inventoryDisplay(item.qty_on_hand)} {item.unit_name}</dd></div><div><dt>Reserved</dt><dd>{inventoryDisplay(item.qty_reserved)} {item.unit_name}</dd></div><div><dt>Available</dt><dd>{inventoryDisplay(item.qty_available)} {item.unit_name}</dd></div>{admin && <div><dt>Average cost (THB / unit)</dt><dd>{item.avg_cost === undefined ? "Unavailable" : inventoryDisplay(item.avg_cost)}</dd></div>}</dl>
        <button aria-expanded={selected === item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}>{selected === item.id ? "Close material" : "Open material"} · {item.name}</button>
        {material?.id === item.id && <MaterialDetails key={`${item.id}:${item.version}`} api={api} material={item} admin={admin} onSaved={refreshed} />}
      </article>)}
      <Paging offset={offset} count={resource.data.items?.length ?? 0} busy={resource.loading} setOffset={(value) => { setOffset(value); setSelected(null); }} />
    </>}
    {admin && <section className="live-section"><h3>Catalog management</h3><p>Names must be unique ignoring case. A material’s unit cannot be changed. There is no destructive delete.</p><Feedback busy={units.loading} error={units.error} /><button onClick={units.reload}>Reload units</button>
      {units.data && <CatalogForms api={api} units={units.data.items ?? []} onSaved={() => { units.reload(); refreshed(); }} />}
    </section>}
  </section>;
}

function CatalogForms({ api, units, onSaved }: { api: BackendApi; units: Unit[]; onSaved: () => void }) {
  const unit = useCommand(); const material = useCommand();
  return <><form className="live-editor" onSubmit={(event) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    void unit.run(async (signal) => { await api.call("/units", "POST", { name: catalogName(text(data, "name"), 50) }, signal); form.reset(); onSaved(); }, "Unit created. Reload before repeating an uncertain request.");
  }}><fieldset disabled={unit.busy} className="live-fields"><Field label="New unit name"><input name="name" required /></Field><button>Create unit</button></fieldset><Feedback {...unit} /><p>After an uncertain response, reload units before submitting again. Unit creation has no retry key.</p></form>
    <form className="live-editor" onSubmit={(event) => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
      void material.run(async (signal) => { const unitId = text(data, "unit_id"); if (!units.some((item) => item.id === unitId)) throw new Error("Choose a loaded unit."); await api.call("/materials", "POST", { name: catalogName(text(data, "name"), 200), unit_id: unitId }, signal); form.reset(); onSaved(); }, "Material created with zero stock.");
    }}><fieldset disabled={material.busy || !units.length} className="live-fields"><Field label="New material name"><input name="name" required /></Field><Field label="Fixed base unit"><select name="unit_id" required defaultValue=""><option value="" disabled>Choose a unit</option>{units.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><button>Create material</button></fieldset>{!units.length && <p>Create a unit first. Unit listing is limited to the first 1,000 by the backend.</p>}<Feedback {...material} /><p>Reload materials before repeating an uncertain creation; do not assume a failed response means nothing was created.</p></form></>;
}

function MaterialDetails({ api, material, admin, onSaved }: { api: BackendApi; material: InventoryMaterial; admin: boolean; onSaved: () => void }) {
  const [offset, setOffset] = useState(0);
  const history = useResource<Items<InventoryMovement>>(api, `/materials/${material.id}/movements?limit=20&offset=${offset}`);
  const edit = useCommand();
  return <section className="live-section" aria-label={`Material details ${material.name}`}>
    {admin && <><form className="live-editor" onSubmit={(event) => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      void edit.run(async (signal) => { await api.call(`/materials/${material.id}`, "PATCH", { expected_version: BigInt(material.version), name: catalogName(text(data, "name"), 200), is_active: data.has("is_active") }, signal); onSaved(); }, "Catalog updated.");
    }}><fieldset disabled={edit.busy} className="live-fields"><Field label="Material name"><input name="name" required defaultValue={material.name} /></Field><label><input name="is_active" type="checkbox" defaultChecked={material.is_active} /> Active (uncheck to deactivate)</label><button>Save material</button></fieldset><Feedback {...edit} /><p>Deactivation preserves stock and history; it blocks additions and new/increased allocations. Reload after a conflict or uncertain update before editing again.</p></form>
      <StockForm api={api} material={material} onSaved={onSaved} />
    </>}
    <h4>Stock movement history</h4><button onClick={history.reload}>Reload movements</button><Feedback busy={history.loading} error={history.error} />
    {history.data && <>{!history.data.items?.length && <p>No stock movements on this page.</p>}{history.data.items?.map((item) => <article className="live-inventory-row" key={item.id}><h5>{item.mode} · {inventoryDisplay(item.quantity)} {material.unit_name}</h5><p>{formatBangkok(item.created_at)} · Actor {item.actor_id}</p><p>{inventoryDisplay(item.before_quantity)} → {inventoryDisplay(item.after_quantity)} {material.unit_name}</p>{admin && <><p>Reason: {item.reason ?? "Unavailable"}</p>{item.unit_cost !== undefined && <p>Unit cost: {inventoryDisplay(item.unit_cost)} THB</p>}<p>Average cost: {item.before_cost === undefined ? "Unavailable" : inventoryDisplay(item.before_cost)} → {item.after_cost === undefined ? "Unavailable" : inventoryDisplay(item.after_cost)} THB</p></>}</article>)}<Paging offset={offset} count={history.data.items?.length ?? 0} busy={history.loading} setOffset={setOffset} /></>}
  </section>;
}

function StockForm({ api, material, onSaved }: { api: BackendApi; material: InventoryMaterial; onSaved: () => void }) {
  const [mode, setMode] = useState<"addition" | "correction">(material.is_active ? "addition" : "correction");
  const [attempt, setAttempt] = useState<StockAttempt | null>(null); const action = useCommand();
  async function send(payload: StockAttempt, signal: AbortSignal) {
    await api.call(`/materials/${material.id}/stock`, "POST", { ...payload, expected_version: BigInt(payload.expected_version) }, signal);
    onSaved(); // GET current inventory; replay responses can be historical snapshots.
  }
  return <form className="live-editor" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    void action.run(async (signal) => { const payload: StockAttempt = { ...stockFields(material, mode, text(data, "quantity"), text(data, "unit_cost"), text(data, "reason")), idempotency_key: crypto.randomUUID(), expected_version: material.version }; setAttempt(payload); await send(payload, signal); }, "");
  }}><h4>Audited stock adjustment</h4><fieldset className="live-fields" disabled={action.busy || Boolean(attempt)}>
    <Field label="Adjustment mode"><select value={mode} onChange={(event) => setMode(event.target.value as "addition" | "correction")}><option value="addition" disabled={!material.is_active}>Add opening / administrative stock</option><option value="correction">Correct absolute counted stock</option></select></Field>
    <Field label={mode === "addition" ? `Quantity to add (${material.unit_name})` : `Total counted quantity (${material.unit_name})`}><input name="quantity" inputMode="decimal" required /></Field>
    {mode === "addition" && <Field label="Unit cost (THB, up to six decimals)"><input name="unit_cost" inputMode="decimal" required /></Field>}
    <Field label="Audit reason"><textarea name="reason" required /></Field><p>Up to 12 whole digits and six decimal places, without rounding. Corrections preserve average cost and cannot reduce stock below reservations. Supplier receiving is not this action.</p>
    <label><input type="checkbox" required /> I checked the quantity, unit and reason.</label><button className="button-primary">Confirm stock adjustment</button>
  </fieldset><Feedback {...action} />{attempt && !action.busy && <div className="workflow-note"><p>The result is uncertain. Refresh stock to inspect current balances. An identical retry preserves the original key, quantity, cost and version; it never adds a second adjustment if the first succeeded.</p><button type="button" onClick={() => void action.run((signal) => send(attempt, signal), "")}>Retry identical stock adjustment</button></div>}</form>;
}

// Literal name search used by forms that add material lines (UC6 orders, UC8 use).
export function MaterialSearch({ api, disabled, isAdded, onAdd, label = "Find material" }: { api: BackendApi; disabled: boolean; isAdded: (id: string) => boolean; onAdd: (material: InventoryMaterial) => void; label?: string }) {
  const [search, setSearch] = useState(""); const [offset, setOffset] = useState(0); const [error, setError] = useState("");
  const catalog = useResource<Items<InventoryMaterial>>(api, `/materials?search=${encodeURIComponent(search)}&limit=20&offset=${offset}`);
  return <div className="live-section">
    <form className="workflow-toolbar" onSubmit={(event) => { event.preventDefault(); const term = text(new FormData(event.currentTarget), "search").trim(); if ([...term].length > 200 || term.includes("\0")) { setError("Search needs at most 200 characters without NUL."); return; } setError(""); setSearch(term); setOffset(0); }}><Field label={label}><input name="search" type="search" disabled={disabled} /></Field><button disabled={disabled}>Search materials</button></form>
    <Feedback busy={catalog.loading} error={error || catalog.error} />
    {catalog.data && <>{!catalog.data.items?.length && <p>No matching materials on this page.</p>}{catalog.data.items?.map((item) => <div className="live-inventory-row" key={item.id}><p>{item.name} · {item.unit_name} · {item.is_active ? "Active" : "Inactive"} · Available {inventoryDisplay(item.qty_available)}</p><button type="button" disabled={disabled || !item.is_active || isAdded(item.id)} onClick={() => onAdd(item)}>Add · {item.name}</button></div>)}<Paging offset={offset} count={catalog.data.items?.length ?? 0} busy={disabled || catalog.loading} setOffset={setOffset} /></>}
  </div>;
}
