# Phase 10 — Designed shell on the live/mock API, UC6–UC9 connected

Date: 2026-10-25. **Frontend UI for AUTH and UC1–UC9 is implemented against the backend contracts and verified against an in-browser contract mock. Real Go/PostgreSQL/S3 verification is still pending Docker.** Mock/browser results below do not prove the real backend behaves the same.

## What changed

The owner asked to finish the frontend before database/system integration, using `DESIGN.md` (extracted from the UX/UI Figma) as the visual spec. Decisions confirmed by the owner on 2026-10-24:

1. **One app.** The designed sidebar shell (`/customer`, `/staff`, `/admin`) now runs on the real API client. The old fixture demo (separate domain logic and data) was removed.
2. **Test accounts use a mock backend.** The "บัญชีทดสอบ — Mock backend" buttons under the login form sign into an in-browser mock that follows the backend's HTTP contract. Real sign-in never falls back to it. No new configuration key was added.
3. **Routes follow the backend's confirmed permissions.** New: `/admin/requests`, `/admin/materials`, `/admin/receiving`, `/admin/production`, `/admin/delivery-payment`, `/{customer,staff,admin}/inbox`, `/customer/memberships`. `/staff/orders` redirects to `/staff/receiving` because UC6 is Admin-only (backend UC6.md).

| Role | Pages | Connected behaviour |
| --- | --- | --- |
| Customer | requests, quotations, deposit-po, delivery-payment, inbox, memberships | UC1 create/files, UC3 decisions, UC4 deposit/PO evidence, UC9 inspection (accept / return for rework) and bank-proof installments; company invitations |
| Staff (`worker`) | quotations, materials, receiving, production, delivery-payment, inbox | UC1 queue, UC2 quotations, UC4 review, UC5 search + job plans, UC7 receipts/claims, UC8 start/use/time/photos/complete, UC9 invoice issue + shipments (no payment data) |
| Admin | requests, workers, materials, orders, receiving, production, delivery-payment, inbox | UC1–UC4 read + UC4 review, Staff accounts, UC5 catalog/stock + read-only plans, UC6 suppliers/orders, UC7 credit days + settlement, UC8 labor cost, UC9 terms/cash/payment review |

## Architecture

- `app/backend-api.ts` — `BackendApi` takes an injectable `Transport` (browser `fetch` by default). Adds `privateUpload` (intent → PUT → complete, fresh intent each time) and `download` (short-lived signed link, never stored).
- `app/api-session.tsx` — `ApiSessionProvider` in the root layout keeps one memory-only session (`live` or `mock`) across client navigation. Reload or sign-out discards it. Tokens never go to browser storage or URLs.
- `app/workspace-shell.tsx`, `app/workspace-access.ts`, `app/workspace-routes.ts` — role → route map and shell. The guard sends no-session visitors to `/login`; the backend still authorizes every call.
- `app/connected-workspace.tsx` — maps each page to its connected component.
- UC screens: `backend-requests/quotations/fulfillment` (UC1–UC4), `backend-inventory` + `backend-material-plan` (UC5), `backend-procurement` (UC6), `backend-receiving` (UC7), `backend-production` (UC8), `backend-delivery` (UC9). Each UC6–UC9 screen has a pure `*-domain.ts` with node tests.
- Shared: `backend-hooks.ts` (`useResource` keeps the last data of the same record while reloading; `useRetryableWrite` freezes key/payload for identical retry), `backend-ui.tsx` (`Status`, `RetryNote`, `PrivateUpload`).
- Mock: `mock-backend.ts` (router, roles, strict fields, idempotent replay, versions, signed storage, error envelope, optional lost-response simulation), `mock-routes-{sales,stock,jobs}.ts`, `mock-decimal.ts` (exact bigint NUMERIC rounding), `mock-seed.ts` (one request at every stage), `mock-accounts.ts`. It is loaded on demand only when a test account is used.

## Run the preview (no Docker needed)

```powershell
npm ci --legacy-peer-deps   # first time; installs package-lock.json as-is (see Known issues)
npm run dev                 # retry once if Next.js stops at its security-upgrade notice
```

Open http://localhost:3000/login → expand **บัญชีทดสอบ — Mock backend** → pick an account. All four accounts share one mock dataset until reload. In the shell, **สลับบัญชีทดสอบ** switches accounts without losing data, can simulate a lost response on the next write (to see "Retry identical …"), and can reset the data.

| Account | Role | Seeded starting points |
| --- | --- | --- |
| `nida.company` | Customer (company owner) | PO + deposit due (R4), queued job with shortage (R6), job in progress (R8), shipped job with a pending bank proof (R10) |
| `somchai` | Customer (individual) | pending request with drawing (R1), sent quotation after one rejection (R3), deposit under review (R5), ready job (R7), completed job awaiting terms (R9) |
| `anan.staff` | Staff | all of the above plus a saved draft quotation (R2) |
| `pim.admin` | Admin | suppliers, an order awaiting supplier response, a partially received order with a damaged claim, a fully received order awaiting payment |

All mock passwords are `mock-password-2026`; they exist only inside the browser mock.

## Connecting the real backend (the "appliances")

No UI rewrite is needed; the same components already call the real endpoints.

1. Start the backend per its `docs/SETUP.md` (Docker Desktop, `./tasks.ps1 dev-up`, `migrate-up` through **000012**, `bootstrap-admin`, `run`, `worker`).
2. Set `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`) and make sure the backend's `CORS_ORIGINS` includes the frontend origin.
3. Sign in with real accounts at `/login`. The topbar badge reads **Connected API**.
4. Walk the same paths as the mock checks below with real data, and note any difference between the mock and the backend. Known places where the mock is intentionally simpler: material `version` increments only on catalog/stock changes (not on reservation changes), UC4 expiry is evaluated when the fulfillment is read instead of by the worker, notifications are written synchronously instead of via the outbox, and file "validation" checks size/type only.
5. If a response shape differs, fix the frontend type and the mock route together, keeping `docs/` contracts as the authority.

## Verification evidence

| Check | Result |
| --- | --- |
| Native tests (`node --test app/*.test.mjs`) | **44 passed**: mock contract (10), UC6 (4), UC7 (4), UC8 (2), UC9 (3) plus existing API/UC4/UC5/display tests. 37 demo-only tests were removed with the fixture demo |
| TypeScript (`next typegen` + `tsc --noEmit`) | Passed |
| Headless Chrome (CDP, local script, no new dependency) against `next dev` + mock | Passed with **no console errors** and **no horizontal overflow**: shell navigation for every role; live login with no backend shows an error and does not fall back; route guard; 390 px mobile; UC1→UC5 full flow; UC6 accept + lost-response identical retry creates exactly one order (exact 8.38 total); UC7 claim → replacement → full receipt → Admin credit days → bank proof required → paid; UC8 start → planned/unplanned use → minutes → photo → complete (unused released) → Admin labor cost; UC9 terms → invoice → ship → return for rework → re-complete → reship → accept → bank proof → approval → request closed |
| `DESIGN.md` | Prose + change log updated per group; `sync-design.mjs --check` and `git diff --check` pass |
| ESLint | **Not run**: `eslint-config-next@^14` in `package.json` cannot load with the flat config (`ERR_MODULE_NOT_FOUND .../core-web-vitals`). Fixing it needs a dependency change (owner approval) |
| Production build | Not re-run; Phase 9 recorded that `next build` exits 1 on the Next.js security-upgrade gate. `next dev` shows the same upgrade notice |
| Real browser → Go → PostgreSQL/S3 | **Pending** (Docker engine not running on this machine) |

## Known issues and open items

- `npm ci` without `--legacy-peer-deps` fails on the existing eslint peer conflict; nothing was upgraded.
- Next.js 16.4.0 is flagged by the Next.js CLI's security advisory; an upgrade needs owner approval.
- The UC1–UC5 screens from Phases 7–9 keep their English labels (unchanged); new UC6–UC9 screens follow the same style.
- Plans and production show material IDs where the backend DTO has no names (UC5 plan). The production list shows request codes; the detail fetches the request label.
- Customer request/quotation/deposit pages are focused views of the same request record (no invented list endpoints).

## Commits (pushed to `origin/develop`)

`97692af` mock backend + transport · `a5628d0` shell on live/mock session + routes · `6913dbd` remove fixture demo · `1ae70ce` UC6 · `53bb6fa` UC7 · `76f3793` UC8 · `8ce9054` UC9 · this documentation commit.
