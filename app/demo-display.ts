// Display-only helpers. Monetary calculation/rounding policy is not defined here.
const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dates = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", dateStyle: "medium", timeStyle: "short" });

export function formatTHB(satang: number | undefined): string {
  return typeof satang === "number" && Number.isFinite(satang) ? currency.format(satang / 100) : "Unavailable";
}

export function formatBangkok(value: string | number | undefined): string {
  if (value === undefined || value === "") return "Unavailable";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${dates.format(date)} ICT` : "Unavailable";
}
