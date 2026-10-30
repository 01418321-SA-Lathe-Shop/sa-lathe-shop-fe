"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi } from "../../lib/api/backend-api";
import { useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { dateTimeTH, quantityTH } from "../../components/staff-ui/staff-format";
import { CLAIM_STATE, RECEIVING_STATE } from "../../components/staff-ui/staff-labels";
import { Collapsible, ErrorText, Field, LoadError, NextAction, RetryPanel, Skeleton, StatusBadge } from "../../components/staff-ui/staff-ui";
import { claimNote, claimOwed, hasOpenClaim, statusTab, type Claim, type ReceivingState } from "./receiving-domain";
import { ReceiptForm } from "./receiving-receipt";
import { FinanceSection } from "./receiving-finance";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./receiving.module.css";

const line = (state: ReceivingState, materialId: string) => state.lines?.find((item) => item.material_id === materialId);

// UC7 order detail. Forms render only from settled data so a reload after a
// save cannot clear what someone is typing; each form is keyed by version.
export function ReceivingDetail({ api, admin, id, backHref, onChanged }: { api: BackendApi; admin: boolean; id: string; backHref: string; onChanged: (message: string) => void }) {
  const resource = useResource<ReceivingState>(api, `/receiving/orders/${id}`);
  const state = resource.data; const settled = !resource.loading;
  const saved = (message: string) => { resource.reload(); onChanged(message); };
  if (!state) return <article className={layout.detailCard}>
    <Link href={backHref} scroll={false} className={layout.back}><Icon name="arrow" size={16} />กลับไปรายการ</Link>
    {resource.error ? <LoadError title="โหลดใบสั่งซื้อนี้ไม่สำเร็จ" onRetry={resource.reload} /> : <Skeleton label="กำลังโหลดใบสั่งซื้อ…" />}
  </article>;
  const status = statusTab(state); const claims = state.claims ?? []; const receipts = state.receipts ?? [];
  const pending = claims.filter((claim) => claim.status === "pending_claim");
  return <article className={layout.detailCard} aria-label={`รับของ ${state.order_no}`}>
    <Link href={backHref} scroll={false} className={layout.back}><Icon name="arrow" size={16} />กลับไปรายการ</Link>
    <div className={layout.detailHeader}>
      <div><h2>{state.order_no}</h2><p className={layout.meta}>{state.supplier_name}</p></div>
      {status && <StatusBadge map={RECEIVING_STATE} value={status} />}
    </div>
    <dl className={layout.facts}>
      <div><dt>ผู้ขาย</dt><dd>{state.supplier_name}</dd></div>
      <div><dt>รับของดีครบเมื่อ</dt><dd>{state.full_received_at ? dateTimeTH(state.full_received_at) : "ยังไม่ครบ"}</dd></div>
      <div><dt>ของเสียหาย</dt><dd>{hasOpenClaim(state) ? `ค้าง ${claims.filter((claim) => claim.status !== "resolved").length} รายการ` : "ไม่มีที่ค้าง"}</dd></div>
    </dl>
    {pending.length > 0 && <p className={layout.warning}>มีของเสียหาย {pending.length} รายการที่ยังไม่ได้แจ้งผู้ขาย บันทึกการแจ้งที่หัวข้อของเสียหายด้านล่าง แล้วจึงรับของแทนได้</p>}
    {resource.error && <ErrorText error={resource.error} />}
    {state.status === "received" ? <p className={layout.muted}>รับของดีครบตามใบสั่งซื้อแล้ว{admin ? " ตั้งเครดิตและบันทึกการจ่ายผู้ขายได้ที่หัวข้อจ่ายผู้ขาย" : ""}</p>
      : settled && <NextAction title="บันทึกของที่มาถึง"><ReceiptForm key={`receipt:${state.version}`} api={api} state={state} onSaved={() => saved("บันทึกรับของแล้ว ของดีเข้าสต๊อกแล้ว ตรวจการจองของงานอีกครั้ง")} /></NextAction>}
    <section className={layout.section} aria-label="วัตถุดิบในใบสั่งซื้อ">
      <h3>วัตถุดิบ {state.lines?.length ?? 0} รายการ</h3>
      <ul className={styles.lines}>{state.lines?.map((item) => <li key={item.material_id}>
        <strong>{item.material_name}</strong>
        <dl className={styles.qty}>
          <div><dt>สั่ง</dt><dd>{quantityTH(item.ordered)} {item.unit_name}</dd></div>
          <div><dt>รับของดีแล้ว</dt><dd>{quantityTH(item.good)}</dd></div>
          <div><dt>คงเหลือ</dt><dd data-zero={item.outstanding === "0.000000" ? "" : undefined}>{quantityTH(item.outstanding)}</dd></div>
        </dl>
        {item.damaged !== "0.000000" && <small>เคยรับของเสียหายรวม {quantityTH(item.damaged)} {item.unit_name} (ไม่เข้าสต๊อก)</small>}
      </li>)}</ul>
    </section>
    <section className={layout.section} aria-label="ของเสียหาย">
      <h3>ของเสียหาย</h3>
      {claims.length ? <ul className={styles.claims}>{claims.map((claim) => <ClaimCard key={`${claim.id}:${claim.status}:${state.version}`} api={api} state={state} claim={claim} settled={settled} onSaved={saved} />)}</ul>
        : <p className={layout.muted}>ไม่มีของเสียหาย</p>}
      <p className={layout.muted}>ผู้ขายต้องส่งของดีมาแทนเท่านั้น ไม่มีการคืนเงินหรือตัดยอด</p>
    </section>
    <section className={layout.section} aria-label="ประวัติการรับของ">
      <h3>ประวัติการรับของ</h3>
      {receipts.length ? <ol className={layout.timeline}>{receipts.map((receipt) => <li key={receipt.id}>
        <strong>{dateTimeTH(receipt.created_at)}</strong>
        {receipt.lines?.map((row, index) => { const item = line(state, row.material_id);
          return <span key={index}>{item?.material_name ?? "วัตถุดิบ"}: ดี {quantityTH(row.good)}{row.damaged !== "0.000000" ? ` · เสียหาย ${quantityTH(row.damaged)}` : ""} {item?.unit_name}{row.replacement_claim_id ? " (ของแทน)" : ""}</span>; })}
        {receipt.note && <span>หมายเหตุ: {receipt.note}</span>}
      </li>)}</ol> : <p className={layout.muted}>ยังไม่ได้รับของ</p>}
    </section>
    {admin && state.finance && settled && <FinanceSection key={`finance:${state.version}`} api={api} state={state} onSaved={saved} />}
    {!admin && <p className={layout.muted}>ราคา เครดิต และการจ่ายผู้ขายจัดการโดยแอดมิน</p>}
    <Collapsible title="ประวัติระบบ"><p className={layout.code}>รหัสใบสั่งซื้อ {state.order_id} · เวอร์ชัน {String(state.version)}</p></Collapsible>
  </article>;
}

// A damaged-goods claim. Recording the supplier contact is the only command;
// the replacement itself is received through the receipt form.
function ClaimCard({ api, state, claim, settled, onSaved }: { api: BackendApi; state: ReceivingState; claim: Claim; settled: boolean; onSaved: (message: string) => void }) {
  const item = line(state, claim.material_id); const [note, setNote] = useState(""); const [noteError, setNoteError] = useState("");
  const write = useRetryableWrite(api, () => onSaved("บันทึกการแจ้งผู้ขายแล้ว เมื่อของแทนมาถึงให้บันทึกรับของแทน"));
  return <li>
    <span className={styles.claimTop}><strong>{item?.material_name ?? "วัตถุดิบ"} · เสียหาย {quantityTH(claim.quantity)} {item?.unit_name}</strong><StatusBadge map={CLAIM_STATE} value={claim.status} /></span>
    <small>ได้ของแทนแล้ว {quantityTH(claim.replaced)} · ผู้ขายยังค้างส่ง {quantityTH(claimOwed(claim))} {item?.unit_name}</small>
    {claim.claimed_at && <small>แจ้งผู้ขายเมื่อ {dateTimeTH(claim.claimed_at)}{claim.note ? ` · ${claim.note}` : ""}</small>}
    {settled && claim.status === "pending_claim" && <div className={layout.form}>
      <fieldset disabled={write.frozen}>
        <Field label="แจ้งผู้ขายอย่างไร" error={noteError || undefined}><textarea value={note} maxLength={2000} placeholder="เช่น โทรแจ้งฝ่ายขาย นัดส่งของแทนวันศุกร์" aria-invalid={Boolean(noteError) || undefined} onChange={(event) => setNote(event.target.value)} /></Field>
      </fieldset>
      <div className={layout.actions}><button type="button" className={layout.submit} disabled={write.frozen} onClick={() => {
        let text: string; try { text = claimNote(note); } catch (problem) { setNoteError((problem as Error).message); return; }
        setNoteError(""); write.submit(`/receiving/orders/${state.order_id}/claims/${claim.id}/submit`, "POST", () => ({ idempotency_key: crypto.randomUUID(), expected_version: state.version, note: text }), "");
      }}>บันทึกว่าแจ้งผู้ขายแล้ว</button></div>
      {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onSaved(""); }} /> : <ErrorText error={write.error} />}
    </div>}
  </li>;
}
