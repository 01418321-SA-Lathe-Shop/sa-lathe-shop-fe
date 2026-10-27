# Refactor handoff — 2026-10-27

This is a behavior-preserving cleanup on `develop`. App Router special files and route
directories remain in place. No backend contract, role permission, entity status, VAT
policy, pricing rule, authentication storage policy or deployment is changed.

## Ownership

| Location | Responsibility |
| --- | --- |
| `app/` | Route/special files, favicon and the single global stylesheet |
| `src/features/landing/` | Server-rendered public page, real copy, lazy client scene, animation config and machinery components |
| `src/features/auth/`, `src/features/workspace/` | Login/register, memory-only sessions, role shell and navigation |
| Other `src/features/` domains | UC screens, forms and pure business-domain helpers |
| `src/components/appearance/` | Icons/brand, settings and preference subscriptions |
| `src/components/ui/`, `src/hooks/`, `src/lib/` | Shared form/upload feedback, API hooks, transport/types and display formatting |
| `src/mocks/core/`, `data/`, `routes/` | Explicit mock transport, fictional scenarios and domain endpoint implementations |
| `tests/` | Mirrored native tests, endpoint contract fixture and architecture checks |

Use relative imports within features and Node-tested modules. The existing root alias
is unchanged. Avoid general barrel files that combine Server Components, Client
Components or lazy-loaded scene code. The small machinery facade is intentional.
API types are separated from the transport, which keeps compatible type re-exports.
The mock registries retain their original endpoint order; helper consumers import
their domain owner directly rather than importing through a registration facade.

## Styles and compatibility

- `app/globals.css` contains only global tokens, document theme/scale, base elements and shared motion.
- Appearance, authentication, workspace, shared workflow and landing rules are colocated CSS Modules.
- Modules use a local owner scope with `:where()` and preserve existing descendant class names.
  This prevents cross-surface leakage without changing selector specificity, dynamic status
  classes, browser test selectors, markup semantics or interaction behavior.
- `src/components/ui/style-scopes.ts` fixes stylesheet import order: appearance/auth/shell
  rules first, workflow overrides last. The old files relied on that cascade; changing
  it caused a four-pixel mobile header regression, corrected before this handoff.
- The existing Tailwind 4 dependencies and global import are retained. The existing
  Turbopack loader excludes `.module.css`, allowing native Next.js module scoping/exports.
- The cleanup removed 588 selector occurrences whose required classes were absent from
  source literals and dynamic class prefixes. `css-cleanup.json` records original source
  lines and reasons. Ambiguous pseudo-class selectors are retained, not guessed away.
- Only the approved starter assets were deleted: `file.svg`, `globe.svg`, `next.svg`,
  `vercel.svg`, `window.svg`. They are recoverable from Git. Both landing posters and
  the favicon are preserved byte-for-byte.

### Retained uncertainties / future Tailwind work

- The three ambiguous selectors listed in `css-cleanup.json` need a separately scoped
  decision before removal. No additional files/dependencies are proposed for deletion.
- `formatTHB` remains covered by tests but has no current production caller; keep it
  until its intended compatibility/public-helper role is explicitly retired. Exact
  string-based API money formatting and date formatting are not interchangeable.
- Repeated form spacing, button variants, responsive shell rules, status colors and
  light/dark overrides are candidates for a future utility/token migration. This task
  does not perform that migration or change visual design.
- Some historical filenames/export names retain `backend`/`Live` terminology for
  compatibility; their feature directories now identify the actual frontend owner.

## Verification

Run `npm test`, `npm run lint`, `npm run audit:source`, TypeScript, the design snapshot
check and `npm run build`. The runner discovers native test files on Windows and Unix;
no new test/dead-code dependency is required.

The audit uses the installed TypeScript compiler: route/test entrypoints, static
imports, type re-exports and lazy imports. It reports unreachable modules, unreferenced
runtime dependencies, unused local declarations and empty source files. It is not proof
that every externally exported function is needed; retained uncertainties are above.

Evidence for this cleanup:

- 58 native tests pass, including all 80 mock endpoint methods/paths/access policies in
  their original order, unchanged route files, resolvable imports, one global stylesheet
  and the approximate 300-line application-source boundary.
- Full lint, TypeScript, the production build (37 generated routes) and source audit pass.
- Ten desktop/mobile baseline layouts match for landing, login and all three role
  overviews, with unchanged headings, no overflow and no browser runtime errors.
- Settings retain selected radio states after hydration, persist across reloads and
  work for the current page when browser storage is blocked.
- Browser role navigation uses the explicit mock backend; existing native tests cover
  request/upload validation, permissions, exact money and uncertain-write retry behavior.
- All 23 permitted role-navigation screens load without runtime errors or horizontal
  overflow. The real WebGL scene mounts, runs through a full loop, and retains keyboard
  pause/click resume with no visible playback bar.
- These checks do not establish real Go/PostgreSQL/S3 integration or a universal GPU
  performance guarantee. Existing illustrative content and reduced-motion poster assets
  are unchanged; the cleanup does not redesign them.

## Commit checkpoints

| Batch | Commit | Purpose |
| --- | --- | --- |
| 1 | `31014d9` | Relocate tests and add the cross-platform runner |
| 2 | `d11d682` | Shared infrastructure, auth and application shell |
| 3 | `0ccbc7b` | Landing organization, machinery split and approved asset deletion |
| 4 | `05c9f23` | Manufacturing feature ownership and native CSS Module loader compatibility |
| 5 | `a0b2cd5` | Mock domain routes and registration/permission regression test |
| 6 | Final stylesheet/documentation checkpoint | Global stylesheet consolidation, audited CSS cleanup and architecture guardrails |

All checkpoints preserve published history and use normal pushes. See `files-changed.md`
for the complete changed/moved-file inventory relative to the pre-cleanup baseline.
