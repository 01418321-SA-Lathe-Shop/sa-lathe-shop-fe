"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand, useRetryableWrite } from "../../hooks/backend-hooks";
import { minutesTH, quantityTH } from "../../components/staff-ui/staff-format";
import { Button, ConfirmDialog, ErrorText, Field, NextAction, RetryPanel } from "../../components/staff-ui/staff-ui";
import { MaterialPicker } from "../inventory/material-picker";
import { timePayload, usagePayload, type ProductionState, type UsageDraft } from "./production-domain";
import { editableQuantity, isPositiveQuantity } from "./production-list-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./production.module.css";

// In-progress recording: incremental actual use, labor minutes, private photos
// and completion. Payloads are the unchanged UC8 command builders.
export function WorkPanel({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: (message: string) => void }) {
  const [panel, setPanel] = useState<"usage" | "time" | "photo">("usage"); const [confirming, setConfirming] = useState(false);
  const complete = useRetryableWrite(api, () => onSaved("ปิดงานแล้ว · ไปออกใบแจ้งหนี้และส่งมอบต่อได้"));
  return <>
    <NextAction title="บันทึกงานระหว่างผลิต">
      <div className={styles.segments} role="group" aria-label="เลือกสิ่งที่จะบันทึก">{([["usage", "ใช้วัตถุดิบ"], ["time", "เวลาทำงาน"], ["photo", "รูปงาน"]] as const).map(([key, text]) => <button key={key} type="button" aria-pressed={panel === key} onClick={() => setPanel(key)}>{text}</button>)}</div>
      {panel === "usage" && <UsageForm key={`usage:${job.version}`} api={api} job={job} onSaved={onSaved} />}
      {panel === "time" && <TimeForm key={`time:${job.version}`} api={api} job={job} onSaved={onSaved} />}
      {panel === "photo" && <PhotoForm api={api} job={job} onSaved={onSaved} />}
    </NextAction>
    <section className={styles.closeJob} aria-label="ปิดงาน">
      <div><h3>ปิดงานเมื่อผลิตเสร็จ</h3><p className={layout.muted}>บันทึกวัตถุดิบและเวลาทำงานให้ครบก่อน หลังปิดงานจะบันทึกเพิ่มไม่ได้</p></div>
      <Button disabled={complete.frozen} onClick={() => setConfirming(true)}>ปิดงาน</Button>
      {complete.uncertain ? <RetryPanel busy={complete.busy} onRetry={complete.retry} onDiscard={() => { complete.discard(); onSaved(""); }} /> : <ErrorText error={complete.error} />}
    </section>
    <ConfirmDialog open={confirming} title="ปิดงานนี้?" confirmLabel="ปิดงาน" checks={["บันทึกวัตถุดิบที่ใช้ครบแล้ว", "บันทึกเวลาทำงานครบแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); complete.submit(`/production/jobs/${job.job_id}/complete`, "POST", () => ({ idempotency_key: crypto.randomUUID(), expected_version: job.version }), ""); }}>
      <p>วัตถุดิบที่จองแต่ไม่ได้ใช้จะถูกคืน และจะบันทึกการใช้หรือเวลาเพิ่มไม่ได้อีก</p>
    </ConfirmDialog>
  </>;
}

function UsageForm({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: (message: string) => void }) {
  const materials = job.materials ?? [];
  const [rows, setRows] = useState<UsageDraft[]>(() => materials.map((material) => ({ material_id: material.material_id, label: `${material.name} (${material.unit_name})`, quantity: "" })));
  const [extra, setExtra] = useState<Record<string, string>>({}); const [note, setNote] = useState(""); const [adding, setAdding] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("บันทึกการใช้วัตถุดิบแล้ว"));
  const reserved = new Map(materials.map((material) => [material.material_id, material.reserved]));
  const filled = rows.filter((row) => row.quantity.trim()).length;
  const set = (index: number, quantity: string) => setRows((current) => current.map((value, position) => position === index ? { ...value, quantity } : value));
  // A div, not a form: the extra-material MaterialPicker carries its own search form.
  const save = () => write.submit(`/production/jobs/${job.job_id}/usage`, "POST", () => {
    try { return usagePayload({ idempotency_key: crypto.randomUUID(), expected_version: job.version }, note, rows); }
    catch { throw new Error("กรอกจำนวนที่ใช้อย่างน้อย 1 รายการ เป็นตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง และหมายเหตุไม่เกิน 2,000 ตัวอักษร"); }
  }, "");
  return <div className={layout.form}>
    <p className={layout.muted}>กรอกเฉพาะที่ใช้ตั้งแต่บันทึกครั้งล่าสุด ระบบใช้ของที่จองไว้ให้งานนี้ก่อน แล้วจึงใช้สต๊อกว่าง</p>
    <fieldset disabled={write.frozen}>
      <legend className={layout.visuallyHidden}>จำนวนที่ใช้ครั้งนี้</legend>
      {rows.map((row, index) => {
        const held = reserved.get(row.material_id); const invalid = Boolean(row.quantity.trim()) && !isPositiveQuantity(row.quantity);
        return <div className={styles.usageRow} key={row.material_id}>
          <Field label={`ใช้ครั้งนี้ · ${row.label}`} hint={held !== undefined ? `จองไว้เหลือ ${quantityTH(held)}` : extra[row.material_id]} error={invalid ? "ตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง" : undefined}><input inputMode="decimal" autoComplete="off" value={row.quantity} aria-invalid={invalid || undefined} onChange={(event) => set(index, event.target.value)} /></Field>
          {held !== undefined && /[1-9]/.test(held) && <Button className={styles.fill} onClick={() => set(index, editableQuantity(held))}>ใช้ตามที่จองไว้ {quantityTH(held)}</Button>}
        </div>;
      })}
      {!rows.length && <p className={layout.muted}>งานนี้ไม่มีวัตถุดิบในแผน เพิ่มวัตถุดิบนอกแผนได้ด้านล่าง</p>}
      <Field label="หมายเหตุ (ไม่บังคับ)"><textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    </fieldset>
    {adding ? <MaterialPicker api={api} label="เพิ่มวัตถุดิบนอกแผน" disabled={write.frozen} isAdded={(materialId) => rows.some((row) => row.material_id === materialId)} onAdd={(material) => { setExtra((current) => ({ ...current, [material.id]: `นอกแผน · พร้อมใช้ ${quantityTH(material.qty_available)}` })); setRows((current) => [...current, { material_id: material.id, label: `${material.name} (${material.unit_name})`, quantity: "" }]); }} />
      : <Button variant="text" disabled={write.frozen} onClick={() => setAdding(true)}>+ เพิ่มวัตถุดิบนอกแผน</Button>}
    <div className={layout.submitBar}><span>{filled ? `จะบันทึก ${filled} รายการ` : "ยังไม่ได้กรอกจำนวน"}</span><button type="button" className={layout.submit} disabled={write.frozen || !filled} onClick={save}>บันทึกการใช้วัตถุดิบ</button></div>
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
  </div>;
}

function TimeForm({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: (message: string) => void }) {
  const [minutes, setMinutes] = useState(""); const [note, setNote] = useState("");
  const write = useRetryableWrite(api, () => onSaved(`เพิ่มเวลาทำงาน ${minutesTH(Number(minutes))} แล้ว`));
  const valid = /^\d{1,7}$/.test(minutes.trim()) && Number(minutes) >= 1 && Number(minutes) <= 1000000;
  const add = (value: number) => setMinutes(String((/^\d{1,7}$/.test(minutes.trim()) ? Number(minutes) : 0) + value));
  return <form className={layout.form} onSubmit={(event) => { event.preventDefault(); write.submit(`/production/jobs/${job.job_id}/time`, "POST", () => {
    try { return timePayload({ idempotency_key: crypto.randomUUID(), expected_version: job.version }, minutes, note); }
    catch { throw new Error("กรอกนาทีเป็นจำนวนเต็ม 1–1,000,000 และหมายเหตุไม่เกิน 2,000 ตัวอักษร"); }
  }, ""); }}>
    <p className={layout.muted}>เวลาที่บันทึกจะบวกเข้ายอดรวมของงาน ปัจจุบันรวม {minutesTH(job.labor_minutes)}</p>
    <fieldset disabled={write.frozen}>
      <legend className={layout.visuallyHidden}>เวลาทำงาน</legend>
      <Field label="นาทีที่ทำงาน *" hint={valid ? `= ${minutesTH(Number(minutes))}` : "จำนวนเต็ม 1–1,000,000 นาที"} error={minutes.trim() && !valid ? "กรอกนาทีเป็นจำนวนเต็ม 1–1,000,000" : undefined}><input inputMode="numeric" autoComplete="off" value={minutes} aria-invalid={Boolean(minutes.trim()) && !valid || undefined} onChange={(event) => setMinutes(event.target.value)} /></Field>
      <div className={styles.chips}>{[15, 30, 60].map((value) => <Button key={value} onClick={() => add(value)}>+{value} นาที</Button>)}</div>
      <Field label="หมายเหตุ (ไม่บังคับ)"><input maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></Field>
    </fieldset>
    <div className={layout.submitBar}><span>{valid ? `จะเพิ่ม ${minutesTH(Number(minutes))}` : "ยังไม่ได้กรอกเวลา"}</span><button type="submit" className={layout.submit} disabled={write.frozen || !valid}>บันทึกเวลาทำงาน</button></div>
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
  </form>;
}

// Each attempt is a fresh private upload; a failure offers "อัปโหลดอีกครั้ง".
function PhotoForm({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: (message: string) => void }) {
  const command = useCommand(); const [file, setFile] = useState<File | null>(null); const [failed, setFailed] = useState(false);
  return <div className={layout.form}>
    <p className={layout.muted}>รูปงานเป็นไฟล์ส่วนตัว JPEG หรือ PNG ไม่เกิน 100 MB (ไม่บังคับ)</p>
    <Field label="เลือกรูปงาน"><input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" disabled={command.busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setFailed(false); }} /></Field>
    <div className={layout.submitBar}><span>{file ? file.name : "ยังไม่ได้เลือกรูป"}</span><button type="button" className={layout.submit} disabled={command.busy || !file} onClick={() => { if (!file) return; void command.run(async (signal) => {
      try { await api.privateUpload(`/production/jobs/${job.job_id}/photos/uploads`, (photoId) => `/job-photos/${photoId}/complete`, file, signal, (type) => type.startsWith("image/")); setFailed(false); setFile(null); onSaved("แนบรูปงานแล้ว"); }
      catch (error) { if (!signal.aborted) setFailed(true); throw error; }
    }, ""); }}>{command.busy ? "กำลังอัปโหลด…" : failed ? "อัปโหลดอีกครั้ง" : "อัปโหลดรูป"}</button></div>
    {failed && <p className={layout.muted}>อัปโหลดอีกครั้งจะเริ่มอัปโหลดใหม่ ไม่ใช้รายการที่ล้มเหลว</p>}
    <ErrorText error={command.error} />
  </div>;
}
