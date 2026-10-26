# Lathe Shop Control — Frontend

Next.js App Router, React, TypeScript and Tailwind CSS. Read `docs/02-frontend.md` before changing workflows and `DESIGN.md` before changing UI.

## Cinematic landing

The public homepage demonstrates offcut → machine → polished rod with procedural Three.js, React Three Fiber and one GSAP timeline. All models are generated in code; no `.glb` files, paid assets, backend endpoint, or additional environment variables are required for the landing page.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). If a dev server is already running for this checkout, use it instead of starting another. Real login/workspaces continue to use the existing backend setup; see `docs/11-phase-ten-handoff.md`.

Change copy, stage durations/easing and render budgets in `app/landing-config.ts`. Reduced motion shows the final-frame image without loading WebGL; Skip intro is available during loading/playback. See `docs/landing-handoff.md` for component ownership, asset origins and verification.

```bash
npm run build
npm start
```

`npm start` requires a successful production build. The approved feature lives on `codex/cinematic-scrap-landing`; do not merge it into `develop` or deploy without the owner's direction.

Typography uses the existing Geist family via `next/font`; no new font assets are required.
