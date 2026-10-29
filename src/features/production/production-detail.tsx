"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, JobRequest } from "../../lib/api/backend-api";
import { useCommand, useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { bahtTH, dateTH, dateTimeTH, minutesTH, quantityTH, requestedDayCountdown } from "../../components/staff-ui/staff-format";
import { JOB_STATUS } from "../../components/staff-ui/staff-labels";
import { Button, Collapsible, ConfirmDialog, ErrorText, Field, LoadError, NextAction, RetryPanel, Skeleton, StatusBadge, Steps, ToneBadge } from "../../components/staff-ui/staff-ui";
import { planLines, type InventoryPlan, type PlanDraftLine } from "../inventory/inventory-domain";
import { MaterialPicker } from "../inventory/material-picker";
import { laborPayload, type ProductionState } from "./production-domain";
import { editableQuantity, isPositiveQuantity, planReadiness } from "./production-list-domain";
import { WorkPanel } from "./production-work";
import styles from "./production.module.css";

const STEPS = ["เตรียมวัตถุดิบ", "เริ่มผลิต", "บันทึกงาน", "ปิดงาน"];
const EVENT_LABELS: Record<string, string> = { start: "เริ่มผลิต", use: "บันทึกการใช้วัตถุดิบ", time: "บันทึกเวลาทำงาน", photo: "แนบรูปงาน", complete: "ปิดงาน", labor: "บันทึกค่าแรงจริง" };

export function ProductionDetail({ api, account, id, request, requestLoading, now, backHref, onChanged }: { api: BackendApi; account: Account; id: string; request?: JobRequest; requestLoading: boolean; now: number | null; backHref: string; onChanged: (message: string) => void }) {
  const resource = useResource<ProductionState>(api, `/production/jobs/${id}`);
  // Forms render only from settled data so a landing reload cannot clear input.
  const job = resource.data; const settled = !resource.loading; const worker = account.role === "worker";
  const cycle = Number(job?.cycle ?? 1);
  const countdown = job && (job.status === "queued" || job.status === "in_progress") ? requestedDayCountdown(request?.deadline, now) : null;
  function saved(message: string) { resource.reload(); onChanged(message); }
  const deliveryHref = `${worker ? "/staff" : "/admin"}/delivery-payment`;
  return <article className={styles.detailCard} aria-labelledby={`production-${id}`}>
    <Link className={styles.back} href={backHref} scroll={false}><Icon name="arrow" size={16} /> กลับรายการ</Link>
    {resource.loading && !job && <Skeleton label="กำลังโหลดรายละเอียดงาน…" rows={3} />}
    {resource.error && <LoadError title="โหลดรายละเอียดงานไม่สำเร็จ" onRetry={resource.reload} />}
    {job && <>
      <header className={styles.detailHeader}>
        <div><h2 id={`production-${id}`}>{request ? `คำขอ #${request.no_request} · ${request.description}` : requestLoading ? "กำลังโหลดคำขอ…" : "งานผลิต"}</h2>
          <p className={styles.meta}>{request && <span>{request.qty} ชิ้น</span>}{request?.deadline ? <span>ลูกค้าต้องการ {dateTH(request.deadline)} <small>(ไม่ใช่กำหนดส่งที่ร้านยืนยัน)</small></span> : request ? <span>ลูกค้าไม่ได้ระบุวันที่ต้องการ</span> : null}{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</p></div>
        <StatusBadge map={JOB_STATUS} value={job.status} />
      </header>
      <dl className={styles.facts}>
        <div><dt>รอบผลิต</dt><dd>{cycle > 1 ? `รอบแก้ไขที่ ${cycle - 1} · แก้ไขฟรี` : "รอบแรก"}</dd></div>
        <div><dt>เริ่มผลิต</dt><dd>{job.started_at ? dateTimeTH(job.started_at) : "ยังไม่เริ่ม"}</dd></div>
        <div><dt>ผลิตเสร็จ</dt><dd>{job.completed_at ? dateTimeTH(job.completed_at) : "ยังไม่เสร็จ"}</dd></div>
        <div><dt>เวลาทำงานรวม</dt><dd>{minutesTH(job.labor_minutes)}</dd></div>
      </dl>
      {job.status === "queued" && <PlanStep api={api} job={job} canWrite={worker && settled} onSaved={saved} />}
      {job.status === "in_progress" && <><Steps steps={STEPS} current={2} />{worker ? settled && <WorkPanel api={api} job={job} onSaved={saved} /> : <p className={styles.muted}>พนักงานกำลังบันทึกงานนี้ Admin ดูความคืบหน้าและต้นทุนได้ด้านล่าง</p>}</>}
      {job.status === "completed" && <><Steps steps={STEPS} current={STEPS.length} /><NextAction title="ผลิตเสร็จแล้ว"><p>วัตถุดิบที่จองแต่ไม่ได้ใช้ถูกคืนแล้ว ขั้นต่อไปคือออกใบแจ้งหนี้และส่งมอบ</p><Link className={styles.linkButton} href={deliveryHref}>{worker ? "ไปที่ส่งมอบและใบแจ้งหนี้" : "ไปที่ส่งมอบและรับชำระ"} <Icon name="arrow" size={16} /></Link></NextAction></>}
      {job.status === "cancelled" && <p className={styles.warning}>งานนี้ถูกยกเลิก ไม่สามารถบันทึกงานเพิ่มได้</p>}
      <MaterialsSummary job={job} />
      {account.role === "admin" && settled && <AdminCost api={api} job={job} onSaved={saved} />}
      <Collapsible title="ประวัติงานนี้"><History api={api} job={job} admin={account.role === "admin"} /></Collapsible>
      <Collapsible title="ประวัติระบบ"><SystemHistory job={job} /></Collapsible>
    </>}
  </article>;
}

function PlanStep({ api, job, canWrite, onSaved }: { api: BackendApi; job: ProductionState; canWrite: boolean; onSaved: (message: string) => void }) {
  const plan = useResource<InventoryPlan>(api, `/jobs/${job.job_id}/materials`);
  const [editing, setEditing] = useState(false); const [confirming, setConfirming] = useState(false);
  const reserve = useRetryableWrite(api, () => { plan.reload(); onSaved("ตรวจและจองวัตถุดิบตามแผนแล้ว"); });
  const start = useRetryableWrite(api, () => onSaved("เริ่มผลิตแล้ว · สต๊อกจะถูกตัดเมื่อบันทึกการใช้จริง"));
  const names = new Map((job.materials ?? []).map((material) => [material.material_id, { name: material.name, unit: material.unit_name }]));
  const readiness = plan.data ? planReadiness(plan.data, job) : null;
  const ready = readiness?.state === "ready";
  return <>
    <Steps steps={STEPS} current={ready ? 1 : 0} />
    <NextAction title={ready ? "วัตถุดิบพร้อม เริ่มผลิตได้" : "เตรียมวัตถุดิบให้ครบก่อนเริ่มงาน"}>
      {plan.loading && !plan.data && <p role="status" className={styles.muted}>กำลังโหลดแผนวัตถุดิบ…</p>}
      {plan.error && <LoadError title="โหลดแผนวัตถุดิบไม่สำเร็จ" onRetry={plan.reload} />}
      {plan.data && !editing && <>
        {plan.data.lines?.length ? <ul className={styles.planLines}>{plan.data.lines.map((line) => {
          const known = names.get(line.material_id); const short = /[1-9]/.test(line.shortage);
          return <li key={line.material_id} data-short={short || undefined}><strong>{known ? `${known.name} (${known.unit})` : "วัตถุดิบในแผน"}</strong>
            <span>ต้องใช้ {quantityTH(line.required)}</span><span>จองแล้ว {quantityTH(line.reserved)}</span>{short && <span className={styles.short}>ขาด {quantityTH(line.shortage)}</span>}</li>;
        })}</ul> : <p className={styles.muted}>ยังไม่มีแผนวัตถุดิบ กด “แก้ไขแผนวัตถุดิบ” เพื่อเพิ่มรายการ</p>}
        {readiness?.state === "short" && <p className={styles.muted}>บางรายการยังจองไม่ครบ กด “จองเพิ่มตามแผนเดิม” เมื่อมีของเข้า หรือแจ้ง Admin สั่งซื้อวัตถุดิบ</p>}
        {readiness?.state === "changed" && <p className={styles.muted}>แผนมีการเปลี่ยนแปลง กด “อัปเดตข้อมูล” ก่อนเริ่มงาน</p>}
        {canWrite ? <div className={styles.actions}>
          <Button variant="primary" disabled={!ready || start.frozen} onClick={() => setConfirming(true)}>เริ่มผลิต</Button>
          <Button disabled={reserve.frozen || start.frozen} onClick={() => setEditing(true)}>แก้ไขแผนวัตถุดิบ</Button>
          {Boolean(plan.data.lines?.length) && <Button disabled={reserve.frozen || start.frozen} onClick={() => reserve.submit(`/jobs/${job.job_id}/materials/reserve`, "POST", () => ({ idempotency_key: crypto.randomUUID(), expected_version: plan.data!.version }), "")}>จองเพิ่มตามแผนเดิม</Button>}
        </div> : <p className={styles.muted}>Admin ดูแผนได้อย่างเดียว พนักงานเป็นผู้บันทึกแผนและเริ่มงาน</p>}
        {reserve.uncertain ? <RetryPanel busy={reserve.busy} onRetry={reserve.retry} onDiscard={() => { reserve.discard(); plan.reload(); }} /> : <ErrorText error={reserve.error} />}
        {start.uncertain ? <RetryPanel busy={start.busy} onRetry={start.retry} onDiscard={() => { start.discard(); plan.reload(); onSaved(""); }} /> : <ErrorText error={start.error} />}
      </>}
      {plan.data && editing && <PlanEditor key={String(plan.data.version)} api={api} job={job} plan={plan.data} names={names} onSaved={() => { setEditing(false); plan.reload(); onSaved("บันทึกแผนและจองวัตถุดิบแล้ว"); }} onCancel={() => setEditing(false)} />}
    </NextAction>
    <ConfirmDialog open={confirming} title="เริ่มผลิตงานนี้?" confirmLabel="เริ่มผลิต" onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); start.submit(`/production/jobs/${job.job_id}/start`, "POST", () => ({ idempotency_key: crypto.randomUUID(), expected_version: job.version, expected_plan_version: BigInt(job.material_plan_version) }), ""); }}>
      <p>แผนวัตถุดิบจะถูกล็อก และสต๊อกจะถูกตัดเมื่อบันทึกการใช้จริงเท่านั้น</p>
    </ConfirmDialog>
  </>;
}

function PlanEditor({ api, job, plan, names, onSaved, onCancel }: { api: BackendApi; job: ProductionState; plan: InventoryPlan; names: Map<string, { name: string; unit: string }>; onSaved: () => void; onCancel: () => void }) {
  const [lines, setLines] = useState<PlanDraftLine[]>(() => plan.lines?.map((line) => ({ material_id: line.material_id, quantity: editableQuantity(line.required) })) ?? []);
  const [added, setAdded] = useState<Record<string, { name: string; unit: string }>>({});
  const [problem, setProblem] = useState(""); const [confirmEmpty, setConfirmEmpty] = useState(false);
  const write = useRetryableWrite(api, onSaved);
  const label = (id: string) => { const known = added[id] ?? names.get(id); return known ? `${known.name} (${known.unit})` : "วัตถุดิบในแผน"; };
  function send() {
    write.submit(`/jobs/${job.job_id}/materials`, "PUT", () => {
      let validated: PlanDraftLine[];
      try { validated = planLines(lines); } catch { throw new Error("กรอกจำนวนที่ต้องใช้ทุกรายการ เป็นตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง"); }
      return { idempotency_key: crypto.randomUUID(), expected_version: plan.version, lines: validated };
    }, "");
  }
  return <div className={styles.editor}>
    <p className={styles.muted}>บันทึกจะแทนที่แผนเดิมทั้งหมด และจองวัตถุดิบที่มีให้ทันที รายการที่ลดหรือลบจะคืนส่วนที่จองเกิน</p>
    <fieldset disabled={write.frozen}>
      <legend className={styles.visuallyHidden}>รายการวัตถุดิบในแผน</legend>
      {lines.map((line, index) => <div className={styles.editorLine} key={line.material_id}>
        <Field label={`ต้องใช้ · ${label(line.material_id)}`} error={line.quantity && !isPositiveQuantity(line.quantity) ? "ตัวเลขมากกว่า 0 ทศนิยมไม่เกิน 6 ตำแหน่ง" : undefined}><input inputMode="decimal" autoComplete="off" value={line.quantity} aria-invalid={line.quantity && !isPositiveQuantity(line.quantity) ? true : undefined} onChange={(event) => setLines((current) => current.map((value, position) => position === index ? { ...value, quantity: event.target.value } : value))} /></Field>
        <Button variant="text" onClick={() => setLines((current) => current.filter((_, position) => position !== index))} aria-label={`ลบ ${label(line.material_id)}`}>ลบ</Button>
      </div>)}
      {!lines.length && <p className={styles.muted}>ยังไม่มีรายการ ถ้าบันทึกแผนว่าง วัตถุดิบที่จองไว้ให้งานนี้จะถูกคืนทั้งหมด</p>}
    </fieldset>
    <MaterialPicker api={api} label="เพิ่มวัตถุดิบในแผน" disabled={write.frozen || lines.length >= 500} isAdded={(materialId) => lines.some((line) => line.material_id === materialId)} onAdd={(material) => { setAdded((current) => ({ ...current, [material.id]: { name: material.name, unit: material.unit_name } })); setLines((current) => [...current, { material_id: material.id, quantity: "" }]); }} />
    {problem && <p className={styles.problem} role="alert">{problem}</p>}
    <div className={styles.actions}>
      <Button variant="primary" disabled={write.frozen} onClick={() => { setProblem(""); if (lines.some((line) => !isPositiveQuantity(line.quantity))) { setProblem("กรอกจำนวนที่ต้องใช้ให้ครบทุกรายการก่อนบันทึก"); return; } if (!lines.length) setConfirmEmpty(true); else send(); }}>บันทึกแผนและจองวัตถุดิบ</Button>
      <Button disabled={write.busy} onClick={onCancel}>ยกเลิก</Button>
    </div>
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onCancel(); }} /> : <ErrorText error={write.error} />}
    <ConfirmDialog open={confirmEmpty} title="บันทึกแผนว่าง?" confirmLabel="บันทึกแผนว่าง" danger onClose={() => setConfirmEmpty(false)} onConfirm={() => { setConfirmEmpty(false); send(); }}>
      <p>วัตถุดิบที่จองไว้ให้งานนี้จะถูกคืนทั้งหมด สต๊อกจริงไม่ถูกตัดหรือลบ</p>
    </ConfirmDialog>
  </div>;
}

function MaterialsSummary({ job }: { job: ProductionState }) {
  return <section className={styles.section} aria-labelledby={`materials-${job.job_id}`}>
    <h3 id={`materials-${job.job_id}`}>วัตถุดิบของงานนี้</h3>
    {!job.materials?.length ? <p className={styles.muted}>ยังไม่มีวัตถุดิบในแผนหรือที่ใช้จริง</p> : <ul className={styles.materials}>{job.materials.map((material) => <li key={material.material_id}>
      <strong>{material.name} <small>({material.unit_name})</small></strong>
      <dl><div><dt>ตามแผน</dt><dd>{quantityTH(material.required)}</dd></div><div><dt>จองไว้ตอนนี้</dt><dd>{quantityTH(material.reserved)}</dd></div><div><dt>ใช้แล้ว</dt><dd>{quantityTH(material.used)}<small>จากที่จอง {quantityTH(material.reservation_consumed)}</small></dd></div><div><dt>คืนแล้ว</dt><dd>{quantityTH(material.released)}</dd></div></dl>
    </li>)}</ul>}
  </section>;
}

function AdminCost({ api, job, onSaved }: { api: BackendApi; job: ProductionState; onSaved: (message: string) => void }) {
  const write = useRetryableWrite(api, () => onSaved("บันทึกค่าแรงจริงแล้ว")); const finance = job.finance; const [amount, setAmount] = useState(finance?.labor_cost ?? "");
  const open = job.status === "in_progress" || job.status === "completed";
  return <section className={styles.section} aria-labelledby={`cost-${job.job_id}`}>
    <h3 id={`cost-${job.job_id}`}>ต้นทุนจริง (เฉพาะ Admin)</h3>
    {finance && <dl className={styles.facts}><div><dt>ค่าวัตถุดิบ (มูลค่าตอนเบิก)</dt><dd>{bahtTH(finance.material_cost)}</dd></div><div><dt>ค่าแรง</dt><dd>{finance.labor_cost === null ? "ยังไม่บันทึก" : bahtTH(finance.labor_cost)}</dd></div><div><dt>ต้นทุนรวม</dt><dd>{finance.total_cost === null ? "รู้หลังบันทึกค่าแรง" : bahtTH(finance.total_cost)}</dd></div></dl>}
    {open ? <form className={styles.form} onSubmit={(event) => { event.preventDefault(); write.submit(`/production/jobs/${job.job_id}/labor-cost`, "PUT", () => {
      try { return laborPayload({ idempotency_key: crypto.randomUUID(), expected_version: job.version }, amount); }
      catch { throw new Error("กรอกค่าแรงเป็นจำนวนเงินบาท ทศนิยมไม่เกิน 2 ตำแหน่ง (ใส่ 0.00 ได้)"); }
    }, ""); }}>
      <fieldset disabled={write.frozen}><legend className={styles.visuallyHidden}>ค่าแรงจริง</legend>
        <Field label={`ค่าแรงจริงสำหรับเวลาที่บันทึก ${minutesTH(job.labor_minutes)} (บาท)`} hint="กรอกยอดรวมจริง ใส่ 0.00 ได้ ระบบไม่คิดค่าแรงต่อชั่วโมงให้ และเก็บค่าเดิมไว้ในประวัติเมื่อแก้ไข"><input inputMode="decimal" autoComplete="off" required value={amount} onChange={(event) => setAmount(event.target.value)} /></Field>
      </fieldset>
      <div className={styles.actions}><button type="submit" className={styles.submit} disabled={write.frozen}>{(finance?.labor_cost ?? null) === null ? "บันทึกค่าแรง" : "แก้ไขค่าแรง"}</button></div>
      {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    </form> : <p className={styles.muted}>บันทึกค่าแรงได้เมื่อเริ่มผลิตแล้ว</p>}
  </section>;
}

function History({ api, job, admin }: { api: BackendApi; job: ProductionState; admin: boolean }) {
  const download = useCommand();
  return <>
    <section className={styles.historyBlock}><h4>การใช้วัตถุดิบ</h4>{!job.usage?.length ? <p className={styles.muted}>ยังไม่มีการบันทึกการใช้วัตถุดิบ</p> : <ul className={styles.timeline}>{job.usage.map((entry) => <li key={entry.id}>
      <strong>{entry.material_name} · {quantityTH(entry.quantity)} {entry.unit_name}</strong>
      <span>{dateTimeTH(entry.created_at)} · ใช้จากที่จอง {quantityTH(entry.reservation_used)}{admin && entry.total_amount ? ` · ต้นทุน ${bahtTH(entry.total_amount)} (หน่วยละ ${quantityTH(entry.unit_cost)})` : ""}</span>
    </li>)}</ul>}</section>
    <section className={styles.historyBlock}><h4>เวลาทำงาน</h4>{!job.time_entries?.length ? <p className={styles.muted}>ยังไม่มีการบันทึกเวลา</p> : <ul className={styles.timeline}>{job.time_entries.map((entry) => <li key={entry.id}><strong>{minutesTH(entry.minutes)}</strong><span>{dateTimeTH(entry.created_at)}{entry.note ? ` · ${entry.note}` : ""}</span></li>)}</ul>}</section>
    <section className={styles.historyBlock}><h4>รูปงาน</h4>{!job.photos?.length ? <p className={styles.muted}>ยังไม่มีรูปงาน</p> : <ul className={styles.timeline}>{job.photos.map((photo) => <li key={photo.id} className={styles.photoRow}><span>{photo.file_name}</span><Button variant="text" disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/job-photos/${photo.id}/download`, photo.file_name, signal), "")}>เปิดรูป</Button></li>)}</ul>}<ErrorText error={download.error} /></section>
  </>;
}

function SystemHistory({ job }: { job: ProductionState }) {
  return <>
    <p className={styles.code}>งาน {job.job_id} · เวอร์ชันงาน {String(job.version)} · เวอร์ชันแผน {String(job.material_plan_version)}</p>
    {!job.events?.length ? <p className={styles.muted}>ยังไม่มีเหตุการณ์</p> : <ol className={styles.timeline}>{job.events.map((event) => <li key={event.id}><strong>{EVENT_LABELS[event.action] ?? "เหตุการณ์ของระบบ"}</strong><span>{dateTimeTH(event.created_at)} · เวอร์ชัน {String(event.version)}</span></li>)}</ol>}
  </>;
}
