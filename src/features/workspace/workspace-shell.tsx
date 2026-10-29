"use client";
import { workspaceStyles as styles } from "../../components/ui/style-scopes";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SettingsToggle, ThemeToggle } from "../../components/appearance/appearance";
import { Icon, Logo } from "../../components/appearance/icons";

import { useApiSession } from "../auth/api-session";
import { API_ROLES, canAccessWorkspace, getWorkspaces, type Role, type WorkspaceId } from "./workspace-access";
import { PAGE_LABELS, ROLE_LABELS, ROLE_ROOTS, workspacePath } from "./workspace-routes";
import ConnectedWorkspace from "./connected-workspace";
import CustomerShell from "../customer/customer-shell";
import { DemoAccountSwitch } from "../auth/demo-account-switch";

import { workspaceIcons as icons } from "./workspace-icons";
const descriptions: Record<Role, string> = {
  Customer: "ส่งคำขอ ตอบรับใบเสนอราคา และติดตามการส่งมอบกับการชำระเงิน",
  Worker: "ประเมินราคา จัดเตรียมวัตถุดิบ และติดตามงานตั้งแต่ผลิตจนส่งมอบ",
  Admin: "ดูแลบัญชีพนักงาน วัตถุดิบ การสั่งซื้อ และการเงินของงาน",
};

export default function WorkspaceShell({ role: expected, workspaceId = "overview" }: { role: Role; workspaceId?: WorkspaceId }) {
  const router = useRouter();
  const { session, signOut } = useApiSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = session ? API_ROLES[session.account.role] : null;
  useEffect(() => {
    if (!session) router.replace("/login");
    else if (role !== expected) router.replace(ROLE_ROOTS[role as Role]);
  }, [session, role, expected, router]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); document.getElementById("navigation-toggle")?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  if (!session || role !== expected) return <main className={`page-content ${styles.scope}`}><p role="status">กำลังตรวจสอบพื้นที่ทำงาน…</p></main>;
  if (!canAccessWorkspace(role, workspaceId)) return <main className={`page-content ${styles.scope}`}><h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1><Link href={ROLE_ROOTS[role]}>กลับภาพรวม</Link></main>;
  const { account } = session;
  const items = getWorkspaces(role);
  const overview = workspaceId === "overview";
  const leave = () => void signOut().then(() => router.push("/login"));
  const initials = account.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "??";
  if (role === "Customer") return <CustomerShell key={account.id} session={session} leave={leave} />;
  return <div className={`app-shell integrated-shell ${styles.scope}`}>
    <a className="workflow-skip" href="#main-content">ข้ามไปเนื้อหา</a>
    {menuOpen && <button className="navigation-scrim" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}/>}
    <aside className={`sidebar integrated-sidebar ${menuOpen ? "navigation-open" : ""}`} aria-label={`เมนู ${ROLE_LABELS[role]}`}>
      <div className="sidebar-scroll">
        <Logo onClick={() => router.push("/")}/>
        <div className="staff-space"><span>{ROLE_LABELS[role].toUpperCase()} WORKSPACE</span><strong>{role === "Admin" ? "จัดการระบบ" : role === "Worker" ? "จัดการงานโรงกลึง" : "พื้นที่ลูกค้า"}</strong></div>
        <nav className="nav-list"><span className="nav-label">WORKSPACE</span>
          {[{ id: "overview" as const }, ...items].map(item => <Link key={item.id} href={workspacePath(role, item.id)} className={workspaceId === item.id ? "active" : ""} aria-current={workspaceId === item.id ? "page" : undefined} onClick={() => setMenuOpen(false)}><span className="nav-icon"><Icon name={icons[item.id]}/></span><span>{PAGE_LABELS[item.id]}</span></Link>)}
        </nav>
      </div>
      <div className="sidebar-theme"><DemoAccountSwitch onSwitched={() => setMenuOpen(false)}/><SettingsToggle/></div>
      <div className="sidebar-footer"><div className="avatar">{initials}</div><div><strong>{account.name}</strong><span>{role === "Admin" ? "ผู้ดูแลระบบ" : role === "Worker" ? "พนักงาน" : "ลูกค้า"} · {account.username}</span></div><button aria-label="ออกจากระบบ" onClick={leave}><Icon name="logout"/></button></div>
    </aside>
    <div className="app-stage">
      <header className="topbar integrated-topbar workspace-navbar">
        <div className="workspace-navbar-environment">เชื่อมต่อข้อมูลจริง · รีโหลดหน้าต้องเข้าสู่ระบบใหม่</div>
        <div className="workspace-navbar-brand"><Logo onClick={() => router.push(ROLE_ROOTS[role])}/></div>
        <div className="workspace-navbar-actions">
          <ThemeToggle/>
          <Link className="workspace-navbar-inbox" href={workspacePath(role, "inbox")} aria-label="การแจ้งเตือน" title="การแจ้งเตือน"><Icon name="bell"/></Link>
          <button id="navigation-toggle" className="mobile-navigation icon-button" aria-label="เปิดเมนู" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="grid"/></button>
        </div>
      </header>
      <main id="main-content" className={`page-content ${styles.scope}`}>
        <section className="page-heading"><div>{!overview && <span className="eyebrow">{ROLE_LABELS[role].toUpperCase()} / {workspaceId.toUpperCase()}</span>}<h1 id="workspace-title" tabIndex={-1}>{overview ? "ภาพรวมการผลิต" : PAGE_LABELS[workspaceId]}</h1><p>{overview ? descriptions[role] : items.find((item) => item.id === workspaceId)?.description}</p></div></section>
        <p className="demo-context">ข้อมูลจริงจาก backend · เวลา Asia/Bangkok · เงินบาท ไม่รวม VAT · รีโหลดหน้าต้องเข้าสู่ระบบใหม่</p>
        <div className="workflow-content live-workspace"><ConnectedWorkspace key={`${account.id}:${workspaceId}`} role={role} workspaceId={workspaceId} session={session} /></div>
      </main>
    </div>
  </div>;
}
