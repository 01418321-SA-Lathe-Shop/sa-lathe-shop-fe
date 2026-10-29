"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { Button, Drawer, EmptyState, ErrorText, Field, LoadError, SearchForm, Skeleton, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { supplierFields, type Supplier } from "./procurement-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./procurement.module.css";

type Editing = { kind: "new" } | { kind: "edit"; supplier: Supplier } | null;

// UC6 suppliers (Admin). Contacts are optional and unverified; nothing is deleted,
// a deactivated supplier stays in history and cannot receive new orders.
export function SupplierView({ api, onSaved }: { api: BackendApi; onSaved: (message: string) => void }) {
  const [q, setQ] = useState(""); const [editing, setEditing] = useState<Editing>(null);
  const list = useCollection<Supplier>(api, `/suppliers?search=${encodeURIComponent(q)}`);
  const items = list.data?.items ?? [];
  const saved = (message: string) => { setEditing(null); list.reload(); onSaved(message); };
  return <>
    <div className={layout.toolbarEnd}>
      <SearchForm label="ค้นหาผู้ขาย" placeholder="ชื่อผู้ขาย" value={q} onSearch={setQ} />
      <Button onClick={list.reload} disabled={list.loading}>อัปเดตข้อมูล</Button>
      <Button variant="primary" onClick={() => setEditing({ kind: "new" })}>เพิ่มผู้ขาย</Button>
    </div>
    {q && <p className={layout.filterNote}>ผลการค้นหา “{q}” <Button variant="text" onClick={() => setQ("")}>ล้างการค้นหา</Button></p>}
    {list.loading && !list.data && <Skeleton label="กำลังโหลดผู้ขาย…" />}
    {list.error && !list.data && <LoadError title="โหลดผู้ขายไม่สำเร็จ" onRetry={list.reload} />}
    <TruncatedNotice show={list.data?.complete === false} />
    {list.data && !items.length && <EmptyState title={q ? "ไม่พบผู้ขายที่ค้นหา" : "ยังไม่มีผู้ขาย"}>{q ? "ลองค้นด้วยชื่ออื่น" : "เพิ่มผู้ขายก่อนสั่งซื้อวัตถุดิบ"}</EmptyState>}
    {items.length > 0 && <ul className={styles.suppliers}>{items.map((supplier) => <li key={supplier.id}>
      <span><strong>{supplier.name}</strong><small>{[supplier.phone, supplier.email].filter(Boolean).join(" · ") || "ไม่มีข้อมูลติดต่อ"}</small></span>
      {supplier.is_active ? <ToneBadge tone="done">เปิดใช้งาน</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}
      <Button onClick={() => setEditing({ kind: "edit", supplier })}>แก้ไข<span className={layout.visuallyHidden}> {supplier.name}</span></Button>
    </li>)}</ul>}
    <Drawer open={editing !== null} title={editing?.kind === "edit" ? `แก้ไข ${editing.supplier.name}` : "เพิ่มผู้ขาย"} onClose={() => setEditing(null)}>
      {editing && <SupplierForm key={editing.kind === "edit" ? `${editing.supplier.id}:${editing.supplier.version}` : "new"} api={api} supplier={editing.kind === "edit" ? editing.supplier : undefined} onSaved={() => saved(editing.kind === "edit" ? "บันทึกผู้ขายแล้ว" : "เพิ่มผู้ขายแล้ว")} />}
    </Drawer>
  </>;
}

// Create has no retry key and PUT replaces every field, so an unclear failure
// means reload first; a stale version is rejected rather than overwritten.
function SupplierForm({ api, supplier, onSaved }: { api: BackendApi; supplier?: Supplier; onSaved: () => void }) {
  const command = useCommand(); const [error, setError] = useState("");
  return <form className={layout.form} onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); let fields: ReturnType<typeof supplierFields>;
    try { fields = supplierFields(String(data.get("name") ?? ""), String(data.get("email") ?? ""), String(data.get("phone") ?? "")); } catch (problem) { setError((problem as Error).message); return; }
    setError("");
    void command.run(async (signal) => {
      if (supplier) await api.call(`/suppliers/${supplier.id}`, "PUT", { ...fields, is_active: data.has("is_active"), expected_version: BigInt(supplier.version) }, signal);
      else await api.call("/suppliers", "POST", fields, signal);
      onSaved();
    }, "");
  }}>
    <fieldset disabled={command.busy}>
      <Field label="ชื่อผู้ขาย"><input name="name" required maxLength={200} defaultValue={supplier?.name} /></Field>
      <Field label="เบอร์โทร (ไม่บังคับ)" hint="ตัวเลข 7–15 หลัก ไม่ต้องเว้นวรรคหรือใส่ขีด"><input name="phone" inputMode="tel" autoComplete="off" defaultValue={supplier?.phone} /></Field>
      <Field label="อีเมล (ไม่บังคับ)"><input name="email" inputMode="email" autoComplete="off" defaultValue={supplier?.email} /></Field>
      {supplier && <><label className={layout.toggle}><input name="is_active" type="checkbox" defaultChecked={supplier.is_active} />เปิดใช้งาน</label>
        <p className={layout.muted}>ปิดใช้งานแล้วใบสั่งซื้อเดิมยังอยู่ แต่สั่งซื้อใหม่กับผู้ขายนี้ไม่ได้ · ช่องที่เว้นว่างจะถูกล้าง</p></>}
    </fieldset>
    {error && <p className={layout.problem} role="alert">{error}</p>}
    <div className={layout.submitBar} data-sticky><span>{supplier ? "บันทึกแล้วรายการจะโหลดใหม่" : "ข้อมูลติดต่อไม่ได้ตรวจสอบโดยระบบ"}</span><button type="submit" className={layout.submit} disabled={command.busy}>{supplier ? "บันทึก" : "เพิ่มผู้ขาย"}</button></div>
    {command.error && <><ErrorText error={command.error} /><p className={layout.muted}>{supplier ? "มีคนแก้ไขไปแล้วหรือการเชื่อมต่อขัดข้อง ปิดแผงนี้ กดอัปเดตข้อมูล แล้วแก้อีกครั้ง" : "ถ้าไม่แน่ใจว่าบันทึกสำเร็จ ให้กดอัปเดตข้อมูลและตรวจรายการก่อนเพิ่มอีกครั้ง"}</p></>}
  </form>;
}
