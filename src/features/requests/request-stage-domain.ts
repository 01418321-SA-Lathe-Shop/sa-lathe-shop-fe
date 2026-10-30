// UC1–UC4 request pipeline for Staff/Admin: stage views worked out from the
// existing request, quotation and Deposit/PO DTOs. Stages are views, not new
// statuses; the server still decides every transition.
import type { Evidence, Fulfillment, JobRequest, Quotation } from "../../lib/api/backend-api.ts";
import { latestQuote } from "../customer/customer-domain.ts";

export type RequestRecord = { request: JobRequest; quotations: Quotation[]; fulfillment?: Fulfillment; issue?: boolean };
export type RequestStage = "quote" | "customer" | "evidence" | "review" | "opened" | "closed";
export type RequestView = "list" | "cards";
export const REQUEST_STAGES: readonly RequestStage[] = ["quote", "customer", "evidence", "review", "opened", "closed"];
/** Customer quotation rejections that cancel a request (five allow a revision). */
export const CANCELLING_REJECTION = 6;
export const REQUEST_STEPS = ["ใบเสนอราคา", "ลูกค้าตอบ", "มัดจำ/PO", "ตรวจหลักฐาน", "เปิดงาน"];

export function requestStage(value: string | null): RequestStage | null {
  return REQUEST_STAGES.find((stage) => stage === value) ?? null;
}

/** The card popup is an Admin presentation choice; Staff keep the working list/detail view. */
export function requestView(value: string | null, worker: boolean): RequestView {
  return !worker && value === "cards" ? "cards" : "list";
}

/** Finished requests need no quotation/Deposit/PO reads to be placed. */
export const isClosed = (request: Pick<JobRequest, "status">) => request.status === "completed" || request.status === "canceled";

/** The stage of one record, or null when its quotations/fulfillment could not be read. */
export function stageOf(record: RequestRecord): RequestStage | null {
  if (isClosed(record.request)) return "closed";
  if (record.issue) return null;
  const quote = latestQuote(record.quotations);
  if (!quote || quote.status === "draft" || quote.status === "rejected") return "quote";
  if (quote.status === "sent") return "customer";
  if (quote.status !== "approved" || !record.fulfillment) return null;
  if (record.fulfillment.job) return "opened";
  return record.fulfillment.evidence?.some((item) => item.status === "pending") ? "review" : "evidence";
}

/** Tabs where this role has to act; Admin never prepares quotations. */
export function attentionStages(worker: boolean): RequestStage[] { return worker ? ["quote", "review"] : ["review"]; }

function matches(request: JobRequest, query: string) {
  const term = query.trim().toLocaleLowerCase("th-TH");
  return !term || `${request.no_request} ${request.description}`.toLocaleLowerCase("th-TH").includes(term);
}

export function stageCounts(records: RequestRecord[], query: string) {
  const counts: Record<RequestStage, number> = { quote: 0, customer: 0, evidence: 0, review: 0, opened: 0, closed: 0 };
  let unknown = 0;
  for (const record of records) {
    if (!matches(record.request, query)) continue;
    const stage = stageOf(record);
    if (stage) counts[stage]++; else unknown++;
  }
  return { counts, unknown };
}

/** Open the stage of a linked request, else the first stage where this role must act. */
export function defaultStage(counts: Record<RequestStage, number>, worker: boolean, linked?: RequestRecord): RequestStage {
  const stage = linked ? stageOf(linked) : null;
  if (stage) return stage;
  return attentionStages(worker).find((key) => counts[key]) ?? REQUEST_STAGES.find((key) => counts[key]) ?? "quote";
}

const at = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const ascending = (a: number | null, b: number | null) => (a ?? Infinity) - (b ?? Infinity);

// Open work: Deposit/PO stages by the server deadline, other stages by the
// customer's requested date (undated last) then oldest request. Closed: newest.
export function stageRows(records: RequestRecord[], stage: RequestStage, query: string) {
  return records.map((record, index) => ({ record, index }))
    .filter(({ record }) => stageOf(record) === stage && matches(record.request, query))
    .sort((a, b) => {
      const left = a.record; const right = b.record;
      if (stage === "closed") return (at(right.request.created_at) ?? 0) - (at(left.request.created_at) ?? 0) || a.index - b.index;
      if (stage === "evidence" || stage === "review") {
        const due = ascending(at(left.fulfillment?.terms.documents_due_at), at(right.fulfillment?.terms.documents_due_at));
        if (due) return due;
      }
      return ascending(at(left.request.deadline), at(right.request.deadline)) || ascending(at(left.request.created_at), at(right.request.created_at)) || a.index - b.index;
    })
    .map(({ record }) => record);
}

export function unreadableRows(records: RequestRecord[], query: string) {
  return records.filter((record) => !stageOf(record) && matches(record.request, query));
}

export type EvidenceNeed = { kind: "deposit" | "po"; state: "missing" | "rejected" | "pending" | "approved" };

/** One row per required kind with the newest submission's state (the customer's checklist). */
export function evidenceChecklist(fulfillment: Fulfillment): EvidenceNeed[] {
  const kinds = (["deposit", "po"] as const).filter((kind) => kind === "deposit" ? fulfillment.terms.deposit_required : fulfillment.terms.po_required);
  return kinds.map((kind) => {
    const items = (fulfillment.evidence ?? []).filter((item) => item.kind === kind);
    const active = items.find((item) => item.status === "approved") ?? items.find((item) => item.status === "pending");
    if (active) return { kind, state: active.status as "approved" | "pending" };
    return { kind, state: items.length ? "rejected" : "missing" };
  });
}

export const pendingEvidence = (fulfillment?: Fulfillment): Evidence[] => (fulfillment?.evidence ?? []).filter((item) => item.status === "pending");

/** Two-place THB as satang for exact comparison; null when not a valid amount. */
export function satang(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

export type PriceCheck = "invalid" | "below" | "ok" | "unknown";

/** Offered price against the server's minimum; the browser never computes the minimum itself. */
export function priceCheck(price: string, minimum: string | undefined): PriceCheck {
  const offered = satang(price);
  if (offered === null) return "invalid";
  const floor = minimum === undefined ? null : satang(minimum);
  if (floor === null) return "unknown";
  return offered < floor ? "below" : "ok";
}

/** Largest server rejection count across the customer's decisions. */
export function rejectionCount(decisions: { rejection_count: number }[]): number {
  return decisions.reduce((max, decision) => Math.max(max, Number(decision.rejection_count) || 0), 0);
}
