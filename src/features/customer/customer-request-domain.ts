import { positiveInt64 } from "../../lib/api/backend-api.ts";
import { bangkokInstant } from "../fulfillment/fulfillment-domain.ts";

export type RequestInput = { customerId: string; description: string; qty: string; material: string; deadline: string };
export function requestPayload(input: RequestInput, now: number) {
  const description = input.description.trim(); const material = input.material.trim();
  if (!description || [...description].length > 10000 || description.includes("\0")) throw new Error("กรอกรายละเอียดงาน 1–10,000 ตัวอักษร โดยไม่มีอักขระ NUL");
  if ([...material].length > 2000 || material.includes("\0")) throw new Error("ข้อกำหนดวัตถุดิบต้องไม่เกิน 2,000 ตัวอักษร");
  let qty: bigint;
  try { qty = positiveInt64(input.qty); } catch { throw new Error("จำนวนต้องเป็นจำนวนเต็มมากกว่าศูนย์ และไม่เกินขอบเขตที่ระบบรองรับ"); }
  let deadline: string | undefined;
  if (input.deadline) {
    try { deadline = bangkokInstant(input.deadline); } catch { throw new Error("เลือกวันและเวลาที่ต้องการรับงานให้ถูกต้องตามเวลาไทย"); }
    if (Date.parse(deadline) <= now) throw new Error("วันที่ต้องการรับงานต้องเป็นวันและเวลาในอนาคต");
  }
  if (!input.customerId) throw new Error("เลือกบัญชีผู้สั่งที่คุณมีสิทธิ์ใช้งาน");
  return { customer_id: input.customerId, description, qty, material_spec: material, ...(deadline ? { deadline } : {}) };
}
export function quotePreview(price: string, customerType: string) {
  const cents = BigInt(price.replace(".", ""));
  const deposit = customerType === "individual" || cents > BigInt(1000000);
  const amount = (cents + BigInt(1)) / BigInt(2);
  return { deposit, po: customerType === "company", minimum: `${amount / BigInt(100)}.${String(amount % BigInt(100)).padStart(2, "0")}` };
}
