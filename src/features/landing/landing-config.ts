/** Public hero copy. Animation settings live in process-config.ts; shop details in landing-content.ts. */
export const landingConfig = {
  headline: ["งานกลึงตามแบบ", "แม่นยำ ส่งไว", "ราคาเป็นกันเอง"],
  paragraph: "Bangkok Machine Shop รับกลึงและผลิตชิ้นส่วนตามแบบ งานละเอียด ส่งมอบรวดเร็ว ราคาเป็นมิตร พร้อมติดตามงานสั่งผลิตได้ออนไลน์ทุกขั้นตอน",
  /** Owner-confirmed figures (2026-10-29). */
  stats: [{ value: "30", label: "ปีประสบการณ์" }, { value: "837", label: "งานที่ส่งมอบแล้ว" }],
} as const;
