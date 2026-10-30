// จัดการพนักงาน (Admin) input rules, mirroring backend AUTH.md; the server re-checks.
import type { Worker } from "../../lib/api/types.ts";
import { workerContacts } from "../fulfillment/fulfillment-domain.ts";

export type WorkerDraft = { name: string; username: string; employee_no: string; email: string; phone: string; position: string };
const CODE = /^[A-Za-z0-9_.-]+$/;

// Same rule as the shared English passwordError: 12+ characters, at most 128 UTF-8 bytes, spaces kept.
export function workerPasswordError(password: string, confirmation: string): string {
  if ([...password].length < 12 || new TextEncoder().encode(password).length > 128) return "รหัสผ่านอย่างน้อย 12 ตัวอักษร และไม่เกิน 128 ไบต์ (เว้นวรรคนับด้วย)";
  return password === confirmation ? "" : "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
}

// Field errors keyed by field; empty object means the draft can be sent.
export function workerErrors(draft: WorkerDraft): Partial<Record<keyof WorkerDraft, string>> {
  const errors: Partial<Record<keyof WorkerDraft, string>> = {};
  const name = draft.name.trim(); const username = draft.username.trim(); const employee = draft.employee_no.trim();
  if (!name || [...name].length > 200) errors.name = "กรอกชื่อ ไม่เกิน 200 ตัวอักษร";
  if (username.length < 3 || username.length > 64 || !CODE.test(username)) errors.username = "3–64 ตัวอักษร ใช้ได้เฉพาะ A–Z, 0–9, _ . -";
  if (!employee || employee.length > 30 || !CODE.test(employee)) errors.employee_no = "1–30 ตัวอักษร ใช้ได้เฉพาะ A–Z, 0–9, _ . -";
  try { workerContacts(draft.email, "0000000"); } catch { errors.email = "กรอกอีเมล ไม่เกิน 254 ไบต์ ไม่มีการขึ้นบรรทัดใหม่"; }
  try { workerContacts("a@b.c", draft.phone); } catch { errors.phone = "ตัวเลข 7–15 หลัก ขึ้นต้นด้วย + ได้ เว้นวรรค ขีด วงเล็บ หรือจุดได้ ไม่มีเบอร์ต่อ"; }
  if ([...draft.position.trim()].length > 100) errors.position = "ไม่เกิน 100 ตัวอักษร";
  return errors;
}

export function workerPayload(draft: WorkerDraft) {
  return { ...workerContacts(draft.email, draft.phone), name: draft.name.trim(), username: draft.username.trim(), employee_no: draft.employee_no.trim(), position: draft.position.trim() };
}

// The server stores usernames in lowercase, so only a real change logs the person out.
export const usernameChanged = (worker: Pick<Worker, "username">, username: string) => worker.username.toLowerCase() !== username.trim().toLowerCase();
export const draftOf = (worker?: Worker): WorkerDraft => ({ name: worker?.name ?? "", username: worker?.username ?? "", employee_no: worker?.employee_no ?? "", email: worker?.email ?? "", phone: worker?.phone ?? "", position: worker?.position ?? "" });
export const matchWorker = (worker: Worker, q: string) => !q.trim() || [worker.name, worker.username, worker.employee_no, worker.position ?? ""].join(" ").toLowerCase().includes(q.trim().toLowerCase());
