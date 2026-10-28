# Real API only — browser mock removal

Date: 2026-10-28. Owner approved deleting the frontend browser mock.

## Current behavior

- Normal `/login` posts to `/auth/login`, then reads `/auth/me` from the configured
  real API. Server-returned roles choose Customer, Worker or Admin navigation.
- `NEXT_PUBLIC_API_BASE_URL` is the public API base, not the Next.js website.
  Local default: `http://localhost:8080`; website: `http://localhost:3000`.
  Set it before `npm run dev` or `npm run build`; restart/rebuild after changes.
  `.env.example` documents it. No password/token/DB URL/S3 key belongs in it.
- Bearer tokens remain in page memory only. Reload requires login; logout calls
  the real backend. Expiry/revocation closes the client and clears the session.
- A failed read/login/save never selects sample records. Existing empty/error
  feedback and uncertain-write/idempotency flows are preserved.
- The owner-approved `/login` picker lists the six public fictional usernames
  from the backend seed handoff. Selection fills only the username, clears/focuses
  the password and never submits. Enter the privately provided password manually.
  This is not the deleted browser mock; it cannot create accounts or choose roles.
  Registration has no picker. No mock switcher/reset/lost-response toggle remains.
- Attachments use authorized signed links and real storage, never a mock Blob
  resolver. File viewers still enforce size/type/signature and cancellation checks.

## Real seeded accounts are a separate setup

Backend `develop` at `16cdd66` documents operator setup in `docs/015-demo-seed.md`
and `docs/016-frontend-demo-handoff.md`. It seeds six fictional identities into a
dedicated real PostgreSQL database, not frontend fixtures. Passwords are privately
provided. Only the six public demo usernames are listed by owner approval;
account UUIDs and passwords are not frontend constants.

The account-only seed contains no requests, quotations, jobs, stock, invoices or
attachments. Empty lists are expected. Operator setup must make `/health/ready`
return 200 and allow the exact frontend origin through CORS. Storage/file flows
need separately configured private S3-compatible storage and bucket CORS.

No migration, seed, backend configuration, deployment or data deletion was run
by this frontend removal. Prior checks found API liveness 200, readiness 503 and
CORS preflights permitting `http://localhost:3000`. Seeded-account login/company
sharing/isolation verification remains pending readiness and private credentials.

## Verification scope

- Username-picker follow-up: 126 native tests plus lint, TypeScript, audit and
  production build pass. Chrome at 1280px/390px in Dark/Light verifies all six
  username choices, password clearing/focus, no automatic request, required
  manual password, busy disabling and registration exclusion. Test login requests
  were deliberately aborted; private real passwords were not used.
- Final removal checks: 124 native tests pass; lint, TypeScript, source/import
  audit, design snapshot, whitespace checks and production build pass. All 37
  generated routes remain. Runtime dependencies and lockfile are unchanged.
- Native tests retain business rules, API Bearer/401/logout handling, private
  uploads/downloads/previews, cancellation and role/source invariants.
- New session regressions cover configured API login -> `/auth/me`, failed login
  closing its client without fixture fallback, and real-client logout.
- Chrome at 1280px and 390px verifies no shortcut controls, registration still
  renders, unauthenticated role routes return to login, no horizontal overflow
  and no runtime errors. A deliberately aborted login request displays connection
  failure, clears the password and stays on login without sample data.
- These browser failure checks and isolated unit-test doubles are NOT successful
  browser-to-real-Go/PostgreSQL/S3 verification. No real account password was used.

## Deleted-file inventory

Every path below was exclusively part of the browser mock or its own test suite.
Git history retains all deleted files. Historical handoffs/screenshots remain as
archival records, not current setup instructions. No runtime dependency changed.

| Deleted file | Reason |
| --- | --- |
| `src/mocks/core/mock-backend.ts` | In-browser API/storage simulation and fixture arithmetic. |
| `src/mocks/core/mock-decimal.ts` | In-browser API/storage simulation and fixture arithmetic. |
| `src/mocks/data/mock-accounts.ts` | Fictional browser records or automatic sample credentials. |
| `src/mocks/data/mock-seed.ts` | Fictional browser records or automatic sample credentials. |
| `src/mocks/routes/auth/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/auth/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/delivery/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/delivery/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/fulfillment/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/fulfillment/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/inbox/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/inventory/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/inventory/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/memberships/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/memberships/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/mock-dashboard.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/mock-routes-jobs.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/mock-routes-sales.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/mock-routes-stock.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/procurement/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/procurement/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/production/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/production/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/quotations/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/quotations/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/receiving/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/receiving/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/requests/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/requests/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/workers/helpers.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `src/mocks/routes/workers/routes.ts` | Simulated business endpoint registry/handler/helpers; real Go API remains authoritative. |
| `tests/mocks/dashboard.test.mjs` | Tests/fixture manifest for the deleted browser mock only. |
| `tests/mocks/mock-backend.test.mjs` | Tests/fixture manifest for the deleted browser mock only. |
| `tests/mocks/route-contract.json` | Tests/fixture manifest for the deleted browser mock only. |
| `tests/mocks/route-contract.test.mjs` | Tests/fixture manifest for the deleted browser mock only. |

Also removed: mock-only private-object resolution from API transport/preview,
its fixture-specific preview test branch, and 73 obsolete mock/bypass selectors.
Test-only fetch stubs remain for isolated tests; they cannot log a user into the app.
Public landing animation/illustrations and all real workflow screens remain.
