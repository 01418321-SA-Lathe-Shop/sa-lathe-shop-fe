"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Attachment, BackendApi, Decision, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import { useResource } from "../../hooks/backend-hooks";
import { useCollection } from "./customer-hooks";
import { useSalesIndex } from "./customer-sales-data";
import { customerHref, customerRequestLayout, dateTH, latestQuote, matchingRequests, QUOTE_LABELS, REQUEST_LABELS } from "./customer-domain";
import { Badge, Disclosure, Empty, Field, Limited, LocalPages, PageTitle, PrivateFile, ResourceFeedback } from "./customer-ui";
import { CustomerUpload } from "./customer-upload";
import { RequestCard, RequestCardSkeleton, RequestStatusFilters } from "./customer-request-list";
import styles from "./customer-requests.module.css";

export function OrderTabs({ active }: { active: "requests" | "jobs" | "history" }) {
  return <nav className="cust-tabs" aria-label="งานของฉัน">{[["requests", "/customer/requests", "คำขอผลิต"], ["jobs", "/customer/jobs", "งานผลิต"], ["history", "/customer/jobs?view=history", "ประวัติ"]].map(([id, href, label]) => <Link key={id} href={href} aria-current={active === id ? "page" : undefined}>{label}</Link>)}</nav>;
}
export function CustomerRequests({ api }: { api: BackendApi }) {
  const router = useRouter(); const params = useSearchParams(); const resource = useSalesIndex(api);
  const [page, setPage] = useState(0); const q = params.get("q") ?? ""; const status = params.get("status") ?? ""; const layout = customerRequestLayout(params.get("layout"));
  const filtered = matchingRequests(resource.records.map((item) => item.request), q, status);
  const recordsById = new Map(resource.records.map((record) => [record.request.id, record]));
  return <section className={styles.list}><OrderTabs active="requests" /><PageTitle title="คำขอผลิต" description="ดูสถานะและขั้นตอนถัดไป ตั้งแต่ส่งคำขอจนเปิดงานผลิต" action={<Link className="cust-primary" href={customerHref("requests", { view: "new" })}>ส่งคำขอผลิตใหม่</Link>} />
    <form className={styles.searchForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); router.replace(customerHref("requests", { q: String(data.get("q") ?? ""), status: String(data.get("status") ?? ""), layout: layout === "list" ? "list" : undefined }), { scroll: false }); }}><Field label="ค้นหาคำขอ"><input name="q" type="search" defaultValue={q} placeholder="เลขคำขอหรือรายละเอียดงาน" /></Field><input type="hidden" name="status" value={status} /><button type="submit">ค้นหา</button></form>
    <div className={styles.listTools}><RequestStatusFilters items={resource.records.map((item) => item.request)} query={q} status={status} layout={layout} loading={resource.loading} countUnavailable={Boolean(resource.error && !resource.data)} /><nav className={styles.viewSwitch} aria-label="รูปแบบการแสดงคำขอ"><Link href={customerHref("requests", { q, status })} aria-current={layout === "cards" ? "page" : undefined}><span aria-hidden="true">▦</span> การ์ด</Link><Link href={customerHref("requests", { q, status, layout: "list" })} aria-current={layout === "list" ? "page" : undefined}><span aria-hidden="true">☷</span> รายการ</Link></nav></div>
    {(q || status) && <p className="cust-filter-result">ผลจากการค้นหาและตัวกรอง <Link href="/customer/requests">ล้างการค้นหาและตัวกรอง</Link></p>}
    <ResourceFeedback {...resource} loading={false} />{resource.data && !resource.loading && <Limited complete={resource.complete} />}
    <p className="cust-muted cust-small">คำขอรอประเมินแสดงก่อน จากนั้นเรียงตามวันที่ส่งล่าสุด</p>
    {resource.loading && !resource.records.length && <RequestCardSkeleton layout={layout} />}
    <div className={`${styles.grid} ${layout === "list" ? styles.listView : ""}`}>{filtered.slice(page * 20, page * 20 + 20).map((request) => <RequestCard key={request.id} record={recordsById.get(request.id)!} layout={layout} />)}</div>
    {resource.data && !resource.loading && !filtered.length && !resource.error && <Empty title={q || status ? "ไม่พบคำขอที่ตรงกับการค้นหา" : "ยังไม่มีคำขอผลิต"} action={<Link href={q || status ? "/customer/requests" : customerHref("requests", { view: "new" })}>{q || status ? "ล้างการค้นหาและตัวกรอง" : "ส่งคำขอผลิตแรก"}</Link>}>ลองเปลี่ยนตัวกรอง หรือเริ่มส่งรายละเอียดงานให้ร้านประเมินราคา</Empty>}
    <LocalPages count={filtered.length} page={page} setPage={setPage} />
  </section>;
}

export function CustomerRequestDetail({ api, id }: { api: BackendApi; id: string }) {
  const params = useSearchParams(); const resource = useResource<JobRequest>(api, `/requests/${id}`); const quotes = useCollection<Quotation>(api, `/requests/${id}/quotations`);
  const quote = latestQuote(quotes.data?.items ?? []); const request = resource.data;
  return <><PageTitle title={request ? `คำขอ #${request.no_request}` : "รายละเอียดคำขอผลิต"} description={request?.description} back="/customer/requests" /><ResourceFeedback {...resource} /><ResourceFeedback {...quotes} />
    {params.get("created") === "1" && request && <p className="cust-alert success" role="status">สร้างคำขอ #{request.no_request} แล้ว · ตรวจสถานะไฟล์แนบด้านล่างแยกจากสถานะคำขอ</p>}
    {request && <div className="cust-detail-grid"><section className="cust-document"><Badge value={request.status} labels={REQUEST_LABELS} /><h2>รายละเอียดคำขอ</h2><dl className="cust-definition"><div><dt>รายละเอียดงาน</dt><dd>{request.description}</dd></div><div><dt>จำนวน</dt><dd>{request.qty} ชิ้น</dd></div><div><dt>ข้อกำหนดวัตถุดิบ</dt><dd>{request.material_spec || "ไม่ระบุ"}</dd></div><div><dt>วันที่ต้องการรับงาน</dt><dd>{request.deadline ? dateTH(request.deadline) : "ไม่ได้ระบุวันที่ต้องการ"}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div><div><dt>ส่งคำขอเมื่อ</dt><dd>{dateTH(request.created_at)}</dd></div></dl><RequestAttachments api={api} id={id} />{request.status === "canceled" && <Cancellation api={api} id={id} />}<Disclosure title="ประวัติการตัดสินใจใบเสนอราคา"><DecisionHistory api={api} id={id} /></Disclosure></section><aside className="cust-side-summary"><h2>ขั้นตอนปัจจุบัน</h2>{quote ? <><Badge value={quote.status} labels={QUOTE_LABELS} /><p>ใบเสนอราคา #{quote.quotation_no} · ฉบับที่ {quote.version}</p><Link className="cust-primary" href={customerHref(quote.status === "approved" ? "deposit-po" : "quotations", { request: id, quotation: quote.id })}>{quote.status === "approved" ? "ดูหลักฐานและงานผลิต" : "ดูใบเสนอราคา"}</Link>{quote.status === "approved" && <OpenedJob api={api} quotationId={quote.id} />}</> : <p>{quotes.loading ? "กำลังตรวจสอบใบเสนอราคา…" : quotes.error ? "ยังโหลดขั้นตอนล่าสุดไม่ได้" : "รอร้านประเมินรายละเอียดคำขอ"}</p>}<Limited complete={quotes.data?.complete} /></aside></div>}
  </>;
}
function RequestAttachments({ api, id }: { api: BackendApi; id: string }) {
  const resource = useResource<{ items: Attachment[] | null }>(api, `/requests/${id}/attachments`); const [ready, setReady] = useState<Attachment | null>(null);
  return <section className="cust-section"><h2>ไฟล์แนบส่วนตัว</h2><ResourceFeedback {...resource} />{resource.data?.items?.map((file) => <div className="cust-file-row" key={file.id}><span>{file.file_name}<small>{(file.byte_size / 1000000).toFixed(2)} MB · ตรวจไฟล์แล้ว</small></span><PrivateFile api={api} path={`/attachments/${file.id}/download`} /></div>)}{resource.data && !resource.data.items?.length && <p className="cust-muted">ยังไม่มีไฟล์แนบที่ผ่านการตรวจ</p>}<Disclosure title="แนบไฟล์เพิ่มเติม"><CustomerUpload api={api} requestId={id} ready={ready} onReady={(file) => { setReady(file); if (file) resource.reload(); }} /></Disclosure></section>;
}
function OpenedJob({ api, quotationId }: { api: BackendApi; quotationId: string }) {
  const state = useResource<Fulfillment>(api, `/quotations/${quotationId}/fulfillment`);
  return <><ResourceFeedback {...state} />{state.data?.job && <Link className="cust-link" href={customerHref("jobs", { job: state.data.job.id })}>เปิดงานผลิตแล้ว · ติดตามงาน →</Link>}</>;
}
function Cancellation({ api, id }: { api: BackendApi; id: string }) {
  const state = useResource<{ reason: string }>(api, `/requests/${id}/rejection`);
  return <section className="cust-alert"><h3>รายละเอียดการยกเลิก</h3><p>{state.data?.reason ?? "ตรวจประวัติการตัดสินใจและหลักฐานมัดจำ / PO เพื่อดูเหตุผลจากระบบ ไม่สามารถเปลี่ยนสถานะเองได้"}</p></section>;
}
function DecisionHistory({ api, id }: { api: BackendApi; id: string }) {
  const state = useCollection<Decision>(api, `/requests/${id}/quotation-decisions`);
  return <><ResourceFeedback {...state} /><Limited complete={state.data?.complete} />{state.data?.items.map((item) => <article className="cust-history-row" key={item.quotation_id}><strong>{item.outcome === "accept" ? "ตอบรับใบเสนอราคา" : "ปฏิเสธใบเสนอราคา"}</strong><p>{dateTH(item.decided_at)} · ปฏิเสธสะสม {item.rejection_count} ครั้ง</p>{item.reason && <p>{item.reason}</p>}</article>)}{state.data && !state.data.items.length && <p>ยังไม่มีการตัดสินใจ</p>}</>;
}
