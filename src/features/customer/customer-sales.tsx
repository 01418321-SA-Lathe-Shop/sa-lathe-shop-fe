"use client";

import Link from "next/link";
import { useState } from "react";
import type { BackendApi, Customer, Decision, JobRequest, Quotation } from "../../lib/api/backend-api";
import { useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { useCollection } from "./customer-hooks";
import { customerHref, dateTH, latestQuote, moneyTH, QUOTE_LABELS } from "./customer-domain";
import { quotePreview } from "./customer-request-domain";
import { Badge, ConfirmChoice, Disclosure, Empty, Field, Limited, PageTitle, ResourceFeedback } from "./customer-ui";
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
    {quote && request.data ? deposit ? quote.status === "approved" ? <CustomerDepositDetail api={api} request={request.data} quote={quote} /> : <Empty title="ยังไม่มีเงื่อนไขที่ตอบรับ" action={<Link href={customerHref("quotations", { request: requestId, quotation: quote.id })}>พิจารณาใบเสนอราคา</Link>}>ตอบรับใบเสนอราคาก่อนส่งหลักฐาน</Empty> : <QuotationDetail key={`${quote.id}:${quote.lock_version}`} api={api} request={request.data} quote={quote} latest={current?.id === quote.id} reload={() => { quotes.reload(); request.reload(); }} /> : quotes.data && !quotes.loading && <Empty title="ไม่พบใบเสนอราคาที่เปิดดูได้" action={<Link href="/customer/quotations">กลับใบเสนอราคา</Link>}>อาจยังไม่มีใบเสนอราคา หรือคุณไม่มีสิทธิ์ดูรายการนี้</Empty>}
  </section>;
}

function QuotationDetail({ api, request, quote, latest, reload }: { api: BackendApi; request: JobRequest; quote: Quotation; latest: boolean; reload: () => void }) {
  const history = useCollection<Decision>(api, `/requests/${request.id}/quotation-decisions`); const profiles = useResource<{ items: Customer[] | null }>(api, "/customers");
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
  return <><DocumentDetailNavigation blocked={write.frozen} /><PageTitle title={`ใบเสนอราคา #${quote.quotation_no}`} description={`${request.description} · ฉบับที่ ${quote.version} · คำขอ #${request.no_request}`} />
    {notice && <p role="status" className="cust-alert success">{notice}</p>}
    <ResourceFeedback {...profiles} loading={false} />
    <div className={documentStyles.quotationLayout}><section><QuotationPrint ready={printReady}><QuotationDocument request={request} quote={quote} customer={profile} terms={terms} /></QuotationPrint><Link href={customerHref("requests", { request: request.id })}>ดูคำขอและไฟล์แนบ →</Link>
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
