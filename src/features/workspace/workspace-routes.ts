import { canAccessWorkspace, type Role, type WorkspaceId } from "./workspace-access.ts";

export const ROLE_ROOTS: Record<Role, string> = { Customer: "/customer", Worker: "/staff", Admin: "/admin" };
export const PAGE_LABELS: Record<WorkspaceId, string> = {
  overview: "ภาพรวม", requests: "คำขอและใบเสนอราคา", quotations: "คำขอและใบเสนอราคา",
  "deposit-po": "เงินมัดจำและ PO", materials: "สต๊อกวัตถุดิบ", orders: "สั่งซื้อวัตถุดิบ",
  receiving: "รับเข้าวัตถุดิบ", production: "งานผลิต", "delivery-payment": "ส่งมอบและรับชำระ",
  workers: "จัดการพนักงาน", sql: "SQL Console", inbox: "การแจ้งเตือน", memberships: "บัญชีและบริษัท", settings: "ตั้งค่า",
};
export function workspacePath(role: Role, id: WorkspaceId): string {
  if (!canAccessWorkspace(role, id)) return ROLE_ROOTS[role];
  return id === "overview" ? ROLE_ROOTS[role] : `${ROLE_ROOTS[role]}/${id}`;
}
// UC9: Worker and Admin both ship and take payments, so labels no longer differ by role.
export function pageLabel(_role: Role, id: WorkspaceId): string {
  return PAGE_LABELS[id];
}
