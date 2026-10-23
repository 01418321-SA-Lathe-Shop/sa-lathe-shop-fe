"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Logo, ThemeToggle } from "./appearance";
import { BackendApi, type Account, type Customer, type Notification, type Page } from "./backend-api";
import { useCommand, useResource } from "./backend-hooks";
import { LiveRequests } from "./backend-requests";
import { LiveWorkers } from "./backend-workers";
import { LiveInventory } from "./backend-inventory";
import { formatBangkok } from "./demo-display";
import { ROLES, type Role } from "./demo-access";
import { setDemoRole } from "./demo-session";
import { Field, Feedback, Paging, passwordError, text } from "./backend-ui";
import { ROLE_LABELS, ROLE_ROOTS } from "./workspace-routes";

type Session = { api: BackendApi; account: Account; expiresAt: string };
export default function BackendWorkspace({ initialRegister = false }: { initialRegister?: boolean }) {
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

  if (!session) return <LiveLogin key={initialRegister ? "register" : "login"} base={base} notice={notice} initialRegister={initialRegister} onLogin={async (username, password) => {
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
  const tabs = ["requests", "inbox", ...(account.role === "customer" ? ["memberships"] : ["materials"]), ...(account.role === "admin" ? ["workers"] : [])];
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
      <div className="demo-notice"><p><strong>Connected scope: accounts, Worker contacts and UC1–UC5.</strong><span>Open an approved quotation for Deposit/PO review and the resulting job’s material plan. Staff can search materials; Admin manages catalog and stock. Approval is manual—not a bank transfer. Procurement, production, delivery and invoice settlement are not connected in this frontend phase.</span></p></div>
      {tab === "requests" && <LiveRequests api={api} account={account} />}
      {tab === "inbox" && <Inbox api={api} />}
      {tab === "memberships" && <Memberships api={api} />}
      {tab === "workers" && account.role === "admin" && <LiveWorkers api={api} />}
      {tab === "materials" && account.role !== "customer" && <LiveInventory api={api} account={account} />}
    </main>
  </div>;
}
function LiveLogin({ base, notice, initialRegister, onLogin }: { base: string; notice: string; initialRegister: boolean; onLogin: (username: string, password: string) => Promise<void> }) {
  const router = useRouter();
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
        api.close(); setRegister(false); router.replace("/login");
      } else { await onLogin(text(data, "username"), password); }
    }, register ? "Account created. Sign in with your username and password." : "");
  }
  function enterDemo(role: Role) { setDemoRole(role); router.push(ROLE_ROOTS[role]); }
  return <main className="login-page">
    <section className="login-showcase"><Logo onClick={() => router.push("/")}/><div className="login-showcase-copy"><span className="hero-kicker"><i className="live-dot"/> LATHE SHOP CONTROL</span><h1>{register ? <>เริ่มต้นงานใหม่<br/>ให้เป็นระบบ</> : <>ทุกงานสำคัญ<br/>อยู่ในที่เดียว</>}</h1><p>จัดการงานผลิต ติดตามความคืบหน้า และตรวจสอบเอกสารได้จากบัญชีของคุณ</p></div><div className="login-machine" aria-hidden="true"><div className="machine-orbit orbit-one"/><div className="machine-orbit orbit-two"/><div className="machine-core"><span/><i/></div></div><div className="login-showcase-footer"><span>LATHE SHOP CONTROL</span><small>Bangkok · Thailand</small></div></section>
    <section className="login-panel"><div className="auth-toolbar"><Link className="login-back" href="/">← กลับหน้าแรก</Link><ThemeToggle/></div>
      <div className="login-card"><span className="eyebrow">{register ? "CREATE ACCOUNT" : "WELCOME BACK"}</span><h2>{register ? "สมัครบัญชี" : "เข้าสู่ระบบ"}</h2><p>{register ? "สร้างบัญชีลูกค้าเพื่อส่งคำขอผลิตและติดตามงาน" : "ลูกค้า Staff และ Admin ใช้หน้าเข้าสู่ระบบเดียวกัน"}</p>
      {notice && <p className="workflow-success" role="status">{notice}</p>}
      <form onSubmit={submit} aria-busy={action.busy}><fieldset disabled={action.busy} className="live-fields">
        {register && <label className="login-field"><span>ชื่อผู้ติดต่อ</span><div><Icon name="file"/><input name="name" required maxLength={200} autoComplete="name" placeholder="ชื่อผู้ติดต่อ"/></div></label>}
        <label className="login-field"><span>ชื่อผู้ใช้</span><div><Icon name="inbox"/><input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9_.\-]+" autoComplete="username" placeholder="username"/></div></label>
        <label className="login-field"><span>รหัสผ่าน</span><div><Icon name="clock"/><input name="password" type="password" required autoComplete={register ? "new-password" : "current-password"} placeholder="กรอกรหัสผ่าน"/></div></label>
        {register && <><small className="auth-help">อย่างน้อย 12 ตัวอักษร และไม่เกิน 128 ไบต์</small><label className="login-field"><span>ประเภทลูกค้า</span><div><select value={type} onChange={(event) => setType(event.target.value)}><option value="individual">บุคคลทั่วไป</option><option value="company">บริษัท</option></select></div></label>{type === "company" && <><label className="login-field"><span>การเข้าร่วมบริษัท</span><div><select value={companyMode} onChange={(event) => setCompanyMode(event.target.value)}><option value="new">สร้างบริษัทใหม่</option><option value="join">เข้าร่วมด้วยคำเชิญ</option></select></div></label>{companyMode === "new" ? <label className="login-field"><span>ชื่อบริษัท</span><div><input name="company_name" required maxLength={200}/></div></label> : <label className="login-field"><span>คำเชิญส่วนตัว</span><div><input name="invitation" type="password" required autoComplete="off"/></div></label>}</>}</>}
        <button className="login-submit" type="submit">{register ? "สมัครบัญชี" : "เข้าสู่ระบบ"} <Icon name="arrow"/></button>
      </fieldset></form>
      <Feedback {...action}/><Link className="login-register-link" href={register ? "/login" : "/register"}>{register ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครบัญชี"}</Link>
      <details className="demo-bypass"><summary><span>บัญชีทดสอบ — ข้ามการเข้าสู่ระบบ</span><i aria-hidden="true"/></summary><div className="demo-bypass-content">
        <div className="bypass-actions">{ROLES.map((role) => <button type="button" key={role} disabled={action.busy} onClick={() => enterDemo(role)}><Icon name={role === "Worker" ? "machine" : role === "Admin" ? "grid" : "file"}/><span><strong>ทดสอบ {ROLE_LABELS[role]}</strong><small>{role === "Worker" ? "งานผลิตและเอกสาร" : role === "Admin" ? "จัดการพนักงานและสั่งซื้อ" : "คำขอและใบเสนอราคา"}</small></span><Icon name="arrow"/></button>)}</div>
        <p className="demo-context">บัญชีทดสอบไม่เชื่อมข้อมูลจริง และข้อมูลจะเริ่มใหม่เมื่อรีโหลดหน้า</p>
      </div></details>
      <span className="auth-api">Connected API · {base}</span></div>
    </section>
  </main>;
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

