import type { JobRequest } from "../../lib/api/backend-api.ts";
import { availableActions, type FulfillmentJob } from "../delivery/delivery-domain.ts";
import { availableEvidenceKinds } from "../fulfillment/fulfillment-domain.ts";
import { customerHref, latestQuote, moneyTH } from "./customer-domain.ts";
import type { SalesRecord } from "./customer-sales-data.ts";

export type DashboardAction = { id: string; name: string; reference: string; title: string; description: string; href: string; action: string; due?: string; dueLabel?: string };
export type WorkUpdate = { id: string; title: string; name: string; reference: string; at: string; href: string; kind: "request" | "quote" | "evidence" | "job" | "delivery" | "invoice" };
export type DashboardJob = { job: FulfillmentJob; request?: JobRequest; href: string; name: string; reference: string };

const timestamp = (value?: string | null) => value && Date.parse(value) >= 0 ? Date.parse(value) : null;
const byDue = (a: { due?: string }, b: { due?: string }) => (timestamp(a.due) ?? Infinity) - (timestamp(b.due) ?? Infinity);

// Presentation-only aggregation over the same authorized reads as the old overview.
// No private production reads, invented ETA, inferred status changes or float money.
export function overviewData(records: SalesRecord[], jobs: FulfillmentJob[], now: number | null) {
  const requests = new Map(records.map(({ request }) => [request.id, request]));
  const attention: DashboardAction[] = [];
  const updates: WorkUpdate[] = [];
  let quotesToReview = 0;
  const addUpdate = (update: Omit<WorkUpdate, "at">, at?: string | null) => {
    if (timestamp(at) !== null) updates.push({ ...update, at: at! });
  };
  for (const { request, quotations, fulfillment, issue } of records) {
    const base = { name: request.description, reference: `คำขอ #${request.no_request}` };
    const href = customerHref("requests", { request: request.id });
    addUpdate({ ...base, id: `request:${request.id}`, title: "ส่งคำขอผลิตแล้ว", href, kind: "request" }, request.created_at);
    if (issue) continue;
    for (const quote of quotations) {
      if (!["sent", "approved", "rejected"].includes(quote.status)) continue;
      addUpdate({ ...base, id: `quote:${quote.id}`, title: `ร้านส่งใบเสนอราคา #${quote.quotation_no}`, href: customerHref("quotations", { request: request.id, quotation: quote.id }), kind: "quote" }, quote.sent_at);
    }
    const quote = latestQuote(quotations);
    const active = !["canceled", "completed"].includes(request.status);
    if (active && quote?.status === "sent") {
      quotesToReview++;
      attention.push({ ...base, id: `quote:${quote.id}`, title: "มีใบเสนอราคาให้คุณพิจารณา", description: `ราคารวมทั้งงาน ${moneyTH(quote.final_price)}`, href: customerHref("quotations", { request: request.id, quotation: quote.id }), action: "ดูใบเสนอราคา" });
    }
    if (!fulfillment) continue;
    const evidenceHref = customerHref("deposit-po", { request: request.id, quotation: fulfillment.quotation_id });
    if (active && now !== null && availableEvidenceKinds(fulfillment, now).length) attention.push({ ...base, id: `evidence:${request.id}`, title: "รอส่งหลักฐานมัดจำ / PO", description: `${fulfillment.terms.deposit_required ? `มัดจำขั้นต่ำ ${moneyTH(fulfillment.terms.deposit_amount)}` : "ไม่ต้องวางมัดจำ"}${fulfillment.terms.po_required ? " · ต้องส่งใบสั่งซื้อ PO" : ""}`, href: evidenceHref, action: "ส่งหลักฐาน", due: fulfillment.terms.documents_due_at, dueLabel: "ส่งหลักฐานภายใน" });
    for (const evidence of fulfillment.evidence ?? []) {
      const kind = evidence.kind === "po" ? "PO" : "มัดจำ";
      addUpdate({ ...base, id: `submitted:${evidence.id}`, title: `ส่งหลักฐาน${kind}ให้ตรวจสอบ`, href: evidenceHref, kind: "evidence" }, evidence.submitted_at);
      if (evidence.status !== "pending") addUpdate({ ...base, id: `reviewed:${evidence.id}`, title: evidence.status === "approved" ? `อนุมัติหลักฐาน${kind}แล้ว` : `หลักฐาน${kind}ต้องแก้ไข`, href: evidenceHref, kind: "evidence" }, evidence.reviewed_at);
    }
    if (fulfillment.job) addUpdate({ ...base, id: `opened:${fulfillment.job.id}`, title: "เปิดงานผลิตแล้ว", href: customerHref("jobs", { job: fulfillment.job.id }), kind: "job" }, fulfillment.job.created_at);
  }
  const work: DashboardJob[] = jobs.map((job) => {
    const request = requests.get(job.request_id);
    return { job, request, href: customerHref("jobs", { job: job.job_id }), name: request?.description ?? "งานผลิตของคุณ", reference: request ? `คำขอ #${request.no_request}` : "เปิดดูคำขอจากรายละเอียดงาน" };
  });
  const payments: (DashboardJob & { due: string })[] = [];
  const ready: DashboardJob[] = [];
  for (const item of work) {
    const { job, name, reference } = item;
    const actions = availableActions(job, "customer");
    if (actions.includes("inspect")) attention.push({ id: `inspect:${job.job_id}`, name, reference, title: "มีงานส่งมอบให้คุณตรวจรับ", description: "ตรวจสอบก่อนยืนยันรับ หรือส่งคืนเพื่อแก้ไข", href: customerHref("delivery-payment", { job: job.job_id }), action: "ตรวจรับงาน" });
    if (job.invoice && job.invoice.status !== "paid") {
      payments.push({ ...item, due: job.invoice.due_at });
      if (actions.includes("bank")) attention.push({ id: `invoice:${job.job_id}`, name, reference, title: "มียอดคงเหลือตามใบแจ้งหนี้", description: `${job.invoice.number} · ${moneyTH(job.invoice.balance)}`, href: customerHref("payments", { job: job.job_id }), action: "ดูใบแจ้งหนี้", due: job.invoice.due_at, dueLabel: "ครบกำหนดใบแจ้งหนี้" });
    }
    const last = job.deliveries?.at(-1);
    if (job.request_status === "ongoing" && job.job_status === "completed" && (!last || last.status === "shipping" || last.status === "returned")) ready.push(item);
    const base = { name, reference, href: item.href };
    for (const cycle of job.rework_history ?? []) {
      addUpdate({ ...base, id: `started:${job.job_id}:${cycle.cycle}`, title: cycle.cycle > 1 ? "เริ่มแก้ไขงานรอบเดิม" : "เริ่มผลิตงาน", kind: "job" }, cycle.started_at);
      addUpdate({ ...base, id: `completed:${job.job_id}:${cycle.cycle}`, title: "ผลิตงานเสร็จแล้ว", kind: "job" }, cycle.completed_at);
    }
    for (const delivery of job.deliveries ?? []) {
      addUpdate({ ...base, id: `shipped:${delivery.id}`, title: "จัดส่งงานแล้ว", kind: "delivery" }, delivery.shipped_at);
      if (delivery.status !== "shipping") addUpdate({ ...base, id: `received:${delivery.id}`, title: delivery.status === "delivered" ? "ยืนยันรับงานแล้ว" : "ส่งคืนเพื่อแก้ไข · Job เดิม", kind: "delivery" }, delivery.decided_at);
    }
    if (job.invoice) addUpdate({ ...base, id: `invoice:${job.invoice.id}`, title: `ออกใบแจ้งหนี้ ${job.invoice.number}`, href: customerHref("payments", { job: job.job_id }), kind: "invoice" }, job.invoice.issued_at);
  }
  attention.sort((a, b) => byDue(a, b) || a.id.localeCompare(b.id));
  payments.sort((a, b) => byDue(a, b) || a.job.job_id.localeCompare(b.job.job_id));
  ready.sort((a, b) => Number(b.job.deliveries?.at(-1)?.status === "shipping") - Number(a.job.deliveries?.at(-1)?.status === "shipping"));
  updates.sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || a.id.localeCompare(b.id));
  return { attention, payments, ready, work, updates, quotesToReview, activeJobs: work.filter(({ job }) => job.request_status === "ongoing" && ["queued", "in_progress", "completed"].includes(job.job_status)) };
}

export function invoiceTotal(jobs: FulfillmentJob[]): string | undefined {
  let total = BigInt(0);
  for (const job of jobs) {
    if (!job.invoice || job.invoice.status === "paid") continue;
    if (!/^\d+\.\d{2}$/.test(job.invoice.balance)) return undefined;
    total += BigInt(job.invoice.balance.replace(".", ""));
  }
  return `${total / BigInt(100)}.${String(total % BigInt(100)).padStart(2, "0")}`;
}

export function dueState(value: string, now: number | null) {
  const at = timestamp(value);
  if (at === null || now === null) return "ยังไม่ระบุกำหนด";
  if (at < now) return "เกินกำหนด";
  const day = (instant: number) => new Date(instant + 7 * 3600000).toISOString().slice(0, 10);
  return day(at) === day(now) ? "ครบกำหนดวันนี้" : "ครบกำหนด";
}
