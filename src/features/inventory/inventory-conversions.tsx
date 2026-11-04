"use client";

import { useState, type FormEvent } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { dateTimeTH, quantityTH } from "../../components/staff-ui/staff-format";
import { ConfirmDialog, Drawer, EmptyState, ErrorText, Field, LoadError, Skeleton, ToneBadge } from "../../components/staff-ui/staff-ui";
import { baseToUnit, convertToBase, inventoryDecimal, type InventoryMaterial, type UnitConversion } from "./inventory-domain";
import { DENSITIES, fixedFactor, guessDensity, isLengthUnit, isMassUnit, pieceWeightKg, weightFactor } from "./unit-conversion";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

type Unit = { id: string; name: string };

// Admin per-material conversions (UC10). Supports adding, updating factor in-place (Q10.5), and deactivating.
export function ConversionsView({ api, materials }: { api: BackendApi; materials: InventoryMaterial[] | undefined }) {
  const [chosen, setChosen] = useState("");
  const material = materials?.find((item) => item.id === chosen) ?? materials?.[0];
  if (!materials) return <Skeleton label="กำลังโหลดวัตถุดิบ…" />;
  if (!material) return <EmptyState title="ยังไม่มีวัตถุดิบ">เพิ่มวัตถุดิบได้ที่ข้อมูลหลัก</EmptyState>;
  return <>
    <section className={styles.detailCard} aria-labelledby="conversion-material">
      <h3 id="conversion-material">เลือกวัตถุดิบ</h3>
      <Field label="วัตถุดิบ" hint={`หน่วยหลัก ${material.unit_name}`}><select value={material.id} onChange={(event) => setChosen(event.target.value)}>{materials.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
    </section>
    <ConversionGuide material={material} />
    <MaterialConversions key={material.id} api={api} material={material} />
  </>;
}

function MaterialConversions({ api, material }: { api: BackendApi; material: InventoryMaterial }) {
  const conversions = useResource<{ items: UnitConversion[] | null }>(api, `/materials/${material.id}/conversions`);
  const units = useResource<{ items: Unit[] | null }>(api, "/units");
  const command = useCommand(); const [unitId, setUnitId] = useState(""); const [factor, setFactor] = useState(""); const [problem, setProblem] = useState("");
  const [closing, setClosing] = useState<UnitConversion | null>(null);
  const [editing, setEditing] = useState<UnitConversion | null>(null);
  const [editFactor, setEditFactor] = useState(""); const [editProblem, setEditProblem] = useState("");
  const items = conversions.data?.items ?? [];
  const taken = new Set(items.filter((item) => item.is_active).map((item) => item.unit_id));
  const choices = (units.data?.items ?? []).filter((unit) => unit.id !== material.unit_id && !taken.has(unit.id));
  const unitName = choices.find((unit) => unit.id === unitId)?.name;
  function pick(id: string) {
    const name = choices.find((unit) => unit.id === id)?.name; const fixed = name ? fixedFactor(name, material.unit_name) : null;
    setUnitId(id); setFactor(fixed?.exact ? fixed.factor : ""); setProblem("");
  }
  function add(event: FormEvent) {
    event.preventDefault();
    if (!unitName) { setProblem("เลือกหน่วยที่ต้องการแปลง"); return; }
    const checked = checkFactor(factor, unitName, material.unit_name);
    if ("problem" in checked) { setProblem(checked.problem); return; }
    setProblem(""); void command.run(async (signal) => { await api.call(`/materials/${material.id}/conversions`, "POST", { unit_id: unitId, factor: checked.value }, signal); setUnitId(""); setFactor(""); conversions.reload(); }, "");
  }
  function saveEdit(event: FormEvent) {
    event.preventDefault(); if (!editing) return;
    const checked = checkFactor(editFactor, editing.unit_name, material.unit_name);
    if ("problem" in checked) { setEditProblem(checked.problem); return; }
    setEditProblem("");
    void command.run(async (signal) => {
      await api.call(`/materials/${material.id}/conversions/${editing.id}`, "PATCH", { factor: checked.value }, signal);
      setEditing(null); conversions.reload();
    }, "");
  }
  return <>
    <section className={styles.detailCard} aria-labelledby="conversion-add"><h3 id="conversion-add">เพิ่มหน่วยที่กรอกได้</h3>
      {units.error && !units.data && <LoadError title="โหลดหน่วยไม่สำเร็จ" onRetry={units.reload} />}
      <form className={styles.inlineForm} onSubmit={add}>
        <Field label="① หน่วยอื่นที่จะให้กรอกได้" hint={`หน่วยหลัก (${material.unit_name}) ไม่ต้องเพิ่ม`}><select value={unitId} disabled={command.busy} onChange={(event) => pick(event.target.value)}><option value="">เลือกหน่วย</option>{choices.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
        {unitName && <FactorInput material={material} unitName={unitName} value={factor} disabled={command.busy} onChange={setFactor} />}
        <button type="submit" className={layout.submit} disabled={command.busy || !unitName}>เพิ่มการแปลง</button>
        {problem && <p role="alert" className={styles.formError}>{problem}</p>}
      </form>
      <ErrorText error={command.error} />
      <p className={layout.muted}>ไม่มีหน่วยที่ต้องการ เพิ่มได้ที่ข้อมูลหลัก การแปลงนี้ใช้กับ “{material.name}” เท่านั้น วัตถุดิบอื่นต้องตั้งของตัวเอง</p>
    </section>
    <section className={styles.panel} aria-label="รายการการแปลงหน่วย">
      {conversions.loading && !conversions.data && <div className={styles.note}><Skeleton label="กำลังโหลดการแปลงหน่วย…" /></div>}
      {conversions.error && !conversions.data && <div className={styles.note}><LoadError title="โหลดการแปลงหน่วยไม่สำเร็จ" onRetry={conversions.reload} /></div>}
      {conversions.data && !items.length && <EmptyState title="ยังไม่มีการแปลงหน่วย">ตอนนี้กรอกได้เฉพาะหน่วยหลัก ({material.unit_name}) เพิ่มหน่วยอื่นด้านบน</EmptyState>}
      {items.length > 0 && <table className={styles.stock}>
        <thead><tr><th scope="col">หน่วยที่กรอกได้</th><th scope="col">1 หน่วยนี้เท่ากับ</th><th scope="col">เพิ่มเมื่อ</th><th scope="col">สถานะ</th><th scope="col"><span className={layout.visuallyHidden}>จัดการ</span></th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <th scope="row"><span>{item.unit_name}</span></th>
          <td data-label="1 หน่วยนี้เท่ากับ"><span className={styles.qty}>1 {item.unit_name} = {quantityTH(item.factor)} <small>{material.unit_name}</small></span></td>
          <td data-label="เพิ่มเมื่อ">{dateTimeTH(item.created_at)}</td>
          <td data-label="สถานะ">{item.is_active ? <ToneBadge tone="done">ใช้งานอยู่</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}</td>
          <td className={styles.menuCell}>{item.is_active && <details className={layout.menu}>
            <summary aria-label={`ตัวเลือกสำหรับ ${item.unit_name}`} title="ตัวเลือก"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></summary>
            <div>
              <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setEditing(item); setEditFactor(item.factor); setEditProblem(""); }}>แก้ไขค่าแปลง</button>
              <button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setClosing(item); }}>ปิดใช้งาน</button>
            </div>
          </details>}</td>
        </tr>)}</tbody>
      </table>}
    </section>
    <Drawer open={Boolean(editing)} title={`แก้ไขค่าแปลงหน่วย ${editing?.unit_name ?? ""}`} onClose={() => setEditing(null)}>
      {editing && <form className={layout.form} onSubmit={saveEdit}>
        <fieldset disabled={command.busy}>
          <FactorInput material={material} unitName={editing.unit_name} value={editFactor} onChange={setEditFactor} />
          {editProblem && <p role="alert" className={styles.formError}>{editProblem}</p>}
          <p className={layout.muted}>ค่าใหม่ใช้กับรายการที่กรอกหลังบันทึกเท่านั้น สต๊อกปัจจุบันและรายการเดิมไม่เปลี่ยน เพราะระบบเก็บสต๊อกเป็น {material.unit_name} และจำค่าแปลงที่ใช้ในแต่ละรายการไว้แล้ว</p>
        </fieldset>
        <div className={layout.submitBar} data-sticky><span>บันทึกค่าแปลงใหม่</span><button type="submit" className={layout.submit} disabled={command.busy}>บันทึก</button></div>
        <ErrorText error={command.error} />
      </form>}
    </Drawer>
    <ConfirmDialog open={Boolean(closing)} title={`ปิดใช้งานหน่วย ${closing?.unit_name ?? ""}?`} confirmLabel="ปิดใช้งาน" danger onClose={() => setClosing(null)} onConfirm={() => { const target = closing; setClosing(null); if (target) void command.run(async (signal) => { await api.call(`/materials/${material.id}/conversions/${target.id}/deactivate`, "POST", {}, signal); conversions.reload(); }, ""); }}>
      <p>หลังปิดใช้งานจะกรอกจำนวนด้วยหน่วยนี้ไม่ได้ รายการเดิมยังใช้ค่าแปลงที่บันทึกไว้ สต๊อกไม่เปลี่ยน</p>
    </ConfirmDialog>
  </>;
}

/** Shared by add and edit: a positive 6-place decimal, and standard unit pairs must keep their universal value. */
function checkFactor(raw: string, unitName: string, baseUnit: string): { value: string } | { problem: string } {
  let value: string;
  try { value = inventoryDecimal(raw.trim(), true); } catch { return { problem: `กรอกจำนวน ${baseUnit} ที่เท่ากับ 1 ${unitName} (มากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง)` }; }
  const fixed = fixedFactor(unitName, baseUnit);
  if (fixed && !fixed.exact) return { problem: `1 ${unitName} = ${quantityTH(fixed.factor)}… ${baseUnit} เก็บเป็นทศนิยม 6 ตำแหน่งไม่ได้พอดี ให้กรอกด้วยหน่วยหลักแทน` };
  if (fixed && fixed.factor !== value) return { problem: `${unitName} กับ ${baseUnit} มีค่ามาตรฐานตายตัว: 1 ${unitName} = ${quantityTH(fixed.factor)} ${baseUnit} เสมอ ไม่ขึ้นกับวัตถุดิบ` };
  return { value };
}

function FactorInput({ material, unitName, value, disabled, onChange }: { material: InventoryMaterial; unitName: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  const base = material.unit_name; const fixed = fixedFactor(unitName, base);
  const checked = value.trim() ? checkFactor(value, unitName, base) : null;
  const factor = checked && "value" in checked ? checked.value : null;
  const sample = factor ? convertToBase("2", factor) : null; const stock = factor ? baseToUnit(material.qty_available, factor) : null;
  return <>
    <Field label={`② 1 ${unitName} เท่ากับกี่ ${base}`} hint={fixed?.exact ? "หน่วยมาตรฐานคู่นี้มีค่าตายตัว ระบบกรอกให้แล้ว" : `ค่านี้ขึ้นกับขนาดและชนิดของ “${material.name}”`}>
      <input inputMode="decimal" autoComplete="off" value={value} disabled={disabled || Boolean(fixed?.exact)} onChange={(event) => onChange(event.target.value)} placeholder={isMassUnit(base) ? "เช่น 12.485" : undefined} />
    </Field>
    {!fixed && isMassUnit(base) && <WeightCalculator material={material} unitName={unitName} disabled={disabled} onUse={onChange} />}
    {factor && sample && stock && <ul className={layout.timeline} aria-label="ผลของการแปลง">
      <li><strong>1 {unitName} = {quantityTH(factor)} {base}</strong><span>ทุกครั้งที่กรอกเป็น {unitName} ระบบคูณด้วย {quantityTH(factor)} แล้วบันทึกสต๊อกเป็น {base}</span></li>
      <li><strong>ตัวอย่าง: รับเข้า 2 {unitName} → สต๊อกเพิ่ม {quantityTH(sample)} {base}</strong><span>ต้นทุนยังกรอกเป็นบาทต่อ {base}</span></li>
      <li><strong>พร้อมใช้ตอนนี้ {quantityTH(material.qty_available)} {base} ≈ {quantityTH(stock.value)} {unitName}</strong><span>{stock.exact ? "หารลงตัว" : "ปัดลง เพราะหารไม่ลงตัว"} · แสดงเพื่ออ่านเท่านั้น สต๊อกจริงยังเป็น {base}</span></li>
    </ul>}
  </>;
}

// Theoretical weight from size and density; Admin can still type the stockist's own figure instead.
function WeightCalculator({ material, unitName, disabled, onUse }: { material: InventoryMaterial; unitName: string; disabled?: boolean; onUse: (value: string) => void }) {
  const lengthUnit = fixedFactor(unitName, "มิลลิเมตร");
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [diameter, setDiameter] = useState(""); const [width, setWidth] = useState(""); const [thickness, setThickness] = useState("");
  const [length, setLength] = useState(isLengthUnit(unitName) ? "" : "6000");
  const [density, setDensity] = useState(String(guessDensity(material.name) ?? 7.85));
  const lengthMm = lengthUnit?.exact ? Number(lengthUnit.factor) : Number(length);
  const kg = pieceWeightKg(shape === "round" ? { shape, diameter: Number(diameter) } : { shape, width: Number(width), thickness: Number(thickness) }, lengthMm, Number(density));
  const suggestion = kg ? weightFactor(kg, material.unit_name) : null;
  return <details className={styles.detailCard}>
    <summary>ไม่ทราบน้ำหนัก? คำนวณจากขนาด (น้ำหนักทางทฤษฎี)</summary>
    <p className={layout.muted}>น้ำหนัก (กก.) = พื้นที่หน้าตัด (มม.²) × ความยาว (มม.) × ความหนาแน่น (ก./ซม.³) ÷ 1,000,000 · เพลากลม: พื้นที่ = π × Ø² ÷ 4 · แผ่น/เหล็กแบน: กว้าง × หนา · ของจริงอาจต่างจากตารางผู้ขายเล็กน้อย</p>
    <fieldset className={styles.inlineForm} disabled={disabled}>
      <Field label="รูปหน้าตัด"><select value={shape} onChange={(event) => setShape(event.target.value as "round" | "rect")}><option value="round">เพลากลม (Ø)</option><option value="rect">แผ่น / เหล็กแบน (กว้าง × หนา)</option></select></Field>
      {shape === "round" ? <Field label="เส้นผ่านศูนย์กลาง Ø (มม.)"><input inputMode="decimal" value={diameter} onChange={(event) => setDiameter(event.target.value)} placeholder="45" /></Field> : <>
        <Field label="กว้าง (มม.)"><input inputMode="decimal" value={width} onChange={(event) => setWidth(event.target.value)} placeholder="1219" /></Field>
        <Field label="หนา (มม.)"><input inputMode="decimal" value={thickness} onChange={(event) => setThickness(event.target.value)} placeholder="12" /></Field>
      </>}
      {lengthUnit?.exact ? <p className={layout.muted}>ความยาวต่อ 1 {unitName} = {quantityTH(lengthUnit.factor)} มม.</p> : <Field label={`ความยาวต่อ 1 ${unitName} (มม.)`} hint="เช่น เหล็กเพลา 1 เส้น ยาว 6,000 มม. · แผ่น 4×8 ฟุต ยาว 2,438 มม."><input inputMode="decimal" value={length} onChange={(event) => setLength(event.target.value)} /></Field>}
      <Field label="ความหนาแน่น (ก./ซม.³)"><select value={density} onChange={(event) => setDensity(event.target.value)}>{DENSITIES.map((item) => <option key={item.label} value={String(item.value)}>{item.label} · {item.value}</option>)}</select></Field>
    </fieldset>
    {suggestion ? <p className={styles.unitLine}>1 {unitName} ≈ <strong>{quantityTH(suggestion)} {material.unit_name}</strong> (ปัดถึงกรัม) <button type="button" className={layout.submit} disabled={disabled} onClick={() => onUse(suggestion)}>ใช้ค่านี้</button></p> : <p className={layout.muted}>กรอกขนาดให้ครบเพื่อดูน้ำหนัก</p>}
  </details>;
}

function ConversionGuide({ material }: { material: InventoryMaterial }) {
  return <details className={styles.detailCard} open>
    <summary><strong>การแปลงหน่วยทำงานอย่างไร</strong></summary>
    <ul className={layout.timeline}>
      <li><strong>หน่วยหลัก = หน่วยที่ใช้นับสต๊อก (ตอนนี้ {material.unit_name})</strong><span>คงเหลือ การจอง ต้นทุนเฉลี่ย และประวัติ เก็บเป็นหน่วยหลักเสมอ และเปลี่ยนภายหลังไม่ได้</span></li>
      <li><strong>หน่วยอื่น = หน่วยที่หน้างานสะดวกกรอก</strong><span>ตั้งเป็นประโยค “1 หน่วยอื่น = กี่หน่วยหลัก” ตอนปรับสต๊อก วางแผนวัตถุดิบ หรือบันทึกการเบิก ระบบคูณให้ และจำทั้งค่าที่กรอกกับค่าแปลงที่ใช้ในรายการนั้น</span></li>
      <li><strong>ตัวอย่าง: เหล็กเพลา S45C Ø45 มม. (หน่วยหลัก กิโลกรัม)</strong><span>1 เมตร = 12.485 กก. · 1 เส้น (ยาว 6 ม.) = 74.909 กก. → รับเข้า 3 เส้น สต๊อกเพิ่ม 224.727 กก. · เบิก 0.5 เมตร สต๊อกลด 6.2425 กก.</span></li>
      <li><strong>ทำไมกิโลกรัม ↔ เมตร ไม่มีค่ากลาง</strong><span>น้ำหนักต่อเมตรขึ้นกับขนาดหน้าตัดและความหนาแน่น: S45C Ø16 = 1.578 กก./ม. · S45C Ø45 = 12.485 กก./ม. · อะลูมิเนียม 6061 Ø45 = 4.294 กก./ม. จึงต้องตั้งค่าแยกต่อวัตถุดิบหนึ่งขนาด ส่วนหน่วยมาตรฐานชนิดเดียวกัน (กรัม↔กิโลกรัม, มม.↔เมตร, นิ้ว↔มม.) มีค่าตายตัว ระบบกรอกให้และไม่ยอมให้ตั้งค่าอื่น</span></li>
    </ul>
  </details>;
}
