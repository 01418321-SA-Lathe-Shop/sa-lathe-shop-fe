# Staff/Admin Overview reporting

Owner approved 2026-10-28: shared shop queue, Job-only creation-cohort current
statuses and one first-completion event per Job. Backend read contract:
SA-Lathe-Shop-BE/docs/014-dashboard.md; implemented on backend develop b806865.

Reads are `/dashboard/overview?range=30d` and `/dashboard/jobs`. The date mode
`first_completed_on` is mutually exclusive with range/status. Both are
Worker/Admin only and contain no financial or private-file fields. Existing
UC commands, permission checks, money handling and memory-only sessions stay
unchanged. No new library or database migration is required. Live reporting
requires a running backend build containing these dashboard endpoints; older
running/deployed APIs must be updated. This task did not deploy or restart
production services.

Ranges are today, 7d, 30d and year (Bangkok calendar-year-to-date); rolling
twelve-month first-completion history is independent of that creation cohort.

`overview-domain.ts` owns DTOs, exact int64 count formatting and read query
construction. The explicitly selected in-browser mock mirrors the new reads
from its existing shared records/events; no hardcoded chart totals or random
history is added. Live errors must never switch to this transport.

Frontend batch 1 adds contract models and mock/domain tests (131 native tests,
TypeScript, ESLint and the 37-route production build passed). Batch 2 replaces
the Staff/Admin menu-directory overview with the responsive report shell,
four status filters, named paginated list, current priority backlog and role-safe
quick links. The navbar/drawer and Customer portal are unchanged. A validated
optional job query selects the existing production detail, including jobs beyond
the first page; all operational forms and permissions remain unchanged.

The report hook cancels superseded reads, preserves same-path data during refresh,
and distinguishes missing reporting APIs from normal errors. Failures are not
zero counts and never trigger mock fallback. Batch 3 adds the real first-completion
heatmap, isolated horizontal scroll, month labels/intensity legend, exact accessible
counts and named day previews. Calendar keys/date input select the paginated named
list independently of the creation-cohort range. Missing audit history is explicit;
streak/average remain unavailable, and no historical dates are fabricated.
Backend SQL passed an isolated PostgreSQL minimal-reporting fixture with 125
jobs; that is not full UC1–UC9/S3/browser-to-live-stack verification.

## Final verification — 2026-10-28

- 134 native tests, ESLint and production build (37 routes) pass. The source
  audit covers 193 source files/67 entrypoints without unreachable sources,
  unreferenced runtime dependencies or unused declarations. Design appendix
  sync and whitespace checks pass. Existing MODULE_TYPELESS_PACKAGE_JSON
  warnings are unchanged; package/dependency configuration was not modified.
- Browser evidence is the explicit in-browser contract mock plus controlled
  network contract fixtures, not a live Go/PostgreSQL/S3 end-to-end run.
  The batched capture/confirmation suite records 36 observations and 42 images:
  Staff/Admin × Light/Dark at 360/768/1280/1440/1920, Medium/Large, day preview
  and filtered list, unchanged mobile menu and loading/empty/missing-API/
  incomplete-history/long-data fixtures. No page error or outer horizontal
  overflow. Filters, calendar keys/date input, retry and existing-job selectors
  work; startup reporting does not request each production job separately.
- Supplemental functional checks add 8 Small-size/theme/role observations at
  360/1440 and a 401 session-clear/redirect check (9 more, 45 total). These
  checks add no screenshot or visual-polish round. All three UI sizes were
  functionally exercised; this is not a full screen-reader/WCAG certification.
- Independent Impeccable finish review: **ship**, no material fixes, at the
  scope of the supplied UI source and contract-fixture evidence. Backend SQL
  and deployed/live integration were not independently certified by that UI
  reviewer. Read-only documentation reconciliation found only precision fixes
  (rem sizing, calendar terminology and live-backend prerequisite), now applied.
- One scoped detector pass: no primary findings; eight advisory type/radius
  notices against the Customer-scoped sidecar. Staff-local values are documented;
  no unrelated sidecar/global-token drift was repaired.

Local QA artifacts (not committed into the application): mirror
`staff-overview-qa.cjs/.json`, `staff-overview-small.cjs/.json`, and
`staff-overview-review/`. No new shipping raster assets or third-party libraries.

## Commit groups

| Repository | Commit | Purpose |
|---|---|---|
| Backend | 7f21b13 | Read-only contract, calendar/filter/summary domain and tests |
| Backend | b806865 | Snapshot-consistent SQL/HTTP reads and isolated PostgreSQL fixture |
| Backend | b09850d | Final verification/publication handoff |
| Frontend | 65a82da | Report DTOs, exact counts and explicit contract mock/tests |
| Frontend | ec86fbc | Dashboard layout, named filters/list, role shortcuts and existing-detail navigation |
| Frontend | `feat(staff): add accessible first-completion activity heatmap` (this handoff) | Calendar/day drill-down, accessibility, tests and final evidence/docs |

All batches use normal pushes to origin/develop, no history rewrite or main push.

## Changed files

Paths below are relative to the respective repository.

| Frontend file | Change |
|---|---|
| src/features/staff-overview/overview-domain.ts | DTOs, count/date/query helpers |
| src/features/staff-overview/overview-resource.ts | Cancelable reads and honest error handling |
| src/features/staff-overview/staff-overview.tsx | Role-aware dashboard composition |
| src/features/staff-overview/overview-panels.tsx | Summary, priority, shortcuts and states |
| src/features/staff-overview/overview-jobs.tsx | Named filtered/paginated jobs |
| src/features/staff-overview/heatmap-domain.ts | Calendar layout, exact intensity and keyboard helpers |
| src/features/staff-overview/overview-heatmap.tsx | Completion history and day inspection |
| src/features/staff-overview/overview.module.css | Scoped responsive theme-inheriting styles |
| src/features/workspace/connected-workspace.tsx | Overview wiring; remove old Staff first-100 counters |
| src/features/workspace/workspace-shell.tsx | Overview title only; navbar/drawer unchanged |
| src/features/production/production.tsx | Validated existing-route job selector |
| src/mocks/routes/mock-dashboard.ts | Explicit role-safe mock reporting reads |
| src/mocks/data/mock-seed.ts | Register new mock reads, no random history |
| tests/features/staff-overview/overview-domain.test.mjs | Contract/calendar/int64/query regressions |
| tests/features/staff-overview/heatmap-domain.test.mjs | Calendar/intensity/keyboard regressions |
| tests/mocks/dashboard.test.mjs | Full totals/rework/privacy/filter regressions |
| scripts/sync-design.mjs | Include scoped dashboard CSS in source appendix |
| DESIGN.md | Implemented layout, states, scales and source snapshot |
| docs/staff-overview-surface.md | Scoped Operate direction contract |
| docs/staff-overview-reporting.md | Contract, evidence, limits and handoff |

| Backend file | Change |
|---|---|
| internal/dashboard/model.go | Public read models and repository interface |
| internal/dashboard/service.go | Calendar/filter/role validation and summary |
| internal/dashboard/service_test.go | Domain regression tests |
| internal/dashboard/handler.go | Authenticated read-only routes |
| internal/dashboard/handler_test.go | Route guard/query validation |
| internal/repository/postgres/dashboard.go | Read-only repeatable-read reports |
| internal/repository/postgres/dashboard_integration_test.go | Guarded fresh-database SQL fixture |
| cmd/api/main.go | Register additive dashboard routes |
| docs/openapi.yaml | Describe report endpoints and filters |
| docs/014-dashboard.md | Contract, calendar semantics and verification |
| PLAN.md | Approved scope, completion and published batches |
