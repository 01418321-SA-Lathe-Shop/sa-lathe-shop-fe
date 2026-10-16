import { canAccessWorkspace, type Role, type WorkspaceId } from "./demo-access";

// Worker remains the domain/API role; Staff is its product-facing name.
export const ROLE_LABELS: Record<Role, string> = { Customer: "Customer", Worker: "Staff", Admin: "Admin" };
export const ROLE_ROOTS: Record<Role, string> = { Customer: "/customer", Worker: "/staff", Admin: "/admin" };
export const PAGE_LABELS: Record<WorkspaceId, string> = {
  overview: "ภาพรวม", requests: "คำขอผลิต", quotations: "ใบเสนอราคา",
  "deposit-po": "เงินมัดจำและ PO", materials: "สต๊อกวัตถุดิบ", orders: "สั่งซื้อวัตถุดิบ",
  receiving: "รับเข้าวัตถุดิบ", production: "งานผลิต", "delivery-payment": "ส่งมอบและรับชำระ",
  workers: "จัดการพนักงาน",
};
export function workspacePath(role: Role, id: WorkspaceId): string {
  if (!canAccessWorkspace(role, id)) return ROLE_ROOTS[role];
  return id === "overview" ? ROLE_ROOTS[role] : `${ROLE_ROOTS[role]}/${id}`;
}
