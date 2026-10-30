"use client";

import { useState } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import { quantityTH } from "../../components/staff-ui/staff-format";
import { Button, ConfirmDialog, ErrorText, Field, RetryPanel } from "../../components/staff-ui/staff-ui";
import { claimOwed, originalRemaining, plainQuantity, receiptPayload, receiptRowError, type DraftReceipt, type ReceivingState } from "./receiving-domain";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./receiving.module.css";

type Row = DraftReceipt & { name: string; unit: string; remaining: string };

// Original deliveries come first, then replacements for claims already sent to
// the supplier. Fill buttons only type the remaining quantity; Staff still save.
function draftRows(state: ReceivingState): Row[] {
  const lines = state.lines ?? [];
  const original = lines.map((line) => ({ material_id: line.material_id, good: "", damaged: "", name: line.material_name, unit: line.unit_name, remaining: originalRemaining(state, line.material_id) })).filter((row) => row.remaining !== "0.000000");
  const replacements = (state.claims ?? []).filter((claim) => claim.status === "claimed" && claimOwed(claim) !== "0.000000").map((claim) => {
    const line = lines.find((item) => item.material_id === claim.material_id);
    return { material_id: claim.material_id, good: "", damaged: "", replacement_claim_id: claim.id, name: line?.material_name ?? "วัตถุดิบ", unit: line?.unit_name ?? "", remaining: claimOwed(claim) };
  });
  return [...original, ...replacements];
}

export function ReceiptForm({ api, state, onSaved }: { api: BackendApi; state: ReceivingState; onSaved: () => void }) {
  const [rows, setRows] = useState<Row[]>(() => draftRows(state));
  const [note, setNote] = useState(""); const [confirming, setConfirming] = useState(false); const [error, setError] = useState("");
  const write = useRetryableWrite(api, onSaved);
  const errors = rows.map((row) => receiptRowError(row, row.remaining));
  const filled = rows.filter((row) => row.good.trim() || row.damaged.trim()).length;
  const edit = (index: number, change: Partial<Row>) => { setError(""); setRows((current) => current.map((row, i) => i === index ? { ...row, ...change } : row)); };
  const fill = (row: Row): Row => ({ ...row, good: plainQuantity(row.remaining), damaged: "" });
  const build = () => receiptPayload({ key: crypto.randomUUID(), version: state.version, note, lines: rows, claims: state.claims ?? [] });
  if (!rows.length) return <p className={layout.muted}>ไม่มีของที่รอรับตอนนี้ ของเสียหายที่ยังไม่ได้แจ้งผู้ขายต้องบันทึกการแจ้งก่อนจึงรับของแทนได้</p>;
  // A div, not a form: ConfirmDialog carries its own form.
  return <div className={layout.form}>
    <p className={layout.muted}>นับของที่มาถึงจริงเป็นหน่วยของวัตถุดิบ ไม่ได้รับรายการไหนให้เว้นว่าง ของเสียหายไม่เข้าสต๊อกและจะเปิดเป็นรายการรอแจ้งผู้ขาย</p>
    <fieldset disabled={write.frozen}>
      {rows.length > 1 && <Button onClick={() => { setError(""); setRows((current) => current.map(fill)); }}>รับครบทุกรายการตามที่เหลือ</Button>}
      <ul className={styles.receipt}>{rows.map((row, index) => <li key={`${row.material_id}:${row.replacement_claim_id ?? ""}`}>
        <div><strong>{row.name}{row.replacement_claim_id ? " · ของแทน" : ""}</strong><small>เหลือรับ {quantityTH(row.remaining)} {row.unit}</small></div>
        <Field label={`ของดี (${row.unit})`} error={errors[index] || undefined}><input inputMode="decimal" autoComplete="off" value={row.good} aria-invalid={Boolean(errors[index]) || undefined} onChange={(event) => edit(index, { good: event.target.value })} /></Field>
        <Field label={`เสียหาย (${row.unit})`}><input inputMode="decimal" autoComplete="off" value={row.damaged} onChange={(event) => edit(index, { damaged: event.target.value })} /></Field>
        <Button variant="text" onClick={() => edit(index, fill(row))}>รับครบตามที่เหลือ<span className={layout.visuallyHidden}> {row.name}</span></Button>
      </li>)}</ul>
      <Field label="หมายเหตุ (ไม่บังคับ)"><textarea value={note} maxLength={2000} onChange={(event) => setNote(event.target.value)} /></Field>
    </fieldset>
    <div className={layout.submitBar}>
      <span aria-live="polite">{filled ? `กรอกแล้ว ${filled} รายการ` : "ยังไม่ได้กรอกจำนวน"}</span>
      <button type="button" className={layout.submit} disabled={write.frozen || !filled || errors.some(Boolean)} onClick={() => { try { build(); setError(""); setConfirming(true); } catch (problem) { setError((problem as Error).message); } }}>บันทึกรับของ</button>
    </div>
    {error && <p className={layout.problem} role="alert">{error}</p>}
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(); }} /> : <ErrorText error={write.error} />}
    <ConfirmDialog open={confirming} title="บันทึกรับของ?" confirmLabel="ยืนยันรับของ" checks={["นับของที่มาถึงแล้ว ของเสียหายจะไม่เข้าสต๊อก"]} onClose={() => setConfirming(false)} onConfirm={() => {
      setConfirming(false);
      write.submit(`/receiving/orders/${state.order_id}/receipts`, "POST", build, "");
    }}>
      <p>{state.order_no} · {state.supplier_name}</p>
      <ul className={styles.confirmList}>{rows.filter((row) => row.good.trim() || row.damaged.trim()).map((row) => <li key={`${row.material_id}:${row.replacement_claim_id ?? ""}`}>{row.name}{row.replacement_claim_id ? " (ของแทน)" : ""}: ดี {row.good.trim() || "0"}{row.damaged.trim() ? ` · เสียหาย ${row.damaged.trim()}` : ""} {row.unit}</li>)}</ul>
      <p>บันทึกแล้วแก้ไขไม่ได้ ของดีเข้าสต๊อกทันที แต่ไม่ได้จองให้งานอัตโนมัติ</p>
    </ConfirmDialog>
  </div>;
}
