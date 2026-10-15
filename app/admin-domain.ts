import type { Role } from "./demo-access";

// Local prototype profiles only. Never place passwords or credential hashes here.
export type WorkerProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive";
  passwordChangeSimulatedAt?: string;
};
export type WorkerFields = Pick<WorkerProfile, "name" | "email" | "phone">;

function requireAdmin(role: Role) {
  if (role !== "Admin") throw new Error("Only Admin may manage Workers in this demo.");
}

export function validateWorkerFields(fields: WorkerFields): WorkerFields {
  const name = fields.name.trim();
  const email = fields.email.trim();
  const phone = fields.phone.trim();
  if (!name) throw new Error("Worker name is required.");
  if (!email) throw new Error("Worker email is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid Worker email address.");
  if (!phone) throw new Error("Worker phone is required.");
  // No national phone pattern or contact-uniqueness policy has been confirmed.
  return { name, email, phone };
}

export function addWorker(workers: WorkerProfile[], role: Role, id: string, fields: WorkerFields): WorkerProfile[] {
  requireAdmin(role);
  if (!id || workers.some((worker) => worker.id === id)) throw new Error("Worker ID must be present and unique.");
  const profile = validateWorkerFields(fields);
  return [...workers, { id, ...profile, status: "active" }];
}

export function editWorker(workers: WorkerProfile[], role: Role, id: string, fields: WorkerFields): WorkerProfile[] {
  requireAdmin(role);
  if (!workers.some((worker) => worker.id === id)) throw new Error("Worker not found.");
  const profile = validateWorkerFields(fields);
  return workers.map((worker) => worker.id === id ? { ...worker, ...profile } : worker);
}

export function setWorkerStatus(workers: WorkerProfile[], role: Role, id: string, status: WorkerProfile["status"]): WorkerProfile[] {
  requireAdmin(role);
  if (status !== "active" && status !== "inactive") throw new Error("Invalid Worker status.");
  if (!workers.some((worker) => worker.id === id)) throw new Error("Worker not found.");
  return workers.map((worker) => worker.id === id ? { ...worker, status } : worker);
}

export function passwordInputError(password: string, confirmation: string): string | undefined {
  if (!password.trim()) return "Enter a new demo password.";
  if (!confirmation) return "Confirm the new demo password.";
  if (password !== confirmation) return "The passwords do not match.";
  // This is form validation only, not a production password-strength policy.
  return undefined;
}

export function simulatePasswordChange(workers: WorkerProfile[], role: Role, id: string, at: string): WorkerProfile[] {
  requireAdmin(role);
  if (!workers.some((worker) => worker.id === id)) throw new Error("Worker not found.");
  if (!Number.isFinite(Date.parse(at))) throw new Error("Invalid password-change demo timestamp.");
  return workers.map((worker) => worker.id === id ? { ...worker, passwordChangeSimulatedAt: at } : worker);
}
