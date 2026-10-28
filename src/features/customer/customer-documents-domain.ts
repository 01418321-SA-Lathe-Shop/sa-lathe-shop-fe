import type { Customer, Evidence, Quotation } from "../../lib/api/backend-api.ts";
import type { SalesRecord } from "./customer-sales-data.ts";

export type DocumentView = "quotes" | "tasks" | "po";
export type DocumentRow = SalesRecord & { id: string; quote: Quotation; evidence?: Evidence; customer?: Customer; customerType?: string; date?: string; amount?: string; status: string };
export const DOCUMENT_FILTER_KEYS = ["q", "status", "from", "to", "type", "min", "max", "sort", "page", "view"] as const;
export const SORT_LABELS: Record<string, string> = { newest: "ใหม่สุดก่อน", oldest: "เก่าสุดก่อน", number: "เลขใบเสนอราคา", price_asc: "ราคาน้อยไปมาก", price_desc: "ราคามากไปน้อย" };
export type DocumentFilters = { q: string; status: string; from: string; to: string; type: string; min: string; max: string; sort: string; page: number; history: boolean };
export function documentParams(input: Pick<URLSearchParams, "get">) {
  const params = new URLSearchParams();
  for (const key of DOCUMENT_FILTER_KEYS) { const value = input.get(key); if (value) params.set(key, value); }
  return params;
}
export function documentListHref(section: string, input: Pick<URLSearchParams, "get">) {
  const params = documentParams(input);
  return `/customer/${section}${params.size ? `?${params}` : ""}`;
}
export function documentDetailHref(section: string, input: Pick<URLSearchParams, "get">, row: DocumentRow, print = false) {
  const params = documentParams(input);
  params.set("request", row.request.id); params.set("quotation", row.quote.id);
  if (row.evidence) params.set("evidence", row.evidence.id);
  if (print) params.set("print", "1");
  return `/customer/${section}?${params}`;
}
export function documentFilters(params: Pick<URLSearchParams, "get">): DocumentFilters {
  const read = (key: string) => params.get(key) ?? "";
  const page = read("page");
  return { q: read("q"), status: read("status"), from: read("from"), to: read("to"), type: read("type"), min: read("min"), max: read("max"), sort: Object.hasOwn(SORT_LABELS, read("sort")) ? read("sort") : "newest", page: /^[1-9]\d{0,5}$/.test(page) ? Number(page) - 1 : 0, history: read("view") === "history" };
}
export function documentRows(records: SalesRecord[], customers: Customer[], view: DocumentView): DocumentRow[] {
  const profiles = new Map(customers.map((customer) => [customer.id, customer]));
  return records.flatMap((record) => record.quotations.flatMap((quote): DocumentRow[] => {
    if (!["sent", "approved", "rejected"].includes(quote.status) || (view !== "quotes" && quote.status !== "approved")) return [];
    const customer = profiles.get(record.request.customer_id);
    const customerType = quote.status === "approved" && record.fulfillment ? record.fulfillment.terms.customer_type : customer?.customer_type;
    const row = { ...record, quote, customer, customerType };
    if (view === "po") return (record.fulfillment?.evidence ?? []).filter((item) => item.kind === "po").map((evidence) => ({ ...row, id: evidence.id, evidence, date: evidence.submitted_at, status: evidence.status }));
    return [{ ...row, id: quote.id, date: view === "tasks" ? record.fulfillment?.terms.accepted_at ?? quote.sent_at : quote.sent_at, amount: quote.final_price, status: quote.status }];
  }));
}
function cents(value: string) {
  if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(decimal.padEnd(2, "0"));
}
function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const instant = Date.parse(`${value}T00:00:00+07:00`);
  return Number.isFinite(instant) && new Date(instant + 7 * 3600000).toISOString().slice(0, 10) === value ? instant : null;
}
export function documentFilterError(filters: DocumentFilters, view: DocumentView) {
  if ((filters.from && day(filters.from) === null) || (filters.to && day(filters.to) === null)) return "กรุณาระบุช่วงวันที่ให้ถูกต้อง";
  if (filters.from && filters.to && filters.from > filters.to) return "วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด";
  if (view === "quotes") {
    if ((filters.min && cents(filters.min) === null) || (filters.max && cents(filters.max) === null)) return "ระบุราคาไม่ติดลบ ไม่เกิน 16 หลัก และทศนิยมไม่เกิน 2 ตำแหน่ง";
    if (filters.min && filters.max && cents(filters.min)! > cents(filters.max)!) return "ราคาต่ำสุดต้องไม่เกินราคาสูงสุด";
  }
  return "";
}
export function filterDocuments(rows: DocumentRow[], filters: DocumentFilters, view: DocumentView, ignoreStatus = false) {
  if (documentFilterError(filters, view)) return [];
  const query = filters.q.trim().toLocaleLowerCase("th-TH");
  const filtered = rows.filter((row) => {
    const haystack = `${row.quote.quotation_no} ${row.request.no_request} ${row.request.description} ${row.customer?.name ?? ""}`.toLocaleLowerCase("th-TH");
    const timestamp = row.date ? Date.parse(row.date) : NaN;
    if (query && !haystack.includes(query)) return false;
    if (!ignoreStatus && filters.status && row.status !== filters.status) return false;
    if (view === "quotes" && filters.history && row.status === "sent") return false;
    if (filters.type && row.customerType !== filters.type) return false;
    if (filters.from && (!Number.isFinite(timestamp) || timestamp < day(filters.from)!)) return false;
    if (filters.to && (!Number.isFinite(timestamp) || timestamp >= day(filters.to)! + 86400000)) return false;
    if (view === "quotes" && filters.min && (row.amount === undefined || cents(row.amount) === null || cents(row.amount)! < cents(filters.min)!)) return false;
    if (view === "quotes" && filters.max && (row.amount === undefined || cents(row.amount) === null || cents(row.amount)! > cents(filters.max)!)) return false;
    return true;
  });
  return filtered.sort((a, b) => {
    let result = 0;
    if (filters.sort === "number") result = BigInt(a.quote.quotation_no) < BigInt(b.quote.quotation_no) ? -1 : BigInt(a.quote.quotation_no) > BigInt(b.quote.quotation_no) ? 1 : 0;
    else if (view === "quotes" && filters.sort.startsWith("price_")) { const left = cents(a.amount ?? ""), right = cents(b.amount ?? ""); result = left === null ? right === null ? 0 : 1 : right === null ? -1 : left < right ? -1 : left > right ? 1 : 0; if (left !== null && right !== null && filters.sort === "price_desc") result *= -1; }
    else { const left = a.date ? Date.parse(a.date) : NaN, right = b.date ? Date.parse(b.date) : NaN; result = !Number.isFinite(left) ? !Number.isFinite(right) ? 0 : 1 : !Number.isFinite(right) ? -1 : filters.sort === "oldest" ? left - right : right - left; }
    return result || a.id.localeCompare(b.id);
  });
}
