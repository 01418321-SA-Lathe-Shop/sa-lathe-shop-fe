import type { BackendApi, JobRequest, Notification, Page, Quotation } from "../../lib/api/backend-api.ts";

export const REQUEST_LABELS: Record<string, string> = { pending: "รอประเมิน", ongoing: "อยู่ระหว่างดำเนินการ", completed: "เสร็จสิ้น", canceled: "ยกเลิก" };
export const JOB_LABELS: Record<string, string> = { queued: "รอเริ่มงาน", in_progress: "กำลังผลิต", completed: "ผลิตเสร็จ", cancelled: "ยกเลิก" };
export const QUOTE_LABELS: Record<string, string> = { sent: "รอพิจารณา", approved: "ตอบรับแล้ว", rejected: "ปฏิเสธแล้ว", requote: "รอราคาใหม่" };
export const EVIDENCE_LABELS: Record<string, string> = { pending: "รอตรวจสอบ", approved: "อนุมัติแล้ว", rejected: "ต้องแก้ไข" };
export const INVOICE_LABELS: Record<string, string> = { unpaid: "ยังไม่ชำระ", partial: "ชำระบางส่วน", paid: "ชำระครบ" };
export const DELIVERY_LABELS: Record<string, string> = { shipping: "จัดส่งแล้ว–รอตรวจรับ", delivered: "รับงานแล้ว", returned: "ส่งคืนเพื่อแก้ไข" };
export type Collection<T> = { items: T[]; complete: boolean };

// Read existing paginated contracts, never invent search/count/bulk endpoints.
// A bounded collection is explicitly marked partial, including exact multiples.
export async function readCollection<T>(api: Pick<BackendApi, "call">, path: string, signal: AbortSignal, pages = 10): Promise<Collection<T>> {
  const items: T[] = [];
  for (let page = 0; page < pages; page++) {
    const result = await api.call<Page<T>>(`${path}${path.includes("?") ? "&" : "?"}limit=100&offset=${page * 100}`, "GET", undefined, signal);
    const batch = result.items ?? [];
    items.push(...batch);
    if (batch.length < 100) return { items, complete: true };
  }
  return { items, complete: false };
}

export function customerHref(section: string, values: Record<string, string | undefined> = {}) {
  const query = new URLSearchParams(Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])));
  return `/customer${section ? `/${section}` : ""}${query.size ? `?${query}` : ""}`;
}
export function latestQuote(quotes: Quotation[]) {
  return [...quotes].sort((a, b) => BigInt(a.version) > BigInt(b.version) ? -1 : BigInt(a.version) < BigInt(b.version) ? 1 : a.id.localeCompare(b.id))[0];
}
export function matchingRequests(items: JobRequest[], query: string, status: string) {
  const term = query.trim().toLocaleLowerCase("th-TH");
  return items.filter((item) => (!status || item.status === status) && (!term || `${item.no_request} ${item.description}`.toLocaleLowerCase("th-TH").includes(term)))
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || a.id.localeCompare(b.id));
}
export function moneyTH(value: string) {
  if (!/^\d+\.\d{2}$/.test(value)) return "ไม่พบยอดเงิน";
  const [whole, cents] = value.split(".");
  return `${new Intl.NumberFormat("th-TH").format(BigInt(whole))}.${cents} บาท`;
}
export function dateTH(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return "ยังไม่ระบุ";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
export function relativeTH(value: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - Date.parse(value)) / 1000));
  if (seconds < 60) return "เมื่อสักครู่";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} นาทีที่แล้ว`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ชั่วโมงที่แล้ว`;
  return dateTH(value);
}
export function isBangkokToday(value: string, now: number) {
  const format = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" });
  return format.format(new Date(value)) === format.format(new Date(now));
}
export function unreadCount(items: Notification[], complete: boolean) {
  const count = items.filter((item) => !item.read_at).length;
  if (!complete) return count > 99 ? "99+" : "•";
  return count > 99 ? "99+" : count ? String(count) : "";
}
export function thaiNotice(value: string) {
  if (/[ก-๙]/.test(value)) return value;
  if (/Delivery ready|shipped/i.test(value)) return "มีงานส่งมอบให้คุณตรวจรับ";
  if (/review completed|Evidence approved/i.test(value)) return "มีผลตรวจหลักฐานให้คุณตรวจสอบ";
  if (/New request/i.test(value)) return "ส่งคำขอผลิตแล้ว";
  // Legacy English titles have no structured event discriminator. Do not guess
  // approval, amounts, urgency or use text parsing to choose a privileged route.
  return "มีความคืบหน้าของคำขอผลิต";
}
