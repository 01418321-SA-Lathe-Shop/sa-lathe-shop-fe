"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useCommand, useRetryableWrite } from "../../hooks/backend-hooks";
import type { ReadyFile } from "../../components/ui/backend-ui";
import { bahtTH, dateTimeTH } from "../../components/staff-ui/staff-format";
import { Button, ConfirmDialog, ErrorText, Field, RetryPanel, ToneBadge } from "../../components/staff-ui/staff-ui";
import { ProofUpload } from "../../components/staff-ui/staff-upload";
import { creditDays, settlementPayload, type ReceivingState } from "./receiving-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";

const METHOD = { bank: "โอนผ่านธนาคาร", cash: "เงินสด" } as const;

// UC7 supplier payment (Admin only): credit days are set once, counted from full
// good receipt; one full settlement records an outside payment, it moves no money.
export function FinanceSection({ api, state, onSaved }: { api: BackendApi; state: ReceivingState; onSaved: (message: string) => void }) {
  const finance = state.finance!; const settlement = finance.settlement;
  const download = useCommand();
  const status = settlement ? <ToneBadge tone="done">จ่ายแล้ว</ToneBadge> : finance.payment_status === "pending" ? <ToneBadge tone="action">รอจ่ายผู้ขาย</ToneBadge> : <ToneBadge tone="waiting">{state.full_received_at ? "รอตั้งเครดิต" : "รอรับของครบ"}</ToneBadge>;
  return <section className={layout.section} aria-label="จ่ายผู้ขาย">
    <h3>จ่ายผู้ขาย (แอดมิน)</h3>
    <dl className={layout.facts}>
      <div><dt>ยอดรวม (ไม่มี VAT)</dt><dd>{bahtTH(finance.total_amount)}</dd></div>
      <div><dt>เครดิต</dt><dd>{finance.credit_days === null ? "ยังไม่ตั้ง" : finance.credit_days === 0 ? "จ่ายทันที (0 วัน)" : `${finance.credit_days} วัน`}</dd></div>
      <div><dt>ครบกำหนดจ่าย</dt><dd>{finance.payment_due_at ? dateTimeTH(finance.payment_due_at) : "หลังรับครบและตั้งเครดิต"}</dd></div>
      <div><dt>สถานะ</dt><dd>{status}</dd></div>
    </dl>
    {finance.credit_days === null && <CreditForm api={api} state={state} onSaved={onSaved} />}
    {settlement ? <div className={layout.form}>
      <p className={layout.muted}>จ่าย {bahtTH(settlement.amount)} แบบ{METHOD[settlement.method]} เมื่อ {dateTimeTH(settlement.paid_at)}</p>
      {settlement.evidence_id && <div className={layout.actions}><Button disabled={download.busy} onClick={() => void download.run((signal) => api.download(`/order-evidence/${settlement.evidence_id}/download`, undefined, signal), "")}>ดาวน์โหลดหลักฐานการจ่าย</Button></div>}
      <ErrorText error={download.error} />
    </div> : finance.payment_status === "pending" && state.full_received_at ? <SettleForm api={api} state={state} onSaved={onSaved} />
      : <p className={layout.muted}>บันทึกการจ่ายได้หลังรับของดีครบและตั้งเครดิตแล้ว</p>}
  </section>;
}

function CreditForm({ api, state, onSaved }: { api: BackendApi; state: ReceivingState; onSaved: (message: string) => void }) {
  const [days, setDays] = useState(""); const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("ตั้งเครดิตผู้ขายแล้ว แก้ไขภายหลังไม่ได้"));
  return <div className={layout.form}>
    <fieldset disabled={write.frozen}>
      <Field label="เครดิตที่ตกลงกับผู้ขาย (วัน)" hint="0 = จ่ายทันที ไม่มีค่าเริ่มต้น นับจากวันที่รับของดีครบ" error={error || undefined}><input inputMode="numeric" autoComplete="off" value={days} aria-invalid={Boolean(error) || undefined} onChange={(event) => { setDays(event.target.value); setError(""); }} /></Field>
    </fieldset>
    <div className={layout.actions}><button type="button" className={layout.submit} disabled={write.frozen || !days.trim()} onClick={() => { try { creditDays(days); setConfirming(true); } catch (problem) { setError((problem as Error).message); } }}>ตั้งเครดิต</button></div>
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    <ConfirmDialog open={confirming} title="ตั้งเครดิตผู้ขาย?" confirmLabel="ยืนยันตั้งเครดิต" checks={["ตกลงจำนวนวันกับผู้ขายแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => {
      setConfirming(false);
      write.submit(`/receiving/orders/${state.order_id}/credit-terms`, "POST", () => ({ idempotency_key: crypto.randomUUID(), expected_version: state.version, credit_days: creditDays(days) }), "");
    }}><p>{state.order_no} · เครดิต {days.trim()} วัน</p><p>ตั้งได้ครั้งเดียว แก้ไขภายหลังไม่ได้</p></ConfirmDialog>
  </div>;
}

function SettleForm({ api, state, onSaved }: { api: BackendApi; state: ReceivingState; onSaved: (message: string) => void }) {
  const finance = state.finance!;
  const [method, setMethod] = useState<"bank" | "cash">("bank"); const [paidAt, setPaidAt] = useState("");
  const [proof, setProof] = useState<ReadyFile | null>(null); const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("บันทึกการจ่ายผู้ขายแล้ว (บันทึกการจ่ายนอกระบบ ไม่ได้โอนเงิน)"));
  const build = () => settlementPayload({ key: crypto.randomUUID(), version: state.version, method, paidAt, evidenceId: proof?.id, fullReceivedAt: state.full_received_at! }, Date.now());
  return <div className={layout.form}>
    <fieldset disabled={write.frozen}>
      <Field label="วิธีจ่าย"><select value={method} onChange={(event) => { setMethod(event.target.value as "bank" | "cash"); setError(""); }}><option value="bank">โอนผ่านธนาคาร (ต้องแนบหลักฐาน)</option><option value="cash">เงินสด (แนบหลักฐานหรือไม่ก็ได้)</option></select></Field>
      <Field label="วันเวลาที่จ่าย" hint="เวลาประเทศไทย"><input type="datetime-local" value={paidAt} onChange={(event) => { setPaidAt(event.target.value); setError(""); }} /></Field>
      <ProofUpload api={api} intentPath={`/material-orders/${state.order_id}/evidence/uploads`} completePath={(id) => `/order-evidence/${id}/complete`} label={method === "bank" ? "หลักฐานการโอน" : "ใบเสร็จหรือรูป (ไม่บังคับ)"} ready={proof} onReady={(file) => { setProof(file); setError(""); }} />
    </fieldset>
    <div className={layout.submitBar}><span>จ่ายเต็มจำนวน {bahtTH(finance.total_amount)} ครั้งเดียว (ไม่มี VAT)</span><button type="button" className={layout.submit} disabled={write.frozen || !paidAt} onClick={() => { try { build(); setConfirming(true); } catch (problem) { setError((problem as Error).message); } }}>บันทึกการจ่าย</button></div>
    {error && <p className={layout.problem} role="alert">{error}</p>}
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    <ConfirmDialog open={confirming} title="บันทึกการจ่ายผู้ขาย?" confirmLabel="ยืนยันบันทึกการจ่าย" checks={["จ่ายผู้ขายเต็มจำนวนแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => {
      setConfirming(false);
      write.submit(`/receiving/orders/${state.order_id}/settlement`, "POST", build, "");
    }}><p>{state.order_no} · {state.supplier_name} · {bahtTH(finance.total_amount)} · {METHOD[method]}</p><p>มีการจ่ายได้ครั้งเดียวต่อใบสั่งซื้อ ระบบบันทึกการจ่ายเท่านั้น ไม่ได้โอนเงิน</p></ConfirmDialog>
  </div>;
}
