"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Account, BackendApi, Customer, CustomerAddress } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { customerHref, dateTH } from "./customer-domain";
import { ActiveState, Facts, SettingsPanel } from "../settings/settings-ui";
import styles from "../settings/settings.module.css";
import { ActionFeedback, Empty, Field, PageTitle, ResourceFeedback } from "./customer-ui";

export function CustomerAccount({ api, account }: { api: BackendApi; account: Account }) {
  const profiles = useResource<{ items: Customer[] | null }>(api, "/customers"); const query = useSearchParams();
  const view = query.get("view"); const company = profiles.data?.items?.find((item) => item.id === query.get("company"));
  if (view === "join") return <JoinCompany api={api} />;
  if (view === "invite") return <><ResourceFeedback {...profiles} />{company?.is_owner && company.customer_type === "company" ? <InviteCompany api={api} company={company} /> : profiles.data && <Empty title="ไม่สามารถสร้างคำเชิญให้บริษัทนี้ได้" action={<Link href="/customer/memberships">กลับบัญชีและบริษัท</Link>}>เฉพาะเจ้าของบริษัทที่มีสิทธิ์เท่านั้น</Empty>}</>;
  return <><PageTitle title="บัญชีและบริษัท" description="บัญชี บริษัท และสิทธิ์ผู้สั่งที่คุณใช้งานได้" /><ResourceFeedback {...profiles} /><div className={styles.stack}>
    <SettingsPanel title="บัญชีผู้ใช้" action={<Link className={styles.secondary} href="/customer?view=settings">ตั้งค่า</Link>}><Facts rows={[["ชื่อ", account.name], ["ชื่อผู้ใช้", account.username], ["สถานะบัญชี", <ActiveState key="state" active={account.is_active} />], ["สร้างบัญชีเมื่อ", dateTH(account.created_at)]]} /></SettingsPanel>
    <SettingsPanel title="ลูกค้าและบริษัท" description="บัญชีผู้สั่งที่คุณส่งคำขอและดูเอกสารได้" action={<Link className={styles.secondary} href="/customer/memberships?view=join">เข้าร่วมด้วยคำเชิญ</Link>}>
      {profiles.data?.items?.map((item) => <div key={item.id} className={styles.note}><Facts rows={[[item.customer_type === "company" ? "ชื่อบริษัท" : "ชื่อลูกค้า", item.name], ["ประเภท", item.customer_type === "company" ? "บริษัท" : "บุคคลทั่วไป"], ["สิทธิ์ของคุณ", item.is_owner ? item.customer_type === "company" ? "เจ้าของบริษัท" : "เจ้าของบัญชี" : "สมาชิกบริษัท"], ["รหัสลูกค้า", item.id.slice(0, 8).toUpperCase()]]} />{item.customer_type === "company" && item.is_owner && <p className={styles.inviteLink}><Link href={customerHref("memberships", { view: "invite", company: item.id })}>สร้างคำเชิญส่วนตัว →</Link></p>}</div>)}
      {profiles.data && !profiles.data.items?.length && <p className="cust-alert">ยังไม่พบบัญชีผู้สั่งที่ใช้งานได้</p>}
    </SettingsPanel>
    {profiles.data?.items?.map((item) => <CustomerAddresses key={item.id} api={api} customer={item} />)}
  </div></>;
}

function CustomerAddresses({ api, customer }: { api: BackendApi; customer: Customer }) {
  const addresses = useResource<{ items: CustomerAddress[] }>(api, `/customers/${customer.id}/addresses`); const action = useCommand();
  const [editing, setEditing] = useState<CustomerAddress | null>(null);
  return <SettingsPanel title={`ที่อยู่ · ${customer.name}`} description={customer.is_owner ? "ที่อยู่แรกมาจากตอนสมัครบัญชี แต่ละที่อยู่ระบุชื่อผู้รับ/ผู้ติดต่อของตัวเองได้ แยกจากชื่อลูกค้า" : "เฉพาะเจ้าของบัญชีเพิ่มหรือแก้ไขที่อยู่ได้"}>
    <ResourceFeedback {...addresses} />
    {addresses.data?.items.map((item, index) => <div key={item.id} className={`${styles.note} ${styles.preLine}`}>
      <strong>{index + 1}. {item.contact_name ? `ผู้รับ: ${item.contact_name}` : "ยังไม่ระบุชื่อผู้รับ"}{item.is_default ? " (ที่อยู่หลัก)" : ""}</strong>{"\n"}{item.address}
      {customer.is_owner && <div><button type="button" className={styles.secondary} disabled={action.busy} onClick={() => setEditing(item)}>แก้ไข</button></div>}
    </div>)}
    {addresses.data && !addresses.data.items.length && <p className={styles.note}>ยังไม่มีที่อยู่</p>}
    {/* key resets the uncontrolled fields when switching between add and edit */}
    {customer.is_owner && <form key={editing?.id ?? "new"} className={styles.form} onSubmit={(event) => {
      event.preventDefault(); const form = event.currentTarget; const fd = new FormData(form);
      const value = (name: string) => String(fd.get(name) ?? "").trim();
      const contact_name = value("contact_name"); const address_line1 = value("address_line1"); const address_line2 = value("address_line2");
      const district = value("district"); const province = value("province"); const postal_code = value("postal_code");
      const is_default = fd.get("is_default") === "on";
      const address = [address_line1, address_line2, district, province, postal_code].filter(Boolean).join(" ");
      const target = editing;
      void action.run(async (signal) => {
        await api.call(target ? `/customers/${customer.id}/addresses/${target.id}` : `/customers/${customer.id}/addresses`, target ? "PUT" : "POST", { contact_name, address, address_line1, address_line2, district, province, postal_code, is_default }, signal);
        form.reset(); setEditing(null); addresses.reload();
      }, target ? "บันทึกการแก้ไขที่อยู่แล้ว" : "เพิ่มที่อยู่แล้ว");
    }}>
      {editing && <p className={styles.note}>กำลังแก้ไขที่อยู่ของ {editing.contact_name || "ที่อยู่ที่ยังไม่ระบุชื่อผู้รับ"}{!editing.address_line1 && " · ที่อยู่เดิมเป็นข้อความรวม กรอกแยกช่องใหม่ด้านล่าง"}</p>}
      <label className={styles.field}><span>ชื่อผู้รับ / ผู้ติดต่อ *</span><input name="contact_name" required maxLength={200} autoComplete="name" disabled={action.busy} defaultValue={editing?.contact_name} placeholder="เช่น คุณวิภา (ฝ่ายรับสินค้า)" /></label>
      <label className={styles.field}><span>ที่อยู่บรรทัดที่ 1 *</span><input name="address_line1" required maxLength={300} disabled={action.busy} defaultValue={editing?.address_line1} placeholder="บ้านเลขที่ หมู่ ซอย ถนน" /></label>
      <label className={styles.field}><span>ที่อยู่บรรทัดที่ 2 (ไม่บังคับ)</span><input name="address_line2" maxLength={300} disabled={action.busy} defaultValue={editing?.address_line2} placeholder="อาคาร ชั้น แขวง/ตำบล" /></label>
      <label className={styles.field}><span>เขต/อำเภอ *</span><input name="district" required maxLength={150} disabled={action.busy} defaultValue={editing?.district} /></label>
      <label className={styles.field}><span>จังหวัด *</span><input name="province" required maxLength={150} disabled={action.busy} defaultValue={editing?.province} /></label>
      <label className={styles.field}><span>รหัสไปรษณีย์ (5 หลัก) *</span><input name="postal_code" required pattern="[0-9]{5}" maxLength={5} disabled={action.busy} defaultValue={editing?.postal_code} placeholder="10110" /></label>
      <label className={styles.field}><span><input type="checkbox" name="is_default" disabled={action.busy} defaultChecked={editing?.is_default} /> ตั้งเป็นที่อยู่หลัก (Default)</span></label>
      <div><button type="submit" className={styles.primary} disabled={action.busy}>{action.busy ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}</button>{editing && <button type="button" className={styles.secondary} disabled={action.busy} onClick={() => setEditing(null)}>ยกเลิกการแก้ไข</button>}</div>
    </form>}
    <ActionFeedback {...action} />
  </SettingsPanel>;
}
function InviteCompany({ api, company }: { api: BackendApi; company: Customer }) {
  const action = useCommand(); const [invitation, setInvitation] = useState(""); const [attempted, setAttempted] = useState(false); const [copied, setCopied] = useState(false);
  return <><PageTitle title="เชิญสมาชิกเข้าบริษัท" description={company.name} back="/customer/memberships" /><section className="cust-narrow cust-document"><h2>คำเชิญส่วนตัว</h2><p>คำเชิญใช้ได้ 1 ครั้ง และหมดอายุภายใน 24 ชั่วโมง ส่งให้ผู้รับเป็นการส่วนตัวเท่านั้น</p>{invitation ? <><div className="cust-secret"><strong>แสดงครั้งนี้เท่านั้น</strong><output>{invitation}</output></div><p className="cust-muted">โปรดคัดลอกก่อนออกจากหน้านี้ ระบบไม่เก็บรหัสคำเชิญไว้ในเบราว์เซอร์</p><button className="cust-primary" onClick={() => void action.run(async () => { await navigator.clipboard.writeText(invitation); setCopied(true); }, "คัดลอกคำเชิญแล้ว")}>คัดลอกคำเชิญ</button>{copied && <p role="status">คัดลอกแล้ว ส่งให้ผู้รับเป็นการส่วนตัว</p>}<button className="cust-link" onClick={() => setInvitation("")}>ซ่อนคำเชิญ</button></> : attempted ? <p className="cust-alert">รหัสถูกซ่อนหรือยังยืนยันผลสร้างไม่ได้ กลับไปตรวจสมาชิกภาพก่อนเริ่มสร้างคำเชิญใหม่ รหัสที่สร้างแล้วไม่ได้ถูกยกเลิกด้วยการออกจากหน้านี้</p> : <button className="cust-primary" disabled={action.busy} onClick={() => void action.run(async (signal) => { setAttempted(true); const result = await api.call<{ invitation: string }>(`/customers/${company.id}/invitations`, "POST", undefined, signal); setInvitation(result.invitation); }, "สร้างคำเชิญแล้ว")}>สร้างคำเชิญ</button>}<ActionFeedback {...action} /><Link className="cust-link" href="/customer/memberships">กลับบัญชีและบริษัท →</Link></section></>;
}
function JoinCompany({ api }: { api: BackendApi }) {
  const action = useCommand(); const [joined, setJoined] = useState(false); const [attempted, setAttempted] = useState(false);
  return <><PageTitle title="เข้าร่วมบริษัท" description="ใช้คำเชิญส่วนตัวที่เจ้าของบริษัทส่งให้คุณ" back="/customer/memberships" /><section className="cust-narrow cust-document">{joined ? <><h2>เข้าร่วมบริษัทแล้ว</h2><p>ตรวจสอบชื่อบริษัทและสิทธิ์ของคุณในหน้าบัญชีและบริษัท</p><Link className="cust-primary" href="/customer/memberships">ดูบัญชีและบริษัท</Link></> : <form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const invitation = String(new FormData(form).get("invitation") ?? "").trim(); form.reset(); void action.run(async (signal) => { setAttempted(true); await api.call("/customers/join", "POST", { invitation }, signal); setJoined(true); }, "เข้าร่วมบริษัทแล้ว"); }}><Field label="คำเชิญส่วนตัว *"><input name="invitation" type="password" required autoComplete="off" disabled={action.busy || attempted} /></Field><p className="cust-muted">คำเชิญต้องยังไม่ถูกใช้และยังไม่หมดอายุ หากถูกปฏิเสธ ให้ขอคำเชิญใหม่จากเจ้าของบริษัท</p><button type="submit" className="cust-primary" disabled={action.busy || attempted}>เข้าร่วมบริษัท</button>{attempted && action.error && <p className="cust-alert">ตรวจสมาชิกภาพก่อนลองคำเชิญใหม่ เพราะคำสั่งก่อนหน้าอาจสำเร็จแล้ว <Link href="/customer/memberships">ตรวจบัญชีและบริษัท</Link></p>}</form>}<ActionFeedback busy={action.busy} error={action.error} /></section></>;
}
