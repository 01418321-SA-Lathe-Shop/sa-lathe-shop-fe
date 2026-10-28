import Link from "next/link";
import type { JobRequest } from "../../lib/api/backend-api";
import { Icon } from "../../components/appearance/icons";
import { availableActions, type FulfillmentJob } from "../delivery/delivery-domain";
import { customerHref, dateTH, DELIVERY_LABELS, JOB_LABELS } from "./customer-domain";
import { Badge } from "./customer-ui";
import styles from "./customer-requests.module.css";

export function JobStatusFilters({ counts, query, status, loading, unavailable }: { counts: { all: number; byStatus: Record<string, number> }; query: string; status: string; loading: boolean; unavailable: boolean }) {
  return <nav className={styles.statusFilters} aria-label="กรองสถานะการผลิต">{[["", "ทั้งหมด"], ...Object.entries(JOB_LABELS)].map(([value, label]) => <Link key={value} href={customerHref("jobs", { q: query, status: value })} aria-current={status === value ? "page" : undefined}>
    <span>{label}</span><span className={styles.count} aria-hidden="true">{loading ? "…" : unavailable ? "—" : value ? counts.byStatus[value] : counts.all}</span><span className={styles.visuallyHidden}>{loading ? "กำลังโหลดจำนวน" : unavailable ? "ยังโหลดจำนวนไม่ได้" : ` ${value ? counts.byStatus[value] : counts.all} รายการที่โหลดสำเร็จ`}</span>
  </Link>)}</nav>;
}

export function JobCard({ job, request, requestLoading }: { job: FulfillmentJob; request?: JobRequest; requestLoading: boolean }) {
  const delivery = job.deliveries?.at(-1); const inspect = availableActions(job, "customer").includes("inspect");
  const title = request?.description ?? "งานผลิตของคุณ";
  return <article className={styles.card} aria-label={request ? `งานผลิต · คำขอ #${request.no_request}` : "งานผลิตของคุณ"}>
    <div className={styles.cardHeader}><div><span className={styles.metaLabel}>งานผลิต · อ้างอิงคำขอ</span><strong>{request ? `#${request.no_request}` : requestLoading ? "กำลังโหลดคำขอ…" : "ยังโหลดข้อมูลคำขอไม่ได้"}</strong></div><Icon name="machine" size={40} /></div>
    <h2 className={styles.cardTitle}><Link className={styles.openCard} href={customerHref("jobs", { job: job.job_id })} aria-label={`ดูงานผลิต${request ? `ของคำขอ #${request.no_request}` : ""} · ${title}`} title={title}>{title}</Link></h2>
    <Badge value={job.job_status} labels={JOB_LABELS} />
    <dl className={styles.dates}>
      <div><dt><Icon name="inbox" size={16} />ส่งคำขอเมื่อ</dt><dd>{request ? <time dateTime={request.created_at}>{dateTH(request.created_at)}</time> : requestLoading ? "กำลังโหลดวันที่…" : "ยังไม่มีข้อมูลวันที่ส่งคำขอ"}</dd></div>
      <div><dt><Icon name="clock" size={16} />วันที่ลูกค้าต้องการ</dt><dd>{request?.deadline ? <time dateTime={request.deadline}>{dateTH(request.deadline)}</time> : request ? "ไม่ได้ระบุวันที่ต้องการ" : requestLoading ? "กำลังโหลดวันที่…" : "ยังโหลดวันที่ต้องการไม่ได้"}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div>
    </dl>
    <div className={styles.nextStep}><p className={styles.quantity}>{request ? `จำนวน ${request.qty} ชิ้น` : "ยังไม่มีข้อมูลจำนวนชิ้นงาน"}</p><p>กำหนดส่งที่ร้านยืนยัน: ยังไม่มีข้อมูล</p>{job.cycle > 1 && <p>รอบแก้ไขงาน · Job เดิม ไม่เพิ่มราคา</p>}</div>
    <footer className={styles.buyer}><span className={styles.metaLabel}>การส่งมอบ</span><strong>{delivery ? DELIVERY_LABELS[delivery.status] : "ยังไม่มีการจัดส่ง"}</strong><span className={styles.openHint} aria-hidden="true">{inspect ? "ดูงานและตรวจรับ" : "ดูความคืบหน้า"} <Icon name="arrow" size={14} /></span></footer>
  </article>;
}

export function JobCardSkeleton() {
  return <div role="status" aria-label="กำลังโหลดงานผลิต"><span className={styles.visuallyHidden}>กำลังโหลดข้อมูล…</span><div className={styles.grid} aria-hidden="true">{[0, 1, 2, 3].map((key) => <div key={key} className={`${styles.card} ${styles.skeleton}`}><span /><span /><span /><span /><span /><span /></div>)}</div></div>;
}
