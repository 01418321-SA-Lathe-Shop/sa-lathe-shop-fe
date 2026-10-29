"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Account, BackendApi, JobRequest } from "../../lib/api/backend-api";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import { availableActions } from "../delivery/delivery-domain";
import { useResource } from "../../hooks/backend-hooks";
import { useCollection } from "./customer-hooks";
import { customerHref, dateTH, DELIVERY_LABELS, INVOICE_LABELS, JOB_LABELS, moneyTH, REQUEST_LABELS } from "./customer-domain";
import { Badge, Empty, Field, Limited, LocalPages, PageTitle, ResourceFeedback } from "./customer-ui";
import { OrderTabs } from "./customer-requests";
import { CustomerInspection } from "./customer-job-actions";
import { CustomerInvoice } from "./customer-invoice";
import { CustomerInvoiceList } from "./customer-invoice-list";
import { CustomerJobList } from "./customer-job-list";

export function CustomerJobs({ api, mode = "jobs" }: { api: BackendApi; mode?: "jobs" | "payments" | "inspection" }) {
  const query = useSearchParams(); const history = query.get("view") === "history"; const jobs = useCollection<FulfillmentJob>(api, "/fulfillment/jobs"); const requests = useCollection<JobRequest>(api, "/requests");
  const [filter, setFilter] = useState(""); const [page, setPage] = useState(0);
  const lookup = new Map(requests.data?.items.map((request) => [request.id, request]));
  const rows = (jobs.data?.items ?? []).filter((job) => mode === "inspection" ? Boolean(job.deliveries?.length) && (!filter || job.deliveries?.at(-1)?.status === filter) : !filter || job.job_status === filter);
  const archived = requests.data?.items.filter((request) => ["completed", "canceled"].includes(request.status)) ?? [];
  const labels = mode === "inspection" ? DELIVERY_LABELS : JOB_LABELS;
  const section = mode === "inspection" ? "delivery-payment" : "jobs";
  if (mode === "jobs" && !history) return <CustomerJobList jobs={jobs} requests={requests} />;
  if (mode === "payments") return <CustomerInvoiceList jobs={jobs} requests={requests} />;
  return <>{mode === "jobs" && <OrderTabs active={history ? "history" : "jobs"} />}<PageTitle title={history ? "ประวัติการสั่งงาน" : mode === "inspection" ? "ตรวจรับงาน" : "งานผลิต"} description={history ? "คำขอที่เสร็จสิ้นหรือยกเลิก เชื่อมกลับข้อมูลเดิม" : mode === "inspection" ? "ตรวจงานที่ร้านส่งมอบ ก่อนยืนยันรับหรือส่งคืนเพื่อแก้ไข" : "งานที่ร้านรับเข้าคิวหลังอนุมัติหลักฐานแล้ว"} />
    <ResourceFeedback {...jobs} /><ResourceFeedback {...requests} /><Limited complete={jobs.data?.complete && requests.data?.complete} />
    {history ? <>{archived.map((request) => <article className="cust-document-row" key={request.id}><div><h2>{request.description}</h2><p>คำขอ #{request.no_request}</p><Badge value={request.status} labels={REQUEST_LABELS} /></div><Link href={customerHref("requests", { request: request.id })}>ดูคำขอและเอกสาร →</Link></article>)}{requests.data && !requests.loading && !requests.error && !archived.length && <Empty title="ยังไม่มีประวัติงานที่ปิดแล้ว">คำขอจะเสร็จสิ้นเมื่อรับงานแล้วและชำระครบ</Empty>}</> : <>
      <div className="cust-list-filter"><Field label={mode === "inspection" ? "สถานะการส่งมอบ" : "สถานะการผลิต"}><select value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}><option value="">ทั้งหมด</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field></div>
      {rows.slice(page * 20, page * 20 + 20).map((job) => {
        const request = lookup.get(job.request_id); const delivery = job.deliveries?.at(-1); const actions = availableActions(job, "customer");
        return <article className="cust-job-row" key={job.job_id}><div><p className="cust-muted cust-small">{request ? `คำขอ #${request.no_request}` : "กำลังอ้างอิงคำขอผลิต"}</p><h2>{request?.description ?? "งานผลิตของคุณ"}</h2><Badge value={mode === "inspection" ? delivery!.status : job.job_status} labels={labels} />{mode === "jobs" && <p className="cust-muted">กำหนดส่งที่ร้านยืนยัน: ยังไม่มีข้อมูล{request?.deadline ? ` · วันที่ลูกค้าต้องการ ${dateTH(request.deadline)}` : ""}</p>}{mode === "jobs" && delivery && <p>การส่งมอบ: {DELIVERY_LABELS[delivery.status]}</p>}{job.cycle > 1 && <p>รอบแก้ไขงาน · Job เดิม ไม่เพิ่มราคา</p>}</div><div className="cust-job-action"><Link className="cust-link" href={customerHref(section, { job: job.job_id })}>{mode === "inspection" ? "ดูผลและตรวจรับงาน" : actions.includes("inspect") ? "ดูงานและตรวจรับ" : "ดูความคืบหน้า"} →</Link></div></article>;
      })}
      {jobs.data && !jobs.loading && !jobs.error && !rows.length && <Empty title={filter ? "ไม่พบงานในสถานะที่เลือก" : mode === "inspection" ? "ยังไม่มีงานส่งมอบให้ตรวจรับ" : "ยังไม่มีงานผลิต"} action={<Link href="/customer/requests">ดูคำขอผลิต</Link>}>{mode === "jobs" ? "งานจะปรากฏหลังเจ้าหน้าที่อนุมัติหลักฐานมัดจำ / PO ครบ" : "เมื่อร้านดำเนินการแล้ว รายการจะแสดงที่นี่"}</Empty>}
      <LocalPages count={rows.length} page={page} setPage={setPage} />
    </>}
  </>;
}

export function CustomerJobDetail({ api, account, id, mode = "jobs" }: { api: BackendApi; account: Account; id: string; mode?: "jobs" | "payments" | "inspection" }) {
  const resource = useResource<FulfillmentJob>(api, `/fulfillment/jobs/${id}`); const [notice, setNotice] = useState("");
  return <><ResourceFeedback {...resource} />{notice && <p role="status" className="cust-alert success">{notice}</p>}{resource.data && <JobContent key={`${id}:${resource.data.version}`} api={api} account={account} state={resource.data} mode={mode} settled={!resource.loading && !resource.error} reload={resource.reload} saved={(message) => { setNotice(message); resource.reload(); }} />}</>;
}

function JobContent({ api, account, state, mode, settled, reload, saved }: { api: BackendApi; account: Account; state: FulfillmentJob; mode: "jobs" | "payments" | "inspection"; settled: boolean; reload: () => void; saved: (message: string) => void }) {
  const request = useResource<JobRequest>(api, `/requests/${state.request_id}`);
  const quoteData = useCollection<import("../../lib/api/backend-api").Quotation>(api, `/requests/${state.request_id}/quotations`);
  const quote = quoteData.data?.items.find((item) => item.status === "approved"); const actions = settled ? availableActions(state, "customer") : [];
  const delivery = state.deliveries?.at(-1);
  return <><PageTitle title={mode === "payments" ? state.invoice?.number ?? "ใบแจ้งหนี้" : mode === "inspection" ? "ตรวจรับงาน" : request.data?.description ?? "รายละเอียดงานผลิต"} description={request.data ? `${mode === "jobs" ? "" : `${request.data.description} · `}คำขอ #${request.data.no_request}` : "กำลังโหลดคำขอที่เกี่ยวข้อง"} back={mode === "payments" ? "/customer/payments" : mode === "inspection" ? "/customer/delivery-payment" : "/customer/jobs"} /><ResourceFeedback {...request} />
    {mode === "payments" ? <CustomerInvoice api={api} account={account} state={state} canPay={actions.includes("bank")} saved={saved} reload={reload} /> : mode === "inspection" ? <CustomerInspection api={api} state={state} request={request.data} canInspect={actions.includes("inspect")} saved={saved} reload={reload} /> : <div className="cust-job-detail"><section className="cust-document"><div className="cust-toolbar"><h2>ความคืบหน้าการผลิต</h2><Badge value={state.job_status} labels={JOB_LABELS} /></div>{state.cycle > 1 && <p className="cust-alert">กำลังแสดงรอบแก้ไขงานที่ {state.cycle - 1} · ใช้ Job เดิมและราคาเดิม</p>}
      <ol className="cust-timeline">{["queued", "in_progress", "completed"].map((status, index) => {
        const current = ["queued", "in_progress", "completed"].indexOf(state.job_status); const done = current > index;
        return <li key={status} className={done ? "done" : current === index ? "current" : ""} aria-current={current === index ? "step" : undefined}><span className="cust-timeline-point"><Icon name={status === "completed" ? "layers" : status === "in_progress" ? "machine" : "clock"} /></span><div><strong>{JOB_LABELS[status]}</strong><p>{done ? "ผ่านขั้นตอนนี้แล้ว" : current === index ? "ขั้นตอนปัจจุบัน" : "ยังไม่ถึงขั้นตอนนี้"}</p></div></li>;
      })}</ol>{state.job_status === "cancelled" && <p className="cust-alert">งานถูกยกเลิก ไม่สามารถเริ่มงานหรือเปลี่ยนสถานะเองได้</p>}
      <section className="cust-section"><h2>รูปผลงาน</h2><p className="cust-muted">ยังไม่มีรูปผลงานที่เปิดให้คุณดู</p></section>
      {Boolean(state.rework_history?.length) && <section className="cust-section"><h2>ประวัติการแก้ไขงาน</h2>{state.rework_history?.map((cycle) => <p className="cust-history-row" key={cycle.cycle}>งานรอบ {cycle.cycle} · ส่งคืนเมื่อ {dateTH(cycle.reopened_at)}</p>)}</section>}
    </section><aside className="cust-job-summary"><section><h2>การส่งมอบ</h2>{delivery ? <><Badge value={delivery.status} labels={DELIVERY_LABELS} /><p>{delivery.method === "third_party" ? "ผู้ให้บริการภายนอก" : "ร้านจัดส่ง / รับเอง"} · ผู้รับ {delivery.receiver_name}</p><p>ส่งเมื่อ {dateTH(delivery.shipped_at)}</p></> : <p>ยังไม่มีการจัดส่ง</p>}{actions.includes("inspect") && <Link className="cust-primary" href={customerHref("delivery-payment", { job: state.job_id })}>ตรวจรับงาน</Link>}</section>
      <section><h2>การชำระเงิน</h2><p>มัดจำที่อนุมัติจริง {moneyTH(state.deposit)}</p>{state.invoice ? <><Badge value={state.invoice.status} labels={INVOICE_LABELS} /><p>ยอดคงเหลือ {moneyTH(state.invoice.balance)}</p><Link className={actions.includes("inspect") ? "cust-link" : actions.includes("bank") ? "cust-primary" : "cust-link"} href={customerHref("payments", { job: state.job_id })}>{actions.includes("bank") ? "ดูใบแจ้งหนี้และชำระเงิน" : "ดูใบแจ้งหนี้"}</Link></> : <p>ยอดหลังมัดจำ {moneyTH(state.opening_balance)} · ยังไม่มีใบแจ้งหนี้</p>}</section>
      <section><h2>เอกสารที่เกี่ยวข้อง</h2><div className="cust-related-links"><Link className="cust-link" href={customerHref("requests", { request: state.request_id })}>ดูคำขอเดิม →</Link>{quote && <Link className="cust-link" href={customerHref("quotations", { request: state.request_id, quotation: quote.id })}>ดูใบเสนอราคาที่ตอบรับ →</Link>}</div><ResourceFeedback {...quoteData} /><Limited complete={quoteData.data?.complete} /></section>
    </aside></div>}
    {state.request_status === "completed" && <p className="cust-alert success">คำขอเสร็จสิ้นแล้ว · รับงานแล้วและชำระครบ</p>}
    <div className="cust-page-end"><Link href={customerHref("jobs", { job: state.job_id })}>รายละเอียดงานผลิต</Link><button onClick={reload}>อัปเดตข้อมูลล่าสุด</button></div>
  </>;
}
