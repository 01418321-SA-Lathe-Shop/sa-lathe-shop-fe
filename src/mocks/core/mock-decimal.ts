// Exact arithmetic for the in-browser mock backend. Mirrors the backend's
// NUMERIC(18,6) quantity/cost and NUMERIC(18,2) THB rules; never uses floats.
export const MICRO = BigInt(1000000);
const HUNDRED = BigInt(100);
const ZERO = BigInt(0);

export class DecimalError extends Error {}

// Six-place quantities/unit costs: up to 12 whole digits, no sign/exponent.
export function micro(value: unknown, { positive = false } = {}): bigint {
  if (typeof value !== "string" || !/^\d{1,12}(?:\.\d{1,6})?$/.test(value)) throw new DecimalError("Use a decimal string with at most 12 whole digits and six decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * MICRO + BigInt(fraction.padEnd(6, "0"));
  if (positive && result === ZERO) throw new DecimalError("Quantity must be greater than zero.");
  return result;
}
export function fmt6(value: bigint): string {
  const sign = value < ZERO ? "-" : ""; const abs = value < ZERO ? -value : value;
  return `${sign}${abs / MICRO}.${(abs % MICRO).toString().padStart(6, "0")}`;
}

// Two-place THB money: up to 16 whole digits.
export function satang(value: unknown, { positive = false } = {}): bigint {
  if (typeof value !== "string" || !/^\d{1,16}(?:\.\d{1,2})?$/.test(value)) throw new DecimalError("Use a THB decimal string with at most two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const result = BigInt(whole) * HUNDRED + BigInt(fraction.padEnd(2, "0"));
  if (positive && result === ZERO) throw new DecimalError("Amount must be greater than zero.");
  return result;
}
export function fmt2(value: bigint): string {
  const sign = value < ZERO ? "-" : ""; const abs = value < ZERO ? -value : value;
  return `${sign}${abs / HUNDRED}.${(abs % HUNDRED).toString().padStart(2, "0")}`;
}

function divHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
}
function divCeil(numerator: bigint, denominator: bigint): bigint {
  return (numerator + denominator - BigInt(1)) / denominator;
}

// quantity * unit cost, rounded half-up to a satang (UC6 lines, UC8 issues).
export function lineSatang(quantity: bigint, unitCost: bigint): bigint {
  return divHalfUp(quantity * unitCost, MICRO * MICRO / HUNDRED);
}

// UC2 minimum: (material + labor) * 1.60, rounded upward to a satang.
export function minimumPrice(material: bigint, labor: bigint): bigint {
  return divCeil((material + labor) * BigInt(160), HUNDRED);
}

// UC4 50% deposit, rounded upward to a satang.
export function halfUp(total: bigint): bigint { return divCeil(total, BigInt(2)); }

// Weighted average after a good receipt/addition, half-up to six places.
export function weightedAverage(onHand: bigint, average: bigint, quantity: bigint, unitCost: bigint): bigint {
  const total = onHand + quantity;
  return total === ZERO ? average : divHalfUp(onHand * average + quantity * unitCost, total);
}

export function minBig(a: bigint, b: bigint): bigint { return a < b ? a : b; }
