"use client";

import { useEffect, useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { bahtTH, quantityTH } from "../../components/staff-ui/staff-format";
import { Button, ConfirmDialog, ErrorText, Field, LoadError, RetryPanel, Skeleton } from "../../components/staff-ui/staff-ui";
import { useCollection } from "../customer/customer-hooks";
import { inventoryDecimal } from "../inventory/inventory-domain";
import { MaterialPicker } from "../inventory/material-picker";
import { lineTotal, orderPayload, orderTotal, type DraftLine, type ShortageItem, type Supplier, type SupplierRecommendation } from "./procurement-domain";
import { JobChooser } from "./procurement-jobs";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./procurement.module.css";

const valid = (value: string, positive: boolean) => { try { inventoryDecimal(value, positive); return true; } catch { return false; } };
const QUANTITY = "ตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง"; const COST = "ตัวเลข 0 ขึ้นไป ทศนิยมไม่เกิน 6 ตำแหน่ง";
const plain = (value: string) => value.replace(/\.?0+$/, "");

// UC6 new supplier order: ① shortages (Q6.1) + supplier recommendations (Q6.2)
// ② lines with live total ③ optional job references.
export function NewOrderForm({ api, shortages = [], onPlaced, onLock }: { api: BackendApi; shortages?: ShortageItem[]; onPlaced: () => void; onLock: (locked: boolean) => void }) {
  const suppliers = useCollection<Supplier>(api, "/suppliers");
  const active = (suppliers.data?.items ?? []).filter((supplier) => supplier.is_active);
  const [supplierId, setSupplierId] = useState(""); const [expected, setExpected] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]); const [jobIds, setJobIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, onPlaced);
  useEffect(() => onLock(write.frozen), [onLock, write.frozen]);

  const matIds = lines.map((line) => line.material_id).join(",");
  const recs = useResource<{ items: SupplierRecommendation[] | null }>(api, matIds ? `/suppliers/recommendations?material_ids=${encodeURIComponent(matIds)}` : null);
  const recItems = recs.data?.items ?? [];

  const errors = lines.map((line) => ({ quantity: line.quantity.trim() && !valid(line.quantity.trim(), true) ? QUANTITY : "", cost: line.unit_cost.trim() && !valid(line.unit_cost.trim(), false) ? COST : "" }));
  const complete = lines.length > 0 && lines.every((line, index) => line.quantity.trim() && line.unit_cost.trim() && !errors[index].quantity && !errors[index].cost);
  const total = complete ? orderTotal(lines) : "";
  const supplier = active.find((item) => item.id === supplierId);
  const ready = Boolean(supplier) && Boolean(total);
  const edit = (index: number, change: Partial<DraftLine>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...change } : line));

  function fillShortages() {
    setLines((current) => {
      const existing = new Set(current.map((item) => item.material_id));
      const added = shortages.filter((s) => !existing.has(s.material_id)).map((s) => ({
        material_id: s.material_id, name: s.material_name, unit_name: s.unit_name, quantity: plain(s.shortage_qty), unit_cost: "",
      }));
      return [...current, ...added];
    });
    const allJobs = Array.from(new Set([...jobIds, ...shortages.flatMap((s) => s.job_ids ?? [])]));
    setJobIds(allJobs.slice(0, 100));
  }

  function applyRecommendedSupplier(rec: SupplierRecommendation) {
    setSupplierId(rec.supplier.id);
    const costByMat = new Map(recItems.filter((r) => r.supplier.id === rec.supplier.id).map((r) => [r.material_id, plain(r.last_unit_cost)]));
    setLines((current) => current.map((line) => (!line.unit_cost.trim() && costByMat.has(line.material_id)) ? { ...line, unit_cost: costByMat.get(line.material_id)! } : line));
  }

  return <div className={layout.form}>
    {shortages.length > 0 && <fieldset className={styles.step} disabled={write.frozen}>
      <legend>วัสดุที่ขาดแคลนจากแผนการผลิต (UC6 Q6.1)</legend>
      <p className={layout.muted}>พบวัสดุที่วางแผนใช้มากกว่าสต๊อกคงเหลือ {shortages.length} รายการ</p>
      <Button onClick={fillShortages} disabled={write.frozen}>เติมรายการที่ขาดทั้งหมดลงใบสั่งซื้อ</Button>
    </fieldset>}
    <fieldset className={styles.step} disabled={write.frozen}>
      <legend>① ผู้ขายและวันที่คาดว่าจะได้รับ</legend>
      {recItems.length > 0 && <div className={layout.note}>
        <strong>ผู้ขายแนะนำจากประวัติการสั่งซื้อ (UC6 Q6.2):</strong>
        <ul className={styles.lines}>{recItems.map((rec) => <li key={`${rec.supplier.id}:${rec.material_id}`}>
          <span><strong>{rec.supplier.name}</strong><small>ราคาซื้อล่าสุด {quantityTH(rec.last_unit_cost)} บาท</small></span>
          <Button variant="text" onClick={() => applyRecommendedSupplier(rec)}>เลือกผู้ขายและใช้ราคานี้</Button>
        </li>)}</ul>
      </div>}
      {suppliers.loading && !suppliers.data && <Skeleton label="กำลังโหลดผู้ขาย…" rows={1} />}
      {suppliers.error && !suppliers.data && <LoadError title="โหลดผู้ขายไม่สำเร็จ" onRetry={suppliers.reload} />}
      {suppliers.data && (active.length ? <Field label="ผู้ขาย" hint="เฉพาะผู้ขายที่เปิดใช้งาน"><select value={supplierId} required onChange={(event) => setSupplierId(event.target.value)}><option value="" disabled>เลือกผู้ขาย</option>{active.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        : <p className={layout.warning}>ยังไม่มีผู้ขายที่เปิดใช้งาน เพิ่มได้ที่แท็บผู้ขาย</p>)}
      <Field label="วันเวลาที่คาดว่าจะได้รับ (ไม่บังคับ)" hint="เวลาประเทศไทย"><input type="datetime-local" value={expected} onChange={(event) => setExpected(event.target.value)} /></Field>
    </fieldset>
    <fieldset className={styles.step} disabled={write.frozen}>
      <legend>② วัตถุดิบ</legend>
      {!lines.length && <p className={layout.muted}>ค้นหาแล้วกดเพิ่มวัตถุดิบด้านล่าง สั่งเกินที่ขาดหรือเติมสต๊อกทั่วไปได้</p>}
      {lines.length > 0 && <ul className={styles.draftLines}>{lines.map((line, index) => {
        const sum = line.quantity.trim() && line.unit_cost.trim() && !errors[index].quantity && !errors[index].cost ? lineTotal(line.quantity.trim(), line.unit_cost.trim()) : "";
        return <li key={line.material_id}>
          <div><strong>{line.name}</strong><Button variant="text" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>ลบ<span className={layout.visuallyHidden}> {line.name}</span></Button></div>
          <Field label={`จำนวน (${line.unit_name})`} error={errors[index].quantity || undefined}><input inputMode="decimal" autoComplete="off" required value={line.quantity} aria-invalid={Boolean(errors[index].quantity) || undefined} onChange={(event) => edit(index, { quantity: event.target.value })} /></Field>
          <Field label={`ราคาต่อ ${line.unit_name} (บาท)`} error={errors[index].cost || undefined}><input inputMode="decimal" autoComplete="off" required value={line.unit_cost} aria-invalid={Boolean(errors[index].cost) || undefined} onChange={(event) => edit(index, { unit_cost: event.target.value })} /></Field>
          <p>รวมรายการนี้ {sum ? bahtTH(sum) : "…"}</p>
        </li>;
      })}</ul>}
      <MaterialPicker api={api} disabled={write.frozen || lines.length >= 100} isAdded={(id) => lines.some((line) => line.material_id === id)} onAdd={(material) => setLines((current) => [...current, { material_id: material.id, name: material.name, unit_name: material.unit_name, quantity: "", unit_cost: "" }])} label="ค้นหาวัตถุดิบที่จะสั่ง" />
    </fieldset>
    <fieldset className={styles.step} disabled={write.frozen}>
      <legend>③ งานที่เกี่ยวข้อง (ไม่บังคับ)</legend>
      <p className={layout.muted}>ไม่เลือก = สั่งเติมสต๊อกทั่วไป การเลือกงานเป็นข้อมูลอ้างอิง ไม่ได้จองของให้งาน</p>
      <JobChooser api={api} value={jobIds} disabled={write.frozen} onChange={setJobIds} />
    </fieldset>
    <div className={layout.submitBar} data-sticky>
      <span aria-live="polite">ยอดรวมโดยประมาณ {total ? bahtTH(total) : "…"} (ไม่มี VAT)</span>
      <button type="button" className={layout.submit} disabled={write.frozen || !ready} onClick={() => setConfirming(true)}>สั่งซื้อ</button>
    </div>
    {write.uncertain ? <><RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onPlaced(); }} /><p className={layout.muted}>ปิดแผงนี้ได้หลังส่งซ้ำหรือโหลดข้อมูลล่าสุด เพื่อไม่ให้เกิดใบสั่งซื้อซ้ำ</p></> : <ErrorText error={write.error} />}
    <details className={layout.note}><summary>เงื่อนไข</summary><p>สั่งซื้อแล้วแก้ไขไม่ได้ ถ้าต้องเปลี่ยนให้ยกเลิกแล้วสั่งใหม่ · การสั่งซื้อไม่เปลี่ยนสต๊อก สต๊อกเพิ่มเมื่อรับของเข้าเท่านั้น · ยอดรวมจริงคำนวณโดยระบบ ปัดเศษทีละรายการ ไม่มี VAT</p></details>
    <ConfirmDialog open={confirming} title="สั่งซื้อวัตถุดิบ?" confirmLabel="ยืนยันสั่งซื้อ" checks={["ตรวจผู้ขาย จำนวน และราคาแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => {
      setConfirming(false);
      write.submit("/material-orders", "POST", () => orderPayload({ key: crypto.randomUUID(), supplierId, jobIds, expectedAt: expected, lines }), "");
    }}>
      <p>{supplier?.name} · วัตถุดิบ {lines.length} รายการ · ยอดรวมโดยประมาณ {total ? bahtTH(total) : "…"}</p>
      <p>สั่งแล้วแก้ไขไม่ได้ ถ้าต้องเปลี่ยนให้ยกเลิกแล้วสั่งใหม่</p>
    </ConfirmDialog>
  </div>;
}
