// UC7 receiving, replacement claims and supplier settlement (backend UC7.md).
import { inventoryDecimal } from "../inventory/inventory-domain.ts";
import { bangkokInstant } from "../fulfillment/fulfillment-domain.ts";

export type ReceivingSummary = { order_id: string; order_no: string; supplier_name: string; status: string; version: number | string; full_received_at?: string };
export type ReceivingLine = { material_id: string; material_name: string; unit_name: string; ordered: string; good: string; damaged: string; outstanding: string };
export type ReceiptLine = { material_id: string; good: string; damaged: string; replacement_claim_id?: string };
export type Receipt = { id: string; actor_id: string; note: string; created_at: string; lines: ReceiptLine[] | null };
export type Claim = { id: string; receipt_id: string; material_id: string; quantity: string; replaced: string; status: "pending_claim" | "claimed" | "resolved"; claimed_by?: string; claimed_at?: string; note: string };
export type Settlement = { actor_id: string; amount: string; method: "bank" | "cash"; paid_at: string; evidence_id?: string };
export type Finance = { total_amount: string; credit_days: number | null; payment_due_at?: string; payment_status: "unpaid" | "pending" | "paid"; settlement?: Settlement };
export type ReceivingState = ReceivingSummary & { lines: ReceivingLine[] | null; receipts: Receipt[] | null; claims: Claim[] | null; finance?: Finance };
export type DraftReceipt = { material_id: string; good: string; damaged: string; replacement_claim_id?: string };

const units = (value: string) => BigInt(inventoryDecimal(value).replace(".", ""));
const blank = (value: string) => value.trim() === "";
// Inputs need a plain decimal: "5.500000" → "5.5", no grouping.
export const plainQuantity = (value: string) => value.replace(/\.?0+$/, "");
const six = (value: bigint) => `${value / BigInt(1000000)}.${(value % BigInt(1000000)).toString().padStart(6, "0")}`;

// Good units the supplier still owes against a damaged-goods claim.
export function claimOwed(claim: Pick<Claim, "quantity" | "replaced">): string { return six(units(claim.quantity) - units(claim.replaced)); }

// Blank rows are skipped; each sent row needs a positive good+damaged total.
// Replacement rows cannot exceed what the claim still owes. The server checks
// cumulative original deliveries against the ordered quantity.
export function receiptPayload(input: { key: string; version: number | string; note: string; lines: DraftReceipt[]; claims: Claim[] }) {
  const note = input.note.trim();
  if ([...note].length > 2000 || note.includes("\0")) throw new Error("หมายเหตุยาวได้ไม่เกิน 2,000 ตัวอักษร");
  const lines = input.lines.filter((line) => !(blank(line.good) && blank(line.damaged))).map((line) => {
    const good = inventoryDecimal(blank(line.good) ? "0" : line.good.trim()); const damaged = inventoryDecimal(blank(line.damaged) ? "0" : line.damaged.trim());
    if (units(good) + units(damaged) === BigInt(0)) throw new Error("แต่ละรายการที่กรอกต้องมีจำนวนดีหรือเสียหายมากกว่า 0");
    if (line.replacement_claim_id) {
      const claim = input.claims.find((c) => c.id === line.replacement_claim_id);
      if (!claim || claim.status !== "claimed") throw new Error("รับของแทนได้เฉพาะรายการที่แจ้งผู้ขายแล้ว");
      if (units(good) + units(damaged) > units(claimOwed(claim))) throw new Error("ของแทนต้องไม่เกินจำนวนที่ผู้ขายยังค้างส่ง");
    }
    return { material_id: line.material_id, good, damaged, ...(line.replacement_claim_id ? { replacement_claim_id: line.replacement_claim_id } : {}) };
  });
  if (!lines.length) throw new Error("กรอกจำนวนที่รับอย่างน้อย 1 รายการ");
  if (lines.length > 100) throw new Error("รับได้ไม่เกิน 100 รายการต่อครั้ง");
  return { idempotency_key: input.key, expected_version: input.version, note, lines };
}

export function claimNote(value: string): string {
  const note = value.trim();
  if (!note || [...note].length > 2000 || note.includes("\0")) throw new Error("กรอกรายละเอียดการแจ้งผู้ขาย 1–2,000 ตัวอักษร");
  return note;
}

export function creditDays(value: string): number {
  if (!/^\d{1,5}$/.test(value.trim()) || Number(value) > 36500) throw new Error("จำนวนวันเครดิตต้องเป็นจำนวนเต็ม 0–36,500");
  return Number(value);
}

export function settlementPayload(input: { key: string; version: number | string; method: "bank" | "cash"; paidAt: string; evidenceId?: string; fullReceivedAt: string }, now: number) {
  const paid_at = bangkokInstant(input.paidAt);
  if (Date.parse(paid_at) > now) throw new Error("เวลาที่จ่ายต้องไม่เป็นเวลาในอนาคต");
  if (Date.parse(paid_at) < Date.parse(input.fullReceivedAt)) throw new Error("เวลาที่จ่ายต้องไม่ก่อนเวลาที่รับของครบ");
  if (input.method === "bank" && !input.evidenceId) throw new Error("โอนผ่านธนาคารต้องแนบหลักฐานการโอนที่อัปโหลดแล้ว");
  return { idempotency_key: input.key, expected_version: input.version, method: input.method, paid_at, ...(input.evidenceId ? { evidence_id: input.evidenceId } : {}) };
}

// Tabs of the รับเข้าวัตถุดิบ page. Status tabs come from the list summary;
// มีของเสียหาย and the Admin-only ค้างจ่ายผู้ขาย need the order detail.
export const RECEIVING_TABS = ["waiting", "partial", "received", "damaged", "unpaid"] as const;
export type ReceivingTab = typeof RECEIVING_TABS[number];
const STATUS_TAB: Record<string, ReceivingTab> = { ordered: "waiting", partially_received: "partial", received: "received" };

export function receivingTab(value: string | null, admin: boolean): ReceivingTab | null {
  return (RECEIVING_TABS as readonly string[]).includes(value ?? "") && (admin || value !== "unpaid") ? value as ReceivingTab : null;
}
export const statusTab = (summary: Pick<ReceivingSummary, "status">): ReceivingTab | null => STATUS_TAB[summary.status] ?? null;
export const hasOpenClaim = (state?: ReceivingState) => Boolean(state?.claims?.some((claim) => claim.status !== "resolved"));
// Fully received and not yet settled (credit days may still be unset).
export const owesSupplier = (state?: ReceivingState) => Boolean(state?.finance && state.status === "received" && state.finance.payment_status !== "paid");

export function inReceivingTab(tab: ReceivingTab, summary: ReceivingSummary, state?: ReceivingState): boolean {
  if (tab === "damaged") return hasOpenClaim(state);
  if (tab === "unpaid") return owesSupplier(state);
  return statusTab(summary) === tab;
}
export function receivingCounts(rows: ReceivingSummary[], states: Record<string, ReceivingState>): Record<ReceivingTab, number> {
  return Object.fromEntries(RECEIVING_TABS.map((tab) => [tab, rows.filter((row) => inReceivingTab(tab, row, states[row.order_id])).length])) as Record<ReceivingTab, number>;
}
export const defaultReceivingTab = (counts: Record<ReceivingTab, number>): ReceivingTab => (["waiting", "partial", "damaged"] as const).find((tab) => counts[tab] > 0) ?? "waiting";
export const matchReceiving = (row: ReceivingSummary, q: string) => !q.trim() || `${row.order_no} ${row.supplier_name}`.toLowerCase().includes(q.trim().toLowerCase());

// Original deliveries (good + damaged) may not pass the ordered quantity, so what
// the original order still expects is outstanding minus what open claims owe.
export function originalRemaining(state: Pick<ReceivingState, "lines" | "claims">, materialId: string): string {
  const line = state.lines?.find((item) => item.material_id === materialId);
  if (!line) return six(BigInt(0));
  const owed = (state.claims ?? []).filter((claim) => claim.material_id === materialId).reduce((sum, claim) => sum + units(claimOwed(claim)), BigInt(0));
  const rest = units(line.outstanding) - owed;
  return six(rest > BigInt(0) ? rest : BigInt(0));
}

// Inline check for one receipt row before sending; the server re-checks totals.
export function receiptRowError(row: Pick<DraftReceipt, "good" | "damaged">, remaining: string): string {
  if (blank(row.good) && blank(row.damaged)) return "";
  let total: bigint;
  try { total = units(blank(row.good) ? "0" : row.good.trim()) + units(blank(row.damaged) ? "0" : row.damaged.trim()); } catch { return "ตัวเลข 0 ขึ้นไป ทศนิยมไม่เกิน 6 ตำแหน่ง"; }
  return total > units(remaining) ? `ดีรวมเสียหายต้องไม่เกิน ${plainQuantity(remaining)}` : "";
}
