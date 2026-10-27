// UC5 quantities/unit costs are NUMERIC(18,6), not two-place quotation money.
export type InventoryMaterial = { id: string; name: string; unit_id: string; unit_name: string; is_active: boolean; version: number | string; qty_on_hand: string; qty_reserved: string; qty_available: string; avg_cost?: string };
export type InventoryPlan = { job_id: string; version: number | string; ready: boolean; lines: { material_id: string; required: string; reserved: string; consumed: string; shortage: string }[] | null };
export type InventoryMovement = { id: string; material_id: string; actor_id: string; mode: string; quantity: string; before_quantity: string; after_quantity: string; version: number | string; created_at: string; reason?: string; unit_cost?: string; before_cost?: string; after_cost?: string };
export type PlanDraftLine = { material_id: string; quantity: string };

export function inventoryDecimal(value: string, positive = false): string {
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) throw new Error("Use a decimal with up to 12 whole digits and six decimal places; no negative values or exponents.");
  const [whole, fraction = ""] = value.split(".");
  const result = `${BigInt(whole)}.${fraction.padEnd(6, "0")}`;
  if (positive && decimalUnits(result) === BigInt(0)) throw new Error("Quantity must be greater than zero.");
  return result;
}

function decimalUnits(value: string): bigint { return BigInt(value.replace(".", "")); }

export function inventoryDisplay(value: string): string {
  if (!/^\d{1,12}\.\d{6}$/.test(value)) return "Unavailable";
  const [whole, fraction] = value.split(".");
  return `${new Intl.NumberFormat("en-US").format(BigInt(whole))}.${fraction}`;
}

export function catalogName(value: string, max: number): string {
  const name = value.trim();
  if (!name || [...name].length > max || /[\0\r\n]/.test(name)) throw new Error(`Name is required, up to ${max} characters, without line breaks.`);
  return name;
}

export function planLines(lines: PlanDraftLine[]): PlanDraftLine[] {
  if (!Array.isArray(lines) || lines.length > 500) throw new Error("A complete explicit plan of at most 500 lines is required.");
  const seen = new Set<string>();
  return lines.map((line) => {
    const id = line.material_id.toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id) || seen.has(id)) throw new Error("Each plan line needs a distinct material ID.");
    seen.add(id); return { material_id: id, quantity: inventoryDecimal(line.quantity, true) };
  });
}

export function stockFields(material: InventoryMaterial, mode: "addition" | "correction", quantity: string, unitCost: string, rawReason: string) {
  const amount = inventoryDecimal(quantity, mode === "addition");
  const reason = catalogName(rawReason, 2000);
  if (!material.is_active && mode === "addition") throw new Error("Reactivate the material before adding stock.");
  if (mode === "correction" && decimalUnits(amount) < decimalUnits(inventoryDecimal(material.qty_reserved))) throw new Error("Counted stock cannot be below active reserved stock.");
  return { mode, quantity: amount, reason, ...(mode === "addition" ? { unit_cost: inventoryDecimal(unitCost) } : {}) };
}
