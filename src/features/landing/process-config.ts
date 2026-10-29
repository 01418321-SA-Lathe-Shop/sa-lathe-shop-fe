/** Seconds. The final hold is part of output, never added to the five-second loop. */
export const processConfig = {
  durations: { pickup: 1, place: 0.8, feed: 1.2, melt: 0.9, output: 1.1 },
  easing: { arm: "easeInOut", belt: "linear", output: "easeOut" },
  finalHold: 0.3,
  resetFade: 0.18,
  loop: true,
  desktop: { pixelRatio: 1.5, sparks: 24, depthOfField: true, motionTrails: true },
  mobile: { pixelRatio: 1, sparks: 8, depthOfField: false, motionTrails: false },
} as const;

export type ProcessStep = keyof typeof processConfig.durations;
let end = 0;
export const processStages = Object.fromEntries(Object.entries(processConfig.durations).map(([id, duration]) => {
  const start = end;
  end += duration;
  return [id, { start, end, duration }];
})) as Record<ProcessStep, { start: number; end: number; duration: number }>;
export const processDuration = processStages.output.end;
export type ProcessMotion = { time: number; cycle: number; loop: boolean };
export const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const easings = {
  linear: (t: number) => t,
  easeInOut: (t: number) => t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2,
  easeOut: (t: number) => 1 - (1 - t) ** 3,
};
export function progress(time: number, step: ProcessStep) {
  return clamp((time - processStages[step].start) / processStages[step].duration);
}

/** Pure, deterministic pose sampler: no timers, randomness, React state or physics. */
export function sampleProcess(time: number, cycle = 0) {
  const t = Math.max(0, Math.min(processDuration, time));
  const pickup = progress(t, "pickup"), place = progress(t, "place");
  const feed = progress(t, "feed"), melt = progress(t, "melt");
  const armEase = easings[processConfig.easing.arm];
  let armX = -5.65, armY = -0.08, gap = 0.48;
  if (t < processStages.place.start) {
    gap = mix(0.48, 0.21, armEase(clamp(pickup / 0.2)));
    armY = mix(-0.08, 1.15, armEase(clamp((pickup - 0.2) / 0.8)));
  } else if (t < processStages.feed.start) {
    const move = armEase(clamp(place / 0.54));
    armX = mix(-5.65, -3.65, move);
    armY = mix(1.15, 0.02, move) + Math.sin(move * Math.PI) * 0.2;
    gap = mix(0.21, 0.48, armEase(clamp((place - 0.54) / 0.12)));
    if (place > 0.66) {
      const back = armEase((place - 0.66) / 0.34);
      armX = mix(-3.65, -5.65, back);
      armY = mix(0.02, -0.08, back) + Math.sin(back * Math.PI) * 0.65;
    }
  }
  const attached = t < processStages.place.start || place < 0.54;
  const scrapX = attached ? armX : mix(-3.65, 1.1, easings[processConfig.easing.belt](feed));
  const scrapY = attached ? armY - 0.36 : -0.34;
  const output = easings[processConfig.easing.output](clamp((t - processStages.output.start) / Math.max(0.01, processStages.output.duration - processConfig.finalHold)));
  const reset = cycle > 0 && t < processConfig.resetFade;
  const ingotOpacity = reset ? 1 - t / processConfig.resetFade : t >= processStages.output.start ? 1 : 0;
  const heat = t >= processStages.melt.start && t < processStages.output.start ? Math.sin(melt * Math.PI) : 0;
  return {
    armX, armY, gap, scrapX, scrapY,
    scrapVisible: t < processStages.melt.start,
    scrapOpacity: cycle > 0 ? clamp(t / processConfig.resetFade) : 1,
    belt: cycle * (processDuration - processConfig.finalHold - processStages.feed.start) + Math.max(0, Math.min(t, processDuration - processConfig.finalHold) - processStages.feed.start),
    heat, melt, pour: Math.sin(clamp((melt - 0.2) / 0.65) * Math.PI),
    glow: 0.8 + feed * (1 - melt) * 1.6 + heat * 3,
    ingotX: reset ? 6.15 : mix(4.2, 6.15, output),
    ingotOpacity, ingotHeat: reset ? 0 : 1 - output, ingotRotation: reset ? -0.15 : -0.15 * output,
    output,
  };
}
