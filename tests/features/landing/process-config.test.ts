import assert from "node:assert/strict";
import test from "node:test";
import { CUT_LENGTH, END_X, RAW_R, finishedRadius, latheConfig, latheDuration, latheStages, minJerk, sampleLathe, settle, trapezoid } from "../../../src/features/landing/process-config.ts";

const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

test("stages are contiguous and the cycle length is their sum", () => {
  let previous = 0;
  for (const stage of Object.values(latheStages)) { assert.equal(stage.start, previous); previous = stage.end; }
  near(latheDuration, Object.values(latheConfig.stages).reduce((a, b) => a + b, 0));
});
test("motion helpers start and stop at rest", () => {
  assert.equal(minJerk(0), 0); assert.equal(minJerk(1), 1);
  near(trapezoid(0, 0.1), 0); near(trapezoid(1, 0.1), 1); near(trapezoid(0.5, 0.1), 0.5);
  const s = latheConfig.motion.jawSettle;
  assert.equal(settle(0, s), 0); assert.equal(settle(s.window, s), 0);
});
test("bar feeds from inside the headstock and stops on the jaw stop", () => {
  near(sampleLathe(0).barX, -latheConfig.motion.loadTravel);
  near(sampleLathe(latheStages.clamp.end).barX, 0);
});
test("jaws close onto the raw bar, overshoot slightly and settle on contact", () => {
  const closed = Array.from({ length: 200 }, (_, i) => sampleLathe(latheStages.clamp.start + i * latheStages.clamp.duration / 200).jaw);
  assert.ok(Math.min(...closed) < RAW_R, "jaw seats with a small overshoot");
  near(sampleLathe(latheStages.clamp.end).jaw, RAW_R, 1e-9);
  assert.equal(sampleLathe(latheStages.turn.start).jaw, RAW_R);
});
test("spindle ramps up with inertia and coasts down more slowly", () => {
  assert.equal(sampleLathe(latheStages.spinUp.start).rps, 0);
  const up = sampleLathe(latheStages.spinUp.start + 0.3).rps, top = latheConfig.motion.spindleRps;
  assert.ok(up > 0 && up < top * 0.75);
  assert.ok(sampleLathe(latheStages.turn.start).rps > top * 0.99);
  const down = sampleLathe(latheStages.spinDown.start + 0.3).rps;
  assert.ok(top - down < up, "coast-down loses speed more gradually than spin-up gains it");
  assert.ok(sampleLathe(latheStages.eject.start).rps < 0.1, "spindle is effectively stopped before the jaws open");
});
test("tool touches the stock at the start of the cut and follows the finished contour", () => {
  const atContact = sampleLathe(latheStages.turn.start + latheStages.turn.duration * 0.05);
  near(atContact.toolX, END_X); near(atContact.toolR, finishedRadius(END_X), 0.01);
  for (const f of [0.2, 0.4, 0.6, 0.8]) {
    const p = sampleLathe(latheStages.turn.start + latheStages.turn.duration * f);
    assert.equal(p.cutting, 1); near(p.cutX, p.toolX); near(p.toolR, finishedRadius(p.toolX), latheConfig.motion.vibration.amplitude + 1e-9);
  }
});
test("material removal never runs ahead of the tool or heals", () => {
  let last = Infinity;
  for (let t = latheStages.turn.start; t <= latheDuration; t += 0.01) {
    const p = sampleLathe(t);
    assert.ok(p.cutX <= last + 1e-9); last = p.cutX;
  }
  near(sampleLathe(latheDuration).cutX, END_X - CUT_LENGTH);
});
test("coolant only flows around the cut and drips after shut-off", () => {
  assert.equal(sampleLathe(latheStages.spinUp.start).coolant, 0);
  assert.equal(sampleLathe(latheStages.turn.start + 1).coolant, 1);
  assert.equal(sampleLathe(latheStages.spinDown.start).coolant, 0);
  assert.ok(sampleLathe(latheStages.retract.start + 0.2).drip > 0);
});
test("part lands in the tray before the loop seam and the seam is continuous", () => {
  const end = sampleLathe(latheDuration, 0), next = sampleLathe(0, 1);
  assert.equal(end.landed, true); assert.equal(next.trayPart, true); assert.equal(sampleLathe(0, 0).trayPart, false);
  assert.equal(end.jaw, next.jaw); assert.equal(end.toolX, next.toolX); assert.equal(end.toolR, next.toolR);
  near(end.visibleAngle, next.visibleAngle);
  assert.ok(end.rps < 0.01); assert.equal(next.rps, 0);
});
