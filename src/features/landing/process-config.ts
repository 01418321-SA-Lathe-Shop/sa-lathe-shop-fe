/**
 * Every tunable timing, motion and effect budget for the landing lathe.
 * Seconds and world units (1 unit ≈ 50 mm). Stages run back to back; changing
 * one duration moves every later start automatically.
 */
export const latheConfig = {
  stages: { load: 1.8, clamp: 1, spinUp: 2, approach: 1, turn: 5.2, retract: 1.2, spinDown: 2.4, eject: 1.4 },
  motion: {
    /** Bar slide: minimum-jerk travel, then a small damped settle against the jaw stop. */
    loadTravel: 3.4, loadSettle: { amplitude: 0.035, frequency: 7, decay: 0.12, window: 0.45 },
    /** Jaw stroke and its seating overshoot/ring-out. */
    jawOpen: 0.62, jawClosed: 0.42, jawSettle: { amplitude: 0.012, frequency: 11, decay: 0.07, window: 0.35 },
    barSag: 0.012,
    /** Spindle: first-order lag, slower to coast down than to spin up. */
    spindleRps: 14, spinUpLag: 0.35, spinDownLag: 0.45,
    /** Displayed spin is capped to avoid wagon-wheel aliasing; blur represents the rest. */
    visibleRps: 1.6, blurStartRps: 2, blurFullRps: 10,
    /** Carriage: rapid (with overshoot) then a slower feed-in to touch the stock. */
    rapidShare: 0.65, rapidSettle: { amplitude: 0.02, frequency: 9, decay: 0.08, window: 0.3 },
    feedRamp: 0.06, retractRadial: 0.55, park: { x: 2.55, radial: 0.95 },
    vibration: { amplitude: 0.0035, frequencies: [37, 53, 71] },
    /** Ejected part falls under gravity into the parts tray. */
    ejectSlide: 0.6, ejectDrift: 0.25, gravity: 9, trayDrop: 1.05,
  },
  effects: {
    chipLifetime: 1.1, coolantLifetime: 0.55, coolantStart: 0.4, coolantStop: 0.15, dripTime: 0.9,
    cutGlow: 0.6, mistDrift: 0.05,
  },
  camera: {
    position: [5.4, 4.6, 13.6] as const, target: [-0.25, -0.1, 0] as const,
    drift: [0.55, 0.12, 0] as const, worldWidth: 10.6, mobileWorldWidth: 6.4, minWorldHeight: 3.6,
    focusLag: 0.6, aperture: 0.00045, maxBlur: 0.0035,
  },
  loop: true,
  desktop: { pixelRatio: 1.5, chips: 72, coolant: 110, mist: 60, depthOfField: true, shadowMap: 1024, segments: 96 },
  mobile: { pixelRatio: 1, chips: 18, coolant: 36, mist: 0, depthOfField: false, shadowMap: 512, segments: 48 },
} as const;

/** Workpiece profile (world X along the spindle). Chuck face at CHUCK_X, free end at END_X. */
export const CHUCK_X = -1.42, END_X = 1.62, RAW_R = 0.42, GRIP = 0.22;
/** Distance from the free end, finished radius. Read right-to-left like the drawing. */
export const finishedProfile: readonly (readonly [number, number])[] = [
  [0, 0.26], [0.06, 0.31], [0.9, 0.31], [0.96, 0.36], [1.42, 0.36], [1.43, 0.3], [1.58, 0.3], [1.59, 0.36],
  [2.36, 0.36], [2.42, RAW_R],
];
export const CUT_LENGTH = finishedProfile[finishedProfile.length - 1][0];

export type LatheStage = keyof typeof latheConfig.stages;
let end = 0;
export const latheStages = Object.fromEntries(Object.entries(latheConfig.stages).map(([id, duration]) => {
  const start = end;
  end += duration;
  return [id, { start, end, duration }];
})) as Record<LatheStage, { start: number; end: number; duration: number }>;
export const latheDuration = end;
export type ProcessMotion = { time: number; cycle: number; loop: boolean };

export const clamp = (n: number) => Math.max(0, Math.min(1, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Minimum-jerk profile: zero velocity and acceleration at both ends, like a servo axis. */
export const minJerk = (t: number) => { const x = clamp(t); return x * x * x * (10 - 15 * x + 6 * x * x); };
export function progress(time: number, stage: LatheStage) {
  return clamp((time - latheStages[stage].start) / latheStages[stage].duration);
}
type Settle = { amplitude: number; frequency: number; decay: number; window: number };
/** Damped ring-out after arrival, forced to exactly zero by the end of its window. */
export function settle(since: number, s: Settle) {
  if (since <= 0 || since >= s.window) return 0;
  return s.amplitude * Math.exp(-since / s.decay) * Math.sin(2 * Math.PI * s.frequency * since) * (1 - since / s.window);
}
/** Constant feed with short acceleration ramps (trapezoidal velocity), normalised 0→1. */
export function trapezoid(t: number, ramp: number) {
  const x = clamp(t), r = Math.min(0.49, ramp), v = 1 / (1 - r);
  if (x < r) return v * x * x / (2 * r);
  if (x > 1 - r) return 1 - v * (1 - x) * (1 - x) / (2 * r);
  return v * (x - r / 2);
}

/** Finished radius at a world X (raw radius outside the machined length). */
export function finishedRadius(x: number) {
  const d = END_X - x;
  if (d < 0 || d >= CUT_LENGTH) return RAW_R;
  for (let i = 1; i < finishedProfile.length; i++) {
    const [d1, r1] = finishedProfile[i];
    if (d <= d1) { const [d0, r0] = finishedProfile[i - 1]; return mix(r0, r1, (d - d0) / Math.max(1e-6, d1 - d0)); }
  }
  return RAW_R;
}

/** Spindle speed from a closed-form first-order lag (no per-frame integration). */
function spindle(t: number) {
  const { spindleRps: max, spinUpLag: up, spinDownLag: down } = latheConfig.motion;
  const t0 = latheStages.spinUp.start, t2 = latheStages.spinDown.start;
  if (t <= t0) return { rps: 0 };
  const rps = max * (1 - Math.exp(-(Math.min(t, t2) - t0) / up));
  return { rps: t > t2 ? rps * Math.exp(-(t - t2) / down) : rps };
}

/** Cutting-edge vibration: a few incommensurate sines, deterministic. */
function chatter(t: number) {
  const { amplitude, frequencies } = latheConfig.motion.vibration;
  return amplitude * frequencies.reduce((sum, f, i) => sum + Math.sin(t * f * 2 * Math.PI + i * 1.7), 0) / frequencies.length;
}

/** Pure, deterministic pose sampler. No timers, randomness, React state or physics engine. */
export function sampleLathe(time: number, cycle = 0) {
  const t = Math.max(0, Math.min(latheDuration, time));
  const m = latheConfig.motion, s = latheStages;
  const load = progress(t, "load"), clampP = progress(t, "clamp"), approach = progress(t, "approach");
  const turn = progress(t, "turn"), retract = progress(t, "retract"), eject = progress(t, "eject");

  // Bar feed through the spindle bore, then a soft stop against the jaw stop.
  const barX = -m.loadTravel * (1 - minJerk(load)) + settle(t - s.load.end, m.loadSettle);

  // Jaws: closed on the finished part, open while it ejects and while fresh stock feeds.
  let jaw: number = m.jawOpen;
  if (t >= s.clamp.start && t < s.eject.start) jaw = mix(m.jawOpen, m.jawClosed, minJerk(clampP / 0.6)) - settle(t - s.clamp.start - 0.6 * s.clamp.duration, m.jawSettle);
  else if (t >= s.eject.start) jaw = mix(m.jawClosed, m.jawOpen, minJerk(eject / 0.25));
  const grip = clamp((m.jawOpen - jaw) / (m.jawOpen - m.jawClosed));
  const barY = -m.barSag * (1 - grip);

  const { rps } = spindle(t);
  const blur = clamp((rps - m.blurStartRps) / (m.blurFullRps - m.blurStartRps));
  // Visible rotation follows real speed until the cap, so spin-up still reads as acceleration.
  const visibleRps = Math.min(rps, m.visibleRps);
  const visibleAngle = spinVisible(t) + cycle * spinVisible(latheDuration);

  // Tool tip in (x, radial distance from axis). Parked → rapid → feed-in → contour → retract → park.
  const startX = END_X + 0.08, startR = finishedRadius(END_X) + 0.04, endX = END_X - CUT_LENGTH;
  let toolX: number = m.park.x, toolR: number = m.park.radial;
  if (t >= s.approach.start && t < s.turn.start) {
    const rapid = clamp(approach / m.rapidShare), feed = clamp((approach - m.rapidShare) / (1 - m.rapidShare));
    const nearX = startX + 0.12, nearR = startR + 0.12;
    toolX = mix(m.park.x, nearX, minJerk(rapid)) + settle(t - s.approach.start - m.rapidShare * s.approach.duration, m.rapidSettle);
    toolR = mix(m.park.radial, nearR, minJerk(rapid));
    if (approach > m.rapidShare) { toolX = mix(nearX, startX, minJerk(feed)) + settle(t - s.approach.start - m.rapidShare * s.approach.duration, m.rapidSettle); toolR = mix(nearR, startR, minJerk(feed)); }
  } else if (t >= s.turn.start && t < s.retract.start) {
    // A short diagonal entry onto the chamfer, then constant feed along the contour.
    const lead = 0.05;
    if (turn < lead) { toolX = mix(startX, END_X, minJerk(turn / lead)); toolR = mix(startR, finishedRadius(END_X), minJerk(turn / lead)); }
    else { toolX = mix(END_X, endX, trapezoid((turn - lead) / (1 - lead), m.feedRamp)); toolR = finishedRadius(toolX); }
  } else if (t >= s.retract.start && t < s.spinDown.start) {
    toolX = endX; toolR = mix(RAW_R, RAW_R + m.retractRadial, minJerk(retract / 0.45));
    if (retract > 0.45) {
      const back = minJerk((retract - 0.45) / 0.55);
      toolX = mix(endX, m.park.x, back); toolR = mix(RAW_R + m.retractRadial, m.park.radial, back);
    }
  }
  // The cut boundary never runs ahead of the tool and never heals.
  const cutX = t < s.turn.start ? END_X + 1 : t >= s.retract.start ? endX : Math.min(END_X + 1, toolX);
  const cutting = t >= s.turn.start && t < s.retract.start && toolX < END_X + 0.005 ? 1 : 0;
  const vibration = cutting ? chatter(t) : 0;

  // Coolant: valve ramps open during spin-up, closes at retract; drips continue briefly.
  const fx = latheConfig.effects;
  const coolant = t < s.spinUp.end - fx.coolantStart ? 0
    : t < s.spinUp.end ? clamp((t - (s.spinUp.end - fx.coolantStart)) / fx.coolantStart)
    : t < s.retract.start ? 1 : clamp(1 - (t - s.retract.start) / fx.coolantStop);
  const drip = t >= s.retract.start ? clamp(1 - (t - s.retract.start) / fx.dripTime) : 0;

  // Eject: slide clear of the jaws, then fall into the parts tray.
  const slideT = clamp(eject / 0.4), fall = Math.max(0, eject * s.eject.duration - 0.4 * s.eject.duration);
  const fallY = Math.min(m.trayDrop, 0.5 * m.gravity * fall * fall);
  const landed = fallY >= m.trayDrop;
  const partX = t >= s.eject.start ? m.ejectSlide * minJerk(slideT) + fall * m.ejectDrift : 0;
  const partTilt = t >= s.eject.start ? Math.min(0.12, fall * 0.5) : 0;

  return {
    barX, barY, jaw, grip, rps, visibleRps, visibleAngle, blur,
    toolX, toolR: toolR + vibration, cutX, cutting, vibration, coolant, drip,
    ejecting: t >= s.eject.start, partX, partY: -fallY, partTilt, landed,
    /** A previous part waits in the tray from the second cycle on, so the seam never pops. */
    trayPart: cycle > 0 || landed,
    focusX: t < s.approach.start ? CHUCK_X + 0.9 : t < s.spinDown.start ? toolX : END_X - CUT_LENGTH * 0.5,
  };
}

/** Integral of the capped visible speed, also closed form per segment. */
function spinVisible(t: number) {
  const { spindleRps: max, spinUpLag: up, spinDownLag: down, visibleRps: cap } = latheConfig.motion;
  const t0 = latheStages.spinUp.start, t2 = latheStages.spinDown.start;
  if (t <= t0) return 0;
  // Spin-up crosses the cap at tc; after it the display holds the capped speed.
  const tc = -up * Math.log(1 - cap / max);
  const run = Math.min(t, t2) - t0;
  let angle = run <= tc ? 2 * Math.PI * max * (run - up * (1 - Math.exp(-run / up))) : 2 * Math.PI * (max * (tc - up * (1 - Math.exp(-tc / up))) + cap * (run - tc));
  if (t > t2) {
    const start = max * (1 - Math.exp(-(t2 - t0) / up)), coast = t - t2;
    // Coast-down reaches the cap at td; before that the display stays at the cap.
    const td = down * Math.log(start / cap);
    angle += coast <= td ? 2 * Math.PI * cap * coast : 2 * Math.PI * (cap * td + cap * down * (1 - Math.exp(-(coast - td) / down)));
  }
  return angle;
}
