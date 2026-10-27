"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import type { BackendApi, Customer, Decision, JobRequest, Quotation } from "../../lib/api/backend-api";
import { useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { useCollection } from "./customer-hooks";
import { useSalesIndex } from "./customer-sales-data";
import { customerHref, dateTH, latestQuote, moneyTH, QUOTE_LABELS } from "./customer-domain";
import { quotePreview } from "./customer-request-domain";
import { Badge, ConfirmChoice, Disclosure, Empty, Field, Limited, LocalPages, PageTitle, ResourceFeedback } from "./customer-ui";
import { CustomerDepositDetail, DepositChecklist } from "./customer-deposits";
import { CustomerWriteRetry } from "./customer-write";

export function CustomerDocumentList({ api, mode }: { api: BackendApi; mode: "quotes" | "deposit" }) {
  const data = useSalesIndex(api); const params = useSearchParams(); const [page, setPage] = useState(0); const history = params.get("view") === "history";
  const section = mode === "quotes" ? "quotations" : "deposit-po";
  const rows = data.records.flatMap((record) => record.quotations.filter((quote) => mode === "deposit" ? quote.status === "approved" : history ? quote.status !== "sent" : quote.status === "sent").map((quote) => ({ ...record, quote })));
  return <><PageTitle title={mode === "quotes" ? "ใบเสนอราคา" : "มัดจำและ PO"} description={mode === "quotes" ? "พิจารณาราคาและเงื่อนไขก่อนตอบรับ" : "ตรวจสิ่งที่ต้องส่งและกำหนดเวลาจากเงื่อนไขที่ตอบรับ"} />
    {mode === "quotes" && <nav className="cust-tabs" aria-label="กรองใบเสนอราคา"><Link href="/customer/quotations" aria-current={!history ? "page" : undefined}>รอพิจารณา</Link><Link href="/customer/quotations?view=history" aria-current={history ? "page" : undefined}>ประวัติ</Link></nav>}
    <ResourceFeedback {...data} />{data.data && !data.loading && <Limited complete={data.complete} />}
    <div className={mode === "quotes" ? "cust-quote-inbox" : "cust-deposit-list"}>{rows.slice(page * 20, page * 20 + 20).map(({ request, quote, fulfillment }) => <article className="cust-document-row" key={quote.id}>
      <div><p className="cust-muted cust-small">คำขอ #{request.no_request} · ใบเสนอราคา #{quote.quotation_no} · ฉบับที่ {quote.version}</p><h2>{request.description}</h2><Badge value={quote.status} labels={QUOTE_LABELS} />
        {mode === "deposit" && fulfillment && <><p className="cust-due">ส่งหลักฐานภายใน <strong>{dateTH(fulfillment.terms.documents_due_at)}</strong></p><DepositChecklist state={fulfillment} /></>}
      </div><div className="cust-document-action">{mode === "quotes" && <><strong className="cust-list-price">{moneyTH(quote.final_price)}</strong><p className="cust-muted">ราคารวมทั้งงาน · ไม่มี VAT</p></>}<Link className="cust-link" href={customerHref(section, { request: request.id, quotation: quote.id })}>{mode === "quotes" ? "ดูรายละเอียดใบเสนอราคา" : fulfillment?.job ? "ดูหลักฐานและงานผลิต" : "ดูและส่งหลักฐาน"} →</Link></div>
    </article>)}</div>
    {data.data && !data.loading && !data.error && !rows.length && <Empty title={!data.complete ? "ยังตรวจรายการเอกสารได้ไม่ครบ" : mode === "quotes" ? history ? "ยังไม่มีประวัติใบเสนอราคา" : "ไม่มีใบเสนอราคาที่รอพิจารณา" : "ยังไม่มีรายการมัดจำหรือ PO"} action={!data.complete ? <button onClick={data.reload}>ลองโหลดอีกครั้ง</button> : <Link href="/customer/requests">ดูคำขอผลิต</Link>}>{!data.complete ? "บางรายการยังโหลดไม่ได้ จึงยังยืนยันไม่ได้ว่าไม่มีเอกสาร" : mode === "deposit" ? "รายการจะปรากฏหลังคุณตอบรับใบเสนอราคา" : "เมื่อร้านส่งใบเสนอราคา คุณจะเปิดพิจารณาได้ที่นี่"}</Empty>}
    <LocalPages count={rows.length} page={page} setPage={setPage} />
  </>;
}

export function CustomerSalesDetail({ api, requestId, quotationId, deposit = false }: { api: BackendApi; requestId: string; quotationId?: string; deposit?: boolean }) {
  const request = useResource<JobRequest>(api, `/requests/${requestId}`); const quotes = useCollection<Quotation>(api, `/requests/${requestId}/quotations`);
  const current = latestQuote(quotes.data?.items ?? []);
  const quote = quotationId ? quotes.data?.items.find((item) => item.id === quotationId) : deposit ? quotes.data?.items.find((item) => item.status === "approved") : current;
  return <><ResourceFeedback {...request} /><ResourceFeedback {...quotes} /><Limited complete={quotes.data?.complete} />
    {quote && request.data ? deposit ? quote.status === "approved" ? <CustomerDepositDetail api={api} request={request.data} quote={quote} /> : <Empty title="ยังไม่มีเงื่อนไขที่ตอบรับ" action={<Link href={customerHref("quotations", { request: requestId, quotation: quote.id })}>พิจารณาใบเสนอราคา</Link>}>ตอบรับใบเสนอราคาก่อนส่งหลักฐาน</Empty> : <QuotationDetail key={`${quote.id}:${quote.lock_version}`} api={api} request={request.data} quote={quote} latest={current?.id === quote.id} reload={() => { quotes.reload(); request.reload(); }} /> : quotes.data && !quotes.loading && <Empty title="ไม่พบใบเสนอราคาที่เปิดดูได้" action={<Link href="/customer/quotations">กลับใบเสนอราคา</Link>}>อาจยังไม่มีใบเสนอราคา หรือคุณไม่มีสิทธิ์ดูรายการนี้</Empty>}
  </>;
}

function QuotationDetail({ api, request, quote, latest, reload }: { api: BackendApi; request: JobRequest; quote: Quotation; latest: boolean; reload: () => void }) {
  const history = useCollection<Decision>(api, `/requests/${request.id}/quotation-decisions`); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers");
  const [choice, setChoice] = useState<"accept" | "reject" | null>(null); const [reason, setReason] = useState(""); const [notice, setNotice] = useState("");
  const write = useRetryableWrite(api, () => { setChoice(null); setNotice("ระบบบันทึกการตัดสินใจแล้ว ตรวจเงื่อนไขหรือประวัติล่าสุดด้านล่าง"); history.reload(); reload(); });
  const rejectionCount = Math.max(0, ...(history.data?.items.map((item) => item.rejection_count) ?? []));
  const profile = profiles.data?.items?.find((item) => item.id === request.customer_id);
  const preview = profile ? quotePreview(quote.final_price, profile.customer_type) : null;
  const canDecide = latest && quote.status === "sent" && request.status !== "canceled" && history.data?.complete && !history.loading && !history.error;
  function decide() {
    write.submit(`/quotations/${quote.id}/decision`, "POST", () => {
      const trimmed = reason.trim();
      if (choice === "reject" && (!trimmed || [...trimmed].length > 2000)) throw new Error("กรุณาระบุเหตุผล 1–2,000 ตัวอักษร");
      return { outcome: choice, expected_lock_version: BigInt(quote.lock_version), ...(choice === "reject" ? { reason: trimmed } : {}) };
    }, "");
  }
  return <><PageTitle title={request.description} description={`ใบเสนอราคา #${quote.quotation_no} · ฉบับที่ ${quote.version} · คำขอ #${request.no_request}`} back="/customer/quotations" />
    {notice && <p role="status" className="cust-alert success">{notice}</p>}
    <div className="cust-quotation-layout"><section className="cust-document"><h2>ขอบเขตงานที่เสนอ</h2><p className="cust-preserve">{request.description}</p><dl className="cust-definition"><div><dt>จำนวนทั้งงาน</dt><dd>{request.qty} ชิ้น</dd></div><div><dt>ข้อกำหนดวัตถุดิบ</dt><dd>{request.material_spec || "ไม่ระบุ"}</dd></div><div><dt>วันที่ลูกค้าต้องการ</dt><dd>{dateTH(request.deadline)}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div></dl><Link href={customerHref("requests", { request: request.id })}>ดูคำขอและไฟล์แนบ →</Link>
      <Disclosure title="เปรียบเทียบราคาและประวัติฉบับก่อน"><QuotationHistory api={api} requestId={request.id} current={quote.id} /></Disclosure>
      <section className="cust-section"><h2>ประวัติการตัดสินใจ</h2><ResourceFeedback {...history} /><Limited complete={history.data?.complete} />{history.data?.items.map((decision) => <article className="cust-history-row" key={decision.quotation_id}><strong>{decision.outcome === "accept" ? "ตอบรับแล้ว" : "ปฏิเสธแล้ว"}</strong><p>{dateTH(decision.decided_at)} · ปฏิเสธสะสม {decision.rejection_count} ครั้ง</p>{decision.reason && <p>{decision.reason}</p>}{decision.terms && <p>เงื่อนไขที่บันทึก: มัดจำ {decision.terms.deposit_required ? moneyTH(decision.terms.deposit_amount) : "ไม่ต้องวางมัดจำ"} · PO {decision.terms.po_required ? "ต้องส่ง" : "ไม่ต้องส่ง"} · ส่งหลักฐานภายใน {dateTH(decision.terms.documents_due_at)}</p>}</article>)}</section>
    </section><aside className="cust-price-panel"><Badge value={quote.status} labels={QUOTE_LABELS} /><p>ราคารวมทั้งงาน</p><strong className="cust-hero-price">{moneyTH(quote.final_price)}</strong><p className="cust-muted">จำนวน {request.qty} ชิ้น · ไม่มี VAT</p>
      {quote.status === "sent" && <section><h2>เมื่อตอบรับ คุณต้อง</h2><ResourceFeedback {...profiles} />{preview ? <ul className="cust-terms-list"><li>{preview.deposit ? `ส่งมัดจำขั้นต่ำ ${moneyTH(preview.minimum)}` : "ไม่ต้องวางมัดจำ"}</li><li>{preview.po ? "ส่งใบสั่งซื้อ PO" : "ไม่ต้องส่ง PO"}</li><li>ส่งหลักฐานให้ครบภายใน 14 วันหลังตอบรับ</li></ul> : <p>ยังโหลดประเภทบัญชีผู้สั่งไม่ได้ กรุณาอัปเดตข้อมูลก่อนตอบรับ</p>}<small>เงื่อนไขสุดท้ายและวันครบกำหนดจะถูกบันทึกโดยระบบเมื่อคุณตอบรับ</small></section>}
      <p className="cust-muted">ปฏิเสธแล้ว {rejectionCount} ครั้ง · 5 ครั้งแรกยังแก้ไขราคาได้ ครั้งที่ 6 ยกเลิกคำขอ</p>
      {!latest && <p className="cust-alert">ฉบับเก่า อ่านอย่างเดียว เปิดฉบับล่าสุดจากหน้าใบเสนอราคา</p>}
      {canDecide && !choice && <div className="cust-decision-bar"><button className="cust-primary" disabled={write.frozen || !preview} onClick={() => setChoice("accept")}>ตอบรับใบเสนอราคา</button><button className="cust-link" disabled={write.frozen} onClick={() => setChoice("reject")}>ปฏิเสธและระบุเหตุผล</button></div>}
      {quote.status === "approved" && <Link className="cust-primary" href={customerHref("deposit-po", { request: request.id, quotation: quote.id })}>ดูเงื่อนไขและส่งหลักฐาน</Link>}
    </aside></div>
    {choice && <ConfirmChoice title={choice === "accept" ? "ยืนยันตอบรับใบเสนอราคา" : rejectionCount >= 5 ? "การปฏิเสธครั้งนี้จะยกเลิกคำขอผลิต" : "ยืนยันปฏิเสธใบเสนอราคา"} busy={write.frozen} danger={choice === "reject"} onCancel={() => { setChoice(null); setReason(""); }} onConfirm={decide}>
      <p>{choice === "accept" ? `คุณกำลังตอบรับราคารวม ${moneyTH(quote.final_price)} ระบบจะเริ่มกำหนดส่งหลักฐาน 14 วัน นี่ยังไม่ใช่การชำระเงินหรือรับเข้าคิวผลิต` : rejectionCount >= 5 ? "คุณปฏิเสธแล้ว 5 ครั้ง ครั้งที่ 6 จะยกเลิกคำขอนี้และไม่สามารถขอฉบับใหม่สำหรับคำขอเดิมได้" : "ร้านจะเห็นเหตุผลและสามารถเสนอราคาฉบับใหม่ได้"}</p>{choice === "reject" && <Field label="เหตุผลที่ปฏิเสธ *"><textarea required maxLength={2000} disabled={write.frozen} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
    </ConfirmChoice>}
    <CustomerWriteRetry write={write} onReload={() => { history.reload(); reload(); }} />
  </>;
}
function QuotationHistory({ api, requestId, current }: { api: BackendApi; requestId: string; current: string }) {
  const quotes = useCollection<Quotation>(api, `/requests/${requestId}/quotations`);
  return <><ResourceFeedback {...quotes} /><Limited complete={quotes.data?.complete} />{quotes.data?.items.map((quote) => <article className="cust-history-row" key={quote.id}><strong>ฉบับที่ {quote.version}{quote.id === current ? " · กำลังเปิดดู" : ""}</strong><p>{moneyTH(quote.final_price)} · {QUOTE_LABELS[quote.status]}</p><Link href={customerHref("quotations", { request: requestId, quotation: quote.id })}>เปิดฉบับนี้ →</Link></article>)}</>;
}
