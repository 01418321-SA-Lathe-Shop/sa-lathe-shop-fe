"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BackendApi, type Account, type Customer, type Notification, type Page, type Worker } from "./backend-api";
import { useCommand, useResource } from "./backend-hooks";
import { LiveRequests } from "./backend-requests";
import { formatBangkok } from "./demo-display";
import { Field, Feedback, Paging, passwordError, text } from "./backend-ui";

type Session = { api: BackendApi; account: Account; expiresAt: string };
export default function BackendWorkspace({ onDemo, initialRegister = false }: { onDemo: () => void; initialRegister?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [notice, setNotice] = useState("");
  const active = useRef<BackendApi | null>(null);
  const [tab, setTab] = useState("requests");
  const logout = useCommand();
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

  useEffect(() => () => active.current?.close(), []);
  useEffect(() => {
    if (!session) return;
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    const expire = () => { session.api.close(); setSession(null); setNotice("Session expired. Please sign in again."); };
    const timer = window.setTimeout(expire, Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [session]);

  if (!session) return <LiveLogin base={base} notice={notice} onDemo={onDemo} initialRegister={initialRegister} onLogin={async (username, password) => {
    const api = new BackendApi(base, () => { setSession(null); setNotice("Session expired or revoked. Please sign in again."); });
    active.current?.close(); active.current = api;
    try {
      const login = await api.login(username, password);
      const account = await api.call<Account>("/auth/me");
      if (active.current !== api) return;
      setTab("requests"); setNotice(""); setSession({ api, account, expiresAt: login.expires_at });
    } catch (error) { api.close(); throw error; }
  }} />;

  const { api, account } = session;
  const tabs = ["requests", "inbox", ...(account.role === "customer" ? ["memberships"] : []), ...(account.role === "admin" ? ["workers"] : [])];
  return <div className="live-shell">
    <a className="skip-link" href="#live-main">Skip to workspace</a>
    <header className="live-header"><div><strong>Lathe Shop</strong><span className="demo-badge compact">Connected API · {account.role}</span></div><button disabled={logout.busy} onClick={() => void logout.run(async () => {
      let failed = false;
      try { await api.logout(); } catch { failed = true; }
      active.current = null; setSession(null);
      setNotice(failed ? "Signed out locally. Server logout could not be confirmed; the remote session may remain valid until expiry." : "Signed out. Server session revoked.");
    }, "")}>Sign out</button></header>
    <nav className="live-tabs" aria-label="Connected workspace">{tabs.map((name) => <button key={name} aria-current={tab === name ? "page" : undefined} onClick={() => { setTab(name); requestAnimationFrame(() => document.getElementById("live-title")?.focus()); }}>{name}</button>)}</nav>
    <main id="live-main" className="live-main" tabIndex={-1}><h1 id="live-title" tabIndex={-1}>{account.name} · {tab}</h1><p className="text-muted">Real backend records. Asia/Bangkok · THB · No VAT. Reload requires sign-in; no token is stored in browser storage.</p>
      <div className="demo-notice"><p><strong>Connected scope: authentication and UC1–UC3.</strong><span>Deposit/PO evidence, jobs, stock, purchasing, delivery and payments are not connected. Acceptance terms are requirements, not proof of payment. Worker contact creation/editing waits for backend email/phone support.</span></p></div>
      {tab === "requests" && <LiveRequests api={api} account={account} />}
      {tab === "inbox" && <Inbox api={api} />}
      {tab === "memberships" && <Memberships api={api} />}
      {tab === "workers" && account.role === "admin" && <Workers api={api} />}
    </main>
  </div>;
}

function LiveLogin({ base, notice, onDemo, initialRegister, onLogin }: { base: string; notice: string; onDemo: () => void; initialRegister: boolean; onLogin: (username: string, password: string) => Promise<void> }) {
  const [register, setRegister] = useState(initialRegister);
  const [type, setType] = useState("individual");
  const [companyMode, setCompanyMode] = useState("new");
  const action = useCommand();
  const registrationApi = useRef<BackendApi | null>(null);
  useEffect(() => () => registrationApi.current?.close(), []);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const password = text(data, "password");
    // Uncontrolled input is cleared immediately, including on failure.
    const input = form.elements.namedItem("password") as HTMLInputElement; input.value = "";
    void action.run(async (signal) => {
      if (register) {
        const invalid = passwordError(password); if (invalid) throw new Error(invalid);
        const api = new BackendApi(base); registrationApi.current?.close(); registrationApi.current = api;
        await api.call("/auth/register", "POST", { username: text(data, "username"), password, name: text(data, "name"), customer_type: type, ...(type === "company" ? companyMode === "new" ? { company_name: text(data, "company_name") } : { invitation: text(data, "invitation") } : {}) }, signal);
        api.close(); setRegister(false);
      } else { await onLogin(text(data, "username"), password); }
    }, register ? "Account created. Sign in with your username and password." : "");
  }
  return <main className="live-login"><section className="workflow-form-panel"><span className="demo-badge">CONNECTED BACKEND</span><h1>{register ? "สมัครบัญชีลูกค้า" : "เข้าสู่ระบบ Lathe Shop"}</h1><p>API: {base}</p><p className="text-muted">ลูกค้า Staff และ Admin ใช้หน้าเข้าสู่ระบบเดียวกัน บัญชีทดสอบไม่สามารถเข้าถึงข้อมูลจริงได้</p>{notice && <p role="status">{notice}</p>}
    <form onSubmit={submit} aria-busy={action.busy}><fieldset disabled={action.busy} className="live-fields">
      <Field label="Username"><input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9_.\-]+" autoComplete="username" /></Field>
      <Field label="Password"><input name="password" type="password" required autoComplete={register ? "new-password" : "current-password"} /></Field>
      {register && <><p>Passwords: at least 12 characters, at most 128 UTF-8 bytes.</p><Field label="Name"><input name="name" required maxLength={200} autoComplete="name" /></Field><Field label="Customer type"><select value={type} onChange={(e) => setType(e.target.value)}><option value="individual">Individual</option><option value="company">Company</option></select></Field>{type === "company" && <><Field label="Company membership"><select value={companyMode} onChange={(e) => setCompanyMode(e.target.value)}><option value="new">Create a new company</option><option value="join">Join by invitation</option></select></Field>{companyMode === "new" ? <Field label="Company name"><input name="company_name" required maxLength={200} /></Field> : <Field label="Private invitation"><input name="invitation" type="password" required autoComplete="off" /></Field>}<p>Company names do not grant membership or merge companies.</p></>}</>}
      <button className="button-primary" type="submit">{register ? "Create customer account" : "Sign in"}</button></fieldset></form>
    <Feedback {...action} /><div className="form-actions"><button disabled={action.busy} onClick={() => setRegister((value) => !value)}>{register ? "กลับไปเข้าสู่ระบบ" : "สมัครบัญชีลูกค้า"}</button><button disabled={action.busy} onClick={onDemo}>เปิดบัญชีทดสอบ</button></div>
  </section></main>;
}

function Inbox({ api }: { api: BackendApi }) {
  const [offset, setOffset] = useState(0); const resource = useResource<Page<Notification>>(api, `/notifications?limit=20&offset=${offset}`); const action = useCommand();
  return <section className="record-detail"><h2>Inbox</h2><button onClick={resource.reload}>Refresh inbox</button><Feedback busy={resource.loading} error={resource.error} />
    {resource.data && <>{!(resource.data.items?.length) && <p>No notifications on this page. New-request alerts arrive when the backend worker processes its outbox.</p>}{resource.data.items?.map((item) => <article className="supplier-order" key={item.id}><h3>{item.title}</h3><p>{formatBangkok(item.created_at)} · {item.read_at ? "Read" : "Unread"}</p>{!item.read_at && <button disabled={action.busy} onClick={() => void action.run(async (signal) => { await api.call(`/notifications/${item.id}/read`, "PATCH", undefined, signal); resource.reload(); }, "Marked as read.")}>Mark read</button>}</article>)}<Paging offset={offset} count={resource.data.items?.length ?? 0} busy={action.busy} setOffset={setOffset} /></>}<Feedback {...action} />
  </section>;
}

function Memberships({ api }: { api: BackendApi }) {
  const resource = useResource<{ items: Customer[] | null }>(api, "/customers"); const action = useCommand(); const [invitation, setInvitation] = useState("");
  return <section className="record-detail"><h2>Customer memberships</h2><button onClick={resource.reload}>Refresh memberships</button><Feedback busy={resource.loading} error={resource.error} />
    {resource.data?.items?.map((item) => <article className="supplier-order" key={item.id}><h3>{item.name}</h3><p>{item.customer_type} · {item.is_owner ? "Owner" : "Member"}</p><p className="record-id">{item.id}</p>{item.customer_type === "company" && item.is_owner && <button disabled={action.busy} onClick={() => { setInvitation(""); void action.run(async (signal) => { const result = await api.call<{ invitation: string }>(`/customers/${item.id}/invitations`, "POST", undefined, signal); setInvitation(result.invitation); }, "Invitation created. Share privately; one use, expires after 24 hours."); }}>Create private invitation</button>}</article>)}
    {invitation && <div className="workflow-success"><p>Shown only in this page; share privately. It will disappear when you leave.</p><output className="private-invitation">{invitation}</output><button onClick={() => setInvitation("")}>Hide invitation</button></div>}
    <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const token = text(new FormData(form), "invitation"); form.reset(); void action.run(async (signal) => { await api.call("/customers/join", "POST", { invitation: token }, signal); resource.reload(); }, "Company joined."); }}><Field label="Join company with private invitation"><input name="invitation" type="password" required autoComplete="off" /></Field><button disabled={action.busy} type="submit">Join company</button></form><Feedback {...action} />
  </section>;
}

function Workers({ api }: { api: BackendApi }) {
  const [offset, setOffset] = useState(0); const resource = useResource<Page<Worker>>(api, `/admin/workers?limit=20&offset=${offset}`); const action = useCommand(); const [selected, setSelected] = useState<Worker | null>(null);
  return <section className="record-detail"><h2>Workers</h2><p className="field-error">Add/edit contact profiles is unavailable: backend email/phone persistence is pending. No contacts will be discarded. Existing account status and password actions are supported.</p><button onClick={resource.reload}>Refresh workers</button><Feedback busy={resource.loading} error={resource.error} />
    {resource.data && <>{!resource.data.items?.length && <p>No Workers on this page.</p>}{resource.data.items?.map((worker) => <article className="supplier-order" key={worker.id}><h3>{worker.name}</h3><p>{worker.username} · {worker.employee_no} · {worker.position || "No position"} · {worker.is_active ? "active" : "inactive"}</p><p>Email / phone: unavailable in current API.</p><div className="form-actions"><button disabled={action.busy} onClick={() => { if (!window.confirm(`${worker.is_active ? "Deactivate" : "Reactivate"} ${worker.name}? Deactivation revokes all their sessions; reactivation does not restore them.`)) return; void action.run(async (signal) => { await api.call(`/admin/workers/${worker.id}`, "PATCH", { is_active: !worker.is_active }, signal); resource.reload(); }, "Worker status updated."); }}>{worker.is_active ? "Deactivate" : "Reactivate"}</button><button onClick={() => setSelected(worker)}>Change password</button></div></article>)}<Paging offset={offset} count={resource.data.items?.length ?? 0} busy={action.busy} setOffset={setOffset} /></>}
    {selected && <form key={selected.id} className="workflow-form-panel" onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const password = text(data, "password"); const confirmation = text(data, "confirm"); form.reset(); void action.run(async (signal) => { const invalid = passwordError(password); if (invalid) throw new Error(invalid); if (password !== confirmation) throw new Error("Passwords must match."); await api.call(`/admin/workers/${selected.id}`, "PATCH", { password }, signal); setSelected(null); }, "Password changed; all Worker sessions revoked."); }}><h3>Change password: {selected.name}</h3><Field label="New password"><input name="password" type="password" required autoComplete="new-password" /></Field><Field label="Confirm new password"><input name="confirm" type="password" required autoComplete="new-password" /></Field><p>At least 12 characters; at most 128 UTF-8 bytes. All Worker sessions will be revoked.</p><button disabled={action.busy} type="submit">Change password</button><button type="button" disabled={action.busy} onClick={() => setSelected(null)}>Cancel</button></form>}<Feedback {...action} />
  </section>;
}
