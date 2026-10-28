import { exactCount, type Count, type Day } from "./overview-domain.ts";

export type Week = { days: (Day | null)[]; month: string };
export function calendarWeeks(days: Day[]): Week[] {
  if (!days.length) return [];
  const weekday = (new Date(`${days[0].date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const padded: (Day | null)[] = [...Array<null>(weekday).fill(null), ...days];
  while (padded.length % 7) padded.push(null);
  const weeks: Week[] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const slice = padded.slice(i, i + 7);
    const monthStart = slice.find(day => day?.date.endsWith("-01")) ?? (i === 0 && Number(days[0].date.slice(-2)) <= 15 ? days[0] : undefined);
    weeks.push({ days: slice, month: monthStart ? new Intl.DateTimeFormat("th-TH", { month: "short", timeZone: "UTC" }).format(new Date(`${monthStart.date}T00:00:00Z`)) : "" });
  }
  return weeks;
}
export function heatLevel(count: Count, max: Count): number {
  const value = exactCount(count); const highest = exactCount(max);
  return value === BigInt(0) || highest === BigInt(0) ? 0 : Number((value * BigInt(4) + highest - BigInt(1)) / highest);
}
export function keyboardDay(index: number, key: string, count: number): number {
  const delta: Record<string, number> = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };
  return key === "Home" ? 0 : key === "End" ? count - 1 : Math.max(0, Math.min(count - 1, index + (delta[key] ?? 0)));
}
