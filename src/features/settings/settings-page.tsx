"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { useAppearance } from "../../components/appearance/appearance";
import { useApiSession } from "../auth/api-session";
import { dateTH } from "../customer/customer-domain";
import { ROLES } from "../workspace/workspace-access";
import { roleAccessRows, settingsTabs, type SettingsTab } from "./settings-domain";
import styles from "./settings.module.css";

export const ROLE_NAMES = { customer: "ลูกค้า", worker: "พนักงาน", admin: "ผู้ดูแลระบบ" } as const;
const ROLE_HEADINGS = { Customer: "ลูกค้า", Worker: "พนักงาน", Admin: "ผู้ดูแล" } as const;
const ROOTS = { customer: "/customer", worker: "/staff", admin: "/admin" } as const;

export function SettingsPanel({ title, description, action, children }: { title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return <section className={styles.panel}><div className={styles.panelHead}><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>;
}
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className={styles.facts}>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}
export function ActiveState({ active }: { active: boolean }) {
  return <span className={styles.state} data-active={active || undefined}>{active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>;
}

export function SettingsPage() {
  const { session } = useApiSession(); const [tab, setTab] = useState<SettingsTab>("account");
  if (!session) return null;
  const { account } = session;
  return <div className={styles.page}>
    <nav className={styles.tabs} aria-label="หมวดการตั้งค่า">{settingsTabs(account.role).map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? "true" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === "account" && <SettingsPanel title="บัญชีของฉัน" description="ข้อมูลที่ระบบใช้ยืนยันตัวตนของคุณ">
      <Facts rows={[["ชื่อ", account.name], ["ชื่อผู้ใช้", account.username], ["บทบาท", ROLE_NAMES[account.role]], ["สถานะ", <ActiveState key="state" active={account.is_active} />], ["สร้างบัญชีเมื่อ", dateTH(account.created_at)]]} />
      {account.role === "customer" ? <p className={styles.note}>ระบบยังไม่มีคำสั่งแก้ไขโปรไฟล์ลูกค้า <Link href="/customer/memberships">ดูบัญชีและบริษัท</Link></p>
        : account.role === "worker" ? <p className={styles.note}>ผู้ดูแลระบบเป็นผู้แก้ไขชื่อ ช่องทางติดต่อ และรหัสผ่านของบัญชีพนักงาน</p>
          : <p className={styles.note}>ระบบยังไม่มีคำสั่งแก้ไขบัญชีผู้ดูแลระบบด้วยตนเอง</p>}
    </SettingsPanel>}
    {tab === "preferences" && <Preferences inbox={`${ROOTS[account.role]}/inbox`} />}
    {tab === "security" && <Security />}
    {tab === "system" && account.role === "admin" && <System />}
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
    <SettingsPanel title="เซสชันนี้" description="เซสชันเก็บในหน่วยความจำเท่านั้น รีโหลดหน้าแล้วต้องเข้าสู่ระบบใหม่" action={<button type="button" className={styles.secondary} onClick={() => dialog.current?.showModal()}>ออกจากระบบ</button>}>
      <Facts rows={[["หมดอายุ", dateTH(session.expiresAt)]]} />
    </SettingsPanel>
    <SettingsPanel title="รหัสผ่าน">
      {role === "worker" ? <p className={styles.note}>หากต้องการเปลี่ยนรหัสผ่าน ให้ติดต่อผู้ดูแลระบบ เมื่อเปลี่ยนแล้วทุกเซสชันของบัญชีจะถูกยกเลิก</p>
        : role === "admin" ? <p className={styles.note}>ระบบยังไม่มีคำสั่งเปลี่ยนรหัสผ่านผู้ดูแลด้วยตนเอง รหัสผ่านพนักงานเปลี่ยนได้ที่ <Link href="/admin/workers">จัดการพนักงาน</Link></p>
          : <p className={styles.note}>ระบบยังไม่มีคำสั่งเปลี่ยนรหัสผ่านลูกค้าด้วยตนเอง</p>}
    </SettingsPanel>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="settings-sign-out">
      <h2 id="settings-sign-out">ออกจากระบบ?</h2><p>เซสชันนี้จะถูกยกเลิก และต้องเข้าสู่ระบบใหม่เพื่อใช้งานต่อ</p>
      <div><button type="button" className={styles.secondary} disabled={busy} onClick={() => dialog.current?.close()}>ยกเลิก</button><button type="button" className={styles.danger} disabled={busy} onClick={() => { setBusy(true); void signOut().then(() => router.push("/login")); }}>ออกจากระบบ</button></div>
    </dialog>
  </>;
}

function System() {
  return <>
    <SettingsPanel title="บัญชีพนักงาน" description="สร้างบัญชี แก้ช่องทางติดต่อ เปลี่ยนรหัสผ่าน และปิดใช้งานพนักงาน" action={<Link className={styles.secondary} href="/admin/workers">จัดการพนักงาน</Link>}>
      <p className={styles.note}>ระบบยังไม่มีการตั้งค่าระดับร้าน เช่น ข้อมูลร้าน เครดิตเริ่มต้น หรือการเตือนชำระเงิน</p>
    </SettingsPanel>
    <SettingsPanel title="บทบาทและการเข้าถึง" description="บทบาทกำหนดโดยระบบ เปลี่ยนจากหน้านี้ไม่ได้">
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th scope="col">หน้า</th>{ROLES.map((role) => <th scope="col" key={role}>{ROLE_HEADINGS[role]}</th>)}</tr></thead>
        <tbody>{roleAccessRows().map((row) => <tr key={row.label}><th scope="row">{row.label}</th>{row.roles.map((allowed, index) => <td key={ROLES[index]}>{allowed ? "✓" : <span aria-label="ไม่มีสิทธิ์">—</span>}</td>)}</tr>)}</tbody></table></div>
    </SettingsPanel>
  </>;
}
