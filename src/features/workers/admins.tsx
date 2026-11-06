"use client";

import { useRef, useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Admin, BackendApi } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Button, ConfirmDialog, Drawer, EmptyState, ErrorText, Field, LoadError, Skeleton, Toast, ToneBadge } from "../../components/staff-ui/staff-ui";
import { workerContacts } from "../fulfillment/fulfillment-domain";
import { initials, workerErrors, workerPasswordError } from "./workers-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./workers.module.css";

// UC12 ผู้ดูแลระบบ: Super Admin only. Creates regular Admins and turns them on or off;
// Super Admins cannot be switched off and nobody is promoted.
export function LiveAdmins({ api }: { api: BackendApi }) {
  const admins = useResource<{ items: Admin[] }>(api, "/admin/admins"); const status = useCommand();
  const [adding, setAdding] = useState(false); const [target, setTarget] = useState<Admin | null>(null); const [toast, setToast] = useState("");
  const items = admins.data?.items ?? [];
  const saved = (message: string) => { setAdding(false); setToast(message); admins.reload(); };
  return <section className={styles.panel} aria-label="ผู้ดูแลระบบ">
    <div className={styles.panelBar}>
      <h2>ผู้ดูแลระบบ (Admin)</h2>
      <Button variant="primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} />เพิ่มผู้ดูแลระบบ</Button>
    </div>
    <p className={styles.note}>เฉพาะ Super Admin เห็นส่วนนี้ ผู้ดูแลระบบที่เพิ่มใหม่เป็น Admin ทั่วไปเสมอ</p>
    {admins.loading && !admins.data && <div className={styles.note}><Skeleton label="กำลังโหลดผู้ดูแลระบบ…" /></div>}
    {admins.error && !admins.data && <div className={styles.note}><LoadError title="โหลดรายชื่อผู้ดูแลระบบไม่สำเร็จ" onRetry={admins.reload} /></div>}
    {admins.data && !items.length && <EmptyState title="ยังไม่มีผู้ดูแลระบบ">เพิ่มผู้ดูแลระบบเพื่อสร้างบัญชีเข้าใช้งาน</EmptyState>}
    {items.length > 0 && <table className={styles.table}>
      <thead><tr><th scope="col">ชื่อ</th><th scope="col">ติดต่อ</th><th scope="col">ระดับและสถานะ</th><th scope="col"><span className={layout.visuallyHidden}>จัดการ</span></th></tr></thead>
      <tbody>{items.map((admin) => <tr key={admin.id}>
        <td><span className={styles.person}><span className={styles.avatar} aria-hidden="true">{initials(admin.name)}</span><span><strong>{admin.name}</strong><small className={styles.code}>{admin.username}</small></span></span></td>
        <td><small>{admin.email && admin.phone ? `${admin.phone} · ${admin.email}` : "ไม่มีข้อมูลติดต่อ"}</small></td>
        <td><span className={styles.stack}><span>{admin.is_super_admin ? <ToneBadge tone="action">Super Admin</ToneBadge> : <ToneBadge tone="quiet">Admin</ToneBadge>}</span><span>{admin.is_active ? <ToneBadge tone="done">ใช้งานอยู่</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}</span></span></td>
        <td>{!admin.is_super_admin && <Button variant={admin.is_active ? "danger" : "secondary"} disabled={status.busy} onClick={() => setTarget(admin)}>{admin.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</Button>}</td>
      </tr>)}</tbody>
    </table>}
    <ErrorText error={status.error} />
    {target && <ConfirmDialog open title={target.is_active ? "ปิดใช้งานผู้ดูแลระบบนี้?" : "เปิดใช้งานผู้ดูแลระบบนี้?"} confirmLabel={target.is_active ? "ยืนยันปิดใช้งาน" : "ยืนยันเปิดใช้งาน"} danger={target.is_active} onClose={() => setTarget(null)} onConfirm={() => {
      const admin = target; setTarget(null);
      void status.run(async (signal) => { await api.call(`/admin/admins/${admin.id}`, "PATCH", { is_active: !admin.is_active }, signal); saved(admin.is_active ? `ปิดใช้งาน ${admin.name} แล้ว` : `เปิดใช้งาน ${admin.name} แล้ว`); }, "");
    }}><p>{target.name} · {target.username}</p><p>{target.is_active ? "ผู้ดูแลระบบจะถูกออกจากระบบทุกเครื่องทันที เปิดใช้งานกลับได้ภายหลัง" : "เปิดใช้งานแล้วต้องเข้าสู่ระบบใหม่"}</p></ConfirmDialog>}
    <Drawer centered open={adding} title="เพิ่มผู้ดูแลระบบ" onClose={() => setAdding(false)}>
      {adding && <AdminForm api={api} onSaved={() => saved("เพิ่มผู้ดูแลระบบแล้ว")} />}
    </Drawer>
    <Toast message={toast} onDone={() => setToast("")} />
  </section>;
}

function AdminForm({ api, onSaved }: { api: BackendApi; onSaved: () => void }) {
  const command = useCommand(); const [draft, setDraft] = useState({ name: "", username: "", email: "", phone: "" });
  const [shown, setShown] = useState(false); const [passwordError, setPasswordError] = useState("");
  const password = useRef<HTMLInputElement>(null); const again = useRef<HTMLInputElement>(null);
  // Admins have no employee number or position; fixed valid values reuse the Worker rules for the rest.
  const errors = workerErrors({ ...draft, employee_no: "ADMIN", position: "" }); const show = (key: keyof typeof draft) => (shown && errors[key]) || undefined;
  const set = (key: keyof typeof draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const save = () => {
    setShown(true);
    const first = password.current?.value ?? ""; const second = again.current?.value ?? "";
    if (password.current) password.current.value = ""; if (again.current) again.current.value = "";
    const invalid = workerPasswordError(first, second); setPasswordError(invalid);
    if (invalid || Object.keys(errors).length) return;
    void command.run(async (signal) => { await api.call("/admin/admins", "POST", { ...workerContacts(draft.email, draft.phone), name: draft.name.trim(), username: draft.username.trim(), password: first }, signal); onSaved(); }, "");
  };
  return <div className={layout.form}>
    <fieldset className={styles.section} disabled={command.busy}>
      <legend>ข้อมูล</legend>
      <Field label="ชื่อ-นามสกุล" error={show("name")}><input value={draft.name} maxLength={200} onChange={set("name")} /></Field>
      <Field label="ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)" hint="ระบบเก็บเป็นตัวพิมพ์เล็ก" error={show("username")}><input value={draft.username} maxLength={64} autoComplete="off" autoCapitalize="none" onChange={set("username")} /></Field>
    </fieldset>
    <fieldset className={styles.section} disabled={command.busy}>
      <legend>ติดต่อ</legend>
      <Field label="อีเมล" error={show("email")}><input value={draft.email} inputMode="email" autoComplete="off" onChange={set("email")} /></Field>
      <Field label="เบอร์โทร" hint="7–15 หลัก ขึ้นต้นด้วย + ได้" error={show("phone")}><input value={draft.phone} inputMode="tel" maxLength={64} autoComplete="off" onChange={set("phone")} /></Field>
    </fieldset>
    <fieldset className={styles.section} disabled={command.busy}>
      <legend>รหัสผ่านเริ่มต้น</legend>
      <Field label="รหัสผ่าน" hint="อย่างน้อย 12 ตัวอักษร ไม่เกิน 128 ตัวอักษร เว้นวรรคนับด้วย" error={passwordError || undefined}><input ref={password} type="password" autoComplete="new-password" /></Field>
      <Field label="ยืนยันรหัสผ่าน"><input ref={again} type="password" autoComplete="new-password" /></Field>
      <p className={layout.muted}>ช่องรหัสผ่านจะถูกล้างทุกครั้งที่กดบันทึก แจ้งรหัสผ่านให้ผู้ดูแลระบบด้วยตนเอง</p>
    </fieldset>
    <div className={layout.submitBar} data-sticky><span>ระดับ: Admin ทั่วไป</span><button type="button" className={layout.submit} disabled={command.busy} onClick={save}>เพิ่มผู้ดูแลระบบ</button></div>
    {command.error && <><ErrorText error={command.error} /><p className={layout.muted}>ชื่อผู้ใช้อาจซ้ำ ถ้าไม่แน่ใจว่าสร้างแล้วหรือยัง ให้ปิดแผงนี้และตรวจรายการก่อนเพิ่มอีกครั้ง</p></>}
  </div>;
}
