// Pure helpers for the Admin conversion screen. A conversion always reads "1 alternative unit = factor base units" of one material.

// Units with a fixed physical relation. Sizes in micro-SI (µg for mass, µm for length) keep the maths in exact integers.
const STANDARD: Record<string, { kind: "mass" | "length"; micro: bigint }> = {};
for (const [kind, micro, names] of [
  ["mass", BigInt(1_000_000_000_000), ["ตัน"]],
  ["mass", BigInt(1_000_000_000), ["กิโลกรัม", "กก.", "kg"]],
  ["mass", BigInt(1_000_000), ["กรัม", "g"]],
  ["length", BigInt(1_000_000), ["เมตร", "ม.", "m"]],
  ["length", BigInt(304_800), ["ฟุต", "ft"]],
  ["length", BigInt(25_400), ["นิ้ว", "in"]],
  ["length", BigInt(10_000), ["เซนติเมตร", "ซม.", "cm"]],
  ["length", BigInt(1_000), ["มิลลิเมตร", "มม.", "mm"]],
] as const) for (const name of names) STANDARD[name.toLowerCase()] = { kind, micro };

const standard = (name: string) => STANDARD[name.trim().toLowerCase()];
export const isMassUnit = (name: string) => standard(name)?.kind === "mass";
export const isLengthUnit = (name: string) => standard(name)?.kind === "length";

export type FixedFactor = { factor: string; exact: boolean } | null;
/**
 * The universal factor between two standard units of the same kind (1 นิ้ว = 25.4 มิลลิเมตร), or null when
 * the relation depends on the material (kg ↔ m, kg ↔ เส้น/แผ่น/ชิ้น). exact=false means it cannot be stored in 6 decimals.
 */
export function fixedFactor(alternative: string, base: string): FixedFactor {
  const from = standard(alternative); const to = standard(base);
  if (!from || !to || from.kind !== to.kind) return null;
  const scaled = from.micro * BigInt(1_000_000);
  const units = scaled / to.micro;
  const text = units.toString().padStart(7, "0");
  return { factor: `${text.slice(0, -6)}.${text.slice(-6)}`, exact: scaled % to.micro === BigInt(0) };
}

// Nominal densities (g/cm³) used by Thai stockists' weight tables. Real bars vary slightly, so results are theoretical.
export const DENSITIES = [
  { label: "เหล็กกล้า (S45C, SS400, SCM440)", value: 7.85, match: /S45C|SS400|SCM|เหล็ก(?!กล้าไร้สนิม)/i },
  { label: "เหล็กกล้าไร้สนิม SUS304", value: 7.93, match: /SUS\s?304|สแตนเลส/i },
  { label: "เหล็กกล้าไร้สนิม SUS316", value: 7.98, match: /SUS\s?316/i },
  { label: "อะลูมิเนียม 6061", value: 2.7, match: /อะลูมิเนียม|อลูมิเนียม|AL\s?6061/i },
  { label: "ทองเหลือง C3604", value: 8.5, match: /ทองเหลือง|C3604/i },
  { label: "ทองบรอนซ์ SAE660", value: 8.93, match: /บรอนซ์|SAE660|C932/i },
  { label: "ทองแดง C1100", value: 8.94, match: /ทองแดง|C1100/i },
  { label: "พลาสติกวิศวกรรม POM", value: 1.41, match: /POM|อะซีทัล/i },
] as const;
// SUS/brass/bronze/copper/POM are tested before the generic steel pattern.
export const guessDensity = (materialName: string) => [...DENSITIES.slice(1), DENSITIES[0]].find((item) => item.match.test(materialName))?.value;

export type Section = { shape: "round"; diameter: number } | { shape: "rect"; width: number; thickness: number };
/** Theoretical weight in kg of one piece: cross-section (mm²) × length (mm) × density (g/cm³) / 1,000,000. */
export function pieceWeightKg(section: Section, lengthMm: number, density: number): number | null {
  const area = section.shape === "round" ? Math.PI * section.diameter ** 2 / 4 : section.width * section.thickness;
  const kg = area * lengthMm * density / 1_000_000;
  return Number.isFinite(kg) && kg > 0 ? kg : null;
}

/** kg weight expressed as a 6-place factor in the material's mass base unit, rounded to the gram (3 places of kg). */
export function weightFactor(kg: number, baseUnit: string): string | null {
  const base = standard(baseUnit);
  if (base?.kind !== "mass") return null;
  const grams = Math.round(kg * 1000);
  if (grams <= 0) return null;
  // grams → base units, exact because every mass unit above is a power of ten of a gram
  const micro = BigInt(grams) * BigInt(1_000_000) * BigInt(1_000_000) / base.micro;
  const text = micro.toString().padStart(7, "0");
  return `${text.slice(0, -6)}.${text.slice(-6)}`;
}
