import Link from "next/link";
import { Icon } from "../../components/appearance/icons";
import type { RefObject } from "react";
import type { BackendApi } from "../../lib/api/backend-api";
import { formatBangkok } from "../../lib/formatting/display";
import { countText, dayLabel, exactCount, jobsPath, STATUSES, STATUS_LABELS, type Filter, type JobReport, type OverviewReport } from "./overview-domain";
import { ReportError, Skeleton, StatusBadge } from "./overview-panels";
import { useReport } from "./overview-resource";
import styles from "./overview.module.css";

export function OverviewJobs({ api, admin, filter, setFilter, counts, heading }: { api: BackendApi; admin: boolean; filter: Filter; setFilter: (value: Filter) => void; counts?: OverviewReport["counts"]; heading: RefObject<HTMLHeadingElement | null> }) {
  const resource = useReport<JobReport>(api, jobsPath(filter));
  const data = resource.data;
  return <section className={`${styles.panel} ${styles.jobs}`} aria-labelledby="staff-jobs-title" aria-busy={resource.loading}>
    <div className={styles.sectionHead}><div><h2 id="staff-jobs-title" tabIndex={-1} ref={heading}>{filter.day ? "งานที่ผลิตเสร็จครั้งแรกในวันที่เลือก" : "รายการงานผลิต"}</h2><p className={styles.muted}>{filter.day ? dayLabel(filter.day) : "สถานะปัจจุบันของงานที่เปิดในช่วงที่เลือก"}</p></div><button onClick={resource.reload} disabled={resource.loading}>รีเฟรชรายการ</button></div>
    {filter.day ? <div className={styles.filterChip}><span>ผลิตเสร็จครั้งแรก: {dayLabel(filter.day, true)}</span><button onClick={() => setFilter({ ...filter, day: "", status: "", offset: 0 })}>ล้างตัวกรองวันที่</button></div> : <nav className={styles.tabs} aria-label="กรองสถานะงานผลิต">{["", ...STATUSES].map(status => <button key={status} aria-pressed={filter.status === status} onClick={() => setFilter({ ...filter, status: status as Filter["status"], offset: 0 })}>{status ? STATUS_LABELS[status as keyof typeof STATUS_LABELS] : "ทั้งหมด"}<span>{counts ? countText(counts[status ? status as keyof typeof counts : "total"]) : "—"}</span></button>)}</nav>}
    <ReportError error={resource.error} retry={resource.reload} />
    {resource.loading && !data ? <Skeleton label="กำลังโหลดรายการงานผลิต" /> : data && data.items.length ? <>
      <table className={styles.table}><thead><tr><th scope="col">งาน / คำขอ</th><th scope="col">สถานะปัจจุบัน</th><th scope="col">{filter.day ? "เสร็จครั้งแรก" : "เปิดงานเมื่อ"}</th><th scope="col"><span className={styles.srOnly}>เปิดรายละเอียด</span></th></tr></thead><tbody>{data.items.map(job => {
        const href = `${admin ? "/admin" : "/staff"}/production?job=${encodeURIComponent(job.job_id)}`;
        return <tr key={job.job_id}><th scope="row"><Link href={href}>{job.description}</Link><small>คำขอ #{countText(job.request_number)}</small></th><td data-label="สถานะปัจจุบัน"><StatusBadge status={job.status} /></td><td data-label={filter.day ? "เสร็จครั้งแรก" : "เปิดงานเมื่อ"}>{formatBangkok((filter.day ? job.first_completed_at : job.created_at) ?? undefined)}</td><td><Link href={href} className={styles.textLink} aria-label={`เปิดรายละเอียด ${job.description}`}>เปิดงาน<Icon name="arrow" size={16} /></Link></td></tr>;
      })}</tbody></table>
      <div className={styles.pagination}><span>ทั้งหมด {countText(data.total)} งาน · หน้า {Math.floor(filter.offset / 20) + 1}</span><div><button disabled={resource.loading || filter.offset === 0} onClick={() => setFilter({ ...filter, offset: Math.max(0, filter.offset - 20) })}>ก่อนหน้า</button><button disabled={resource.loading || BigInt(filter.offset + data.items.length) >= exactCount(data.total)} onClick={() => setFilter({ ...filter, offset: filter.offset + 20 })}>ถัดไป</button></div></div>
    </> : !resource.error && !resource.loading && data ? <div className={styles.empty}><h3>{filter.day ? "ไม่มีงานผลิตเสร็จครั้งแรกในวันนี้" : filter.status ? "ไม่มีงานตรงกับตัวกรองนี้" : "ยังไม่มีงานผลิตในช่วงนี้"}</h3><p>ลองเลือกช่วงเวลาอื่น หรือเปิดคิวคำขอที่ยังรออนุมัติหลักฐานก่อนเริ่มผลิต</p>{(filter.day || filter.status) && <button onClick={() => setFilter({ ...filter, status: "", day: "", offset: 0 })}>ล้างตัวกรอง</button>}</div> : null}
    {resource.loading && data && <p className={styles.muted} role="status">กำลังอัปเดต… รายการที่เห็นเป็นข้อมูลที่โหลดได้ก่อนหน้า</p>}
  </section>;
}
