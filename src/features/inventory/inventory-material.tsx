"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import { dateTimeTH, quantityTH } from "../../components/staff-ui/staff-format";
import { MOVEMENT_MODE } from "../../components/staff-ui/staff-labels";
import { Collapsible, ConfirmDialog, ErrorText, Field, LoadError, RetryPanel, Skeleton, StatusBadge, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { inventoryDecimal, isBelow, stockAfter, stockFields, type InventoryMaterial, type InventoryMovement } from "./inventory-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

// UC5 material detail inside the side panel. Workers read quantities and
// history only; costs, reasons and stock adjustment are Admin-only (redacted by the API).
export function MaterialPanel({ api, material, admin, onSaved }: { api: BackendApi; material: InventoryMaterial; admin: boolean; onSaved: (message: string) => void }) {
  const history = useCollection<InventoryMovement>(api, `/materials/${material.id}/movements`);
  const unit = material.unit_name;
  return <>
    <div className={layout.actions}><MaterialState material={material} /><span className={layout.muted}>หน่วย {unit}</span></div>
    <dl className={layout.facts}>
      <div><dt>คงเหลือ</dt><dd>{quantityTH(material.qty_on_hand)} {unit}</dd></div>
      <div><dt>จองให้งานแล้ว</dt><dd>{quantityTH(material.qty_reserved)} {unit}</dd></div>
      <div><dt>พร้อมใช้</dt><dd>{quantityTH(material.qty_available)} {unit}</dd></div>
      {admin && <div><dt>ต้นทุนเฉลี่ย (เฉพาะ Admin)</dt><dd>{material.avg_cost === undefined ? "—" : `${quantityTH(material.avg_cost)} บาท/${unit}`}</dd></div>}
    </dl>
    <p className={layout.muted}>การจองไม่ตัดสต๊อกจริง สต๊อกถูกตัดเมื่อบันทึกการใช้ในงานผลิต</p>
    {admin && <StockForm key={String(material.version)} api={api} material={material} onSaved={onSaved} />}
    <section className={layout.section} aria-label="ประวัติการเคลื่อนไหว">
      <h3>ประวัติการเคลื่อนไหว</h3>
      {history.loading && !history.data && <Skeleton label="กำลังโหลดประวัติ…" rows={2} />}
      {history.error && !history.data && <LoadError title="โหลดประวัติไม่สำเร็จ" onRetry={history.reload} />}
      <TruncatedNotice show={history.data?.complete === false} />
      {history.data && !history.data.items.length && <p className={layout.muted}>ยังไม่มีการเคลื่อนไหวของวัตถุดิบนี้</p>}
      {history.data && history.data.items.length > 0 && <ol className={layout.timeline}>{history.data.items.map((item) => <li key={item.id}>
        <strong className={styles.movementTitle}><StatusBadge map={MOVEMENT_MODE} value={item.mode} />{quantityTH(item.before_quantity)} → {quantityTH(item.after_quantity)} {unit}</strong>
        <span>{dateTimeTH(item.created_at)}{item.mode !== "correction" ? ` · จำนวน ${quantityTH(item.quantity)} ${unit}` : ""}</span>
        {item.reason && <span>เหตุผล: {item.reason}</span>}
        {admin && item.unit_cost !== undefined && <span>ต้นทุนต่อหน่วย {quantityTH(item.unit_cost)} บาท</span>}
        {admin && (item.before_cost !== undefined || item.after_cost !== undefined) && <span>ต้นทุนเฉลี่ย {quantityTH(item.before_cost)} → {quantityTH(item.after_cost)} บาท</span>}
      </li>)}</ol>}
    </section>
    <Collapsible title="ประวัติระบบ"><p className={layout.code}>รหัสวัตถุดิบ {material.id} · หน่วย {material.unit_id} · เวอร์ชัน {String(material.version)}</p></Collapsible>
  </>;
}

export function MaterialState({ material }: { material: InventoryMaterial }) {
  if (!material.is_active) return <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>;
  return /[1-9]/.test(material.qty_available) ? <ToneBadge tone="done">มีของพร้อมใช้</ToneBadge> : <ToneBadge tone="danger">หมด</ToneBadge>;
}

type Mode = "addition" | "correction";
const valid = (value: string, positive: boolean) => { try { inventoryDecimal(value, positive); return true; } catch { return false; } };

// Audited stock adjustment (Admin). Same idempotent payload as before; a lost
// response offers only an identical retry with the original key and version.
function StockForm({ api, material, onSaved }: { api: BackendApi; material: InventoryMaterial; onSaved: (message: string) => void }) {
  const [mode, setMode] = useState<Mode>(material.is_active ? "addition" : "correction");
  const [quantity, setQuantity] = useState(""); const [cost, setCost] = useState(""); const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved(mode === "addition" ? "เพิ่มสต๊อกแล้ว" : "แก้ยอดตามที่นับแล้ว"));
  const unit = material.unit_name; const after = stockAfter(material, mode, quantity.trim());
  const quantityError = quantity.trim() && !after ? (mode === "addition" ? "ตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง" : "ตัวเลข 0 ขึ้นไป ทศนิยมไม่เกิน 6 ตำแหน่ง")
    : after && mode === "correction" && isBelow(after, material.qty_reserved) ? `ต่ำกว่าจำนวนที่จองให้งานไว้ (${quantityTH(material.qty_reserved)} ${unit}) ไม่ได้` : "";
  const costError = mode === "addition" && cost.trim() && !valid(cost.trim(), false) ? "ตัวเลข 0 ขึ้นไป ทศนิยมไม่เกิน 6 ตำแหน่ง" : "";
  const reasonError = [...reason.trim()].length > 2000 ? "ไม่เกิน 2,000 ตัวอักษร" : "";
  const ready = Boolean(after) && !quantityError && !costError && !reasonError && Boolean(reason.trim()) && (mode === "correction" || Boolean(cost.trim()));
  const choose = (next: Mode) => { setMode(next); setQuantity(""); };
  return <section className={layout.section} aria-label="ปรับสต๊อก">
    <h3>ปรับสต๊อก</h3>
    <form className={layout.form} onSubmit={(event) => { event.preventDefault(); if (ready) setConfirming(true); }}>
      <fieldset disabled={write.frozen}>
        <legend className={layout.visuallyHidden}>รายละเอียดการปรับสต๊อก</legend>
        <div className={styles.modeGroup}><span id={`mode-${material.id}`}>① วิธีปรับสต๊อก</span><div className={styles.modes} role="radiogroup" aria-labelledby={`mode-${material.id}`}>
          <label><input type="radio" name="mode" checked={mode === "addition"} disabled={!material.is_active} onChange={() => choose("addition")} />เพิ่มสต๊อก</label>
          <label><input type="radio" name="mode" checked={mode === "correction"} onChange={() => choose("correction")} />แก้ยอดตามที่นับ</label>
        </div></div>
        {!material.is_active && <p className={layout.muted}>วัตถุดิบนี้ปิดใช้งานอยู่ จึงแก้ยอดตามที่นับได้อย่างเดียว</p>}
        <Field label={mode === "addition" ? `② จำนวนที่เพิ่ม (${unit})` : `② ยอดที่นับได้ทั้งหมด (${unit})`} error={quantityError || undefined}><input inputMode="decimal" autoComplete="off" required value={quantity} aria-invalid={Boolean(quantityError) || undefined} onChange={(event) => setQuantity(event.target.value)} /></Field>
        {mode === "addition" && <Field label="③ ต้นทุนต่อหน่วย (บาท)" hint="ใช้คำนวณต้นทุนเฉลี่ยใหม่" error={costError || undefined}><input inputMode="decimal" autoComplete="off" required value={cost} aria-invalid={Boolean(costError) || undefined} onChange={(event) => setCost(event.target.value)} /></Field>}
        <Field label={mode === "addition" ? "④ เหตุผล" : "③ เหตุผล"} error={reasonError || undefined}><textarea required value={reason} onChange={(event) => setReason(event.target.value)} /></Field>
      </fieldset>
      <div className={layout.submitBar} data-sticky>
        <span aria-live="polite">คงเหลือ {quantityTH(material.qty_on_hand)} → {after && !quantityError ? quantityTH(after) : "…"} {unit}</span>
        <button type="submit" className={layout.submit} disabled={write.frozen || !ready}>ปรับสต๊อก</button>
      </div>
      {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    </form>
    <details className={layout.note}><summary>เงื่อนไข</summary><p>ปรับได้ไม่เกิน 12 หลัก ทศนิยม 6 ตำแหน่ง ไม่ปัดเศษ · แก้ยอดตามที่นับจะคงต้นทุนเฉลี่ยเดิม และตั้งยอดต่ำกว่าที่จองให้งานไว้ไม่ได้ · การรับของจากผู้ขายให้บันทึกที่หน้ารับเข้าวัตถุดิบ</p></details>
    <ConfirmDialog open={confirming} title={mode === "addition" ? "เพิ่มสต๊อก?" : "แก้ยอดตามที่นับ?"} confirmLabel="ยืนยันปรับสต๊อก" checks={["ตรวจจำนวน หน่วย และเหตุผลแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => {
      setConfirming(false);
      write.submit(`/materials/${material.id}/stock`, "POST", () => ({ ...stockFields(material, mode, quantity.trim(), cost.trim(), reason), idempotency_key: crypto.randomUUID(), expected_version: material.version }), "");
    }}>
      <p>{material.name}: คงเหลือ {quantityTH(material.qty_on_hand)} → {after ? quantityTH(after) : "…"} {unit} ระบบจะบันทึกประวัติการปรับนี้และแก้ไขย้อนหลังไม่ได้</p>
    </ConfirmDialog>
  </section>;
}
