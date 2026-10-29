"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { BackendApi } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import { bahtTH, dateTimeTH, quantityTH } from "../../components/staff-ui/staff-format";
import { ORDER_EVENT, ORDER_STATE } from "../../components/staff-ui/staff-labels";
import { Button, Collapsible, ConfirmDialog, ErrorText, Field, NextAction, RetryPanel, StatusBadge } from "../../components/staff-ui/staff-ui";
import { allowedActions, orderActionPayload, orderTabOf, type OrderAction, type SupplierOrder } from "./procurement-domain";
import { RelatedJobs } from "./procurement-jobs";
import layout from "../../components/staff-ui/staff-layout.module.css";
import styles from "./procurement.module.css";

const ACTION: Record<OrderAction, { title: string; confirm: string; done: string; text: string }> = {
  accept: { title: "บันทึกว่าผู้ขายรับใบสั่งซื้อ?", confirm: "ผู้ขายรับแล้ว", done: "บันทึกว่าผู้ขายรับใบสั่งซื้อแล้ว", text: "บันทึกคำตอบแล้วเปลี่ยนไม่ได้ ไม่กระทบสต๊อกจนกว่าจะรับของเข้า" },
  reject: { title: "บันทึกว่าผู้ขายปฏิเสธ?", confirm: "ผู้ขายปฏิเสธ", done: "บันทึกว่าผู้ขายปฏิเสธแล้ว ใบสั่งซื้อถูกยกเลิก", text: "ใบสั่งซื้อนี้จะถูกยกเลิกทั้งใบ และยังเก็บไว้ในประวัติ" },
  cancel: { title: "ยกเลิกใบสั่งซื้อนี้?", confirm: "ยกเลิกใบสั่งซื้อ", done: "ยกเลิกใบสั่งซื้อแล้ว", text: "ยกเลิกได้เฉพาะก่อนรับของ ใบสั่งซื้อยังเก็บไว้ในประวัติ" },
};

// UC6 order detail (Admin). Placed orders are immutable; the only commands are
// the supplier's response and cancellation, each with a frozen retry key.
export function OrderDetail({ api, order, backHref, receivingHref, onChanged }: { api: BackendApi; order: SupplierOrder; backHref: string; receivingHref: string; onChanged: (message: string) => void }) {
  const tab = orderTabOf(order); const actions = allowedActions(order);
  const [action, setAction] = useState<OrderAction | null>(null); const [dialog, setDialog] = useState(false);
  const [reason, setReason] = useState(""); const [reasonError, setReasonError] = useState("");
  const write = useRetryableWrite(api, () => onChanged(action ? ACTION[action].done : ""));
  const lines = order.lines ?? []; const events = order.events ?? []; const jobs = order.job_ids ?? [];
  const ended = [...events].reverse().find((event) => event.action === "reject" || event.action === "cancel");
  const open = (next: OrderAction) => { setAction(next); setReason(""); setReasonError(""); setDialog(true); };
  const buttons = (keys: OrderAction[]) => <div className={layout.actions}>
    {keys.includes("accept") && <Button variant="primary" disabled={write.frozen} onClick={() => open("accept")}>ผู้ขายรับแล้ว</Button>}
    {keys.includes("reject") && <Button variant="danger" disabled={write.frozen} onClick={() => open("reject")}>ผู้ขายปฏิเสธ</Button>}
    {keys.includes("cancel") && <Button variant="text" disabled={write.frozen} onClick={() => open("cancel")}>ยกเลิกใบสั่งซื้อ</Button>}
  </div>;
  return <article className={layout.detailCard} aria-label={`ใบสั่งซื้อ ${order.order_no}`}>
    <Link href={backHref} scroll={false} className={layout.back}><Icon name="arrow" size={16} />กลับไปรายการ</Link>
    <div className={layout.detailHeader}>
      <div><h2>{order.order_no}</h2><p className={layout.meta}>สั่งเมื่อ {dateTimeTH(order.created_at)}</p></div>
      <StatusBadge map={ORDER_STATE} value={tab ?? ""} />
    </div>
    <dl className={layout.facts}>
      <div><dt>ผู้ขาย</dt><dd>{order.supplier.name}</dd>{(order.supplier.phone || order.supplier.email) && <dd className={layout.muted}>{[order.supplier.phone, order.supplier.email].filter(Boolean).join(" · ")}</dd>}</div>
      <div><dt>คาดว่าจะได้รับ</dt><dd>{order.expected_at ? dateTimeTH(order.expected_at) : "ไม่ได้ระบุ"}</dd></div>
      <div><dt>ยอดรวม (ไม่มี VAT)</dt><dd>{bahtTH(order.total_amount)}</dd></div>
    </dl>
    {tab === "pending" && <NextAction title="ผู้ขายตอบว่าอย่างไร?"><p>ติดต่อผู้ขายทางโทรศัพท์ LINE หรืออีเมล แล้วบันทึกคำตอบที่นี่</p>{buttons(actions)}</NextAction>}
    {(tab === "accepted" || tab === "partial") && <NextAction title={tab === "accepted" ? "รอรับของจากผู้ขาย" : "รับของแล้วบางส่วน"}>
      <p>เมื่อของมาถึง ให้บันทึกการรับที่หน้ารับเข้าวัตถุดิบ สต๊อกจะเพิ่มเมื่อบันทึกรับของเท่านั้น</p>
      <div className={layout.actions}><Link href={receivingHref} className={layout.linkButton}>ไปที่รับเข้าวัตถุดิบ</Link>{actions.includes("cancel") && <Button variant="text" disabled={write.frozen} onClick={() => open("cancel")}>ยกเลิกใบสั่งซื้อ</Button>}</div>
    </NextAction>}
    {tab === "received" && <p className={layout.muted}>รับของครบตามใบสั่งซื้อแล้ว</p>}
    {tab === "cancelled" && <p className={layout.problem}>{order.supplier_response === "rejected" ? "ผู้ขายปฏิเสธ" : "ยกเลิกแล้ว"}{ended?.reason ? `: ${ended.reason}` : ""}</p>}
    {write.uncertain ? <RetryPanel busy={write.busy} onRetry={write.retry} onDiscard={() => { write.discard(); onChanged(""); }} /> : <ErrorText error={write.error} />}
    <section className={layout.section} aria-label="รายการวัตถุดิบ">
      <h3>วัตถุดิบ {lines.length} รายการ</h3>
      <ul className={styles.lines}>{lines.map((line) => <li key={line.material_id}>
        <span><strong>{line.material_name}</strong><small>{quantityTH(line.quantity)} {line.unit_name} × {quantityTH(line.unit_cost)} บาท</small></span>
        <strong>{bahtTH(line.total_amount)}</strong>
      </li>)}</ul>
      <p className={styles.total}><span>รวม (ไม่มี VAT)</span><strong>{bahtTH(order.total_amount)}</strong></p>
      <p className={layout.muted}>จำนวน ราคา ผู้ขาย และงานที่เกี่ยวข้องแก้ไม่ได้ ถ้าต้องเปลี่ยน ให้ยกเลิกแล้วสั่งใหม่</p>
    </section>
    <section className={layout.section} aria-label="งานที่เกี่ยวข้อง">
      <h3>งานที่เกี่ยวข้อง</h3>
      {jobs.length ? <RelatedJobs api={api} ids={jobs} /> : <p className={layout.muted}>สั่งเติมสต๊อกทั่วไป ไม่ผูกกับงาน</p>}
    </section>
    <section className={layout.section} aria-label="ประวัติใบสั่งซื้อ">
      <h3>ประวัติ</h3>
      {events.length ? <ol className={layout.timeline}>{events.map((event) => <li key={event.id}>
        <strong><StatusBadge map={ORDER_EVENT} value={event.action} /></strong>
        <span>{dateTimeTH(event.created_at)}{event.reason ? ` · ${event.reason}` : ""}</span>
      </li>)}</ol> : <p className={layout.muted}>ยังไม่มีประวัติ</p>}
    </section>
    <Collapsible title="ประวัติระบบ"><p className={layout.code}>รหัสใบสั่งซื้อ {order.id} · เวอร์ชัน {String(order.version)}</p></Collapsible>
    {action && <ConfirmDialog open={dialog} title={ACTION[action].title} confirmLabel={ACTION[action].confirm} danger={action !== "accept"} checks={["ยืนยันกับผู้ขายนอกระบบแล้ว"]} onClose={() => setDialog(false)} onConfirm={() => {
      if (action !== "accept" && !reason.trim()) { setReasonError("กรอกเหตุผล"); return; }
      setDialog(false);
      write.submit(`/material-orders/${order.id}/actions`, "POST", () => orderActionPayload(action, reason, crypto.randomUUID(), order.version), "");
    }}>
      <p>{order.order_no} · {order.supplier.name}</p><p>{ACTION[action].text}</p>
      <Field label={action === "accept" ? "หมายเหตุ (ไม่บังคับ)" : "เหตุผล"} error={reasonError || undefined}><textarea value={reason} maxLength={2000} aria-invalid={Boolean(reasonError) || undefined} onChange={(event) => setReason(event.target.value)} /></Field>
    </ConfirmDialog>}
  </article>;
}
