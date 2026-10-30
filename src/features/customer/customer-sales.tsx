"use client";

import Link from "next/link";
import { useState } from "react";
import type { Attachment, BackendApi, Customer, Decision, JobRequest, Quotation } from "../../lib/api/backend-api";
import { useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { useCollection } from "./customer-hooks";
import { customerHref, dateTH, latestQuote, moneyTH, QUOTE_LABELS, REQUEST_LABELS } from "./customer-domain";
import { fileExtension, fileSize, revisionEvents } from "./customer-documents-domain";
import { quotePreview } from "./customer-request-domain";
import { Badge, ConfirmChoice, Empty, Field, Limited, PrivateFile, ResourceFeedback } from "./customer-ui";
import { CustomerDepositDetail } from "./customer-deposits";
import { CustomerWriteRetry } from "./customer-write";
import { DocumentList } from "./customer-documents";
import { DocumentDetailNavigation } from "./customer-document-navigation";
import { QuotationDocument, QuotationPrint } from "./customer-quotation-document";
import documentStyles from "./customer-documents.module.css";

export function CustomerDocumentList({ api, mode }: { api: BackendApi; mode: "quotes" | "deposit" }) {
  return <DocumentList api={api} mode={mode} />;
}

export function CustomerSalesDetail({ api, requestId, quotationId, deposit = false }: { api: BackendApi; requestId: string; quotationId?: string; deposit?: boolean }) {
  const request = useResource<JobRequest>(api, `/requests/${requestId}`); const quotes = useCollection<Quotation>(api, `/requests/${requestId}/quotations`);
  const current = latestQuote(quotes.data?.items ?? []);
  const quote = quotationId ? quotes.data?.items.find((item) => item.id === quotationId) : deposit ? quotes.data?.items.find((item) => item.status === "approved") : current;
  return <section className={documentStyles.scope}>{(deposit || !quote || !request.data) && <DocumentDetailNavigation />}<ResourceFeedback {...request} /><ResourceFeedback {...quotes} /><Limited complete={quotes.data?.complete} />
    {quote && request.data ? deposit ? quote.status === "approved" ? <CustomerDepositDetail api={api} request={request.data} quote={quote} /> : <Empty title="ยังไม่มีเงื่อนไขที่ตอบรับ" action={<Link href={customerHref("quotations", { request: requestId, quotation: quote.id })}>พิจารณาใบเสนอราคา</Link>}>ตอบรับใบเสนอราคาก่อนส่งหลักฐาน</Empty> : <QuotationDetail key={`${quote.id}:${quote.lock_version}`} api={api} request={request.data} quote={quote} quotes={quotes.data?.items ?? []} latest={current?.id === quote.id} reload={() => { quotes.reload(); request.reload(); }} /> : quotes.data && !quotes.loading && <Empty title="ไม่พบใบเสนอราคาที่เปิดดูได้" action={<Link href="/customer/quotations">กลับใบเสนอราคา</Link>}>อาจยังไม่มีใบเสนอราคา หรือคุณไม่มีสิทธิ์ดูรายการนี้</Empty>}
  </section>;
}

function QuotationDetail({ api, request, quote, quotes, latest, reload }: { api: BackendApi; request: JobRequest; quote: Quotation; quotes: Quotation[]; latest: boolean; reload: () => void }) {
  const history = useCollection<Decision>(api, `/requests/${request.id}/quotation-decisions`); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers");
  const files = useCollection<Attachment>(api, `/requests/${request.id}/attachments`);
  const [choice, setChoice] = useState<"accept" | "reject" | null>(null); const [reason, setReason] = useState(""); const [notice, setNotice] = useState("");
  const write = useRetryableWrite(api, () => { setChoice(null); setNotice("ระบบบันทึกการตัดสินใจแล้ว ตรวจเงื่อนไขหรือประวัติล่าสุดด้านล่าง"); history.reload(); reload(); });
  const rejectionCount = Math.max(0, ...(history.data?.items.map((item) => item.rejection_count) ?? []));
  const profile = profiles.data?.items?.find((item) => item.id === request.customer_id);
  const preview = profile ? quotePreview(quote.final_price, profile.customer_type) : null;
  const terms = history.data?.items.find((item) => item.quotation_id === quote.id && item.outcome === "accept")?.terms;
  const printReady = Boolean(profile && !profiles.loading && !profiles.error && !write.frozen && (quote.status !== "approved" || terms && history.data?.complete && !history.loading && !history.error));
  const canDecide = latest && quote.status === "sent" && request.status !== "canceled" && history.data?.complete && !history.loading && !history.error;
  function decide() {
    write.submit(`/quotations/${quote.id}/decision`, "POST", () => {
      const trimmed = reason.trim();
      if (choice === "reject" && (!trimmed || [...trimmed].length > 2000)) throw new Error("กรุณาระบุเหตุผล 1–2,000 ตัวอักษร");
      return { outcome: choice, expected_lock_version: BigInt(quote.lock_version), ...(choice === "reject" ? { reason: trimmed } : {}) };
    }, "");
  }
  const closeChoice = () => { if (!write.frozen) { setChoice(null); setReason(""); } };
  const canceled = request.status === "canceled";
  const banner = canceled ? { tone: "quiet", title: "คำขอนี้ถูกยกเลิกแล้ว", text: "ใบเสนอราคาเปิดดูได้อย่างเดียว" }
    : !latest ? { tone: "quiet", title: "ฉบับเก่า อ่านอย่างเดียว", text: "เปิดฉบับล่าสุดจากประวัติด้านล่าง" }
    : quote.status === "sent" ? { tone: "info", title: "รอคุณตอบ", text: "ตรวจรายละเอียดและราคา แล้วตอบรับหรือขอใบเสนอราคาใหม่" }
    : quote.status === "approved" ? { tone: "success", title: "คุณตอบรับใบเสนอราคานี้แล้ว", text: "ขั้นถัดไปคือส่งหลักฐานตามเงื่อนไขที่บันทึกไว้" }
    : { tone: "quiet", title: "ส่งเหตุผลให้ร้านแล้ว", text: "ร้านจะตรวจสอบและส่งใบเสนอราคาฉบับใหม่มาให้" };
  const depositText = terms ? terms.deposit_required ? `มัดจำขั้นต่ำ ${moneyTH(terms.deposit_amount)}` : "ไม่ต้องวางมัดจำ" : preview ? preview.deposit ? `มัดจำขั้นต่ำ ${moneyTH(preview.minimum)}` : "ไม่ต้องวางมัดจำ" : "—";
  const retry = <CustomerWriteRetry write={write} onReload={() => { history.reload(); reload(); }} />;
  return <><DocumentDetailNavigation blocked={write.frozen} />
    <header className={documentStyles.detailHead}>
      <div><div className={documentStyles.detailTitle}><h1 tabIndex={-1}>ใบเสนอราคา #{quote.quotation_no}</h1><span className={documentStyles.revision}>ฉบับที่ {quote.version}</span><Badge value={quote.status} labels={QUOTE_LABELS} /></div><p>{request.description} · คำขอ #{request.no_request}</p></div>
      <QuotationPrint ready={printReady}><QuotationDocument request={request} quote={quote} customer={profile} terms={terms} /></QuotationPrint>
    </header>
    {notice && <p role="status" className="cust-alert success">{notice}</p>}
    <ResourceFeedback {...profiles} loading={false} />
    <p role="status" className={documentStyles.statusBanner} data-tone={banner.tone}><strong>{banner.title}</strong> {banner.text}</p>
    <dl className={documentStyles.summary} aria-label="สรุปใบเสนอราคา">
      <div><dt>ส่งใบเสนอราคาเมื่อ</dt><dd>{dateTH(quote.sent_at)}</dd></div>
      <div><dt>จำนวนทั้งงาน</dt><dd>{request.qty} ชิ้น</dd></div>
      <div><dt>วันที่ลูกค้าต้องการ</dt><dd>{dateTH(request.deadline)}</dd></div>
      <div><dt>มัดจำ</dt><dd>{depositText}</dd></div>
      <div className={documentStyles.summaryTotal}><dt>ราคารวมทั้งงาน</dt><dd>{moneyTH(quote.final_price)}</dd></div>
    </dl>
    <section className={documentStyles.card2} aria-labelledby="quote-items">
      <h2 id="quote-items">รายการและข้อกำหนด</h2>
      <table className={documentStyles.table}><thead><tr><th scope="col">ชิ้นงานและรายละเอียด</th><th scope="col">ข้อกำหนดวัตถุดิบ</th><th scope="col" data-numeric>จำนวน</th><th scope="col" data-numeric>ราคารวม</th></tr></thead>
        <tbody><tr><td data-label="ชิ้นงานและรายละเอียด"><span className="cust-preserve">{request.description}</span></td><td data-label="ข้อกำหนดวัตถุดิบ">{request.material_spec || "ไม่ระบุ"}</td><td data-label="จำนวน" data-numeric>{request.qty} ชิ้น</td><td data-label="ราคารวม" data-numeric>{moneyTH(quote.final_price)}</td></tr></tbody></table>
      <div className={documentStyles.totalBar}><p>ราคานี้คือราคารวมทั้งงาน ไม่ใช่ราคาต่อชิ้น ร้านไม่เปิดเผยการแยกค่าวัสดุและค่าแรงในใบเสนอราคา · ไม่มี VAT</p><div><span>ยอดรวม</span><strong>{moneyTH(quote.final_price)}</strong></div></div>
    </section>
    <div className={documentStyles.detailGrid}>
      <section className={documentStyles.card2} aria-labelledby="quote-request"><h2 id="quote-request">คำขอผลิต #{request.no_request}</h2>
        <dl className={documentStyles.facts}><div><dt>ส่งคำขอเมื่อ</dt><dd>{dateTH(request.created_at)}</dd></div><div><dt>สถานะคำขอ</dt><dd>{REQUEST_LABELS[request.status] ?? "สถานะยังไม่ระบุ"}</dd></div><div><dt>วันที่ต้องการ</dt><dd>{dateTH(request.deadline)}<small>ไม่ใช่กำหนดส่งที่ร้านยืนยัน</small></dd></div></dl>
        <Link href={customerHref("requests", { request: request.id })}>ดูคำขอผลิต →</Link></section>
      <section className={documentStyles.card2} aria-labelledby="quote-terms"><h2 id="quote-terms">{terms ? "เงื่อนไขที่บันทึกเมื่อตอบรับ" : "เมื่อตอบรับ คุณต้อง"}</h2>
        {terms ? <dl className={documentStyles.facts}><div><dt>มัดจำขั้นต่ำ</dt><dd>{terms.deposit_required ? moneyTH(terms.deposit_amount) : "ไม่ต้องวางมัดจำ"}</dd></div><div><dt>ใบสั่งซื้อ PO</dt><dd>{terms.po_required ? "ต้องส่ง" : "ไม่ต้องส่ง"}</dd></div><div><dt>ส่งหลักฐานภายใน</dt><dd>{dateTH(terms.documents_due_at)}</dd></div></dl>
          : quote.status === "sent" ? <><ResourceFeedback {...profiles} />{preview ? <ul className="cust-terms-list"><li>{preview.deposit ? `ส่งมัดจำขั้นต่ำ ${moneyTH(preview.minimum)}` : "ไม่ต้องวางมัดจำ"}</li><li>{preview.po ? "ส่งใบสั่งซื้อ PO" : "ไม่ต้องส่ง PO"}</li><li>ส่งหลักฐานให้ครบภายใน 14 วันหลังตอบรับ</li></ul> : <p>ยังโหลดประเภทบัญชีผู้สั่งไม่ได้ กรุณาอัปเดตข้อมูลก่อนตอบรับ</p>}<small>เงื่อนไขสุดท้ายและวันครบกำหนดจะถูกบันทึกโดยระบบเมื่อคุณตอบรับ</small></> : <p className="cust-muted">ไม่มีเงื่อนไขที่บันทึกสำหรับฉบับนี้</p>}
        <p className="cust-muted cust-small">ปฏิเสธแล้ว {rejectionCount} ครั้ง · 5 ครั้งแรกยังแก้ไขราคาได้ ครั้งที่ 6 ยกเลิกคำขอ</p></section>
      <section className={documentStyles.card2} aria-labelledby="quote-files"><h2 id="quote-files">ไฟล์แนบของคำขอ</h2><ResourceFeedback {...files} /><Limited complete={files.data?.complete} />
        {files.data && !files.data.items.length && <p className="cust-muted">คำขอนี้ไม่มีไฟล์แนบ</p>}
        <ul className={documentStyles.fileList}>{files.data?.items.map((file) => <li key={file.id}><span aria-hidden="true" className={documentStyles.fileTag}>{fileExtension(file.file_name)}</span><span className={documentStyles.fileMeta}><span>{file.file_name}</span><small>{fileSize(file.byte_size)}</small></span><span className={documentStyles.fileAction}><PrivateFile api={api} path={`/attachments/${file.id}/download`} name="ดาวน์โหลด" /></span></li>)}</ul></section>
    </div>
    <section className={documentStyles.card2} aria-labelledby="quote-history"><h2 id="quote-history">ประวัติฉบับและการตัดสินใจ</h2><ResourceFeedback {...history} /><Limited complete={history.data?.complete} />
      <ol className={documentStyles.timeline}>{revisionEvents(quotes, history.data?.items ?? []).map((event) => <li key={event.id}><div className={documentStyles.timelineHead}><strong>{event.decision ? event.decision.outcome === "accept" ? `คุณตอบรับฉบับที่ ${event.quote.version}` : `คุณปฏิเสธฉบับที่ ${event.quote.version}` : `ร้านส่งฉบับที่ ${event.quote.version}`}</strong><time dateTime={event.at}>{dateTH(event.at)}</time>{!event.decision && event.quote.id === quote.id && <span className={documentStyles.revision}>กำลังเปิดดู</span>}</div>
        {event.decision ? <>{event.decision.reason && <p>เหตุผล: {event.decision.reason}</p>}<p>ปฏิเสธสะสม {event.decision.rejection_count} ครั้ง</p>{event.decision.terms && <p>เงื่อนไขที่บันทึก: มัดจำ {event.decision.terms.deposit_required ? moneyTH(event.decision.terms.deposit_amount) : "ไม่ต้องวางมัดจำ"} · PO {event.decision.terms.po_required ? "ต้องส่ง" : "ไม่ต้องส่ง"} · ส่งหลักฐานภายใน {dateTH(event.decision.terms.documents_due_at)}</p>}</>
          : <p>{moneyTH(event.quote.final_price)} · {QUOTE_LABELS[event.quote.status]}{event.quote.id !== quote.id && <> · <Link href={customerHref("quotations", { request: request.id, quotation: event.quote.id })}>เปิดฉบับนี้ →</Link></>}</p>}</li>)}</ol>
    </section>
    {canDecide && !choice && <div className={documentStyles.decisionBar} role="region" aria-label="การตัดสินใจของคุณ"><div><span>ฉบับที่ {quote.version} · ไม่มี VAT</span><strong>{moneyTH(quote.final_price)}</strong></div><div className={documentStyles.decisionActions}><button type="button" disabled={write.frozen} onClick={() => setChoice("reject")}>ขอใบเสนอราคาใหม่</button><button type="button" className="cust-primary" disabled={write.frozen || !preview} onClick={() => setChoice("accept")}>ตอบรับใบเสนอราคา</button></div></div>}
    {quote.status === "approved" && latest && !canceled && <div className={documentStyles.decisionBar} role="region" aria-label="ขั้นถัดไป"><p>ตอบรับแล้ว ส่งหลักฐานมัดจำหรือ PO ตามเงื่อนไขเพื่อให้ร้านเริ่มงาน</p><Link className="cust-primary" href={customerHref("deposit-po", { request: request.id, quotation: quote.id })}>ดูเงื่อนไขและส่งหลักฐาน</Link></div>}
    {choice ? <div className={documentStyles.overlay} onClick={(event) => { if (event.target === event.currentTarget) closeChoice(); }} onKeyDown={(event) => { if (event.key === "Escape") closeChoice(); }}><div role="dialog" aria-modal="true" aria-label={choice === "accept" ? "ตอบรับใบเสนอราคา" : "ขอใบเสนอราคาใหม่"} className={documentStyles.modal}>
      <ConfirmChoice title={choice === "accept" ? `ตอบรับใบเสนอราคา #${quote.quotation_no}?` : rejectionCount >= 5 ? "การปฏิเสธครั้งนี้จะยกเลิกคำขอผลิต" : `ขอใบเสนอราคาใหม่แทน #${quote.quotation_no}`} busy={write.frozen} danger={choice === "reject"} onCancel={closeChoice} onConfirm={decide}>
        <p>{choice === "accept" ? `คุณกำลังตอบรับราคารวม ${moneyTH(quote.final_price)} ระบบจะเริ่มกำหนดส่งหลักฐาน 14 วัน นี่ยังไม่ใช่การชำระเงินหรือรับเข้าคิวผลิต` : rejectionCount >= 5 ? "คุณปฏิเสธแล้ว 5 ครั้ง ครั้งที่ 6 จะยกเลิกคำขอนี้และไม่สามารถขอฉบับใหม่สำหรับคำขอเดิมได้" : "ระบบจะบันทึกว่าคุณปฏิเสธฉบับนี้ ร้านจะเห็นเหตุผลและสามารถเสนอราคาฉบับใหม่ได้"}</p>{choice === "reject" && <Field label="สิ่งที่ต้องการให้เปลี่ยน / เหตุผล *"><textarea required maxLength={2000} disabled={write.frozen} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>}
      </ConfirmChoice>{retry}</div></div> : retry}
  </>;
}
