"use client";

import { useState } from "react";
import { Dialog as Modal } from "./demo-ui";
import { formatBangkok } from "./demo-display";
import type { Role } from "./demo-access";
import { useWorkshop } from "./workshop-context";
import {
  addWorker, editWorker, passwordInputError, setWorkerStatus,
  simulatePasswordChange, validateWorkerFields, type WorkerFields, type WorkerProfile,
} from "./admin-domain";

const scope = "Admin:workers";


function ProfileForm({ worker, save, cancel }: {
  worker?: WorkerProfile; save: (fields: WorkerFields) => void; cancel: () => void;
}) {
  const [error, setError] = useState("");
  return <form onSubmit={(event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const fields = validateWorkerFields({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") });
      save(fields);
    } catch (error) { setError(error instanceof Error ? error.message : "Staff could not be saved."); }
  }}>
    <p className="workflow-note">Name, email, and phone are all required. Use synthetic details only; this prototype stores profiles in browser memory.</p>
    <label className="form-field">Staff name<input name="name" autoComplete="name" required defaultValue={worker?.name ?? ""} /></label>
    <label className="form-field">Staff email<input name="email" type="email" autoComplete="email" required defaultValue={worker?.email ?? ""} /></label>
    <label className="form-field">Staff phone<input name="phone" type="tel" autoComplete="tel" required defaultValue={worker?.phone ?? ""} /></label>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="form-actions"><button className="button-primary">{worker ? "Save Staff changes" : "Add demo Staff"}</button><button type="button" className="button-secondary" onClick={cancel}>Cancel</button></div>
  </form>;
}

function PasswordForm({ worker, submit, close }: { worker: WorkerProfile; submit: () => void; close: () => void }) {
  const [error, setError] = useState("");
  return <Modal title={`Change password — ${worker.name}`} close={close}>
    <p className="workflow-note" id="password-demo-warning">Demo only: use a made-up password, never a real one. This simulates a change; it does not create or change a login credential. Entered values are cleared, never stored, logged, or sent.</p>
    <form aria-describedby="password-demo-warning" onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const password = form.elements.namedItem("newPassword") as HTMLInputElement;
      const confirmation = form.elements.namedItem("confirmation") as HTMLInputElement;
      const invalid = passwordInputError(password.value, confirmation.value);
      // Do not capture credential text in a reducer action, closure, or shared state.
      form.reset();
      setError(invalid ?? "");
      if (invalid) { password.focus(); return; }
      submit();
    }}>
      <label className="form-field">New demo password<input name="newPassword" type="password" autoComplete="new-password" required /></label>
      <label className="form-field">Confirm demo password<input name="confirmation" type="password" autoComplete="new-password" required /></label>
      {error && <p className="field-error" role="alert">{error} Re-enter both demo values.</p>}
      <p className="workflow-note">Production password strength, current-password/reauthentication requirements, and session revocation are To be defined.</p>
      <div className="form-actions"><button className="button-primary">Simulate password change</button><button type="button" className="button-secondary" onClick={close}>Cancel</button></div>
    </form>
  </Modal>;
}

function WorkerManagement() {
  const { state, dispatch, resetDemo } = useWorkshop();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | WorkerProfile["status"]>("all");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState<"add" | "edit">();
  const [passwordId, setPasswordId] = useState<string>();
  const [statusPrompt, setStatusPrompt] = useState<{ id: string; status: WorkerProfile["status"] }>();
  const workers = state.data.workers;
  const query = search.trim().toLowerCase();
  const visible = workers.filter((worker) => (filter === "all" || worker.status === filter) && [worker.name, worker.email, worker.phone].some((value) => value.toLowerCase().includes(query)));
  const selected = visible.find((worker) => worker.id === selectedId) ?? visible[0];
  const passwordWorker = workers.find((worker) => worker.id === passwordId);
  const statusWorker = workers.find((worker) => worker.id === statusPrompt?.id);

  function save(fields: WorkerFields) {
    const id = form === "edit" && selected ? selected.id : crypto.randomUUID();
    const editing = form === "edit";
    dispatch({ scope, transform: (data) => ({ ...data, workers: editing ? editWorker(data.workers, "Admin", id, fields) : addWorker(data.workers, "Admin", id, fields) }), message: editing ? "Staff details updated." : "Demo Staff added with active profile status. No login credential was created." });
    setSelectedId(id); setSearch(""); setFilter("all"); setForm(undefined);
  }

  return <section aria-label="Admin Staff management" className="admin-workflow">
    <div className="workflow-toolbar"><p>Shared in-memory demo · reload/reset clears all roles</p><div className="admin-toolbar-actions"><button className="button-primary" onClick={() => setForm("add")}>+ Add Staff</button><button className="button-secondary" onClick={() => { if (window.confirm("Reset sample data and attachments for ALL demo roles?")) resetDemo(scope); }}>Reset sample data</button></div></div>
    <p className="workflow-note admin-boundary">Admin may add/edit Staff, deactivate/reactivate profiles, and simulate password changes. No permanent deletion or job reassignment. Profile status does not disable the generic Staff demo login; real account enforcement belongs to Backend.</p>
    {state.scope === scope && state.message && <p className="workflow-success" role="status">{state.message}</p>}
    {state.scope === scope && state.error && <p className="field-error" role="alert">{state.error}</p>}

    {form === "add" && <section className="workflow-form-panel"><h2>Add Staff</h2><ProfileForm save={save} cancel={() => setForm(undefined)} /></section>}
    <div className="admin-filters"><label className="form-field">Search Staff<input type="search" value={search} placeholder="Name, email, or phone" onChange={(event) => { setSearch(event.target.value); setForm(undefined); }} /></label><label className="form-field">Staff status<select aria-label="Staff status" value={filter} onChange={(event) => { const value = event.target.value; if (value === "all" || value === "active" || value === "inactive") setFilter(value); setForm(undefined); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
    <p className="workflow-note" role="status">Showing {visible.length} of {workers.length} Staff</p>
    {selected ? <div className="record-layout"><div className="record-list" aria-label="Staff profiles">{visible.map((worker) => <button key={worker.id} className={`record-list-item ${worker.id === selected.id ? "selected" : ""}`} aria-pressed={worker.id === selected.id} onClick={() => { setSelectedId(worker.id); setForm(undefined); }}><strong>{worker.name}</strong><span className="worker-contact">{worker.email}</span><span className="worker-contact">{worker.phone}</span><span className={`record-status status-${worker.status}`}>{worker.status}</span></button>)}</div>
      <article className="record-detail"><div className="record-heading"><h2>{selected.name}</h2><span className={`record-status status-${selected.status}`}>{selected.status}</span></div><p className="record-id">Staff ID: {selected.id}</p>
        {form === "edit" ? <ProfileForm key={selected.id} worker={selected} save={save} cancel={() => setForm(undefined)} /> : <><dl className="detail-grid"><div><dt>Email</dt><dd>{selected.email}</dd></div><div><dt>Phone</dt><dd>{selected.phone}</dd></div><div><dt>Profile status</dt><dd>{selected.status}</dd></div><div><dt>Last password-change simulation</dt><dd>{selected.passwordChangeSimulatedAt ? formatBangkok(selected.passwordChangeSimulatedAt) : "Not simulated"}</dd></div></dl><div className="form-actions"><button className="button-secondary" onClick={() => setForm("edit")}>Edit Staff</button><button className={selected.status === "active" ? "button-danger" : "button-secondary"} onClick={() => setStatusPrompt({ id: selected.id, status: selected.status === "active" ? "inactive" : "active" })}>{selected.status === "active" ? "Deactivate Staff" : "Reactivate Staff"}</button><button className="button-secondary" onClick={() => setPasswordId(selected.id)}>Change password</button></div></>}
      </article></div> : <section className="empty-panel"><h2>{workers.length ? "No Staff match" : "No Staff yet"}</h2><p className="text-muted">{workers.length ? "Try another name, email, phone, or status." : "Add a Staff with a name, email, and phone."}</p>{workers.length > 0 && <button className="button-secondary" onClick={() => { setSearch(""); setFilter("all"); }}>Clear filters</button>}</section>}

    {passwordWorker && <PasswordForm worker={passwordWorker} close={() => setPasswordId(undefined)} submit={() => { const at = new Date().toISOString(); dispatch({ scope, transform: (data) => ({ ...data, workers: simulatePasswordChange(data.workers, "Admin", passwordWorker.id, at) }), message: "Password change simulated only. Entered values were discarded; the demo login is unchanged." }); setPasswordId(undefined); }} />}
    {statusPrompt && statusWorker && <Modal title={statusPrompt.status === "inactive" ? "Deactivate Staff?" : "Reactivate Staff?"} close={() => setStatusPrompt(undefined)}><p className="workflow-note">Set {statusWorker.name} to {statusPrompt.status}? This changes the demo profile only. Existing jobs, stock, orders, and generic demo login stay unchanged.</p><div className="form-actions"><button className="button-primary" onClick={() => { dispatch({ scope, transform: (data) => ({ ...data, workers: setWorkerStatus(data.workers, "Admin", statusPrompt.id, statusPrompt.status) }), message: `Staff profile is now ${statusPrompt.status}. No records were deleted.` }); setStatusPrompt(undefined); }}>Confirm status change</button><button className="button-secondary" onClick={() => setStatusPrompt(undefined)}>Cancel</button></div></Modal>}
  </section>;
}

export default function AdminWorkspace({ role }: { role: Role }) {
  if (role !== "Admin") return null;
  return <WorkerManagement />;
}
