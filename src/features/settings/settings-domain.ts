import { PAGE_LABELS } from "../workspace/workspace-routes.ts";
import { API_ROLES, ROLE_WORKSPACES, ROLES, type ApiRole } from "../workspace/workspace-access.ts";

export type SettingsTab = "account" | "preferences" | "security" | "system";

// Sections shown per role. The backend still authorizes every command behind them.
export function settingsTabs(role: ApiRole): { id: SettingsTab; label: string }[] {
  const tabs: { id: SettingsTab; label: string }[] = [{ id: "account", label: "บัญชีของฉัน" }, { id: "preferences", label: "การตั้งค่าส่วนตัว" }, { id: "security", label: "ความปลอดภัย" }];
  return API_ROLES[role] === "Admin" ? [...tabs, { id: "system", label: "ระบบ" }] : tabs;
}

/** Which roles can open each workspace, read from the same map the route guard uses. */
export function roleAccessRows() {
  // Every role has settings (Customer's live on its own URL). Pages sharing a label are one row.
  const labels = [...new Set(ROLES.flatMap((role) => ROLE_WORKSPACES[role]).filter((id) => id !== "settings").map((id) => PAGE_LABELS[id]))];
  return labels.map((label) => ({ label, roles: ROLES.map((role) => ROLE_WORKSPACES[role].some((id) => PAGE_LABELS[id] === label)) }));
}
