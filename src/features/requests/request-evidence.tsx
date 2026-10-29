"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, Evidence, Fulfillment, Quotation } from "../../lib/api/backend-api";
import { useCommand, useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { bahtTH, dateTH, dateTimeTH, dueDayCountdown } from "../../components/staff-ui/staff-format";
import { EVIDENCE_STATUS } from "../../components/staff-ui/staff-labels";
import { Button, Collapsible, ErrorText, Field, LoadError, NextAction, RetryPanel, Skeleton, StatusBadge, Steps, ToneBadge } from "../../components/staff-ui/staff-ui";
import layout from "../../components/staff-ui/staff-layout.module.css";
import { reviewReason } from "../fulfillment/fulfillment-domain";
import { QuoteSummary } from "./request-quote";
import { REQUEST_STEPS, evidenceChecklist, pendingEvidence, type EvidenceNeed } from "./request-stage-domain";
import styles from "./requests.module.css";

const KIND = { deposit: "สลิปมัดจำ", po: "ใบสั่งซื้อ (PO)" } as const;
const NEED: Record<EvidenceNeed["state"], string> = { missing: "ยังไม่ส่ง", rejected: "ไม่อนุมัติ · ลูกค้าส่งใหม่ได้ก่อนครบกำหนด", pending: "ส่งแล้ว รอตรวจ", approved: "อนุมัติแล้ว" };
const CUSTOMER_TYPE: Record<string, string> = { individual: "บุคคล", company: "บริษัท" };

// Approved quotation: Deposit/PO terms, evidence review (Staff and Admin) and the opened job.
export function AcceptedStage({ api, account, quote, now, root, onSaved }: { api: BackendApi; account: Account; quote: Quotation; now: number | null; root: string; onSaved: (message: string) => void }) {
  const resource = useResource<Fulfillment>(api, `/quotations/${quote.id}/fulfillment`);
  const state = resource.data;
  function saved(message: string) { resource.reload(); onSaved(message); }
  if (resource.loading && !state) return <Skeleton label="กำลังโหลดมัดจำ/PO…" rows={2} />;
  if (!state) return <LoadError title="โหลดข้อมูลมัดจำ/PO ไม่สำเร็จ" onRetry={resource.reload} />;
  const terms = state.terms; const pending = pendingEvidence(state);
  const due = dueDayCountdown(terms.documents_due_at, now);
  const late = !state.job && !state.canceled_at && now !== null && now > Date.parse(terms.documents_due_at);
  const canReview = !state.job && !state.canceled_at && state.request_status !== "canceled";
  const reviewed = (state.evidence ?? []).filter((item) => item.status !== "pending");
  return <>
    <Steps steps={REQUEST_STEPS} current={state.job ? REQUEST_STEPS.length : pending.length ? 3 : 2} />
    {state.job ? <NextAction title="เปิดงานผลิตแล้ว">
      <dl className={layout.facts}><div><dt>มัดจำที่อนุมัติ</dt><dd>{bahtTH(state.job.deposit_amount)}</dd></div><div><dt>ยอดคงเหลือของงาน</dt><dd>{bahtTH(state.job.balance)}</dd></div><div><dt>เปิดงานเมื่อ</dt><dd>{dateTimeTH(state.job.created_at)}</dd></div></dl>
      <Link className={layout.linkButton} href={`${root}/production?job=${state.job.id}`}>ไปงานผลิต <Icon name="arrow" size={16} /></Link>
    </NextAction> : <NextAction title={pending.length ? "ตรวจหลักฐานมัดจำ/PO" : "รอลูกค้าส่งหลักฐานมัดจำ/PO"}>
      <dl className={layout.facts}>
        <div><dt>ราคาที่ลูกค้าตอบรับ</dt><dd>{bahtTH(terms.final_price)}</dd></div>
        <div><dt>ประเภทลูกค้า</dt><dd>{CUSTOMER_TYPE[terms.customer_type] ?? "—"}</dd></div>
        <div><dt>มัดจำขั้นต่ำ</dt><dd>{terms.deposit_required ? bahtTH(terms.deposit_amount) : "ไม่ต้องมี"}</dd></div>
        <div><dt>ใบสั่งซื้อ (PO)</dt><dd>{terms.po_required ? "ต้องมี" : "ไม่ต้องมี"}</dd></div>
      </dl>
      <p className={layout.meta}>ส่งหลักฐานภายใน {dateTimeTH(terms.documents_due_at)}{due && <ToneBadge tone={due.tone}>{due.text}</ToneBadge>}</p>
      <ul className={styles.checklist} aria-label="หลักฐานที่ต้องมี">{evidenceChecklist(state).map((need) => <li key={need.kind} data-state={need.state}><span aria-hidden="true">{need.state === "approved" ? "✓" : need.state === "pending" ? "•" : "○"}</span><strong>{KIND[need.kind]}</strong><small>{NEED[need.state]}</small></li>)}</ul>
      {state.canceled_at && <p className={layout.warning}>ระบบยกเลิกคำขอเมื่อ {dateTimeTH(state.canceled_at)} เพราะหลักฐานไม่ครบตามกำหนด</p>}
      {late && <p className={layout.warning}>เลยกำหนดส่งหลักฐานแล้ว · หลักฐานที่ส่งทันเวลายังตรวจได้ ระบบจะยกเลิกคำขอเองถ้าเอกสารไม่ครบ</p>}
      {pending.map((item) => <EvidenceCard key={`${item.id}:${String(item.version)}`} api={api} item={item}>
        {canReview && <ReviewForm api={api} item={item} opensJob={evidenceChecklist(state).every((need) => need.kind === item.kind || need.state === "approved")} onSaved={saved} />}
      </EvidenceCard>)}
      {!pending.length && <p className={layout.muted}>ลูกค้ายังไม่ได้ส่งหลักฐานที่ต้องตรวจ เมื่อส่งแล้วคำขอจะย้ายไปที่ “รอตรวจหลักฐาน”</p>}
      <p className={layout.muted}>{account.role === "admin" ? "Admin และพนักงานตรวจหลักฐานได้" : "พนักงานและ Admin ตรวจหลักฐานได้"} · ตรวจจากไฟล์เท่านั้น ระบบไม่ได้เชื่อมกับธนาคาร</p>
    </NextAction>}
    <Collapsible title="ใบเสนอราคาที่ลูกค้าตอบรับ"><QuoteSummary quote={quote} /></Collapsible>
    {reviewed.length > 0 && <Collapsible title={`หลักฐานที่ตรวจแล้ว (${reviewed.length})`}><div className={styles.evidenceList}>{reviewed.map((item) => <EvidenceCard key={item.id} api={api} item={item} />)}</div></Collapsible>}
  </>;
}

function EvidenceCard({ api, item, children }: { api: BackendApi; item: Evidence; children?: ReactNode }) {
  const download = useCommand();
  return <article className={styles.evidence} aria-label={KIND[item.kind]}>
    <header><strong>{KIND[item.kind]}</strong><StatusBadge map={EVIDENCE_STATUS} value={item.status} /></header>
    <p className={layout.muted}>{item.amount !== undefined ? `แจ้งยอด ${bahtTH(item.amount)} · ` : ""}{item.paid_at ? `โอนเมื่อ ${dateTimeTH(item.paid_at)} · ` : ""}ส่งเมื่อ {dateTH(item.submitted_at)}</p>
    {item.reviewed_at && <p className={layout.muted}>ตรวจเมื่อ {dateTimeTH(item.reviewed_at)}{item.reason ? ` · เหตุผล: ${item.reason}` : ""}</p>}
    <div className={layout.actions}><Button disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/attachments/${item.attachment_id}/download`, undefined, signal), "")}>เปิดไฟล์</Button></div>
    <ErrorText error={download.error && "เปิดไฟล์ไม่สำเร็จ ลองอีกครั้ง"} />
    {children}
  </article>;
}

// Exact retry keeps the original outcome, reason and version.
function ReviewForm({ api, item, opensJob, onSaved }: { api: BackendApi; item: Evidence; opensJob: boolean; onSaved: (message: string) => void }) {
  const [outcome, setOutcome] = useState<"approved" | "rejected">("approved"); const [reason, setReason] = useState(""); const [checked, setChecked] = useState(false);
  const write = useRetryableWrite(api, () => onSaved(outcome === "approved" ? (opensJob ? "ครบแล้ว · เปิดงานผลิตแล้ว" : "อนุมัติหลักฐานแล้ว") : "ไม่อนุมัติหลักฐานแล้ว · ลูกค้าจะเห็นเหตุผลและส่งใหม่ได้ก่อนครบกำหนด"));
  const name = `review-${item.id}`;
  return <form className={layout.form} onSubmit={(event) => { event.preventDefault(); write.submit(`/evidence/${item.id}/review`, "POST", () => {
    let text = "";
    try { text = reviewReason(outcome, reason); } catch { throw new Error("กรอกเหตุผลที่ไม่อนุมัติ 1–2,000 ตัวอักษร"); }
    return { outcome, expected_version: item.version, ...(outcome === "rejected" ? { reason: text } : {}) };
  }, ""); }}>
    <fieldset disabled={write.frozen}>
      <legend className={styles.legend}>ผลการตรวจ</legend>
      <div className={styles.choices}>
        <label><input type="radio" name={name} checked={outcome === "approved"} onChange={() => setOutcome("approved")} /> อนุมัติ</label>
        <label><input type="radio" name={name} checked={outcome === "rejected"} onChange={() => setOutcome("rejected")} /> ไม่อนุมัติ</label>
      </div>
      {outcome === "rejected" && <Field label="เหตุผลที่ไม่อนุมัติ (ลูกค้าจะเห็น)"><textarea rows={3} maxLength={2000} required value={reason} onChange={(event) => setReason(event.target.value)} /></Field>}
      <label className={styles.check}><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> ตรวจไฟล์แล้ว{opensJob && outcome === "approved" ? " · การอนุมัติรายการนี้จะเปิดงานผลิต" : ""}</label>
    </fieldset>
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    <div className={layout.submitBar} data-sticky=""><span>{outcome === "approved" ? "อนุมัติหลักฐานนี้" : "ส่งกลับให้ลูกค้าแก้ไข"}</span><button type="submit" className={layout.submit} disabled={write.frozen || !checked}>ยืนยันผลการตรวจ</button></div>
  </form>;
}
