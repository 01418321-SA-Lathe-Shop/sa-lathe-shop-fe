"use client";

import { useState } from "react";
import { type Account, BackendApi } from "./backend-api";
import { useCommand, useResource } from "./backend-hooks";
import { inventoryDisplay, planLines, type InventoryMaterial, type InventoryPlan, type PlanDraftLine } from "./backend-inventory-domain";
import { Field, Feedback, Paging, text } from "./backend-ui";

type PlanAttempt = { mode: "save" | "reserve"; idempotency_key: string; expected_version: number | string; lines?: PlanDraftLine[] };

export function LiveMaterialPlan({ api, account, jobId, writable }: { api: BackendApi; account: Account; jobId: string; writable: boolean }) {
  const resource = useResource<InventoryPlan>(api, `/jobs/${jobId}/materials`);
  const [editing, setEditing] = useState(false); const [notice, setNotice] = useState("");
  const plan = resource.data;
  function reload() {
    if (editing && !window.confirm("Discard this local editor/retry and reload the server plan? A previous write may already have committed.")) return;
    setEditing(false); setNotice(""); resource.reload();
  }
  return <section className="live-section" aria-label="Job material plan">
    <div className="workflow-toolbar"><h4>Planned materials & reservations</h4><button onClick={reload}>Reload material plan</button></div>
    <p>The saved plan belongs to this job. Reservations allocate available stock; they do not consume it or change average cost. Only Staff can edit an ongoing request’s queued job.</p>
    <Feedback busy={resource.loading} error={resource.error} message={notice} />
    {plan && <><p>Plan version {String(plan.version)} · {plan.ready ? "Ready — all planned quantities reserved" : "Not ready — empty plan, shortage or job no longer queued"}</p>
      {!plan.lines?.length && <p>No saved planned materials.</p>}
      {plan.lines?.map((line) => <article className="live-inventory-row" key={line.material_id}><h5>Material <span className="record-id">{line.material_id}</span></h5><dl className="detail-grid"><div><dt>Required</dt><dd>{inventoryDisplay(line.required)}</dd></div><div><dt>Reserved</dt><dd>{inventoryDisplay(line.reserved)}</dd></div><div><dt>Consumed</dt><dd>{inventoryDisplay(line.consumed)}</dd></div><div><dt>Shortage</dt><dd>{inventoryDisplay(line.shortage)}</dd></div></dl></article>)}
      <p className="workflow-note">Quantities use each material’s fixed base unit. Search Materials to look up a material ID and its unit; the plan API does not include names or units. Current catalog search results are never treated as the complete inventory.</p>
      {account.role === "worker" && writable && !editing && <button onClick={() => setEditing(true)}>Edit / reserve job materials</button>}
      {account.role === "admin" && <p>Admin view is read-only. Staff saves plans and rechecks reservations.</p>}
      {account.role === "worker" && !writable && <p>Plan writes are closed because this is not an ongoing request’s queued job. Reload fulfillment if its status changed.</p>}
      {account.role === "worker" && writable && editing && <PlanEditor key={`${jobId}:${plan.version}`} api={api} plan={plan} onSaved={() => { setEditing(false); setNotice("Saved. Current plan fetched from the server; existing shortages are not automatically replenished."); resource.reload(); }} onCancel={() => setEditing(false)} />}
    </>}
  </section>;
}

function PlanEditor({ api, plan, onSaved, onCancel }: { api: BackendApi; plan: InventoryPlan; onSaved: () => void; onCancel: () => void }) {
  const [lines, setLines] = useState<PlanDraftLine[]>(() => plan.lines?.map((line) => ({ material_id: line.material_id, quantity: line.required })) ?? []);
  const [names, setNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState(""); const [offset, setOffset] = useState(0);
  const catalog = useResource<{ items: InventoryMaterial[] | null }>(api, `/materials?search=${encodeURIComponent(search)}&limit=20&offset=${offset}`);
  const [attempt, setAttempt] = useState<PlanAttempt | null>(null); const action = useCommand();
  const frozen = action.busy || Boolean(attempt);
  async function send(command: PlanAttempt, signal: AbortSignal) {
    const { mode, ...payload } = command;
    await api.call(`/jobs/${plan.job_id}/materials${mode === "reserve" ? "/reserve" : ""}`, mode === "reserve" ? "POST" : "PUT", { ...payload, expected_version: BigInt(payload.expected_version) }, signal);
    onSaved(); // Never apply a replayed historical snapshot optimistically.
  }
  function submit(mode: "save" | "reserve") {
    void action.run(async (signal) => {
      const validated = mode === "save" ? planLines(lines) : undefined;
      if (mode === "save" && !validated?.length && !window.confirm("Save an empty plan and release all this job’s reservations? This does not consume or delete physical stock.")) return;
      const payload: PlanAttempt = { mode, idempotency_key: crypto.randomUUID(), expected_version: plan.version, ...(mode === "save" ? { lines: validated } : {}) };
      setAttempt(payload); await send(payload, signal);
    }, "");
  }
  return <section className="live-editor" aria-label="Edit material plan" aria-busy={action.busy}>
    <h5>Complete desired material list</h5><p>Saving replaces the whole plan and reserves what is available. Reduced/removed lines release this job’s excess reservation. Inactive materials may retain or reduce existing requirements, but cannot be added/increased.</p>
    <fieldset disabled={frozen} className="live-fields">
      {lines.map((line, index) => <div className="live-plan-line" key={line.material_id}><p className="record-id">{names[line.material_id] ?? line.material_id}</p><Field label={`Required quantity · ${names[line.material_id] ?? line.material_id}`}><input inputMode="decimal" required value={line.quantity} onChange={(event) => setLines((current) => current.map((value, position) => position === index ? { ...value, quantity: event.target.value } : value))} /></Field><button type="button" onClick={() => setLines((current) => current.filter((_, position) => position !== index))}>Remove line {index + 1}</button></div>)}
      {!lines.length && <p>Empty desired list. Saving will release all this job’s reservations.</p>}
      <button type="button" className="button-primary" onClick={() => submit("save")}>Save full plan & reserve available stock</button>
      <button type="button" onClick={() => submit("reserve")}>Recheck saved plan reservations</button>
      <p>Recheck uses the saved server plan, not unsaved edits above. It explicitly tops up shortages where possible; other jobs’ reservations remain protected. A stale version requires reloading, not overwriting.</p>
    </fieldset>
    <Feedback {...action} />
    {attempt && !action.busy && <div className="workflow-note"><p>The response failed; the write may have committed. Reload to inspect the current plan, or retry the exact original action. Changed input needs a new command after reloading.</p><button onClick={() => void action.run((signal) => send(attempt, signal), "")}>Retry identical plan action</button></div>}
    <form className="workflow-toolbar" onSubmit={(event) => { event.preventDefault(); const term = text(new FormData(event.currentTarget), "search").trim(); void action.run(async () => { if ([...term].length > 200 || term.includes("\0")) throw new Error("Search needs at most 200 characters without NUL."); setSearch(term); setOffset(0); }, ""); }}><Field label="Find material for plan"><input name="search" type="search" disabled={frozen} /></Field><button disabled={frozen}>Find materials</button></form>
    <Feedback busy={catalog.loading} error={catalog.error} />
    {catalog.error && <button disabled={frozen} onClick={catalog.reload}>Reload plan material search</button>}
    {catalog.data && <>{!catalog.data.items?.length && <p>No matching materials on this page.</p>}{catalog.data.items?.map((item) => <div className="live-inventory-row" key={item.id}><p>{item.name} · {item.unit_name} · {item.is_active ? "Active" : "Inactive"} · Available {inventoryDisplay(item.qty_available)}</p><p className="record-id">{item.id}</p><button disabled={frozen || !item.is_active || lines.length >= 500 || lines.some((line) => line.material_id === item.id)} onClick={() => { setNames((current) => ({ ...current, [item.id]: `${item.name} (${item.unit_name})` })); setLines((current) => [...current, { material_id: item.id, quantity: "" }]); }}>Add to plan · {item.name}</button></div>)}<Paging offset={offset} count={catalog.data.items?.length ?? 0} busy={frozen || catalog.loading} setOffset={setOffset} /></>}
    <button disabled={action.busy} onClick={() => { if ((attempt || lines.length) && !window.confirm("Leave local plan edits/retry? Server reservations are unchanged unless a previous write committed.")) return; onCancel(); }}>Close plan editor</button>
  </section>;
}
