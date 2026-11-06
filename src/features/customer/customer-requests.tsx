"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Attachment, BackendApi, Decision, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import { ApiError } from "../../lib/api/backend-api";
import { useCommand, useResource } from "../../hooks/backend-hooks";
import { bangkokInputValue, correctionPayload, requestErrors, type RequestErrors } from "./customer-request-domain";
import { useCollection } from "./customer-hooks";
import { useSalesIndex } from "./customer-sales-data";
import { customerHref, customerRequestLayout, dateTH, latestQuote, matchingRequests, QUOTE_LABELS, REQUEST_LABELS } from "./customer-domain";
import { ActionFeedback, Badge, Disclosure, Empty, Field, Limited, LocalPages, PageTitle, PrivateFile, ResourceFeedback } from "./customer-ui";
import { CustomerUpload } from "./customer-upload";
import { RequestCard, RequestCardSkeleton, RequestStatusFilters } from "./customer-request-list";
import styles from "./customer-requests.module.css";

export function CustomerRequests({ api }: { api: BackendApi }) {
  const router = useRouter(); const params = useSearchParams(); const resource = useSalesIndex(api);
  const [page, setPage] = useState(0); const q = params.get("q") ?? ""; const status = params.get("status") ?? ""; const layout = customerRequestLayout(params.get("layout"));
  const filtered = matchingRequests(resource.records.map((item) => item.request), q, status);
  const recordsById = new Map(resource.records.map((record) => [record.request.id, record]));
  return <section className={styles.list}><PageTitle title="คำขอผลิต" description="ดูสถานะและขั้นตอนถัดไป ตั้งแต่ส่งคำขอจนเปิดงานผลิต" action={<Link className="cust-primary" href={customerHref("requests", { view: "new" })}>ส่งคำขอผลิตใหม่</Link>} />
    <form className={styles.searchForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); router.replace(customerHref("requests", { q: String(data.get("q") ?? ""), status: String(data.get("status") ?? ""), layout: layout === "list" ? "list" : undefined }), { scroll: false }); }}><Field label="ค้นหาคำขอ"><input name="q" type="search" defaultValue={q} placeholder="เลขคำขอหรือรายละเอียดงาน" /></Field><input type="hidden" name="status" value={status} /><button type="submit">ค้นหา</button></form>
    <div className={styles.listTools}><RequestStatusFilters items={resource.records.map((item) => item.request)} query={q} status={status} layout={layout} loading={resource.loading} countUnavailable={Boolean(resource.error && !resource.data)} /><nav className={styles.viewSwitch} aria-label="รูปแบบการแสดงคำขอ"><Link href={customerHref("requests", { q, status })} aria-current={layout === "cards" ? "page" : undefined}><span aria-hidden="true">▦</span> การ์ด</Link><Link href={customerHref("requests", { q, status, layout: "list" })} aria-current={layout === "list" ? "page" : undefined}><span aria-hidden="true">☷</span> รายการ</Link></nav></div>
    {(q || status) && <p className="cust-filter-result">ผลจากการค้นหาและตัวกรอง <Link href="/customer/requests">ล้างการค้นหาและตัวกรอง</Link></p>}
    <ResourceFeedback {...resource} loading={false} />{resource.data && !resource.loading && <Limited complete={resource.complete} />}
    <p className="cust-muted cust-small">เรียงตามเลขคำขอจากมากไปน้อย</p>
    {resource.loading && !resource.records.length && <RequestCardSkeleton layout={layout} />}
    <div className={`${styles.grid} ${layout === "list" ? styles.listView : ""}`}>{filtered.slice(page * 20, page * 20 + 20).map((request) => <RequestCard key={request.id} record={recordsById.get(request.id)!} layout={layout} />)}</div>
    {resource.data && !resource.loading && !filtered.length && !resource.error && <Empty title={q || status ? "ไม่พบคำขอที่ตรงกับการค้นหา" : "ยังไม่มีคำขอผลิต"} action={<Link href={q || status ? "/customer/requests" : customerHref("requests", { view: "new" })}>{q || status ? "ล้างการค้นหาและตัวกรอง" : "ส่งคำขอผลิตแรก"}</Link>}>ลองเปลี่ยนตัวกรอง หรือเริ่มส่งรายละเอียดงานให้ร้านประเมินราคา</Empty>}
    <LocalPages count={filtered.length} page={page} setPage={setPage} />
  </section>;
}

export function CustomerRequestDetail({ api, id }: { api: BackendApi; id: string }) {
  const params = useSearchParams(); const resource = useResource<JobRequest>(api, `/requests/${id}`); const quotes = useCollection<Quotation>(api, `/requests/${id}/quotations`);
  const quote = latestQuote(quotes.data?.items ?? []); const request = resource.data;
  return <div className={styles.detailPage}><PageTitle title={request ? `คำขอ #${request.no_request}` : "รายละเอียดคำขอผลิต"} description={request?.description} back="/customer/requests" /><ResourceFeedback {...resource} /><ResourceFeedback {...quotes} />
    {params.get("created") === "1" && request && <p className="cust-alert success" role="status">สร้างคำขอ #{request.no_request} แล้ว · ตรวจสถานะไฟล์แนบด้านล่างแยกจากสถานะคำขอ</p>}
    {request?.info_requested_at && (request.status === "pending" || request.status === "ongoing") && <InfoCorrection key={request.info_requested_at} api={api} request={request} onSaved={resource.reload} />}
    {request && <div className="cust-detail-grid"><section className="cust-document"><Badge value={request.status} labels={REQUEST_LABELS} /><h2>รายละเอียดคำขอ</h2><dl className="cust-definition"><div><dt>รายละเอียดงาน</dt><dd>{request.description}</dd></div><div><dt>จำนวน</dt><dd>{request.qty} ชิ้น</dd></div><div><dt>ข้อกำหนดวัตถุดิบ</dt><dd>{request.material_spec || "ไม่ระบุ"}</dd></div><div><dt>วันที่ต้องการรับงาน</dt><dd>{request.deadline ? dateTH(request.deadline) : "ไม่ได้ระบุวันที่ต้องการ"}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div><div><dt>ส่งคำขอเมื่อ</dt><dd>{dateTH(request.created_at)}</dd></div></dl><RequestAttachments api={api} id={id} />{request.status === "canceled" && <Cancellation api={api} id={id} />}<Disclosure title="ประวัติการตัดสินใจใบเสนอราคา"><DecisionHistory api={api} id={id} /></Disclosure></section><aside className="cust-side-summary"><h2>ขั้นตอนปัจจุบัน</h2>{quote ? <><Badge value={quote.status} labels={QUOTE_LABELS} /><p>ใบเสนอราคา #{quote.quotation_no} · ฉบับที่ {quote.version}</p>{quote.status === "approved" ? <OpenedJob api={api} quotationId={quote.id} requestId={id} /> : <Link className="cust-primary" href={customerHref("quotations", { request: id, quotation: quote.id })}>ดูใบเสนอราคา</Link>}</> : <p>{quotes.loading ? "กำลังตรวจสอบใบเสนอราคา…" : quotes.error ? "ยังโหลดขั้นตอนล่าสุดไม่ได้" : "รอร้านประเมินรายละเอียดคำขอ"}</p>}<Limited complete={quotes.data?.complete} /></aside></div>}
  </div>;
}
// UC2 Alt-Step 5: the Worker sent the request back; the customer corrects and resubmits it.
function InfoCorrection({ api, request, onSaved }: { api: BackendApi; request: JobRequest; onSaved: () => void }) {
  const [description, setDescription] = useState(request.description); const [qty, setQty] = useState(String(request.qty));
  const [material, setMaterial] = useState(request.material_spec); const [deadline, setDeadline] = useState(bangkokInputValue(request.deadline));
  const [errors, setErrors] = useState<RequestErrors>({}); const action = useCommand();
  const edit = (field: keyof RequestErrors, set: (value: string) => void) => (value: string) => { set(value); setErrors((old) => ({ ...old, [field]: undefined })); };
  return <section className="cust-alert" aria-labelledby={`info-${request.id}`}>
    <h2 id={`info-${request.id}`}>ร้านขอข้อมูลเพิ่มเติม · กรุณาแก้ไขคำขอแล้วส่งอีกครั้ง</h2>
    <p><strong>คำถามจากพนักงาน:</strong> {request.info_request_note}</p>
    <form noValidate onSubmit={(event) => {
      event.preventDefault();
      const input = { description, qty, material, deadline };
      const found = requestErrors({ ...input, customerId: request.customer_id }, Date.now()); setErrors(found);
      if (Object.keys(found).length) return;
      void action.run(async (signal) => {
        try { await api.call(`/requests/${request.id}`, "PATCH", correctionPayload(input, Date.now()), signal); }
        catch (error) { if (error instanceof ApiError && error.status === 409) throw new Error("แก้ไขไม่ได้ในตอนนี้ คำขออาจมีใบเสนอราคารอคุณตัดสินใจหรือสถานะเปลี่ยนแล้ว โหลดหน้าใหม่"); throw error; }
        onSaved();
      }, "ส่งคำขอที่แก้ไขแล้ว พนักงานจะประเมินต่อ");
    }}><fieldset disabled={action.busy}>
      <Field label="รายละเอียดงาน *" error={errors.description}><textarea maxLength={10000} aria-invalid={Boolean(errors.description) || undefined} value={description} onChange={(e) => edit("description", setDescription)(e.target.value)} /></Field>
      <Field label="จำนวน *" error={errors.qty}><input inputMode="numeric" aria-invalid={Boolean(errors.qty) || undefined} value={qty} onChange={(e) => edit("qty", setQty)(e.target.value)} /></Field>
      <Field label="ข้อกำหนดวัตถุดิบ" error={errors.material}><textarea maxLength={2000} aria-invalid={Boolean(errors.material) || undefined} value={material} onChange={(e) => edit("material", setMaterial)(e.target.value)} /></Field>
      <Field label="วันที่ต้องการรับงาน" hint="เวลาไทย · เว้นว่างได้" error={errors.deadline}><input type="datetime-local" aria-invalid={Boolean(errors.deadline) || undefined} value={deadline} onChange={(e) => edit("deadline", setDeadline)(e.target.value)} /></Field>
      <button className="cust-primary" type="submit">ส่งคำขอที่แก้ไขแล้ว</button>
    </fieldset><ActionFeedback {...action} /></form>
  </section>;
}
function RequestAttachments({ api, id }: { api: BackendApi; id: string }) {
  const resource = useResource<{ items: Attachment[] | null }>(api, `/requests/${id}/attachments`); const [ready, setReady] = useState<Attachment | null>(null);
  return <section className="cust-section"><h2>ไฟล์แนบส่วนตัว</h2><ResourceFeedback {...resource} />{resource.data?.items?.map((file) => <div className="cust-file-row" key={file.id}><span>{file.file_name}<small>{(file.byte_size / 1000000).toFixed(2)} MB · ตรวจไฟล์แล้ว</small></span><PrivateFile api={api} path={`/attachments/${file.id}/download`} /></div>)}{resource.data && !resource.data.items?.length && <p className="cust-muted">ยังไม่มีไฟล์แนบที่ผ่านการตรวจ</p>}<Disclosure title="แนบไฟล์เพิ่มเติม"><CustomerUpload api={api} requestId={id} ready={ready} onReady={(file) => { setReady(file); if (file) resource.reload(); }} /></Disclosure></section>;
}
function OpenedJob({ api, quotationId, requestId }: { api: BackendApi; quotationId: string; requestId: string }) {
  const state = useResource<Fulfillment>(api, `/quotations/${quotationId}/fulfillment`);
  return <><ResourceFeedback {...state} /><div className={styles.detailActions}><Link className={styles.evidenceLink} href={customerHref("deposit-po", { request: requestId, quotation: quotationId })}>ติดตามหลักฐานมัดจำ / PO <Icon name="arrow" size={14} /></Link>{state.data?.job ? <Link className="cust-primary" href={customerHref("jobs", { job: state.data.job.id })}>ติดตามงานผลิต</Link> : state.data && <p className="cust-muted">ยังไม่เปิดงานผลิต</p>}</div></>;
}
function Cancellation({ api, id }: { api: BackendApi; id: string }) {
  const state = useResource<{ reason: string }>(api, `/requests/${id}/rejection`);
  return <section className="cust-alert"><h3>รายละเอียดการยกเลิก</h3><p>{state.data?.reason ?? "ตรวจประวัติการตัดสินใจและหลักฐานมัดจำ / PO เพื่อดูเหตุผลจากระบบ ไม่สามารถเปลี่ยนสถานะเองได้"}</p></section>;
}
function DecisionHistory({ api, id }: { api: BackendApi; id: string }) {
  const state = useCollection<Decision>(api, `/requests/${id}/quotation-decisions`);
  return <><ResourceFeedback {...state} /><Limited complete={state.data?.complete} />{state.data?.items.map((item) => <article className="cust-history-row" key={item.quotation_id}><strong>{item.outcome === "accept" ? "ตอบรับใบเสนอราคา" : "ปฏิเสธใบเสนอราคา"}</strong><p>{dateTH(item.decided_at)} · ปฏิเสธสะสม {item.rejection_count} ครั้ง</p>{item.reason && <p>{item.reason}</p>}</article>)}{state.data && !state.data.items.length && <p>ยังไม่มีการตัดสินใจ</p>}</>;
}
