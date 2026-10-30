import Link from "next/link";
import type { JobRequest } from "../../lib/api/backend-api";
import { Icon } from "../../components/appearance/icons";
import { availableActions, type FulfillmentJob } from "../delivery/delivery-domain";
import { customerHref, DELIVERY_LABELS, JOB_LABELS, type CustomerRequestLayout } from "./customer-domain";
import { Badge } from "./customer-ui";
import styles from "./customer-requests.module.css";

export function JobStatusFilters({ counts, query, status, layout = "cards", loading, unavailable }: { counts: { all: number; byStatus: Record<string, number> }; query: string; status: string; layout?: CustomerRequestLayout; loading: boolean; unavailable: boolean }) {
  return <nav className={styles.statusFilters} aria-label="กรองสถานะการผลิต">{[["", "ทั้งหมด"], ...Object.entries(JOB_LABELS)].map(([value, label]) => <Link key={value} href={customerHref("jobs", { q: query, status: value, layout: layout === "list" ? "list" : undefined })} aria-current={status === value ? "page" : undefined}>
    <span>{label}</span><span className={styles.count} aria-hidden="true">{loading ? "…" : unavailable ? "—" : value ? counts.byStatus[value] : counts.all}</span><span className={styles.visuallyHidden}>{loading ? "กำลังโหลดจำนวน" : unavailable ? "ยังโหลดจำนวนไม่ได้" : ` ${value ? counts.byStatus[value] : counts.all} รายการที่โหลดสำเร็จ`}</span>
  </Link>)}</nav>;
}

export function JobCard({ job, request, requestLoading, layout = "cards" }: { job: FulfillmentJob; request?: JobRequest; requestLoading: boolean; layout?: CustomerRequestLayout }) {
  const delivery = job.deliveries?.at(-1); const inspect = availableActions(job, "customer").includes("inspect");
  const title = request?.description ?? "งานผลิตของคุณ";
  return <article className={[styles.card, layout === "list" && styles.rowCard].filter(Boolean).join(" ")} aria-label={request ? `งานผลิต · คำขอ #${request.no_request}` : "งานผลิตของคุณ"}>
    {layout === "cards" && <div className={styles.cardHeader}><div><span className={styles.metaLabel}>งานผลิต · อ้างอิงคำขอ</span><strong>{request ? `#${request.no_request}` : requestLoading ? "กำลังโหลดคำขอ…" : "ยังโหลดข้อมูลคำขอไม่ได้"}</strong></div></div>}
    <h2 className={styles.cardTitle}><Link className={styles.openCard} href={customerHref("jobs", { job: job.job_id })} aria-label={`ดูงานผลิต${request ? `ของคำขอ #${request.no_request}` : ""} · ${title}`} title={title}>{layout === "list" && <span className={styles.rowNumber}>{request ? `คำขอ #${request.no_request} · ` : requestLoading ? "กำลังโหลดคำขอ · " : "ยังโหลดคำขอไม่ได้ · "}</span>}{title}</Link></h2>
    <Badge value={job.job_status} labels={JOB_LABELS} />
    <dl className={styles.essentials}><div><dt>จำนวน</dt><dd>{request ? `${request.qty} ชิ้น` : requestLoading ? "กำลังโหลด…" : "ยังไม่มีข้อมูล"}</dd></div><div><dt>การส่งมอบ</dt><dd>{delivery ? DELIVERY_LABELS[delivery.status] : "ยังไม่มีการจัดส่ง"}</dd></div></dl>
    {job.cycle > 1 && <div className={styles.nextStep}><p>รอบแก้ไขงาน · Job เดิม ไม่เพิ่มราคา</p></div>}
    <footer className={`${styles.cardFooter} ${styles.jobFooter}`}><span className={styles.openHint} aria-hidden="true">{inspect ? "ดูงานและตรวจรับ" : "ดูความคืบหน้า"} <Icon name="arrow" size={14} /></span></footer>
  </article>;
}

export function JobCardSkeleton({ layout = "cards" }: { layout?: CustomerRequestLayout } = {}) {
  return <div role="status" aria-label="กำลังโหลดงานผลิต"><span className={styles.visuallyHidden}>กำลังโหลดข้อมูล…</span><div className={`${styles.grid} ${layout === "list" ? styles.listView : ""}`} aria-hidden="true">{[0, 1, 2, 3].map((key) => <div key={key} className={`${styles.card} ${layout === "list" ? styles.rowCard : ""} ${styles.skeleton}`}><span /><span /><span /><span /></div>)}</div></div>;
}
