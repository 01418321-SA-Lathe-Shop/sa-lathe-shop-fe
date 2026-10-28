# Staff/Admin Overview reporting

Owner approved 2026-10-28: shared shop queue, Job-only creation-cohort current
statuses and one first-completion event per Job. Backend read contract:
SA-Lathe-Shop-BE/docs/014-dashboard.md; implemented on backend develop b806865.

Reads are `/dashboard/overview?range=30d` and `/dashboard/jobs`. The date mode
`first_completed_on` is mutually exclusive with range/status. Both are
Worker/Admin only and contain no financial or private-file fields. Existing
UC commands, permission checks, money handling and memory-only sessions stay
unchanged. No new library, database migration or deployment is required.

`overview-domain.ts` owns DTOs, exact int64 count formatting and read query
construction. The explicitly selected in-browser mock mirrors the new reads
from its existing shared records/events; no hardcoded chart totals or random
history is added. Live errors must never switch to this transport.

This first frontend batch adds contract models and mock/domain tests only.
The dashboard UI and keyboard heatmap follow in separately verified commits.
All 131 native tests, TypeScript, ESLint and the 37-route production build pass.
Backend SQL passed an isolated PostgreSQL minimal-reporting fixture with 125
jobs; that is not full UC1–UC9/S3/browser-to-live-stack verification.
