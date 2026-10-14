import { isRole, type Role } from "./demo-access";

// Prototype role selection only. This is never an authentication credential.
const STORAGE_KEY = "sa-lathe-demo-role";
const CHANGE_EVENT = "sa-lathe-demo-session-change";
let memoryRole: Role | null = null;

export function getDemoRole(): Role | null {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return isRole(stored) ? stored : null;
  } catch { return memoryRole; }
}
export function setDemoRole(role: Role | null): void {
  memoryRole = role;
  try {
    if (role) window.sessionStorage.setItem(STORAGE_KEY, role);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* Use an in-memory demo session when browser storage is blocked. */ }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function subscribeToDemoRole(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
export function getServerDemoRole(): null { return null; }
