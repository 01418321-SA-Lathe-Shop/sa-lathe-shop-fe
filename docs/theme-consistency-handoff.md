# Theme consistency — 2026-10-28

## Scope

Repair shared Light/Dark preference propagation and the mismatched Light navbar.
Preserve existing layouts, routes, Thai labels, roles, APIs, calculations and
business transitions. No dependencies or backend changes.

## Implemented

- Customer now reads the same `lathe-theme` preference as the root provider,
  Staff, Admin and Auth. Saved choice wins; otherwise the system scheme is used.
  System-change subscriptions are cleaned up when consumers unmount. Server
  snapshots remain stable Dark; this does not claim a pre-hydration flash fix.
- Failed localStorage writes retain explicit display preferences in page memory,
  including when old storage is still readable. Matching cross-tab storage events
  refresh the preference. This fallback is not persisted across reload.
- Each Customer settings instance has unique native radio-group names, preventing
  cached App Router trees from interfering with the visible theme/size controls.
- Customer desktop topbar, sidebar, mobile navbar and full-screen menu use the
  current canvas token. All Customer surfaces inherit theme-aware ink, fields,
  borders, links, tabs, focus and semantic badges. The existing notification
  dropdown/full-screen sheet inherits the same surfaces.
- Light copper text is separated from filled orange actions. Primary hover keeps
  dark text; danger foreground switches appropriately. Status-tint backgrounds
  derive from each theme's semantic colors. Placeholder text is no longer faded
  beyond the existing muted color. Request/Job card focus uses the shared token.
- Overview no longer needs its own Light-only link/focus/information patch.
  Staff/Admin Light topbar/sidebar use the shared warm canvas. The document root
  explicitly advertises the native `color-scheme` in either theme.

Quotation paper isolates its primary/secondary ink from the workspace theme;
small print remains readable on its original white canvas. Uploaded PO/PDF/image
content and print remain original document colors. No uploaded file is inverted
or altered. The public cinematic landing
keeps its approved dark art direction; it is not workspace chrome.

## Verification

| Check | Evidence / scope |
| --- | --- |
| Native tests | 125 passing; preference tests cover shared/default/saved snapshots, system changes, storage failure, subscriber cleanup; palette tests check text/action/status-tint contrast, paper ink and token/radio contracts |
| Quality gates | ESLint, TypeScript, production build of 37 routes, source/import audit, design-source sync and whitespace checks |
| Customer browser checks | Explicit contract mock in Chrome: 12 route/view contexts in both themes at desktop 1440px and mobile 360px, plus Request/quotation details; 54 theme/geometry observations, no horizontal overflow or page errors |
| Navigation/overlays | Actual settings radios switch both ways after navigating retained trees; desktop bell, mobile full-screen menu and notification sheet use the selected palette |
| Persistence | OS Light with no saved choice; cross-tab preference event; saved theme after reload to Login; failed write with readable stale preference and subsequent client navigation |
| Other roles | Staff/Admin actual settings controls switch Light/Dark; Light topbar/sidebar match the shared canvas; no page errors |

The 12 Customer contexts are Overview, Requests, Jobs, Job history, Quotations,
Deposit/PO, Payments, Delivery inspection, Notifications, Memberships, Settings
and the request wizard. These are checks of existing views, not new routes.

Browser artifacts are kept outside the app repository in the local SA Project
mirror: `theme-qa.cjs/json`, `theme-role-qa.cjs/json`, `theme-confirm.cjs/json`,
`theme-contact.png` and `theme-review/` (40 Customer + four Staff/Admin images,
plus two paper detail crops). Final captures wait for settled visible data;
targeted confirmation checks paper computed ink and nine loaded notification
rows in both theme/viewport combinations. Modal screenshots are viewport-only.
Tests use demo data,
not live Go/PostgreSQL/S3. This is not whole-app WCAG certification, screen-reader
or cross-browser verification. Uploaded file content is intentionally excluded
from palette assertions.

Impeccable's bounded finish verdict is **Ship**: the scoped small-paper-text
correction and settled-notification evidence were scored resolved. The earlier
whole-paper invisibility observation was withdrawn after original-resolution
and computed-color confirmation. This verdict covers those reviewed issues,
not a new whole-application accessibility certification.

## Changed files / commit groups

| Group | Files | Purpose |
| --- | --- | --- |
| Shared preference synchronization | `src/components/appearance/appearance-preferences.ts`, `src/features/customer/customer-preferences.ts`, `tests/components/appearance/appearance-preferences.test.ts`, `DESIGN.md` | Single preference source, storage fallback, system subscription and regressions |
| Theme-aware workspace presentation | `app/globals.css`, `src/features/customer/customer.module.css`, `src/features/customer/customer-requests.module.css`, `src/features/customer/customer-overview.module.css`, `src/features/customer/customer-documents.module.css`, `src/features/customer/customer-settings.tsx`, `src/features/workspace/workspace.module.css`, `tests/features/customer/customer-theme.test.mjs`, `DESIGN.md`, `docs/theme-consistency-handoff.md` | Chrome/surfaces/contrast, isolated settings radio groups, document ink and verification handoff |

Existing `.impeccable/design.json` preview drift is not repaired as a side effect.
Dark baseline frontmatter remains intact; `DESIGN.md` prose and generated source
appendix describe the authoritative runtime Light/Dark rules.
