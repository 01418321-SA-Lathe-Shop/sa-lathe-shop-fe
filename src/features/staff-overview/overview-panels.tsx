import Link from "next/link";
import { Icon } from "../../components/appearance/icons";
import { countText, STATUSES, STATUS_LABELS, type JobStatus, type OverviewReport } from "./overview-domain";
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
export function SummaryCards({ data, loading, selected, choose }: { data?: OverviewReport; loading: boolean; selected: JobStatus | ""; choose: (status: JobStatus) => void }) {
  return <section className={styles.summary} aria-label="สถานะปัจจุบันของงานที่เปิดในช่วงที่เลือก" aria-busy={loading}>
    {STATUSES.map(status => <button key={status} className={styles.metric} data-selected={selected === status} aria-pressed={selected === status} disabled={!data} onClick={() => choose(status)}>
      <span>{STATUS_LABELS[status]}<Icon name="arrow" size={16} /></span><strong>{data ? countText(data.counts[status]) : loading ? "…" : "—"}</strong>
      <small>{data ? `${countText(data.counts[status])} จากทั้งหมด ${countText(data.counts.total)} งาน` : loading ? "กำลังตรวจสอบจำนวนงาน" : "ยังไม่มีข้อมูลรายงาน"}</small>
    </button>)}
  </section>;
}
export function PriorityQueue({ data, admin }: { data?: OverviewReport; admin: boolean }) {
  const root = admin ? "/admin" : "/staff";
  const tasks = [
    { label: "คำขอรอประเมิน", hint: admin ? "ติดตามคิวคำขอและใบเสนอราคา" : "เปิดคิวเพื่อประเมินราคา", value: data?.queue.pending_requests, href: `${root}/${admin ? "requests" : "quotations"}`, icon: "file" as const },
    { label: "งานรอเริ่มผลิต", hint: "ตรวจแผนวัตถุดิบก่อนเริ่มงาน", value: data?.queue.queued_jobs, href: `${root}/production`, icon: "machine" as const },
    { label: "วัตถุดิบรอรับเข้า", hint: "คำสั่งซื้อที่ Supplier ตอบรับแล้ว", value: data?.queue.receiving_orders, href: `${root}/receiving`, icon: "layers" as const },
  ];
  return <section className={`${styles.panel} ${styles.queue}`} aria-labelledby="staff-priorities"><h2 id="staff-priorities">ต้องจัดการ</h2><p className={styles.muted}>คิวปัจจุบันทั้งหมด · ไม่จำกัดช่วงเวลา</p><div className={styles.priorityList}>{tasks.map(task => <Link href={task.href} key={task.label}><Icon name={task.icon} size={20} /><div><strong>{task.label}</strong><small>{task.hint}</small></div><span>{task.value === undefined ? "—" : countText(task.value)}</span><Icon name="arrow" size={16} /></Link>)}</div></section>;
}
export function QuickActions({ admin }: { admin: boolean }) {
  const root = admin ? "/admin" : "/staff";
  const actions = [
    { label: "เปิดงานผลิต", href: `${root}/production`, icon: "machine" as const },
    { label: "ตรวจวัตถุดิบ", href: `${root}/materials`, icon: "layers" as const },
    { label: "รับเข้าวัตถุดิบ", href: `${root}/receiving`, icon: "inbox" as const },
    { label: admin ? "จัดการพนักงาน" : "คิวใบเสนอราคา", href: `${root}/${admin ? "workers" : "quotations"}`, icon: "grid" as const },
  ];
  return <section className={`${styles.panel} ${styles.quick}`} aria-labelledby="staff-shortcuts"><h2 id="staff-shortcuts">ไปทำงานต่อ</h2><p className={styles.muted}>{admin ? "ติดตามงานและจัดการร้าน" : "เปิดพื้นที่ทำงานที่ใช้บ่อย"}</p><nav className={styles.shortcuts} aria-label="ทางลัดการทำงาน">{actions.map(action => <Link href={action.href} key={action.href}><Icon name={action.icon} size={22} /><span>{action.label}</span><Icon name="arrow" size={16} /></Link>)}</nav>{admin && <Link className={styles.textLink} href="/admin/orders">สั่งซื้อวัตถุดิบ<Icon name="arrow" size={16} /></Link>}</section>;
}
