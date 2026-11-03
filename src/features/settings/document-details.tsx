"use client";

import { type FormEvent } from "react";
import { ApiError, type BackendApi, type Customer, type CustomerBilling, type ShopProfile } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { SettingsPanel } from "./settings-ui";
import styles from "./settings.module.css";

type FieldSpec = { name: string; label: string; multiline?: boolean; type?: string; max: number };
const SHOP_FIELDS: FieldSpec[] = [
  { name: "name", label: "ชื่อร้าน / บริษัท", max: 200 }, { name: "address", label: "ที่อยู่", multiline: true, max: 500 },
  { name: "tax_id", label: "เลขประจำตัวผู้เสียภาษี", max: 30 }, { name: "phone", label: "โทรศัพท์", type: "tel", max: 64 },
  { name: "email", label: "อีเมล", type: "email", max: 254 }, { name: "bank_name", label: "ธนาคารและสาขา (สำหรับรับชำระ)", max: 200 },
  { name: "bank_account_name", label: "ชื่อบัญชี", max: 200 }, { name: "bank_account_no", label: "เลขที่บัญชี", max: 64 },
];
const BILLING_FIELDS: FieldSpec[] = [
  { name: "address", label: "ที่อยู่สำหรับออกเอกสาร", multiline: true, max: 500 }, { name: "tax_id", label: "เลขประจำตัวผู้เสียภาษี", max: 30 },
  { name: "phone", label: "โทรศัพท์", type: "tel", max: 64 }, { name: "email", label: "อีเมล", type: "email", max: 254 },
];

type Command = ReturnType<typeof useCommand>;
// Saves the whole record with its lock version; a stale copy gets 409 and reloads.
// The caller owns the command so its message survives the remount after reload.
function DetailsForm<T extends { lock_version: string | number }>({ api, command, path, fields, value, editable, onSaved }: { api: BackendApi; command: Command; path: string; fields: FieldSpec[]; value: T; editable: boolean; onSaved: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(fields.map(({ name }) => [name, String(data.get(name) ?? "").trim()]));
    void command.run(async (signal) => {
      try { await api.call(path, "PUT", { ...body, expected_lock_version: BigInt(value.lock_version) }, signal); onSaved(); }
      catch (error) {
        if (error instanceof ApiError && error.status === 409) { onSaved(); throw new Error("มีคนแก้ข้อมูลนี้ไปแล้ว ระบบโหลดข้อมูลล่าสุดให้แล้ว ตรวจแล้วบันทึกอีกครั้ง"); }
        if (error instanceof ApiError && error.status === 400) throw new Error("ข้อมูลบางช่องไม่ถูกต้อง ตรวจรูปแบบอีเมลและความยาวข้อความ");
        throw error;
      }
    }, "บันทึกแล้ว เอกสารที่พิมพ์ครั้งถัดไปจะใช้ข้อมูลนี้");
  }
  const record = value as unknown as Record<string, string>;
  return <form className={styles.form} onSubmit={submit}>
    <fieldset disabled={!editable || command.busy} className={styles.fields}><legend className={styles.srOnly}>รายละเอียด</legend>
      {fields.map(({ name, label, multiline, type, max }) => <label key={name} className={styles.field}><span>{label}</span>
        {multiline ? <textarea name={name} rows={3} maxLength={max} defaultValue={record[name] ?? ""} /> : <input name={name} type={type ?? "text"} maxLength={max} defaultValue={record[name] ?? ""} />}</label>)}
    </fieldset>
    {editable && <div><button type="submit" className={styles.primary} disabled={command.busy}>{command.busy ? "กำลังบันทึก…" : "บันทึก"}</button></div>}
    {command.error && <p role="alert" className={styles.alert}>{command.error}</p>}
    {command.message && <p role="status" className={styles.success}>{command.message}</p>}
  </form>;
}

export function ShopDetails({ api }: { api: BackendApi }) {
  const shop = useResource<ShopProfile>(api, "/shop-profile"); const command = useCommand();
  return <SettingsPanel title="ข้อมูลร้านบนเอกสาร" description="พิมพ์บนใบเสนอราคา ใบสั่งซื้อ และสัญญาจ้าง ช่องที่เว้นว่างจะพิมพ์เป็นเส้นให้กรอกเอง">
    {shop.error ? <p role="alert" className={styles.alert}>{shop.error}</p> : !shop.data ? <p className={styles.note}>กำลังโหลด…</p>
      : <DetailsForm key={String(shop.data.lock_version)} api={api} command={command} path="/shop-profile" fields={SHOP_FIELDS} value={shop.data} editable onSaved={shop.reload} />}
  </SettingsPanel>;
}

export function BillingDetails({ api }: { api: BackendApi }) {
  const profiles = useResource<{ items: Customer[] | null }>(api, "/customers");
  if (profiles.error) return <p role="alert" className={styles.alert}>{profiles.error}</p>;
  return <>{(profiles.data?.items ?? []).map((customer) => <CustomerBillingPanel key={customer.id} api={api} customer={customer} />)}</>;
}
function CustomerBillingPanel({ api, customer }: { api: BackendApi; customer: Customer }) {
  const billing = useResource<CustomerBilling>(api, `/customers/${customer.id}/billing`); const command = useCommand();
  return <SettingsPanel title={`ข้อมูลออกเอกสาร · ${customer.name}`} description={customer.is_owner ? "ใช้บนใบเสนอราคา ใบสั่งซื้อ และสัญญาจ้างของคุณ" : "เจ้าของบัญชีบริษัทเป็นผู้แก้ไขข้อมูลนี้"}>
    {billing.error ? <p role="alert" className={styles.alert}>{billing.error}</p> : !billing.data ? <p className={styles.note}>กำลังโหลด…</p>
      : <DetailsForm key={String(billing.data.lock_version)} api={api} command={command} path={`/customers/${customer.id}/billing`} fields={BILLING_FIELDS} value={billing.data} editable={customer.is_owner} onSaved={billing.reload} />}
  </SettingsPanel>;
}
