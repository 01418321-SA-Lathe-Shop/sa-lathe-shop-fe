import Link from "next/link";
import { useId, useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Notification } from "../../lib/api/backend-api";
import { staffNotice, staffNoticeHref } from "../workspace/workspace-notifications";
import { bangkokTime, countText, dayLabel, exactCount, queueTotal, STATUS_LABELS, type Count, type Filter, type JobStatus, type OverviewReport } from "./overview-domain";
import styles from "./overview.module.css";

export function ReportError({ error, retry }: { error?: string; retry: () => void }) {
  if (!error) return null;
  return <div className={styles.error} role="alert"><strong>ยังโหลดรายงานล่าสุดไม่ได้</strong><p>{/[ก-๙]/.test(error) ? error : "ตรวจสอบการเชื่อมต่อ แล้วลองอีกครั้ง ข้อมูลที่เคยโหลดได้อาจยังไม่ใช่สถานะล่าสุด"}</p><button onClick={retry}>ลองอีกครั้ง</button></div>;
}
export function Skeleton({ label = "กำลังโหลดข้อมูลรายงาน" }: { label?: string }) {
  return <div className={styles.skeleton} role="status" aria-label={label}><span /><span /><span /><span className={styles.srOnly}>{label}</span></div>;
}
export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={styles.badge} data-status={status}><i aria-hidden="true" />{STATUS_LABELS[status] ?? "ยังไม่ระบุสถานะ"}</span>;
}

const STRIP_STATUSES: JobStatus[] = ["in_progress", "queued", "completed"];
export type ActionTask = { label: string; hint: string; action: string; value?: Count; href: string };
/** Queue backlog plus the page's own alerts; a read still missing gives NaN (a dash), never a smaller total. */
export function actionTotal(queue: OverviewReport["queue"], tasks: ActionTask[]): Count {
  try { return tasks.reduce((sum, task) => sum + exactCount(task.value ?? NaN), exactCount(queueTotal(queue))).toString(); } catch { return NaN; }
}

export function SummaryStrip({ data, loading, total, selected, choose }: { data?: OverviewReport; loading: boolean; total?: Count; selected: JobStatus | ""; choose: (status: JobStatus) => void }) {
  const empty = loading ? "…" : "—";
  return <section className={styles.strip} aria-label="สรุปงานในช่วงที่เลือก" aria-busy={loading}>
    <div data-tone="action"><span>ต้องจัดการ</span><strong>{total !== undefined ? countText(total) : empty}</strong></div>
    {STRIP_STATUSES.map(status => <button key={status} className={styles.cell} data-tone={status} aria-pressed={selected === status} disabled={!data} onClick={() => choose(status)}><span>{STATUS_LABELS[status]}</span><strong>{data ? countText(data.counts[status]) : empty}</strong></button>)}
  </section>;
}

export function TodayDigest({ admin, inbox, report, notices, choose }: { admin: boolean; inbox: string; report?: OverviewReport; notices?: Notification[]; choose: { opened: () => void; finished: (day: string) => void; active: Filter } }) {
  const id = useId(); const [all, setAll] = useState(false);
  const today = report?.heatmap.end_date;
  const finished: Count | undefined = report?.heatmap.days.find(day => day.date === today)?.count;
  const openedOn = choose.active.range === "today" && !choose.active.day && !choose.active.status;
  const finishedOn = Boolean(today) && choose.active.day === today;
  return <section className={styles.panelFlush} aria-labelledby={id}>
    <div className={styles.flushHead}><h2 id={id}>{today ? `วันนี้ ${dayLabel(today, true)}` : "วันนี้"}</h2><span className={styles.muted}>ทั้งร้าน · กดกล่องเพื่อดูงาน</span></div>
    <div className={styles.digest}>
      <button className={styles.cell} aria-pressed={openedOn} disabled={!report} onClick={choose.opened}><span><i data-dot="open" aria-hidden="true" />เปิดงานใหม่</span><strong>{report ? countText(report.counts.total) : "—"} งาน</strong><small>{report ? `กำลังผลิต ${countText(report.counts.in_progress)} งาน` : "ยังไม่มีข้อมูล"}</small></button>
      <button className={styles.cell} aria-pressed={finishedOn} disabled={!today} onClick={() => today && choose.finished(today)}><span><i data-dot="done" aria-hidden="true" />ผลิตเสร็จ</span><strong>{finished === undefined ? "—" : countText(finished)} งาน</strong><small>นับครั้งแรกของแต่ละงาน</small></button>
      <Link href={inbox}><span><i data-dot="notice" aria-hidden="true" />การแจ้งเตือน</span><strong>{notices ? countText(notices.length) : "—"} รายการ</strong><small>ของวันนี้ · เปิดกล่องแจ้งเตือน</small></Link>
    </div>
    <div className={styles.log}>
      <h3>เกิดอะไรขึ้นวันนี้</h3>
      {notices && !notices.length && <p className={styles.muted}>ยังไม่มีการแจ้งเตือนวันนี้</p>}
      {Boolean(notices?.length) && <ol>{notices!.slice(0, all ? undefined : 5).map(item => { const notice = staffNotice(item.title); return <li key={item.id}><time dateTime={item.created_at}>{bangkokTime(item.created_at)}</time><Link href={staffNoticeHref(admin, item.request_id)}>{notice.text}{notice.reference && <b> คำขอ #{notice.reference}</b>}</Link></li>; })}</ol>}
      {notices && notices.length > 5 && <button className={styles.more} onClick={() => setAll(!all)}>{all ? "แสดงน้อยลง" : `แสดงทั้งหมด ${countText(notices.length)} รายการ`}</button>}
    </div>
  </section>;
}

export function PriorityQueue({ data, admin, extra }: { data?: OverviewReport; admin: boolean; extra: ActionTask[] }) {
  const id = useId();
  const root = admin ? "/admin" : "/staff";
  const tasks: ActionTask[] = [
    { label: "คำขอรอประเมิน", hint: admin ? "ติดตามคิวคำขอและใบเสนอราคา" : "เปิดคิวเพื่อประเมินราคา", action: admin ? "ดูคำขอ" : "ประเมินราคา", value: data?.queue.pending_requests, href: `${root}/${admin ? "requests" : "quotations"}` },
    { label: "งานรอเริ่มผลิต", hint: "ตรวจแผนวัตถุดิบก่อนเริ่มงาน", action: "เปิดงานผลิต", value: data?.queue.queued_jobs, href: `${root}/production` },
    { label: "วัตถุดิบรอรับเข้า", hint: "คำสั่งซื้อที่ Supplier ตอบรับแล้ว", action: "รับเข้าวัตถุดิบ", value: data?.queue.receiving_orders, href: `${root}/receiving` },
    ...extra,
  ].filter(task => task.value === undefined || countText(task.value) !== "0");
  return <section className={styles.panelFlush} aria-labelledby={id}>
    <div className={styles.flushHead}><div className={styles.titleCount}><h2 id={id}>ต้องจัดการ</h2><span>{data ? countText(actionTotal(data.queue, extra)) : "—"}</span></div><span className={styles.muted}>คิวปัจจุบันทั้งหมด · ไม่จำกัดช่วงเวลา</span></div>
    {tasks.length ? <ul className={styles.todo}>{tasks.map(task => <li key={task.label}><i aria-hidden="true" /><div><strong>{task.label}</strong><small>{task.hint}</small></div><span>{task.value === undefined ? "—" : `${countText(task.value)} รายการ`}</span><Link href={task.href}>{task.action}<Icon name="arrow" size={14} /></Link></li>)}</ul>
      : <p className={styles.caughtUp}>ไม่มีงานค้าง ตอนนี้ไม่มีอะไรต้องจัดการ</p>}
  </section>;
}
