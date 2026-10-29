"use client";
import { authStyles as styles } from "../../components/ui/style-scopes";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect,useRef,useState,type FormEvent } from "react";
import { ThemeToggle } from "../../components/appearance/appearance";
import { Icon,Logo } from "../../components/appearance/icons";

import { Feedback,passwordError,text } from "../../components/ui/backend-ui";
import { useCommand } from "../../hooks/backend-hooks";
import { BackendApi } from "../../lib/api/backend-api";
import { API_ROLES } from "../workspace/workspace-access";
import { ROLE_ROOTS } from "../workspace/workspace-routes";
import { useApiSession } from "./api-session";
import { DemoAccountPicker } from "./demo-account-picker";

// Login and registration use only the configured real API.
export default function BackendWorkspace({ initialRegister = false }: { initialRegister?: boolean }) {
  const router = useRouter();
  const { signIn, signInLocalTest, localTestEnabled, notice, liveBase } = useApiSession();
  async function enter(username: string, password: string) {
    const session = await signIn(username, password);
    router.push(ROLE_ROOTS[API_ROLES[session.account.role]]);
  }
  async function enterLocalTest(username: string) {
    const session = await signInLocalTest(username);
    router.push(ROLE_ROOTS[API_ROLES[session.account.role]]);
  }
  return <LiveLogin key={initialRegister ? "register" : "login"} base={liveBase} notice={notice} initialRegister={initialRegister} onLogin={enter} localTestEnabled={localTestEnabled} onLocalLogin={enterLocalTest} />;
}
function LiveLogin({ base, notice, initialRegister, onLogin, localTestEnabled, onLocalLogin }: { base: string; notice: string; initialRegister: boolean; onLogin: (username: string, password: string) => Promise<void>; localTestEnabled: boolean; onLocalLogin: (username: string) => Promise<void> }) {
  const showTestAccounts = useSearchParams().get("accounts") === "test";
  const router = useRouter();
  const [register, setRegister] = useState(initialRegister);
  const [type, setType] = useState("individual");
  const [companyMode, setCompanyMode] = useState("new");
  const action = useCommand();
  const registrationApi = useRef<BackendApi | null>(null);
  const loginForm = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (register || !showTestAccounts || !localTestEnabled) return;
    const picker = document.querySelector<HTMLDetailsElement>(".auth-account-picker");
    if (picker) { picker.open = true; picker.querySelector("summary")?.focus(); picker.scrollIntoView({ block: "nearest" }); }
  }, [register, showTestAccounts, localTestEnabled]);
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
  return <main className={`login-page ${styles.scope}`}>
    <section className="login-showcase"><Logo onClick={() => router.push("/")}/><div className="login-showcase-copy"><span className="hero-kicker"><i className="live-dot"/> LATHE SHOP CONTROL</span><h1>{register ? <>เริ่มต้นงานใหม่<br/>ให้เป็นระบบ</> : <>ทุกงานสำคัญ<br/>อยู่ในที่เดียว</>}</h1><p>จัดการงานผลิต ติดตามความคืบหน้า และตรวจสอบเอกสารได้จากบัญชีของคุณ</p></div><div className="login-machine" aria-hidden="true"><div className="machine-orbit orbit-one"/><div className="machine-orbit orbit-two"/><div className="machine-core"><span/><i/></div></div><div className="login-showcase-footer"><span>LATHE SHOP CONTROL</span><small>Bangkok · Thailand</small></div></section>
    <section className="login-panel"><div className="auth-toolbar"><Link className="login-back" href="/">← กลับหน้าแรก</Link><ThemeToggle/></div>
      <div className="login-card"><span className="eyebrow">{register ? "CREATE ACCOUNT" : "WELCOME BACK"}</span><h2>{register ? "สมัครบัญชี" : "เข้าสู่ระบบ"}</h2><p>{register ? "สร้างบัญชีลูกค้าเพื่อส่งคำขอผลิตและติดตามงาน" : "ลูกค้า Staff และ Admin ใช้หน้าเข้าสู่ระบบเดียวกัน"}</p>
      {notice && <p className="workflow-success" role="status">{notice}</p>}
      <form ref={loginForm} onSubmit={submit} aria-busy={action.busy}><fieldset disabled={action.busy} className="live-fields">
        {register && <label className="login-field"><span>ชื่อผู้ติดต่อ</span><div><Icon name="file"/><input name="name" required maxLength={200} autoComplete="name" placeholder="ชื่อผู้ติดต่อ"/></div></label>}
        <label className="login-field"><span>ชื่อผู้ใช้</span><div><Icon name="inbox"/><input name="username" required minLength={3} maxLength={64} pattern="[A-Za-z0-9_.\-]+" autoComplete="username" placeholder="username"/></div></label>
        <label className="login-field"><span>รหัสผ่าน</span><div><Icon name="clock"/><input name="password" type="password" required autoComplete={register ? "new-password" : "current-password"} placeholder="กรอกรหัสผ่าน"/></div></label>
        {register && <><small className="auth-help">อย่างน้อย 12 ตัวอักษร และไม่เกิน 128 ไบต์</small><label className="login-field"><span>ประเภทลูกค้า</span><div><select value={type} onChange={(event) => setType(event.target.value)}><option value="individual">บุคคลทั่วไป</option><option value="company">บริษัท</option></select></div></label>{type === "company" && <><label className="login-field"><span>การเข้าร่วมบริษัท</span><div><select value={companyMode} onChange={(event) => setCompanyMode(event.target.value)}><option value="new">สร้างบริษัทใหม่</option><option value="join">เข้าร่วมด้วยคำเชิญ</option></select></div></label>{companyMode === "new" ? <label className="login-field"><span>ชื่อบริษัท</span><div><input name="company_name" required maxLength={200}/></div></label> : <label className="login-field"><span>คำเชิญส่วนตัว</span><div><input name="invitation" type="password" required autoComplete="off"/></div></label>}</>}</>}
        <button className="login-submit" type="submit">{register ? "สมัครบัญชี" : "เข้าสู่ระบบ"} <Icon name="arrow"/></button>
      </fieldset></form>
      <Feedback {...action}/><Link className="login-register-link" href={register ? "/login" : "/register"}>{register ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครบัญชี"}</Link>
      {!register && <DemoAccountPicker disabled={action.busy} localTestEnabled={localTestEnabled} onSelect={(username) => {
        const form = loginForm.current;
        if (!form) return;
        (form.elements.namedItem("username") as HTMLInputElement).value = username;
        const password = form.elements.namedItem("password") as HTMLInputElement;
        password.value = "";
        if (localTestEnabled) void action.run(() => onLocalLogin(username), "");
        else password.focus();
      }} />}
      <span className="auth-api">Connected API · {base}</span></div>
    </section>
  </main>;
}

