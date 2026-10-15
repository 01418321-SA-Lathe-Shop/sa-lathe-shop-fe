import type { CustomerState, CustomerRequest } from "./customer-domain";
import type { WorkshopState } from "./worker-domain";

export function createWorkshopDemo(customer: CustomerState, now: number): WorkshopState {
  const id = (number: number) => `40000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
  const at = new Date(now).toISOString();
  const pending: CustomerRequest = { id: id(101), details: "Workshop sample — request awaiting estimate", customerType: "individual", createdAt: at, status: "pending", attachments: [], quotations: [], rejections: 0 };
  const queued: CustomerRequest = {
    id: id(102), details: "Workshop sample — rubber mold production", customerType: "individual", createdAt: at, status: "ongoing", attachments: [], rejections: 0,
    quotations: [{ id: id(202), revision: 1, price: 960_000, status: "approved", costs: { material: 400_000, labor: 200_000 } }],
    acceptedAt: at, depositProof: { id: id(302), name: "sample-workshop-deposit.txt", size: 40, type: "text/plain", sample: true }, job: { id: id(402), status: "queued" },
  };
  const materials = [
    { id: id(1), name: "Demo steel blanks", unit: "pcs", onHand: 10, avgCost: { numerator: "125000", denominator: "1" } },
    { id: id(2), name: "Demo tool steel plates", unit: "pcs", onHand: 3, avgCost: { numerator: "200000", denominator: "1" } },
    { id: id(3), name: "Demo aluminium blanks", unit: "pcs", onHand: 12, avgCost: { numerator: "45000", denominator: "1" } },
  ];
  return {
    ...customer, requests: [pending, queued, ...customer.requests], materials,
    suppliers: [{ id: id(501), name: "Demo Steel Supply" }, { id: id(502), name: "Demo Metals Supply" }],
    plans: [{ jobId: id(402), materialId: id(2), quantity: 8 }], reservations: [], orders: [], usages: [], receipts: [], defects: [],
    movements: materials.map((material, index) => ({ id: id(901 + index), materialId: material.id, quantity: material.onHand, kind: "receipt", at, reference: "Opening demo stock", cost: { numerator: String(material.onHand * Number(material.avgCost.numerator)), denominator: "1" } })),
  };
}
