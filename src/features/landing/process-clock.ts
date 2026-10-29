import { gsap } from "gsap";
import { processDuration, type ProcessMotion } from "./process-config";

/** Looping the clock, not React renders, keeps every phase on the same timebase. */
export function createProcessClock(motion: ProcessMotion, onComplete: () => void) {
  motion.time = 0; motion.cycle = 0;
  const tween = gsap.to(motion, {
    time: processDuration, duration: processDuration, ease: "none", paused: true,
    onComplete() {
      if (motion.loop) { motion.cycle += 1; tween.restart(); }
      else onComplete();
    },
  });
  return {
    pause() { tween.pause(); },
    resume() { tween.resume(); },
    finish() { tween.pause(); motion.time = processDuration; },
    restart() { motion.cycle = 0; tween.restart(); },
    dispose() { tween.kill(); },
  };
}
export type ProcessClock = ReturnType<typeof createProcessClock>;
