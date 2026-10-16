// Local prototype model. These names do not define a Backend API contract.
export type CustomerType = "individual" | "company";
export type Attachment = { id: string; name: string; size: number; type: string; sample?: boolean };
export type Quotation = { id: string; revision: number; price: number; status: "draft" | "sent" | "approved" | "rejected"; costs?: { material: number; labor: number } };
export type Payment = { id: string; amount: number; at: string };
export type CustomerRequest = {
  id: string;
  details: string;
  customerType: CustomerType;
  createdAt: string;
  status: "pending" | "ongoing" | "completed" | "canceled";
  attachments: Attachment[];
  quotations: Quotation[];
  rejections: number;
  acceptedAt?: string;
  depositProof?: Attachment;
  poProof?: Attachment;
  job?: { id: string; status: "queued" | "in_progress" | "completed"; actual?: { cost: number; minutes: number; evidence: Attachment[] } };
  delivery?: { id: string; status: "shipping" | "delivered" | "returned"; method?: "delivery" | "pickup"; recipient?: string; evidence?: Attachment[] };
  invoice?: { id: string; total: number; payments: Payment[] };
};
export type CustomerState = { version: 1; requests: CustomerRequest[] };
export const MAX_FILE_SIZE = 100_000_000;
export const DEADLINE_MS = 14 * 24 * 60 * 60 * 1000;

export function latestQuotation(request: CustomerRequest): Quotation | undefined {
  return request.quotations.at(-1);
}

export function latestVisibleQuotation(request: CustomerRequest): Quotation | undefined {
  return request.quotations.filter((quotation) => quotation.status !== "draft").at(-1);
}

// Prices/amounts in this prototype are integer satang, avoiding float addition.
export function confirmationTerms(type: CustomerType, price: number) {
  if (!Number.isSafeInteger(price) || price < 0) throw new Error("Quotation price must be a valid nonnegative amount.");
  const depositRequired = type === "individual" || price > 1_000_000;
  if (depositRequired && price % 2 !== 0) throw new Error("The rounding rule for a half-satang Deposit must be defined.");
  return {
    poRequired: type === "company",
    deposit: depositRequired ? price / 2 : 0,
  };
}

export function invoiceBalance(request: CustomerRequest): number {
  return request.invoice
    ? request.invoice.total - request.invoice.payments.reduce((sum, payment) => sum + payment.amount, 0)
    : 0;
}

export function invoiceStatus(request: CustomerRequest): "unpaid" | "partial" | "paid" | undefined {
  if (!request.invoice) return undefined;
  if (invoiceBalance(request) === 0) return "paid";
  return request.invoice.payments.length ? "partial" : "unpaid";
}

export function confirmationDeadline(request: CustomerRequest): number | undefined {
  return request.acceptedAt ? Date.parse(request.acceptedAt) + DEADLINE_MS : undefined;
}

export function expireConfirmations(state: CustomerState, now: number): CustomerState {
  let changed = false;
  const requests = state.requests.map((request) => {
    const deadline = confirmationDeadline(request);
    if (request.status !== "canceled" && !request.job && deadline !== undefined && now >= deadline) {
      changed = true;
      return { ...request, status: "canceled" as const };
    }
    return request;
  });
  return changed ? { ...state, requests } : state;
}

export function respondToQuotation(request: CustomerRequest, response: "approved" | "rejected", at: string): CustomerRequest {
  const quotation = latestQuotation(request);
  if (request.status !== "ongoing" || !quotation || quotation.status !== "sent") {
    throw new Error("This quotation is no longer awaiting a response.");
  }
  const rejections = request.rejections + (response === "rejected" ? 1 : 0);
  return {
    ...request,
    quotations: request.quotations.map((item) => item.id === quotation.id ? { ...item, status: response } : item),
    rejections,
    status: rejections >= 6 ? "canceled" : request.status,
    acceptedAt: response === "approved" ? at : undefined,
  };
}

export function submitConfirmation(request: CustomerRequest, proof: { deposit?: Attachment; po?: Attachment }, at: string, jobId: string): CustomerRequest {
  const quotation = latestQuotation(request);
  const deadline = confirmationDeadline(request);
  if (!quotation || quotation.status !== "approved" || request.status !== "ongoing" || request.job) {
    throw new Error("This request is not awaiting Deposit/PO confirmation.");
  }
  if (deadline === undefined || Date.parse(at) >= deadline) throw new Error("The Deposit/PO submission deadline has passed.");
  const terms = confirmationTerms(request.customerType, quotation.price);
  if (terms.deposit && !proof.deposit) throw new Error("Attach the required Deposit evidence.");
  if (terms.poRequired && !proof.po) throw new Error("Attach the required PO document.");
  return { ...request, depositProof: terms.deposit ? proof.deposit : undefined, poProof: terms.poRequired ? proof.po : undefined, job: { id: jobId, status: "queued" } };
}

export function inspectDelivery(request: CustomerRequest, response: "delivered" | "returned"): CustomerRequest {
  if (request.delivery?.status !== "shipping" || request.job?.status !== "completed") {
    throw new Error("This delivery is not awaiting inspection.");
  }
  return {
    ...request,
    delivery: { ...request.delivery, status: response },
    job: { ...request.job, status: response === "returned" ? "in_progress" : "completed" },
  };
}

export function recordPayment(request: CustomerRequest, payment: Payment): CustomerRequest {
  if (!request.invoice || request.delivery?.status === "returned") throw new Error("This invoice cannot receive a payment right now.");
  if (!Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.amount > invoiceBalance(request)) {
    throw new Error("Enter a payment greater than zero and no more than the outstanding balance.");
  }
  if (request.invoice.payments.some((item) => item.id === payment.id)) throw new Error("This payment has already been recorded.");
  return { ...request, invoice: { ...request.invoice, payments: [...request.invoice.payments, payment] } };
}
