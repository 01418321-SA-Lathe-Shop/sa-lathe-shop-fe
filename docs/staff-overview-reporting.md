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

Frontend batch 1 adds contract models and mock/domain tests (131 native tests,
TypeScript, ESLint and the 37-route production build passed). Batch 2 replaces
the Staff/Admin menu-directory overview with the responsive report shell,
four status filters, named paginated list, current priority backlog and role-safe
quick links. The navbar/drawer and Customer portal are unchanged. A validated
optional job query selects the existing production detail, including jobs beyond
the first page; all operational forms and permissions remain unchanged.

The report hook cancels superseded reads, preserves same-path data during refresh,
and distinguishes missing reporting APIs from normal errors. Failures are not
zero counts and never trigger mock fallback. The heatmap region is explicitly
marked as pending the next logical batch, without placeholder chart data.
Backend SQL passed an isolated PostgreSQL minimal-reporting fixture with 125
jobs; that is not full UC1–UC9/S3/browser-to-live-stack verification.
