"use client";

import Link from "next/link";
import { useState } from "react";
import type { BackendApi, JobRequest } from "../../lib/api/backend-api";
import { useRetryableWrite } from "../../hooks/backend-hooks";
import { inspectPayload, type FulfillmentJob } from "../delivery/delivery-domain";
import { customerHref, dateTH, DELIVERY_LABELS, moneyTH } from "./customer-domain";
import { Badge, Empty, Field } from "./customer-ui";
import { CustomerWriteRetry } from "./customer-write";

export function CustomerInspection({ api, state, request, canInspect, saved, reload }: { api: BackendApi; state: FulfillmentJob; request?: JobRequest; canInspect: boolean; saved: (message: string) => void; reload: () => void }) {
  const [outcome, setOutcome] = useState<"accept" | "return">("accept"); const [confirmed, setConfirmed] = useState(false);
  const write = useRetryableWrite(api, () => saved(outcome === "accept" ? "ยืนยันรับงานแล้ว การยืนยันนี้เป็นผลถาวร" : "ส่งคืนเพื่อแก้ไขแล้ว Job เดิมกลับไปผลิต โดยไม่เพิ่มราคาและไม่เปลี่ยนใบแจ้งหนี้"));
  const delivery = state.deliveries?.at(-1);
  return <div className="cust-inspection-layout"><section className="cust-document"><h2>รายละเอียดการส่งมอบ</h2>{delivery ? <><Badge value={delivery.status} labels={DELIVERY_LABELS} /><dl className="cust-definition"><div><dt>จำนวนตามงาน</dt><dd>{request?.qty ?? "กำลังโหลด"} ชิ้น</dd></div><div><dt>วิธีส่ง</dt><dd>{delivery.method === "third_party" ? "ผู้ให้บริการภายนอก" : "ร้านจัดส่ง / รับเอง"}</dd></div><div><dt>ผู้รับ</dt><dd>{delivery.receiver_name}</dd></div><div><dt>ส่งเมื่อ</dt><dd>{dateTH(delivery.shipped_at)}</dd></div></dl>{delivery.reason && <p className="cust-alert">เหตุผลส่งคืน: {delivery.reason}</p>}</> : <Empty title="ยังไม่มีการจัดส่ง">รอร้านบันทึกการส่งมอบก่อนตรวจรับงาน</Empty>}
    {state.deliveries && state.deliveries.length > 1 && <section className="cust-section"><h2>ประวัติส่งมอบ</h2>{state.deliveries.map((item) => <p key={item.id} className="cust-history-row">รอบ {item.cycle} · {DELIVERY_LABELS[item.status]} · {dateTH(item.shipped_at)}</p>)}</section>}
    </section><section className="cust-inspection-decision">{canInspect ? <form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); write.submit(`/fulfillment/jobs/${state.job_id}/inspection`, "POST", () => {
      if (!confirmed) throw new Error("ยืนยันว่าคุณอ่านรายละเอียดก่อนดำเนินการ");
      try { return inspectPayload({ idempotency_key: crypto.randomUUID(), expected_version: state.version }, outcome, String(data.get("reason") ?? "")); }
      catch { throw new Error("ระบุปัญหาที่ต้องแก้ไข 1–2,000 ตัวอักษร"); }
    }, ""); }}><h2>{outcome === "accept" ? "ตรวจงานก่อนยืนยัน" : "ส่งคืนเพื่อแก้ไข"}</h2><p>{outcome === "accept" ? "ตรวจจำนวนและงานตามที่ตกลงไว้ การยืนยันรับงานเป็นผลถาวร" : "งานเดิมจะกลับไปแก้ไขฟรี ใบแจ้งหนี้และประวัติชำระเงินยังคงเดิม"}</p><fieldset disabled={write.frozen}>{outcome === "return" && <Field label="เหตุผลที่ต้องแก้ไข *"><textarea name="reason" required maxLength={2000} placeholder="ระบุปัญหาที่พบ เพื่อให้ร้านแก้ไขได้ตรงจุด" /></Field>}<label className="cust-checkbox"><input type="checkbox" required checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{outcome === "accept" ? "ฉันตรวจงานแล้วและยอมรับงานนี้" : "ฉันยืนยันส่งคืนงานเดิมเพื่อแก้ไข"}</label><button type="submit" className={outcome === "accept" ? "cust-primary" : "cust-danger"} disabled={!confirmed || write.frozen}>{outcome === "accept" ? "ยืนยันรับงาน" : "ยืนยันส่งคืนเพื่อแก้ไข"}</button><button type="button" className="cust-link" onClick={() => { setOutcome(outcome === "accept" ? "return" : "accept"); setConfirmed(false); }}>{outcome === "accept" ? "งานมีปัญหา? ส่งคืนเพื่อแก้ไข" : "กลับไปตรวจรับงาน"}</button></fieldset><CustomerWriteRetry write={write} onReload={reload} /></form> : <><h2>{delivery?.status === "delivered" ? "ยืนยันรับงานแล้ว" : delivery?.status === "returned" ? "ส่งคืนเพื่อแก้ไขแล้ว" : "ยังไม่พร้อมตรวจรับ"}</h2><p>ดูสถานะล่าสุดจากรายละเอียดงานผลิต ไม่สามารถเปลี่ยนสถานะเองได้</p><Link className="cust-primary" href={customerHref("jobs", { job: state.job_id })}>ติดตามงานผลิต</Link></>}
      {state.invoice && <div className="cust-section"><h3>การชำระเงินแยกจากการตรวจรับ</h3><p>ยอดคงเหลือ {moneyTH(state.invoice.balance)}</p><Link className="cust-link" href={customerHref("payments", { job: state.job_id })}>ดูใบแจ้งหนี้ →</Link></div>}
    </section></div>;
}
