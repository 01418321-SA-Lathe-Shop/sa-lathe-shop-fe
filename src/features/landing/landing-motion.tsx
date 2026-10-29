"use client";

import { useEffect } from "react";

/**
 * Scroll effects for the public landing, with no library and no React state per frame:
 * - reveals `[data-reveal]` once as it enters the viewport (content stays visible without JS)
 * - writes `--scroll-progress` (page) and `--hero-progress` (hero exit) for CSS transforms
 * - shows the compact sticky bar after the hero and marks the section in view
 * Reduced motion keeps the same states; CSS drops the movement.
 */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cinematic-page");
    const hero = root?.querySelector<HTMLElement>(".cinematic-hero");
    if (!root || !hero) return;
    root.dataset.motion = "ready";

    // The root extends far above the viewport, so anything already scrolled past (fast scrolls,
    // anchor jumps, restored scroll position) counts as seen and never stays hidden.
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.setAttribute("data-revealed", "");
      reveal.unobserve(entry.target);
    }), { rootMargin: "100000px 0px -6% 0px", threshold: 0 });
    root.querySelectorAll("[data-reveal]").forEach(element => reveal.observe(element));

    const links = new Map([...root.querySelectorAll<HTMLAnchorElement>(".landing-sticky a[href^='#']")].map(a => [a.hash.slice(1), a]));
    // Every section is observed; ones without a sticky link (gallery, why us) clear the highlight.
    const active = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      links.forEach(link => link.removeAttribute("aria-current"));
      links.get(entry.target.id)?.setAttribute("aria-current", "location");
    }), { rootMargin: "-45% 0px -50% 0px" });
    root.querySelectorAll("section[id]").forEach(section => active.observe(section));

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const heroHeight = hero.offsetHeight;
      root.style.setProperty("--scroll-progress", String(max > 0 ? Math.min(1, window.scrollY / max) : 0));
      root.style.setProperty("--hero-progress", String(Math.min(1, window.scrollY / Math.max(1, heroHeight))));
      root.dataset.scrolled = window.scrollY > heroHeight * 0.7 ? "true" : "false";
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      reveal.disconnect(); active.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      delete root.dataset.motion;
    };
  }, []);
  return null;
}
