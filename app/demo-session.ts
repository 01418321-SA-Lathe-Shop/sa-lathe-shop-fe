import { isRole, type Role } from "./demo-access";

// Prototype role selection only. This is never an authentication credential.
const STORAGE_KEY = "sa-lathe-demo-role";
const CHANGE_EVENT = "sa-lathe-demo-session-change";
let memoryRole: Role | null = null;
let memoryOnly = false;

export function getDemoRole(): Role | null {
  if (memoryOnly) return memoryRole;
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    memoryRole = isRole(stored) ? stored : null;
    return memoryRole;
  } catch { memoryOnly = true; return memoryRole; }
}
export function setDemoRole(role: Role | null): void {
  memoryRole = role;
  if (!memoryOnly) try {
    if (role) window.sessionStorage.setItem(STORAGE_KEY, role);
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch { memoryOnly = true; /* A readable stale value must not override a failed write/sign-out. */ }
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
