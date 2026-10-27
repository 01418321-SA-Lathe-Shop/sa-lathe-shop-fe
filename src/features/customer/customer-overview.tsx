"use client";

import Link from "next/link";
import type { BackendApi } from "../../lib/api/backend-api";
import type { FulfillmentJob } from "../delivery/delivery-domain";
import { availableActions } from "../delivery/delivery-domain";
import { availableEvidenceKinds } from "../fulfillment/fulfillment-domain";
import { Icon } from "../../components/appearance/icons";
import { useSalesIndex } from "./customer-sales-data";
import { useCollection, useNow } from "./customer-hooks";
import { customerHref, dateTH, JOB_LABELS, latestQuote, moneyTH, REQUEST_LABELS } from "./customer-domain";
import { Badge, Empty, Limited, PageTitle, ResourceFeedback } from "./customer-ui";

type Attention = { id: string; name: string; requestNo: string; title: string; description: string; href: string; action: string; due?: string };
export function CustomerOverview({ api }: { api: BackendApi }) {
  const sales = useSalesIndex(api); const jobs = useCollection<FulfillmentJob>(api, "/fulfillment/jobs"); const now = useNow();
  const attention: Attention[] = [];
  for (const record of sales.records) {
    const { request, fulfillment } = record;
    if (["canceled", "completed"].includes(request.status) || record.issue) continue;
    const base = { id: request.id, name: request.description, requestNo: String(request.no_request) };
    const quote = latestQuote(record.quotations);
    if (quote?.status === "sent") attention.push({ ...base, title: "มีใบเสนอราคาให้คุณพิจารณา", description: `ราคารวมทั้งงาน ${moneyTH(quote.final_price)}`, href: customerHref("quotations", { request: request.id, quotation: quote.id }), action: "ดูใบเสนอราคา" });
    if (fulfillment && now !== null && availableEvidenceKinds(fulfillment, now).length) attention.push({ ...base, title: "รอส่งหลักฐานมัดจำ / PO", description: `${fulfillment.terms.deposit_required ? `มัดจำขั้นต่ำ ${moneyTH(fulfillment.terms.deposit_amount)}` : "ไม่ต้องวางมัดจำ"}${fulfillment.terms.po_required ? " · ต้องส่งใบสั่งซื้อ PO" : ""}`, href: customerHref("deposit-po", { request: request.id, quotation: quote?.id }), action: "ส่งหลักฐาน", due: fulfillment.terms.documents_due_at });
  }
  for (const job of jobs.data?.items ?? []) {
    const request = sales.records.find((record) => record.request.id === job.request_id)?.request;
    const base = { id: job.job_id, name: request?.description ?? "งานผลิตของคุณ", requestNo: request ? String(request.no_request) : "ดูจากรายละเอียดคำขอ" };
    const actions = availableActions(job, "customer");
    if (actions.includes("inspect")) attention.push({ ...base, title: "มีงานส่งมอบให้คุณตรวจรับ", description: "ตรวจสอบงานก่อนยืนยันรับ หรือส่งคืนเพื่อแก้ไข", href: customerHref("delivery-payment", { job: job.job_id }), action: "ตรวจรับงาน" });
    if (actions.includes("bank") && job.invoice) attention.push({ ...base, id: `${job.job_id}:invoice`, title: "มียอดคงเหลือตามใบแจ้งหนี้", description: `${job.invoice.number} · ${moneyTH(job.invoice.balance)}${job.payments?.some((p) => p.status === "pending") ? " · มีหลักฐานรอตรวจ ยอดยังไม่ลด" : ""}`, due: job.invoice.due_at, href: customerHref("payments", { job: job.job_id }), action: "ดูใบแจ้งหนี้" });
  }
  attention.sort((a, b) => (a.due ? Date.parse(a.due) : Infinity) - (b.due ? Date.parse(b.due) : Infinity) || a.id.localeCompare(b.id));
  const attentionReady = !sales.loading && !jobs.loading && now !== null;
  const hero = attentionReady ? attention[0] : undefined;
  const create = <Link className={hero || !attentionReady ? "cust-link" : "cust-primary"} href={customerHref("requests", { view: "new" })}>ส่งคำขอผลิตใหม่ <Icon name="plus" size={18} /></Link>;
  return <><PageTitle title="ภาพรวม" description="ติดตามงานและสิ่งที่ต้องทำของคุณ" action={create} />
    <ResourceFeedback {...sales} /><ResourceFeedback {...jobs} />
    {sales.data && !sales.loading && <Limited complete={sales.complete && jobs.data?.complete} />}
    <div className="cust-overview-grid"><section><h2>สิ่งที่คุณต้องทำ</h2>
      {hero ? <article className="cust-attention"><span className="cust-label"><Icon name="clock" size={18} />{hero.title}</span><h3>{hero.name}</h3><p className="cust-muted">คำขอ #{hero.requestNo}</p>{hero.due && <p className="cust-due">{hero.action === "ส่งหลักฐาน" ? "ส่งหลักฐานภายใน" : "ครบกำหนดใบแจ้งหนี้"}<strong>{dateTH(hero.due)}</strong></p>}<p>{hero.description}</p><Link className="cust-primary" href={hero.href}>{hero.action}<Icon name="arrow" size={18} /></Link></article>
        : !sales.loading && !jobs.loading && !sales.error && !jobs.error && <Empty title={!sales.complete || !jobs.data?.complete ? "ยังตรวจรายการที่ต้องทำได้ไม่ครบ" : sales.records.length ? "ตอนนี้ไม่มีรายการที่คุณต้องดำเนินการ" : "เริ่มต้นงานผลิตของคุณ"}>{!sales.complete || !jobs.data?.complete ? "อัปเดตข้อมูลอีกครั้งก่อนสรุปว่าไม่มีรายการที่ต้องดำเนินการ" : sales.records.length ? "ติดตามความคืบหน้าได้จากงานล่าสุด" : "ส่งรายละเอียด จำนวน และแบบงาน เพื่อให้ร้านประเมินราคา"}</Empty>}
      {attentionReady && attention.length > 1 && <section className="cust-section"><h2>รายการอื่นที่ต้องทำ</h2>{attention.slice(1).map((item) => <article className="cust-action-row" key={item.id}><Icon name="file" /><div><strong>{item.title}</strong><p>{item.name} · คำขอ #{item.requestNo}</p><Link href={item.href}>{item.action}<Icon name="arrow" size={15} /></Link></div></article>)}</section>}
    </section><aside className="cust-recent"><div className="cust-toolbar"><h2>งานล่าสุด</h2><Link href="/customer/jobs">ดูทั้งหมด</Link></div>{sales.records.slice(0, 5).map(({ request, fulfillment }) => <article className="cust-recent-row" key={request.id}><Link href={fulfillment?.job ? customerHref("jobs", { job: fulfillment.job.id }) : customerHref("requests", { request: request.id })}><strong>{request.description}</strong><span>คำขอ #{request.no_request}</span></Link><Badge value={fulfillment?.job?.status ?? request.status} labels={fulfillment?.job ? JOB_LABELS : REQUEST_LABELS} /></article>)}{!sales.loading && !sales.records.length && <p className="cust-muted">งานของคุณจะแสดงที่นี่หลังส่งคำขอ</p>}</aside></div>
    <div className="cust-page-end"><span>เวลาแสดงตามประเทศไทย · ไม่มี VAT</span><button onClick={() => { sales.reload(); jobs.reload(); }}>อัปเดตข้อมูล</button></div>
  </>;
}
