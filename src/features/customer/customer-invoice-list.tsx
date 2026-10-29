"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { JobRequest } from "../../lib/api/backend-api";
import { availableActions, type FulfillmentJob, type Invoice } from "../delivery/delivery-domain";
import { customerHref, dateTH, INVOICE_LABELS, moneyTH, type Collection } from "./customer-domain";
import { useNow } from "./customer-hooks";
import { dueCountdown, invoicedJobs, invoiceStatusCounts, invoiceSummary, paidPercent } from "./customer-invoice-domain";
import { Badge, Empty, Limited, LocalPages, PageTitle, ResourceFeedback } from "./customer-ui";
import styles from "./customer-invoices.module.css";

type Read<T> = { data?: Collection<T>; loading: boolean; error?: string; reload: () => void };

export function CustomerInvoiceList({ jobs, requests }: { jobs: Read<FulfillmentJob>; requests: Read<JobRequest> }) {
  const status = useSearchParams().get("status") ?? ""; const now = useNow();
  const [paging, setPaging] = useState({ status, page: 0 });
  const items = jobs.data?.items ?? []; const lookup = new Map(requests.data?.items.map((request) => [request.id, request]));
  const rows = invoicedJobs(items, status); const counts = invoiceStatusCounts(items); const summary = invoiceSummary(items, now);
  const page = Math.min(paging.status === status ? paging.page : 0, Math.max(0, Math.ceil(rows.length / 20) - 1));
  const known = Boolean(jobs.data); const value = (count: number | null) => !known ? (jobs.loading ? "…" : "—") : count === null ? "…" : String(count);
  return <section className={styles.list}><PageTitle title="ใบแจ้งหนี้และการชำระเงิน" description="ดูยอดที่ต้องชำระ วันครบกำหนด และส่งหลักฐานการโอนได้ในที่เดียว" />
    <dl className={styles.summary} aria-label="สรุปใบแจ้งหนี้ที่โหลดสำเร็จ">
      <div className={styles.summaryMain}><dt><Icon name="wallet" size={18} />ยอดค้างชำระรวม</dt><dd>{known ? summary.outstanding ? moneyTH(summary.outstanding) : "ไม่พบยอดเงิน" : value(null)}</dd><small>{known ? `จาก ${summary.open} ใบที่ยังชำระไม่ครบ · ไม่มี VAT` : "กำลังรวมยอดจากใบแจ้งหนี้"}</small></div>
      <div data-alert={summary.overdue ? "danger" : undefined}><dt><Icon name="clock" size={18} />เกินกำหนดชำระ</dt><dd>{value(summary.overdue)}<span>ใบ</span></dd><small>{summary.overdue ? "ชำระหรือติดต่อร้านโดยเร็ว" : "ไม่มีใบที่เกินกำหนด"}</small></div>
      <div><dt><Icon name="file" size={18} />หลักฐานรอตรวจ</dt><dd>{value(summary.pending)}<span>ใบ</span></dd><small>ยอดจะลดเมื่อร้านอนุมัติแล้ว</small></div>
    </dl>
    <nav className={styles.statusFilters} aria-label="กรองสถานะใบแจ้งหนี้">{[["", "ทั้งหมด"], ...Object.entries(INVOICE_LABELS)].map(([key, label]) => <Link key={key} href={customerHref("payments", { status: key })} aria-current={status === key ? "page" : undefined} scroll={false}>
      <span>{label}</span><span className={styles.count} aria-hidden="true">{known ? key ? counts.byStatus[key] : counts.all : jobs.loading ? "…" : "—"}</span><span className={styles.visuallyHidden}>{known ? ` ${key ? counts.byStatus[key] : counts.all} ใบ` : ""}</span>
    </Link>)}</nav>
    <ResourceFeedback {...jobs} loading={false} /><ResourceFeedback {...requests} loading={false} />
    <Limited complete={jobs.data?.complete === false || requests.data?.complete === false ? false : undefined} />
    {jobs.loading && !jobs.data && <InvoiceCardSkeleton />}
    <div className={styles.grid}>{rows.slice(page * 20, page * 20 + 20).map((job) => <InvoiceCard key={job.job_id} job={job} invoice={job.invoice!} request={lookup.get(job.request_id)} requestLoading={requests.loading} now={now} />)}</div>
    {jobs.data && !jobs.loading && !jobs.error && !rows.length && <Empty title={status ? "ไม่พบใบแจ้งหนี้ในสถานะที่เลือก" : "ยังไม่มีใบแจ้งหนี้"} action={<Link href={status ? "/customer/payments" : "/customer/jobs"}>{status ? "ดูใบแจ้งหนี้ทั้งหมด" : "ดูงานผลิต"}</Link>}>{status ? "ลองเลือกสถานะอื่น" : "ร้านจะออกใบแจ้งหนี้หลังผลิตงานเสร็จ ยอดคือราคางานหักมัดจำแล้ว"}</Empty>}
    <LocalPages count={rows.length} page={page} setPage={(next) => setPaging({ status, page: next })} />
  </section>;
}

export function PaidProgress({ invoice }: { invoice: Invoice }) {
  const percent = paidPercent(invoice);
  if (percent === null) return null;
  return <div className={styles.progress}>
    <div className={styles.progressLabels}><span>ชำระอนุมัติแล้ว <strong>{moneyTH(invoice.paid)}</strong></span><span>จาก {moneyTH(invoice.amount)}</span></div>
    <div className={styles.track} role="progressbar" aria-label="สัดส่วนที่ชำระอนุมัติแล้ว" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent}%`}><span style={{ width: `${percent}%` }} /></div>
  </div>;
}

export function DueChip({ invoice, now }: { invoice: Invoice; now: number | null }) {
  const due = dueCountdown(invoice, now);
  return due ? <span className={styles.dueChip} data-tone={due.tone}>{due.text}</span> : null;
}

function InvoiceCard({ job, invoice, request, requestLoading, now }: { job: FulfillmentJob; invoice: Invoice; request?: JobRequest; requestLoading: boolean; now: number | null }) {
  const canPay = availableActions(job, "customer").includes("bank"); const pending = job.payments?.some((payment) => payment.status === "pending");
  const title = request?.description ?? (requestLoading ? "กำลังโหลดรายละเอียดงาน…" : "งานผลิตของคุณ");
  return <article className={styles.card} data-status={invoice.status} aria-label={`ใบแจ้งหนี้ ${invoice.number}`}>
    <div className={styles.cardHeader}><div><span className={styles.metaLabel}>ใบแจ้งหนี้</span><strong>{invoice.number}</strong></div><Badge value={invoice.status} labels={INVOICE_LABELS} /></div>
    <h2 className={styles.cardTitle}><Link className={styles.openCard} href={customerHref("payments", { job: job.job_id })} aria-label={`เปิดใบแจ้งหนี้ ${invoice.number} · ${title}`} title={title}>{title}</Link></h2>
    <p className={styles.metaLabel}>{request ? `คำขอ #${request.no_request}` : requestLoading ? "กำลังโหลดคำขอ…" : "ยังโหลดข้อมูลคำขอไม่ได้"}</p>
    <div className={styles.balance}><span>ยอดคงเหลือ</span><strong>{moneyTH(invoice.balance)}</strong></div>
    <PaidProgress invoice={invoice} />
    <div className={styles.dueRow}><span><Icon name="clock" size={16} />ครบกำหนด <time dateTime={invoice.due_at}>{dateTH(invoice.due_at)}</time></span><DueChip invoice={invoice} now={now} /></div>
    {pending && <p className={styles.pendingNote}>มีหลักฐานรอตรวจ · ยอดคงเหลือยังไม่ลด</p>}
    <footer className={styles.cardFooter}><span className={styles.openHint} data-primary={canPay || undefined} aria-hidden="true">{canPay ? "ชำระเงิน / ส่งหลักฐาน" : "ดูใบแจ้งหนี้และประวัติ"} <Icon name="arrow" size={14} /></span></footer>
  </article>;
}

function InvoiceCardSkeleton() {
  return <div role="status" aria-label="กำลังโหลดใบแจ้งหนี้"><span className={styles.visuallyHidden}>กำลังโหลดข้อมูล…</span><div className={styles.grid} aria-hidden="true">{[0, 1].map((key) => <div key={key} className={`${styles.card} ${styles.skeleton}`}><span /><span /><span /><span /><span /></div>)}</div></div>;
}
