"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand, useRetryableWrite } from "../../hooks/backend-hooks";
import { bahtTH, dateTimeTH } from "../../components/staff-ui/staff-format";
import { EVIDENCE_STATUS } from "../../components/staff-ui/staff-labels";
import { Button, ConfirmDialog, ErrorText, Field, RetryPanel, StatusBadge } from "../../components/staff-ui/staff-ui";
import { reviewPayload, type FulfillmentJob, type Payment } from "./delivery-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./delivery.module.css";

// Admin payment cards (Workers never receive payment rows). A pending bank proof
// does not reduce the balance until approved; rejection needs a reason the customer sees.
export function PaymentCards({ api, state, canReview, onSaved }: { api: BackendApi; state: FulfillmentJob; canReview: boolean; onSaved: (message: string) => void }) {
  const payments = state.payments ?? [];
  if (!payments.length) return <p className={layout.muted}>ยังไม่มีการชำระ</p>;
  return <ul className={styles.payments}>{payments.map((payment) => <PaymentCard key={`${payment.id}:${payment.status}`} api={api} state={state} payment={payment} canReview={canReview && payment.status === "pending"} onSaved={onSaved} />)}</ul>;
}

function PaymentCard({ api, state, payment, canReview, onSaved }: { api: BackendApi; state: FulfillmentJob; payment: Payment; canReview: boolean; onSaved: (message: string) => void }) {
  const download = useCommand();
  const [outcome, setOutcome] = useState<"approved" | "rejected" | null>(null); const [reason, setReason] = useState(""); const [reasonError, setReasonError] = useState(""); const [dialog, setDialog] = useState(false);
  const write = useRetryableWrite(api, () => onSaved(outcome === "approved" ? "อนุมัติการชำระแล้ว ยอดคงเหลือลดลงแล้ว" : "บันทึกว่าหลักฐานไม่ผ่านแล้ว"));
  return <li>
    <span className={styles.paymentTop}><strong>{payment.method === "bank" ? "โอนผ่านธนาคาร" : "เงินสด"} · {bahtTH(payment.amount)}</strong><StatusBadge map={EVIDENCE_STATUS} value={payment.status} /></span>
    <small>ชำระเมื่อ {dateTimeTH(payment.paid_at)}{payment.status === "pending" ? " · ยังไม่ลดยอดคงเหลือจนกว่าจะอนุมัติ" : ""}</small>
    {payment.reason && <small>เหตุผลที่ไม่ผ่าน: {payment.reason}</small>}
    <div className={layout.actions}>
      {payment.evidence_id && <Button disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/customer-evidence/${payment.evidence_id}/download`, undefined, signal), "")}>เปิดหลักฐาน</Button>}
      {canReview && <>
        <button type="button" className={layout.submit} disabled={write.frozen} onClick={() => { setOutcome("approved"); setReasonError(""); setDialog(true); }}>อนุมัติ</button>
        <Button variant="danger" disabled={write.frozen} onClick={() => { setOutcome("rejected"); setReason(""); setReasonError(""); setDialog(true); }}>ไม่อนุมัติ</Button>
      </>}
    </div>
    <ErrorText error={download.error} />
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    {outcome && <ConfirmDialog open={dialog} title={outcome === "approved" ? "อนุมัติการชำระนี้?" : "หลักฐานนี้ไม่ผ่าน?"} confirmLabel={outcome === "approved" ? "ยืนยันอนุมัติ" : "ยืนยันไม่อนุมัติ"} danger={outcome === "rejected"} checks={["ตรวจหลักฐานกับรายการเดินบัญชีแล้ว"]} onClose={() => setDialog(false)} onConfirm={() => {
      if (outcome === "rejected" && !reason.trim()) { setReasonError("กรอกเหตุผล ลูกค้าจะเห็นข้อความนี้"); return; }
      setDialog(false);
      write.submit(`/fulfillment/jobs/${state.job_id}/payments/review`, "POST", () => reviewPayload({ idempotency_key: crypto.randomUUID(), expected_version: state.version }, payment.id, outcome, reason), "");
    }}>
      <p>{payment.method === "bank" ? "โอนผ่านธนาคาร" : "เงินสด"} {bahtTH(payment.amount)} · ชำระเมื่อ {dateTimeTH(payment.paid_at)}</p>
      {outcome === "approved" ? <p>อนุมัติแล้วยอดคงเหลือลดลงทันที</p> : <Field label="เหตุผลที่ไม่ผ่าน (ลูกค้าจะเห็น)" error={reasonError || undefined}><textarea value={reason} maxLength={2000} aria-invalid={Boolean(reasonError) || undefined} onChange={(event) => setReason(event.target.value)} /></Field>}
    </ConfirmDialog>}
  </li>;
}
