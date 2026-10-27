# Lathe Shop Control — Frontend

Next.js App Router, React, TypeScript and Tailwind CSS. Read `docs/02-frontend.md` before changing workflows and `DESIGN.md` before changing UI.

## Cinematic landing

The public homepage demonstrates a five-second loop: robotic pickup → conveyor → furnace → cooling ingot, using procedural Three.js, React Three Fiber and one GSAP clock. This is an illustrative process, not a claim about the shop's services. All models are generated in code; no `.glb` files, paid assets, backend endpoint, or additional environment variables are required for the landing page.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If a dev server is already running for this checkout, use it instead of starting another. Real login/workspaces continue to use the existing backend setup; see `docs/11-phase-ten-handoff.md`.

The page is Thai, with self-hosted Noto Sans Thai. Change copy in `app/landing-config.ts`; change the five durations, easings, loop default and render budgets in `app/process-config.ts`. There is no visible playback bar: tap/click the illustration or use Enter/Space when focused to pause/resume. Reduced motion shows the final-frame image without mounting WebGL. Brushed textures, fasteners, piston rods and soft shadows are procedural. See `docs/landing-handoff.md` for the storyboard, complete source map, asset origins and verification.

```bash
npm run build
npm start
```

`npm start` requires a successful production build. The approved feature lives on `codex/cinematic-scrap-landing`; do not merge it into `develop` or deploy without the owner's direction.

Landing copy uses Noto Sans Thai via `next/font`; the wordmark and unchanged workspace retain Geist. The first build downloads the Thai font and then self-hosts it; no manual font file or new package is required.
# Native tests

Run `npm test` from the project root. The dependency-free runner discovers all
`.test.ts` and `.test.mjs` files recursively under `tests/` on Windows and Unix.
Tests mirror feature/shared-code ownership; they do not live in App Router folders.

