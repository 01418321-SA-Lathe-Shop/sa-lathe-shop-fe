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
const six = (value: bigint) => `${value / BigInt(1000000)}.${(value % BigInt(1000000)).toString().padStart(6, "0")}`;

// Good units the supplier still owes against a damaged-goods claim.
export function claimOwed(claim: Pick<Claim, "quantity" | "replaced">): string { return six(units(claim.quantity) - units(claim.replaced)); }

// Blank rows are skipped; each sent row needs a positive good+damaged total.
// Replacement rows cannot exceed what the claim still owes. The server checks
// cumulative original deliveries against the ordered quantity.
export function receiptPayload(input: { key: string; version: number | string; note: string; lines: DraftReceipt[]; claims: Claim[] }) {
  const note = input.note.trim();
  if ([...note].length > 2000 || note.includes("\0")) throw new Error("Note must be at most 2,000 characters.");
  const lines = input.lines.filter((line) => !(blank(line.good) && blank(line.damaged))).map((line) => {
    const good = inventoryDecimal(blank(line.good) ? "0" : line.good.trim()); const damaged = inventoryDecimal(blank(line.damaged) ? "0" : line.damaged.trim());
    if (units(good) + units(damaged) === BigInt(0)) throw new Error("Each received row needs a positive good or damaged quantity.");
    if (line.replacement_claim_id) {
      const claim = input.claims.find((c) => c.id === line.replacement_claim_id);
      if (!claim || claim.status !== "claimed") throw new Error("Replacements must reference a claim already recorded with the supplier.");
      if (units(good) + units(damaged) > units(claimOwed(claim))) throw new Error("A replacement cannot exceed the quantity the claim still owes.");
    }
    return { material_id: line.material_id, good, damaged, ...(line.replacement_claim_id ? { replacement_claim_id: line.replacement_claim_id } : {}) };
  });
  if (!lines.length) throw new Error("Enter at least one received quantity.");
  if (lines.length > 100) throw new Error("A receipt can contain at most 100 rows.");
  return { idempotency_key: input.key, expected_version: input.version, note, lines };
}

export function claimNote(value: string): string {
  const note = value.trim();
  if (!note || [...note].length > 2000 || note.includes("\0")) throw new Error("Describe the supplier contact in 1–2,000 characters.");
  return note;
}

export function creditDays(value: string): number {
  if (!/^\d{1,5}$/.test(value.trim()) || Number(value) > 36500) throw new Error("Credit days must be a whole number from 0 to 36,500.");
  return Number(value);
}

export function settlementPayload(input: { key: string; version: number | string; method: "bank" | "cash"; paidAt: string; evidenceId?: string; fullReceivedAt: string }, now: number) {
  const paid_at = bangkokInstant(input.paidAt);
  if (Date.parse(paid_at) > now) throw new Error("Payment time cannot be in the future.");
  if (Date.parse(paid_at) < Date.parse(input.fullReceivedAt)) throw new Error("Payment time cannot be before the order was fully received.");
  if (input.method === "bank" && !input.evidenceId) throw new Error("A bank settlement needs a ready transfer proof.");
  return { idempotency_key: input.key, expected_version: input.version, method: input.method, paid_at, ...(input.evidenceId ? { evidence_id: input.evidenceId } : {}) };
}
