// UC6 supplier orders (backend UC6.md). Quantities/unit costs are exact
// NUMERIC(18,6) strings; each line rounds half-up to two THB decimals, then sums.
import { inventoryDecimal } from "./backend-inventory-domain.ts";
import { bangkokInstant } from "./backend-fulfillment-domain.ts";

export type Supplier = { id: string; name: string; email: string; phone: string; is_active: boolean; version: number | string };
export type OrderLine = { material_id: string; material_name: string; unit_id: string; unit_name: string; quantity: string; unit_cost: string; total_amount: string };
export type OrderEvent = { id: string; actor_id: string; action: string; reason: string; version: number | string; created_at: string };
export type SupplierOrder = { id: string; order_no: string; supplier: Supplier; job_ids: string[] | null; lines: OrderLine[] | null; total_amount: string; status: string; supplier_response: string; version: number | string; expected_at?: string; created_at: string; created_by: string; events: OrderEvent[] | null };
export type DraftLine = { material_id: string; name: string; unit_name: string; quantity: string; unit_cost: string };
export type OrderAction = "accept" | "reject" | "cancel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function supplierFields(name: string, email: string, phone: string) {
  const trimmed = name.trim(); email = email.trim(); phone = phone.trim();
  if (!trimmed || [...trimmed].length > 200 || /[\0\r\n]/.test(trimmed)) throw new Error("Supplier name is required, up to 200 characters, without line breaks.");
  if (email && (new TextEncoder().encode(email).length > 254 || !/^[^\s@<>()",]+@[^\s@<>()",]+\.[^\s@<>()",]+$/.test(email))) throw new Error("Email must be a plain address such as sales@example.com, without a display name.");
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) throw new Error("Phone must be 7–15 digits with an optional leading +. Remove spaces and hyphens.");
  return { name: trimmed, email, phone };
}

// Exact display preview of the server's rounding; the server total is authoritative.
export function lineTotal(quantity: string, unitCost: string): string {
  const q = BigInt(inventoryDecimal(quantity).replace(".", "")); const c = BigInt(inventoryDecimal(unitCost).replace(".", ""));
  const scale = BigInt(10000000000); const satang = (q * c * BigInt(2) + scale) / (scale * BigInt(2));
  return `${satang / BigInt(100)}.${(satang % BigInt(100)).toString().padStart(2, "0")}`;
}
export function orderTotal(lines: { quantity: string; unit_cost: string }[]): string {
  const sum = lines.reduce((total, line) => total + BigInt(lineTotal(line.quantity, line.unit_cost).replace(".", "")), BigInt(0));
  return `${sum / BigInt(100)}.${(sum % BigInt(100)).toString().padStart(2, "0")}`;
}

export function orderPayload(input: { key: string; supplierId: string; jobIds: string[]; expectedAt: string; lines: DraftLine[] }) {
  if (!UUID.test(input.key)) throw new Error("A new order key is required.");
  if (!UUID.test(input.supplierId)) throw new Error("Choose an active supplier.");
  if (input.lines.length < 1 || input.lines.length > 100) throw new Error("An order needs 1–100 material lines.");
  if (new Set(input.lines.map((line) => line.material_id)).size !== input.lines.length) throw new Error("Each material may appear once per order.");
  if (input.jobIds.length > 100 || new Set(input.jobIds).size !== input.jobIds.length || input.jobIds.some((id) => !UUID.test(id))) throw new Error("Job references must be up to 100 distinct jobs.");
  const lines = input.lines.map((line) => ({ material_id: line.material_id, quantity: inventoryDecimal(line.quantity, true), unit_cost: inventoryDecimal(line.unit_cost) }));
  return { idempotency_key: input.key, supplier_id: input.supplierId, job_ids: input.jobIds, ...(input.expectedAt ? { expected_at: bangkokInstant(input.expectedAt) } : {}), lines };
}

export function orderActionPayload(action: OrderAction, rawReason: string, key: string, expectedVersion: number | string) {
  const reason = rawReason.trim();
  if ((action === "reject" || action === "cancel") && !reason) throw new Error("A reason is required to reject or cancel an order.");
  if ([...reason].length > 2000 || reason.includes("\0")) throw new Error("Reason must be at most 2,000 characters.");
  return { idempotency_key: key, expected_version: expectedVersion, action, ...(reason ? { reason } : {}) };
}

// Which supplier-response commands the current state permits (UC6 state table).
export function allowedActions(order: Pick<SupplierOrder, "status" | "supplier_response">): OrderAction[] {
  if (order.status === "cancelled") return [];
  if (order.supplier_response === "pending") return ["accept", "reject", "cancel"];
  if (order.supplier_response === "accepted" && order.status === "ordered") return ["cancel"];
  return [];
}
