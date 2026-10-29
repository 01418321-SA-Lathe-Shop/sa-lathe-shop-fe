import { canAccessWorkspace, type Role, type WorkspaceId } from "./workspace-access";

export const ROLE_ROOTS: Record<Role, string> = { Customer: "/customer", Worker: "/staff", Admin: "/admin" };
export const PAGE_LABELS: Record<WorkspaceId, string> = {
  overview: "ภาพรวม", requests: "คำขอและใบเสนอราคา", quotations: "คำขอและใบเสนอราคา",
  "deposit-po": "เงินมัดจำและ PO", materials: "สต๊อกวัตถุดิบ", orders: "สั่งซื้อวัตถุดิบ",
  receiving: "รับเข้าวัตถุดิบ", production: "งานผลิต", "delivery-payment": "ส่งมอบและรับชำระ",
  workers: "จัดการพนักงาน", inbox: "การแจ้งเตือน", memberships: "บัญชีและบริษัท",
};
export function workspacePath(role: Role, id: WorkspaceId): string {
  if (!canAccessWorkspace(role, id)) return ROLE_ROOTS[role];
  return id === "overview" ? ROLE_ROOTS[role] : `${ROLE_ROOTS[role]}/${id}`;
}
// Staff issue invoices and ship but do not receive payments (UC9).
export function pageLabel(role: Role, id: WorkspaceId): string {
  return role === "Worker" && id === "delivery-payment" ? "ส่งมอบและใบแจ้งหนี้" : PAGE_LABELS[id];
}
