# Five-second scrap-to-ingot animation — handoff

## Scope and chosen defaults

Implemented on `codex/cinematic-scrap-landing`, preserving the existing public landing and all connected UC1–UC9 workflows. The latest animation brief supersedes the earlier 10.85-second offcut/spindle intro.

- Format: React Three Fiber + Three.js, driven by GSAP; no new dependencies.
- Fixed near-side-on camera, slightly above the conveyor.
- Bent metal bracket → robotic gripper → left-to-right roller conveyor → box furnace → beveled ingot.
- Near-black background, neutral metallic surfaces, warm orange/copper energy accents.
- Illustrative compressed process, **not a claim that the shop offers melting/recycling services**.
- No captions, sound or delayed headline: real page copy and links remain visible.
- Loop defaults on. The controls are Pause/Play, Loop on/off, Replay and Show final frame.

## Storyboard

| Time | Step | Onscreen action |
|---|---|---|
| 0.0–1.0s | PICK UP | Gripper closes around a bent offcut and the two-link arm lifts it. |
| 1.0–1.8s | PLACE | Arm transfers the offcut to the belt, opens and returns home. |
| 1.8–3.0s | FEED | Moving slats/rollers carry it into the left furnace opening; the interior brightens. |
| 3.0–3.9s | MELT | Scrap is hidden; warm glow pulses, sparse sparks and a heat-wisp shader accompany molten metal pouring into the exit mold. |
| 3.9–5.0s | OUTPUT | Ingot moves onto the outfeed, cools orange→metal gray, settles by4.7s and holds through5.0s. |

Arm movement uses cubic ease-in-out, conveyor travel is linear, output uses cubic ease-out. Durations are cumulative, so there are no gaps or competing timers. The final0.3s hold is **inside** output, not extra time.

At the loop seam the arm is already home and the belt keeps its phase. The finished ingot retains its pose, then fades during the next cycle's first0.18s while fresh scrap fades in. This does not lengthen the five-second cycle. Loop-off lets the current cycle finish; Replay starts a new cycle. A paused scene can seek directly to its final frame.

## Complete source map

| File | Responsibility |
|---|---|
| `app/process-config.ts` | Five durations, easing selections, final hold, reset fade, loop default, mobile/desktop budgets; pure deterministic pose sampler |
| `app/process-clock.ts` | Lazy GSAP clock; pause/resume/restart/finish/dispose; cycle counting without per-frame React updates |
| `app/process-machine.tsx` | RobotArm, Gripper, Conveyor, Furnace, ScrapAndIngot; procedural geometry, instanced rollers/slats/sparks, molten stream, cooling and heat wisps |
| `app/process-effects.tsx` | Desktop-only restrained BokehPass depth of field, alpha-preserving composition and resource cleanup |
| `app/process-config.test.ts` | Native timing, phase-boundary, final-hold and seam-continuity tests |
| `app/landing-scene.tsx` | Lazy Canvas, fixed camera/framing, local RoomEnvironment, lighting, visibility and context-loss handling |
| `app/landing-hero.tsx` | Real HTML content, playback controls, lifecycle, reduced-motion and static error boundaries |
| `app/landing-geometry.ts` | Bent-bracket extrusion and seeded random generator |
| `app/landing-config.ts` | Existing headline, paragraph and factual platform statistics |
| `app/landing.css` | Existing dark page styling, bounded scene band and responsive controls |
| `app/landing-nav.tsx`, `app/landing-stat-cards.tsx`, `app/dashboard.tsx` | Existing navigation, statistics and below-fold content; not rewritten by this animation change |

Obsolete `landing-intro.ts`, `landing-machine.tsx` and `landing-scrap-pile.tsx` were removed after the replacement was connected. Git history preserves them.

## Run locally

From the frontend repository:

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. If dependencies are already installed and the dev server is running, just refresh the page. This animation needs no API, credentials, environment variables or external asset service. Existing login/registration continues to use the established application setup.

Production and checks:

```powershell
npm run build
npm start
node --experimental-strip-types --test app/process-config.test.ts
node scripts/sync-design.mjs --check
```

Use the existing supported Node version. The native test runner may print the repository's existing module-type warning; do not change package module settings just to suppress it.

## Tweak it

Edit `app/process-config.ts`:

```ts
durations: { pickup: 1, place: 0.8, feed: 1.2, melt: 0.9, output: 1.1 },
easing: { arm: "easeInOut", belt: "linear", output: "easeOut" },
finalHold: 0.3,
resetFade: 0.18,
loop: true,
```

Each step has one duration value. All later starts/endpoints recalculate automatically. Keep durations positive, `finalHold < durations.output`, and `0 < resetFade < durations.pickup`. To retain the requested length, durations must total5.0. Tests intentionally assert the requested five-second timings; revise their expected values when deliberately changing the brief.

- Public copy: `landing-config.ts`.
- Machine geometry, colors, lighting details and paths: `process-machine.tsx`, `process-config.ts`, `landing-scene.tsx`.
- Camera framing: `resizeCamera` in `landing-scene.tsx`.
- Desktop/mobile budgets: `processConfig.desktop/mobile`.
- For slower hardware, lower pixelRatio or set depthOfField/motionTrails tofalse.
- Page styling: `landing.css`; do not change workspace tokens for this scene.
- Regenerate both final-frame posters after changing geometry, lighting or camera framing.

## Assets

**You must provide: nothing.** No GLB, HDR, textures or paid models are required.

Generated in code: arm links/joints/gripper, beveled furnace panels, rollers, slats, bracket, ingot, mold, molten stream, sparks, warm heat wisps, local reflection environment and lighting. Existing Geist font and CSS logo are retained.

`public/landing-final-desktop.webp` and `public/landing-final-mobile.webp` are transparent captures of the actual final scene, with no text baked in. Embedded ImageDescription metadata records procedural origin, viewport and date. They are not frames copied from the reference video.

To refresh posters: show the final frame, wait for the on-demand draw, hide page UI/horizon/poster and any development overlay, capture only `.cinematic-art` against transparency, then encode WebP and retain provenance metadata. Poster sizing uses contain so the full machine remains visible at other aspect ratios.

## Accessibility, performance and honest limits

- Mobile keeps the same5.0s story, reduces sparks24→8 and DPR cap1.5→1, and disables DOF/ghost trails.
- Desktop DOF is deliberately restrained; the main production line stays readable.
- Motion blur is a lightweight two-sample gripper ghost-trail approximation during fast transfer, not full physical velocity-buffer blur.
- Heat shimmer uses animated translucent warm wisps, not scene-refracting fluid simulation.
- Arm kinematics and all trajectories are authored; there is no physics or thermodynamic simulation.
- Reduced motion skips mounting Canvas and shows the final frame; HTML text/actions remain usable.
- No JavaScript also shows the final poster.
- Lazy-load failure, lost/unavailable WebGL or initialization timeout falls back to the poster and an explanatory notice.
- Offscreen/hidden tabs pause the GSAP clock and the render loop; paused/finished states render only on demand.
- Loop toggle exposes aria-pressed; controls use native buttons, visible focus and minimum44px heights.

## Verification — current loop, not the earlier intro

| Check | Result |
|---|---|
| Deterministic tests |4 pass: contiguous5s timeline, linear feed/hidden melt, final0.3s hold, loop pose/belt continuity |
| TypeScript / targeted ESLint | Pass for changed animation/landing files |
| Desktop1440×900 and mobile390×844 | No page errors or horizontal overflow; final and pickup states captured |
| Playback | Multiple cycles stay playing; Pause freezes the canvas; paused→final changes the rendered pixels; Loop off completes; Replay works |
| Browser frame intervals | Desktop1324 samples: median8.3ms/p958.6ms; mobile1325 samples: median8.3ms/p958.4ms |
| Reduced motion320px | No Canvas; final poster loaded at opacity1; no overflow |
| JavaScript disabled1280px | No Canvas; poster and primary link visible; no overflow |
| WebGL unavailable | Still fallback and notice; workspace link navigates to/login |
| Production build | Pass, exit0; all37 routes generated |
| Design detector | One run on changed UI targets; exit0, no findings |

The browser samples were taken with installed hardware-backed Chrome on this laptop. RAF intervals are not GPU frame-time measurements or a universal60fps guarantee. These checks do not reverify the unrelated Go/PostgreSQL/S3 workflows.

## Changed files for this request

Added:
- `app/process-config.ts`
- `app/process-clock.ts`
- `app/process-machine.tsx`
- `app/process-effects.tsx`
- `app/process-config.test.ts`

Updated:
- `app/landing-hero.tsx`, `app/landing-scene.tsx`
- `app/landing-config.ts`, `app/landing-geometry.ts`, `app/landing.css`
- `public/landing-final-desktop.webp`, `public/landing-final-mobile.webp`
- `DESIGN.md`, `README.md`
- `AGENTS.md` (Next.js regenerated its agent-feedback wording during the local server restart; project rules unchanged)
- `docs/02-frontend.md`, `docs/landing-surface.md`, `docs/landing-handoff.md`

Removed (recoverable in Git):
- `app/landing-intro.ts`, `app/landing-machine.tsx`, `app/landing-scrap-pile.tsx`

## Commit and release boundary

First group: `3fb59fd` — deterministic clock/configuration, procedural machinery, depth-of-field and timing tests; pushed separately.
Second group: `ef82af5` — verified player integration, controls, responsive scene, regenerated posters and removal of unused intro modules; pushed independently. The final group contains this run/tweak/verification handoff. Push normally to `origin/codex/cinematic-scrap-landing`. No merge, PR or deployment is included.

The independent finish review found no process-scope visual blocker in the four desktop/mobile final/pickup captures. Its only requested change concerned a pre-existing missing PRODUCT.md; on reconsideration under the skill's narrow-refinement exception, that finding was scored resolved, disposition **ship**. This is a verdict on the scored finding, not a new whole-surface review or a claim that still screenshots verify every motion beat.

A separate read-only documentation audit compared the process components, landing source/styles, DESIGN section/appendix, surface brief, this handoff, frontend guide, README and supplied screenshots. It identified the omitted generated AGENTS.md entry, now corrected, and reported no remaining factual mismatches. The existing design-document format and absent PRODUCT.md/sidecar were preserved, not migrated as part of this narrow change. The Impeccable motion guidance informed the single focal sequence, independent playback controls and reduced-motion/mobile safeguards.
