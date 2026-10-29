"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { Button, Drawer, EmptyState, ErrorText, Field, LoadError, Skeleton } from "../../components/staff-ui/staff-ui";
import { catalogName, type InventoryMaterial } from "./inventory-domain";
import { MaterialState } from "./inventory-material";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./inventory.module.css";

type Unit = { id: string; name: string };
type Editing = { kind: "new" } | { kind: "edit"; material: InventoryMaterial } | null;

// Admin master data (UC5): units and materials. Names are unique ignoring case,
// a material's unit never changes, and nothing is deleted. Creation has no retry
// key, so after an unclear failure Admin reloads before trying again.
export function CatalogView({ api, materials, onSaved }: { api: BackendApi; materials: InventoryMaterial[] | undefined; onSaved: (message: string) => void }) {
  const units = useResource<{ items: Unit[] | null }>(api, "/units");
  const [editing, setEditing] = useState<Editing>(null);
  const unitList = units.data?.items ?? [];
  const saved = (message: string) => { setEditing(null); units.reload(); onSaved(message); };
  return <div className={styles.catalog}>
    <p className={layout.muted}>หน่วยของวัตถุดิบเปลี่ยนภายหลังไม่ได้ และลบข้อมูลไม่ได้ ใช้การปิดใช้งานแทน</p>
    <section className={layout.detailCard} aria-label="หน่วย">
      <div className={layout.detailHeader}><h2>หน่วย</h2></div>
      {units.loading && !units.data && <Skeleton label="กำลังโหลดหน่วย…" rows={1} />}
      {units.error && !units.data && <LoadError title="โหลดหน่วยไม่สำเร็จ" onRetry={units.reload} />}
      {units.data && (unitList.length ? <ul className={styles.unitList}>{unitList.map((unit) => <li key={unit.id}>{unit.name}</li>)}</ul> : <p className={layout.muted}>ยังไม่มีหน่วย เพิ่มหน่วยก่อนเพิ่มวัตถุดิบ</p>)}
      <UnitForm api={api} onSaved={() => saved("เพิ่มหน่วยแล้ว")} />
    </section>
    <section className={layout.detailCard} aria-label="วัตถุดิบ">
      <div className={layout.detailHeader}><h2>วัตถุดิบ</h2><Button variant="primary" disabled={!unitList.length} onClick={() => setEditing({ kind: "new" })}>เพิ่มวัตถุดิบ</Button></div>
      {!materials && <Skeleton label="กำลังโหลดวัตถุดิบ…" rows={2} />}
      {materials && !materials.length && <EmptyState title="ยังไม่มีวัตถุดิบ">เพิ่มวัตถุดิบใหม่จะเริ่มที่สต๊อก 0</EmptyState>}
      {materials && materials.length > 0 && <ul className={styles.catalogList}>{materials.map((material) => <li key={material.id}>
        <span><strong>{material.name}</strong><small>หน่วย {material.unit_name}</small></span>
        <MaterialState material={material} />
        <Button onClick={() => setEditing({ kind: "edit", material })}>แก้ไข<span className={layout.visuallyHidden}> {material.name}</span></Button>
      </li>)}</ul>}
    </section>
    <Drawer open={editing !== null} title={editing?.kind === "edit" ? `แก้ไข ${editing.material.name}` : "เพิ่มวัตถุดิบ"} onClose={() => setEditing(null)}>
      {editing?.kind === "new" && <NewMaterialForm api={api} units={unitList} onSaved={() => saved("เพิ่มวัตถุดิบแล้ว สต๊อกเริ่มที่ 0")} />}
      {editing?.kind === "edit" && <EditMaterialForm key={String(editing.material.version)} api={api} material={editing.material} onSaved={() => saved("บันทึกวัตถุดิบแล้ว")} />}
    </Drawer>
  </div>;
}

const UNCLEAR = "ถ้าไม่แน่ใจว่าบันทึกสำเร็จ ให้กดอัปเดตข้อมูลและตรวจรายการก่อนส่งอีกครั้ง";

function UnitForm({ api, onSaved }: { api: BackendApi; onSaved: () => void }) {
  const command = useCommand(); const [name, setName] = useState(""); const [error, setError] = useState("");
  return <form className={styles.inlineForm} onSubmit={(event) => {
    event.preventDefault(); let value: string;
    try { value = catalogName(name, 50); } catch { setError("กรอกชื่อหน่วย ไม่เกิน 50 ตัวอักษร ไม่ขึ้นบรรทัดใหม่"); return; }
    setError(""); void command.run(async (signal) => { await api.call("/units", "POST", { name: value }, signal); setName(""); onSaved(); }, "");
  }}>
    <Field label="ชื่อหน่วยใหม่ (เช่น ชิ้น กก. ม.)" error={error || undefined}><input value={name} maxLength={50} disabled={command.busy} onChange={(event) => setName(event.target.value)} /></Field>
    <Button type="submit" disabled={command.busy || !name.trim()}>เพิ่มหน่วย</Button>
    {command.error && <><ErrorText error={command.error} /><p className={layout.muted}>{UNCLEAR}</p></>}
  </form>;
}

function NewMaterialForm({ api, units, onSaved }: { api: BackendApi; units: Unit[]; onSaved: () => void }) {
  const command = useCommand(); const [error, setError] = useState("");
  return <form className={layout.form} onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const unitId = String(data.get("unit_id") ?? ""); let name: string;
    try { name = catalogName(String(data.get("name") ?? ""), 200); } catch { setError("กรอกชื่อวัตถุดิบ ไม่เกิน 200 ตัวอักษร ไม่ขึ้นบรรทัดใหม่"); return; }
    if (!units.some((unit) => unit.id === unitId)) { setError("เลือกหน่วย"); return; }
    setError(""); void command.run(async (signal) => { await api.call("/materials", "POST", { name, unit_id: unitId }, signal); onSaved(); }, "");
  }}>
    <fieldset disabled={command.busy}>
      <Field label="ชื่อวัตถุดิบ" hint="ชื่อต้องไม่ซ้ำกับวัตถุดิบอื่น (ไม่สนตัวพิมพ์เล็กใหญ่)"><input name="name" required maxLength={200} /></Field>
      <Field label="หน่วย" hint="เปลี่ยนภายหลังไม่ได้"><select name="unit_id" required defaultValue=""><option value="" disabled>เลือกหน่วย</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></Field>
    </fieldset>
    {error && <p className={layout.problem} role="alert">{error}</p>}
    <div className={layout.submitBar} data-sticky><span>สต๊อกเริ่มที่ 0</span><button type="submit" className={layout.submit} disabled={command.busy}>เพิ่มวัตถุดิบ</button></div>
    {command.error && <><ErrorText error={command.error} /><p className={layout.muted}>{UNCLEAR}</p></>}
  </form>;
}

function EditMaterialForm({ api, material, onSaved }: { api: BackendApi; material: InventoryMaterial; onSaved: () => void }) {
  const command = useCommand(); const [error, setError] = useState("");
  return <form className={layout.form} onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); let name: string;
    try { name = catalogName(String(data.get("name") ?? ""), 200); } catch { setError("กรอกชื่อวัตถุดิบ ไม่เกิน 200 ตัวอักษร ไม่ขึ้นบรรทัดใหม่"); return; }
    setError(""); void command.run(async (signal) => { await api.call(`/materials/${material.id}`, "PATCH", { expected_version: BigInt(material.version), name, is_active: data.has("is_active") }, signal); onSaved(); }, "");
  }}>
    <fieldset disabled={command.busy}>
      <Field label="ชื่อวัตถุดิบ"><input name="name" required maxLength={200} defaultValue={material.name} /></Field>
      <p className={layout.muted}>หน่วย {material.unit_name} (เปลี่ยนไม่ได้)</p>
      <label className={layout.toggle}><input name="is_active" type="checkbox" defaultChecked={material.is_active} />เปิดใช้งาน</label>
      <p className={layout.muted}>ปิดใช้งานแล้วสต๊อกและประวัติยังอยู่ แต่เพิ่มสต๊อกหรือจองเพิ่มให้งานใหม่ไม่ได้</p>
    </fieldset>
    {error && <p className={layout.problem} role="alert">{error}</p>}
    <div className={layout.submitBar} data-sticky><span>บันทึกแล้วรายการจะโหลดใหม่</span><button type="submit" className={layout.submit} disabled={command.busy}>บันทึก</button></div>
    {command.error && <><ErrorText error={command.error} /><p className={layout.muted}>มีคนแก้ไขไปแล้วหรือการเชื่อมต่อขัดข้อง ปิดแผงนี้ กดอัปเดตข้อมูล แล้วแก้อีกครั้ง</p></>}
  </form>;
}
