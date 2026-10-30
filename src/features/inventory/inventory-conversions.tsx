"use client";

import { useState, type FormEvent, type MouseEvent } from "react";
import { quantityTH } from "../../components/staff-ui/staff-format";
import { EmptyState, Field, ToneBadge } from "../../components/staff-ui/staff-ui";
import { inventoryDecimal } from "./inventory-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

type Conversion = { id: string; material: string; base: string; unit: string; factor: string; active: boolean };

// shortcut: owner-approved sample data for the page design only; replace with the Phase A API in backend PLAN.md. Never saved and never touches stock.
const SAMPLE: Conversion[] = [
  { id: "1", material: "ตัวอย่าง เหล็กแผ่น", base: "kg", unit: "แผ่น", factor: "12.500000", active: true },
  { id: "2", material: "ตัวอย่าง เหล็กแผ่น", base: "kg", unit: "มัด", factor: "125.000000", active: true },
  { id: "3", material: "ตัวอย่าง ทองเหลืองเส้น", base: "เมตร", unit: "เส้น", factor: "6.000000", active: true },
  { id: "4", material: "ตัวอย่าง ทองเหลืองเส้น", base: "เมตร", unit: "ม้วน", factor: "50.000000", active: false },
];
const SAMPLE_MATERIALS = [...new Map(SAMPLE.map((item) => [item.material, item.base])).entries()];

export function ConversionsView() {
  const [items, setItems] = useState(SAMPLE); const [material, setMaterial] = useState(SAMPLE_MATERIALS[0][0]);
  const [unit, setUnit] = useState(""); const [factor, setFactor] = useState(""); const [error, setError] = useState("");
  const base = SAMPLE_MATERIALS.find(([name]) => name === material)?.[1] ?? "";
  const active = items.filter((item) => item.active);
  function add(event: FormEvent) {
    event.preventDefault(); const name = unit.trim(); let value: string;
    try { value = inventoryDecimal(factor.trim(), true); } catch { setError("ตัวคูณต้องมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง"); return; }
    if (!name || name === base) { setError("ระบุหน่วยที่ไม่ใช่หน่วยหลักของวัตถุดิบ"); return; }
    if (active.some((item) => item.material === material && item.unit === name)) { setError("วัตถุดิบนี้มีหน่วยนี้อยู่แล้ว"); return; }
    setItems([{ id: crypto.randomUUID(), material, base, unit: name, factor: value, active: true }, ...items]); setUnit(""); setFactor(""); setError("");
  }
  function deactivate(event: MouseEvent<HTMLElement>, id: string) {
    event.currentTarget.closest("details")?.removeAttribute("open");
    setItems(items.map((item) => item.id === id ? { ...item, active: false } : item));
  }
  return <>
    <p className={styles.sample} role="status"><strong>ตัวอย่างหน้าจอ</strong> ข้อมูลในหน้านี้เป็นข้อมูลสมมติ ยังไม่เชื่อมต่อระบบ ไม่ถูกบันทึก และไม่มีผลกับสต๊อก</p>
    <dl className={styles.summary}>
      <div><dt>การแปลงที่ใช้งาน</dt><dd>{active.length.toLocaleString("th-TH")}</dd></div>
      <div><dt>วัตถุดิบที่มีการแปลง</dt><dd>{new Set(active.map((item) => item.material)).size.toLocaleString("th-TH")}</dd></div>
      <div><dt>ปิดใช้งาน</dt><dd>{(items.length - active.length).toLocaleString("th-TH")}</dd><small>ประวัติเดิมยังใช้ตัวคูณที่บันทึกไว้</small></div>
    </dl>
    <section className={styles.detailCard} aria-labelledby="conversion-add"><h3 id="conversion-add">เพิ่มการแปลงหน่วย</h3>
      <form className={styles.inlineForm} onSubmit={add}>
        <Field label="วัตถุดิบ"><select value={material} onChange={(event) => setMaterial(event.target.value)}>{SAMPLE_MATERIALS.map(([name]) => <option key={name}>{name}</option>)}</select></Field>
        <Field label="หน่วยที่ต้องการ"><input value={unit} autoComplete="off" onChange={(event) => setUnit(event.target.value)} /></Field>
        <Field label={`1 ${unit.trim() || "หน่วย"} เท่ากับกี่ ${base}`}><input inputMode="decimal" autoComplete="off" value={factor} onChange={(event) => setFactor(event.target.value)} /></Field>
        <button type="submit" className={layout.submit}>เพิ่มการแปลง</button>
        {error && <p role="alert" className={styles.formError}>{error}</p>}
      </form>
      <p className={layout.muted}>แต่ละวัตถุดิบมีตัวคูณของตัวเอง สต๊อกยังเก็บเป็นหน่วยหลักเสมอ ตัวคูณที่ใช้แล้วแก้ไม่ได้ ต้องปิดใช้งานแล้วเพิ่มใหม่</p>
    </section>
    <section className={styles.panel} aria-label="รายการการแปลงหน่วย">
      {!items.length ? <EmptyState title="ยังไม่มีการแปลงหน่วย">เพิ่มการแปลงหน่วยด้านบน</EmptyState> : <table className={styles.stock}>
        <thead><tr><th scope="col">วัตถุดิบ</th><th scope="col">หน่วยหลัก</th><th scope="col">หน่วยที่แปลง</th><th scope="col">ตัวคูณ</th><th scope="col">สถานะ</th><th scope="col"><span className={layout.visuallyHidden}>จัดการ</span></th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <th scope="row"><span>{item.material}</span></th>
          <td data-label="หน่วยหลัก">{item.base}</td>
          <td data-label="หน่วยที่แปลง">{item.unit}</td>
          <td data-label="ตัวคูณ"><span className={styles.qty}>1 {item.unit} = {quantityTH(item.factor)} <small>{item.base}</small></span></td>
          <td data-label="สถานะ">{item.active ? <ToneBadge tone="done">ใช้งานอยู่</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}</td>
          <td className={styles.menuCell}>{item.active && <details className={layout.menu}>
            <summary aria-label={`ตัวเลือกสำหรับ ${item.material} ${item.unit}`} title="ตัวเลือก"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></summary>
            <div><button type="button" onClick={(event) => deactivate(event, item.id)}>ปิดใช้งาน</button></div>
          </details>}</td>
        </tr>)}</tbody>
      </table>}
    </section>
  </>;
}
