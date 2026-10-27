"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { landingConfig } from "./landing-config";
import { processConfig, type ProcessMotion } from "./process-config";
import type { ProcessClock } from "./process-clock";
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
  const motion = useRef<ProcessMotion>({ time: 0, cycle: 0, loop: processConfig.loop });
  const clock = useRef<ProcessClock | null>(null);
  const stateRef = useRef("loading");
  const [state, setState] = useState<"loading" | "playing" | "paused" | "complete" | "failed">("loading");
  const [ready, setReady] = useState(false), [visible, setVisible] = useState(true);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const mobile = useMedia("(max-width: 767px)");
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => {
    clock.current?.dispose(); clock.current = null;
    stateRef.current = "failed"; setState("failed");
  }, []);
  const complete = useCallback(() => { stateRef.current = "complete"; setState("complete"); }, []);
  const togglePlayback = () => {
    if (state === "playing") { clock.current?.pause(); stateRef.current = "paused"; setState("paused"); }
    else {
      if (state === "complete") clock.current?.restart();
      else clock.current?.resume();
      stateRef.current = "playing"; setState("playing");
    }
  };
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!ready || reduced !== false) return;
    let cancelled = false;
    import("./process-clock").then(({ createProcessClock }) => {
      if (cancelled || stateRef.current === "failed") return;
      clock.current = createProcessClock(motion.current, complete);
      if (stateRef.current === "complete") { clock.current.finish(); return; }
      if (stateRef.current !== "paused") {
        stateRef.current = "playing"; setState("playing");
        if (!document.hidden && root.current && root.current.getBoundingClientRect().bottom > 0) clock.current.resume();
      }
    }).catch(onError);
    return () => { cancelled = true; clock.current?.dispose(); clock.current = null; };
  }, [ready, reduced, complete, onError]);
  useEffect(() => {
    const sync = () => {
      if (document.hidden || !visible || state !== "playing") clock.current?.pause();
      else clock.current?.resume();
    };
    sync(); document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [visible, state]);
  useEffect(() => {
    if (ready || reduced !== false || state !== "loading") return;
    const timeout = window.setTimeout(onError, 10000);
    return () => window.clearTimeout(timeout);
  }, [ready, reduced, state, onError]);

  const staticMode = reduced === true || state === "failed";
  return <section ref={root} className="cinematic-hero" data-state={staticMode ? "static" : state} aria-labelledby="cinematic-title">
    <div className="cinematic-horizon" aria-hidden="true" />
    <div className="cinematic-art">
      <p id="cinematic-scene-description" className="cinematic-sr-only">ภาพจำลองแขนกลหยิบเศษโลหะวางบนสายพาน ลำเลียงเข้าเตาหลอม และขึ้นรูปเป็นแท่งโลหะสำเร็จ</p>
      <picture className="cinematic-poster"><source media="(max-width: 767px)" srcSet="/landing-final-mobile.webp" /><img src="/landing-final-desktop.webp" alt="" width="1440" height="320" fetchPriority="high" /></picture>
      {reduced === false && mobile !== null && state !== "failed" && <div className="cinematic-canvas" data-ready={ready} aria-hidden="true">
        <SceneLoadBoundary onError={onError}><Scene motion={motion} mobile={mobile} playing={state === "playing"} frameState={state} visible={visible} onReady={onReady} onError={onError} /></SceneLoadBoundary>
      </div>}
      {!staticMode && ready && <button className="cinematic-scene-toggle" type="button" onClick={togglePlayback}
        aria-label={state === "playing" ? "หยุดภาพเคลื่อนไหวชั่วคราว" : "เล่นภาพเคลื่อนไหว"}
        aria-describedby="cinematic-scene-description" aria-pressed={state === "paused"}
        title={state === "playing" ? "แตะเพื่อหยุดภาพเคลื่อนไหว" : "แตะเพื่อเล่นภาพเคลื่อนไหว"} />}
    </div>
    <Nav />
    <div className="cinematic-copy"><h1 id="cinematic-title">{landingConfig.headline.map(line => <span className="cinematic-line" key={line}>{line}</span>)}</h1></div>
    <div className="cinematic-description"><p>{landingConfig.paragraph}</p><Link href="/register" className="cinematic-primary">เริ่มสั่งผลิต <span aria-hidden="true">↗</span></Link></div>
    <div className="cinematic-bottom-copy"><p>ดูแลงานผลิต<br />ตั้งแต่รับงาน<br />จนถึงส่งมอบ</p><a href="#workflow" aria-label="ดูขั้นตอนการทำงาน">ดูขั้นตอน <span aria-hidden="true">↓</span></a></div>
    <StatCards />
    {!staticMode && state === "loading" && <p className="cinematic-scene-notice" role="status">กำลังเตรียมภาพสามมิติ…</p>}
    {state === "failed" && <p className="cinematic-scene-notice" role="status">แสดงภาพนิ่งแทน เนื่องจากไม่สามารถเปิดภาพสามมิติได้</p>}
    <noscript><style>{`.cinematic-hero .cinematic-poster{opacity:1!important;filter:none!important}.cinematic-scene-notice{display:none!important}`}</style></noscript>
  </section>;
}
