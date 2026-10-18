"use client";

import { useState, type FormEvent } from "react";
import { BackendApi, type Page, type Worker } from "./backend-api";
import { workerContacts } from "./backend-fulfillment-domain";
import { useCommand, useResource } from "./backend-hooks";
import { Field, Feedback, Paging, passwordError, text } from "./backend-ui";

export function LiveWorkers({ api }: { api: BackendApi }) {
  const [offset, setOffset] = useState(0);
  const resource = useResource<Page<Worker>>(api, `/admin/workers?limit=20&offset=${offset}`);
  const action = useCommand();
  const [editor, setEditor] = useState<string | null>(null);
  const [passwordWorker, setPasswordWorker] = useState<Worker | null>(null);
  const [notice, setNotice] = useState("");
  function saved() { setEditor(null); resource.reload(); setNotice("Worker profile saved by the server."); }

  return <section className="record-detail" aria-labelledby="workers-heading">
    <div className="workflow-toolbar"><h2 id="workers-heading">Workers</h2><div className="form-actions"><button onClick={resource.reload}>Refresh workers</button><button className="button-primary" onClick={() => { setEditor("new"); setPasswordWorker(null); setNotice(""); }}>Add Worker</button></div></div>
    <p>Manage accounts and required contacts. Email and phone may be shared; neither is a login identifier. Missing legacy contacts are shown honestly and can be filled using Edit profile.</p>
    {notice && <p className="workflow-success" role="status">{notice}</p>}
    <Feedback busy={resource.loading} error={resource.error} />
    {editor === "new" && <WorkerForm api={api} onSaved={saved} onCancel={() => setEditor(null)} />}
    {editor && editor !== "new" && <EditWorker key={editor} api={api} id={editor} onSaved={saved} onCancel={() => setEditor(null)} />}
    {resource.data && <>
      {!resource.data.items?.length && <p>No Workers on this page. Use Add Worker to create an account.</p>}
      {resource.data.items?.map((worker) => <article className="live-worker-row" key={worker.id}>
        <h3>{worker.name}</h3><p>{worker.username} · {worker.employee_no} · {worker.position || "No position"} · {worker.is_active ? "active" : "inactive"}</p>
        <dl className="detail-grid"><div><dt>Email</dt><dd>{worker.email ?? "Not provided (legacy account)"}</dd></div><div><dt>Phone</dt><dd>{worker.phone ?? "Not provided (legacy account)"}</dd></div></dl>
        <div className="form-actions">
          <button disabled={action.busy} onClick={() => { setEditor(worker.id); setPasswordWorker(null); setNotice(""); }}>Edit profile</button>
          <button disabled={action.busy} onClick={() => {
            if (!window.confirm(`${worker.is_active ? "Deactivate" : "Reactivate"} ${worker.name}? Deactivation revokes all sessions; reactivation does not restore them.`)) return;
            setNotice(""); void action.run(async (signal) => { await api.call(`/admin/workers/${worker.id}`, "PATCH", { is_active: !worker.is_active }, signal); resource.reload(); }, "Worker status updated.");
          }}>{worker.is_active ? "Deactivate" : "Reactivate"}</button>
          <button disabled={action.busy} onClick={() => { setPasswordWorker(worker); setEditor(null); setNotice(""); }}>Change password</button>
        </div>
      </article>)}
      <Paging offset={offset} count={resource.data.items?.length ?? 0} busy={action.busy} setOffset={setOffset} />
    </>}
    {passwordWorker && <PasswordForm key={passwordWorker.id} api={api} worker={passwordWorker} onCancel={() => setPasswordWorker(null)} onSaved={() => { setPasswordWorker(null); setNotice("Password changed; all Worker sessions revoked."); }} />}
    <Feedback {...action} />
  </section>;
}

function EditWorker({ api, id, onSaved, onCancel }: { api: BackendApi; id: string; onSaved: () => void; onCancel: () => void }) {
  const resource = useResource<Worker>(api, `/admin/workers/${id}`);
  return <><Feedback busy={resource.loading} error={resource.error} />{resource.error && <button onClick={resource.reload}>Reload Worker profile</button>}{resource.data && <WorkerForm api={api} worker={resource.data} onSaved={onSaved} onCancel={onCancel} />}</>;
}

function WorkerForm({ api, worker, onSaved, onCancel }: { api: BackendApi; worker?: Worker; onSaved: () => void; onCancel: () => void }) {
  const action = useCommand();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const password = text(data, "password"); const confirmation = text(data, "confirmation");
    for (const name of ["password", "confirmation"]) { const input = form.elements.namedItem(name); if (input instanceof HTMLInputElement) input.value = ""; }
    void action.run(async (signal) => {
      const contacts = workerContacts(text(data, "email"), text(data, "phone"));
      const input = { ...contacts, name: text(data, "name").trim(), username: text(data, "username").trim(), employee_no: text(data, "employee_no").trim(), position: text(data, "position").trim() };
      if (!input.name || [...input.name].length > 200) throw new Error("Name is required, up to 200 characters.");
      if (!worker) {
        const invalid = passwordError(password); if (invalid) throw new Error(invalid);
        if (password !== confirmation) throw new Error("Passwords must match.");
      }
      await api.call(worker ? `/admin/workers/${worker.id}` : "/admin/workers", worker ? "PATCH" : "POST", { ...input, ...(!worker ? { password } : {}) }, signal);
      onSaved();
    });
  }
  return <form className="live-editor" onSubmit={submit} aria-busy={action.busy}>
    <h3>{worker ? `Edit Worker: ${worker.name}` : "Create Worker account"}</h3>
    <fieldset className="live-fields" disabled={action.busy}>
      <Field label="Worker name"><input name="name" required defaultValue={worker?.name ?? ""} /></Field>
      <Field label="Worker username"><input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9_.\-]+" autoComplete="off" defaultValue={worker?.username ?? ""} /></Field>
      <Field label="Employee number"><input name="employee_no" required maxLength={30} pattern="[A-Za-z0-9_.\-]+" defaultValue={worker?.employee_no ?? ""} /></Field>
      <Field label="Worker email"><input name="email" required inputMode="email" autoComplete="off" defaultValue={worker?.email ?? ""} /></Field>
      <Field label="Worker phone"><input name="phone" required inputMode="tel" maxLength={64} autoComplete="off" defaultValue={worker?.phone ?? ""} /></Field>
      <p>Phone: 7–15 digits, optional leading +. Spaces, hyphens, parentheses and dots are removed by the server. Contacts are not ownership-verified.</p>
      <Field label="Position (optional)"><input name="position" maxLength={100} defaultValue={worker?.position ?? ""} /></Field>
      {!worker && <><Field label="Initial password"><input name="password" type="password" required autoComplete="new-password" /></Field><Field label="Confirm initial password"><input name="confirmation" type="password" required autoComplete="new-password" /></Field><p>At least 12 characters, at most 128 UTF-8 bytes. Password entries clear on submission.</p></>}
      {worker && <p>Changing username revokes all Worker sessions. Editing contacts alone does not reset the password or revoke sessions. Both contacts are required when saving this form, including legacy backfill.</p>}
      <div className="form-actions"><button type="submit" className="button-primary">{worker ? "Save Worker profile" : "Create Worker"}</button><button type="button" onClick={onCancel}>Cancel profile</button></div>
    </fieldset><Feedback {...action} />
  </form>;
}

function PasswordForm({ api, worker, onSaved, onCancel }: { api: BackendApi; worker: Worker; onSaved: () => void; onCancel: () => void }) {
  const action = useCommand();
  return <form className="live-editor" aria-busy={action.busy} onSubmit={(event) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const password = text(data, "password"); const confirmation = text(data, "confirm"); form.reset();
    void action.run(async (signal) => { const invalid = passwordError(password); if (invalid) throw new Error(invalid); if (password !== confirmation) throw new Error("Passwords must match."); await api.call(`/admin/workers/${worker.id}`, "PATCH", { password }, signal); onSaved(); });
  }}><h3>Change password: {worker.name}</h3><fieldset disabled={action.busy} className="live-fields"><Field label="New password"><input name="password" type="password" required autoComplete="new-password" /></Field><Field label="Confirm new password"><input name="confirm" type="password" required autoComplete="new-password" /></Field><p>At least 12 characters; at most 128 UTF-8 bytes. All Worker sessions will be revoked.</p><div className="form-actions"><button type="submit">Save password</button><button type="button" onClick={onCancel}>Cancel password change</button></div></fieldset><Feedback {...action} /></form>;
}
