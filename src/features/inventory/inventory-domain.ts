// UC5 quantities/unit costs are NUMERIC(18,6), not two-place quotation money.
export type InventoryMaterial = { id: string; name: string; unit_id: string; unit_name: string; is_active: boolean; version: number | string; qty_on_hand: string; qty_reserved: string; qty_available: string; avg_cost?: string };
export type EnteredValues = { entered_quantity?: string; entered_unit_name?: string; factor_used?: string };
export type UnitConversion = { id: string; material_id: string; unit_id: string; unit_name: string; factor: string; is_active: boolean; created_at: string };
export type InventoryPlan = { job_id: string; version: number | string; ready: boolean; lines: ({ material_id: string; required: string; reserved: string; consumed: string; shortage: string } & EnteredValues)[] | null };
export type InventoryMovement = { id: string; material_id: string; actor_id: string; mode: string; quantity: string; before_quantity: string; after_quantity: string; version: number | string; created_at: string; reason?: string; unit_cost?: string; before_cost?: string; after_cost?: string } & EnteredValues;
export type PlanDraftLine = { material_id: string; quantity: string; unit_id?: string; unit_name?: string };

export function inventoryDecimal(value: string, positive = false): string {
  if (!/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) throw new Error("Use a decimal with up to 12 whole digits and six decimal places; no negative values or exponents.");
  const [whole, fraction = ""] = value.split(".");
  const result = `${BigInt(whole)}.${fraction.padEnd(6, "0")}`;
  if (positive && decimalUnits(result) === BigInt(0)) throw new Error("Quantity must be greater than zero.");
  return result;
}

function decimalUnits(value: string): bigint { return BigInt(value.replace(".", "")); }
function fromUnits(units: bigint): string { const text = units.toString().padStart(7, "0"); return `${text.slice(0, -6)}.${text.slice(-6)}`; }

/** Exact base quantity for a typed amount, or null when invalid or it would need rounding. */
export function convertToBase(quantity: string, factor: string): string | null {
  try {
    const product = decimalUnits(inventoryDecimal(quantity)) * decimalUnits(inventoryDecimal(factor));
    if (product % BigInt(1000000) !== BigInt(0)) return null;
    return inventoryDecimal(fromUnits(product / BigInt(1000000)));
  } catch { return null; }
}

/** Read-only display of a base balance in another unit, rounded down when it does not divide evenly. */
export function baseToUnit(base: string, factor: string): { value: string; exact: boolean } {
  const scaled = decimalUnits(inventoryDecimal(base)) * BigInt(1000000); const divisor = decimalUnits(inventoryDecimal(factor));
  return { value: fromUnits(scaled / divisor), exact: scaled % divisor === BigInt(0) };
}

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
    seen.add(id); return { material_id: id, quantity: inventoryDecimal(line.quantity, true), ...(line.unit_id ? { unit_id: line.unit_id } : {}) };
  });
}

// Stock filter chips use real material values only (there is no reorder level).
export const STOCK_FILTERS = ["all", "available", "empty", "reserved", "inactive"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];
const positive = (value: string) => /^\d{1,12}\.\d{6}$/.test(value) && decimalUnits(value) > BigInt(0);
const MATCHES: Record<StockFilter, (material: InventoryMaterial) => boolean> = {
  all: () => true,
  available: (material) => positive(material.qty_available),
  empty: (material) => !positive(material.qty_available),
  reserved: (material) => positive(material.qty_reserved),
  inactive: (material) => !material.is_active,
};

export function stockFilter(value: string | null): StockFilter {
  return STOCK_FILTERS.find((filter) => filter === value) ?? "all";
}

export function stockCounts(items: InventoryMaterial[]): Record<StockFilter, number> {
  return Object.fromEntries(STOCK_FILTERS.map((filter) => [filter, items.filter(MATCHES[filter]).length])) as Record<StockFilter, number>;
}

export function filterStock(items: InventoryMaterial[], filter: StockFilter): InventoryMaterial[] {
  return items.filter(MATCHES[filter]);
}

/** Has physical stock but none available: every on-hand unit is reserved for jobs. */
export function fullyReserved(material: InventoryMaterial): boolean {
  return positive(material.qty_on_hand) && !positive(material.qty_available);
}

/** Distinct base units in the list; quantities are never summed across materials because units differ. */
export function unitsInUse(items: InventoryMaterial[]): string[] {
  return [...new Set(items.map((material) => material.unit_name))].sort((a, b) => a.localeCompare(b, "th"));
}

/** Whole percent of on-hand reserved (same unit, exact integer math), for the row bar only. */
export function reservedPercent(material: Pick<InventoryMaterial, "qty_on_hand" | "qty_reserved">): number {
  if (!positive(material.qty_on_hand) || !positive(material.qty_reserved)) return 0;
  const percent = decimalUnits(material.qty_reserved) * BigInt(100) / decimalUnits(material.qty_on_hand);
  return percent > BigInt(100) ? 100 : Number(percent);
}

/** Exact on-hand balance after an adjustment, or null while the entry is not a valid quantity. */
export function stockAfter(material: Pick<InventoryMaterial, "qty_on_hand">, mode: "addition" | "correction", quantity: string): string | null {
  let amount: string;
  try { amount = inventoryDecimal(quantity, mode === "addition"); } catch { return null; }
  if (mode === "correction") return amount;
  return fromUnits(decimalUnits(inventoryDecimal(material.qty_on_hand)) + decimalUnits(amount));
}

export function isBelow(value: string, floor: string): boolean {
  return decimalUnits(inventoryDecimal(value)) < decimalUnits(inventoryDecimal(floor));
}

export function stockFields(material: InventoryMaterial, mode: "addition" | "correction", quantity: string, unitCost: string, rawReason: string, conversion?: Pick<UnitConversion, "unit_id" | "factor"> | null) {
  const amount = inventoryDecimal(quantity, mode === "addition");
  const base = conversion ? convertToBase(amount, conversion.factor) : amount;
  if (!base) throw new Error("This quantity cannot be converted exactly.");
  const reason = catalogName(rawReason, 2000);
  if (!material.is_active && mode === "addition") throw new Error("Reactivate the material before adding stock.");
  if (mode === "correction" && decimalUnits(base) < decimalUnits(inventoryDecimal(material.qty_reserved))) throw new Error("Counted stock cannot be below active reserved stock.");
  return { mode, quantity: amount, reason, ...(conversion ? { unit_id: conversion.unit_id } : {}), ...(mode === "addition" ? { unit_cost: inventoryDecimal(unitCost) } : {}) };
}

/** Real consumption only: `job_issue` is the ledger entry production usage writes. */
export function consumedTotal(items: InventoryMovement[]): string {
  return fromUnits(items.filter((item) => item.mode === "job_issue").reduce((sum, item) => sum + decimalUnits(item.quantity), BigInt(0)));
}

const bangkokMonth = (value: string | number) => new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).slice(0, 7);
/** Consumption per Bangkok calendar month, oldest first, including months with none. */
export function consumptionByMonth(items: InventoryMovement[], now: number, months = 6) {
  const [year, month] = bangkokMonth(now).split("-").map(Number);
  const keys = Array.from({ length: months }, (_, index) => new Date(Date.UTC(year, month - months + index, 1)).toISOString().slice(0, 7));
  const totals = keys.map((key) => items.filter((item) => item.mode === "job_issue" && bangkokMonth(item.created_at) === key).reduce((sum, item) => sum + decimalUnits(item.quantity), BigInt(0)));
  const peak = totals.reduce((max, value) => value > max ? value : max, BigInt(0));
  return keys.map((key, index) => ({ month: key, total: fromUnits(totals[index]), percent: peak > BigInt(0) ? Number(totals[index] * BigInt(100) / peak) : 0 }));
}
