# Customer jobs — request-card adaptation

Date: 2026-10-28 · Mode: Operate · Branch: `develop`

## Direction and boundary

Owner request: “redesign งานผลิต like คำขอผลิต”. This is a code-led adaptation
of the incumbent Customer request list, not a new identity or feature workflow.
Reuse its actual `customer-requests.module.css`: 2 columns above 640px, 1 at 640px and below,
24px/16px gaps, 24px/20px padding, 16px corners, existing shadow, colors, icons,
badge mapping and native stretched-link keyboard treatment. No raster assets.

Only the normal Customer `/customer/jobs` list changes. Existing Job detail,
`view=history`, inspection and payment views, sidebar/navbar/full-screen menu,
Light/Dark preference and role permissions remain intact. No new route, API call,
dependency, production mutation or supplier/stock/cost access is introduced.

## Implemented behavior

- Search existing authorized Job/Request collections literally by request number
  or description; exact int64 values are never converted to Number. Preserve
  existing server job order rather than invent a creation date/sort key.
- Tabs: all plus original `queued`, `in_progress`, `completed`, `cancelled` values
  and existing Thai labels. Counts match the applied search before status filter;
  loading is ellipsis, unavailable counts are dash, and incomplete reads retain
  the existing warning. Delivery/invoice states do not become production states.
- `q/status` URLs persist filters; keyed search form resets on clear/navigation.
  Original 20-item local paging resets when filters change and clamps after reads.
- Cards show request reference/name/quantity, production badge, actual **request**
  creation/requested dates, existing unconfirmed-shop-deadline wording, same-job
  free-rework note when present, separate delivery summary and original next-action
  wording. They open `/customer/jobs?job=<original UUID>` just as the prior rows.
- Footer uses existing delivery data, not a new customer/profile fetch. Missing
  request metadata has honest loading/error wording, not fabricated dates,
  quantities, job numbers, promises or progress percentages.
- Four static decorative skeletons share one status announcement. Read failure
  remains a retry/error, not a successful empty list; initial and filtered empty
  views retain relevant recovery links. No confirmation/financial logic changes.

## Changed files

| File | Purpose |
| --- | --- |
| `src/features/customer/customer-job-list-domain.ts` | Literal job search and query-scoped real-status counts |
| `src/features/customer/customer-job-cards.tsx` | Request-styled factual cards, status pills and static skeleton |
| `src/features/customer/customer-job-list.tsx` | Search/status URL state, existing collection feedback and safe local paging |
| `src/features/customer/customer-jobs.tsx` | Compose the new list only for normal jobs mode; all other views unchanged |
| `tests/features/customer/customer-job-list-domain.test.mjs` | Exact references, literal matching, order, status counts and missing metadata |
| `tests/features/customer/customer-job-cards.test.mjs` | Original destinations, shared styling, safe fields, delivery/rework, skeleton/count semantics |
| `DESIGN.md` | Current implemented visual contract and change log |
| `docs/customer-job-list-restyle.md` | Scope, file ownership and verification limits |

## Verification

- 105 native tests pass; TypeScript, ESLint and production build (37 unchanged
  routes) pass. Source audit has no unused/unreachable/dependency findings.
- Chrome explicit contract mock: 360/640/768/1280/1920px Dark and 360/1280px
  Light; no horizontal overflow; 2/1 columns match the breakpoint. Computed
  desktop card padding/radius/shadow/grid gap match Request cards exactly.
- Keyboard Enter opens the original detail and existing inspection form. Payment
  and history retain original surfaces. Status filter/search/clear work and clear
  resets the search text. No page errors in the recorded mock flow.
- Synthetic contract reads: loading, read-error/retry, initial empty, 25-record
  paging (20 + 5), filter reset to seven queued jobs, exact int64 search, long
  unbroken text/rework at 360px, no internal stock/production/supplier reads.
- Detector ran once on changed UI targets with no findings. No new stylesheet or
  palette tokens were introduced. Full accessibility/zoom/cross-browser and live
  Go/PostgreSQL/S3 verification remain pending; these are scoped mock/browser
  and static checks, not production-integration approval.
- Fresh finish review inspected all 12 viewport/state captures, source, existing
  Request card reference and both QA reports. Disposition: **ship**, no material
  findings, scoped strictly to this Customer normal-job-list adaptation.
- Independent documentation comparison confirmed source alignment; its five
  scoped prose/breakpoint clarifications were applied without changing code.

## Commit checkpoints

1. `89e471f` — presentation-only search/count helper and native regressions,
   verified and pushed before the UI implementation.
2. Request-styled job-card UI, coupled component tests and design documentation.

The existing sidecar drift remains out of scope; this extension uses the actual
incumbent styles and does not repair or replace the app's design system.
