"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, Logo, ThemeToggle } from "./appearance";
import { setDemoRole } from "./demo-session";
import { ROLES, type Role } from "./demo-access";
import { ROLE_LABELS, ROLE_ROOTS } from "./workspace-routes";

export default function AuthPage({ register = false, onConnected }: { register?: boolean; onConnected?: () => void }) {
  const router = useRouter();
  function enter(role: Role) { setDemoRole(role); router.push(ROLE_ROOTS[role]); }
  return <main className="login-page">
    <section className="login-showcase"><Logo onClick={() => router.push("/")}/><div className="login-showcase-copy"><span className="hero-kicker"><i className="live-dot"/> LATHE SHOP CONTROL</span><h1>{register ? <>เริ่มต้นงานใหม่<br/>ให้เป็นระบบ</> : <>ทุกงานสำคัญ<br/>อยู่ในที่เดียว</>}</h1><p>จัดการงานผลิต ติดตามความคืบหน้า และตรวจสอบเอกสารได้จากบัญชีของคุณ</p></div><div className="login-machine" aria-hidden="true"><div className="machine-orbit orbit-one"/><div className="machine-orbit orbit-two"/><div className="machine-core"><span/><i/></div></div><div className="login-showcase-footer"><span>LATHE SHOP CONTROL</span><small>Bangkok · Thailand</small></div></section>
    <section className="login-panel"><div className="auth-toolbar"><Link className="login-back" href="/">← กลับหน้าแรก</Link><ThemeToggle/></div>
      <div className="login-card"><span className="eyebrow">{register ? "CREATE ACCOUNT" : "WELCOME BACK"}</span><h2>{register ? "สมัครบัญชี" : "เข้าสู่ระบบ"}</h2>
      <p>{register ? "สร้างบัญชีเพื่อส่งคำขอผลิตและติดตามงาน" : "พื้นที่เดียวสำหรับลูกค้า ทีมงาน และผู้ดูแลระบบ"}</p>
      <p className="auth-availability" role="status">หน้านี้ใช้สำหรับบัญชีทดสอบเท่านั้น ข้อมูลจะไม่ถูกส่งไปยังระบบจริง</p>
      <fieldset disabled className="pending-auth" aria-label={register ? "แบบฟอร์มสมัครบัญชีที่ยังไม่เปิดใช้งาน" : "แบบฟอร์มเข้าสู่ระบบที่ยังไม่เปิดใช้งาน"}>
        {register && <label className="login-field"><span>ชื่อผู้ติดต่อ</span><div><input placeholder="ชื่อผู้ติดต่อ"/></div></label>}
        <label className="login-field"><span>อีเมล</span><div><Icon name="inbox"/><input type="email" autoComplete="email" placeholder="name@example.com"/></div></label>
        <label className="login-field"><span>รหัสผ่าน</span><div><Icon name="clock"/><input type="password" autoComplete={register ? "new-password" : "current-password"} placeholder="กรอกรหัสผ่าน"/></div></label>
        <button className="login-submit" type="button">{register ? "สมัครบัญชี" : "เข้าสู่ระบบ"} <Icon name="arrow"/></button>
      </fieldset>
      <Link className="login-register-link" href={register ? "/login" : "/register"}>{register ? "มีบัญชีแล้ว? เข้าสู่ระบบ" : "ยังไม่มีบัญชี? สมัครบัญชี"}</Link>
      {onConnected && <button className="login-register-link auth-connected-link" type="button" onClick={onConnected}>กลับไปยังระบบบัญชีจริง</button>}
      <div className="login-divider"><span>เลือกบัญชีทดสอบ</span></div>
      <div className="bypass-actions">{ROLES.map(role => <button type="button" key={role} onClick={() => enter(role)}><Icon name={role === "Worker" ? "machine" : role === "Admin" ? "grid" : "file"}/><span><strong>ทดสอบ {ROLE_LABELS[role]}</strong><small>{role === "Worker" ? "งานผลิตและเอกสาร" : role === "Admin" ? "จัดการพนักงานและสั่งซื้อ" : "คำขอและใบเสนอราคา"}</small></span><Icon name="arrow"/></button>)}</div>
      <p className="demo-context">ข้อมูลทดสอบร่วมกันระหว่างบทบาท รีโหลดหน้าแล้วข้อมูลจะเริ่มใหม่</p>
      </div>
    </section>
  </main>;
}
