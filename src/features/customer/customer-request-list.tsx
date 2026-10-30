import Link from "next/link";
import type { JobRequest } from "../../lib/api/backend-api";
import { Icon } from "../../components/appearance/icons";
import { customerHref, dateTH, latestQuote, requestStatusCounts, REQUEST_LABELS, type CustomerRequestLayout } from "./customer-domain";
import { salesStep, type SalesRecord } from "./customer-sales-data";
import { Badge } from "./customer-ui";
import styles from "./customer-requests.module.css";

export function RequestStatusFilters({ items, query, status, layout, loading, countUnavailable = false }: { items: JobRequest[]; query: string; status: string; layout: CustomerRequestLayout; loading: boolean; countUnavailable?: boolean }) {
  const counts = requestStatusCounts(items, query);
  return <nav className={styles.statusFilters} aria-label="กรองสถานะคำขอ">
    {[["", "ทั้งหมด"], ...Object.entries(REQUEST_LABELS)].map(([value, label]) => <Link key={value} href={customerHref("requests", { q: query, status: value, layout: layout === "list" ? "list" : undefined })} aria-current={status === value ? "page" : undefined}>
      <span>{label}</span><span className={styles.count} aria-hidden="true">{loading ? "…" : countUnavailable ? "—" : value ? counts.byStatus[value] : counts.all}</span>
      <span className={styles.visuallyHidden}>{loading ? "กำลังโหลดจำนวน" : countUnavailable ? "ยังโหลดจำนวนไม่ได้" : ` ${value ? counts.byStatus[value] : counts.all} รายการที่โหลดสำเร็จ`}</span>
    </Link>)}
  </nav>;
}

export function RequestCard({ record, layout = "cards" }: { record: SalesRecord; layout?: CustomerRequestLayout }) {
  const { request } = record;
  const quote = latestQuote(record.quotations); const job = record.fulfillment?.job;
  const next = job ? customerHref("jobs", { job: job.id }) : customerHref(quote?.status === "approved" ? "deposit-po" : "quotations", { request: request.id, quotation: quote?.id });
  return <article className={`${styles.card} ${layout === "list" ? styles.rowCard : ""}`} aria-label={`คำขอ #${request.no_request}`}>
    {layout === "cards" && <div className={styles.cardHeader}><div><span className={styles.metaLabel}>คำขอ</span><strong>#{request.no_request}</strong></div></div>}
    <h2 className={styles.cardTitle}><Link className={styles.openCard} href={customerHref("requests", { request: request.id })} aria-label={`ดูคำขอ #${request.no_request} · ${request.description}`} title={request.description}>{layout === "list" && <span className={styles.rowNumber}>คำขอ #{request.no_request} · </span>}{request.description}</Link></h2>
    <Badge value={request.status} labels={REQUEST_LABELS} />
    <dl className={styles.essentials}><div><dt>จำนวน</dt><dd>{request.qty} ชิ้น</dd></div><div><dt><Icon name="clock" size={15} /> วันที่ต้องการ</dt><dd>{request.deadline ? <time dateTime={request.deadline}>{dateTH(request.deadline)}</time> : "ไม่ได้ระบุ"}</dd></div></dl>
    <div className={styles.nextStep}><p>{salesStep(record)}</p>
      {quote && !record.issue && request.status === "ongoing" && <Link className={`cust-link ${styles.secondaryLink}`} href={next}>{job ? "ติดตามงานผลิต" : quote.status === "approved" ? "ดูหลักฐานมัดจำ / PO" : "ดูใบเสนอราคา"} <Icon name="arrow" size={14} /></Link>}
    </div>
    <footer className={styles.cardFooter}><time dateTime={request.created_at}>ส่งเมื่อ {dateTH(request.created_at)}</time><span className={styles.openHint} aria-hidden="true">ดูรายละเอียด <Icon name="arrow" size={14} /></span></footer>
  </article>;
}

export function RequestCardSkeleton({ layout = "cards" }: { layout?: CustomerRequestLayout } = {}) {
  return <div role="status" aria-label="กำลังโหลดคำขอผลิต"><span className={styles.visuallyHidden}>กำลังโหลดข้อมูล…</span><div className={`${styles.grid} ${layout === "list" ? styles.listView : ""}`} aria-hidden="true">{[0, 1, 2, 3].map((key) => <div key={key} className={`${styles.card} ${layout === "list" ? styles.rowCard : ""} ${styles.skeleton}`}><span /><span /><span /><span /></div>)}</div></div>;
}
