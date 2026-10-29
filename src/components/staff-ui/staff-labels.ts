// One Thai wording and colour role per status value for Staff/Admin pages.
// Tones: waiting (grey), progress (blue), action (orange: someone here must act),
// done (green), problem (red). Each page domain adds its map in its own step.
export type Tone = "waiting" | "progress" | "action" | "done" | "problem";
export type StatusMap = Record<string, readonly [label: string, tone: Tone]>;

export const JOB_STATUS: StatusMap = {
  queued: ["รอเริ่มงาน", "action"],
  in_progress: ["กำลังผลิต", "progress"],
  completed: ["ผลิตเสร็จ", "done"],
  cancelled: ["ยกเลิก", "problem"],
};

export const REQUEST_STATUS: StatusMap = {
  pending: ["รอประเมิน", "waiting"],
  ongoing: ["กำลังดำเนินการ", "progress"],
  completed: ["เสร็จสิ้น", "done"],
  canceled: ["ยกเลิก", "problem"],
};

export const QUOTE_STATUS: StatusMap = {
  draft: ["ร่าง", "waiting"],
  sent: ["ส่งแล้ว รอลูกค้าตอบ", "progress"],
  approved: ["ลูกค้าตอบรับ", "done"],
  rejected: ["ลูกค้าปฏิเสธ", "problem"],
};

export const EVIDENCE_STATUS: StatusMap = {
  pending: ["รอตรวจ", "action"],
  approved: ["อนุมัติแล้ว", "done"],
  rejected: ["ไม่อนุมัติ", "problem"],
};

export const MOVEMENT_MODE: StatusMap = {
  addition: ["เพิ่มสต๊อก", "done"],
  correction: ["แก้ยอดตามที่นับ", "progress"],
  purchase_receive: ["รับจากผู้ขาย", "done"],
  job_issue: ["เบิกใช้ในงาน", "waiting"],
};

// Keyed by the สั่งซื้อวัตถุดิบ tab (status + supplier response), see procurement-domain.
export const ORDER_STATE: StatusMap = {
  pending: ["รอผู้ขายตอบ", "action"],
  accepted: ["ผู้ขายรับแล้ว", "progress"],
  partial: ["รับบางส่วน", "progress"],
  received: ["รับครบ", "done"],
  cancelled: ["ยกเลิก", "problem"],
};

export const ORDER_EVENT: StatusMap = {
  place: ["สั่งซื้อ", "waiting"],
  accept: ["ผู้ขายรับใบสั่งซื้อ", "progress"],
  reject: ["ผู้ขายปฏิเสธ", "problem"],
  cancel: ["ยกเลิกใบสั่งซื้อ", "problem"],
  receive: ["รับของเข้า", "done"],
  claim: ["จัดการของเสียหาย", "action"],
  credit_terms: ["ตั้งเครดิตผู้ขาย", "waiting"],
  settle: ["ชำระเงินผู้ขาย", "done"],
};

export function statusOf(map: StatusMap, value: string): { label: string; tone: Tone } {
  const known = Object.hasOwn(map, value) ? map[value] : undefined;
  return known ? { label: known[0], tone: known[1] } : { label: "สถานะยังไม่ระบุ", tone: "waiting" };
}
