"use client";

import { useState, type ReactNode } from "react";
import { BackendApi, displayMoney, type Account, type JobRequest } from "./backend-api";
import { useCommand, useResource, useRetryableWrite } from "./backend-hooks";
import { inventoryDisplay, type InventoryPlan } from "./backend-inventory-domain";
import { MaterialSearch } from "./backend-inventory";
import { formatMinutes, laborPayload, timePayload, usagePayload, type ProductionState, type UsageDraft } from "./backend-production-domain";
import { Feedback, Field, Paging, PrivateUpload, RetryNote, Status, text, type ReadyFile } from "./backend-ui";
import { formatBangkok } from "./demo-display";
import type { ProductionSummary } from "./connected-workspace";

const short = (id: string) => id.slice(0, 8);

// UC8: any active Staff starts/records/completes any job; Admin monitors,
// sees costs and enters actual labor cost only.
export function LiveProduction({ api, account }: { api: BackendApi; account: Account }) {
  const [offset, setOffset] = useState(0); const [selected, setSelected] = useState("");
  const jobs = useResource<{ items: ProductionSummary[] | null }>(api, `/production/jobs?limit=20&offset=${offset}`);
  return <section>
    <div className="workflow-toolbar"><h2>Production jobs</h2><button onClick={jobs.reload}>Refresh jobs</button></div>
    <p className="workflow-note">{account.role === "admin" ? "Monitor production and record the actual labor cost. Production actions belong to Staff." : "Start a job once its saved plan is fully reserved. Record actual material use and labor minutes as you go; completion releases unused reservations."}</p>
    <Feedback busy={jobs.loading} error={jobs.error} />
    <div className="record-layout"><div className="record-list" aria-label="Production job list">
      {jobs.data && !jobs.data.items?.length && <p>No jobs yet. A job opens after the required Deposit/PO approvals.</p>}
      {jobs.data?.items?.map((job) => <button key={job.job_id} className={`record-list-item ${selected === job.job_id ? "selected" : ""}`} onClick={() => setSelected(job.job_id)}>
        <span className="record-code">Job {short(job.job_id)} · cycle {String(job.cycle)}</span><strong>Request {short(job.request_id)}</strong><span><Status value={job.status} /></span><span>{job.completed_at ? `Completed ${formatBangkok(job.completed_at)}` : job.started_at ? `Started ${formatBangkok(job.started_at)}` : "Not started"}</span>
      </button>)}
      {jobs.data && <Paging offset={offset} count={jobs.data.items?.length ?? 0} busy={jobs.loading} setOffset={setOffset} />}
    </div>
    {selected ? <ProductionDetail key={selected} api={api} account={account} id={selected} onChanged={jobs.reload} /> : <section className="record-detail"><h2>Select a job</h2><p>Open a job to see its materials, actual use, labor time and photos.</p></section>}
    </div>
  </section>;
}

function ProductionDetail({ api, account, id, onChanged }: { api: BackendApi; account: Account; id: string; onChanged: () => void }) {
  const resource = useResource<ProductionState>(api, `/production/jobs/${id}`);
  const [notice, setNotice] = useState("");
  // Forms render only from settled data so a landing reload cannot clear input.
  const job = resource.data; const settled = !resource.loading; const worker = account.role === "worker" && settled;
  function saved(message: string) { setNotice(message); resource.reload(); onChanged(); }
  return <section className="record-detail"><button onClick={() => { setNotice(""); resource.reload(); }}>Reload job</button><Feedback busy={resource.loading} error={resource.error} message={notice} />
    {job && <>
      <h2>Job {short(job.job_id)} <Status value={job.status} /></h2><RequestLabel api={api} id={job.request_id} /><p className="record-id">{job.job_id} · production version {String(job.version)} · plan version {String(job.material_plan_version)}</p>
      <dl className="detail-grid">
        <div><dt>Production cycle</dt><dd>{String(job.cycle)}{Number(job.cycle) > 1 ? " (reopened for free rework)" : ""}</dd></div>
        <div><dt>Started (ICT)</dt><dd>{job.started_at ? formatBangkok(job.started_at) : "Not started"}</dd></div>
        <div><dt>Completed (ICT)</dt><dd>{job.completed_at ? formatBangkok(job.completed_at) : "Not completed"}</dd></div>
        <div><dt>Labor recorded</dt><dd>{formatMinutes(job.labor_minutes)}</dd></div>
      </dl>
      <h3>Materials</h3>
      {!job.materials?.length ? <p>No planned or used materials.</p> : <div className="table-scroll"><table className="workflow-table"><thead><tr><th scope="col">Material</th><th scope="col">Planned</th><th scope="col">Reserved now</th><th scope="col">Used from reservation</th><th scope="col">Total used</th><th scope="col">Released</th></tr></thead>
        <tbody>{job.materials.map((m) => <tr key={m.material_id}><th scope="row">{m.name || short(m.material_id)}</th><td>{inventoryDisplay(m.required)} {m.unit_name}</td><td>{inventoryDisplay(m.reserved)}</td><td>{inventoryDisplay(m.reservation_consumed)}</td><td>{inventoryDisplay(m.used)}</td><td>{inventoryDisplay(m.released)}</td></tr>)}</tbody></table></div>}
      {worker && job.status === "queued" && <StartJob api={api} job={job} onSaved={() => saved("Production started. Materials are consumed only when you record actual use.")} />}
      {worker && job.status === "in_progress" && <>
        <UsageForm key={`usage:${job.version}`} api={api} job={job} onSaved={() => saved("Actual use recorded and stock issued.")} />
        <TimeForm key={`time:${job.version}`} api={api} job={job} onSaved={() => saved("Labor minutes recorded.")} />
        <PhotoForm api={api} job={job} onSaved={() => saved("Photo validated and attached privately.")} />
        <CompleteJob api={api} job={job} onSaved={() => saved("Job completed. Unused reservations were released; physical stock did not change.")} />
      </>}
      {account.role === "admin" && settled && <AdminCost api={api} job={job} onSaved={() => saved("Actual labor cost saved.")} />}
      <History job={job} admin={account.role === "admin"} api={api} />
    </>}
  </section>;
}

// One read for the opened job only; the job list stays a single request.
export function RequestLabel({ api, id }: { api: BackendApi; id: string }) {
  const request = useResource<JobRequest>(api, `/requests/${id}`);
  return <p className="live-description">{request.data ? `Request #${request.data.no_request} · ${request.data.description} · Qty ${request.data.qty}` : request.error ? "Request details unavailable" : "Loading request…"}</p>;
}

function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="live-editor"><h3>{title}</h3>{children}</section>; }

function StartJob({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: () => void }) {
  const plan = useResource<InventoryPlan>(api, `/jobs/${job.job_id}/materials`);
  const write = useRetryableWrite(api, onSaved);
  const ready = plan.data?.ready && String(plan.data.version) === String(job.material_plan_version);
  return <Section title="Start production">
    <Feedback busy={plan.loading} error={plan.error} />
    {plan.data && !ready && <p className="workflow-note">The saved plan must be nonempty and fully reserved before starting. Open สต๊อกวัตถุดิบ → Job material plans to save or recheck it.</p>}
    <button className="button-primary" disabled={!ready || write.frozen} onClick={() => write.submit(`/production/jobs/${job.job_id}/start`, "POST", () => window.confirm("Start production? The plan is locked; materials are consumed only when actual use is recorded.") ? { idempotency_key: crypto.randomUUID(), expected_version: job.version, expected_plan_version: BigInt(job.material_plan_version) } : null, "")}>Start production</button>
    <Feedback error={write.error} />{write.uncertain && <RetryNote busy={write.busy} label="Retry identical start" onRetry={write.retry} onDiscard={() => { write.discard(); plan.reload(); }} />}
  </Section>;
}

function UsageForm({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: () => void }) {
  const [rows, setRows] = useState<UsageDraft[]>(() => (job.materials ?? []).map((m) => ({ material_id: m.material_id, label: `${m.name} (${m.unit_name}) · reserved ${inventoryDisplay(m.reserved)}`, quantity: "" })));
  const write = useRetryableWrite(api, onSaved); const [adding, setAdding] = useState(false);
  return <Section title="Record actual material use">
    <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/production/jobs/${job.job_id}/usage`, "POST", () => usagePayload({ idempotency_key: crypto.randomUUID(), expected_version: job.version }, text(data, "note"), rows), ""); }}>
      <p>Enter only what was used since the last entry. This job&apos;s reservation is used first, then free stock; other jobs&apos; reservations stay protected. Inactive materials can use only what this job already reserved.</p>
      <fieldset className="live-fields" disabled={write.frozen}>
        {rows.map((row, index) => <Field key={row.material_id} label={`Used now · ${row.label}`}><input inputMode="decimal" value={row.quantity} onChange={(event) => setRows((current) => current.map((value, i) => i === index ? { ...value, quantity: event.target.value } : value))} /></Field>)}
        <Field label="Usage note (optional)"><textarea name="note" maxLength={2000} /></Field>
        <div className="form-actions"><button className="button-primary" type="submit">Record actual use</button><button type="button" onClick={() => setAdding((value) => !value)}>{adding ? "Close material search" : "Add extra / unplanned material"}</button></div>
      </fieldset>
    </form>
    {adding && <MaterialSearch api={api} disabled={write.frozen} isAdded={(materialId) => rows.some((row) => row.material_id === materialId)} onAdd={(m) => setRows((current) => [...current, { material_id: m.id, label: `${m.name} (${m.unit_name}) · unplanned, free ${inventoryDisplay(m.qty_available)}`, quantity: "" }])} label="Find extra material" />}
    <Feedback error={write.error} />{write.uncertain && <RetryNote busy={write.busy} label="Retry identical usage" onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(); }}>The response failed; stock may already be issued. Reload the job before entering usage again. Retrying sends the same key, so it cannot issue stock twice; a new entry would.</RetryNote>}
  </Section>;
}

function TimeForm({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved);
  return <Section title="Record labor minutes">
    <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/production/jobs/${job.job_id}/time`, "POST", () => timePayload({ idempotency_key: crypto.randomUUID(), expected_version: job.version }, text(data, "minutes"), text(data, "note")), ""); }}>
      <fieldset className="live-fields" disabled={write.frozen}><Field label="Minutes worked (whole number)"><input name="minutes" required inputMode="numeric" /></Field><Field label="Time note (optional)"><input name="note" maxLength={2000} /></Field><button type="submit">Add labor minutes</button></fieldset>
      <p>Minutes are added to the job&apos;s total; this is not a stopwatch and no hourly rate is applied.</p>
    </form>
    <Feedback error={write.error} />{write.uncertain && <RetryNote busy={write.busy} label="Retry identical time entry" onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(); }} />}
  </Section>;
}

function PhotoForm({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: () => void }) {
  const [ready, setReady] = useState<ReadyFile | null>(null);
  return <Section title="Production photos (optional)">
    <PrivateUpload api={api} images label="Job photo (JPEG/PNG)" intentPath={`/production/jobs/${job.job_id}/photos/uploads`} completePath={(photoId) => `/job-photos/${photoId}/complete`} ready={ready} onReady={(file) => { setReady(null); if (file) onSaved(); }} />
  </Section>;
}

function CompleteJob({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved);
  return <Section title="Complete production">
    <p>Completion releases every unused reservation (no physical stock is added) and closes usage/time entry for this cycle. Recording all usage first is your responsibility; nothing is consumed automatically.</p>
    <button className="button-primary" disabled={write.frozen} onClick={() => write.submit(`/production/jobs/${job.job_id}/complete`, "POST", () => window.confirm("Complete this job? Unused reservations will be released and no more usage or time can be added.") ? { idempotency_key: crypto.randomUUID(), expected_version: job.version } : null, "")}>Complete job</button>
    <Feedback error={write.error} />{write.uncertain && <RetryNote busy={write.busy} label="Retry identical completion" onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(); }} />}
  </Section>;
}

function AdminCost({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: () => void }) {
  const write = useRetryableWrite(api, onSaved); const finance = job.finance;
  return <Section title="Actual cost (Admin)">
    {finance && <dl className="detail-grid"><div><dt>Material cost (issue-time valuation)</dt><dd>{displayMoney(finance.material_cost)}</dd></div><div><dt>Labor cost</dt><dd>{finance.labor_cost === null ? "Not entered" : displayMoney(finance.labor_cost)}</dd></div><div><dt>Total actual cost</dt><dd>{finance.total_cost === null ? "Known after labor cost is entered" : displayMoney(finance.total_cost)}</dd></div></dl>}
    {["in_progress", "completed"].includes(job.status) ? <form aria-busy={write.busy} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/production/jobs/${job.job_id}/labor-cost`, "PUT", () => laborPayload({ idempotency_key: crypto.randomUUID(), expected_version: job.version }, text(data, "amount")), ""); }}>
      <fieldset className="live-fields" disabled={write.frozen}><Field label={`Actual labor cost for ${formatMinutes(job.labor_minutes)} recorded (THB)`}><input name="amount" required inputMode="decimal" defaultValue={finance?.labor_cost ?? ""} /></Field><button type="submit">{finance?.labor_cost === null ? "Save labor cost" : "Revise labor cost"}</button></fieldset>
      <p>Enter the actual total, including an explicit 0.00 if appropriate. No hourly rate is assumed. Revisions keep the earlier value in the audit history.</p>
    </form> : <p>Labor cost can be entered once production has started.</p>}
    <Feedback error={write.error} />{write.uncertain && <RetryNote busy={write.busy} label="Retry identical labor cost" onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(); }} />}
  </Section>;
}

function History({ job, admin, api }: { job: ProductionState; admin: boolean; api: BackendApi }) {
  const download = useCommand();
  return <>
    <h3>Actual use</h3>
    {!job.usage?.length ? <p>No actual use recorded.</p> : <div className="table-scroll"><table className="workflow-table"><thead><tr><th scope="col">Time (ICT)</th><th scope="col">Material</th><th scope="col">Quantity</th><th scope="col">From reservation</th>{admin && <><th scope="col">Unit cost</th><th scope="col">Amount</th></>}</tr></thead>
      <tbody>{job.usage.map((u) => <tr key={u.id}><td>{formatBangkok(u.created_at)}</td><th scope="row">{u.material_name}</th><td>{inventoryDisplay(u.quantity)} {u.unit_name}</td><td>{inventoryDisplay(u.reservation_used)}</td>{admin && <><td>{u.unit_cost ? inventoryDisplay(u.unit_cost) : "—"}</td><td>{u.total_amount ? displayMoney(u.total_amount) : "—"}</td></>}</tr>)}</tbody></table></div>}
    <h3>Labor entries</h3>
    {!job.time_entries?.length ? <p>No labor minutes recorded.</p> : <ol className="payment-history">{job.time_entries.map((t) => <li key={t.id}><strong>{formatMinutes(t.minutes)}</strong> · {formatBangkok(t.created_at)}{t.note ? ` · ${t.note}` : ""}</li>)}</ol>}
    <h3>Photos</h3>
    {!job.photos?.length ? <p>No photos.</p> : job.photos.map((photo) => <div className="attachment-row" key={photo.id}><span>{photo.file_name} · {photo.byte_size} bytes</span><button disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/job-photos/${photo.id}/download`, photo.file_name, signal), "Private photo download requested.")}>Download</button></div>)}
    <Feedback {...download} />
    <h3>Events</h3>
    <ol className="payment-history">{job.events?.map((e) => <li key={e.id}><strong>{e.action}</strong> · v{String(e.version)} · {formatBangkok(e.created_at)}</li>)}</ol>
  </>;
}
