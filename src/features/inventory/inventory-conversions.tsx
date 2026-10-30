"use client";

import { useState, type FormEvent } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { dateTimeTH, quantityTH } from "../../components/staff-ui/staff-format";
import { ConfirmDialog, EmptyState, ErrorText, Field, LoadError, Skeleton, ToneBadge } from "../../components/staff-ui/staff-ui";
import { inventoryDecimal, type InventoryMaterial, type UnitConversion } from "./inventory-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

type Unit = { id: string; name: string };

// Admin per-material conversions. A factor is never edited: past records keep it, so correcting one means deactivating it and adding another.
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
    <MaterialConversions key={material.id} api={api} material={material} />
  </>;
}

function MaterialConversions({ api, material }: { api: BackendApi; material: InventoryMaterial }) {
  const conversions = useResource<{ items: UnitConversion[] | null }>(api, `/materials/${material.id}/conversions`);
  const units = useResource<{ items: Unit[] | null }>(api, "/units");
  const command = useCommand(); const [unitId, setUnitId] = useState(""); const [factor, setFactor] = useState(""); const [problem, setProblem] = useState(""); const [closing, setClosing] = useState<UnitConversion | null>(null);
  const items = conversions.data?.items ?? [];
  const taken = new Set(items.filter((item) => item.is_active).map((item) => item.unit_id));
  const choices = (units.data?.items ?? []).filter((unit) => unit.id !== material.unit_id && !taken.has(unit.id));
  const unitName = choices.find((unit) => unit.id === unitId)?.name;
  function add(event: FormEvent) {
    event.preventDefault(); let value: string;
    if (!unitName) { setProblem("เลือกหน่วยที่ต้องการแปลง"); return; }
    try { value = inventoryDecimal(factor.trim(), true); } catch { setProblem("ตัวคูณต้องมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง"); return; }
    setProblem(""); void command.run(async (signal) => { await api.call(`/materials/${material.id}/conversions`, "POST", { unit_id: unitId, factor: value }, signal); setUnitId(""); setFactor(""); conversions.reload(); }, "");
  }
  return <>
    <section className={styles.detailCard} aria-labelledby="conversion-add"><h3 id="conversion-add">เพิ่มการแปลงหน่วย</h3>
      {units.error && !units.data && <LoadError title="โหลดหน่วยไม่สำเร็จ" onRetry={units.reload} />}
      <form className={styles.inlineForm} onSubmit={add}>
        <Field label="หน่วยที่ต้องการ"><select value={unitId} disabled={command.busy} onChange={(event) => setUnitId(event.target.value)}><option value="">เลือกหน่วย</option>{choices.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
        <Field label={`1 ${unitName ?? "หน่วย"} เท่ากับกี่ ${material.unit_name}`}><input inputMode="decimal" autoComplete="off" value={factor} disabled={command.busy} onChange={(event) => setFactor(event.target.value)} /></Field>
        <button type="submit" className={layout.submit} disabled={command.busy}>เพิ่มการแปลง</button>
        {problem && <p role="alert" className={styles.formError}>{problem}</p>}
      </form>
      <ErrorText error={command.error} />
      <p className={layout.muted}>ไม่มีหน่วยที่ต้องการ เพิ่มได้ที่ข้อมูลหลัก สต๊อกยังเก็บเป็นหน่วยหลักเสมอ ตัวคูณแก้ไขไม่ได้ ต้องปิดใช้งานแล้วเพิ่มใหม่</p>
    </section>
    <section className={styles.panel} aria-label="รายการการแปลงหน่วย">
      {conversions.loading && !conversions.data && <div className={styles.note}><Skeleton label="กำลังโหลดการแปลงหน่วย…" /></div>}
      {conversions.error && !conversions.data && <div className={styles.note}><LoadError title="โหลดการแปลงหน่วยไม่สำเร็จ" onRetry={conversions.reload} /></div>}
      {conversions.data && !items.length && <EmptyState title="ยังไม่มีการแปลงหน่วย">เพิ่มการแปลงหน่วยด้านบน</EmptyState>}
      {items.length > 0 && <table className={styles.stock}>
        <thead><tr><th scope="col">หน่วยที่แปลง</th><th scope="col">ตัวคูณ</th><th scope="col">เพิ่มเมื่อ</th><th scope="col">สถานะ</th><th scope="col"><span className={layout.visuallyHidden}>จัดการ</span></th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id}>
          <th scope="row"><span>{item.unit_name}</span></th>
          <td data-label="ตัวคูณ"><span className={styles.qty}>1 {item.unit_name} = {quantityTH(item.factor)} <small>{material.unit_name}</small></span></td>
          <td data-label="เพิ่มเมื่อ">{dateTimeTH(item.created_at)}</td>
          <td data-label="สถานะ">{item.is_active ? <ToneBadge tone="done">ใช้งานอยู่</ToneBadge> : <ToneBadge tone="quiet">ปิดใช้งาน</ToneBadge>}</td>
          <td className={styles.menuCell}>{item.is_active && <details className={layout.menu}>
            <summary aria-label={`ตัวเลือกสำหรับ ${item.unit_name}`} title="ตัวเลือก"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg></summary>
            <div><button type="button" onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); setClosing(item); }}>ปิดใช้งาน</button></div>
          </details>}</td>
        </tr>)}</tbody>
      </table>}
    </section>
    <ConfirmDialog open={Boolean(closing)} title={`ปิดใช้งานหน่วย ${closing?.unit_name ?? ""}?`} confirmLabel="ปิดใช้งาน" danger onClose={() => setClosing(null)} onConfirm={() => { const target = closing; setClosing(null); if (target) void command.run(async (signal) => { await api.call(`/materials/${material.id}/conversions/${target.id}/deactivate`, "POST", {}, signal); conversions.reload(); }, ""); }}>
      <p>หลังปิดใช้งานจะกรอกจำนวนด้วยหน่วยนี้ไม่ได้ รายการเดิมยังใช้ตัวคูณที่บันทึกไว้</p>
    </ConfirmDialog>
  </>;
}
