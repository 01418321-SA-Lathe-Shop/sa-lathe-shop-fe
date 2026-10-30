"use client";

import { useRef, useState } from "react";
import type { BackendApi, Worker } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Button, ConfirmDialog, ErrorText, Field, LoadError, Skeleton } from "../../components/staff-ui/staff-ui";
import { draftOf, usernameChanged, workerErrors, workerPasswordError, workerPayload, type WorkerDraft } from "./workers-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./workers.module.css";

const PASSWORD_HINT = "อย่างน้อย 12 ตัวอักษร ไม่เกิน 128 ไบต์ เว้นวรรคนับด้วย";

// Read the password fields once and clear them immediately, also on failure.
function takePasswords(first: React.RefObject<HTMLInputElement | null>, second: React.RefObject<HTMLInputElement | null>) {
  const values = [first.current?.value ?? "", second.current?.value ?? ""] as const;
  if (first.current) first.current.value = ""; if (second.current) second.current.value = "";
  return values;
}

export function EditWorker({ api, id, onSaved }: { api: BackendApi; id: string; onSaved: (message: string) => void }) {
  const resource = useResource<Worker>(api, `/admin/workers/${id}`);
  if (resource.data) return <WorkerForm key={resource.data.username} api={api} worker={resource.data} onSaved={() => onSaved("บันทึกข้อมูลพนักงานแล้ว")} onStatus={onSaved} />;
  return resource.error ? <LoadError title="โหลดข้อมูลพนักงานไม่สำเร็จ" onRetry={resource.reload} /> : <Skeleton label="กำลังโหลดข้อมูลพนักงาน…" rows={3} />;
}

// Create and edit share one form: ข้อมูล / ติดต่อ / (create only) รหัสผ่านเริ่มต้น.
// Plain POST/PATCH without retry keys, so an unclear failure means reload first.
export function WorkerForm({ api, worker, onSaved, onStatus }: { api: BackendApi; worker?: Worker; onSaved: () => void; onStatus?: (message: string) => void }) {
  const command = useCommand(); const status = useCommand();
  const [draft, setDraft] = useState<WorkerDraft>(() => draftOf(worker)); const [shown, setShown] = useState(false);
  const [passwordError, setPasswordError] = useState(""); const [confirm, setConfirm] = useState<"username" | "status" | null>(null);
  const password = useRef<HTMLInputElement>(null); const again = useRef<HTMLInputElement>(null);
  const errors = workerErrors(draft); const show = (key: keyof WorkerDraft) => (shown && errors[key]) || undefined;
  const set = (key: keyof WorkerDraft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  const send = (extra: Record<string, string> = {}) => void command.run(async (signal) => {
    await api.call(worker ? `/admin/workers/${worker.id}` : "/admin/workers", worker ? "PATCH" : "POST", { ...workerPayload(draft), ...extra }, signal); onSaved();
  }, "");
  const save = () => {
    setShown(true);
    if (!worker) { const [first, second] = takePasswords(password, again); const invalid = workerPasswordError(first, second); setPasswordError(invalid); if (invalid || Object.keys(errors).length) return; send({ password: first }); return; }
    if (Object.keys(errors).length) return;
    if (usernameChanged(worker, draft.username)) setConfirm("username"); else send();
  };
  const busy = command.busy || status.busy;
  // A div, not a form: ConfirmDialog carries its own form.
  return <div className={layout.form}>
    <fieldset className={styles.section} disabled={busy}>
      <legend>ข้อมูล</legend>
      <Field label="ชื่อ-นามสกุล" error={show("name")}><input value={draft.name} maxLength={200} onChange={set("name")} /></Field>
      <Field label="ชื่อผู้ใช้ (ใช้เข้าสู่ระบบ)" hint={worker ? "เปลี่ยนแล้วพนักงานจะถูกออกจากระบบทุกเครื่อง" : "ระบบเก็บเป็นตัวพิมพ์เล็ก"} error={show("username")}><input value={draft.username} maxLength={64} autoComplete="off" autoCapitalize="none" onChange={set("username")} /></Field>
      <Field label="รหัสพนักงาน" hint="ระบบเก็บเป็นตัวพิมพ์ใหญ่" error={show("employee_no")}><input value={draft.employee_no} maxLength={30} autoComplete="off" onChange={set("employee_no")} /></Field>
      <Field label="ตำแหน่ง (ไม่บังคับ)" error={show("position")}><input value={draft.position} maxLength={100} onChange={set("position")} /></Field>
    </fieldset>
    <fieldset className={styles.section} disabled={busy}>
      <legend>ติดต่อ</legend>
      {worker && (!worker.email || !worker.phone) && <p className={layout.warning}>บัญชีเก่านี้ยังไม่มีข้อมูลติดต่อ ต้องกรอกทั้งอีเมลและเบอร์โทรจึงบันทึกได้</p>}
      <Field label="อีเมล" error={show("email")}><input value={draft.email} inputMode="email" autoComplete="off" onChange={set("email")} /></Field>
      <Field label="เบอร์โทร" hint="7–15 หลัก ขึ้นต้นด้วย + ได้" error={show("phone")}><input value={draft.phone} inputMode="tel" maxLength={64} autoComplete="off" onChange={set("phone")} /></Field>
      <p className={layout.muted}>อีเมลและเบอร์โทรซ้ำกับคนอื่นได้ ไม่ได้ใช้เข้าสู่ระบบ และระบบไม่ได้ยืนยันความเป็นเจ้าของ</p>
    </fieldset>
    {!worker && <fieldset className={styles.section} disabled={busy}>
      <legend>รหัสผ่านเริ่มต้น</legend>
      <Field label="รหัสผ่าน" hint={PASSWORD_HINT} error={passwordError || undefined}><input ref={password} type="password" autoComplete="new-password" /></Field>
      <Field label="ยืนยันรหัสผ่าน"><input ref={again} type="password" autoComplete="new-password" /></Field>
      <p className={layout.muted}>ช่องรหัสผ่านจะถูกล้างทุกครั้งที่กดบันทึก แจ้งรหัสผ่านให้พนักงานด้วยตนเอง</p>
    </fieldset>}
    <div className={layout.submitBar} data-sticky><span>{worker ? "ใช้ปุ่มเปลี่ยนรหัสผ่านในรายการเพื่อเปลี่ยนรหัสผ่าน" : "บทบาท: พนักงาน (เพิ่มเป็นแอดมินไม่ได้)"}</span><button type="button" className={layout.submit} disabled={busy} onClick={save}>{worker ? "บันทึก" : "เพิ่มพนักงาน"}</button></div>
    {command.error && <><ErrorText error={command.error} /><p className={layout.muted}>{worker ? "ชื่อผู้ใช้อาจซ้ำ หรือการเชื่อมต่อขัดข้อง ปิดแผงนี้ กดอัปเดตข้อมูล แล้วลองอีกครั้ง" : "ชื่อผู้ใช้อาจซ้ำ ถ้าไม่แน่ใจว่าสร้างแล้วหรือยัง ให้กดอัปเดตข้อมูลและตรวจรายการก่อนเพิ่มอีกครั้ง"}</p></>}
    {worker && <section className={styles.section} aria-label="สถานะบัญชี">
      <h3>สถานะบัญชี</h3>
      <p className={layout.muted}>{worker.is_active ? "ใช้งานอยู่ ปิดใช้งานแล้วพนักงานจะถูกออกจากระบบทุกเครื่อง บัญชีไม่ถูกลบ" : "ปิดใช้งานอยู่ เปิดใช้งานแล้วพนักงานต้องเข้าสู่ระบบใหม่"}</p>
      <div className={layout.actions}><Button variant={worker.is_active ? "danger" : "secondary"} disabled={busy} onClick={() => setConfirm("status")}>{worker.is_active ? "ปิดใช้งานบัญชี" : "เปิดใช้งานบัญชี"}</Button></div>
      <ErrorText error={status.error} />
    </section>}
    {worker && <ConfirmDialog open={confirm === "username"} title="เปลี่ยนชื่อผู้ใช้?" confirmLabel="ยืนยันเปลี่ยนชื่อผู้ใช้" danger checks={["แจ้งพนักงานแล้วว่าต้องเข้าสู่ระบบใหม่"]} onClose={() => setConfirm(null)} onConfirm={() => { setConfirm(null); send(); }}>
      <p>{worker.username} → {draft.username.trim().toLowerCase()}</p><p>{worker.name} จะถูกออกจากระบบทุกเครื่อง และต้องเข้าสู่ระบบด้วยชื่อผู้ใช้ใหม่</p>
    </ConfirmDialog>}
    {worker && <ConfirmDialog open={confirm === "status"} title={worker.is_active ? "ปิดใช้งานบัญชีนี้?" : "เปิดใช้งานบัญชีนี้?"} confirmLabel={worker.is_active ? "ยืนยันปิดใช้งาน" : "ยืนยันเปิดใช้งาน"} danger={worker.is_active} onClose={() => setConfirm(null)} onConfirm={() => {
      setConfirm(null);
      void status.run(async (signal) => { await api.call(`/admin/workers/${worker.id}`, "PATCH", { is_active: !worker.is_active }, signal); onStatus?.(worker.is_active ? `ปิดใช้งาน ${worker.name} แล้ว` : `เปิดใช้งาน ${worker.name} แล้ว`); }, "");
    }}><p>{worker.name} · {worker.username}</p><p>{worker.is_active ? "พนักงานจะถูกออกจากระบบทุกเครื่องทันที เปิดใช้งานกลับได้ภายหลัง" : "เปิดใช้งานแล้วการเข้าสู่ระบบเดิมจะไม่กลับมา ต้องเข้าสู่ระบบใหม่"}</p></ConfirmDialog>}
  </div>;
}

export function PasswordForm({ api, worker, onSaved }: { api: BackendApi; worker: Worker; onSaved: () => void }) {
  const command = useCommand(); const [error, setError] = useState("");
  const password = useRef<HTMLInputElement>(null); const again = useRef<HTMLInputElement>(null);
  return <form className={layout.form} onSubmit={(event) => {
    event.preventDefault(); const [first, second] = takePasswords(password, again); const invalid = workerPasswordError(first, second); setError(invalid);
    if (!invalid) void command.run(async (signal) => { await api.call(`/admin/workers/${worker.id}`, "PATCH", { password: first }, signal); onSaved(); }, "");
  }}>
    <p className={layout.muted}>{worker.name} · {worker.username}</p>
    <fieldset disabled={command.busy}>
      <Field label="รหัสผ่านใหม่" hint={PASSWORD_HINT} error={error || undefined}><input ref={password} type="password" autoComplete="new-password" /></Field>
      <Field label="ยืนยันรหัสผ่านใหม่"><input ref={again} type="password" autoComplete="new-password" /></Field>
    </fieldset>
    <p className={layout.warning}>เปลี่ยนแล้วพนักงานจะถูกออกจากระบบทุกเครื่อง ช่องรหัสผ่านจะถูกล้างทุกครั้งที่กดบันทึก</p>
    <div className={layout.submitBar}><span>แจ้งรหัสผ่านใหม่ให้พนักงานด้วยตนเอง</span><button type="submit" className={layout.submit} disabled={command.busy}>บันทึกรหัสผ่าน</button></div>
    <ErrorText error={command.error} />
  </form>;
}
