import type { EvidenceSubmission, Fulfillment, Terms } from "../src/lib/api/backend-api";

function satang(value: string): bigint {
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) throw new Error("Enter a nonnegative THB amount with at most two decimal places.");
  const [whole, decimals = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(decimals.padEnd(2, "0"));
}

export function bangkokInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Enter a valid Asia/Bangkok date and time.");
  const date = new Date(`${value}:00+07:00`);
  if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16) !== value) throw new Error("Enter a valid Asia/Bangkok date and time.");
  return date.toISOString();
}

export function evidencePayload(terms: Terms, input: { key: string; attachmentId: string; kind: "deposit" | "po"; amount: string; paidAt: string }, now: number): EvidenceSubmission {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(input.key) || !uuid.test(input.attachmentId)) throw new Error("A new submission key and ready attachment are required.");
  const base = { idempotency_key: input.key, attachment_id: input.attachmentId, kind: input.kind };
  if (input.kind === "po") {
    if (!terms.po_required) throw new Error("This quotation does not require a company PO.");
    return base; // Never send amount/paid_at for PO.
  }
  if (!terms.deposit_required) throw new Error("This quotation does not require a deposit.");
  const amount = satang(input.amount);
  if (amount < satang(terms.deposit_amount) || amount > satang(terms.final_price)) throw new Error("One deposit must be between the required minimum and the full quotation total.");
  const paidAt = bangkokInstant(input.paidAt);
  if (new Date(paidAt).getTime() > now) throw new Error("Declared payment time cannot be in the future.");
  return { ...base, amount: `${amount / BigInt(100)}.${(amount % BigInt(100)).toString().padStart(2, "0")}`, paid_at: paidAt };
}

export function availableEvidenceKinds(state: Fulfillment, now: number): ("deposit" | "po")[] {
  if (state.job || state.canceled_at || state.request_status === "canceled" || now > new Date(state.terms.documents_due_at).getTime()) return [];
  return (["deposit", "po"] as const).filter((kind) => (kind === "deposit" ? state.terms.deposit_required : state.terms.po_required) && !state.evidence?.some((item) => item.kind === kind && item.status !== "rejected"));
}

export function reviewReason(outcome: "approved" | "rejected", value: string): string {
  const reason = value.trim();
  if (outcome === "approved") return "";
  if (!reason || [...reason].length > 2000 || reason.includes("\0")) throw new Error("A rejection reason of 1–2,000 characters is required.");
  return reason;
}

export function workerContacts(email: string, phone: string): { email: string; phone: string } {
  email = email.trim(); phone = phone.trim();
  if (!email || new TextEncoder().encode(email).length > 254 || /[\r\n]/.test(email)) throw new Error("Email is required, must be at most 254 bytes, and cannot contain line breaks. The server validates address syntax.");
  if (!phone || new TextEncoder().encode(phone).length > 64 || !/^[+0-9 ().-]+$/.test(phone) || !/^\+?[0-9]{7,15}$/.test(phone.replace(/[ ().-]/g, ""))) throw new Error("Phone needs 7–15 digits, optionally a leading +. Spaces, hyphens, parentheses and dots are allowed; no extensions.");
  return { email, phone }; // Preserve email case; server normalizes phone.
}
