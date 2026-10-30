// Staff/Admin notification wording. The backend stores five fixed English
// titles (notification.go); this maps them to Thai for display only and never
// uses the text to choose a route or permission.
const TITLES: [RegExp, string][] = [
  [/^New request/i, "คำขอผลิตใหม่"],
  [/^Delivery ready for inspection/i, "ส่งมอบงานแล้ว รอลูกค้าตรวจรับ"],
  [/^Customer inspection recorded/i, "ลูกค้าบันทึกผลตรวจรับแล้ว"],
  [/^Customer payment awaiting review/i, "มีหลักฐานชำระเงินรอตรวจ"],
  [/^Payment review completed/i, "ตรวจการชำระเงินเสร็จแล้ว"],
];

export function staffNotice(title: string): { text: string; reference?: string } {
  const reference = title.match(/#\s*(\d+)/)?.[1];
  if (/[ก-๙]/.test(title)) return { text: title, reference };
  const known = TITLES.find(([pattern]) => pattern.test(title.trim()));
  return { text: known ? known[1] : "มีความคืบหน้าของคำขอผลิต", reference };
}

// Admin reviews requests on คำขอและใบเสนอราคา (/requests); Staff on /quotations.
export const staffNoticeHref = (admin: boolean, requestId: string) => `${admin ? "/admin/requests" : "/staff/quotations"}?request=${requestId}`;
