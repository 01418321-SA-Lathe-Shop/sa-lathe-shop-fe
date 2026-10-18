# Phase 7 — Backend integration handoff

Historical Phase 7 record. Current routes/design and connected scope are superseded by `09-phase-eight-handoff.md`: real auth uses `/login` / `/register`, Worker contacts and UC4 now have frontend implementation, and their new full-stack verification is pending Docker recovery. The successful real-stack results below describe Phase 7 only, not proof of the new UC4 phase.

## Delivered scope

The frontend now defaults to connected sign-in at `/`. It calls the existing Go API directly; there is no invented Next.js API proxy, new auth provider, dependency installation, folder restructure, or backend implementation change. The backend contracts reviewed are `docs/AUTH.md`, `UC1.md`, `UC2.md`, `UC3.md`, and the overall `01-backend.md`, checked against Go handlers/DTOs. Backend snapshot used for isolated verification: `e0808ec`.

| Area | Connected behavior | Boundary |
|---|---|---|
| Auth | Customer/Worker/Admin username/password login, `/auth/me`, memory-only Bearer token, absolute expiry, protected-401 sign-out, logout | Reload requires login. No cookie persistence, refresh, password recovery or Supplier login |
| Registration | Individual, new company, company member with invitation | No public staff registration; company names never establish membership |
| Memberships | Own profiles; company owner creates private one-use invitation; existing Customer joins by invitation | Invitations expire after 24 hours; shown in memory, never logged/stored |
| UC1 requests | Customer create; scoped Customer lists/details; staff shop queue; pagination | Membership ID, description, positive int64 quantity, optional material specification/future requested deadline. No invented production deadline |
| UC1 files | Intent → signed S3 PUT → validation completion; ready listing; on-demand private download | PDF/DOC/DOCX/XLS/XLSX/TXT/JPEG/PNG; 100,000,000 bytes; MIME match; backend content validation. Failed attempts need fresh intent |
| Inbox | Per-account list, refresh, mark-read, pagination | New-request events depend on backend worker/outbox. No claimed quotation email/LINE/PDF delivery |
| UC2 | Worker estimate/create/edit/send; refuse pending request with reason; role-scoped quotation history | Admin reads costs but cannot write quotes. Customer never receives drafts/internal costs. Lock conflicts require reload |
| UC3 | Active Customer/company member accepts/rejects; decision history; immutable acceptance terms | Five distinct rejections allow revision, sixth cancels. Terms are requirements, not payment confirmation |
| Admin Workers | Existing Worker list, deactivate/reactivate, real password change | Account UUID routes. Required email/phone are absent from backend: add/edit profile controls deliberately unavailable, not silently degraded |
| UC4–UC9 | No connected mutations | Existing local demo remains separately selectable. No real Deposit/PO evidence, job opening, inventory, procurement, production, delivery or payment endpoints exist yet |

## First-day setup

### Backend

Use the backend runbook and private `.env`; never copy DB/S3 credentials into the frontend. Apply all five migrations, including `000005`, and provision the initial Admin using the backend bootstrap command. Do not re-bootstrap an existing database or run disposable test migrations against business data.

For the usual frontend at `http://localhost:3000`:

```text
CORS_ORIGINS=http://localhost:3000
S3_PUBLIC_ENDPOINT=http://localhost:19000
LINE_ENABLED=false
```

If frontend runs at `http://127.0.0.1:3101`, explicitly add that origin to `CORS_ORIGINS`. Origins include scheme, hostname and port: localhost and 127.0.0.1 are not interchangeable. For nonlocal use, API and signed storage endpoints must be reachable by the user's browser; container hostnames are not browser URLs. Use HTTPS in deployment. Configure private bucket CORS for the actual frontend origin, PUT/GET and returned signed headers; CORS is not anonymous bucket access.

Start dependencies, API and outbox worker using the backend's existing commands. Typical local task sequence (subject to private environment already being configured):

```powershell
./tasks.ps1 dev-up
./tasks.ps1 migrate-up
# Initial Admin only, when no Admin exists:
./tasks.ps1 bootstrap-admin
./tasks.ps1 run
# Another terminal, same configured backend environment:
./tasks.ps1 worker
```

Check `/health/ready` before diagnosing frontend requests. Existing provisioned staff accounts can sign in. New Worker contact provisioning is still a backend implementation gap, not a reason to bypass required contacts in the frontend.

### Frontend

Use the existing installed Node/dependency environment; no packages were added by this phase.

```powershell
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

`.env.local` should contain only the public browser API URL:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
```

This variable is compiled into production bundles: set it **before** `npm run build` and rebuild after changes. Never place tokens, DB passwords or S3 keys in `NEXT_PUBLIC_*`. No environment secret values were added to this repository.

1. Open `/`, register an individual Customer or sign in with an existing account.
2. Customer: New request → choose own membership → description/quantity/optional material/deadline → Create request → upload documents.
3. Worker: sign in → open the shop request → estimate → save/edit draft → send quotation.
4. Customer: open request → accept/reject → inspect decision history and saved acceptance requirements.
5. Admin: Workers → inspect existing profiles → status/password controls. Required-contact add/edit stays visibly blocked.
6. “Explore separate demo” is for the synthetic UC4–UC9 walkthrough; it never uses the live token or records. Returning to connected sign-in does not restore a real session from browser storage.

## Data, security and failure behavior

| Concern | Implementation |
|---|---|
| Authorization | API session role drives live navigation; backend authorizes every protected request. Demo role selection cannot grant live permissions |
| Token lifecycle | One API client per mounted login, no persistent token storage. Local expiry closes client. Protected 401 clears session. Unmount/sign-out abort in-flight requests. Failed server logout clearly warns remote revocation is unconfirmed |
| Credentials | Password inputs are uncontrolled and cleared on submission, not retained in shared app state or fixtures/logs. Temporary request payload exists only for the actual auth action |
| Exact money | JSON decimal strings; no floating point calculations. Full `NUMERIC(18,2)` range displays exactly. Costs are whole-request totals; zero allowed. Backend calculates minimum and immutable acceptance snapshot |
| Integers | Unsafe JSON integer tokens are preserved as strings; positive int64 inputs serialize as exact JSON numbers via BigInt. No arbitrary business quantity cap |
| Dates | Requested datetime-local is explicitly interpreted at +07:00, regardless of device zone. All timestamps display Asia/Bangkok. No VAT |
| Acceptance | Individual: 50% deposit, no PO. Company <=10000.00: PO only; above: PO + 50% deposit. Server rounds deposit up to satang and saves due_at = acceptance + 336 hours. Balance does not imply deposit paid |
| History | Per-decision request status/count is historical. Current request comes from a separate read. No attempt to recreate old decisions or change deadline on read |
| Loading/empty/error | Real asynchronous reads, contextual empty states, explicit reload controls; duplicate command guard; unmount cancellation prevents old responses rendering under another record/session |
| Failed write | No automatic retry or success before server confirmation. 409 requires reload. Network failure may mean the write already committed: reload record/history before resubmitting |
| Files | Browser checks extension/MIME/size; server is authoritative. Storage PUT uses returned signed headers, never API Bearer/cookies. Download link is fetched on demand and not kept in UI state/storage/logs. No inline rendering of untrusted documents |
| Upload again | A failed storage PUT is not completed. Explicit retry creates another intent, then PUT and completion; no reuse of failed/checking intent or resumable retry |
| Pagination | Request/quote/decision/inbox/Worker lists use 20 rows and offset; Previous/Next. No undocumented filter/sort API invented. Membership and attachment endpoints are unpaginated by contract |

## Verification evidence

- `npm run lint`: passed, no warnings.
- `npm run build`: passed, including TypeScript and static prerender.
- `node --test (Get-ChildItem app/*.test.mjs).FullName`: **47 tests passed**. Existing Node type-less-package warnings remain; no package metadata change was made to suppress them.
- API client tests cover exact int64/decimal values, file allowlist/100 MB boundary, Bearer scoping, cookie omission/no-store/redirect rejection, cancellation, 401 callback, and fresh upload intent after failed PUT.
- Real Chromium ran on the built frontend against **isolated Docker API + PostgreSQL + private S3 + outbox worker**, with random process-only credentials, real HTTP/CORS and migrations 000001–000005. No mocked success response substituted for the happy path.
- Verified in browser: Customer registration/login, int64 maximum quantity persisted exactly, explicitly Bangkok requested date while the browser timezone was America/New_York, file PUT/completion/download, anonymous final-object denial, Worker server estimate/draft/edit/send, Customer acceptance with odd-satang upward rounding and 336-hour deadline, inbox/read, reload sign-in requirement, Admin deactivate/reactivate/password update and real session revocation.
- Failure-path run: invalid login clears password; injected storage PUT 503 leaves no ready file and explicit Upload again creates a second intent; a genuine concurrent quotation update returns 409 without overwrite; browser rejects six revisions and verifies first five remain ongoing while sixth cancels.
- 390px mobile checks: no horizontal document overflow; no browser runtime errors in the exercised flow. Screenshots inspected locally. This is not a complete accessibility/security/performance audit.
- Disposable verification used separate randomly named Compose projects/databases/volumes. Only those test resources were removed afterward; existing business databases, volumes and private environment files were untouched. Real LINE was disabled.

The browser runner used an already-available external Playwright runtime; no new testing dependency or repository folder was installed. It is a local verification artifact, not a claimed CI browser-test setup. Company invitation UI, every file format and every pagination edge were not covered by that browser run; their API mappings follow the contracts, and allowlist/size boundaries have unit coverage.

## Remaining work / decisions

1. Backend must implement required Worker email/phone persistence and response fields, with explicit legacy backfill, format/normalization and uniqueness decisions. Then connect full Admin add/edit without discarding contacts.
2. Define/implement UC4–UC9 backend contracts before connecting those actions. Do not reuse UC1 request attachment routes as Deposit/PO/payment verification.
3. Persistent session/cookie/refresh/password-recovery design remains separate. This phase deliberately signs out on page reload and does not claim a new production auth architecture.
4. Production private storage CORS, retention/orphan cleanup, malware scanning, TLS and operational outbox monitoring remain deployment/operations work.
5. Final `JOB_REQUEST.completed`, invoice terms, stock shortage/variance, Supplier settlement and later notification rules stay open as documented earlier.

Auth guidance informed memory-only credential boundaries; React review informed isolated session/component state, canceled effects, duplicate-submit guards and role-safe rendering. Full-story verification checked browser → actual API → PostgreSQL/S3/outbox → returned UI, not just the demo.

## Changed files

| File | Purpose |
|---|---|
| `app/backend-api.ts` | Contract DTOs, memory-only Bearer transport, exact values, file protocol |
| `app/backend-api.test.mjs` | API boundary/precision/upload/security tests |
| `app/backend-hooks.ts` | Canceled reads, command guard and real feedback |
| `app/backend-ui.tsx` | Shared accessible fields, feedback, paging and password validation |
| `app/backend-workspace.tsx` | Real auth, registration, role panels, membership/inbox/Admin actions |
| `app/backend-requests.tsx` | Request create/detail/files, decision history and terms |
| `app/backend-quotations.tsx` | Worker quotations/refusal and Customer decisions |
| `app/page.tsx` | Default connected entry and explicitly separate demo |
| `app/globals.css` | Connected responsive panels and feedback |
| `app/customer-domain.ts` | Correct demo sixth-rejection cancellation |
| `app/customer-fixtures.ts` | Sixth-response sample |
| `app/customer-domain.test.mjs` | Five/six boundary regression |
| `app/customer-workspace.tsx` | Correct demo rejection copy/confirmation |
| `.env.example` | Public API URL template only |
| `.gitignore` | Allow tracking secret-free example |
| `AGENTS.md` | Current integration guardrails |
| `plan.md` | Scope, progress and verification boundary |
| `docs/01-phase-one-decisions.md` | Current resolutions versus historical open register |
| `docs/02-frontend.md` | Current-contract overrides and sixth-rejection rule |
| `docs/08-backend-integration-handoff.md` | This runbook, verification and complete file list |

User's pre-existing `package.json` / `package-lock.json` edits are preserved and excluded. No backend files were changed or pushed by this phase.
