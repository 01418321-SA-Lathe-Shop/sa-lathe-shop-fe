import Link from "next/link";
import type { Customer, JobRequest } from "../../lib/api/backend-api";
import { Icon } from "../../components/appearance/icons";
import { customerHref, dateTH, latestQuote, requestStatusCounts, REQUEST_LABELS } from "./customer-domain";
import { salesStep, type SalesRecord } from "./customer-sales-data";
import { Badge } from "./customer-ui";
import styles from "./customer-requests.module.css";

export function RequestStatusFilters({ items, query, status, loading, countUnavailable = false }: { items: JobRequest[]; query: string; status: string; loading: boolean; countUnavailable?: boolean }) {
  const counts = requestStatusCounts(items, query);
  return <nav className={styles.statusFilters} aria-label="กรองสถานะคำขอ">
    {[["", "ทั้งหมด"], ...Object.entries(REQUEST_LABELS)].map(([value, label]) => <Link key={value} href={customerHref("requests", { q: query, status: value })} aria-current={status === value ? "page" : undefined}>
      <span>{label}</span><span className={styles.count} aria-hidden="true">{loading ? "…" : countUnavailable ? "—" : value ? counts.byStatus[value] : counts.all}</span>
      <span className={styles.visuallyHidden}>{loading ? "กำลังโหลดจำนวน" : countUnavailable ? "ยังโหลดจำนวนไม่ได้" : ` ${value ? counts.byStatus[value] : counts.all} รายการที่โหลดสำเร็จ`}</span>
    </Link>)}
  </nav>;
}

export function RequestCard({ record, profile, profileLoading, profileError }: { record: SalesRecord; profile?: Customer; profileLoading: boolean; profileError?: string }) {
  const { request } = record;
  const quote = latestQuote(record.quotations); const job = record.fulfillment?.job;
  const next = job ? customerHref("jobs", { job: job.id }) : customerHref(quote?.status === "approved" ? "deposit-po" : "quotations", { request: request.id, quotation: quote?.id });
  return <article className={styles.card} aria-label={`คำขอ #${request.no_request}`}>
    <div className={styles.cardHeader}><div><span className={styles.metaLabel}>คำขอ</span><strong>#{request.no_request}</strong></div><Icon name="machine" size={40} /></div>
    <h2 className={styles.cardTitle}><Link className={styles.openCard} href={customerHref("requests", { request: request.id })} aria-label={`ดูคำขอ #${request.no_request} · ${request.description}`} title={request.description}>{request.description}</Link></h2>
    <Badge value={request.status} labels={REQUEST_LABELS} />
    <dl className={styles.dates}>
      <div><dt><Icon name="inbox" size={16} />ส่งคำขอเมื่อ</dt><dd><time dateTime={request.created_at}>{dateTH(request.created_at)}</time></dd></div>
      <div><dt><Icon name="clock" size={16} />วันที่ต้องการรับงาน</dt><dd>{request.deadline ? <time dateTime={request.deadline}>{dateTH(request.deadline)}</time> : "ไม่ได้ระบุวันที่ต้องการ"}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div>
    </dl>
    <div className={styles.nextStep}><p className={styles.quantity}>จำนวน {request.qty} ชิ้น</p><p>{salesStep(record)}</p>
      {quote && !record.issue && request.status === "ongoing" && <Link className={`cust-link ${styles.secondaryLink}`} href={next}>{job ? "ติดตามงานผลิต" : quote.status === "approved" ? "ดูหลักฐานมัดจำ / PO" : "ดูใบเสนอราคา"} <Icon name="arrow" size={14} /></Link>}
    </div>
    <footer className={styles.buyer}><span className={styles.metaLabel}>ผู้สั่ง</span><strong>{profile?.name ?? (profileLoading ? "กำลังโหลดข้อมูลผู้สั่ง…" : profileError ? "ยังโหลดข้อมูลผู้สั่งไม่ได้" : "บัญชีผู้สั่ง")}</strong>{profile && <span>{profile.customer_type === "company" ? "บริษัท" : "บุคคล"}</span>}<span className={styles.openHint} aria-hidden="true">ดูคำขอ <Icon name="arrow" size={14} /></span></footer>
  </article>;
}

export function RequestCardSkeleton() {
  return <div role="status" aria-label="กำลังโหลดคำขอผลิต"><span className={styles.visuallyHidden}>กำลังโหลดข้อมูล…</span><div className={styles.grid} aria-hidden="true">{[0, 1, 2, 3].map((key) => <div key={key} className={`${styles.card} ${styles.skeleton}`}><span /><span /><span /><span /><span /><span /></div>)}</div></div>;
}
