// One Thai wording and colour role per status value for Staff/Admin pages.
// Tones: waiting (grey), progress (blue), action (orange: someone here must act),
// done (green), problem (red). Each page domain adds its map in its own step.
export type Tone = "waiting" | "progress" | "action" | "done" | "problem";
export type StatusMap = Record<string, readonly [label: string, tone: Tone]>;

export const JOB_STATUS: StatusMap = {
  queued: ["รอเริ่มงาน", "action"],
  in_progress: ["กำลังผลิต", "progress"],
  completed: ["ผลิตเสร็จ", "done"],
  cancelled: ["ยกเลิก", "problem"],
};

export function statusOf(map: StatusMap, value: string): { label: string; tone: Tone } {
  const known = Object.hasOwn(map, value) ? map[value] : undefined;
  return known ? { label: known[0], tone: known[1] } : { label: "สถานะยังไม่ระบุ", tone: "waiting" };
}
