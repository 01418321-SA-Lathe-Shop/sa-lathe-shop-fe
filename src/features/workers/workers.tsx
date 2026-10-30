"use client";

import { useState } from "react";
import type { BackendApi, Worker } from "../../lib/api/backend-api";
import { Button, Drawer, EmptyState, LoadError, SearchForm, Skeleton, Toast, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { matchWorker } from "./workers-domain";
import { EditWorker, PasswordForm, WorkerForm } from "./workers-form";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./workers.module.css";

type Panel = { kind: "new" } | { kind: "edit" | "password"; worker: Worker } | null;

// จัดการพนักงาน (Admin): Staff accounts only. Nothing is deleted and nobody can be
// promoted to Admin; contacts are optional on old accounts until someone fills them in.
export function LiveWorkers({ api }: { api: BackendApi }) {
  const workers = useCollection<Worker>(api, "/admin/workers");
  const [q, setQ] = useState(""); const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState(""); const clearToast = () => setToast("");
  const items = (workers.data?.items ?? []).filter((worker) => matchWorker(worker, q));
  const saved = (message: string) => { setPanel(null); setToast(message); workers.reload(); };
  const title = panel?.kind === "new" ? "เพิ่มพนักงาน" : panel?.kind === "edit" ? `แก้ไข ${panel.worker.name}` : panel ? `เปลี่ยนรหัสผ่าน ${panel.worker.name}` : "";
  return <section className={layout.page}>
    <div className={layout.toolbarEnd}>
      <SearchForm label="ค้นหาพนักงาน" placeholder="ชื่อ ชื่อผู้ใช้ รหัสพนักงาน หรือตำแหน่ง" value={q} onSearch={setQ} />
      <Button onClick={workers.reload} disabled={workers.loading}>อัปเดตข้อมูล</Button>
      <Button variant="primary" onClick={() => setPanel({ kind: "new" })}>เพิ่มพนักงาน</Button>
    </div>
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Button variant="text" onClick={() => setQ("")}>ล้างการค้นหา</Button></p>}
    {workers.loading && !workers.data && <Skeleton label="กำลังโหลดพนักงาน…" />}
    {workers.error && !workers.data && <LoadError title="โหลดรายชื่อพนักงานไม่สำเร็จ" onRetry={workers.reload} />}
    <TruncatedNotice show={workers.data?.complete === false} />
    {workers.data && !items.length && <EmptyState title={q ? "ไม่พบพนักงานที่ค้นหา" : "ยังไม่มีบัญชีพนักงาน"}>{q ? "ลองค้นด้วยชื่อหรือรหัสพนักงานอื่น" : "เพิ่มพนักงานเพื่อสร้างบัญชีเข้าใช้งาน"}</EmptyState>}
    {items.length > 0 && <ul className={styles.workers}>{items.map((worker) => <li key={worker.id}>
      <span><strong>{worker.name}</strong><small>{worker.username} · {worker.employee_no}{worker.position ? ` · ${worker.position}` : ""}</small>
        <small>{worker.email && worker.phone ? `${worker.email} · ${worker.phone}` : "ยังไม่มีข้อมูลติดต่อ (บัญชีเก่า) กรอกได้ที่แก้ไข"}</small></span>
      {worker.is_active ? <ToneBadge tone="done">ใช้งานอยู่</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}
      <span className={layout.actions}>
        <Button onClick={() => setPanel({ kind: "edit", worker })}>แก้ไข<span className={layout.visuallyHidden}> {worker.name}</span></Button>
        <Button variant="text" onClick={() => setPanel({ kind: "password", worker })}>เปลี่ยนรหัสผ่าน<span className={layout.visuallyHidden}> {worker.name}</span></Button>
      </span>
    </li>)}</ul>}
    <Drawer open={panel !== null} title={title} onClose={() => setPanel(null)}>
      {panel?.kind === "new" && <WorkerForm api={api} onSaved={() => saved("เพิ่มพนักงานแล้ว")} />}
      {panel?.kind === "edit" && <EditWorker key={panel.worker.id} api={api} id={panel.worker.id} onSaved={saved} />}
      {panel?.kind === "password" && <PasswordForm key={panel.worker.id} api={api} worker={panel.worker} onSaved={() => saved(`เปลี่ยนรหัสผ่าน ${panel.worker.name} แล้ว ต้องเข้าสู่ระบบใหม่ทุกเครื่อง`)} />}
    </Drawer>
    <Toast message={toast} onDone={clearToast} />
  </section>;
}
