"use client";

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { Icon } from "../../components/appearance/icons";
import { bahtTH, quantityTH } from "../../components/staff-ui/staff-format";
import { ToneBadge } from "../../components/staff-ui/staff-ui";
import type { BackendApi, JobRequest } from "../../lib/api/backend-api";
import { useCollection, useNow } from "../customer/customer-hooks";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import type { InventoryMaterial } from "../inventory/inventory-domain";
import type { ProductionSummary } from "../production/production-list-domain";
import { useRequestIndex } from "../requests/request-index";
import { REQUEST_STAGES, STAGE_LABELS, stageCounts, type RequestRecord } from "../requests/request-stage-domain";
import { countText, exactCount, STATUSES, STATUS_LABELS, type JobStatus, type OverviewReport } from "./overview-domain";
import { customersOnRequests, evidenceSummary, paymentSummary, stockOuts, upcomingJobs, type PaymentSummary } from "./overview-insights-domain";
import type { ActionTask } from "./overview-panels";
import { ReportError } from "./overview-panels";
import styles from "./overview.module.css";

function Panel({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const id = useId();
  return <section className={styles.panelFlush} aria-labelledby={id}><div className={styles.flushHead}><h2 id={id}>{title}</h2>{note && <span className={styles.muted}>{note}</span>}</div><div className={styles.panelBody}>{children}</div></section>;
}
const LOADING = <p className={styles.muted} role="status">กำลังโหลดข้อมูล…</p>;
const PARTIAL = <p className={styles.muted}>ข้อมูลที่โหลดได้ยังไม่ครบ ตัวเลขนี้อาจน้อยกว่าจริง</p>;

// Proportions only: the exact figure is always the printed label beside each segment.
const share = (value: string | number) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : 0; };

export function JobStatusChart({ data, loading, choose }: { data?: OverviewReport; loading: boolean; choose: (status: JobStatus) => void }) {
  const total = data ? STATUSES.reduce((sum, status) => sum + share(String(exactCountOr0(data.counts[status]))), 0) : 0;
  return <Panel title="สถานะงานผลิต" note="งานที่เปิดในช่วงที่เลือก · กดเพื่อดูรายการ">
    {!data && (loading ? LOADING : <p className={styles.muted}>ยังไม่มีข้อมูล</p>)}
    {data && <>
      {total > 0 ? <div className={styles.bar} role="img" aria-label={STATUSES.map((status) => `${STATUS_LABELS[status]} ${countText(data.counts[status])} งาน`).join(", ")}>{STATUSES.map((status) => { const value = share(String(exactCountOr0(data.counts[status]))); return value > 0 && <i key={status} data-status={status} style={{ flexGrow: value }} title={`${STATUS_LABELS[status]} ${countText(data.counts[status])} งาน`} />; })}</div> : <p className={styles.muted}>ไม่มีงานที่เปิดในช่วงนี้</p>}
      <div className={styles.barLegend}>{STATUSES.map((status) => <button key={status} onClick={() => choose(status)}><i data-status={status} aria-hidden="true" />{STATUS_LABELS[status]}<strong>{countText(data.counts[status])}</strong></button>)}</div>
    </>}
  </Panel>;
}
function exactCountOr0(value: string | number): bigint { try { return exactCount(value); } catch { return BigInt(0); } }

function UpcomingPanel({ root, jobs, requests, now, error, retry }: { root: string; jobs?: ProductionSummary[]; requests?: JobRequest[]; now: number | null; error?: string; retry: () => void }) {
  const upcoming = jobs && requests ? upcomingJobs(jobs, requests, now) : null;
  return <Panel title="งานใกล้ถึงกำหนด" note="ตามวันที่ลูกค้าต้องการ ไม่ใช่กำหนดที่ร้านยืนยัน">
    <ReportError error={error} retry={retry} />
    {!upcoming ? !error && LOADING : upcoming.rows.length ? <ul className={styles.rows}>{upcoming.rows.slice(0, 5).map(({ job, request, countdown }) => <li key={job.job_id}><Link href={`${root}/production?job=${job.job_id}`}><span><strong>{request.description}</strong><small>คำขอ #{request.no_request} · {STATUS_LABELS[job.status as JobStatus] ?? job.status}</small></span>{countdown && <ToneBadge tone={countdown.tone}>{countdown.text}</ToneBadge>}</Link></li>)}</ul>
      : <p className={styles.muted}>ไม่มีงานเปิดที่ลูกค้าระบุวันที่ต้องการ</p>}
  </Panel>;
}

function StockPanel({ root, materials, complete, error, retry }: { root: string; materials?: InventoryMaterial[]; complete?: boolean; error?: string; retry: () => void }) {
  const out = materials ? stockOuts(materials) : null;
  return <Panel title="วัตถุดิบหมด" note={materials ? `${out!.length} จาก ${materials.filter((item) => item.is_active).length} รายการที่ใช้งาน` : undefined}>
    <ReportError error={error} retry={retry} />
    {!out ? !error && LOADING : out.length ? <ul className={styles.rows}>{out.slice(0, 5).map((item) => <li key={item.id}><Link href={`${root}/materials`}><span><strong>{item.name}</strong><small>คงเหลือ {quantityTH(item.qty_on_hand)} · จองแล้ว {quantityTH(item.qty_reserved)} {item.unit_name}</small></span><ToneBadge tone="danger">พร้อมใช้ 0</ToneBadge></Link></li>)}</ul>
      : <p className={styles.muted}>ทุกรายการที่ใช้งานยังมีของพร้อมใช้</p>}
    {materials && complete === false && PARTIAL}
  </Panel>;
}

function PipelinePanel({ records, complete }: { records?: RequestRecord[]; complete: boolean }) {
  const counts = records ? stageCounts(records, "") : null;
  const max = counts ? Math.max(1, ...REQUEST_STAGES.map((stage) => counts.counts[stage])) : 1;
  return <Panel title="คำขอและใบเสนอราคา" note="แยกตามขั้นตอน · กดเพื่อเปิดรายการ">
    {!counts ? LOADING : <ul className={styles.stages}>{REQUEST_STAGES.map((stage) => <li key={stage}><Link href={`/admin/requests?stage=${stage}`}><span>{STAGE_LABELS[stage]}</span><span className={styles.stageTrack} aria-hidden="true"><i data-stage={stage} style={{ width: `${counts.counts[stage] / max * 100}%` }} /></span><strong>{counts.counts[stage]}</strong></Link></li>)}</ul>}
    {counts && counts.unknown > 0 && <p className={styles.muted}>ตรวจขั้นตอนไม่ได้ {counts.unknown} คำขอ</p>}
    {records && !complete && PARTIAL}
  </Panel>;
}

function PaymentPanel({ summary, loading, partial }: { summary: PaymentSummary | null; loading: boolean; partial: boolean }) {
  const paid = summary ? share(summary.paid) : 0; const balance = summary ? share(summary.balance) : 0;
  return <Panel title="การรับชำระ" note={summary ? `${summary.invoices} ใบแจ้งหนี้ · ไม่มี VAT` : undefined}>
    {!summary ? loading ? LOADING : <p className={styles.muted}>ยอดบางรายการอ่านไม่ได้ จึงยังไม่แสดงยอดรวม</p> : <>
      {paid + balance > 0 ? <div className={styles.bar} role="img" aria-label={`รับแล้ว ${bahtTH(summary.paid)}, ค้างชำระ ${bahtTH(summary.balance)}`}>{paid > 0 && <i data-pay="paid" style={{ flexGrow: paid }} title={`รับแล้ว ${bahtTH(summary.paid)}`} />}{balance > 0 && <i data-pay="balance" style={{ flexGrow: balance }} title={`ค้างชำระ ${bahtTH(summary.balance)}`} />}</div> : <p className={styles.muted}>ยังไม่มีใบแจ้งหนี้</p>}
      <dl className={styles.facts}><div><dt><i data-pay="paid" aria-hidden="true" />รับแล้ว</dt><dd>{bahtTH(summary.paid)}</dd></div><div><dt><i data-pay="balance" aria-hidden="true" />ค้างชำระ</dt><dd>{bahtTH(summary.balance)}</dd></div><div><dt>เกินกำหนด {summary.overdue} ใบ</dt><dd>{bahtTH(summary.overdueBalance)}</dd></div></dl>
    </>}
    {summary && partial && PARTIAL}
  </Panel>;
}

function EvidencePanel({ records }: { records?: RequestRecord[] }) {
  const counts = records ? evidenceSummary(records) : null;
  return <Panel title="การตรวจมัดจำและ PO" note="คำขอที่ยังไม่ปิด">
    {!counts ? LOADING : <table className={styles.mini}><thead><tr><th scope="col">เอกสาร</th><th scope="col">รอตรวจ</th><th scope="col">อนุมัติ</th><th scope="col">ไม่อนุมัติ</th></tr></thead><tbody>{(["po", "deposit"] as const).map((kind) => <tr key={kind}><th scope="row">{kind === "po" ? "PO" : "มัดจำ"}</th><td data-attention={counts[kind].pending > 0 || undefined}>{counts[kind].pending}</td><td>{counts[kind].approved}</td><td>{counts[kind].rejected}</td></tr>)}</tbody></table>}
    <Link className={styles.textLink} href="/admin/requests?stage=review">เปิดรายการรอตรวจ <Icon name="arrow" size={14} /></Link>
  </Panel>;
}

export function useOperations(api: BackendApi) {
  const materials = useCollection<InventoryMaterial>(api, "/materials");
  const jobs = useCollection<ProductionSummary>(api, "/production/jobs");
  const requests = useCollection<JobRequest>(api, "/requests");
  const now = useNow();
  const overdue = jobs.data && requests.data && now !== null ? upcomingJobs(jobs.data.items, requests.data.items, now).overdue : undefined;
  return { materials, jobs, requests, now, overdue, out: materials.data ? stockOuts(materials.data.items).length : undefined,
    reload: () => { materials.reload(); jobs.reload(); requests.reload(); } };
}
type Operations = ReturnType<typeof useOperations>;

export function operationTasks(ops: Operations, root: string): ActionTask[] {
  return [
    { label: "งานเลยวันที่ลูกค้าต้องการ", hint: "งานที่ยังไม่เสร็จและเลยวันที่ลูกค้าระบุ", action: "เปิดงานผลิต", value: ops.overdue, href: `${root}/production` },
    { label: "วัตถุดิบหมด", hint: "รายการที่ใช้งานอยู่แต่ไม่มีของพร้อมใช้", action: "เปิดสต๊อก", value: ops.out, href: `${root}/materials` },
  ];
}

export function OperationPanels({ ops, root }: { ops: Operations; root: string }) {
  return <>
    <UpcomingPanel root={root} jobs={ops.jobs.data?.items} requests={ops.requests.data?.items} now={ops.now} error={ops.jobs.error || ops.requests.error} retry={() => { ops.jobs.reload(); ops.requests.reload(); }} />
    <StockPanel root={root} materials={ops.materials.data?.items} complete={ops.materials.data?.complete} error={ops.materials.error} retry={ops.materials.reload} />
  </>;
}

// Admin only: Worker sessions must never mount this, so they never read finance totals here.
export function useAdminBusiness(api: BackendApi, now: number | null) {
  const index = useRequestIndex(api);
  const fulfillment = useCollection<FulfillmentJob>(api, "/fulfillment/jobs");
  const payments = fulfillment.data ? paymentSummary(fulfillment.data.items, now) : null;
  const review = index.records ? stageCounts(index.records, "").counts.review : undefined;
  return { index, fulfillment, payments, review, reload: () => { index.reload(); fulfillment.reload(); } };
}
type Business = ReturnType<typeof useAdminBusiness>;

export function businessTasks(business: Business): ActionTask[] {
  const summary = business.payments;
  return [
    { label: "หลักฐานมัดจำ/PO รอตรวจ", hint: "อนุมัติหรือไม่อนุมัติก่อนเปิดงาน", action: "ตรวจหลักฐาน", value: business.review, href: "/admin/requests?stage=review" },
    { label: "การชำระเงินรอตรวจ", hint: "ลูกค้าแจ้งโอนแล้ว รอยืนยันยอด", action: "ตรวจการชำระ", value: summary?.pendingPayments, href: "/admin/delivery-payment" },
    { label: "ใบแจ้งหนี้เกินกำหนด", hint: summary ? `ค้างรวม ${bahtTH(summary.overdueBalance)}` : "ยังมียอดค้างหลังวันครบกำหนด", action: "ติดตามยอด", value: summary?.overdue, href: "/admin/delivery-payment" },
  ];
}

export function BusinessStrip({ business, requests, loading }: { business: Business; requests?: JobRequest[]; loading: boolean }) {
  const empty = loading ? "…" : "—"; const summary = business.payments;
  return <section className={styles.strip} aria-label="สรุปธุรกิจ">
    <div><span>ลูกค้าที่มีคำขอ</span><strong>{requests ? countText(customersOnRequests(requests)) : empty}</strong></div>
    <div><span>ยอดออกใบแจ้งหนี้</span><strong>{summary ? bahtTH(summary.invoiced) : empty}</strong></div>
    <div data-tone="completed"><span>รับชำระแล้ว</span><strong>{summary ? bahtTH(summary.paid) : empty}</strong></div>
    <div data-tone="action"><span>ค้างชำระ</span><strong>{summary ? bahtTH(summary.balance) : empty}</strong></div>
  </section>;
}

export function BusinessPanels({ business }: { business: Business }) {
  return <>
    <PipelinePanel records={business.index.records} complete={business.index.complete || business.index.loading} />
    <PaymentPanel summary={business.payments} loading={business.fulfillment.loading} partial={business.fulfillment.data?.complete === false} />
    <EvidencePanel records={business.index.records} />
    {business.fulfillment.error && <ReportError error={business.fulfillment.error} retry={business.fulfillment.reload} />}
    {business.index.error && <ReportError error={business.index.error} retry={business.index.reload} />}
  </>;
}
