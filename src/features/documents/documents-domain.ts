import { shop } from "../landing/landing-content.ts";

// Landing copy marks unconfirmed shop facts as "[...]". Documents print a blank
// fill-in line instead of the placeholder and never guess a value.
export function confirmed(value: string | undefined | null): string | undefined {
  const text = value?.trim();
  return text && !/^\[.*\]$/.test(text) ? text : undefined;
}

const LANDING = { name: confirmed(shop.name), address: confirmed(shop.address), phone: confirmed(shop.phone.label), email: confirmed(shop.email.label) };

/** One side of a document. Undefined fields print as fill-in lines. */
export type Party = { name?: string; address?: string; taxId?: string; phone?: string; email?: string };
type ShopFields = { name: string; address: string; tax_id: string; phone: string; email: string; bank_name: string; bank_account_name: string; bank_account_no: string };
export type ShopParty = Party & { bankName?: string; bankAccountName?: string; bankAccountNo?: string };

/** Admin's saved shop profile; confirmed landing facts fill only fields the Admin left empty. */
export function shopParty(profile?: ShopFields): ShopParty {
  return {
    name: confirmed(profile?.name) ?? LANDING.name, address: confirmed(profile?.address) ?? LANDING.address,
    phone: confirmed(profile?.phone) ?? LANDING.phone, email: confirmed(profile?.email) ?? LANDING.email, taxId: confirmed(profile?.tax_id),
    bankName: confirmed(profile?.bank_name), bankAccountName: confirmed(profile?.bank_account_name), bankAccountNo: confirmed(profile?.bank_account_no),
  };
}
export function customerParty(billing?: { name: string; address: string; tax_id: string; phone: string; email: string }): Party {
  return { name: confirmed(billing?.name), address: confirmed(billing?.address), taxId: confirmed(billing?.tax_id), phone: confirmed(billing?.phone), email: confirmed(billing?.email) };
}

/** Existing convention for job references: first eight UUID characters, uppercase. */
export const jobRef = (id: string) => id.slice(0, 8).toUpperCase();

// job.due_at is copied from the customer's requested date, so no confirmed delivery date exists.
export type ContractFacts = { shop: Party; customer: Party; creditDays?: number };

/** Information a complete contract needs that this system does not hold (or has not loaded). */
export function missingContractInfo({ shop, customer, creditDays }: ContractFacts): string[] {
  return [
    !shop.address && "ที่อยู่ร้าน",
    !shop.phone && "โทรศัพท์ร้าน",
    !shop.taxId && "เลขประจำตัวผู้เสียภาษีของร้าน",
    !customer.name && "ชื่อผู้ว่าจ้าง",
    !customer.address && "ที่อยู่ผู้ว่าจ้าง",
    !customer.phone && "โทรศัพท์ผู้ว่าจ้าง",
    !customer.taxId && "เลขประจำตัวผู้เสียภาษี/บัตรประชาชนผู้ว่าจ้าง",
    "กำหนดส่งมอบที่ร้านยืนยัน",
    "สถานที่ส่งมอบ",
    creditDays === undefined && "ระยะเวลาเครดิตของใบแจ้งหนี้",
  ].filter((item): item is string => Boolean(item));
}

/** Formal Thai date for printed documents: "3 พฤศจิกายน 2569" in Asia/Bangkok. */
export function longDateTH(value: string | null | undefined): string | undefined {
  if (!value || !Number.isFinite(Date.parse(value))) return undefined;
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", dateStyle: "long" }).format(new Date(value));
}

const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const PLACES = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];
// Thai number words for a digit string, repeating "ล้าน" every six digits.
// เอ็ด follows Excel BAHTTEXT: a final 1 after any higher digit (11, 101, 1,000,001).
function thaiWords(digits: string): string {
  const value = digits.replace(/^0+/, "");
  if (!value) return DIGITS[0];
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const digit = Number(value[i]); const fromRight = value.length - 1 - i; const place = fromRight % 6;
    if (digit) {
      if (place === 1) out += digit === 1 ? "สิบ" : digit === 2 ? "ยี่สิบ" : `${DIGITS[digit]}สิบ`;
      else if (place === 0 && digit === 1 && i > 0) out += "เอ็ด";
      else out += DIGITS[digit] + PLACES[place];
    }
    if (place === 0 && fromRight > 0) out += "ล้าน";
  }
  return out;
}

/** "535.00" → "ห้าร้อยสามสิบห้าบาทถ้วน". Takes the exact two-decimal money string; undefined if malformed. */
export function bahtText(amount: string | null | undefined): string | undefined {
  const match = /^(\d+)\.(\d{2})$/.exec(amount ?? "");
  if (!match) return undefined;
  const [, whole, satang] = match; const hasBaht = /[1-9]/.test(whole);
  if (satang === "00") return `${thaiWords(whole)}บาทถ้วน`;
  return `${hasBaht ? `${thaiWords(whole)}บาท` : ""}${thaiWords(satang)}สตางค์`;
}
