/** Public copy and choreography. Durations are seconds; no business data lives here. */
export const landingConfig = {
  headline: ["Raw potential.", "Finished work.", "One workflow."],
  paragraph: "Bring requests, quotations, materials, production, and payments into one clear workflow—for your team and your customers.",
  captions: ["Sorting the scrap…", "Already know what it becomes."],
  stats: [{ value: "9", label: "connected workflows" }, { value: "3", label: "user roles, one platform" }],
  colors: { background: "#060707", orange: "#ff852e", copper: "#b85e2a", steel: "#a8b2b8", darkMetal: "#262b2e" },
  desktop: { scraps: 36, chips: 80, sparks: 48, pixelRatio: 1.5 },
  mobile: { scraps: 12, chips: 28, sparks: 16, pixelRatio: 1, timeMultiplier: 0.55 },
  stages: [
    { id: "dim", duration: 0.35, ease: "power2.out" },
    { id: "captions", duration: 2.25, ease: "power2.inOut" },
    { id: "settle", duration: 0.75, ease: "power3.out" },
    { id: "headline", duration: 1.2, ease: "power3.out" },
    { id: "ui", duration: 0.6, ease: "power2.out" },
    { id: "enter", duration: 1.2, ease: "power3.inOut" },
    { id: "feed", duration: 1.35, ease: "power2.inOut" },
    { id: "process", duration: 1.55, ease: "sine.inOut" },
    { id: "output", duration: 1.6, ease: "power3.out" },
  ],
} as const;

export type StageId = typeof landingConfig.stages[number]["id"];
type StageTiming = { start: number; end: number; duration: number; ease: string };
export const landingStages = landingConfig.stages.reduce((stages, stage, index) => {
  const start = index === 0 ? 0 : stages[landingConfig.stages[index - 1].id].end;
  stages[stage.id] = { ...stage, start, end: start + stage.duration };
  return stages;
}, {} as Record<StageId, StageTiming>);
export const introDuration = landingStages.output.end;
export type LandingMotion = { time: number };
