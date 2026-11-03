"use client";

import { useState } from "react";
import { moneyInput, type BackendApi } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import type { ReadyFile } from "../../components/ui/backend-ui";
import { bahtTH } from "../../components/staff-ui/staff-format";
import { ConfirmDialog, ErrorText, Field, RetryPanel } from "../../components/staff-ui/staff-ui";
import { ProofUpload } from "../../components/staff-ui/staff-upload";
import { creditDays } from "../receiving/receiving-domain";
import { paymentPayload, shipPayload, type FulfillmentJob } from "./delivery-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";

type Props = { api: BackendApi; state: FulfillmentJob; onSaved: (message: string) => void };
const command = (state: FulfillmentJob) => ({ idempotency_key: crypto.randomUUID(), expected_version: state.version });
const Outcome = ({ write, onSaved }: { write: ReturnType<typeof useRetryableWrite>; onSaved: (message: string) => void }) =>
  write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />;
const check = (build: () => unknown, setError: (message: string) => void) => { try { build(); setError(""); return true; } catch (problem) { setError((problem as Error).message); return false; } };

const METHOD_LABEL: Record<string, string> = {
  self: "ร้านส่งเอง",
  third_party: "ผู้ให้บริการขนส่ง",
  pickup: "ลูกค้ารับที่ร้าน (Pickup)",
};

// Each form is a div with button clicks: ConfirmDialog carries its own form.
export function TermsForm({ api, state, onSaved }: Props) {
  const [days, setDays] = useState(""); const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("ตั้งเครดิตแล้ว ออกใบแจ้งหนี้ได้"));
  const build = () => ({ ...command(state), credit_days: creditDays(days) });
  return <div className={layout.form}>
    <fieldset disabled={write.frozen}><Field label="เครดิต (วัน · ไม่บังคับหากออกใบแจ้งหนี้ทันที)" hint="0 = ครบกำหนดทันทีที่ออกใบแจ้งหนี้" error={error || undefined}><input inputMode="numeric" autoComplete="off" value={days} aria-invalid={Boolean(error) || undefined} onChange={(event) => { setDays(event.target.value); setError(""); }} /></Field></fieldset>
    <div className={layout.actions}><button type="button" className={layout.submit} disabled={write.frozen || !days.trim()} onClick={() => { if (check(build, setError)) setConfirming(true); }}>ตั้งเครดิต</button></div>
    <Outcome write={write} onSaved={onSaved} />
    <ConfirmDialog open={confirming} title="ตั้งเครดิตใบแจ้งหนี้?" confirmLabel="ยืนยันตั้งเครดิต" checks={["ตกลงเครดิตกับลูกค้าแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); write.submit(`/fulfillment/jobs/${state.job_id}/credit-terms`, "PUT", build, ""); }}>
      <p>เครดิต {days.trim()} วัน นับจากวันที่ออกใบแจ้งหนี้</p><p>ตั้งได้ครั้งเดียว แก้ไขภายหลังไม่ได้</p>
    </ConfirmDialog>
  </div>;
}

export function InvoiceForm({ api, state, onSaved }: Props) {
  const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("ออกใบแจ้งหนี้แล้ว บันทึกส่งมอบได้"));
  const effectiveDays = state.credit_days ?? 0;
  return <div className={layout.form}>
    <p className={layout.muted}>ยอดใบแจ้งหนี้คือยอดหลังหักมัดจำ {bahtTH(state.opening_balance)} (ไม่มี VAT) ครบกำหนด {effectiveDays} วันหลังออก{state.credit_days === undefined ? " (ค่าเริ่มต้น 0 วัน)" : ""}</p>
    <div className={layout.actions}><button type="button" className={layout.submit} disabled={write.frozen} onClick={() => setConfirming(true)}>ออกใบแจ้งหนี้</button></div>
    <Outcome write={write} onSaved={onSaved} />
    <ConfirmDialog open={confirming} title="ออกใบแจ้งหนี้?" confirmLabel="ยืนยันออกใบแจ้งหนี้" checks={["ตรวจยอดและเครดิตแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); write.submit(`/fulfillment/jobs/${state.job_id}/invoice`, "POST", () => command(state), ""); }}>
      <p>ยอด {bahtTH(state.opening_balance)} · เครดิต {effectiveDays} วัน</p><p>ใบแจ้งหนี้มีใบเดียวต่องาน ออกแล้วแก้ยอด เครดิต และวันที่ไม่ได้</p>
    </ConfirmDialog>
  </div>;
}

export function ShipForm({ api, state, onSaved }: Props) {
  const [method, setMethod] = useState<"self" | "third_party" | "pickup">("self");
  const [receiver, setReceiver] = useState("");
  const [shippingCost, setShippingCost] = useState("0.00");
  const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("บันทึกส่งมอบแล้ว ลูกค้าจะได้รับแจ้งให้ตรวจรับ"));
  const build = () => shipPayload(command(state), method, receiver, shippingCost);
  return <div className={layout.form}>
    <fieldset disabled={write.frozen}>
      <Field label="วิธีส่ง (UC9 Q9.1)">
        <select value={method} onChange={(event) => setMethod(event.target.value as "self" | "third_party" | "pickup")}>
          <option value="self">ร้านส่งเอง (self)</option>
          <option value="third_party">ผู้ให้บริการขนส่ง (third_party)</option>
          <option value="pickup">ลูกค้ารับที่ร้าน (pickup)</option>
        </select>
      </Field>
      <Field label="ชื่อผู้รับ" error={error || undefined}><input maxLength={200} autoComplete="off" value={receiver} aria-invalid={Boolean(error) || undefined} onChange={(event) => { setReceiver(event.target.value); setError(""); }} /></Field>
      <Field label="ค่าจัดส่ง (บาท · UC9 Q9.1)" hint="0.00 หากไม่มีค่าจัดส่ง"><input inputMode="decimal" autoComplete="off" value={shippingCost} onChange={(event) => { setShippingCost(event.target.value); setError(""); }} /></Field>
    </fieldset>
    <p className={layout.muted}>ส่งทั้งงานในครั้งเดียว การบันทึกส่งไม่ใช่การที่ลูกค้ารับงาน</p>
    <div className={layout.actions}><button type="button" className={layout.submit} disabled={write.frozen || !receiver.trim()} onClick={() => { if (check(build, setError)) setConfirming(true); }}>บันทึกส่งมอบ</button></div>
    <Outcome write={write} onSaved={onSaved} />
    <ConfirmDialog open={confirming} title="บันทึกส่งมอบ?" confirmLabel="ยืนยันส่งมอบ" checks={["ส่งงานครบทั้งงานแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); write.submit(`/fulfillment/jobs/${state.job_id}/deliveries`, "POST", build, ""); }}>
      <p>{METHOD_LABEL[method] ?? method} · ผู้รับ {receiver.trim()}{shippingCost.trim() ? ` · ค่าจัดส่ง ${bahtTH(shippingCost.trim())}` : ""}</p><p>ลูกค้าจะตรวจรับหรือส่งคืนเพื่อแก้ไขฟรีในระบบ</p>
    </ConfirmDialog>
  </div>;
}

export function CashForm({ api, state, onSaved }: Props) {
  const balance = state.invoice?.balance ?? "0.00";
  const [amount, setAmount] = useState(""); const [paidAt, setPaidAt] = useState(""); const [proof, setProof] = useState<ReadyFile | null>(null);
  const [error, setError] = useState(""); const [confirming, setConfirming] = useState(false);
  const write = useRetryableWrite(api, () => onSaved("บันทึกรับเงินสดแล้ว ยอดคงเหลือลดลงทันที"));
  const build = () => paymentPayload(command(state), { amount, paidAt, evidenceId: proof?.id, balance, requireEvidence: false }, Date.now());
  return <div className={layout.form}>
    <fieldset disabled={write.frozen}>
      <Field label="จำนวนเงิน (บาท)" hint={`ไม่เกินยอดคงเหลือ ${bahtTH(balance)}`}><input inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => { setAmount(event.target.value); setError(""); }} /></Field>
      <Field label="วันเวลาที่รับเงิน" hint="เวลาประเทศไทย"><input type="datetime-local" value={paidAt} onChange={(event) => { setPaidAt(event.target.value); setError(""); }} /></Field>
      <ProofUpload api={api} intentPath={`/fulfillment/jobs/${state.job_id}/evidence/uploads`} completePath={(id) => `/customer-evidence/${id}/complete`} label="ใบเสร็จหรือรูป (ไม่บังคับ)" ready={proof} onReady={setProof} />
    </fieldset>
    <div className={layout.submitBar}><span>แบ่งชำระได้ ชำระเกินไม่ได้ ไม่มีส่วนลดหรือคืนเงิน</span><button type="button" className={layout.submit} disabled={write.frozen || !amount.trim() || !paidAt} onClick={() => { if (check(build, setError)) setConfirming(true); }}>บันทึกรับเงินสด</button></div>
    {error && <p className={layout.problem} role="alert">{error}</p>}
    <Outcome write={write} onSaved={onSaved} />
    <ConfirmDialog open={confirming} title="บันทึกรับเงินสด?" confirmLabel="ยืนยันรับเงินสด" checks={["รับเงินสดครบตามจำนวนแล้ว"]} onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); write.submit(`/fulfillment/jobs/${state.job_id}/payments/cash`, "POST", build, ""); }}>
      <p>รับเงินสด {confirming ? bahtTH(moneyInput(amount.trim())) : ""} จากยอดคงเหลือ {bahtTH(balance)}</p><p>บันทึกแล้วยอดคงเหลือลดลงทันที แก้ไขภายหลังไม่ได้</p>
    </ConfirmDialog>
  </div>;
}
