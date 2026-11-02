import { shop } from "../landing/landing-content.ts";

// Landing copy marks unconfirmed shop facts as "[...]". Documents print a blank
// fill-in line instead of the placeholder and never guess a value.
export function confirmed(value: string | undefined | null): string | undefined {
  const text = value?.trim();
  return text && !/^\[.*\]$/.test(text) ? text : undefined;
}

export const SHOP = { name: confirmed(shop.name), address: confirmed(shop.address), phone: confirmed(shop.phone.label), email: confirmed(shop.email.label) };

/** Existing convention for job references: first eight UUID characters, uppercase. */
export const jobRef = (id: string) => id.slice(0, 8).toUpperCase();

// job.due_at is copied from the customer's requested date, so no confirmed delivery date exists.
export type ContractFacts = { customerName?: string; creditDays?: number };

/** Information a complete contract needs that this system does not hold (or has not loaded). */
export function missingContractInfo(facts: ContractFacts): string[] {
  return [
    !SHOP.address && "ที่อยู่ร้าน",
    !SHOP.phone && "โทรศัพท์ร้าน",
    "เลขประจำตัวผู้เสียภาษีของร้าน",
    !facts.customerName && "ชื่อผู้ว่าจ้าง",
    "ที่อยู่และช่องทางติดต่อผู้ว่าจ้าง",
    "เลขประจำตัวผู้เสียภาษี/บัตรประชาชนผู้ว่าจ้าง",
    "กำหนดส่งมอบที่ร้านยืนยัน",
    "สถานที่ส่งมอบ",
    facts.creditDays === undefined && "ระยะเวลาเครดิตของใบแจ้งหนี้",
  ].filter((item): item is string => Boolean(item));
}

/** Formal Thai date for printed documents: "3 พฤศจิกายน 2569" in Asia/Bangkok. */
export function longDateTH(value: string | null | undefined): string | undefined {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" }).format(new Date(value));
}
