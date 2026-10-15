import type { Attachment, CustomerRequest, CustomerState, Quotation } from "./customer-domain";

// Local demo model only. Quantities use whole pieces; production precision is open.
export type ExactCost = { numerator: string; denominator: string };
export type Material = { id: string; name: string; unit: string; onHand: number; avgCost: ExactCost };
export type Plan = { jobId: string; materialId: string; quantity: number };
export type Reservation = Plan & { id: string; status: "reserved" | "consumed" };
export type Movement = { id: string; materialId: string; quantity: number; kind: "receipt" | "issue"; at: string; reference: string; cost: ExactCost };
export type Usage = Plan & { id: string; at: string; cost: ExactCost };
export type OrderItem = { id: string; materialId: string; quantity: number; unitPrice: number; good: number; defective: number; status: "ordered" | "partially_received" | "received" | "damaged" };
export type MaterialOrder = { id: string; jobId: string; supplierId: string; at: string; items: OrderItem[]; status: "ordered" | "partially_received" | "received" | "cancelled"; paymentStatus: "unpaid" | "pending" | "paid" };
export type WorkshopState = CustomerState & {
  materials: Material[];
  suppliers: { id: string; name: string }[];
  plans: Plan[];
  reservations: Reservation[];
  orders: MaterialOrder[];
  movements: Movement[];
  usages: Usage[];
  receipts: { id: string; orderId: string; itemId: string; good: number; defective: number; at: string }[];
  defects: { id: string; orderId: string; materialId: string; quantity: number; status: "PENDING_CLAIM" | "CLAIMED" }[];
};

const ONE = BigInt(1);
const ZERO = BigInt(0);
export function exactCost(numerator: bigint | number, denominator: bigint | number = 1): ExactCost {
  let n = BigInt(numerator), d = BigInt(denominator);
  if (d <= ZERO || n < ZERO) throw new Error("Invalid material cost.");
  let a = n, b = d;
  while (b !== ZERO) { const remainder = a % b; a = b; b = remainder; }
  const divisor = a || ONE;
  n /= divisor; d /= divisor;
  return { numerator: String(n), denominator: String(d) };
}
export function costForDisplay(cost: ExactCost): number { return Number(cost.numerator) / Number(cost.denominator); }
function scaleCost(cost: ExactCost, quantity: number): ExactCost {
  return exactCost(BigInt(cost.numerator) * BigInt(quantity), BigInt(cost.denominator));
}
function receivedAverage(material: Material, good: number, unitPrice: number): ExactCost {
  const d = BigInt(material.avgCost.denominator);
  return exactCost(BigInt(material.avgCost.numerator) * BigInt(material.onHand) + BigInt(good) * BigInt(unitPrice) * d, d * BigInt(material.onHand + good));
}
function quantity(value: number, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 1_000_000) throw new Error("Use a whole-piece quantity between 1 and 1,000,000 (zero only where allowed).");
}
function money(value: number, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > Math.floor(Number.MAX_SAFE_INTEGER / 160)) throw new Error("Enter a valid nonnegative monetary amount within the demo limit.");
}
function getRequest(data: WorkshopState, id: string): CustomerRequest {
  const request = data.requests.find((item) => item.id === id);
  if (!request) throw new Error("Request not found.");
  return request;
}
function getJob(data: WorkshopState, jobId: string): CustomerRequest {
  const request = data.requests.find((item) => item.job?.id === jobId);
  if (!request || request.status === "canceled") throw new Error("Active job not found.");
  return request;
}
function replaceRequest(data: WorkshopState, updated: CustomerRequest): WorkshopState {
  return { ...data, requests: data.requests.map((request) => request.id === updated.id ? updated : request) };
}

export function minimumQuote(material: number, labor: number): number | undefined {
  money(material, true); money(labor, true);
  const numerator = (material + labor) * 160;
  if (!Number.isSafeInteger(numerator) || numerator <= 0) throw new Error("Enter material and labor costs with a positive total.");
  return numerator % 100 === 0 ? numerator / 100 : undefined;
}
export function saveQuotation(data: WorkshopState, requestId: string, costs: { material: number; labor: number }, price: number, id: string, send: boolean): WorkshopState {
  const request = getRequest(data, requestId);
  const latest = request.quotations.at(-1);
  minimumQuote(costs.material, costs.labor); money(price);
  if (price * 100 < (costs.material + costs.labor) * 160) throw new Error("Final price must include at least 60% markup on material plus labor cost.");
  if (request.status === "canceled" || request.job || request.acceptedAt || (latest && latest.status !== "draft" && latest.status !== "rejected")) throw new Error("This request is not open for a quotation draft or revision.");
  // Preserve the existing no-silent-rounding rule for a required 50% Deposit.
  if ((request.customerType === "individual" || price > 1_000_000) && price % 2 !== 0) throw new Error("Choose a price with an exact 50% Deposit; half-satang rounding is not defined.");
  const quotation: Quotation = { id: latest?.status === "draft" ? latest.id : id, revision: latest?.status === "draft" ? latest.revision : (latest?.revision ?? 0) + 1, price, costs, status: send ? "sent" : "draft" };
  const quotations = latest?.status === "draft" ? [...request.quotations.slice(0, -1), quotation] : [...request.quotations, quotation];
  return replaceRequest(data, { ...request, quotations, status: send ? "ongoing" : request.status });
}
export function rejectRequest(data: WorkshopState, requestId: string): WorkshopState {
  const request = getRequest(data, requestId);
  if (request.job || request.acceptedAt || request.status === "canceled") throw new Error("This request can no longer be rejected by the estimate action.");
  return replaceRequest(data, { ...request, status: "canceled" });
}

export function reservedQuantity(data: WorkshopState, materialId: string, jobId?: string): number {
  return data.reservations.filter((reservation) => reservation.status === "reserved" && reservation.materialId === materialId && (!jobId || reservation.jobId === jobId)).reduce((sum, reservation) => sum + reservation.quantity, 0);
}
export function availableQuantity(data: WorkshopState, materialId: string): number {
  const material = data.materials.find((item) => item.id === materialId);
  return material ? material.onHand - reservedQuantity(data, materialId) : 0;
}
export function materialNeed(data: WorkshopState, jobId: string, materialId: string) {
  const planned = data.plans.find((line) => line.jobId === jobId && line.materialId === materialId)?.quantity ?? 0;
  const used = data.usages.filter((line) => line.jobId === jobId && line.materialId === materialId).reduce((sum, line) => sum + line.quantity, 0);
  const reserved = reservedQuantity(data, materialId, jobId);
  const available = availableQuantity(data, materialId);
  const incoming = data.orders.filter((order) => order.jobId === jobId && order.status !== "cancelled").flatMap((order) => order.items).filter((item) => item.materialId === materialId).reduce((sum, item) => sum + item.quantity - item.good - item.defective, 0);
  // Shortage formula is explicitly unconfirmed; expose facts, not a recommendation.
  return { planned, used, reserved, available, incoming };
}
export function savePlan(data: WorkshopState, jobId: string, lines: Omit<Plan, "jobId">[]): WorkshopState {
  const request = getJob(data, jobId);
  if (request.job?.status !== "queued" || data.reservations.some((line) => line.jobId === jobId) || data.orders.some((order) => order.jobId === jobId && order.status !== "cancelled")) throw new Error("Edit the plan before reserving or ordering materials. Reservation release/variance policy is not defined yet.");
  if (new Set(lines.map((line) => line.materialId)).size !== lines.length) throw new Error("Each material must appear once in a job plan.");
  lines.forEach((line) => { quantity(line.quantity); if (!data.materials.some((material) => material.id === line.materialId)) throw new Error("Material not found."); });
  return { ...data, plans: [...data.plans.filter((line) => line.jobId !== jobId), ...lines.map((line) => ({ ...line, jobId }))] };
}
export function reserveJob(data: WorkshopState, jobId: string, ids: Record<string, string>): WorkshopState {
  const request = getJob(data, jobId);
  if (request.job?.status !== "queued") throw new Error("Reserve materials before starting this demo job.");
  const lines = data.plans.filter((line) => line.jobId === jobId);
  if (!lines.length) throw new Error("Save a material plan first.");
  let next = data;
  for (const line of lines) {
    const need = materialNeed(next, jobId, line.materialId);
    const toReserve = Math.min(Math.max(0, need.planned - need.used - need.reserved), need.available);
    if (toReserve <= 0) continue;
    const existing = next.reservations.find((item) => item.jobId === jobId && item.materialId === line.materialId && item.status === "reserved");
    const reservations = existing ? next.reservations.map((item) => item.id === existing.id ? { ...item, quantity: item.quantity + toReserve } : item) : [...next.reservations, { id: ids[line.materialId], jobId, materialId: line.materialId, quantity: toReserve, status: "reserved" as const }];
    if (!existing && !ids[line.materialId]) throw new Error("Reservation ID is required.");
    next = { ...next, reservations };
  }
  return next;
}

export function createOrder(data: WorkshopState, jobId: string, supplierId: string, lines: { id: string; materialId: string; quantity: number; unitPrice: number }[], id: string, at: string): WorkshopState {
  const request = getJob(data, jobId);
  if (request.job?.status !== "queued") throw new Error("Order shortage materials for queued jobs only.");
  if (!data.suppliers.some((supplier) => supplier.id === supplierId)) throw new Error("Choose a Supplier.");
  if (!lines.length || new Set(lines.map((line) => line.materialId)).size !== lines.length) throw new Error("Choose unique material order lines.");
  if (data.orders.some((order) => order.id === id)) throw new Error("Order already exists.");
  lines.forEach((line) => {
    quantity(line.quantity); money(line.unitPrice, true);
    if (!data.plans.some((plan) => plan.jobId === jobId && plan.materialId === line.materialId)) throw new Error("Choose a material in this job's saved plan.");
  });
  if (new Set(lines.map((line) => line.id)).size !== lines.length || lines.some((line) => data.orders.some((order) => order.items.some((item) => item.id === line.id)))) throw new Error("Order line IDs must be unique.");
  const order: MaterialOrder = { id, jobId, supplierId, at, status: "ordered", paymentStatus: "unpaid", items: lines.map((line) => ({ ...line, good: 0, defective: 0, status: "ordered" })) };
  return { ...data, orders: [...data.orders, order] };
}
export function cancelSupplierOrder(data: WorkshopState, orderId: string): WorkshopState {
  const order = data.orders.find((item) => item.id === orderId);
  if (!order || order.status !== "ordered" || order.items.some((item) => item.good + item.defective > 0)) throw new Error("Only an untouched order can be rejected by this Supplier demo action.");
  return { ...data, orders: data.orders.map((item) => item.id === orderId ? { ...item, status: "cancelled" } : item) };
}
export function receiveMaterial(data: WorkshopState, orderId: string, itemId: string, good: number, defective: number, ids: { receipt: string; movement: string; defect: string }, at: string): WorkshopState {
  quantity(good, true); quantity(defective, true);
  const order = data.orders.find((item) => item.id === orderId);
  const item = order?.items.find((line) => line.id === itemId);
  if (!order || !item || !["ordered", "partially_received"].includes(order.status)) throw new Error("This order cannot receive goods.");
  if (!good && !defective) throw new Error("Enter at least one received unit.");
  if (good + defective > item.quantity - item.good - item.defective) throw new Error("Received quantity exceeds the outstanding order quantity.");
  if (data.receipts.some((receipt) => receipt.id === ids.receipt)) throw new Error("This receipt is already recorded.");
  if ((good && data.movements.some((movement) => movement.id === ids.movement)) || (defective && data.defects.some((defect) => defect.id === ids.defect))) throw new Error("Receipt record IDs must be unique.");
  const material = data.materials.find((record) => record.id === item.materialId);
  if (!material) throw new Error("Material not found.");
  const updated: OrderItem = { ...item, good: item.good + good, defective: item.defective + defective, status: "partially_received" };
  if (updated.good + updated.defective === updated.quantity) updated.status = updated.good ? "received" : "damaged";
  const items = order.items.map((line) => line.id === itemId ? updated : line);
  const status = items.every((line) => line.good + line.defective === line.quantity) ? "received" : "partially_received";
  return {
    ...data,
    materials: good ? data.materials.map((record) => record.id === material.id ? { ...record, onHand: record.onHand + good, avgCost: receivedAverage(record, good, item.unitPrice) } : record) : data.materials,
    orders: data.orders.map((record) => record.id === orderId ? { ...record, items, status } : record),
    receipts: [...data.receipts, { id: ids.receipt, orderId, itemId, good, defective, at }],
    movements: good ? [...data.movements, { id: ids.movement, materialId: material.id, quantity: good, kind: "receipt", at, reference: orderId, cost: exactCost(BigInt(good) * BigInt(item.unitPrice)) }] : data.movements,
    defects: defective ? [...data.defects, { id: ids.defect, orderId, materialId: material.id, quantity: defective, status: "PENDING_CLAIM" }] : data.defects,
  };
}
export function recordSupplierPayment(data: WorkshopState, orderId: string, credit: boolean): WorkshopState {
  const order = data.orders.find((record) => record.id === orderId);
  if (!order || order.status === "cancelled" || order.paymentStatus !== "unpaid" || !order.items.some((item) => item.good + item.defective > 0)) throw new Error("Record a first receipt before setting the demo Supplier payment status.");
  return { ...data, orders: data.orders.map((record) => record.id === orderId ? { ...record, paymentStatus: credit ? "pending" : "paid" } : record) };
}
export function recordClaim(data: WorkshopState, defectId: string): WorkshopState {
  if (!data.defects.some((defect) => defect.id === defectId && defect.status === "PENDING_CLAIM")) throw new Error("This defect is not awaiting a claim.");
  return { ...data, defects: data.defects.map((defect) => defect.id === defectId ? { ...defect, status: "CLAIMED" } : defect) };
}

export function startJob(data: WorkshopState, jobId: string): WorkshopState {
  const request = getJob(data, jobId);
  const plan = data.plans.filter((line) => line.jobId === jobId);
  if (request.job?.status !== "queued" || !plan.length || plan.some((line) => { const need = materialNeed(data, jobId, line.materialId); return need.used + need.reserved < need.planned; })) throw new Error("Reserve all planned material quantities before starting this demo job.");
  return replaceRequest(data, { ...request, job: { ...request.job, status: "in_progress" } });
}
export function issueMaterial(data: WorkshopState, jobId: string, materialId: string, amount: number, ids: { usage: string; movement: string; consumed: string }, at: string): WorkshopState {
  quantity(amount);
  const request = getJob(data, jobId);
  const need = materialNeed(data, jobId, materialId);
  const material = data.materials.find((item) => item.id === materialId);
  const reserved = data.reservations.find((item) => item.jobId === jobId && item.materialId === materialId && item.status === "reserved");
  if (request.job?.status !== "in_progress" || !material || !reserved || amount > reserved.quantity || amount > material.onHand || amount > need.planned - need.used) throw new Error("Issue no more than this job's reserved, unused planned quantity.");
  if (data.usages.some((usage) => usage.id === ids.usage)) throw new Error("Material usage already recorded.");
  if (data.movements.some((movement) => movement.id === ids.movement) || data.reservations.some((reservation) => reservation.id === ids.consumed)) throw new Error("Issue record IDs must be unique.");
  const reservations = data.reservations.filter((item) => item.id !== reserved.id);
  if (reserved.quantity > amount) reservations.push({ ...reserved, quantity: reserved.quantity - amount });
  reservations.push({ ...reserved, id: ids.consumed, quantity: amount, status: "consumed" });
  const cost = scaleCost(material.avgCost, amount);
  return { ...data, materials: data.materials.map((item) => item.id === materialId ? { ...item, onHand: item.onHand - amount } : item), reservations, usages: [...data.usages, { id: ids.usage, jobId, materialId, quantity: amount, at, cost }], movements: [...data.movements, { id: ids.movement, materialId, quantity: -amount, kind: "issue", at, reference: jobId, cost }] };
}
export function recordActuals(data: WorkshopState, jobId: string, actual: { cost: number; minutes: number; evidence: Attachment[] }): WorkshopState {
  const request = getJob(data, jobId);
  money(actual.cost, true); quantity(actual.minutes, true);
  if (request.job?.status !== "in_progress") throw new Error("Record actual cost/time while the job is in progress.");
  return replaceRequest(data, { ...request, job: { ...request.job, actual } });
}
export function completeJob(data: WorkshopState, jobId: string): WorkshopState {
  const request = getJob(data, jobId);
  if (request.job?.status !== "in_progress" || !request.job.actual) throw new Error("Record actual cost/time before completing production.");
  if (data.plans.some((line) => line.jobId === jobId && materialNeed(data, jobId, line.materialId).used < line.quantity)) throw new Error("Finish issuing planned materials before completing this demo job.");
  return replaceRequest(data, { ...request, job: { ...request.job, status: "completed" } });
}
export function createDelivery(data: WorkshopState, requestId: string, delivery: { id: string; method: "delivery" | "pickup"; recipient: string; evidence: Attachment[] }, invoiceId: string): WorkshopState {
  const request = getRequest(data, requestId);
  const quotation = request.quotations.at(-1);
  if (request.job?.status !== "completed" || quotation?.status !== "approved" || !delivery.recipient.trim() || (request.delivery && request.delivery.status !== "returned")) throw new Error("Deliver a completed job once, with a recipient; returned work may be sent again after rework.");
  const depositRequired = request.customerType === "individual" || quotation.price > 1_000_000;
  if (depositRequired && quotation.price % 2) throw new Error("Deposit rounding must be defined.");
  const deducted = request.depositProof && depositRequired ? quotation.price / 2 : 0;
  return replaceRequest(data, { ...request, delivery: { ...delivery, recipient: delivery.recipient.trim(), status: "shipping" }, invoice: request.invoice ?? { id: invoiceId, total: quotation.price - deducted, payments: [] } });
}
