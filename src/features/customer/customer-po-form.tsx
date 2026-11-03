"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError, type BackendApi, type CustomerPo, type Fulfillment, type JobRequest, type Quotation } from "../../lib/api/backend-api";
import { useCommand } from "../../hooks/backend-hooks";
import { CustomerPurchaseOrderDocument } from "../documents/customer-po-document";
import { useDocumentParties } from "../documents/document-parties";
import { PrintDocument } from "../documents/document-print";
import { ActionFeedback, Field } from "./customer-ui";
import { moneyTH } from "./customer-domain";

// Today's date in Bangkok as YYYY-MM-DD, the default PO issue date.
const todayBangkok = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

/** The customer writes their PO here, prints it, signs it, then uploads it below as PO evidence. */
export function CustomerPoForm({ api, request, quote, state }: { api: BackendApi; request: JobRequest; quote: Quotation; state: Fulfillment }) {
  const [po, setPo] = useState<{ value?: CustomerPo | null; error?: string; revision: number }>({ revision: 0 });
  const command = useCommand(); const parties = useDocumentParties(api, request.customer_id);
  const path = `/quotations/${quote.id}/customer-po`;
  useEffect(() => {
    const controller = new AbortController();
    // 404 means the customer has not written a PO yet.
    api.call<CustomerPo>(path, "GET", undefined, controller.signal).then(
      (value) => setPo((current) => ({ ...current, value, error: undefined })),
      (error) => { if (!controller.signal.aborted) setPo((current) => ({ ...current, value: error instanceof ApiError && error.status === 404 ? null : current.value, error: error instanceof ApiError && error.status === 404 ? undefined : "โหลดใบสั่งซื้อไม่สำเร็จ" })); },
    );
    return () => controller.abort();
  }, [api, path, po.revision]);
  const reload = () => setPo((current) => ({ ...current, revision: current.revision + 1 }));
  const approved = Boolean(state.evidence?.some((item) => item.kind === "po" && item.status === "approved"));
  const editable = !approved && !state.canceled_at && po.value !== undefined;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const body = { po_no: String(data.get("po_no") ?? "").trim(), issued_on: String(data.get("issued_on") ?? ""), remarks: String(data.get("remarks") ?? "").trim(), expected_lock_version: BigInt(po.value?.lock_version ?? 0) };
    void command.run(async (signal) => {
      if (!body.po_no || !body.issued_on) throw new Error("กรอกเลขที่ PO และวันที่ออก PO");
      try { const saved = await api.call<CustomerPo>(path, "PUT", body, signal); setPo((current) => ({ ...current, value: saved })); }
      catch (error) {
        if (error instanceof ApiError && error.status === 409) { reload(); throw new Error("ใบสั่งซื้อนี้แก้ไม่ได้แล้ว หรือมีคนแก้ไปก่อน ระบบโหลดข้อมูลล่าสุดให้แล้ว"); }
        if (error instanceof ApiError && error.status === 400) throw new Error("ตรวจเลขที่ PO (ไม่เกิน 64 ตัวอักษร) วันที่ และหมายเหตุ (ไม่เกิน 2,000 ตัวอักษร)");
        throw error;
      }
    }, "บันทึกใบสั่งซื้อแล้ว พิมพ์ ลงนาม แล้วอัปโหลดในส่วน “ส่งหลักฐาน” ด้านล่าง");
  }
  const saved = po.value;
  return <section className="cust-document" aria-labelledby="customer-po-form"><h2 id="customer-po-form">เขียนใบสั่งซื้อ (PO)</h2>
    <p className="cust-muted">ยอดเงินใน PO คือราคารวมทั้งงานที่ตอบรับ {moneyTH(state.terms.final_price)} ไม่มี VAT ข้อมูลผู้สั่งซื้อมาจาก <Link href="/customer?view=settings">ข้อมูลออกเอกสาร</Link> การบันทึกไม่ใช่การส่ง PO ให้ร้าน</p>
    {po.error && <p role="alert" className="cust-alert danger">{po.error} <button type="button" onClick={reload}>ลองอีกครั้ง</button></p>}
    {po.value !== undefined && <form key={String(saved?.lock_version ?? 0)} onSubmit={submit}><fieldset disabled={!editable || command.busy}>
      <Field label="เลขที่ PO *"><input name="po_no" maxLength={64} required defaultValue={saved?.po_no ?? ""} /></Field>
      <Field label="วันที่ออก PO *"><input name="issued_on" type="date" required defaultValue={saved?.issued_on ?? todayBangkok()} /></Field>
      <Field label="หมายเหตุ (ไม่บังคับ)"><textarea name="remarks" rows={3} maxLength={2000} defaultValue={saved?.remarks ?? ""} /></Field>
      {editable && <button className="cust-primary" type="submit">{saved ? "บันทึกการแก้ไข" : "บันทึกใบสั่งซื้อ"}</button>}
    </fieldset></form>}
    {approved && <p className="cust-muted">PO ผ่านการตรวจแล้ว แก้ไขไม่ได้</p>}
    <ActionFeedback {...command} />
    {saved && <PrintDocument ready={parties.ready} footer={`ใบสั่งซื้อ ${saved.po_no}`} label="พิมพ์ใบสั่งซื้อ / บันทึกเป็น PDF" hint={parties.error ?? "กำลังโหลดข้อมูลร้านและผู้สั่งซื้อ…"}>
      <CustomerPurchaseOrderDocument po={saved} request={request} quote={quote} terms={state.terms} shop={parties.shop} customer={parties.customer} />
    </PrintDocument>}
  </section>;
}
