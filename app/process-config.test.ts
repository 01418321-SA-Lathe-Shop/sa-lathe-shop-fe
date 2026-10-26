import assert from "node:assert/strict";
import test from "node:test";
import { processDuration, processStages, sampleProcess } from "./process-config.ts";

test("five stages are contiguous and total exactly five seconds", () => {
  assert.equal(processDuration, 5);
  let previous = 0;
  for (const stage of Object.values(processStages)) { assert.equal(stage.start, previous); previous = stage.end; }
  assert.deepEqual(Object.values(processStages).map(s => s.end), [1, 1.8, 3, 3.9, 5]);
});
test("arm places scrap before linear feed; scrap is hidden throughout melting", () => {
  assert.equal(sampleProcess(1.8).scrapX, -3.65);
  assert.ok(Math.abs(sampleProcess(2.4).scrapX - (-3.65 + 4.75 / 2)) < 1e-10);
  assert.equal(sampleProcess(3).scrapVisible, false);
  assert.equal(sampleProcess(3.8).scrapVisible, false);
  assert.ok(sampleProcess(3.5).pour > 0);
  assert.equal(sampleProcess(3.9).pour < 1e-10, true);
});
test("output is cold and settled for the final 0.3 seconds", () => {
  const a = sampleProcess(4.7), b = sampleProcess(5);
  assert.equal(a.ingotX, b.ingotX); assert.equal(a.ingotHeat, 0);
  assert.equal(a.ingotOpacity, 1); assert.equal(b.ingotOpacity, 1);
  assert.equal(a.belt, b.belt);
});
test("loop boundary preserves the ingot, arm and belt before fading the reset", () => {
  const end = sampleProcess(5, 0), next = sampleProcess(0, 1);
  assert.equal(end.armX, next.armX); assert.equal(end.armY, next.armY);
  assert.equal(end.ingotX, next.ingotX); assert.equal(end.ingotOpacity, next.ingotOpacity);
  assert.equal(end.ingotRotation, next.ingotRotation);
  assert.equal(end.belt, next.belt);
  assert.equal(sampleProcess(0, 0).ingotOpacity, 0);
  assert.equal(sampleProcess(0.18, 1).ingotOpacity, 0);
});
