// UC9 delivery, invoice, installments and free rework (backend UC9.md).
import { moneyInput } from "../../lib/api/backend-api.ts";
import { bangkokInstant } from "../fulfillment/fulfillment-domain.ts";

export type Invoice = { id: string; number: string; amount: string; paid: string; balance: string; status: "unpaid" | "partial" | "paid"; credit_days: number; issued_at: string; due_at: string };
export type Shipment = { id: string; cycle: number; method: "self" | "third_party"; receiver_name: string; status: "shipping" | "delivered" | "returned"; shipped_at: string; decided_at?: string; decided_by?: string; reason: string };
export type Payment = { id: string; submitted_by: string; method: "bank" | "cash"; amount: string; paid_at: string; status: "pending" | "approved" | "rejected"; evidence_id?: string; reason: string; reviewed_by?: string };
export type ReworkCycle = { cycle: number; started_at: string; completed_at: string; reopened_at: string; delivery_id: string };
export type FulfillmentJob = { job_id: string; request_id: string; job_status: string; request_status: string; version: number | string; cycle: number; credit_days?: number; opening_balance: string; deposit: string; invoice?: Invoice; deliveries: Shipment[] | null; payments?: Payment[] | null; events: { id: string; action: string; version: number | string; actor_id: string; created_at: string }[] | null; rework_history: ReworkCycle[] | null };
export type Role = "customer" | "worker" | "admin";
export type DeliveryAction = "terms" | "invoice" | "ship" | "inspect" | "bank" | "cash" | "review";
type Command = { idempotency_key: string; expected_version: number | string };

const cents = (value: string) => BigInt(moneyInput(value).replace(".", ""));

// Mirrors backend CanApply for display only; the server re-checks everything.
export function availableActions(state: FulfillmentJob, role: Role): DeliveryAction[] {
  const actions: DeliveryAction[] = []; const open = state.request_status === "ongoing";
  const completed = state.job_status === "completed"; const last = state.deliveries?.at(-1);
  const balance = state.invoice ? cents(state.invoice.balance) : BigInt(0);
  if (!open) return role === "admin" && state.payments?.some((p) => p.status === "pending") ? ["review"] : [];
  if (role === "admin" && completed && !state.invoice && state.credit_days === undefined) actions.push("terms");
  if (role !== "customer" && completed && !state.invoice && state.credit_days !== undefined) actions.push("invoice");
  if (role !== "customer" && completed && state.invoice && (!last || last.status === "returned")) actions.push("ship");
  if (role === "customer" && completed && last?.status === "shipping") actions.push("inspect");
  if (role === "customer" && state.invoice && balance > BigInt(0)) actions.push("bank");
  if (role === "admin" && state.invoice && balance > BigInt(0)) actions.push("cash");
  if (role === "admin" && state.payments?.some((p) => p.status === "pending")) actions.push("review");
  return actions;
}

export function shipPayload(command: Command, method: string, receiver: string) {
  const name = receiver.trim();
  if (method !== "self" && method !== "third_party") throw new Error("Choose self delivery or a third-party carrier.");
  if (!name || [...name].length > 200 || /[\0\r\n]/.test(name)) throw new Error("Receiver name is required, up to 200 characters.");
  return { ...command, method, receiver_name: name };
}

export function inspectPayload(command: Command, outcome: "accept" | "return", reason: string) {
  const trimmed = reason.trim();
  if (outcome === "accept") return { ...command, outcome };
  if (!trimmed || [...trimmed].length > 2000 || trimmed.includes("\0")) throw new Error("Describe what needs rework (1–2,000 characters).");
  return { ...command, outcome, reason: trimmed };
}

// Positive amount no larger than the current balance; time not in the future.
export function paymentPayload(command: Command, input: { amount: string; paidAt: string; evidenceId?: string; balance: string; requireEvidence: boolean }, now: number) {
  const amount = moneyInput(input.amount.trim());
  if (cents(amount) === BigInt(0)) throw new Error("Amount must be greater than zero.");
  if (cents(amount) > cents(input.balance)) throw new Error("Amount cannot exceed the remaining invoice balance; overpayment is not supported.");
  const paid_at = bangkokInstant(input.paidAt);
  if (Date.parse(paid_at) > now) throw new Error("Payment time cannot be in the future.");
  if (input.requireEvidence && !input.evidenceId) throw new Error("Upload the transfer proof first.");
  return { ...command, amount, paid_at, ...(input.evidenceId ? { evidence_id: input.evidenceId } : {}) };
}

export function reviewPayload(command: Command, paymentId: string, outcome: "approved" | "rejected", reason: string) {
  const trimmed = reason.trim();
  if (outcome === "approved") return { ...command, payment_id: paymentId, outcome };
  if (!trimmed || [...trimmed].length > 2000 || trimmed.includes("\0")) throw new Error("A rejection reason of 1–2,000 characters is required.");
  return { ...command, payment_id: paymentId, outcome, reason: trimmed };
}
