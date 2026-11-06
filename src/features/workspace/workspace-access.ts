// Navigation map for the designed shell. Mirrors the backend's confirmed role
// permissions (AUTH.md, UC1–UC9.md); the backend still authorizes every call.
export const ROLES = ["Customer", "Worker", "Admin"] as const;
export type Role = (typeof ROLES)[number];
export type ApiRole = "customer" | "worker" | "admin";
export type WorkspaceId = "overview" | "requests" | "quotations" | "deposit-po" | "materials" | "orders" | "receiving" | "production" | "delivery-payment" | "workers" | "sql" | "inbox" | "memberships" | "settings";
export type Workspace = { id: Exclude<WorkspaceId, "overview">; useCase: string; description: string };

export const API_ROLES: Record<ApiRole, Role> = { customer: "Customer", worker: "Worker", admin: "Admin" };

const DESCRIPTIONS: Record<Role, Partial<Record<Exclude<WorkspaceId, "overview">, [string, string]>>> = {
  Customer: {}, // Customer's Thai menu lives in customer/customer-navigation.ts.
  Worker: {
    quotations: ["UC1–UC4", "ประเมินราคา ส่งใบเสนอราคา และตรวจหลักฐานมัดจำ/PO"],
    materials: ["UC5", "ดูยอดวัตถุดิบที่พร้อมใช้ ที่จองไว้ และประวัติการเคลื่อนไหว"],
    orders: ["UC6", "ผู้ขาย สรุปวัตถุดิบที่ต้องสั่งซื้อ และใบสั่งซื้อวัตถุดิบ"],
    receiving: ["UC7", "รับของตามใบสั่งซื้อที่ผู้ขายรับแล้ว และบันทึกของเสียหาย"],
    production: ["UC8", "เริ่มงาน บันทึกวัตถุดิบที่ใช้ เวลาทำงาน และรูปงาน"],
    "delivery-payment": ["UC9", "ออกใบแจ้งหนี้และบันทึกการส่งมอบ"],
    inbox: ["แจ้งเตือน", "การแจ้งเตือนของทีมร้าน"],
    settings: ["บัญชี", "บัญชีของฉัน การแสดงผล และความปลอดภัย"],
  },
  Admin: {
    requests: ["UC1–UC4", "ดูคำขอและใบเสนอราคา และตรวจหลักฐานมัดจำ/PO"],
    workers: ["ผู้ดูแลระบบ", "สร้างและจัดการบัญชีพนักงานและช่องทางติดต่อ"],
    sql: ["SQL Console", "Super Admin เท่านั้น: รัน SQL ดูโครงสร้างตาราง และจัดการ schema บนฐานข้อมูลจริง"],
    materials: ["UC5", "ยอดวัตถุดิบ ปรับสต๊อก และข้อมูลหลัก (หน่วย/วัตถุดิบ)"],
    orders: ["UC6", "ผู้ขายและใบสั่งซื้อวัตถุดิบ"],
    receiving: ["UC7", "ติดตามการรับของ เครดิตผู้ขาย และการจ่ายเงินผู้ขาย"],
    production: ["UC8", "ติดตามงานผลิตและบันทึกต้นทุนค่าแรงจริง"],
    "delivery-payment": ["UC9", "ตั้งเครดิต ออกใบแจ้งหนี้ ส่งมอบ ตรวจการชำระ และรับเงินสด"],
    inbox: ["แจ้งเตือน", "การแจ้งเตือนของผู้ดูแลระบบ"],
    settings: ["บัญชี", "บัญชีของฉัน การแสดงผล ความปลอดภัย และการเข้าถึงของแต่ละบทบาท"],
  },
};

export const ROLE_WORKSPACES: Record<Role, Exclude<WorkspaceId, "overview">[]> = {
  Customer: ["requests", "quotations", "deposit-po", "delivery-payment", "inbox", "memberships"],
  Worker: ["quotations", "materials", "orders", "receiving", "production", "delivery-payment", "inbox", "settings"],
  Admin: ["requests", "workers", "sql", "materials", "orders", "receiving", "production", "delivery-payment", "inbox", "settings"],
};

// Sidebar groups by workflow stage. Inbox stays routable but lives behind the
// navbar bell; Admin-only items sit in their own separated section.
export type NavGroup = { label: string; items: Exclude<WorkspaceId, "overview">[]; admin?: boolean };
export const NAV_GROUPS: Record<"Worker" | "Admin", NavGroup[]> = {
  Worker: [
    { label: "งานขาย", items: ["quotations"] },
    { label: "การผลิต", items: ["production", "materials"] },
    { label: "จัดซื้อ", items: ["orders", "receiving"] },
    { label: "ส่งมอบและการเงิน", items: ["delivery-payment"] },
    { label: "บัญชี", items: ["settings"] },
  ],
  Admin: [
    { label: "งานขาย", items: ["requests"] },
    { label: "การผลิต", items: ["production", "materials"] },
    { label: "จัดซื้อ", items: ["orders", "receiving"] },
    { label: "ส่งมอบและการเงิน", items: ["delivery-payment"] },
    { label: "ผู้ดูแลระบบ", items: ["workers", "sql"], admin: true },
    { label: "บัญชี", items: ["settings"] },
  ],
};

// Super Admin only; the API enforces it too. Hidden from plain Admins.
export const SUPER_ADMIN_ONLY: WorkspaceId[] = ["sql"];

export function getWorkspaces(role: Role): Workspace[] {
  return ROLE_WORKSPACES[role].map((id) => { const [useCase, description] = DESCRIPTIONS[role][id] ?? ["", ""]; return { id, useCase, description }; });
}
export function canAccessWorkspace(role: Role, workspace: WorkspaceId): boolean {
  return workspace === "overview" || ROLE_WORKSPACES[role].includes(workspace);
}
