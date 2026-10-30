// Exact display helpers for Staff/Admin pages. Quantities are NUMERIC(18,6)
// strings and money is two-place THB; neither is converted to a float.
const group = (whole: string) => new Intl.NumberFormat("en-US").format(BigInt(whole));

/** "5.000000" → "5", "1234.500000" → "1,234.5"; invalid input shows a dash. */
export function quantityTH(value: string | null | undefined): string {
  if (!value || !/^\d{1,12}\.\d{6}$/.test(value)) return "—";
  const [whole, fraction] = value.split(".");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${group(whole)}.${trimmed}` : group(whole);
}

/** Two-place THB with a baht suffix; no VAT is ever added. */
export function bahtTH(value: string | null | undefined): string {
  if (!value || !/^\d+\.\d{2}$/.test(value)) return "—";
  const [whole, cents] = value.split(".");
  return `${group(whole)}.${cents} บาท`;
}

export function minutesTH(total: number): string {
  const hours = Math.floor(total / 60); const minutes = total % 60;
  if (!hours) return `${minutes} นาที`;
  return minutes ? `${hours} ชม. ${minutes} นาที` : `${hours} ชม.`;
}

export function dateTimeTH(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function dateTH(value: string | null | undefined): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

const bangkokDay = (instant: number) => Math.floor((instant + 7 * 3600000) / 86400000);

/** Bangkok calendar days from now until a date (negative when past), or null when unknown. */
function bangkokDaysUntil(value: string | null | undefined, now: number | null): number | null {
  if (!value || now === null || !Number.isFinite(Date.parse(value))) return null;
  return bangkokDay(Date.parse(value)) - bangkokDay(now);
}

export type Countdown = { text: string; tone: "danger" | "today" | "quiet" };

/** Day distance worded for a customer-requested date (not a promise by the shop). */
export function requestedDayCountdown(value: string | null | undefined, now: number | null): Countdown | null {
  const days = bangkokDaysUntil(value, now);
  if (days === null) return null;
  if (days < 0) return { text: `เลยวันที่ลูกค้าต้องการ ${-days} วัน`, tone: "danger" };
  if (days === 0) return { text: "ลูกค้าต้องการวันนี้", tone: "today" };
  return { text: `อีก ${days} วัน`, tone: "quiet" };
}

/** Day distance worded for a server-set due date such as the Deposit/PO deadline. */
export function dueDayCountdown(value: string | null | undefined, now: number | null): Countdown | null {
  const days = bangkokDaysUntil(value, now);
  if (days === null) return null;
  if (days < 0) return { text: `เลยกำหนด ${-days} วัน`, tone: "danger" };
  if (days === 0) return { text: "ครบกำหนดวันนี้", tone: "today" };
  return { text: `อีก ${days} วัน`, tone: days <= 3 ? "today" : "quiet" };
}
