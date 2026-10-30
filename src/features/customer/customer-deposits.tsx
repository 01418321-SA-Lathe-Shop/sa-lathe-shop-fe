"use client";

import Link from "next/link";
import { useState } from "react";
import type { Attachment, BackendApi, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api";
import { useResource, useRetryableWrite } from "../../hooks/backend-hooks";
import { availableEvidenceKinds, evidencePayload } from "../fulfillment/fulfillment-domain";
import { customerHref, dateTH, EVIDENCE_LABELS, moneyTH } from "./customer-domain";
import { useNow } from "./customer-hooks";
import { Badge, Field, PageTitle, PrivateFile, ResourceFeedback } from "./customer-ui";
import { CustomerUpload } from "./customer-upload";
import { CustomerWriteRetry } from "./customer-write";
import { CustomerPoPreview } from "./customer-po-preview";
import styles from "./customer-documents.module.css";

export function DepositChecklist({ state, className = "cust-checklist" }: { state: Fulfillment; className?: string }) {
  return <ul className={className}>{(["deposit", "po"] as const).filter((kind) => kind === "deposit" ? state.terms.deposit_required : state.terms.po_required).map((kind) => {
    const active = state.evidence?.find((item) => item.kind === kind && item.status !== "rejected");
    const rejected = state.evidence?.some((item) => item.kind === kind && item.status === "rejected");
    return <li key={kind}><span>{kind === "deposit" ? `มัดจำขั้นต่ำ ${moneyTH(state.terms.deposit_amount)}` : "ใบสั่งซื้อ PO"}</span>{active ? <Badge value={active.status} labels={EVIDENCE_LABELS} /> : <span>{rejected ? "ต้องแก้ไขและส่งใหม่" : "ยังไม่ส่ง"}</span>}</li>;
  })}</ul>;
}

export function CustomerDepositDetail({ api, request, quote }: { api: BackendApi; request: JobRequest; quote: Quotation }) {
  const resource = useResource<Fulfillment>(api, `/quotations/${quote.id}/fulfillment`); const [kind, setKind] = useState<"deposit" | "po" | null>(null); const [notice, setNotice] = useState(""); const now = useNow();
  const state = resource.data; const available = state && now !== null && !resource.loading ? availableEvidenceKinds(state, now) : [];
  const activeKind = kind && available.includes(kind) ? kind : available[0];
  return <><PageTitle title="หลักฐานมัดจำและ PO" description={`${request.description} · คำขอ #${request.no_request}`} /><ResourceFeedback {...resource} />
    {notice && <p role="status" className="cust-alert success">{notice}</p>}
    {state && <div className={`${styles.quotationLayout} ${styles.depositLayout}`}><section>
      <CustomerPoPreview key={`${quote.id}:${state.evidence?.map((item) => item.id).join(":")}`} api={api} request={request} state={state} />
      <section className="cust-document"><h2>{state.job ? "ประวัติหลักฐาน" : "ส่งหลักฐานให้ครบตามเงื่อนไข"}</h2>
      {state.canceled_at && <p className="cust-alert danger">คำขอถูกยกเลิกแล้วเมื่อ {dateTH(state.canceled_at)} ไม่สามารถส่งหลักฐานใหม่</p>}
      {!state.job && !state.canceled_at && now !== null && now > Date.parse(state.terms.documents_due_at) && <p className="cust-alert">พ้นกำหนดส่งหลักฐานแล้ว หากส่งครบและทันเวลาก่อนหน้านี้ เจ้าหน้าที่ยังตรวจได้ ระบบเป็นผู้ตัดสินการหมดเวลา หน้านี้ไม่ต่อเวลาให้เอง</p>}
      {available.length > 0 && <><div className="cust-tabs" aria-label="ประเภทหลักฐาน">{available.map((item) => <button key={item} aria-pressed={activeKind === item} onClick={() => setKind(item)}>{item === "deposit" ? "หลักฐานมัดจำ" : "ใบสั่งซื้อ PO"}</button>)}</div>{activeKind && <DepositForm key={`${activeKind}:${resource.data?.evidence?.length}`} api={api} state={state} kind={activeKind} requestId={request.id} quotationId={quote.id} onReload={resource.reload} onSaved={() => { setKind(null); setNotice("ส่งหลักฐานแล้ว รอเจ้าหน้าที่ตรวจสอบ ยังไม่ใช่การอนุมัติหรือการชำระเงินอัตโนมัติ"); resource.reload(); }} />}</>}
      {!available.length && !state.job && !state.canceled_at && now !== null && now <= Date.parse(state.terms.documents_due_at) && <p className="cust-alert">ส่งหลักฐานที่ต้องใช้ครบแล้ว รอตรวจสอบ ไม่ต้องส่งซ้ำ</p>}
      <section className="cust-section"><h2>หลักฐานที่ส่งแล้ว</h2>{!state.evidence?.length && <p className="cust-muted">ยังไม่มีหลักฐาน ใบแบบงานไม่ใช่สลิปหรือ PO โดยอัตโนมัติ</p>}{state.evidence?.map((item) => <article key={item.id} className="cust-history-row"><div className="cust-toolbar"><h3>{item.kind === "deposit" ? "หลักฐานมัดจำ" : "ใบสั่งซื้อ PO"}</h3><Badge value={item.status} labels={EVIDENCE_LABELS} /></div><p>ส่งเมื่อ {dateTH(item.submitted_at)}{item.amount !== undefined ? ` · ${moneyTH(item.amount)}` : ""}</p>{item.reason && <p className="cust-alert danger">เหตุผลที่ต้องแก้ไข: {item.reason}</p>}<PrivateFile api={api} path={`/attachments/${item.attachment_id}/download`} name={item.kind === "po" ? "เปิดใบ PO" : "เปิดหลักฐานมัดจำ"} /></article>)}</section><button onClick={resource.reload}>อัปเดตสถานะหลักฐาน</button>
    </section></section><aside className="cust-price-panel"><h2>เงื่อนไขที่ตอบรับ</h2><p>ราคารวมทั้งงาน</p><strong className="cust-hero-price">{moneyTH(state.terms.final_price)}</strong><p className="cust-muted">จำนวน {request.qty} ชิ้น · ไม่มี VAT</p><dl className="cust-definition"><div><dt>ประเภทผู้สั่งที่ตอบรับ</dt><dd>{state.terms.customer_type === "company" ? "บริษัท" : "บุคคลทั่วไป"}</dd></div><div><dt>ส่งหลักฐานภายใน</dt><dd>{dateTH(state.terms.documents_due_at)}</dd></div></dl><DepositChecklist state={state} /><p className="cust-muted">อัปโหลดสำเร็จยังไม่ใช่การอนุมัติ เจ้าหน้าที่ต้องตรวจหลักฐานให้ครบก่อนเปิดงานผลิต</p><Link href={customerHref("quotations", { request: request.id, quotation: quote.id })}>ดูใบเสนอราคาที่ตอบรับ →</Link>
      {state.job && <section className="cust-section"><h2>เปิดงานผลิตแล้ว</h2><p>มัดจำที่อนุมัติจริง {moneyTH(state.job.deposit_amount)}</p><p>ยอดเปิดงานคงเหลือ {moneyTH(state.job.balance)}</p><Link className="cust-primary" href={customerHref("jobs", { job: state.job.id })}>ติดตามงานผลิต</Link></section>}
    </aside></div>}
  </>;
}

function DepositForm({ api, state, kind, requestId, quotationId, onSaved, onReload }: { api: BackendApi; state: Fulfillment; kind: "deposit" | "po"; requestId: string; quotationId: string; onSaved: () => void; onReload: () => void }) {
  const [ready, setReady] = useState<Attachment | null>(null); const write = useRetryableWrite(api, onSaved);
  return <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/quotations/${quotationId}/evidence`, "POST", () => {
    if (!ready) throw new Error("อัปโหลดและตรวจไฟล์ให้สำเร็จก่อนส่งหลักฐาน");
    if (!availableEvidenceKinds(state, Date.now()).includes(kind)) throw new Error("หลักฐานประเภทนี้ไม่พร้อมส่ง หรือพ้นกำหนดแล้ว กรุณาอัปเดตสถานะ");
    try { return { ...evidencePayload(state.terms, { key: crypto.randomUUID(), attachmentId: ready.id, kind, amount: String(data.get("amount") ?? ""), paidAt: String(data.get("paid_at") ?? "") }, Date.now()) }; }
    catch { throw new Error("ตรวจยอดมัดจำให้อยู่ระหว่างขั้นต่ำกับยอดเต็ม และวันเวลาที่โอนต้องถูกต้อง ไม่ใช่อนาคต"); }
  }, ""); }}>
    <fieldset disabled={write.frozen}>
      {kind === "deposit" && <><Field label="จำนวนเงินที่โอน (บาท) *"><input name="amount" inputMode="decimal" required defaultValue={state.terms.deposit_amount} /></Field><p className="cust-muted">มัดจำรายการเดียว ตั้งแต่ {moneyTH(state.terms.deposit_amount)} ถึง {moneyTH(state.terms.final_price)} ไม่รวมหลายรายการย่อย ใบเสนอราคาศูนย์บาทใช้การยืนยันศูนย์บาท</p><Field label="วันและเวลาที่โอน (เวลาไทย) *"><input name="paid_at" type="datetime-local" required /></Field></>}
      <CustomerUpload api={api} requestId={requestId} ready={ready} onReady={setReady} disabled={write.frozen} />
      <p className="cust-muted cust-small">ต้องอัปโหลด ตรวจไฟล์ และส่งหลักฐานเสร็จก่อนกำหนดเดิม</p>
      <button className="cust-primary" disabled={!ready || write.frozen} type="submit">ส่ง{kind === "deposit" ? "หลักฐานมัดจำ" : "ใบสั่งซื้อ PO"}</button>
    </fieldset><CustomerWriteRetry write={write} onReload={onReload} />
  </form>;
}
