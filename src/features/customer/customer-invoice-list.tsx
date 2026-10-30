"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { JobRequest } from "../../lib/api/backend-api";
import type { FulfillmentJob, Invoice } from "../delivery/delivery-domain";
import { customerHref, dateTH, EVIDENCE_LABELS, INVOICE_LABELS, moneyTH, type Collection } from "./customer-domain";
import { useNow } from "./customer-hooks";
import { dueCountdown, invoicedJobs, invoiceStatusCounts, invoiceSummary, paidPercent, paymentLedger, type LedgerRow } from "./customer-invoice-domain";
import { Badge, Empty, Limited, LocalPages, PageTitle, ResourceFeedback } from "./customer-ui";
import styles from "./customer-invoices.module.css";

type Read<T> = { data?: Collection<T>; loading: boolean; error?: string; reload: () => void };
const METHOD_LABELS = { bank: "โอนเงิน", cash: "เงินสด" };

export function CustomerInvoiceList({ jobs, requests }: { jobs: Read<FulfillmentJob>; requests: Read<JobRequest> }) {
  const query = useSearchParams(); const status = query.get("status") ?? ""; const history = query.get("view") === "history"; const now = useNow();
  const [search, setSearch] = useState(""); const [paging, setPaging] = useState({ key: "", page: 0 }); const key = `${history}:${status}:${search}`;
  const items = jobs.data?.items ?? []; const lookup = new Map(requests.data?.items.map((request) => [request.id, request]));
  const needle = search.trim().toLowerCase();
  const matches = (job: FulfillmentJob, reference = "") => { const request = lookup.get(job.request_id); return !needle || `${job.invoice?.number ?? ""} ${reference} ${job.job_id.slice(0, 8)} ${request?.no_request ?? ""} ${request?.description ?? ""}`.toLowerCase().includes(needle); };
  const rows = invoicedJobs(items, status).filter((job) => matches(job)); const ledger = paymentLedger(items); const ledgerRows = ledger.filter((row) => matches(row.job, row.reference)); const counts = invoiceStatusCounts(items); const summary = invoiceSummary(items, now);
  const count = history ? ledgerRows.length : rows.length; const page = Math.min(paging.key === key ? paging.page : 0, Math.max(0, Math.ceil(count / 20) - 1));
  const known = Boolean(jobs.data); const value = (number: number | null) => !known ? (jobs.loading ? "…" : "—") : number === null ? "…" : String(number);
  const tab = (href: string, label: string, number: number, current: boolean) => <Link key={label} href={href} aria-current={current ? "page" : undefined} scroll={false}><span>{label}</span><span className={styles.count} aria-hidden="true">{known ? number : jobs.loading ? "…" : "—"}</span><span className={styles.visuallyHidden}>{known ? ` ${number} รายการ` : ""}</span></Link>;
  return <section className={styles.list}><PageTitle title="ใบแจ้งหนี้และการชำระเงิน" description="ดูยอดที่ต้องชำระ ประวัติการชำระ และส่งหลักฐานการโอนได้ในที่เดียว" />
    <dl className={styles.summary} aria-label="สรุปใบแจ้งหนี้ที่โหลดสำเร็จ">
      <div className={styles.summaryMain}><dt><Icon name="wallet" size={18} />ยอดค้างชำระรวม</dt><dd>{known ? summary.outstanding ? moneyTH(summary.outstanding) : "ไม่พบยอดเงิน" : value(null)}</dd><small>{known ? `จาก ${summary.open} ใบที่ยังชำระไม่ครบ · ไม่มี VAT` : "กำลังรวมยอดจากใบแจ้งหนี้"}</small></div>
      <div><dt><Icon name="wallet" size={18} />ชำระอนุมัติแล้ว</dt><dd>{known ? summary.paid ? moneyTH(summary.paid) : "—" : value(null)}</dd><small>ตามใบแจ้งหนี้ ไม่รวมมัดจำ</small></div>
      <div data-alert={summary.overdue ? "danger" : undefined}><dt><Icon name="clock" size={18} />เกินกำหนดชำระ</dt><dd>{value(summary.overdue)}<span>ใบ</span></dd><small>{summary.overdue ? "ชำระหรือติดต่อร้านโดยเร็ว" : "ไม่มีใบที่เกินกำหนด"}</small></div>
      <div><dt><Icon name="file" size={18} />หลักฐานรอตรวจ</dt><dd>{value(summary.pending)}<span>ใบ</span></dd><small>ยอดจะลดเมื่อร้านอนุมัติแล้ว</small></div>
    </dl>
    <nav className={styles.statusFilters} aria-label="มุมมองการชำระเงิน">
      {[["", "ทั้งหมด"], ...Object.entries(INVOICE_LABELS)].map(([value, label]) => tab(customerHref("payments", { status: value }), label, value ? counts.byStatus[value] : counts.all, !history && status === value))}
      {tab(customerHref("payments", { view: "history" }), "ประวัติการชำระ", ledger.length, history)}
    </nav>
    <ResourceFeedback {...jobs} loading={jobs.loading && !jobs.data} /><ResourceFeedback {...requests} loading={false} />
    <Limited complete={jobs.data?.complete === false || requests.data?.complete === false ? false : undefined} />
    {jobs.data && !jobs.error && <div className={styles.panel}>
      <div className={styles.panelTop}><input className={styles.search} type="search" aria-label="ค้นหาการชำระเงิน" placeholder="เลขใบแจ้งหนี้ เลขคำขอ หรือรายละเอียดงาน" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      {count > 0 && (history ? <LedgerTable rows={ledgerRows.slice(page * 20, page * 20 + 20)} lookup={lookup} /> : <InvoiceTable rows={rows.slice(page * 20, page * 20 + 20)} lookup={lookup} now={now} />)}
      {!jobs.loading && !count && <Empty title={needle ? "ไม่พบรายการที่ค้นหา" : history ? "ยังไม่มีประวัติการชำระ" : status ? "ไม่พบใบแจ้งหนี้ในสถานะที่เลือก" : "ยังไม่มีใบแจ้งหนี้"} action={!needle && !history ? <Link href={status ? "/customer/payments" : "/customer/jobs"}>{status ? "ดูใบแจ้งหนี้ทั้งหมด" : "ดูงานผลิต"}</Link> : undefined}>{needle ? "ลองค้นหาด้วยคำอื่น" : history ? "มัดจำที่อนุมัติและการชำระตามใบแจ้งหนี้จะแสดงที่นี่" : status ? "ลองเลือกสถานะอื่น" : "ร้านจะออกใบแจ้งหนี้หลังผลิตงานเสร็จ ยอดคือราคางานหักมัดจำแล้ว"}</Empty>}
    </div>}
    <LocalPages count={count} page={page} setPage={(next) => setPaging({ key, page: next })} />
  </section>;
}

function InvoiceTable({ rows, lookup, now }: { rows: FulfillmentJob[]; lookup: Map<string, JobRequest>; now: number | null }) {
  return <table className={styles.table}><thead><tr><th scope="col">ใบแจ้งหนี้</th><th scope="col">งาน</th><th scope="col" className={styles.num}>ยอดรวม</th><th scope="col" className={styles.num}>ชำระแล้ว</th><th scope="col" className={styles.num}>คงเหลือ</th><th scope="col">ครบกำหนด</th><th scope="col">สถานะ</th></tr></thead>
    <tbody>{rows.map((job) => { const invoice = job.invoice!; const request = lookup.get(job.request_id); const percent = paidPercent(invoice); const pending = job.payments?.some((payment) => payment.status === "pending");
      return <tr key={job.job_id}><td><Link className={styles.rowLink} href={customerHref("payments", { job: job.job_id })}>{invoice.number}</Link><span className={styles.sub}>{request ? `คำขอ #${request.no_request}` : "งานผลิตของคุณ"}</span></td>
        <td data-label="งาน"><span className={styles.desc} title={request?.description}>{request?.description ?? "—"}</span><span className={styles.sub}>งาน {job.job_id.slice(0, 8).toUpperCase()}</span></td>
        <td data-label="ยอดรวม" className={styles.num}>{moneyTH(invoice.amount)}</td>
        <td data-label="ชำระแล้ว" className={styles.num}>{moneyTH(invoice.paid)}{percent !== null && <span className={styles.paidBar} aria-hidden="true"><span style={{ width: `${percent}%` }} /></span>}</td>
        <td data-label="คงเหลือ" className={styles.num}><strong>{moneyTH(invoice.balance)}</strong></td>
        <td data-label="ครบกำหนด"><time dateTime={invoice.due_at}>{dateTH(invoice.due_at)}</time><span className={styles.sub}><DueChip invoice={invoice} now={now} /></span></td>
        <td data-label="สถานะ"><Badge value={invoice.status} labels={INVOICE_LABELS} />{pending && <span className={styles.sub}>มีหลักฐานรอตรวจ</span>}</td></tr>; })}</tbody></table>;
}

function LedgerTable({ rows, lookup }: { rows: LedgerRow[]; lookup: Map<string, JobRequest> }) {
  return <table className={styles.table}><thead><tr><th scope="col">เลขอ้างอิง</th><th scope="col">งาน</th><th scope="col" className={styles.num}>จำนวนเงิน</th><th scope="col">วันที่ชำระ</th><th scope="col">ช่องทาง</th><th scope="col">หลักฐาน</th><th scope="col">สถานะ</th></tr></thead>
    <tbody>{rows.map((row) => { const request = lookup.get(row.job.request_id); const deposit = row.kind === "deposit";
      return <tr key={row.key}><td><Link className={styles.rowLink} href={deposit ? customerHref("deposit-po", { request: row.job.request_id }) : customerHref("payments", { job: row.job.job_id })}>{deposit ? "มัดจำ" : row.reference}</Link><span className={styles.sub}>{deposit ? "ก่อนเปิดงาน" : row.job.invoice ? `ชำระใบแจ้งหนี้ ${row.job.invoice.number}` : "ชำระใบแจ้งหนี้"}</span></td>
        <td data-label="งาน"><span className={styles.desc} title={request?.description}>{request?.description ?? "—"}</span><span className={styles.sub}>{request ? `คำขอ #${request.no_request} · ` : ""}งาน {row.job.job_id.slice(0, 8).toUpperCase()}</span></td>
        <td data-label="จำนวนเงิน" className={styles.num}><strong>{moneyTH(row.amount)}</strong></td>
        <td data-label="วันที่ชำระ">{row.paidAt ? <time dateTime={row.paidAt}>{dateTH(row.paidAt)}</time> : deposit ? "ดูในมัดจำและ PO" : "—"}</td>
        <td data-label="ช่องทาง">{row.method ? METHOD_LABELS[row.method] : "—"}</td>
        <td data-label="หลักฐาน">{row.hasEvidence ? "มีไฟล์ · เปิดในรายละเอียด" : "—"}</td>
        <td data-label="สถานะ"><Badge value={row.status} labels={EVIDENCE_LABELS} /></td></tr>; })}</tbody></table>;
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
