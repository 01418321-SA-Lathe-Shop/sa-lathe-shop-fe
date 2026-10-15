# Phase 6 — Shared Display and Interaction Polish

Status: **Implemented and verified for the local demo**, 2026-10-15. Backend integration is Phase 7 and is not implemented or claimed verified here.

## Scope and source boundary

This phase follows section 6 of `plan.md` and `docs/02-frontend.md`: consistent Bangkok time/THB/no VAT, documented statuses, local loading/empty/error feedback, explicit fresh upload after failure, and no false success or embedded secrets. It applies to Customer UC1/UC3/UC4/UC9, Worker UC2/UC5–UC9, and confirmed Admin management/UC6.

No business transition, permission, stock-shortage formula, account policy, invoice deadline, route, endpoint, dependency, or folder hierarchy was added. Real auth/API/storage and the open decisions remain deferred.

## Plan coverage

| Planned concern | Implementation / evidence | Remaining production boundary |
|---|---|---|
| Asia/Bangkok / THB / no VAT | Shared display-only formatters used by all three roles. Native tests cover satang conversion, two-decimal display, UTC midnight, seasonal host zones and missing/invalid values. Browser checks use a New York timezone and still show ICT/THB | Money storage precision/rounding, serialization and exact deadline boundaries remain D06/D07 |
| Same statuses and permissions | Existing entity/status strings and permitted actions retained; role/workflow regressions pass | Unconfirmed transitions/permissions remain unavailable; demo guards are not server authorization |
| Processing/loading | File preparation displays local processing and aria-busy; dependent submission is disabled while pending. Existing initial Suspense fallback retained | Other local actions are synchronous; no fake API/network delay. Remote pending/retry behavior requires D03 |
| Empty states | Customer request/quotation/confirmation/delivery empty messages now match their flow; existing Worker receiving/no-stock-search and Admin no-match paths retained | Final production copy/list/pagination contract remains D02/D03 |
| Error states / no false success | Pure local reducer preserves data on thrown validation error and clears success. Silent lifecycle changes clear stale notices. File errors link to their input via aria-describedby/aria-invalid | Backend must validate/commit and return agreed error semantics before real success can be shown |
| Explicit upload again | Fresh user selection after failure; no automatic retry. Pending local reads are aborted on unmount/reset; busy count settles once; canceled reads cannot register files | Production MIME/content/security allowlist, S3/signed links and cleanup remain D11 |
| Shared accessibility/mobile | Unique dialog title IDs, native dialog keyboard behavior, focus restoration/heading fallback; visible select/textarea/summary/scroll focus; minimum 44px text-action height; mobile inputs 16px | Not a claim of full formal accessibility certification; no new UI library |
| Demo role/session resilience | Page-memory fallback handles blocked reads, failed writes/removals and read access lost after restoration; four browser scenarios pass | No credentials or production auth. Forbidden storage removal cannot be made persistent; old demo role may reappear after reload |
| Secrets / API configuration | No secrets, auth provider, credential storage, real endpoint or API request added | Actual API base URL/configuration and secure auth/upload behavior require agreed Phase 7 contracts |

## Shared code and behavior

### Display

`app/demo-display.ts` owns the existing THB and Bangkok/ICT presentation. Values remain unchanged in domain models; Moving Average ratios retain exact internal arithmetic. Formatting to two decimals is presentation, not a new financial rounding policy. `Unavailable` prevents invalid data from crashing the view or pretending to be a real zero/date.

### Dialogs and files

`app/demo-ui.tsx` centralizes the dialogs, file picker, and file preview that were previously duplicated or imported through the Customer workspace. Native dialogs retain focus inside while open, support Escape, and restore the opener with preventScroll. If acceptance removes that button, focus falls back to the workspace title. Dialog title IDs are unique.

File preparation reads only a small local slice, not an S3 upload. Each active operation has a cancellation signal and exactly-once busy cleanup. Changing workspace or global reset aborts that operation before it can register a file in shared state. An explicit fresh selection still succeeds afterward. Selected successful files/preview URLs retain the existing memory/reset lifecycle; URL cleanup remains in the owning view.

The decimal 100 MB limit and common-extension document/image filter remain prototype choices already documented. Do not mistake extension checks for production MIME/content validation or malware scanning.

### Feedback

`app/workshop-state.ts` makes action feedback testable outside React. Failed actions preserve all committed workshop data, clear success, and show a scoped error. Successful actions clear prior errors. An unchanged timer returns the same state; a silent lifecycle change clears prior notices rather than incorrectly preserving an old result. Reset still increments the workspace generation to discard pending forms.

### Storage fallback

The existing demo store had a gap: if sessionStorage was readable but setItem/removeItem failed, a stale stored role overrode the new in-memory value. Reproduction showed failed login/sign-out and loss of a restored role when read access later failed. The fix caches validated roles and switches the page to memory-only mode after a storage failure.

This is strictly a **role-selector demo**, not authentication or access control. If the browser refuses removal, the application cannot erase that stored value; after reload, an older demo role may restore. New fallback changes are page-local, and shared manufacturing data still resets on reload. Real identity, token/cookie/security/session policy remains D01/D15.

## Verification

From the project root, using existing dependencies:

```text
node --test app/demo-display.test.mjs app/workshop-state.test.mjs app/customer-files.test.mjs app/admin-domain.test.mjs app/worker-domain.test.mjs app/customer-domain.test.mjs app/demo-access.test.mjs
npm run lint
npm run build
```

| Check | Result |
|---|---|
| Native rule tests | 40 passed: all 32 prior tests plus display/timezone/missing values, canceled/successful file preparation, failed/silent/success/reset feedback |
| ESLint / TypeScript / production build | Passed; static `/` generated |
| Customer regression | Request/file preview, all three Deposit/PO combinations, upload recovery, fifth rejection, delivery return/acceptance, exact installments/overpayment, mobile and invalid-role recovery passed |
| Worker/cross-role regression | Shared Customer→Worker→Customer flow, drafts/markup/PO, saved plans, reservations, partial good/bad receipt, claims/CREDIT, Admin UC6 boundary, issuance/actuals/delivery/rework/invoice preservation passed |
| Admin regression | Required contacts/add/edit/status filters/deactivate/reactivate, password simulation/clearing/no storage or request payload, dialog focus, reset/reload, role restrictions passed |
| Focused shared-dialog check | Unique title ID; Escape restores original Customer action; acceptance removing its opener focuses workspace title; preview restores attachment-button focus |
| Focused delayed-file check | Held local file read shows busy and blocks submission; navigate away/release read/return produces no orphan attachment or stuck submission; a fresh selection succeeds |
| File feedback check | Executable extension with spoofed image MIME rejected; error/hint association present; one-shot failure offers Upload again; required-proof gate stays closed until fresh attachment succeeds |
| Mobile and time display | 390px/320px fit; 16px mobile textarea, 44px secondary action, visible 3px keyboard outline; THB/ICT shown under New York browser timezone; desktop/mobile screenshots reviewed |
| Storage failure checks | Failed writes, failed removal, fully blocked storage, and restored role losing read access all pass; normal Customer session flow rerun on final build |
| Browser health | No captured page exceptions or HTTP ≥400 in the successful full-role/focused UI suites |
| API / database / S3 / real auth | Not connected or claimed verified |

Browser automation used the already installed external Playwright/Chromium runtime; no test dependency/browser was installed into the repo. Native TypeScript-import tests emit the existing module-type warning; tests pass. No qualifying framework feedback issue was identified.

The React checklist influenced shared components, derived displays, abort/cleanup and focus behavior. The verification checklist followed the actual UI→local state→UI path. Auth guidance kept the storage fix demo-only rather than adding a provider or credential/session implementation.

## Try it

```text
npm run dev
```

Use the URL printed by Next.js. The checked local production preview used `http://127.0.0.1:3101`.

1. Customer → Quotations → open an acceptance dialog, cancel with Escape, and continue by keyboard. Accept and check focus after the response button disappears.
2. Customer → New request or Deposit/PO: attach a document, inspect the preview, and use Demo tools → Fail next file attachment to test explicit fresh upload.
3. Worker → Materials: check THB values/ICT ledger time, keyboard focus on selectors and the scrollable plan table, and mobile layout.
4. Admin → Workers: edit/status/password simulation still uses the same confirmed permissions. Password changes remain clearly labeled simulations.
5. Reload/global reset still restores all sample business records. Do not use real credentials or business data in this prototype.

## Commits and changed files

All work is on `develop` and pushed to `origin/develop` as separate coherent groups:

1. `31964b2` — shared display/feedback/file-preparation helpers and tests.
2. `fb614ab` — shared dialogs/file controls, role integration, empty-state copy, accessibility/mobile styling.
3. `bbb968a` — validated memory fallback when browser storage reads/writes/removals fail.
4. Documentation handoff — current source guide, plan status and this record.

Application/test files: `app/demo-display.ts`, `app/demo-display.test.mjs`, `app/workshop-state.ts`, `app/workshop-state.test.mjs`, `app/customer-files.ts`, `app/customer-files.test.mjs`, `app/workshop-context.tsx`, `app/demo-ui.tsx`, `app/customer-workspace.tsx`, `app/worker-workspace.tsx`, `app/admin-workspace.tsx`, `app/globals.css`, `app/demo-session.ts`.

Documentation files: `docs/02-frontend.md`, `docs/07-phase-six-handoff.md`, `plan.md`.

Existing `package.json` and `package-lock.json` user edits are preserved/excluded. No dependencies upgraded, directories restructured, synced source files changed, or public deployment performed.

## Phase 7 prerequisites

Backend/API integration remains next. Obtain the actual API/auth/upload contract and a reachable Backend before wiring the UI. This phase does not invent endpoints/payloads, choose cookie/token/auth providers, define signed URL authorization, or decide the unresolved shortage/rounding/account/payment rules. Preserve the explicit demo boundary until each integration is agreed and verified against real responses.
