"use client";

import Link from "next/link";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { bahtTH, dateTimeTH } from "../../components/staff-ui/staff-format";
import { FULFILLMENT_EVENT, INVOICE_STATE, JOB_STATUS, SHIPMENT_STATE } from "../../components/staff-ui/staff-labels";
import { Collapsible, LoadError, NextAction, Skeleton, StatusBadge } from "../../components/staff-ui/staff-ui";
import { availableActions, type FulfillmentJob } from "./delivery-domain";
import { CashForm, InvoiceForm, ShipForm, TermsForm } from "./delivery-actions";
import { PaymentCards } from "./delivery-payments";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./delivery.module.css";

// UC9 job detail: balance first, then the one step this role can take now.
// Forms render only from settled data and are keyed by version.
export function DeliveryDetail({ api, admin, id, label, backHref, onChanged }: { api: BackendApi; admin: boolean; id: string; label: string; backHref: string; onChanged: (message: string) => void }) {
  const resource = useResource<FulfillmentJob>(api, `/fulfillment/jobs/${id}`);
  const state = resource.data; const settled = !resource.loading;
  const saved = (message: string) => { resource.reload(); onChanged(message); };
  if (!state) return <article className={layout.detailCard}>
    <Link href={backHref} scroll={false} className={layout.back}><Icon name="arrow" size={16} />กลับไปรายการ</Link>
    {resource.error ? <LoadError title="โหลดงานนี้ไม่สำเร็จ" onRetry={resource.reload} /> : <Skeleton label="กำลังโหลดงาน…" />}
  </article>;
  const actions = settled ? availableActions(state, admin ? "admin" : "worker") : [];
  const invoice = state.invoice; const deliveries = state.deliveries ?? []; const last = deliveries.at(-1);
  const closed = state.request_status === "completed"; const key = String(state.version);
  return <article className={layout.detailCard} aria-label={`ส่งมอบ ${label}`}>
    <Link href={backHref} scroll={false} className={layout.back}><Icon name="arrow" size={16} />กลับไปรายการ</Link>
    <div className={layout.detailHeader}>
      <div><h2>{label}</h2><p className={layout.meta}>{invoice ? `ใบแจ้งหนี้ ${invoice.number}` : "ยังไม่มีใบแจ้งหนี้"}{state.cycle > 1 ? ` · แก้ไขรอบ ${state.cycle}` : ""}</p></div>
      <StatusBadge map={JOB_STATUS} value={state.job_status} />
    </div>
    <section className={styles.hero} data-paid={invoice?.status === "paid" || undefined} aria-label="ยอดเงิน">
      {invoice ? <>
        <div><span className={styles.heroLabel}>ยอดคงเหลือ</span><strong className={styles.heroAmount}>{bahtTH(invoice.balance)}</strong><StatusBadge map={INVOICE_STATE} value={invoice.status} /></div>
        <dl className={layout.facts}>
          <div><dt>ยอดใบแจ้งหนี้ (ไม่มี VAT)</dt><dd>{bahtTH(invoice.amount)}</dd></div>
          <div><dt>ชำระแล้ว</dt><dd>{bahtTH(invoice.paid)}</dd></div>
          <div><dt>ครบกำหนดชำระ</dt><dd>{dateTimeTH(invoice.due_at)}</dd></div>
          <div><dt>เครดิต</dt><dd>{invoice.credit_days} วัน · ออกเมื่อ {dateTimeTH(invoice.issued_at)}</dd></div>
        </dl>
      </> : <>
        <div><span className={styles.heroLabel}>ยอดที่จะออกใบแจ้งหนี้</span><strong className={styles.heroAmount}>{bahtTH(state.opening_balance)}</strong></div>
        <dl className={layout.facts}>
          <div><dt>มัดจำที่อนุมัติแล้ว</dt><dd>{bahtTH(state.deposit)}</dd></div>
          <div><dt>เครดิต</dt><dd>{state.credit_days === undefined ? "ยังไม่ตั้ง" : `${state.credit_days} วัน`}</dd></div>
        </dl>
      </>}
    </section>
    {closed && <p className={layout.muted}>ปิดงานแล้ว: ลูกค้ารับงานและชำระครบ</p>}
    {actions.includes("terms") && <NextAction title="ตั้งเครดิตใบแจ้งหนี้"><TermsForm key={`terms:${key}`} api={api} state={state} onSaved={saved} /></NextAction>}
    {actions.includes("invoice") && <NextAction title="ออกใบแจ้งหนี้"><InvoiceForm key={`invoice:${key}`} api={api} state={state} onSaved={saved} /></NextAction>}
    {!admin && !closed && state.job_status === "completed" && !invoice && state.credit_days === undefined && <NextAction title="รอแอดมินตั้งเครดิต"><p className={layout.muted}>ออกใบแจ้งหนี้ได้หลังแอดมินตั้งเครดิตให้งานนี้</p></NextAction>}
    {actions.includes("ship") && <NextAction title={last?.status === "returned" ? "ส่งงานที่แก้ไขแล้ว" : "บันทึกส่งมอบ"}><ShipForm key={`ship:${key}`} api={api} state={state} onSaved={saved} /></NextAction>}
    {!closed && last?.status === "shipping" && <NextAction title="รอลูกค้าตรวจรับ"><p className={layout.muted}>ลูกค้าตรวจรับในระบบ ถ้าส่งคืน งานเดิมจะเปิดกลับมาแก้ไขฟรีที่หน้างานผลิต</p></NextAction>}
    {!closed && state.job_status !== "completed" && <p className={layout.muted}>{state.cycle > 1 ? "งานกลับไปแก้ไขที่หน้างานผลิต" : "งานยังผลิตไม่เสร็จ"} ส่งมอบได้หลังปิดงานผลิต</p>}
    {admin && state.payments !== undefined && <section className={layout.section} aria-label="การชำระเงิน">
      <h3>การชำระเงิน</h3>
      <PaymentCards key={`payments:${key}`} api={api} state={state} canReview={actions.includes("review")} onSaved={saved} />
      {actions.includes("cash") && <Collapsible title="บันทึกรับเงินสด"><CashForm key={`cash:${key}`} api={api} state={state} onSaved={saved} /></Collapsible>}
    </section>}
    {!admin && <p className={layout.muted}>การรับชำระและตรวจหลักฐานจัดการโดยแอดมิน</p>}
    <section className={layout.section} aria-label="การส่งมอบ">
      <h3>การส่งมอบ</h3>
      {deliveries.length ? <ol className={layout.timeline}>{deliveries.map((delivery) => <li key={delivery.id}>
        <strong>รอบ {delivery.cycle} · <StatusBadge map={SHIPMENT_STATE} value={delivery.status} /></strong>
        <span>{delivery.method === "self" ? "ร้านส่งเอง / ลูกค้ารับเอง" : "ผู้ให้บริการขนส่ง"} · ผู้รับ {delivery.receiver_name} · ส่งเมื่อ {dateTimeTH(delivery.shipped_at)}</span>
        {delivery.decided_at && <span>ลูกค้าตอบเมื่อ {dateTimeTH(delivery.decided_at)}{delivery.reason ? ` · ${delivery.reason}` : ""}</span>}
      </li>)}</ol> : <p className={layout.muted}>ยังไม่ได้ส่งมอบ</p>}
    </section>
    {Boolean(state.rework_history?.length) && <section className={layout.section} aria-label="ประวัติการแก้ไข">
      <h3>ประวัติการแก้ไข</h3>
      <ol className={layout.timeline}>{state.rework_history?.map((cycle) => <li key={cycle.cycle}><strong>รอบ {cycle.cycle}</strong><span>ผลิตเสร็จ {dateTimeTH(cycle.completed_at)} · ลูกค้าส่งคืนและเปิดงานใหม่ {dateTimeTH(cycle.reopened_at)}</span></li>)}</ol>
    </section>}
    <section className={layout.section} aria-label="ประวัติ">
      <h3>ประวัติ</h3>
      {state.events?.length ? <ol className={layout.timeline}>{state.events.map((event) => <li key={event.id}><strong><StatusBadge map={FULFILLMENT_EVENT} value={event.action} /></strong><span>{dateTimeTH(event.created_at)}</span></li>)}</ol> : <p className={layout.muted}>ยังไม่มีประวัติ</p>}
    </section>
    <Collapsible title="ประวัติระบบ"><p className={layout.code}>รหัสงาน {state.job_id} · เวอร์ชัน {String(state.version)}</p></Collapsible>
  </article>;
}
