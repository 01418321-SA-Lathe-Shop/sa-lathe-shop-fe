import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import { customerHref, dateTH, DELIVERY_LABELS, INVOICE_LABELS, JOB_LABELS, moneyTH, relativeTH } from "./customer-domain";
import { dueState, type DashboardAction, type DashboardJob, type WorkUpdate } from "./customer-overview-domain";
import { Badge } from "./customer-ui";
import styles from "./customer-overview.module.css";

export function PanelState({ loading, unavailable }: { loading?: boolean; unavailable?: boolean }) {
  if (loading) return <div className={styles.skeleton} role="status" aria-label="กำลังโหลดข้อมูลสรุป"><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /><span className={styles.srOnly}>กำลังโหลดข้อมูลสรุป…</span></div>;
  return <p className={styles.empty}>{unavailable ? "ยังสรุปรายการนี้ไม่ได้ กรุณากดลองอีกครั้งในข้อความแจ้งข้อผิดพลาด" : "ยังไม่มีข้อมูลรายการนี้"}</p>;
}

export function OverviewAttention({ items, complete }: { items: DashboardAction[]; complete: boolean }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className={styles.empty}>{complete ? "ตอนนี้ไม่มีรายการที่คุณต้องดำเนินการ ติดตามงานต่อได้ด้านล่าง" : "ยังไม่พบรายการที่ต้องทำในข้อมูลที่โหลดได้ กรุณาอัปเดตเพื่อดูรายการที่เหลือ"}</p>;
  return <><ul className={styles.actionList}>{items.slice(0, expanded ? items.length : 1).map(item => <li key={item.id}>
    <div><strong>{item.title}</strong><p className={styles.workName} title={item.name}>{item.name}</p><small>{item.reference} · {item.description}</small></div>
    <div className={styles.actionEnd}>{item.due && <small>{item.dueLabel}<time dateTime={item.due}>{dateTH(item.due)}</time></small>}<Link className={styles.outlineAction} href={item.href}>{item.action}<Icon name="arrow" size={16} /></Link></div>
  </li>)}</ul>{items.length > 1 && <button className={styles.more} type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "แสดงน้อยลง" : `ดูสิ่งที่ต้องทำอีก ${items.length - 1} รายการ`}</button>}</>;
}

function PeekMore({ remaining, expanded, onToggle }: { remaining: number; expanded: boolean; onToggle: () => void }) {
  return remaining > 0 ? <button type="button" className={styles.more} aria-expanded={expanded} onClick={onToggle}>{expanded ? "แสดงน้อยลง" : `ดูเพิ่มอีก ${remaining} รายการ`}</button> : null;
}

export function OverviewPayments({ items, now }: { items: (DashboardJob & { due: string })[]; now: number | null }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className={styles.empty}>ไม่มีใบแจ้งหนี้ค้างชำระในรายการที่โหลดได้ มัดจำ / PO ดูในสิ่งที่คุณต้องทำ</p>;
  return <><ul className={styles.rows}>{items.slice(0, expanded ? items.length : 2).map(({ job, name, reference, due }) => {
    const invoice = job.invoice!;
    const state = dueState(due, now);
    return <li key={job.job_id} className={styles.paymentRow}>
      <div><Link className={styles.documentLink} href={customerHref("payments", { job: job.job_id })}>{invoice.number}<Icon name="arrow" size={16} /></Link><p className={styles.workName} title={name}>{name}</p><small>{reference}</small><Badge value={invoice.status} labels={INVOICE_LABELS} /></div>
      <div className={styles.paymentEnd}><strong>{moneyTH(invoice.balance)}</strong><span className={state === "เกินกำหนด" ? styles.overdue : styles.due}>{state}</span><time dateTime={due}>{dateTH(due)}</time>{job.payments?.some(payment => payment.status === "pending") && <small>มีหลักฐานรอตรวจ · ยอดยังไม่ลด</small>}</div>
    </li>;
  })}</ul><PeekMore remaining={items.length - 2} expanded={expanded} onToggle={() => setExpanded(!expanded)} /></>;
}

export function OverviewReady({ items }: { items: DashboardJob[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className={styles.empty}>ยังไม่มีงานผลิตเสร็จหรือรอตรวจรับในรายการที่โหลดได้</p>;
  return <><ul className={styles.rows}>{items.slice(0, expanded ? items.length : 2).map(({ job, href, name, reference }) => {
    const last = job.deliveries?.at(-1);
    const shipping = last?.status === "shipping";
    return <li className={styles.readyRow} key={job.job_id}><Badge value={shipping ? "shipping" : "completed"} labels={shipping ? DELIVERY_LABELS : JOB_LABELS} /><Link className={styles.workLink} href={href} title={name}><span className={styles.truncate}>{name}</span><Icon name="arrow" size={16} /></Link><small>{reference}</small>
      {shipping ? <><p>จัดส่งเมื่อ <time dateTime={last.shipped_at}>{dateTH(last.shipped_at)}</time></p><Link className={styles.outlineAction} href={customerHref("delivery-payment", { job: job.job_id })}>ตรวจรับงาน<Icon name="arrow" size={16} /></Link></> : <p>ผลิตเสร็จแล้ว · ยังไม่มีการจัดส่งรอบนี้</p>}
    </li>;
  })}</ul><PeekMore remaining={items.length - 2} expanded={expanded} onToggle={() => setExpanded(!expanded)} /></>;
}

export function OverviewWork({ items }: { items: DashboardJob[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className={styles.empty}>ยังไม่มีงานผลิตที่กำลังดำเนินการ ส่งคำขอใหม่หรือดูสถานะคำขอของคุณ</p>;
  return <><ul className={styles.rows}>{items.slice(0, expanded ? items.length : 3).map(({ job, href, name, reference, request }) => <li className={styles.workRow} key={job.job_id}>
    <div><Link className={styles.workLink} href={href}><span className={styles.truncate}>{name}</span><Icon name="arrow" size={16} /></Link><small>{reference}{request ? ` · จำนวน ${request.qty}` : ""}</small>{job.cycle > 1 && <small>รอบแก้ไขงาน · Job เดิม ไม่เพิ่มราคา</small>}</div>
    <Badge value={job.job_status} labels={JOB_LABELS} />
  </li>)}</ul><PeekMore remaining={items.length - 3} expanded={expanded} onToggle={() => setExpanded(!expanded)} /></>;
}

const activityIcon = { request: "inbox", quote: "file", evidence: "wallet", job: "machine", delivery: "truck", invoice: "file" } as const;
export function OverviewActivity({ items, now }: { items: WorkUpdate[]; now: number | null }) {
  const [limit, setLimit] = useState(2);
  if (!items.length) return <p className={styles.empty}>เมื่อมีประวัติคำขอหรือความคืบหน้าที่บันทึกเวลาไว้ จะแสดงที่นี่</p>;
  return <><ol className={styles.activity}>{items.slice(0, limit).map(item => <li key={item.id}>
    <span className={styles.marker}><Icon name={activityIcon[item.kind]} size={16} /></span>
    <div><strong>{item.title}</strong><Link href={item.href}><span className={styles.truncate}>{item.name}</span><Icon name="arrow" size={14} /></Link><div className={styles.activityMeta}><small>{item.reference}</small><time dateTime={item.at} title={dateTH(item.at)}>{now === null ? dateTH(item.at) : relativeTH(item.at, now)}</time></div></div>
  </li>)}</ol>{items.length > limit && <button className={styles.more} type="button" onClick={() => setLimit(value => value + 2)}>แสดงอัปเดตเพิ่มเติม ({items.length - limit})</button>}</>;
}
