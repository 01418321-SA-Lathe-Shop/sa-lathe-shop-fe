# Lathe Shop Control — Frontend

Next.js App Router, React, TypeScript and Tailwind CSS. Read `docs/02-frontend.md` before changing workflows and `DESIGN.md` before changing UI.

## Cinematic landing

The public homepage demonstrates a five-second loop: robotic pickup → conveyor → furnace → cooling ingot, using procedural Three.js, React Three Fiber and one GSAP clock. This is an illustrative process, not a claim about the shop's services. All models are generated in code; no `.glb` files, paid assets, backend endpoint, or additional environment variables are required for the landing page.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If a dev server is already running for this checkout, use it instead of starting another. Real login/workspaces continue to use the existing backend setup; see `docs/11-phase-ten-handoff.md`.

Change copy in `app/landing-config.ts`; change the five step durations, easings, loop default and render budgets in `app/process-config.ts`. Reduced motion shows the final-frame image without mounting WebGL. Controls: Pause/Play, Loop on/off, Replay and Show final frame. See `docs/landing-handoff.md` for the storyboard, complete source map, asset origins and verification.

```bash
npm run build
npm start
```

`npm start` requires a successful production build. The approved feature lives on `codex/cinematic-scrap-landing`; do not merge it into `develop` or deploy without the owner's direction.

Typography uses the existing Geist family via `next/font`; no new font assets are required.
