import type { CustomerRequest, CustomerState, Quotation } from "./customer-domain";

// Synthetic scenarios, deliberately not real customers, orders, or receipts.
export function createCustomerDemo(now: number): CustomerState {
  const at = new Date(now).toISOString();
  const uuid = (value: number) => `30000000-0000-4000-8000-${String(value).padStart(12, "0")}`;
  function quoted(value: number, details: string, customerType: "individual" | "company", price: number): CustomerRequest {
    return {
      id: uuid(value), details, customerType, createdAt: at, status: "ongoing",
      attachments: [], rejections: 0,
      quotations: [{ id: uuid(value + 100), revision: 1, price, status: "sent" }],
    };
  }
  const personal = quoted(1, "Rubber mold insert — individual sample", "individual", 640_000);
  const smallCompany = quoted(2, "Mold repair — company threshold sample", "company", 1_000_000);
  const largeCompany = quoted(3, "Compression mold assembly — company sample", "company", 1_600_000);
  const finalRevision = quoted(4, "Rubber mold revision — fifth-response sample", "individual", 960_000);
  finalRevision.rejections = 4;
  finalRevision.quotations = Array.from({ length: 5 }, (_, i): Quotation => ({
    id: uuid(200 + i), revision: i + 1, price: 960_000, status: i === 4 ? "sent" : "rejected",
  }));
  const deliveredJob = quoted(5, "Completed rubber mold — delivery and payment sample", "individual", 1_280_000);
  deliveredJob.quotations[0].status = "approved";
  deliveredJob.acceptedAt = at;
  deliveredJob.depositProof = { id: uuid(305), name: "sample-deposit-receipt.txt", size: 120, type: "text/plain", sample: true };
  deliveredJob.job = { id: uuid(405), status: "completed" };
  deliveredJob.delivery = { id: uuid(505), status: "shipping" };
  deliveredJob.invoice = { id: uuid(605), total: 640_000, payments: [] };
  return { version: 1, requests: [personal, smallCompany, largeCompany, finalRevision, deliveredJob] };
}
