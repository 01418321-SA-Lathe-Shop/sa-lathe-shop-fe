// UC9 delivery, invoice, installments and free rework (backend UC9.md).
import { moneyInput } from "../../lib/api/backend-api.ts";
import type { Attachment } from "../../lib/api/types.ts";
import { bangkokInstant } from "../fulfillment/fulfillment-domain.ts";

export type Invoice = { id: string; number: string; amount: string; paid: string; balance: string; status: "unpaid" | "partial" | "paid"; credit_days: number; issued_at: string; due_at: string };
export type Shipment = { id: string; cycle: number; method: "self" | "third_party" | "pickup"; receiver_name: string; status: "shipping" | "delivered" | "returned"; shipped_at: string; decided_at?: string; decided_by?: string; reason: string };
export type Payment = { id: string; submitted_by: string; method: "bank" | "cash"; amount: string; paid_at: string; status: "pending" | "approved" | "rejected"; evidence_id?: string; reason: string; reviewed_by?: string };
export type ReworkCycle = { cycle: number; started_at: string; completed_at: string; reopened_at: string; delivery_id: string };
export type FulfillmentJob = { job_id: string; request_id: string; job_status: string; request_status: string; version: number | string; cycle: number; credit_days?: number; opening_balance: string; deposit: string; invoice?: Invoice; deliveries: Shipment[] | null; payments?: Payment[] | null; events: { id: string; action: string; version: number | string; actor_id: string; created_at: string }[] | null; rework_history: ReworkCycle[] | null; photos?: Attachment[] | null };
export type Role = "customer" | "worker" | "admin";
export type DeliveryAction = "terms" | "invoice" | "ship" | "inspect" | "bank" | "cash" | "review";
type Command = { idempotency_key: string; expected_version: number | string };

const cents = (value: string) => BigInt(moneyInput(value).replace(".", ""));

// Mirrors backend CanApply for display only; the server re-checks everything.
// UC9 (2026-11-06): Worker and Admin have the same delivery/payment actions.
export function availableActions(state: FulfillmentJob, role: Role): DeliveryAction[] {
  const actions: DeliveryAction[] = []; const open = state.request_status === "ongoing"; const staff = role !== "customer";
  const completed = state.job_status === "completed"; const last = state.deliveries?.at(-1);
  const balance = state.invoice ? cents(state.invoice.balance) : BigInt(0);
  if (!open) return staff && state.payments?.some((p) => p.status === "pending") ? ["review"] : [];
  if (staff && completed && !state.invoice && state.credit_days === undefined) actions.push("terms");
  if (staff && completed && !state.invoice && state.credit_days !== undefined) actions.push("invoice");
  if (staff && completed && state.invoice && (!last || last.status === "returned")) actions.push("ship");
  if (role === "customer" && completed && last?.status === "shipping") actions.push("inspect");
  if (role === "customer" && state.invoice && balance > BigInt(0)) actions.push("bank");
  if (staff && state.invoice && balance > BigInt(0)) actions.push("cash");
  if (staff && state.payments?.some((p) => p.status === "pending")) actions.push("review");
  return actions;
}

// Shipping fees were removed (UC9, 2026-11-06): the invoice total is the only charge.
export function shipPayload(command: Command, method: string, receiver: string) {
  const name = receiver.trim();
  if (method !== "self" && method !== "third_party" && method !== "pickup") throw new Error("เลือกวิธีส่ง: ร้านส่งเอง, ผู้ให้บริการขนส่ง หรือลูกค้ารับที่ร้าน");
  if (!name || [...name].length > 200 || /[\0\r\n]/.test(name)) throw new Error("กรอกชื่อผู้รับ ไม่เกิน 200 ตัวอักษร");
  return { ...command, method, receiver_name: name };
}

export function inspectPayload(command: Command, outcome: "accept" | "return", reason: string) {
  const trimmed = reason.trim();
  if (outcome === "accept") return { ...command, outcome };
  if (!trimmed || [...trimmed].length > 2000 || trimmed.includes("\0")) throw new Error("กรอกสิ่งที่ต้องแก้ไข 1–2,000 ตัวอักษร");
  return { ...command, outcome, reason: trimmed };
}

// Positive amount no larger than the current balance; time not in the future.
export function paymentPayload(command: Command, input: { amount: string; paidAt: string; evidenceId?: string; balance: string; requireEvidence: boolean }, now: number) {
  let amount: string;
  try { amount = moneyInput(input.amount.trim()); } catch { throw new Error("กรอกจำนวนเงินเป็นบาท ทศนิยมไม่เกิน 2 ตำแหน่ง"); }
  if (cents(amount) === BigInt(0)) throw new Error("จำนวนเงินต้องมากกว่า 0");
  if (cents(amount) > cents(input.balance)) throw new Error("จำนวนเงินต้องไม่เกินยอดคงเหลือ ชำระเกินไม่ได้");
  const paid_at = bangkokInstant(input.paidAt);
  if (Date.parse(paid_at) > now) throw new Error("เวลาที่ชำระต้องไม่เป็นเวลาในอนาคต");
  if (input.requireEvidence && !input.evidenceId) throw new Error("อัปโหลดหลักฐานการโอนก่อน");
  return { ...command, amount, paid_at, ...(input.evidenceId ? { evidence_id: input.evidenceId } : {}) };
}

export function reviewPayload(command: Command, paymentId: string, outcome: "approved" | "rejected", reason: string) {
  const trimmed = reason.trim();
  if (outcome === "approved") return { ...command, payment_id: paymentId, outcome };
  if (!trimmed || [...trimmed].length > 2000 || trimmed.includes("\0")) throw new Error("กรอกเหตุผลที่ไม่ผ่าน 1–2,000 ตัวอักษร");
  return { ...command, payment_id: paymentId, outcome, reason: trimmed };
}

// Tabs of ส่งมอบและรับชำระ, worked out from the same rules
// as availableActions. A job may sit in several tabs (e.g. awaiting inspection
// and still owing). Worker and Admin share the same tabs.
export const DELIVERY_TABS = ["terms", "invoice", "ship", "inspect", "review", "unpaid", "closed"] as const;
export type DeliveryTab = typeof DELIVERY_TABS[number];
export function deliveryTab(value: string | null): DeliveryTab | null {
  return (DELIVERY_TABS as readonly string[]).includes(value ?? "") ? value as DeliveryTab : null;
}
const awaitingInvoice = (job: FulfillmentJob) => job.request_status === "ongoing" && job.job_status === "completed" && !job.invoice;
export const hasPendingPayment = (job: FulfillmentJob) => Boolean(job.payments?.some((payment) => payment.status === "pending"));

export function inDeliveryTab(tab: DeliveryTab, job: FulfillmentJob): boolean {
  const open = job.request_status === "ongoing"; const last = job.deliveries?.at(-1);
  switch (tab) {
    case "terms": return awaitingInvoice(job) && job.credit_days === undefined;
    case "invoice": return awaitingInvoice(job) && job.credit_days !== undefined;
    case "ship": return open && job.job_status === "completed" && Boolean(job.invoice) && (!last || last.status === "returned");
    case "inspect": return open && last?.status === "shipping";
    case "review": return hasPendingPayment(job);
    case "unpaid": return open && Boolean(job.invoice) && cents(job.invoice!.balance) > BigInt(0);
    case "closed": return job.request_status === "completed";
  }
}
export function deliveryCounts(jobs: FulfillmentJob[]): Record<DeliveryTab, number> {
  return Object.fromEntries(DELIVERY_TABS.map((tab) => [tab, jobs.filter((job) => inDeliveryTab(tab, job)).length])) as Record<DeliveryTab, number>;
}
// First tab where staff have something to do, else the first non-empty one.
export function defaultDeliveryTab(counts: Record<DeliveryTab, number>): DeliveryTab {
  const action: DeliveryTab[] = ["review", "terms", "invoice", "ship"];
  return action.find((tab) => counts[tab] > 0) ?? DELIVERY_TABS.find((tab) => counts[tab] > 0) ?? DELIVERY_TABS[0];
}
export const matchDelivery = (job: FulfillmentJob, label: string, q: string) => !q.trim() || `${job.invoice?.number ?? ""} ${label}`.toLowerCase().includes(q.trim().toLowerCase());
