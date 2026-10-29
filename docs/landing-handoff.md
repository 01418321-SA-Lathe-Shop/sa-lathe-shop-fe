# Landing lathe turning scene — handoff (2026-10-29)

Supersedes the five-second robot arm → conveyor → furnace → ingot loop (see git history for the earlier handoff). The previous scene showed a process this shop doesn't do. This one shows turning on a slant-bed CNC lathe.

## Process and storyboard (16.0 s loop)

| Time (s) | Stage | What happens | Realism mechanics |
|---|---|---|---|
| 0.0–1.8 | load | The bar feeds out of the spindle bore to the jaw stop. | Minimum-jerk travel plus a windowed damped settle |
| 1.8–2.8 | clamp | Three stepped jaws close onto the bar. | Overshoot past the stock radius, then ring-out; the bar lifts from its slight sag as it centres |
| 2.8–4.8 | spinUp | The spindle ramps to 14 rev/s; coolant opens over the last 0.4 s. | First-order lag (τ 0.35 s); jaws fade into a swept band as speed rises |
| 4.8–5.8 | approach | The turret moves fast, overshoots slightly, then feeds slowly to touch-off. | Two minimum-jerk segments plus a settle |
| 5.8–11.0 | turn | A diagonal entry onto the chamfer, then a constant-feed contour pass: steps, groove, chamfer. | Trapezoidal feed and small multi-sine chatter; the shader cut sits exactly at the tip; chips, coolant jet and splash, a wet band behind the tip, a warm tip glow |
| 11.0–12.2 | retract | The tool backs off radially, then returns to park; coolant stops. | Drips fall from the nozzle |
| 12.2–14.6 | spinDown | The spindle coasts down. | Longer lag (τ 0.45 s) than spin-up |
| 14.6–16.0 | eject | The jaws open, the part slides clear and falls into the trough. | Gravity fall with slight yaw; an identical tray copy holds the pose so the next cycle has no pop |

**Interaction: plays on load.**
- It pauses offscreen, on a hidden tab, and via the visible pause pill.
- Scroll-scrubbing was rejected: it ties spindle inertia to how fast someone scrolls, which destroys the sense of weight, and scroll-jacking the hero hurts usability.
- Mouse-reactive motion was rejected because it conflicts with the brief's steady camera.

## Where to tune

Everything is in `latheConfig` in `src/features/landing/process-config.ts`:

| Key | Controls |
|---|---|
| `stages` | Durations. Later starts recalculate automatically. |
| `motion` | Load travel and settle; jaw stroke and settle; spindle speed and lags; displayed-spin cap and blur thresholds; rapid share and settle; feed ramp; retract and park; chatter; eject and gravity |
| `effects` | Chip and coolant lifetimes, valve timing, drip time, tip-glow strength, mist drift |
| `camera` | Position, target, drift, world width (desktop/mobile), focus lag, depth-of-field aperture and max blur |
| `desktop` / `mobile` | Pixel ratio, chip/coolant/mist counts, depth of field, shadow-map size, mesh segments |
| `loop` | Whether the cycle repeats |

The finished part shape is `finishedProfile`: distance from the free end against radius.

`sampleLathe(time, cycle)` is pure and closed-form, which keeps pause, the loop seam and the tests deterministic. `tests/features/landing/process-config.test.ts` covers:
- stage continuity
- rest-to-rest helpers
- the jaw contact overshoot
- spindle inertia, and the spindle stopping before the jaws open
- tool-on-contour
- monotonic cutting
- coolant gating
- seam continuity

## Source map

| File | Responsibility |
|---|---|
| `process-config.ts` | `latheConfig`, profile, stages and the pure sampler |
| `process-clock.ts` | GSAP linear clock (unchanged API) |
| `landing-scene.tsx` | Canvas, camera framing and drift, lights, procedural dark-bay PMREM |
| `process-effects.tsx` | Desktop BokehPass with damped focus on the tool tip |
| `process-materials.tsx` | Seeded ground, paint and turning-mark textures; `Metal` / `Paint`; palette |
| `machine/lathe-bed.tsx` | Base, trough, slant bed and ways, splash guard, static tailstock, pillar |
| `machine/headstock-chuck.tsx` | Headstock, chuck body, anisotropic face, jaws, swept-band blur |
| `machine/carriage-tool.tsx` | Turret, holder, TiN insert, coolant hose and nozzle, tip glow, saddle; tool-frame helper |
| `machine/workpiece.tsx` | Shader-cut lathe surface, physical material, matching shadow depth material, tray copy |
| `machine/chips.tsx`, `machine/coolant.tsx`, `machine/mist.tsx` | Instanced or point particles |
| `landing-hero.tsx` | Visible pause pill, Thai scene description; lifecycle unchanged |

## Assets

**You must provide: nothing.** All geometry, textures and the reflection environment are generated in code.

Optional upgrades for more realism (not wired yet; each is a separate step):
- **HDRI.** A CC0 industrial interior from Poly Haven, 2K `.hdr`, could replace the procedural reflection environment through three's bundled `RGBELoader`.
- **Lathe model.** Commission a `.glb` from a 3D artist with:
  - separate named nodes: `chuck`, `jaw_1`–`jaw_3`, `carriage`, `cross_slide`, `tool_insert`, `tailstock`, `coolant_nozzle`, `bed`
  - metre scale and PBR metal/roughness with 2K textures
  - under about 3 MB after meshopt compression
  - no workpiece, because the cut stays shader-driven

Honest limit: procedural geometry gives a believable, stylised-realistic machine with correct motion, materials and light. It isn't a photoreal render. Chips and coolant are particle approximations, not simulations.

## Posters

`public/landing-final-desktop.webp` (1440×315) and `public/landing-final-mobile.webp` (390×240) are transparent-alpha captures of the 14.2 s frame (finished shaft in the chuck), with provenance EXIF.

To refresh them:
1. Run the dev server.
2. Open `/` in Chrome at viewport 1455×900 (scrollbar included) and 390×844.
3. Set a transparent default background and hide everything except `.cinematic-canvas`.
4. Clip `.cinematic-art` at 14.2 s after ready.
5. Encode to WebP with alpha.

## Accessibility and performance

- **Reduced motion:** no Canvas and no toggle; the poster shows at full opacity. No-JavaScript, lazy-load or WebGL failure, and the 10 s timeout also fall back to the poster.
- **Pause control:** a visible pill (หยุดชั่วคราว / เล่นต่อ) with `aria-pressed` and a 44px target. The scene description is a screen-reader-only paragraph.
- **Rendering:** offscreen and hidden tabs pause both the clock and the renderer. Paused frames render on demand only.
- **Measured** in installed Chrome on this laptop (Intel Iris Xe, D3D11), as `requestAnimationFrame` intervals, not GPU timings:

| Viewport | Median | p95 |
|---|---|---|
| Desktop 1440×900 | 8.5 ms | 17.1 ms |
| Mobile 390×844 | 8.3 ms | 8.5 ms |

## Verification (animation batch)

| Check | Result |
|---|---|
| `npm test` | 149 pass, including 9 new timeline tests |
| Lint, `tsc --noEmit`, `npm run audit:source` | Pass |
| `npm run build` | Pass |
| Captures at 1440 / 390 / 360 px | Load, cut, coast-down and eject frames reviewed; no horizontal overflow; no page exceptions |
| Pause | Two captures 1.5 s apart are byte-identical; focus kept on the button |
