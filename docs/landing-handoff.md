# Thai cinematic landing and five-second process — handoff

## Scope and chosen defaults

Implemented on `codex/cinematic-scrap-landing`, preserving the existing public landing and all connected UC1–UC9 workflows. The latest animation brief supersedes the earlier 10.85-second offcut/spindle intro.

- Format: React Three Fiber + Three.js, driven by GSAP; no new dependencies.
- Fixed near-side-on camera, slightly above the conveyor.
- Bent metal bracket → robotic gripper → left-to-right roller conveyor → box furnace → beveled ingot.
- Near-black background, neutral metallic surfaces, warm orange/copper energy accents.
- Illustrative compressed process, **not a claim that the shop offers melting/recycling services**.
- No captions, sound or delayed headline: real page copy and links remain visible.
- Loop defaults on in code. The visible playback action bar is removed at the owner's request. Tap/click the illustration, or activate it with Enter/Space, to pause/resume without visible controls.
- All public copy, accessible labels and loading/error notices are Thai. Noto Sans Thai is self-hosted through the existing Next/font integration; the LATHE / SHOP CONTROL brand stays unchanged.

## Storyboard

| Time | Step | Onscreen action |
|---|---|---|
| 0.0–1.0s | PICK UP | Gripper closes around a bent offcut and the two-link arm lifts it. |
| 1.0–1.8s | PLACE | Arm transfers the offcut to the belt, opens and returns home. |
| 1.8–3.0s | FEED | Moving slats/rollers carry it into the left furnace opening; the interior brightens. |
| 3.0–3.9s | MELT | Scrap is hidden; warm glow pulses, sparse sparks and a heat-wisp shader accompany molten metal pouring into the exit mold. |
| 3.9–5.0s | OUTPUT | Ingot moves onto the outfeed, cools orange→metal gray, settles by4.7s and holds through5.0s. |

Arm movement uses cubic ease-in-out, conveyor travel is linear, output uses cubic ease-out. Durations are cumulative, so there are no gaps or competing timers. The final0.3s hold is **inside** output, not extra time.

At the loop seam the arm is already home and the belt keeps its phase. The finished ingot retains its pose, then fades during the next cycle's first0.18s while fresh scrap fades in. This does not lengthen the five-second cycle. Setting `loop: false` in configuration lets one cycle finish. The production UI has no loop/replay/final-frame controls. The scene surface supports accessible pause/resume.

## Complete source map

| File | Responsibility |
|---|---|
| `app/process-config.ts` | Five durations, easing selections, final hold, reset fade, loop default, mobile/desktop budgets; pure deterministic pose sampler |
| `app/process-clock.ts` | Lazy GSAP clock; pause/resume/restart/finish/dispose; cycle counting without per-frame React updates |
| `app/process-machine.tsx` | RobotArm, Gripper, Conveyor, Furnace, ScrapAndIngot; procedural geometry, instanced rollers/slats/sparks, molten stream, cooling and heat wisps |
| `app/process-effects.tsx` | Desktop-only restrained BokehPass depth of field, alpha-preserving composition and resource cleanup |
| `app/process-config.test.ts` | Native timing, placement-release continuity, final-hold and seam tests |
| `app/process-materials.tsx` | Shared seeded brushed-metal roughness/bump texture, material context and cleanup |
| `app/landing-scene.tsx` | Lazy Canvas, fixed camera/framing, local RoomEnvironment, lighting, visibility and context-loss handling |
| `app/landing-hero.tsx` | Thai HTML content, chrome-free scene pause target, lifecycle, reduced-motion and static error boundaries |
| `app/landing-geometry.ts` | Bent-bracket extrusion and seeded random generator |
| `app/landing-config.ts` | Thai headline, paragraph and factual platform statistics |
| `app/landing.css` | Existing dark page styling, bounded scene band and responsive controls |
| `app/landing-nav.tsx`, `app/landing-stat-cards.tsx`, `app/dashboard.tsx` | Thai navigation/statistics/workflow/footer; scoped Noto Sans Thai font; existing route targets retained |

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

Use the existing supported Node version. First build needs network access to obtain the newly selected Noto Sans Thai font; deployed visitors receive it from the site's own static assets, not Google. The native test runner may print the repository's existing module-type warning; do not change package module settings just to suppress it.

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
- Machining-mark texture and shared material: `process-materials.tsx`; no downloaded texture.
- Thai font: `Noto_Sans_Thai` in `dashboard.tsx`, scoped by `--font-landing-thai` in `landing.css`.
- Camera framing: `resizeCamera` in `landing-scene.tsx`.
- Desktop/mobile budgets: `processConfig.desktop/mobile`.
- For slower hardware, lower pixelRatio or set depthOfField/motionTrails tofalse.
- Page styling: `landing.css`; do not change workspace tokens for this scene.
- Regenerate both final-frame posters after changing geometry, lighting or camera framing.

## Assets

**You must provide: nothing.** No GLB, HDR, textures or paid models are required.

Generated in code: rounded arm links/joints/gripper, piston rods, joint rings, instanced hex fasteners, beveled access panels/side housing, roller/slat conveyor, bracket, ingot, mold, channel spout, molten stream, sparks, heat wisps, shared brushed texture and local reflection environment. The CSS logo and Geist brand remain; Thai copy uses Noto Sans Thai.

`public/landing-final-desktop.webp` and `public/landing-final-mobile.webp` are transparent captures of the actual final scene, with no text baked in. Embedded ImageDescription metadata records procedural origin, viewport and date. They are not frames copied from the reference video.

To refresh posters: pause the illustration during the final hold (4.7–5.0 seconds), wait for the on-demand draw, hide page UI/horizon/poster/transparent interaction target and any development overlay, capture only `.cinematic-art` against transparency, then encode WebP and retain provenance metadata. Poster sizing uses contain so the full machine remains visible at other aspect ratios.

## Accessibility, performance and honest limits

- Mobile keeps the same5.0s story, reduces sparks24→8 and DPR cap1.5→1, disables DOF/ghost trails and uses a512px shadow map versus1024px desktop.
- Refined movement keeps scrap and belt feed speeds aligned. Pickup height is1.15 world units rather than1.45; retraction receives34% rather than24% of the unchanged placement duration.
- Desktop DOF is deliberately restrained; the main production line stays readable.
- Motion blur is a lightweight two-sample gripper ghost-trail approximation during fast transfer, not full physical velocity-buffer blur.
- Heat shimmer uses animated translucent warm wisps, not scene-refracting fluid simulation.
- Arm kinematics and all trajectories are authored; there is no physics or thermodynamic simulation.
- Reduced motion skips mounting Canvas and shows the final frame; HTML text/actions remain usable.
- No JavaScript also shows the final poster.
- Lazy-load failure, lost/unavailable WebGL or initialization timeout falls back to the poster and an explanatory notice.
- Offscreen/hidden tabs pause the GSAP clock and the render loop; paused/finished states render only on demand.
- No visible action bar. A transparent native button covers the scene, with Thai name/description, pause state via aria-pressed, and an inset focus outline. Click/tap/Enter/Space toggles pause. Reduced-motion/static views omit this interaction.

## Verification — Thai/realism refinement

| Check | Result |
|---|---|
| Deterministic tests |5 pass: contiguous5s timeline, linear feed/hidden melt, placement release continuity, final0.3s hold, loop pose/belt continuity |
| TypeScript / targeted ESLint | Pass for changed animation/landing files |
| Desktop1440×900 and mobile390×844 | No page errors or overflow; Thai copy and loaded Noto Sans Thai verified; no action-bar element; final scenes captured |
| Playback | Scene keyboard activation pauses with identical stationary canvas captures; click resumes; scrolling offscreen stops GPU draw submissions |
| Browser frame intervals | Desktop317 samples: median8.3ms/p9516.7ms; mobile374 samples: median8.3ms/p958.4ms; both rendered during sampling |
| Reduced motion320px | No Canvas or scene button; final poster loaded at opacity1; no overflow |
| JavaScript disabled1280px | No Canvas or scene button; Thai page/poster available; no overflow |
| WebGL unavailable | Still fallback and Thai notice; เข้าสู่ระบบ navigates to/login |
| Production build | Pass, exit0; all37 routes generated |
| Design detector | One run on changed UI targets; exit0, no findings |

The browser samples were taken with installed hardware-backed Chrome on this laptop. RAF intervals are not GPU frame-time measurements or a universal60fps guarantee. These checks do not reverify the unrelated Go/PostgreSQL/S3 workflows.

## Changed files for the five-second implementation (previous request)

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

## Changed files for the Thai/realism refinement

Added: `app/process-materials.tsx`.

Updated:
- `app/dashboard.tsx`, `app/landing-config.ts`, `app/landing-nav.tsx`, `app/landing-stat-cards.tsx`, `app/landing-hero.tsx`, `app/landing.css`
- `app/landing-scene.tsx`, `app/process-machine.tsx`, `app/process-config.ts`, `app/process-config.test.ts`
- `public/landing-final-desktop.webp`, `public/landing-final-mobile.webp`
- `scripts/sync-design.mjs`, `DESIGN.md`, `README.md`, `docs/02-frontend.md`, `docs/landing-surface.md`, `docs/landing-handoff.md`

The visible toolbar markup/styles and its loop/final-frame UI state were removed. No business screens, API contracts or dependencies changed. The design skill guided the bounded refinement, readable Thai hierarchy, material/detail work and preserved accessibility without a visible toolbar.

## Commit and release boundary

Thai/realism implementation: `7cc7d06` — brushed materials, mechanical details, lighting/motion refinement, Thai page/font and visible-toolbar removal; pushed separately from documentation. Current finish review found no visual blocker and scored the outdated DESIGN language/font statements resolved after correction, disposition **ship** limited to that finding. A separate read-only documentation audit found three old README/DESIGN claims about fonts, mobile scene height and public language; all three were corrected and verified resolved. These verdicts cover the reported findings, not a new full accessibility or physical-realism certification.

First group: `3fb59fd` — deterministic clock/configuration, procedural machinery, depth-of-field and timing tests; pushed separately.
Second group: `ef82af5` — verified player integration, controls, responsive scene, regenerated posters and removal of unused intro modules; pushed independently. The final group contains this run/tweak/verification handoff. Push normally to `origin/codex/cinematic-scrap-landing`. No merge, PR or deployment is included.

Historical review of the earlier five-second implementation: the independent finish review found no process-scope visual blocker in the four desktop/mobile final/pickup captures. Its only requested change concerned a pre-existing missing PRODUCT.md; on reconsideration under the skill's narrow-refinement exception, that finding was scored resolved, disposition **ship**. This is a verdict on the scored finding, not a new whole-surface review or a claim that still screenshots verify every motion beat.

Historical documentation audit: a separate read-only documentation audit compared the process components, landing source/styles, DESIGN section/appendix, surface brief, this handoff, frontend guide, README and supplied screenshots. It identified the omitted generated AGENTS.md entry, now corrected, and reported no remaining factual mismatches. The existing design-document format and absent PRODUCT.md/sidecar were preserved, not migrated as part of this narrow change. The Impeccable motion guidance informed the single focal sequence, independent playback controls and reduced-motion/mobile safeguards.
