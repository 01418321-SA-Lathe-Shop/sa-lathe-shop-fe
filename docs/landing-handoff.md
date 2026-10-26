# Cinematic landing handoff — 2026-10-27

## Scope and defaults

Branch: `codex/cinematic-scrap-landing`, based on `develop` at `45118bb`. Only the public homepage is redesigned. No backend, auth, role permission, invoice/payment, stock, or UC1–UC9 behavior changes. Existing framework versions are retained; approved runtime additions are `three@0.186.1`, `@react-three/fiber@9.8.2`, `gsap@3.15.0`; development types `@types/three@0.186.0`. Exact installations are locked in `package-lock.json`.

The owner supplied a10.87s reference video and approved the matching black/copper composition. Use Lathe Shop Control, English public copy, a polished rod as output, and factual9-workflow/3-role stats. The lathe processes one solid offcut; mixed scrap is visual staging, not a claim that the business melts chips into new bars. No recycled-content percentage or turnaround guarantee is invented. No audio or loop.

## Run and customize

1. Use the existing project's Node/npm environment compatible with its installed Next.js release.
2. Run `npm ci`, then `npm run dev` and open `http://localhost:3000`. Reuse an existing server for this checkout when present.
3. Landing needs no API, models, secrets, or new environment variables. Login/registration targets the existing `/login` and `/register`; connected workflow setup remains in `docs/11-phase-ten-handoff.md`.
4. For production: `npm run build`, then `npm start`. Never treat compilation alone as a successful build.
5. Edit `landing-config.ts` for headline, paragraph, captions, statistics, scene palette, stage duration/easing, counts, pixel ratio and mobile speed. Navigation, CTA, footer and below-fold copy remain in their components; UI colors remain in `landing.css`. Headline DOM spans adapt automatically to the configured text.

| Component/file | Responsibility |
|---|---|
| `app/dashboard.tsx` | Server-rendered landing composition, factual below-fold workflow/capabilities and existing auth links |
| `app/landing-hero.tsx` | Client-only scene boundary, media preferences, loading/skip/error handling, timeline lifecycle and real HTML content |
| `app/landing-nav.tsx` / `landing-stat-cards.tsx` | Logo/working anchors/auth link;9 workflows and3 roles |
| `app/landing-config.ts` | Shared public copy and choreography/render settings |
| `app/landing-intro.ts` | One lazy-loaded GSAP timeline for DOM + mutable scene clock; explicit cleanup |
| `app/landing-scene.tsx` | Lazy Canvas, local reflection environment, lights, resize, visibility and context-loss handling |
| `app/landing-machine.tsx` | Procedural collet, spindle, orange coil, raw offcut, finished rod and pooled sparks |
| `app/landing-scrap-pile.tsx` / `landing-geometry.ts` | Deterministic instanced metal shapes, chips, trajectories and reusable geometry |
| `app/landing.css` | Scoped dark composition, responsive layouts, still fallback and accessibility states |

### Timeline

| Stage | Start | Duration | Ease |
|---|---:|---:|---|
| dim |0.00s|0.35s|power2.out|
| captions/tumble |0.35s|2.25s|power2.inOut|
| settle |2.60s|0.75s|power3.out|
| headline |3.35s|1.20s|power3.out|
| ui |4.55s|0.60s|power2.out|
| enter |5.15s|1.20s|power3.inOut|
| feed |6.35s|1.35s|power2.inOut|
| process |7.70s|1.55s|sine.inOut|
| output |9.25s|1.60s|power3.out|

The master clock ends at10.85s; mobile scales the timeline by0.55 (about5.97s). No physics dependency: authored seeded trajectories make the pile repeatable. Reservations, material valuation and other backend data do not participate in this illustrative scene.

## Assets and graceful failure

No user-supplied files are needed. Offcuts, brackets, bar ends, bolt/nut-like pieces, shavings, machine and rod are procedural Three.js geometry. The existing CSS logo and Geist font remain. Reflection lighting uses a locally generated RoomEnvironment, not an external HDR/model CDN.

| File | Origin / purpose |
|---|---|
| `public/landing-final-desktop.webp` | Original1440×900 transparent final-frame scene capture; no UI text baked in; approximately33KB |
| `public/landing-final-mobile.webp` | Original390×432 transparent mobile scene capture; no UI text; approximately9KB |

Both WebP files embed ImageDescription provenance naming the original procedural scene, viewport and capture date. They were captured from these components, not copied from the reference video. A capture must isolate `.cinematic-art`, hide the poster/UI/horizon, keep transparent page backgrounds and encode only the scene. Regenerate the corresponding poster if changing model geometry, lighting, final pose or scene framing. A custom `.glb` model is optional future scope, not a required missing asset.

- Reduced motion: real text and final artwork immediately; do not mount animated WebGL.
- Skip before ready: stop mounting the scene and show the finished still; Skip while playing seeks the shared timeline and finishes the 3D pose.
- Keyboard navigation: focusing a navigation/CTA link reveals content immediately without moving focus.
- Missing JS: `<noscript>` restores readable content and the static artwork.
- Failed/lost WebGL, failed lazy scene, or10s initialization timeout: static artwork and usable links remain. No unhandled application crash is intended.
- Hidden tab/offscreen: pause the master clock and renderer. Finished pose: on-demand rendering rather than a permanent animation loop.
- Small screens: stacked text above a27rem scene; approximately12 main scraps/28 chips/16 sparks instead of36/80/48, DPR capped at1 rather than1.5. Below380px, caption/stat layout changes to avoid collisions. Existing large-text preference is preserved; the public page stays dark without changing the saved workspace theme.

## Verification evidence

The verification story is public route → local lazy scene/animation assets → finished composition → real auth/section navigation. There is no new API or database boundary to test.

| Check | Evidence |
|---|---|
| TypeScript | Passed after component integration |
| Targeted ESLint | Landing components and dashboard passed; final check recorded at handoff |
| Design detector | Returned `[]` for changed landing targets |
| Desktop1440×900 / mobile390×844 | Normal intro completes; canvas present; no page errors or horizontal overflow; final screenshots inspected |
| GPU/frame sampling | Installed headless Chrome on Intel Iris Xe/D3D11; desktop1110 RAF samples median8.4ms / p9516.8ms; mobile701 median8.3ms / p959.6ms |
| Reduced motion | Static poster loads, no Canvas, no Skip intro control |
| Large text + saved Light |320px and1280px: no document overflow; text and mobile scene remain separated; cinematic page remains scoped dark |
| Skip/loading and keyboard | Explicit Skip reveals content during delayed scene loading; keyboard focus reveals page; workspace link navigates to `/login` |
| JavaScript disabled | Headline and CTA visible with static artwork |
| WebGL unavailable | Forced null WebGL context reaches still fallback; zero page errors |
| Production build | Passed: compile, TypeScript, all37 static routes and final optimization; exit0 |

RAF sampling measures browser frame intervals in this environment, not a universal guarantee of GPU render time or60fps on every laptop. Hardware-backed Chrome was used for valid final captures; the initial software-rendered diagnostic captures were discarded as final evidence. No real Go/PostgreSQL/S3 regression claim is made by this landing-only work. Existing dev server was reused and not stopped.

## Changed files

- `package.json`, `package-lock.json`
- `app/dashboard.tsx`
- `app/landing-config.ts`, `app/landing-geometry.ts`, `app/landing-machine.tsx`, `app/landing-scrap-pile.tsx`, `app/landing-scene.tsx`
- `app/landing-intro.ts`, `app/landing-nav.tsx`, `app/landing-stat-cards.tsx`, `app/landing-hero.tsx`, `app/landing.css`
- `public/landing-final-desktop.webp`, `public/landing-final-mobile.webp`
- `DESIGN.md`, `scripts/sync-design.mjs`
- `docs/02-frontend.md`, `docs/landing-surface.md`, `docs/landing-handoff.md`, `README.md`

## Commit groups and release boundary

1. `22d6d02` — procedural scene/configuration and approved dependencies; pushed independently.
2. `2174370` — homepage/choreography/accessibility/posters + matching design specification; pushed independently.
3. `17d80b7` — sharp no-JavaScript final artwork and corrected design summary; pushed independently.
4. Final run/asset/verification handoff.

### Finish review

The independent finish reviewer found one material issue: bright scrap behind the glass stat cards reduced label contrast. A dark translucent base was added, both viewports recaptured, and the reviewer scored that finding **resolved**, disposition **ship**, with worst-case contrast above8:1. This is a limited-scope verdict on that finding, not a claim of complete accessibility compliance. A separate read-only documentation audit confirmed scope/timing/assets and identified the obsolete breakpoint/build-result prose, corrected here and in `DESIGN.md`.

The final no-JavaScript check also confirmed the poster is fully opaque, unblurred and loaded (`opacity:1`, `filter:none`, natural width1440). No development overlay is baked into either generated poster. Final targeted ESLint, design snapshot and whitespace checks passed. The production build was rerun after the final implementation correction; it includes TypeScript and all37 static routes.

Use normal pushes to `origin/codex/cinematic-scrap-landing`. Do not merge to `develop`, alter `main`, create a PR or deploy without separate direction.
