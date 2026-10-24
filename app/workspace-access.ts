// Navigation map for the designed shell. Mirrors the backend's confirmed role
// permissions (AUTH.md, UC1–UC9.md); the backend still authorizes every call.
export const ROLES = ["Customer", "Worker", "Admin"] as const;
export type Role = (typeof ROLES)[number];
export type ApiRole = "customer" | "worker" | "admin";
export type WorkspaceId = "overview" | "requests" | "quotations" | "deposit-po" | "materials" | "orders" | "receiving" | "production" | "delivery-payment" | "workers" | "inbox" | "memberships";
export type Workspace = { id: Exclude<WorkspaceId, "overview">; useCase: string; description: string };

export const API_ROLES: Record<ApiRole, Role> = { customer: "Customer", worker: "Worker", admin: "Admin" };

const DESCRIPTIONS: Record<Role, Partial<Record<Exclude<WorkspaceId, "overview">, [string, string]>>> = {
  Customer: {
    requests: ["UC1", "Send a manufacturing request and private drawings."],
    quotations: ["UC3", "Accept or reject quotations sent by the shop."],
    "deposit-po": ["UC4", "Submit the deposit receipt or company PO for an accepted quotation."],
    "delivery-payment": ["UC9", "Inspect deliveries, follow invoices and submit payment proof."],
    inbox: ["Inbox", "Notifications about your requests."],
    memberships: ["Account", "Company memberships and private invitations."],
  },
  Worker: {
    quotations: ["UC1 / UC2 / UC4", "Request queue, quotations and Deposit/PO review."],
    materials: ["UC5", "Search stock and plan/reserve materials for queued jobs."],
    receiving: ["UC7", "Receive accepted supplier orders and record damaged goods."],
    production: ["UC8", "Start jobs, record actual material use, time and photos."],
    "delivery-payment": ["UC9", "Issue invoices and record shipments."],
    inbox: ["Inbox", "Notifications for the shop team."],
  },
  Admin: {
    requests: ["UC1–UC4", "Read requests and quotations; review Deposit/PO evidence."],
    workers: ["Admin", "Create and manage Staff accounts and contacts."],
    materials: ["UC5", "Units, materials, audited stock adjustments and job plans (read-only)."],
    orders: ["UC6", "Suppliers and supplier material orders."],
    receiving: ["UC7", "Receiving progress, supplier credit terms and settlement."],
    production: ["UC8", "Monitor production and enter actual labor cost."],
    "delivery-payment": ["UC9", "Invoice terms, deliveries, payment review and cash receipts."],
    inbox: ["Inbox", "Notifications for administrators."],
  },
};

export const ROLE_WORKSPACES: Record<Role, Exclude<WorkspaceId, "overview">[]> = {
  Customer: ["requests", "quotations", "deposit-po", "delivery-payment", "inbox", "memberships"],
  Worker: ["quotations", "materials", "receiving", "production", "delivery-payment", "inbox"],
  Admin: ["requests", "workers", "materials", "orders", "receiving", "production", "delivery-payment", "inbox"],
};

export function getWorkspaces(role: Role): Workspace[] {
  return ROLE_WORKSPACES[role].map((id) => { const [useCase, description] = DESCRIPTIONS[role][id] ?? ["", ""]; return { id, useCase, description }; });
}
export function canAccessWorkspace(role: Role, workspace: WorkspaceId): boolean {
  return workspace === "overview" || ROLE_WORKSPACES[role].includes(workspace);
}
