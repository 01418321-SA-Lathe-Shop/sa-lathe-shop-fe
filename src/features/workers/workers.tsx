"use client";

import { useState, type MouseEvent } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi, Worker } from "../../lib/api/backend-api";
import { Button, Drawer, EmptyState, LoadError, SearchForm, Skeleton, StatusTabs, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { initials, matchWorker } from "./workers-domain";
import { EditWorker, PasswordForm, WorkerForm } from "./workers-form";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./workers.module.css";

type Panel = { kind: "new" } | { kind: "edit" | "password"; worker: Worker } | null;

const closeMenu = (event: MouseEvent<HTMLElement>) => event.currentTarget.closest("details")?.removeAttribute("open");

// จัดการพนักงาน (Admin): Staff accounts only. Nothing is deleted and nobody can be
// promoted to Admin; contacts are optional on old accounts until someone fills them in.
export function LiveWorkers({ api }: { api: BackendApi }) {
  const workers = useCollection<Worker>(api, "/admin/workers");
  const [q, setQ] = useState(""); const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const pathname = usePathname(); const status = useSearchParams().get("status") ?? "all";
  const all = workers.data?.items ?? []; const active = all.filter((worker) => worker.is_active).length;
  const items = all.filter((worker) => (status === "all" || (status === "active") === worker.is_active) && matchWorker(worker, q));
  const saved = (message: string) => { setPanel(null); setToast(message); workers.reload(); };
  const title = panel?.kind === "new" ? "เพิ่มพนักงาน" : panel?.kind === "edit" ? `แก้ไข ${panel.worker.name}` : panel ? `เปลี่ยนรหัสผ่าน ${panel.worker.name}` : "";
  const loaded = Boolean(workers.data); const count = (n: number) => loaded ? n.toLocaleString("th-TH") : "—";
  return <section className={layout.page}>
    <div className={styles.head}>
      <Button onClick={workers.reload} disabled={workers.loading}>อัปเดตข้อมูล</Button>
      <Button variant="primary" onClick={() => setPanel({ kind: "new" })}><Icon name="plus" size={16} />เพิ่มพนักงาน</Button>
    </div>
    <dl className={styles.summary}>
      <div><dt>พนักงานทั้งหมด</dt><dd>{count(all.length)}</dd></div>
      <div><dt>ใช้งานอยู่</dt><dd data-tone="done">{count(active)}</dd></div>
      <div><dt>ปิดใช้งาน</dt><dd data-tone="quiet">{count(all.length - active)}</dd></div>
    </dl>
    <TruncatedNotice show={workers.data?.complete === false} />
    <section className={styles.panel} aria-label="รายชื่อพนักงาน">
      <div className={styles.panelBar}>
        <StatusTabs label="สถานะบัญชีพนักงาน" tabs={[{ key: "all", label: "ทั้งหมด", count: all.length }, { key: "active", label: "ใช้งานอยู่", count: active }, { key: "inactive", label: "ปิดใช้งาน", count: all.length - active }]} current={status} href={(key) => key === "all" ? pathname : `${pathname}?status=${key}`} loading={workers.loading && !workers.data} unavailable={Boolean(workers.error && !workers.data)} />
        <SearchForm label="ค้นหาพนักงาน" placeholder="ชื่อ ชื่อผู้ใช้ รหัสพนักงาน หรือตำแหน่ง" value={q} onSearch={setQ} />
      </div>
      {q && <p className={styles.note}>ผลการค้นหา “{q}” <Button variant="text" onClick={() => setQ("")}>ล้างการค้นหา</Button></p>}
      {workers.loading && !workers.data && <div className={styles.note}><Skeleton label="กำลังโหลดพนักงาน…" /></div>}
      {workers.error && !workers.data && <div className={styles.note}><LoadError title="โหลดรายชื่อพนักงานไม่สำเร็จ" onRetry={workers.reload} /></div>}
      {workers.data && !items.length && <EmptyState title={q || status !== "all" ? "ไม่พบพนักงานที่ตรงกับตัวกรอง" : "ยังไม่มีบัญชีพนักงาน"}>{q || status !== "all" ? "ลองเปลี่ยนคำค้นหาหรือสถานะบัญชี" : "เพิ่มพนักงานเพื่อสร้างบัญชีเข้าใช้งาน"}</EmptyState>}
      {items.length > 0 && <table className={styles.table}>
        <thead><tr><th scope="col">ชื่อ</th><th scope="col">ตำแหน่งและติดต่อ</th><th scope="col">สถานะ</th><th scope="col"><span className={layout.visuallyHidden}>จัดการ</span></th></tr></thead>
        <tbody>{items.map((worker) => <tr key={worker.id}>
          <td><span className={styles.person}><span className={styles.avatar} aria-hidden="true">{initials(worker.name)}</span><span><strong>{worker.name}</strong><small className={styles.code}>{worker.employee_no} · {worker.username}</small></span></span></td>
          <td><span className={styles.stack}><span>{worker.position || "ไม่ระบุตำแหน่ง"}</span><small>{worker.email && worker.phone ? `${worker.phone} · ${worker.email}` : "ยังไม่มีข้อมูลติดต่อ (บัญชีเก่า) กรอกได้ที่แก้ไข"}</small></span></td>
          <td>{worker.is_active ? <ToneBadge tone="done">ใช้งานอยู่</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}</td>
          <td><details className={layout.menu}>
            <summary aria-label={`ตัวเลือกสำหรับ ${worker.name}`} title="ตัวเลือก"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></summary>
            <div>
              <button type="button" onClick={(event) => { closeMenu(event); setPanel({ kind: "edit", worker }); }}>แก้ไขข้อมูลและสถานะ</button>
              <button type="button" onClick={(event) => { closeMenu(event); setPanel({ kind: "password", worker }); }}>เปลี่ยนรหัสผ่าน</button>
            </div>
          </details></td>
        </tr>)}</tbody>
      </table>}
      {loaded && <p className={styles.footer} aria-live="polite">แสดง {items.length.toLocaleString("th-TH")} จาก {all.length.toLocaleString("th-TH")} คน</p>}
    </section>
    <Drawer centered open={panel !== null} title={title} onClose={() => setPanel(null)}>
      {panel?.kind === "new" && <WorkerForm api={api} onSaved={() => saved("เพิ่มพนักงานแล้ว")} />}
      {panel?.kind === "edit" && <EditWorker key={panel.worker.id} api={api} id={panel.worker.id} onSaved={saved} />}
      {panel?.kind === "password" && <PasswordForm key={panel.worker.id} api={api} worker={panel.worker} onSaved={() => saved(`เปลี่ยนรหัสผ่าน ${panel.worker.name} แล้ว ต้องเข้าสู่ระบบใหม่ทุกเครื่อง`)} />}
    </Drawer>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}
