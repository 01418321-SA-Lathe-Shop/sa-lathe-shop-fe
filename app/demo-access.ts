export const ROLES = ["Customer", "Worker", "Admin"] as const;
export type Role = (typeof ROLES)[number];
export type WorkspaceId = "overview" | "requests" | "quotations" | "deposit-po" | "materials" | "orders" | "receiving" | "production" | "delivery-payment" | "workers";
export type Workspace = { id: WorkspaceId; label: string; description: string; useCase: string; emptyTitle: string; emptyDescription: string };

const WORKSPACES: Record<Exclude<WorkspaceId, "overview">, Workspace> = {
  requests: { id: "requests", label: "Requests", description: "Your custom manufacturing requests, in one place.", useCase: "UC1", emptyTitle: "Your next project starts here", emptyDescription: "Your manufacturing requests will appear here. Request submission is planned for the next phase." },
  quotations: { id: "quotations", label: "Quotations", description: "Keep track of estimates and quotation revisions.", useCase: "UC2 / UC3", emptyTitle: "No quotations yet", emptyDescription: "Quotations will appear here when there are requests to estimate. Quotation actions are planned for a later phase." },
  "deposit-po": { id: "deposit-po", label: "Deposit & PO", description: "Keep the documents that confirm your order together.", useCase: "UC4", emptyTitle: "Nothing to confirm yet", emptyDescription: "Accepted quotations will appear here with their Deposit and PO requirements. Evidence submission is planned for a later phase." },
  materials: { id: "materials", label: "Materials", description: "Check availability and plan materials for each job.", useCase: "UC5", emptyTitle: "No material requirements yet", emptyDescription: "Job material plans and stock availability will appear here. Reservations and stock checks are planned for a later phase." },
  orders: { id: "orders", label: "Material orders", description: "Keep Supplier orders organized from order to receipt.", useCase: "UC6", emptyTitle: "No material orders yet", emptyDescription: "Orders to Suppliers will appear here. Material ordering is planned for a later phase." },
  receiving: { id: "receiving", label: "Receiving", description: "Keep track of materials arriving from Suppliers.", useCase: "UC7", emptyTitle: "No deliveries to receive", emptyDescription: "Incoming material orders will appear here. Recording good or defective goods and Supplier payments is planned for a later phase." },
  production: { id: "production", label: "Production", description: "Follow jobs through production and record actual usage.", useCase: "UC8", emptyTitle: "The workshop is ready", emptyDescription: "Confirmed production jobs will appear here. Production and material-usage actions are planned for a later phase." },
  "delivery-payment": { id: "delivery-payment", label: "Delivery & payments", description: "Keep delivery and invoice progress together.", useCase: "UC9", emptyTitle: "No deliveries or invoices yet", emptyDescription: "Completed production jobs and invoices will appear here. Delivery and installment payment actions are planned for a later phase." },
  workers: { id: "workers", label: "Staff", description: "Your workshop team, organized in one workspace.", useCase: "Admin management", emptyTitle: "Your team will appear here", emptyDescription: "Add a demo Staff member with a name, email, and phone to get started." },
};

export const ROLE_WORKSPACES: Record<Role, readonly Exclude<WorkspaceId, "overview">[]> = {
  Customer: ["requests", "quotations", "deposit-po", "delivery-payment"],
  Worker: ["quotations", "materials", "orders", "receiving", "production", "delivery-payment"],
  Admin: ["workers", "orders"],
};
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Customer: "Request work, review quotations, and follow delivery and payments.",
  Worker: "Estimate work, manage materials, and follow production through delivery.",
  Admin: "Manage your workshop team and material orders.",
};
export function isRole(value: unknown): value is Role { return ROLES.some((role) => role === value); }
export function getWorkspaces(role: Role): Workspace[] {
  return ROLE_WORKSPACES[role].map((id) => {
    const workspace = WORKSPACES[id];
    return id === "quotations" ? { ...workspace, useCase: role === "Customer" ? "UC3" : "UC2" } : workspace;
  });
}
export function canAccessWorkspace(role: Role, workspace: WorkspaceId): boolean {
  return workspace === "overview" || ROLE_WORKSPACES[role].some((id) => id === workspace);
}
