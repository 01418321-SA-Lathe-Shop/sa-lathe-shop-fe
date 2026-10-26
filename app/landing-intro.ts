import { gsap } from "gsap";
import { introDuration, landingConfig, landingStages, type LandingMotion } from "./landing-config";

/** One clock drives both the DOM choreography and the deterministic WebGL scene. */
export function createLandingIntro(root: HTMLElement, motion: LandingMotion, mobile: boolean, onComplete: () => void) {
  let timeline: gsap.core.Timeline;
  const context = gsap.context(() => {
    const headline = root.querySelectorAll("[data-letter]");
    const ui = root.querySelectorAll("[data-reveal]");
    const captions = root.querySelectorAll("[data-caption]");
    const copy = root.querySelector(".cinematic-copy");
    gsap.set(headline, { opacity: 0.35, filter: "blur(8px)", y: 12 });
    gsap.set(ui, { opacity: 0, y: 10 });
    gsap.set(captions, { opacity: 0 });
    gsap.set(copy, { opacity: 0.12, filter: "blur(3px)" });
    motion.time = 0;
    timeline = gsap.timeline({ onComplete });
    timeline.to(motion, { time: introDuration, duration: introDuration, ease: "none" }, 0);
    timeline.to(headline, { opacity: 0, duration: landingStages.dim.duration, ease: landingStages.dim.ease }, 0);
    timeline.to(copy, { opacity: 1, filter: "blur(0px)", duration: landingStages.headline.duration, ease: landingStages.headline.ease }, landingStages.headline.start);
    captions.forEach((caption, i) => {
      const start = landingStages.captions.start + i * landingStages.captions.duration / 2;
      timeline.to(caption, { opacity: 1, duration: 0.2, ease: landingStages.captions.ease }, start)
        .to(caption, { opacity: 0, duration: 0.2, ease: landingStages.captions.ease }, start + 0.8);
    });
    timeline.to(headline, {
      opacity: 1, filter: "blur(0px)", y: 0, duration: 0.5, ease: landingStages.headline.ease,
      stagger: { amount: landingStages.headline.duration - 0.5, from: "start" },
    }, landingStages.headline.start);
    timeline.to(ui, { opacity: 1, y: 0, duration: landingStages.ui.duration, ease: landingStages.ui.ease, stagger: 0 }, landingStages.ui.start);
    if (mobile) timeline.timeScale(1 / landingConfig.mobile.timeMultiplier);
  }, root);
  return {
    finish() { timeline!.progress(1); },
    pause() { timeline!.pause(); },
    resume() { timeline!.resume(); },
    dispose() { context.revert(); },
  };
}

export type LandingIntro = ReturnType<typeof createLandingIntro>;
