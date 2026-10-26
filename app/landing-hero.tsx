"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { introDuration, landingConfig } from "./landing-config";
import type { LandingIntro } from "./landing-intro";
import { Nav } from "./landing-nav";
import { StatCards } from "./landing-stat-cards";

const Scene = dynamic(() => import("./landing-scene"), { ssr: false });

class SceneLoadBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function useMedia(query: string) {
  const subscribe = useCallback((listener: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [query]);
  return useSyncExternalStore(subscribe, useCallback(() => window.matchMedia(query).matches, [query]), () => null);
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const motion = useRef({ time: 0 });
  const intro = useRef<LandingIntro | null>(null);
  const done = useRef(false);
  const [state, setState] = useState<"loading" | "playing" | "complete" | "failed">("loading");
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const mobile = useMedia("(max-width: 767px)");
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    done.current = true; intro.current?.dispose(); intro.current = null;
    motion.current.time = introDuration;
    setState("failed");
  }, []);
  const complete = useCallback(() => { done.current = true; setState("complete"); }, []);
  const skip = useCallback(() => {
    done.current = true;
    motion.current.time = introDuration;
    intro.current?.finish();
    setState("complete");
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready || reduced !== false || mobile === null || done.current) return;
    let cancelled = false;
    import("./landing-intro").then(({ createLandingIntro }) => {
      if (cancelled || done.current || !root.current) return;
      setState("playing");
      intro.current = createLandingIntro(root.current, motion.current, mobile, complete);
      if (document.hidden || root.current.getBoundingClientRect().bottom < 0) intro.current.pause();
    }).catch(onError);
    return () => { cancelled = true; intro.current?.dispose(); intro.current = null; };
    // Visibility pauses the existing clock separately, never recreates the intro.
  }, [ready, reduced, mobile, complete, onError]);

  useEffect(() => {
    const sync = () => {
      if (document.hidden || !visible) intro.current?.pause();
      else intro.current?.resume();
    };
    sync(); document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [visible]);

  useEffect(() => {
    if (ready || reduced !== false || state !== "loading") return;
    const timeout = window.setTimeout(onError, 10000);
    return () => window.clearTimeout(timeout);
  }, [ready, reduced, state, onError]);

  const staticMode = reduced === true || state === "failed";
  const displayState = staticMode ? "static" : state;
  return <section ref={root} className="cinematic-hero" data-state={displayState} aria-labelledby="cinematic-title"
    onFocusCapture={event => { if ((event.target as HTMLElement).closest("[data-intro-focus]")) skip(); }}>
    <div className="cinematic-horizon" aria-hidden="true" />
    <div className="cinematic-art" aria-hidden="true">
      <picture className="cinematic-poster"><source media="(max-width: 767px)" srcSet="/landing-final-mobile.webp" /><img src="/landing-final-desktop.webp" alt="" width="1440" height="900" fetchPriority="high" /></picture>
      {reduced === false && mobile !== null && state !== "failed" && !(state === "complete" && !ready) && <div className="cinematic-canvas" data-ready={ready}>
        <SceneLoadBoundary onError={onError}><Scene motion={motion} mobile={mobile} playing={state === "playing"} visible={visible} onReady={onReady} onError={onError} /></SceneLoadBoundary>
      </div>}
    </div>
    <Nav />
    <div className="cinematic-copy">
      <h1 id="cinematic-title" aria-label={landingConfig.headline.join(" ")}>{landingConfig.headline.map(line => <span className="cinematic-line" key={line} aria-hidden="true">{Array.from(line).map((letter, i) => <span data-letter key={i}>{letter === " " ? "\u00a0" : letter}</span>)}</span>)}</h1>
    </div>
    <div className="cinematic-description" data-reveal>
      <p>{landingConfig.paragraph}</p>
      <Link href="/register" className="cinematic-primary" data-intro-focus>Start a job <span aria-hidden="true">↗</span></Link>
    </div>
    <div className="cinematic-bottom-copy" data-reveal><p>Manufacturing, <br />from first request <br />to final delivery.</p><a href="#workflow" aria-label="Explore the manufacturing workflow" data-intro-focus>Explore below <span aria-hidden="true">↓</span></a></div>
    <StatCards />
    <div className="cinematic-captions" aria-hidden="true">{landingConfig.captions.map(text => <p key={text} data-caption>{text}</p>)}</div>
    {!staticMode && state !== "complete" && <div className="cinematic-intro-controls">
      {state === "loading" && <span role="status">Preparing the scene<span aria-hidden="true">…</span></span>}
      <button type="button" onClick={skip}>Skip intro <span aria-hidden="true">↗</span></button>
    </div>}
    <noscript><style>{`.cinematic-hero [data-reveal],.cinematic-hero .cinematic-copy{opacity:1!important;filter:none!important}.cinematic-intro-controls{display:none!important}`}</style></noscript>
  </section>;
}
