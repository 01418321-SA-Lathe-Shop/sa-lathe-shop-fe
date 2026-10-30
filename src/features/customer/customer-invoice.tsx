"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "../../components/appearance/icons";
import type { Account, Attachment, BackendApi, Quotation } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import { paymentPayload, type FulfillmentJob } from "../delivery/delivery-domain";
import { customerHref, dateTH, EVIDENCE_LABELS, INVOICE_LABELS, moneyTH } from "./customer-domain";
import { useNow } from "./customer-hooks";
import { amountFeedback, pendingAmount } from "./customer-invoice-domain";
import { DueChip, PaidProgress } from "./customer-invoice-list";
import { Badge, Empty, Field, PrivateFile } from "./customer-ui";
import { CustomerUpload } from "./customer-upload";
import { CustomerWriteRetry } from "./customer-write";
import styles from "./customer-invoices.module.css";

export function CustomerInvoice({ api, account, state, quote, canPay, saved, reload }: { api: BackendApi; account: Account; state: FulfillmentJob; quote?: Quotation; canPay: boolean; saved: (message: string) => void; reload: () => void }) {
  const invoice = state.invoice; const now = useNow();
  if (!invoice) return <Empty title="ยังไม่มีใบแจ้งหนี้" action={<Link href={customerHref("jobs", { job: state.job_id })}>กลับรายละเอียดงานผลิต</Link>}>ยอดหลังมัดจำยังไม่ใช่ใบแจ้งหนี้ รอร้านออกเอกสารก่อนส่งหลักฐานชำระเงิน</Empty>;
  const pending = pendingAmount(state.payments); const hasPending = state.payments?.some((item) => item.status === "pending");
  return <div className={styles.detail}>
    <section className={styles.hero} data-paid={invoice.status === "paid" || undefined} aria-labelledby="invoice-balance">
      <div className={styles.heroMain}>
        <div className={styles.heroBadges}><Badge value={invoice.status} labels={INVOICE_LABELS} /><DueChip invoice={invoice} now={now} /></div>
        <h2 id="invoice-balance" className={styles.heroLabel}>ยอดคงเหลือที่ต้องชำระ</h2>
        <strong className={styles.heroAmount}>{moneyTH(invoice.balance)}</strong>
        <PaidProgress invoice={invoice} />
      </div>
      <dl className={styles.heroFacts}>
        <div><dt>ครบกำหนดชำระ</dt><dd><time dateTime={invoice.due_at}>{dateTH(invoice.due_at)}</time></dd></div>
        <div><dt>ออกเอกสารเมื่อ</dt><dd><time dateTime={invoice.issued_at}>{dateTH(invoice.issued_at)}</time></dd></div>
        <div><dt>เครดิต</dt><dd>{invoice.credit_days} วัน</dd></div>
        <div><dt>เลขอ้างอิงงาน</dt><dd>{state.job_id.slice(0, 8).toUpperCase()}</dd></div>
      </dl>
    </section>
    {hasPending && <p className={`cust-alert ${styles.pendingAlert}`}>มีหลักฐานรอตรวจ{pending ? ` ${moneyTH(pending)}` : ""} ยอดคงเหลือยังไม่ลดจนกว่า Admin อนุมัติ ตรวจประวัติด้านล่างก่อนส่งหลักฐานรายการใหม่</p>}
    <section className={styles.pay} aria-labelledby="invoice-pay">
      {canPay ? <><h2 id="invoice-pay">ส่งหลักฐานชำระเงิน</h2><p className="cust-muted">โอนแล้วกรอก 3 ขั้นตอนด้านล่าง แบ่งชำระเป็นงวดได้</p><BankPayment api={api} state={state} saved={saved} reload={reload} /></>
        : <div className={styles.settled} data-paid={invoice.status === "paid" || undefined}><span className={styles.settledMark} aria-hidden="true">{invoice.status === "paid" ? "✓" : "!"}</span><h2 id="invoice-pay">{invoice.status === "paid" ? "ชำระครบแล้ว" : "ยังส่งหลักฐานใหม่ไม่ได้"}</h2><p>{invoice.status === "paid" ? "ไม่มีเงินคงเหลือตามใบแจ้งหนี้นี้" : "ยังไม่พร้อมส่งหลักฐานใหม่ กรุณาอัปเดตสถานะ"}</p></div>}
    </section>
    <aside className={styles.breakdown} aria-labelledby="invoice-breakdown">
      <h2 id="invoice-breakdown">สรุปยอด</h2>
      <dl className={styles.ledger}>
        <div><dt>ยอดใบแจ้งหนี้</dt><dd>{moneyTH(invoice.amount)}</dd></div>
        <div><dt>หัก ชำระอนุมัติแล้ว</dt><dd>− {moneyTH(invoice.paid)}</dd></div>
        <div className={styles.ledgerTotal}><dt>ยอดคงเหลือ</dt><dd>{moneyTH(invoice.balance)}</dd></div>
      </dl>
      <div className={styles.depositNote}><span>มัดจำก่อนเปิดงาน</span><strong>{moneyTH(state.deposit)}</strong><small>หักแล้วก่อนออกใบแจ้งหนี้ ไม่หักซ้ำ</small></div>
      <p className="cust-muted cust-small">เงินบาท · ไม่มี VAT</p>
      <Link className="cust-link" href={customerHref("jobs", { job: state.job_id })}>ติดตามงานผลิตและการส่งมอบ <Icon name="arrow" size={14} /></Link>
      {quote && <Link className="cust-link" href={customerHref("quotations", { request: state.request_id, quotation: quote.id })}>ใบเสนอราคา #{quote.quotation_no} <Icon name="arrow" size={14} /></Link>}
    </aside>
    <section className={styles.history} aria-labelledby="payment-history">
      <div className={styles.sectionHead}><h2 id="payment-history">ประวัติการชำระเงิน</h2>{Boolean(state.payments?.length) && <span>{state.payments!.length} รายการ</span>}</div>
      {!state.payments?.length ? <p className="cust-muted">ยังไม่มีรายการชำระเงิน เมื่อส่งหลักฐานแล้วจะแสดงที่นี่</p> : <ol className={styles.timeline}>{state.payments.map((payment) => <li key={payment.id} data-status={payment.status}>
        <span className={styles.timelineDot} aria-hidden="true" />
        <div className={styles.entry}>
          <div className={styles.entryHead}><strong>{moneyTH(payment.amount)}</strong><Badge value={payment.status} labels={EVIDENCE_LABELS} /></div>
          <p className={styles.entryMeta}>เลขอ้างอิง {payment.id.slice(0, 8).toUpperCase()} · {payment.method === "bank" ? "โอนเงิน" : "เงินสดที่ร้านบันทึก"} · <time dateTime={payment.paid_at}>{dateTH(payment.paid_at)}</time></p>
          {payment.reason && <p className="cust-alert danger">เหตุผล: {payment.reason}</p>}
          {payment.evidence_id && payment.submitted_by === account.id && <PrivateFile api={api} path={`/customer-evidence/${payment.evidence_id}/download`} name="เปิดหลักฐานของคุณ" />}
        </div>
      </li>)}</ol>}
    </section>
  </div>;
}

function BankPayment({ api, state, saved, reload }: { api: BackendApi; state: FulfillmentJob; saved: (message: string) => void; reload: () => void }) {
  const [ready, setReady] = useState<Attachment | null>(null); const [amount, setAmount] = useState("");
  const write = useRetryableWrite(api, () => saved("ส่งหลักฐานการชำระเงินแล้ว รอ Admin ตรวจสอบ ยอดคงเหลือยังไม่ลดจนกว่าจะอนุมัติ"));
  const balance = state.invoice!.balance; const feedback = amountFeedback(amount, balance);
  return <form className={styles.payForm} onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/payments/bank`, "POST", () => {
    try { return paymentPayload({ idempotency_key: crypto.randomUUID(), expected_version: state.version }, { amount: String(data.get("amount") ?? ""), paidAt: String(data.get("paid_at") ?? ""), evidenceId: ready?.id, balance, requireEvidence: true }, Date.now()); }
    catch { throw new Error("ตรวจจำนวนเงินให้มากกว่าศูนย์ ไม่เกินยอดคงเหลือ วันเวลาโอนต้องไม่ใช่อนาคต และต้องมีไฟล์ที่ตรวจแล้ว"); }
  }, ""); }}><fieldset disabled={write.frozen}>
    <ol className={styles.steps}>
      <li className={styles.step}><span className={styles.stepNo} aria-hidden="true">1</span><div className={styles.stepBody}>
        <Field label="จำนวนเงินงวดนี้ (บาท) *" hint={`แบ่งชำระได้ แต่ไม่เกิน ${moneyTH(balance)}`}><input name="amount" inputMode="decimal" autoComplete="off" required value={amount} aria-invalid={feedback.problem ? true : undefined} onChange={(event) => setAmount(event.target.value)} /></Field>
        <button type="button" className={styles.fillChip} onClick={() => setAmount(balance)}>ชำระเต็มยอด {moneyTH(balance)}</button>
        <p className={styles.inlineProblem} aria-live="polite">{feedback.problem}</p>
      </div></li>
      <li className={styles.step}><span className={styles.stepNo} aria-hidden="true">2</span><div className={styles.stepBody}>
        <Field label="วันและเวลาที่โอน (เวลาไทย) *" hint="ดูจากสลิปโอนเงิน ต้องไม่ใช่เวลาในอนาคต"><input name="paid_at" type="datetime-local" required /></Field>
      </div></li>
      <li className={styles.step}><span className={styles.stepNo} aria-hidden="true">3</span><div className={styles.stepBody}>
        <h3>แนบสลิปหรือหลักฐานการโอน</h3>
        <CustomerUpload api={api} intentPath={`/fulfillment/jobs/${state.job_id}/evidence/uploads`} completePath={(id) => `/customer-evidence/${id}/complete`} ready={ready} onReady={setReady} disabled={write.frozen} />
        <p className="cust-muted cust-small">อัปโหลดสำเร็จยังไม่ใช่การยืนยันชำระเงิน ต้องกดส่งหลักฐานและรอ Admin อนุมัติ</p>
      </div></li>
    </ol>
    <div className={styles.submitBar}>
      <div><span>ยอดที่แจ้งชำระงวดนี้</span><strong>{feedback.amount ? moneyTH(feedback.amount) : "—"}</strong></div>
      <button type="submit" className="cust-primary" disabled={!ready || write.frozen || Boolean(feedback.problem)}>ส่งหลักฐานการชำระเงิน</button>
    </div>
    {!ready && <p className="cust-muted cust-small">ปุ่มส่งจะกดได้หลังอัปโหลดและตรวจไฟล์แล้ว</p>}
  </fieldset><CustomerWriteRetry write={write} onReload={reload} /></form>;
}
