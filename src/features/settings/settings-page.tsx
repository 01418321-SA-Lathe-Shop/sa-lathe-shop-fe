"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { ApiError, type BackendApi } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { useAppearance } from "../../components/appearance/appearance";
import { useApiSession } from "../auth/api-session";
import { dateTH } from "../customer/customer-domain";
import { ROLES } from "../workspace/workspace-access";
import { passwordErrors, roleAccessRows, settingsTabs, type PasswordDraft, type SettingsTab } from "./settings-domain";
import { BillingDetails, ShopDetails } from "./document-details";
import { ActiveState, Facts, SettingsPanel } from "./settings-ui";
import styles from "./settings.module.css";

export const ROLE_NAMES = { customer: "ลูกค้า", worker: "พนักงาน", admin: "ผู้ดูแลระบบ" } as const;
const ROLE_HEADINGS = { Customer: "ลูกค้า", Worker: "พนักงาน", Admin: "ผู้ดูแล" } as const;
const ROOTS = { customer: "/customer", worker: "/staff", admin: "/admin" } as const;

export function SettingsPage() {
  const { session } = useApiSession(); const [tab, setTab] = useState<SettingsTab>("account");
  if (!session) return null;
  const { account } = session;
  return <div className={styles.page}>
    <nav className={styles.tabs} aria-label="หมวดการตั้งค่า">{settingsTabs(account.role).map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? "true" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === "account" && <SettingsPanel title="บัญชีของฉัน" description="ข้อมูลที่ระบบใช้ยืนยันตัวตนของคุณ">
      <Facts rows={[["ชื่อ", account.name], ["ชื่อผู้ใช้", account.username], ["บทบาท", ROLE_NAMES[account.role]], ["สถานะ", <ActiveState key="state" active={account.is_active} />], ["สร้างบัญชีเมื่อ", dateTH(account.created_at)]]} />
      {account.role === "customer" ? <p className={styles.note}>ชื่อและประเภทลูกค้าแก้จากหน้านี้ไม่ได้ <Link href="/customer/memberships">ดูบัญชีและบริษัท</Link></p>
        : account.role === "worker" ? <p className={styles.note}>ผู้ดูแลระบบเป็นผู้แก้ไขชื่อ ช่องทางติดต่อ และรหัสผ่านของบัญชีพนักงาน</p>
          : <p className={styles.note}>ระบบยังไม่มีคำสั่งแก้ไขบัญชีผู้ดูแลระบบด้วยตนเอง</p>}
    </SettingsPanel>}
    {tab === "account" && account.role === "customer" && <BillingDetails api={session.api} />}
    {tab === "preferences" && <Preferences inbox={`${ROOTS[account.role]}/inbox`} />}
    {tab === "security" && <Security />}
    {tab === "system" && account.role === "admin" && <System api={session.api} />}
  </div>;
}

function Preferences({ inbox }: { inbox: string }) {
  const { uiSize, onUiSize } = useAppearance(); const preferenceId = useId();
  return <SettingsPanel title="การตั้งค่าส่วนตัว" description="ใช้กับทุกหน้า และจดจำไว้ในเบราว์เซอร์นี้ ไม่ได้บันทึกบนบัญชี">
    <fieldset className={styles.choice}><legend>ขนาดการแสดงผล</legend><div>{([["small", "เล็ก"], ["medium", "กลาง"], ["large", "ใหญ่"]] as const).map(([option, label]) => <label key={option}><input type="radio" name={`settings-size-${preferenceId}`} checked={uiSize === option} onChange={() => onUiSize(option)} />{label}</label>)}</div></fieldset>
    <p className={styles.note}>เปลี่ยนธีมได้จากปุ่มบนแถบด้านบน ระบบยังไม่มีการเลือกช่องทางแจ้งเตือนหรือภาษา <Link href={inbox}>ดูการแจ้งเตือน</Link></p>
  </SettingsPanel>;
}

function Security() {
  const { session, signOut } = useApiSession(); const router = useRouter(); const dialog = useRef<HTMLDialogElement>(null); const [busy, setBusy] = useState(false);
  if (!session) return null;
  const { role } = session.account;
  return <>
    <SettingsPanel title="เซสชันนี้" description="เซสชันยังอยู่หลังรีโหลดหรือเปิดแอปใหม่จนกว่าจะหมดอายุหรือออกจากระบบ (คุกกี้ HttpOnly ไม่เก็บใน localStorage)" action={<button type="button" className={styles.secondary} onClick={() => dialog.current?.showModal()}>ออกจากระบบ</button>}>
      <Facts rows={[["หมดอายุ", dateTH(session.expiresAt)]]} />
    </SettingsPanel>
    <SettingsPanel title="เปลี่ยนรหัสผ่าน" description="เปลี่ยนรหัสผ่านของบัญชีนี้เท่านั้น เมื่อสำเร็จ เซสชันอื่นของบัญชีจะถูกยกเลิก เซสชันนี้ยังใช้งานต่อได้">
      <ChangePassword api={session.api} username={session.account.username} />
      {role === "worker" ? <p className={styles.note}>ลืมรหัสผ่าน? ให้ผู้ดูแลระบบตั้งรหัสผ่านใหม่ให้</p>
        : role === "admin" && <p className={styles.note}>รหัสผ่านพนักงานตั้งใหม่ได้ที่ <Link href="/admin/workers">จัดการพนักงาน</Link></p>}
    </SettingsPanel>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="settings-sign-out">
      <h2 id="settings-sign-out">ออกจากระบบ?</h2><p>เซสชันนี้จะถูกยกเลิก และต้องเข้าสู่ระบบใหม่เพื่อใช้งานต่อ</p>
      <div><button type="button" className={styles.secondary} disabled={busy} onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="button" className={styles.danger} disabled={busy} onClick={() => { setBusy(true); void signOut().then(() => router.push("/login")); }}>ออกจากระบบ</button></div>
    </dialog>
  </>;
}

// Uncontrolled inputs: passwords live only in the form until submit, then the form is cleared.
function ChangePassword({ api, username }: { api: BackendApi; username: string }) {
  const command = useCommand(); const [errors, setErrors] = useState<Partial<Record<keyof PasswordDraft, string>>>({}); const id = useId();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const draft = { current: String(data.get("current") ?? ""), next: String(data.get("next") ?? ""), confirm: String(data.get("confirm") ?? "") };
    const found = passwordErrors(username, draft); setErrors(found);
    if (Object.keys(found).length) return;
    void command.run(async (signal) => {
      try { await api.call<void>("/auth/password", "POST", { current_password: draft.current, new_password: draft.next }, signal); form.reset(); }
      catch (error) {
        (form.elements.namedItem("current") as HTMLInputElement | null)?.select();
        if (error instanceof ApiError && error.code === "invalid_current_password") { setErrors({ current: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }); throw new Error("เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจรหัสผ่านปัจจุบันแล้วลองอีกครั้ง"); }
        if (error instanceof ApiError && error.status === 429) throw new Error("ลองเปลี่ยนรหัสผ่านหลายครั้งเกินไป รอสักครู่แล้วลองใหม่");
        if (error instanceof ApiError && error.status === 400) throw new Error("รหัสผ่านใหม่ไม่ผ่านเงื่อนไขของระบบ ตรวจเงื่อนไขด้านล่างแล้วลองอีกครั้ง");
        throw error;
      }
    }, "เปลี่ยนรหัสผ่านแล้ว ใช้รหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป");
  }
  const field = (name: keyof PasswordDraft, label: string, autoComplete: string, hint?: string) => <label className={styles.field}>
    <span>{label}</span>
    <input name={name} type="password" required autoComplete={autoComplete} maxLength={128} disabled={command.busy} aria-invalid={errors[name] ? true : undefined} aria-describedby={`${id}-${name}`} onInput={() => errors[name] && setErrors(({ [name]: _cleared, ...rest }) => rest)} />
    <small id={`${id}-${name}`} className={errors[name] ? styles.fieldError : undefined}>{errors[name] ?? hint}</small>
  </label>;
  return <form className={styles.form} onSubmit={submit} noValidate>
    <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
    {field("current", "รหัสผ่านปัจจุบัน", "current-password")}
    {field("next", "รหัสผ่านใหม่", "new-password", "อย่างน้อย 12 ตัวอักษร ไม่ซ้ำรหัสเดิม และไม่มีชื่อผู้ใช้อยู่ในรหัส")}
    {field("confirm", "ยืนยันรหัสผ่านใหม่", "new-password")}
    <div><button type="submit" className={styles.primary} disabled={command.busy}>{command.busy ? "กำลังเปลี่ยนรหัสผ่าน…" : "เปลี่ยนรหัสผ่าน"}</button></div>
    {command.error && <p role="alert" className={styles.alert}>{command.error}</p>}
    {command.message && <p role="status" className={styles.success}>{command.message}</p>}
  </form>;
}

function System({ api }: { api: BackendApi }) {
  return <>
    <ShopDetails api={api} />
    <SettingsPanel title="บัญชีพนักงาน" description="สร้างบัญชี แก้ช่องทางติดต่อ เปลี่ยนรหัสผ่าน และปิดใช้งานพนักงาน" action={<Link className={styles.secondary} href="/admin/workers">จัดการพนักงาน</Link>}>
      <p className={styles.note}>ระบบยังไม่มีการตั้งค่าเครดิตเริ่มต้นหรือการเตือนชำระเงิน</p>
    </SettingsPanel>
    <SettingsPanel title="บทบาทและการเข้าถึง" description="บทบาทกำหนดโดยระบบ เปลี่ยนจากหน้านี้ไม่ได้">
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">หน้า</th>{ROLES.map((role) => <th scope="col" key={role}>{ROLE_HEADINGS[role]}</th>)}</tr></thead>
        <tbody>{roleAccessRows().map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.roles.map((allowed, index) => <td key={ROLES[index]}>{allowed ? "✓" : <span aria-label="ไม่มีสิทธิ์">—</span>}</td>)}</tr>)}</tbody></table></div>
    </SettingsPanel>
  </>;
}
