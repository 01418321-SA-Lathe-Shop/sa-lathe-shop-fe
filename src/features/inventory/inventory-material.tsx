"use client";

import Link from "next/link";
import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import { dateTimeTH, quantityTH } from "../../components/staff-ui/staff-format";
import { MOVEMENT_MODE } from "../../components/staff-ui/staff-labels";
import { Collapsible, ConfirmDialog, ErrorText, Field, LoadError, RetryPanel, Skeleton, StatusBadge, ToneBadge, TruncatedNotice } from "../../components/staff-ui/staff-ui";
import { useCollection, useNow } from "../customer/customer-hooks";
import { consumedTotal, consumptionByMonth, convertToBase, inventoryDecimal, isBelow, stockAfter, stockFields, type InventoryMaterial, type InventoryMovement, type UnitConversion } from "./inventory-domain";
import { EntryUnit, enteredNote, SupportedUnits } from "./entry-unit";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

// UC5 material detail page. Workers read quantities and history only;
// costs, reasons and stock adjustment are Admin-only (redacted by the API).
export function MaterialDetail({ api, material, admin, back, onSaved }: { api: BackendApi; material: InventoryMaterial; admin: boolean; back: string; onSaved: (message: string) => void }) {
  const history = useCollection<InventoryMovement>(api, `/materials/${material.id}/movements`);
  const unit = material.unit_name; const movements = history.data?.items;
  return <>
    <Link className={styles.back} href={back} scroll={false}>← สต๊อกวัตถุดิบ</Link>
    <header className={styles.detailHead}><h2>{material.name}</h2><MaterialState material={material} /><span className={styles.unit}>หน่วย {unit}</span></header>
    <dl className={styles.summary}>
      <div><dt>คงเหลือ</dt><dd>{quantityTH(material.qty_on_hand)}</dd><small>{unit}</small></div>
      <div><dt>จองให้งานแล้ว</dt><dd data-tone="warning">{quantityTH(material.qty_reserved)}</dd><small>{unit} · ยังไม่ตัดสต๊อกจริง</small></div>
      <div><dt>พร้อมใช้</dt><dd>{quantityTH(material.qty_available)}</dd><small>{unit}</small></div>
      <div><dt>ใช้ในงานแล้ว</dt><dd>{movements ? quantityTH(consumedTotal(movements)) : "—"}</dd><small>{unit} · ตัดเมื่อบันทึกการใช้ในงานผลิต</small></div>
      {admin && <div><dt>ต้นทุนเฉลี่ย (เฉพาะ Admin)</dt><dd>{material.avg_cost === undefined ? "—" : quantityTH(material.avg_cost)}</dd><small>บาท/{unit}</small></div>}
    </dl>
    <section className={styles.detailCard} aria-labelledby="units-title"><h3 id="units-title">หน่วยที่รองรับ</h3>
      <SupportedUnits api={api} materialId={material.id} baseUnit={unit} available={material.qty_available} />
    </section>
    <section className={styles.detailCard} aria-labelledby="usage-title"><h3 id="usage-title">การใช้ในงาน 6 เดือนล่าสุด ({unit})</h3>
      {movements && <UsageChart movements={movements} unit={unit} />}
      <TruncatedNotice show={history.data?.complete === false} />
    </section>
    {admin && <div id="adjust" className={styles.detailCard}><StockForm key={String(material.version)} api={api} material={material} onSaved={onSaved} /></div>}
    <div className={styles.detailCard}>
    <section className={layout.section} aria-label="ประวัติการเคลื่อนไหว">
      <h3>ประวัติการเคลื่อนไหว</h3>
      {history.loading && !history.data && <Skeleton label="กำลังโหลดประวัติ…" rows={2} />}
      {history.error && !history.data && <LoadError title="โหลดประวัติไม่สำเร็จ" onRetry={history.reload} />}
      <TruncatedNotice show={history.data?.complete === false} />
      {history.data && !history.data.items.length && <p className={layout.muted}>ยังไม่มีการเคลื่อนไหวของวัตถุดิบนี้</p>}
      {history.data && history.data.items.length > 0 && <ol className={layout.timeline}>{history.data.items.map((item) => <li key={item.id}>
        <strong className={styles.movementTitle}><StatusBadge map={MOVEMENT_MODE} value={item.mode} />{quantityTH(item.before_quantity)} → {quantityTH(item.after_quantity)} {unit}</strong>
        <span>{dateTimeTH(item.created_at)}{item.mode !== "correction" ? ` · จำนวน ${quantityTH(item.quantity)} ${unit}` : ""}</span>
        {item.entered_quantity && <span>{enteredNote(item, unit)}</span>}
        {item.reason && <span>เหตุผล: {item.reason}</span>}
        {admin && item.unit_cost !== undefined && <span>ต้นทุนต่อ {unit} {quantityTH(item.unit_cost)} บาท</span>}
        {admin && (item.before_cost !== undefined || item.after_cost !== undefined) && <span>ต้นทุนเฉลี่ย {quantityTH(item.before_cost)} → {quantityTH(item.after_cost)} บาท</span>}
      </li>)}</ol>}
    </section>
    </div>
    <Collapsible title="ประวัติระบบ"><p className={layout.code}>รหัสวัตถุดิบ {material.id} · หน่วย {material.unit_id} · เวอร์ชัน {String(material.version)}</p></Collapsible>
  </>;
}

const monthTH = (key: string) => new Intl.DateTimeFormat("th-TH", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${key}-15T00:00:00Z`));
function UsageChart({ movements, unit }: { movements: InventoryMovement[]; unit: string }) {
  const now = useNow();
  if (now === null) return null;
  const months = consumptionByMonth(movements, now);
  if (!months.some((item) => item.percent > 0)) return <p className={layout.muted}>ไม่มีการเบิกใช้ในงานในช่วงนี้</p>;
  return <>
    <div className={styles.chart} aria-hidden="true">{months.map((item) => <div key={item.month} title={`${monthTH(item.month)}: ${quantityTH(item.total)} ${unit}`}>
      <span className={styles.chartPlot}>{item.percent > 0 && <><small>{quantityTH(item.total)}</small><i style={{ height: `${Math.max(item.percent, 2)}%` }} /></>}</span>
      <span>{monthTH(item.month)}</span>
    </div>)}</div>
    <table className={layout.visuallyHidden}><caption>การใช้ในงานรายเดือน</caption><tbody>{months.map((item) => <tr key={item.month}><th scope="row">{monthTH(item.month)}</th><td>{quantityTH(item.total)} {unit}</td></tr>)}</tbody></table>
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
  const [confirming, setConfirming] = useState(false); const [conversion, setConversion] = useState<UnitConversion | null>(null);
  const write = useRetryableWrite(api, () => onSaved(mode === "addition" ? "เพิ่มสต๊อกแล้ว" : "แก้ยอดตามที่นับแล้ว"));
  const unit = material.unit_name; const typedUnit = conversion?.unit_name ?? unit;
  const base = conversion ? convertToBase(quantity.trim(), conversion.factor) : quantity.trim();
  const after = base ? stockAfter(material, mode, base) : null;
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
        <Field label={mode === "addition" ? `② จำนวนที่เพิ่ม (${typedUnit})` : `② ยอดที่นับได้ทั้งหมด (${typedUnit})`} error={quantityError || undefined}><input inputMode="decimal" autoComplete="off" required value={quantity} aria-invalid={Boolean(quantityError) || undefined} onChange={(event) => setQuantity(event.target.value)} /></Field>
        <EntryUnit api={api} materialId={material.id} baseUnit={unit} unitId={conversion?.unit_id} quantity={quantity} onChange={setConversion} />
        {mode === "addition" && <Field label={`③ ต้นทุนต่อ ${unit} (บาท)`} hint={conversion ? `กรอกต้นทุนต่อ ${unit} ไม่ใช่ต่อ ${conversion.unit_name}` : "ใช้คำนวณต้นทุนเฉลี่ยใหม่"} error={costError || undefined}><input inputMode="decimal" autoComplete="off" required value={cost} aria-invalid={Boolean(costError) || undefined} onChange={(event) => setCost(event.target.value)} /></Field>}
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
      write.submit(`/materials/${material.id}/stock`, "POST", () => ({ ...stockFields(material, mode, quantity.trim(), cost.trim(), reason, conversion), idempotency_key: crypto.randomUUID(), expected_version: material.version }), "");
    }}>
      <p>{material.name}: คงเหลือ {quantityTH(material.qty_on_hand)} → {after ? quantityTH(after) : "…"} {unit} ระบบจะบันทึกประวัติการปรับนี้และแก้ไขย้อนหลังไม่ได้</p>
    </ConfirmDialog>
  </section>;
}
