# Phase 8 — Worker contacts and UC4 fulfillment

Status: **implementation delivered; real-backend verification pending Docker recovery**. Do not treat passing browser stubs as proof that the Go API, PostgreSQL or S3 worked in this phase.

## Scope and sources

Owner authorized the next frontend phase. Backend `develop` at `ab0c224` implements Worker contacts and UC4–UC6. This phase connects **Worker add/edit plus UC4 only**. Contracts read: backend `docs/AUTH.md`, `docs/UC4.md`, payment/auth DTOs/services/handlers and the updated repository instructions. No backend files, existing databases, migrations or infrastructure settings were modified.

The initial push discovered newer remote UI work through `1565875`. It was merged normally in `9a37d21`, preserving Landing, designed Thai login/register, themes, scale, role routes, the new `DESIGN.md` maintenance rules and uppercase `PLAN.md`. Only the conflicting Worker import was resolved when restoring our own UI work. No force push, history rewrite or dependency installation. User's pre-existing package.json/package-lock.json changes were excluded throughout.

## What users can do

| Role | Entry and actions | Important boundary |
|---|---|---|
| Admin | Sign in at `/login` → connected Workers → Add Worker / Edit profile; existing deactivate/reactivate/password controls remain | Required name/email/phone plus username, employee number and initial password on create. No delete/promotion |
| Customer | Connected Requests → select request → approved quotation → Deposit & company PO | This is not the role-route demo Deposit/PO page |
| Customer/company member | Upload and finalize a fresh private receipt/PO, then explicitly submit it | Ready file is not automatically financial evidence or approved payment |
| Admin / Worker (Staff display) | Same connected request/quotation → download evidence → choose approval/rejection and confirm manual check | Both roles may review, but never submit as Customer |
| All scoped readers | Reload fulfillment; inspect evidence history and resulting job | Server-returned status/balance only; no locally fabricated queued job |

### Worker profile rules

- Create requires username/password/name/employee_no/email/phone; optional position. Edit fetches current profile by account UUID, then PATCHes supplied profile fields.
- Email is trimmed, case-preserving and at most 254 UTF-8 bytes. Frontend only performs required/size/line-break checks; backend Go net/mail decides exact address syntax. No guessed uniqueness or ownership verification.
- Phone accepts local/international numbers, optional leading + and 7–15 ASCII digits. Spaces, hyphens, parentheses and dots are allowed separators, removed by the server. Maximum raw size 64 bytes; no extension syntax.
- Missing legacy email/phone appears as `Not provided (legacy account)`, never fake contact data. This form requires both contacts when saving a backfill; the API's unrelated-field-only PATCH semantics still preserve omitted contacts.
- Username/password/deactivation session revocation remains backend-owned. Changing contacts alone does not reset password or revoke sessions. Password entries clear on submission; no browser persistence/logging.

### UC4 state and financial rules

1. Read `GET /quotations/{quotation_id}/fulfillment`: accepted terms, current request status, latest 100 evidence records, optional job/cancellation time.
2. Customer uses existing request-file intent → signed PUT → completion, then POSTs `/quotations/{quotation_id}/evidence` with a generated UUID idempotency key and ready attachment ID. Each new record has its own fresh attachment.
3. Deposit includes exact decimal-string amount and declared nonfuture paid_at; date entry explicitly uses Asia/Bangkok regardless of device timezone. One amount between stored rounded minimum and quote total is allowed. Full deposit and zero-price zero confirmation are supported. No aggregation of smaller deposits.
4. PO uses `kind: po` and omits amount/paid_at. Only required kinds are offered. Pending/approved kinds block another active submission; rejected records remain visible and replacement is allowed only before original due time.
5. File finalization AND submission must finish by accepted_at + 336 hours. Complete timely pending evidence can be reviewed after due; missing/rejected requirements are canceled by backend worker. UI does not cancel locally, extend time or pretend upload start met the deadline.
6. Admin/Worker downloads a private evidence link and submits one review to `/evidence/{evidence_id}/review`, carrying expected_version. Rejection reason is required, trimmed and 1–2,000 characters; approval sends no reason. No edit/delete/opposite-review endpoint is invented.
7. Final required approval atomically opens exactly one queued job. Display actual approved deposit, server balance, opened time and optional requested deadline. UC3 minimum-deposit snapshot remains unchanged. Approval is manual—not bank validation, transfer, refund, invoice settlement or production start.

### Retry and stale-state handling

- File failure: explicit Upload again starts a fresh intent; never complete or resume a failed/checking intent.
- File ready + uncertain evidence POST: keep the **exact** idempotency key/attachment/kind/amount/time in component memory. Fields freeze so a retry cannot change the payload under the same key. Reload current status before different evidence. Explicit identical retry can recover a committed result even after due, subject to backend access checks.
- Review response failure: keep original outcome/reason/version for explicit identical retry. Reload status rather than issuing an opposite review. Server 409 is not overwritten or retried automatically.
- Leaving the form/reloading/signing out clears local retry state, not server evidence. Read current fulfillment first before preparing a replacement.
- Empty/loading/error/success are based on real request lifecycle in production code. Stubbed verification is separate. Unmount cancellation and the existing synchronous command guard prevent stale rendering/double submission.

## Setup and manual acceptance checklist

No new dependencies/configuration were introduced. Use existing `.env.example` / private `.env.local` with browser-reachable `NEXT_PUBLIC_API_BASE_URL`; never put DB/S3 credentials in the frontend. Rebuild when changing this public build-time URL.

- Start a healthy Docker engine; follow backend setup for API/private storage/PostgreSQL/outbox worker. Required minimum migrations for this scope: `000006` contacts and `000007` UC4, plus prior migrations. Latest backend currently includes `000009`; use its runbook, never apply disposable test migrations to business data.
- API CORS and private bucket CORS must allow the actual frontend origin. Production uses HTTPS and browser-reachable storage endpoints.
- Run `npm run dev` (or built `npm run start`). Open `/login`; `/` remains the upstream Landing. Demo bypass buttons are collapsed below real login and cannot grant live permissions.
- Admin: create a Worker with all required identity/contact fields, inspect persisted normalized phone, edit contacts, check nullable legacy backfill, and exercise existing status/password operations.
- Customer: create/accept an individual quote; submit a deposit above minimum; verify no job before manual approval and correct remaining balance afterward.
- Company <=THB 10,000: PO only. Above threshold: PO plus deposit; approve one kind and verify no job yet, then final approval creates one. Reject/replace before due and inspect immutable history.
- Exercise real response loss/idempotency, private download authorization, cross-company denial, deadline expiry/pending-review protection and concurrent final approval.
- Once those real checks pass, update this handoff and PLAN.md; only then label Phase 8 fully verified.

## Verification — distinguish the layers

| Check | Result / evidence |
|---|---|
| Production build / TypeScript | Passed; all 28 routes compiled/prerendered |
| Native tests | 53 passed, including six new contact/evidence/date/range/state tests and prior API/domain regressions |
| Changed-file lint | Passed for API/domain, Worker, fulfillment, requests, quotations and auth workspace files |
| Full-project lint | **Not passed**: existing `app/appearance.tsx:45` synchronous state update in effect and unused-disable warning at line 50 from upstream. No rules were disabled and dependencies were untouched |
| Design maintenance | Manual prose updated; `node scripts/sync-design.mjs --check` passed; detector returned `[]`; whitespace checked |
| Contract-stubbed browser | Passed on built UI: Worker add/edit, legacy backfill, shared contact values, normalized phone display, private upload protocol shape, identical-key replay after simulated commit/503 response loss, Bangkok paid_at, Customer cannot review, Staff review and queued balance |
| Responsive/theme confirmation | Stubbed browser at 390×844 and 1440×1000 Light/Large: no horizontal document overflow or runtime errors. Batched screenshots inspected; one correction batch fixed split action words, notice spacing, skip-link visibility and irrelevant revision controls |
| Real API/PostgreSQL/S3 flow | **Pending**, not passed. Docker engine initially unavailable. Normal `docker desktop start` did not yield a healthy engine; logs report crash during dockerInference socket initialization. No reset, socket rename/delete, WSL shutdown, settings change or existing-data removal was attempted |

The external local Playwright runtime was already installed; no browser-test dependency or CI setup was added. Local stub runner explicitly identifies itself as stub-only. A separate real-stack runner was prepared but **not run** because Docker was unhealthy; no new test containers or volumes were created in this phase. Deadline concurrency, expiry worker behavior, bank/provider correctness, all-format security inspection and real company-case execution are not claimed by frontend stubs/unit tests.

Auth/React guidance informed strict role/session boundaries, exact values, cancel-safe work and preserving retry payloads. The UI guidance preserved upstream visual authority, semantic theme/rem scale, inline forms and bounded review/confirmation rather than a redesign. Optional `/impeccable init` can formalize missing product-context documentation separately; it is not required to use these controls.

## Remaining scope

- Resume real UC4 verification when Docker is healthy; owner was asked for that readiness signal.
- Do not infer authorization to repair/reset Docker or change existing data.
- Frontend UC5/UC6 are the following integration phases. Backend UC6 is now **Admin-only**; older Worker procurement demo text is historical, not live authorization. This phase does not wire those endpoints.
- Backend UC7–UC9 remain unapproved; frontend receiving/production/invoice/payment remain explicitly demo-only.
- No silent auth persistence/cookie/reset contract or unconfirmed production deadline was added.

## Commits and changed files

Implementation: `58279b7` exact inputs/tests; `9a37d21` non-rewriting upstream UI merge; `b29e722` Worker create/edit; `6ad3f82` UC4 connected controls. Each group was pushed normally to `origin/develop`. Documentation handoff is a final separate commit; main was not pushed.

Task-owned files (the upstream merge additionally preserves its existing 44-file UI change set):

- `app/backend-api.ts`
- `app/backend-fulfillment-domain.ts`
- `app/backend-fulfillment-domain.test.mjs`
- `app/backend-workers.tsx`
- `app/backend-fulfillment.tsx`
- `app/backend-workspace.tsx`
- `app/backend-quotations.tsx`
- `app/backend-requests.tsx`
- `app/workflows.css`
- `DESIGN.md`
- `AGENTS.md`
- `PLAN.md` (upstream rename from `plan.md` preserved)
- `docs/01-phase-one-decisions.md`
- `docs/02-frontend.md`
- `docs/08-backend-integration-handoff.md`
- `docs/09-phase-eight-handoff.md`

Pre-existing package.json/package-lock.json edits remain local and excluded. No backend file changes.
