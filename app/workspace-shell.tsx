"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon, Logo, ThemeToggle } from "./appearance";
import { canAccessWorkspace, getWorkspaces, type Role, type WorkspaceId } from "./demo-access";
import { getDemoRole, getServerDemoRole, setDemoRole, subscribeToDemoRole } from "./demo-session";
import { PAGE_LABELS, ROLE_LABELS, ROLE_ROOTS, workspacePath } from "./workspace-routes";
import { useWorkshop } from "./workshop-context";
import CustomerWorkspace from "./customer-workspace";
import WorkerWorkspace from "./worker-workspace";
import AdminWorkspace from "./admin-workspace";

const icons = { overview: "grid", requests: "inbox", quotations: "file", "deposit-po": "wallet", materials: "layers", orders: "file", receiving: "inbox", production: "machine", "delivery-payment": "truck", workers: "grid" } as const;
const descriptions: Record<Role, string> = {
  Customer: "ส่งคำขอ ตอบรับใบเสนอราคา และติดตามการส่งมอบกับการชำระเงิน",
  Worker: "ประเมินราคา จัดเตรียมวัตถุดิบ และติดตามงานตั้งแต่ผลิตจนส่งมอบ",
  Admin: "ดูแลบัญชีพนักงานและจัดการการสั่งซื้อวัตถุดิบ",
};

export default function WorkspaceShell({ role: expected, workspaceId = "overview" }: { role: Role; workspaceId?: WorkspaceId }) {
  const router = useRouter();
  const role = useSyncExternalStore(subscribeToDemoRole, getDemoRole, getServerDemoRole);
  const [menuOpen, setMenuOpen] = useState(false);
  const { state: { data, generation } } = useWorkshop();
  useEffect(() => {
    const current = getDemoRole();
    if (!current) router.replace("/login");
    else if (current !== expected) router.replace(ROLE_ROOTS[current]);
  }, [role, expected, router]);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") { setMenuOpen(false); document.getElementById("navigation-toggle")?.focus(); } };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menuOpen]);
  if (role !== expected) return <main className="page-content"><p role="status">กำลังตรวจสอบพื้นที่ทำงาน…</p></main>;
  if (!canAccessWorkspace(role, workspaceId)) return <main className="page-content"><h1>ไม่มีสิทธิ์เข้าถึงหน้านี้</h1><Link href={ROLE_ROOTS[role]}>กลับภาพรวม</Link></main>;
  const items = getWorkspaces(role);
  const navigate = (id: WorkspaceId) => { if (canAccessWorkspace(role, id)) router.push(workspacePath(role, id)); };
  const signOut = () => { setDemoRole(null); router.push("/login"); };
  const overview = workspaceId === "overview";
  const metrics = role === "Admin"
    ? [["พนักงานทั้งหมด", data.workers.length], ["พนักงานที่เปิดใช้งาน", data.workers.filter(w => w.status === "active").length], ["คำสั่งซื้อวัตถุดิบ", data.orders.length]]
    : [["คำขอทั้งหมด", data.requests.length], ["งานผลิต", data.requests.filter(r => r.job).length], ["งานส่งมอบ", data.requests.filter(r => r.delivery).length]];
  return <div className="app-shell integrated-shell">
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
      <div className="sidebar-theme"><ThemeToggle/></div>
      <div className="sidebar-footer"><div className="avatar">{role === "Worker" ? "ST" : role === "Admin" ? "AD" : "CU"}</div><div><strong>บัญชีทดสอบ {ROLE_LABELS[role]}</strong><span>{role === "Admin" ? "ผู้ดูแลระบบ" : role === "Worker" ? "พนักงาน" : "ลูกค้า"}</span></div><button aria-label="ออกจากระบบ" onClick={signOut}><Icon name="logout"/></button></div>
    </aside>
    <div className="app-stage">
      <header className="topbar integrated-topbar"><button id="navigation-toggle" className="mobile-navigation icon-button" aria-label="เปิดเมนู" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name="grid"/></button><span className="eyebrow">{ROLE_LABELS[role]} / {PAGE_LABELS[workspaceId]}</span><Link className="secondary-button switch-account" href="/login">เปลี่ยนบัญชีทดสอบ</Link></header>
      <main id="main-content" className="page-content">
        <section className="page-heading"><div><span className="eyebrow">{ROLE_LABELS[role].toUpperCase()} / {workspaceId.toUpperCase()}</span><h1 id="workspace-title" tabIndex={-1}>{overview ? role === "Admin" ? "ศูนย์จัดการระบบ" : role === "Worker" ? "ศูนย์ควบคุมงานผลิต" : "งานของคุณในที่เดียว" : PAGE_LABELS[workspaceId]}</h1><p>{descriptions[role]}</p></div></section>
        <p className="demo-context">โหมดทดสอบ · ข้อมูลร่วมกันระหว่างบทบาท · รีโหลดหน้าเพื่อล้างข้อมูลตัวอย่าง</p>
        {overview ? <>
          <section className="workspace-stats">{metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>ข้อมูลในพื้นที่ทดสอบนี้</small></article>)}</section>
          <section className="workspace-links">{items.map(item => <Link key={item.id} className="panel workspace-link-card" href={workspacePath(role, item.id)}><span className="workspace-card-icon"><Icon name={icons[item.id]} size={25}/></span><span className="eyebrow">{item.useCase}</span><h2>{PAGE_LABELS[item.id]}</h2><p>{item.description}</p><span className="workspace-card-action">เปิดพื้นที่ทำงาน <Icon name="arrow"/></span></Link>)}</section>
        </> : <div className="workflow-content">
          {role === "Customer" && <CustomerWorkspace key={`${generation}:${workspaceId}`} workspaceId={workspaceId} navigate={navigate}/>}
          {role === "Worker" && <WorkerWorkspace key={`${generation}:${workspaceId}`} role={role} workspaceId={workspaceId} navigate={navigate}/>}
          {role === "Admin" && workspaceId === "orders" && <WorkerWorkspace key={generation} role={role} workspaceId="orders" navigate={navigate}/>}
          {role === "Admin" && workspaceId === "workers" && <AdminWorkspace key={generation} role={role}/>}
        </div>}
      </main>
    </div>
  </div>;
}
