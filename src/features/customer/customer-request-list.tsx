import Link from "next/link";
import type { JobRequest } from "../../lib/api/backend-api";
import { customerHref, requestStatusCounts, REQUEST_LABELS } from "./customer-domain";
import styles from "./customer-requests.module.css";

export function RequestStatusFilters({ items, query, status, loading }: { items: JobRequest[]; query: string; status: string; loading: boolean }) {
  const counts = requestStatusCounts(items, query);
  return <nav className={styles.statusFilters} aria-label="กรองสถานะคำขอ">
    {[["", "ทั้งหมด"], ...Object.entries(REQUEST_LABELS)].map(([value, label]) => <Link key={value} href={customerHref("requests", { q: query, status: value })} aria-current={status === value ? "page" : undefined}>
      <span>{label}</span><span className={styles.count} aria-hidden="true">{loading ? "…" : value ? counts.byStatus[value] : counts.all}</span>
      <span className={styles.visuallyHidden}>{loading ? "กำลังโหลดจำนวน" : ` ${value ? counts.byStatus[value] : counts.all} รายการที่โหลดสำเร็จ`}</span>
    </Link>)}
  </nav>;
}
