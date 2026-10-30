"use client";

import type { BackendApi } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { quantityTH } from "../../components/staff-ui/staff-format";
import { Field } from "../../components/staff-ui/staff-ui";
import { baseToUnit, convertToBase, type EnteredValues, type UnitConversion } from "./inventory-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

// Stock stays in the base unit; the server converts what is typed here and rejects any result needing rounding.
export function EntryUnit({ api, materialId, baseUnit, unitId, quantity, disabled, onChange }: { api: BackendApi; materialId: string; baseUnit: string; unitId?: string; quantity: string; disabled?: boolean; onChange: (conversion: UnitConversion | null) => void }) {
  const resource = useResource<{ items: UnitConversion[] | null }>(api, `/materials/${materialId}/conversions`);
  const options = (resource.data?.items ?? []).filter((item) => item.is_active);
  if (!options.length) return null;
  const selected = options.find((item) => item.unit_id === unitId);
  const typed = quantity.trim();
  const base = selected && typed ? convertToBase(typed, selected.factor) : null;
  const problem = selected && typed && !base ? "จำนวนนี้แปลงแล้วเกินทศนิยม 6 ตำแหน่ง" : undefined;
  return <Field label="หน่วยที่กรอก" hint={base ? `= ${quantityTH(base)} ${baseUnit}` : undefined} error={problem}>
    <select value={unitId ?? ""} disabled={disabled} onChange={(event) => onChange(options.find((item) => item.unit_id === event.target.value) ?? null)}>
      <option value="">{baseUnit} (หน่วยหลัก)</option>
      {options.map((item) => <option key={item.id} value={item.unit_id}>{item.unit_name} (1 = {quantityTH(item.factor)} {baseUnit})</option>)}
    </select>
  </Field>;
}

export function enteredNote(value: EnteredValues, baseUnit: string): string {
  if (!value.entered_quantity || !value.factor_used) return "";
  return `กรอก ${quantityTH(value.entered_quantity)} ${value.entered_unit_name} (1 ${value.entered_unit_name} = ${quantityTH(value.factor_used)} ${baseUnit})`;
}

export function SupportedUnits({ api, materialId, baseUnit, available }: { api: BackendApi; materialId: string; baseUnit: string; available: string }) {
  const resource = useResource<{ items: UnitConversion[] | null }>(api, `/materials/${materialId}/conversions`);
  const options = (resource.data?.items ?? []).filter((item) => item.is_active);
  return <>
    <p className={styles.unitLine}><span className={styles.unit}>หน่วยหลัก {baseUnit}</span> สต๊อก การจอง และต้นทุนเก็บเป็นหน่วยหลักเสมอ</p>
    {options.length > 0 && <ul className={layout.timeline}>{options.map((item) => {
      const converted = baseToUnit(available, item.factor);
      return <li key={item.id}><strong>1 {item.unit_name} = {quantityTH(item.factor)} {baseUnit}</strong><span>พร้อมใช้ {converted.exact ? "" : "ประมาณ "}{quantityTH(converted.value)} {item.unit_name}</span></li>;
    })}</ul>}
  </>;
}
