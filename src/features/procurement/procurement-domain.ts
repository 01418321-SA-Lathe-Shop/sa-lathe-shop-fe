// UC6 supplier orders (backend UC6.md). Quantities/unit costs are exact
// NUMERIC(18,6) strings; each line rounds half-up to two THB decimals, then sums.
import { inventoryDecimal } from "../inventory/inventory-domain.ts";
import { bangkokInstant } from "../fulfillment/fulfillment-domain.ts";

export type Supplier = { id: string; name: string; email: string; phone: string; is_active: boolean; version: number | string };
export type OrderLine = { material_id: string; material_name: string; unit_id: string; unit_name: string; quantity: string; unit_cost: string; total_amount: string };
export type OrderEvent = { id: string; actor_id: string; action: string; reason: string; version: number | string; created_at: string };
export type SupplierOrder = { id: string; order_no: string; supplier: Supplier; job_ids: string[] | null; lines: OrderLine[] | null; total_amount: string; status: string; supplier_response: string; version: number | string; expected_at?: string; created_at: string; created_by: string; events: OrderEvent[] | null };
export type DraftLine = { material_id: string; name: string; unit_name: string; quantity: string; unit_cost: string };
export type OrderAction = "accept" | "reject" | "cancel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function supplierFields(name: string, email: string, phone: string) {
  const trimmed = name.trim(); email = email.trim(); phone = phone.trim();
  if (!trimmed || [...trimmed].length > 200 || /[\0\r\n]/.test(trimmed)) throw new Error("กรอกชื่อผู้ขาย ไม่เกิน 200 ตัวอักษร ไม่ขึ้นบรรทัดใหม่");
  if (email && (new TextEncoder().encode(email).length > 254 || !/^[^\s@<>()",]+@[^\s@<>()",]+\.[^\s@<>()",]+$/.test(email))) throw new Error("อีเมลต้องเป็นที่อยู่อย่างเดียว เช่น sales@example.com");
  if (phone && !/^\+?[0-9]{7,15}$/.test(phone)) throw new Error("เบอร์โทรเป็นตัวเลข 7–15 หลัก ขึ้นต้นด้วย + ได้ ไม่ต้องเว้นวรรคหรือใส่ขีด");
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
  if (!UUID.test(input.key)) throw new Error("เปิดฟอร์มสั่งซื้อใหม่อีกครั้ง");
  if (!UUID.test(input.supplierId)) throw new Error("เลือกผู้ขายที่เปิดใช้งาน");
  if (input.lines.length < 1 || input.lines.length > 100) throw new Error("ใบสั่งซื้อต้องมีวัตถุดิบ 1–100 รายการ");
  if (new Set(input.lines.map((line) => line.material_id)).size !== input.lines.length) throw new Error("วัตถุดิบแต่ละชนิดใส่ได้ครั้งเดียวต่อใบสั่งซื้อ");
  if (input.jobIds.length > 100 || new Set(input.jobIds).size !== input.jobIds.length || input.jobIds.some((id) => !UUID.test(id))) throw new Error("เลือกงานที่เกี่ยวข้องได้ไม่เกิน 100 งาน ไม่ซ้ำกัน");
  const lines = input.lines.map((line) => ({ material_id: line.material_id, quantity: inventoryDecimal(line.quantity, true), unit_cost: inventoryDecimal(line.unit_cost) }));
  return { idempotency_key: input.key, supplier_id: input.supplierId, job_ids: input.jobIds, ...(input.expectedAt ? { expected_at: bangkokInstant(input.expectedAt) } : {}), lines };
}

export function orderActionPayload(action: OrderAction, rawReason: string, key: string, expectedVersion: number | string) {
  const reason = rawReason.trim();
  if ((action === "reject" || action === "cancel") && !reason) throw new Error("กรอกเหตุผลเมื่อผู้ขายปฏิเสธหรือยกเลิกใบสั่งซื้อ");
  if ([...reason].length > 2000 || reason.includes("\0")) throw new Error("เหตุผลไม่เกิน 2,000 ตัวอักษร");
  return { idempotency_key: key, expected_version: expectedVersion, action, ...(reason ? { reason } : {}) };
}

// Which supplier-response commands the current state permits (UC6 state table).
export function allowedActions(order: Pick<SupplierOrder, "status" | "supplier_response">): OrderAction[] {
  if (order.status === "cancelled") return [];
  if (order.supplier_response === "pending") return ["accept", "reject", "cancel"];
  if (order.supplier_response === "accepted" && order.status === "ordered") return ["cancel"];
  return [];
}

// Tabs for สั่งซื้อวัตถุดิบ, from status plus supplier response (UC6/UC7 state table).
export const ORDER_TABS = ["pending", "accepted", "partial", "received", "cancelled"] as const;
export type OrderTab = (typeof ORDER_TABS)[number];
type OrderState = Pick<SupplierOrder, "status" | "supplier_response">;

// shortcut: an unknown status/response pair belongs to no tab, revisit if UC6/UC7 add states.
export function orderTabOf(order: OrderState): OrderTab | null {
  if (order.status === "cancelled") return "cancelled";
  if (order.status === "received") return "received";
  if (order.status === "partially_received") return "partial";
  if (order.status !== "ordered") return null;
  return order.supplier_response === "pending" ? "pending" : order.supplier_response === "accepted" ? "accepted" : null;
}
export const orderTab = (value: string | null): OrderTab | null => ORDER_TABS.find((tab) => tab === value) ?? null;

export function orderCounts(orders: OrderState[]): Record<OrderTab, number> {
  const counts = { pending: 0, accepted: 0, partial: 0, received: 0, cancelled: 0 };
  for (const order of orders) { const tab = orderTabOf(order); if (tab) counts[tab] += 1; }
  return counts;
}
/** First tab that still needs attention; falls back to รอผู้ขายตอบ. */
export const defaultOrderTab = (counts: Record<OrderTab, number>): OrderTab => (["pending", "accepted", "partial"] as const).find((tab) => counts[tab] > 0) ?? "pending";

/** Case-insensitive match on order number or supplier name. */
export function matchOrder(order: Pick<SupplierOrder, "order_no" | "supplier">, query: string): boolean {
  const q = query.trim().toLocaleLowerCase("th");
  return !q || order.order_no.toLocaleLowerCase("th").includes(q) || order.supplier.name.toLocaleLowerCase("th").includes(q);
}
