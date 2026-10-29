// UC8 production commands (backend UC8.md). Usage is incremental actual use,
// never a cumulative total; minutes are explicit whole labor minutes.
import { inventoryDecimal } from "../inventory/inventory-domain.ts";
import { moneyInput } from "../../lib/api/backend-api.ts";

export type ProductionMaterial = { material_id: string; name: string; unit_name: string; required: string; reserved: string; reservation_consumed: string; used: string; released: string };
export type ProductionUsage = { id: string; material_id: string; material_name: string; unit_name: string; quantity: string; reservation_used: string; actor_id: string; created_at: string; unit_cost?: string; total_amount?: string };
export type TimeEntry = { id: string; actor_id: string; minutes: number; note: string; created_at: string };
export type ProductionEvent = { id: string; actor_id: string; action: string; version: number | string; created_at: string };
export type JobPhoto = { id: string; job_id: string; uploaded_by: string; file_name: string; content_type: string; byte_size: number; state: string };
export type ProductionState = { job_id: string; request_id: string; status: string; version: number | string; material_plan_version: number | string; cycle: number | string; started_at?: string; completed_at?: string; materials: ProductionMaterial[] | null; usage: ProductionUsage[] | null; time_entries: TimeEntry[] | null; labor_minutes: number; events: ProductionEvent[] | null; photos: JobPhoto[] | null; finance?: { material_cost: string; labor_cost: string | null; total_cost: string | null } };
export type UsageDraft = { material_id: string; label: string; quantity: string };

type Command = { idempotency_key: string; expected_version: number | string };

export function usagePayload(command: Command, note: string, rows: UsageDraft[]) {
  const trimmed = note.trim();
  if ([...trimmed].length > 2000 || trimmed.includes("\0")) throw new Error("Note must be at most 2,000 characters.");
  const lines = rows.filter((row) => row.quantity.trim() !== "").map((row) => ({ material_id: row.material_id, quantity: inventoryDecimal(row.quantity.trim(), true) }));
  if (!lines.length) throw new Error("Enter the quantity actually used for at least one material.");
  if (lines.length > 100 || new Set(lines.map((line) => line.material_id)).size !== lines.length) throw new Error("Use at most 100 distinct materials per entry.");
  return { ...command, lines, note: trimmed };
}

export function timePayload(command: Command, minutes: string, note: string) {
  if (!/^\d{1,7}$/.test(minutes.trim()) || Number(minutes) < 1 || Number(minutes) > 1000000) throw new Error("Minutes must be a whole number from 1 to 1,000,000.");
  const trimmed = note.trim();
  if ([...trimmed].length > 2000 || trimmed.includes("\0")) throw new Error("Note must be at most 2,000 characters.");
  return { ...command, minutes: Number(minutes), note: trimmed };
}

export function laborPayload(command: Command, amount: string) { return { ...command, amount: moneyInput(amount.trim()) }; }
