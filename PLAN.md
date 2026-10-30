## Staff/Admin redesign Step 8 (การแจ้งเตือน) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 8 complete (`9de567b` shared request link, `f128f5a` page).
  - ทั้งหมด / ยังไม่อ่าน tabs with counts, วันนี้ / ก่อนหน้านี้ groups, read badges, ทำเป็นอ่านแล้ว, อ่านทั้งหมด, โหลดเพิ่ม.
  - Same Thai wording and request links as the bell; opening a row marks it read.
- Checks: 183 native tests, type check, lint, source audit, DESIGN sync, production build.
- Chrome walk against the real local API, writes intercepted: Admin 1280 Dark, Staff 390 Light. No overflow or console errors.
- Not exercised: marks that really reach the backend. Pending owner decision: none.
## Staff/Admin redesign Step 7 (จัดการพนักงาน) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 7 complete (`2eff48d` field rules, `bb5613b` page).
  - Searchable list.
  - Side-panel create/edit in sections ข้อมูล / ติดต่อ / รหัสผ่านเริ่มต้น.
  - Confirmations for a username change and for account status; both warn that the person is logged out everywhere.
  - Separate password side panel.
  - Thai field errors.
- Checks: 183 native tests (3 new), type check, lint, source audit, DESIGN sync, production build.
- Chrome walk against the real local API, writes intercepted: Admin 1280 Dark / 390 Light. No overflow or console errors; payload shapes unchanged.
- Not exercised: real saves, duplicate-username responses. Pending owner decision: none.

## Staff/Admin redesign Step 6 (ส่งมอบและใบแจ้งหนี้ / ส่งมอบและรับชำระ) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 6 complete (`cd6c27f` domain tabs and Thai messages, `55b3845` shared proof upload, `86c99a8` page).
  - Seven role-filtered tabs from the existing action rules.
  - Large balance panel.
  - Per-role action cards: credit days, invoice, shipment.
  - Admin payment cards with proof download, approve/reject and a cash form.
  - Delivery, rework and event timelines.
- Checks: 180 native tests (2 new), type check, lint, source audit, DESIGN sync, production build.
- Chrome walk against the real local API, writes intercepted: Admin 1280 Dark, Staff 390/360 Light. Invoice and shipment forms were walked against a stub (Staff 768), because the demo data has no job in those states. No overflow or console errors; payload shapes unchanged.
- Also re-checked Steps 1, 4 and 5 against the real API (`9a9c386`).
- Not exercised: saves that really reach the backend, conflicts, uploads. Pending owner decision: none.

## Staff/Admin redesign Step 5 (รับเข้าวัตถุดิบ) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 5 complete (`2b99aec` domain helpers, `32020b7` page).
  - Tabs: รอรับของ / รับบางส่วน / รับครบ / มีของเสียหาย / ค้างจ่ายผู้ขาย (Admin). The last two are counted from per-order details, owner-approved: first 100 orders, in parallel.
  - Search and cards.
  - Receipt form with remaining quantities and “รับครบตามที่เหลือ” per line and for all lines.
  - Claim cards and a receipt timeline.
  - Admin จ่ายผู้ขาย section: credit days, settlement, and a Thai proof upload with a 100 MB check.
  - Thai validation messages.
- Checks: 178 native tests (3 new), type check, lint, source audit, DESIGN sync, production build.
- Chrome walk against a test-only API stub (backend down): `pim.admin` 1280 Dark / 390 Light and `anan.staff` 768 Dark. No overflow or console errors. The intercepted receipt, claim, credit-days and settlement payloads match the earlier shapes. Staff see no payment tab or section.
- Not exercised against the live API: real data, saves, conflicts, retry, proof upload. Pending owner decision: none.

## Staff/Admin redesign Step 4 (สั่งซื้อวัตถุดิบ) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 4 complete (`ef034d5` shared view-tab/toggle/note styles, `0981939` page, `e5ac7df` Step 1 usage-form fix). Five status tabs with counts and search, one action card per order state, side-panel new-order step form with `MaterialPicker` and exact live total (`MaterialSearch` removed), ผู้ขาย view with side-panel add/edit, Thai validation.
- Checks: 175 native tests (1 new), type check, lint, source audit, DESIGN sync, production build.
- Chrome walk: the local backend was down (Docker Desktop not running), so `pim.admin` was walked against a test-only API stub at 360/390/768/1280/1920, Light and Dark: no overflow or console errors; intercepted reject/new-order/supplier payloads match the earlier shapes.
- Fix found on the way: the Step 1 usage form nested the material search form, so searching could also submit usage. Fixed in `e5ac7df`; not re-walked in the browser.
- Not exercised against the live API: real order data, saves, conflicts, retry. Pending owner decision: none.

## Staff/Admin redesign Step 3 (สต๊อกวัตถุดิบ + ข้อมูลหลัก) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 3 complete (`2067a65` shared Toast timer fix, `64548f1` page). Stock table/cards, real-value filter chips, shared side panel with movement history, Admin step-form stock adjustment with exact preview and reserved block, Admin ข้อมูลหลัก view tab (`?view=catalog`).
- Checks: 174 native tests (2 new), type check, lint, source audit, DESIGN sync, production build.
- Chrome walk (real local API, writes intercepted): `pim.admin` at 360/390/768/1280/1920 and `anan.staff` at 390/1280, Light and Dark, no overflow or console errors. Intercepted stock/unit/material payloads match the earlier ones.
- Decisions: ข้อมูลหลัก is reached through the page's view tab, not a separate sidebar item (no new nav link type). `MaterialSearch` moved to `material-search.tsx`; Step 4 replaces it.
- Not exercised against the live API: saves, conflicts, retry path. Pending owner decision: none.

## Staff/Admin redesign Step 2 (คำขอและใบเสนอราคา) — 2026-10-30

- Handoff: `docs/025-staff-admin-redesign-handoff.md`, Step 2 complete. Six stage tabs with counts from existing reads, one next-action card per stage, automatic minimum price, Deposit/PO review, customer name To be defined.
- Checks: 172 native tests (9 new stage-domain tests), type check, lint, source audit, DESIGN sync, production build.
- Chrome walk (real local API, writes intercepted, 0 attempted) as `anan.staff` and `pim.admin` at 1280px and 390px, Light and Dark: no console errors. Found and fixed a 421px phone overflow from hidden tab labels; งานผลิต re-walked clean.
- Not walked: widths 360, 768 and 1920px; save, send, approve and reject against the live API.
- Pending owner decision: none for this step. Not changed: AGENTS.md (uncommitted owner edit), `.gitignore` (`graphify-out`).

# Frontend Implementation Plan

## Direct local-test account switching — 2026-10-29

- `91c94c5` pushed: confirm replacement identity before revoking previous session;
  preserve current account on candidate failure, guard concurrent sign-out and
  handle unconfirmed old-session logout with local clear/warning/candidate cleanup.
- UI completed: inline six-account selection instead of login-page redirect;
  shared public username list, disabled current/pending choices, cancel/Escape,
  inline errors and mobile menu close. Normal logout and local-test guards remain.
- 145 tests, lint, TypeScript, source audit and build pass. Real browser switching
  traversed all six accounts with correct roles and old-token revocation, without
  intermediate login. Separate simulated failures/cancel retained the current
  account. No backend/business-data/dependency/route changes. See the local-test
  handoff for verification scope and remaining full-workflow limits.

## Password-free local-test integration — 2026-10-29

- Batch 1 pushed (`1d5468b`): real API/session method, shared memory-only session
  lifecycle, explicit UI opt-in plus loopback restriction, failure guidance/tests.
- Batch 2 completed: wire demo buttons and keep normal password login; development-only
  ignored config enables this machine, example/production default stays off.
- Real browser-to-API verification passed all six accounts, server roles, normal
  logout/revocation and company membership boundaries. No new workflow records,
  seeds, migrations, backend edits or deployments. Populated workflow isolation
  and private S3 remain separate checks. See `docs/local-test-login-handoff.md`.
- 136 native tests, lint, TypeScript, source audit and production build pass.
  Simulated 404/401/429/offline UI recovery and production-default password-free
  OFF behavior were verified separately; the temporary production preview stopped.

## Real-backend username picker — 2026-10-28

- Owner approved a collapsed `/login` picker for six public seeded usernames.
  It fills username only, clears/focuses password, disables while busy and never
  submits, selects a role or restores the browser mock. Registration excludes it.
- 126 native tests, lint, TypeScript, source audit and production build pass.
  Desktop/mobile Dark/Light checks pass for all six choices and manual sign-in
  with an intentionally aborted request; this is not real-account verification.

## Browser mock removal — 2026-10-28

- Owner-approved scope: remove browser-mock login, session branches, controls,
  fictional data/routes, mock-only tests and private-object shortcuts. Preserve
  real workflows, exact money/stock rules, roles, routes and test-only fetch stubs.
- Batch 1 completed and pushed (`399000a`): real-only session/login and Customer/
  Staff/Admin shells; regression tests plus desktop/mobile login failure checks.
- Batch 2 completed: remove 35 mock source/test files and 73 obsolete CSS selectors;
  keep real file-preview security/cancellation tests; update setup documentation
  and guardrails. Remaining 124 tests, lint, TypeScript, source audit, production
  build and desktop/mobile login/connection-failure checks pass.
- No backend/DB mutations, migrations, seeds, deployments or dependency changes.
  Real seeded-account verification remains separately blocked by operator database
  readiness/private credentials. See `docs/real-api-only.md` for the handoff.

## Purpose and scope

Build the frontend for the Machine Shop Custom Manufacturing System using the existing Next.js App Router project. The product workflow covers customer requests, quotations, production jobs, material purchasing and receiving, inventory, delivery, and payments. The business is not registered as a company and does not charge VAT.

This plan uses `docs/02-frontend.md` as the product source of truth and the repository's existing structure and dependency versions. It does not define new routes, endpoints, fields, or behavior where the documentation is silent.

## Current repository baseline

- App Router source: `app/` (`page.tsx`, `layout.tsx`, `globals.css`, and favicon).
- Product requirements: `docs/02-frontend.md`.
- Stack declared in `package.json`: Next.js 16.4.0, React 19.3.0, TypeScript, Tailwind CSS 4.
- Existing root `AGENTS.md` contains generated Next.js guidance and project-specific frontend conventions.
- Do not restructure folders or install/upgrade dependencies without approval.

## Phase status and commit policy

- Phase 1: in progress. Repository review and a decision register are available in `docs/01-phase-one-decisions.md`; unanswered decisions remain open.
- Phase 2: completed for the approved demo scope. Responsive demo login, sign-out, session restoration, role navigation, and empty workspaces are implemented. See `docs/03-phase-two-handoff.md` for scope, validation, and local run instructions.
- Phase 3: implemented as a Customer demo for review. UC1/UC3/UC4/UC9, native rule tests, and local browser checks pass. Local form/file/payment choices and request completion remain explicitly open; see `docs/04-phase-three-handoff.md`.
- Phase 4: implemented and verified as a local Worker prototype, including Admin UC6 ordering. Shared in-memory records now survive demo role switches; reset/reload clears all roles. Automatic shortage recommendations remain disabled; see `docs/05-phase-four-handoff.md` for scope and demo-only safety gates.
- Phase 5: implemented as an Admin demo: add/edit Workers with required name/email/phone, deactivate/reactivate, and clearly labeled password-change simulation. No real credential or login-enforcement behavior is inferred. See `docs/06-phase-five-handoff.md`.
- Phase 6: implemented and verified for the local demo. Shared Bangkok/THB formatting, accessible dialogs/file feedback, canceled-read cleanup, contextual empty states, stale-notice prevention, mobile controls, and demo storage fallback are covered. See `docs/07-phase-six-handoff.md`.
- Phase 7: supported-scope integration implemented against backend AUTH/UC1/UC2/UC3. Memory-only real sessions, registration/memberships, requests/private files/inbox, quotations and decisions/terms are connected; existing Worker list/status/password actions work. Required Worker email/phone create/edit remains blocked by missing backend support; real UC4–UC9 remain unavailable. Verification and limitations are recorded in `docs/08-backend-integration-handoff.md`.
- Commit each coherent, verified group separately with a descriptive purpose. Push groups as work progresses and push all completed work before handing off a finished phase. Do not leave the entire project for one final commit/push.
- Stage only task-related files/hunks and exclude unrelated user edits. Use the detailed commit and push workflow in `AGENTS.md`.
- Documentation verification: review consistency with the source guide, check references, and run `git diff --check`. Application checks are required when application code changes.

## Delivery phases

### 1. Confirm unresolved product and integration decisions

Keep implementation choices that depend on these items open until confirmed:

- Explicitly labeled demo accounts are approved for initial frontend login. Production authentication provider, session/reset behavior, and account linkage to `PERSON` remain open.
- Exact screens/routes, form fields, validation copy, loading/empty/error behavior, and pagination/filter/sort.
- API endpoints, request/response shapes, error format, date/money serialization, and file authorization/signed URL behavior.
- Additional Admin permissions; both Admin and Worker may perform UC6, confirmed during Phase 1. Worker add/edit/deactivate/reactivate/password change and required name/email/phone were confirmed during Phase 5; production auth semantics remain open.
- Whether `JOB_REQUEST.completed` occurs after delivery or after full invoice payment.
- Required Deposit/PO must be submitted within 14 days after quotation acceptance, confirmed during Phase 1. Invoice payment terms remain to be defined.
- Money precision/rounding for confirmed minimum price `(material cost + labor cost) × 1.60` (60% markup).
- Planned material and required quantity will be saved per JOB, confirmed during Phase 1. Exact input/storage schema and the conflicting stock-shortage calculation remain to be defined.
- Supplier payment options and settlement of pending credit.
- Notification channels, events, recipients, and UI behavior.
- File MIME/extension allowlist and handling of incomplete uploads.
- Status transitions missing from the source, including proposed `MATERIAL_ORDER_ITEM.partially_received`.

### 2. Establish role-aware application shell

Completed on 2026-10-15 as a demo shell at `/`. Workspace panels use client state rather than new routes. Business actions, production authentication, and API integration remain deferred.

- Use the existing App Router structure; add folders only when the screen design is confirmed.
- Provide explicitly labeled demo login and role-aware navigation for Customer, Worker, and Admin. Real authentication remains deferred until Backend defines its contract.
- Do not expose Supplier as an in-app role unless requirements change; Supplier is currently an external actor.
- Do not grant unconfirmed Admin capabilities or assume Admin inherits all Worker permissions.

Validation passed: `npm run lint`, `npm run build`, five native Node role-access tests, desktop/mobile browser checks, demo session restoration, and sign-out. The app shell and verification handoff are separate commit groups on `develop`.

### 3. Implement Customer workflows (UC1, UC3, UC4, UC9)

Delivered on 2026-10-15 as local demo workflows at `/`. Sample records and file objects are held in memory. Phase 4 supersedes the original sign-out reset: records survive role switches and reset only on reload/global reset. No real API, payment transfer, or S3 upload is performed. The request completion rule remains unchanged pending confirmation; local installment recording updates only the sample invoice.

- UC1: submit a manufacturing request and document/image attachments up to 100 MB.
- UC3: review quotation revisions and accept/reject; show rejection count. Historical Phase 3 used fifth-rejection cancellation; Phase 7 corrects the demo and real integration to sixth-rejection cancellation.
- UC4: present Deposit/PO rules by customer type and quotation amount; collect the applicable evidence.
- UC9: show delivery/invoice information, support installment payments, and let the Customer inspect/accept or return work.

Verification: 15 native tests passed; lint/build passed; headless Chromium checks covered request creation, document preview, failed attachment recovery, all three Deposit/PO combinations, fifth-rejection cancellation, delivery acceptance/return, installment arithmetic/overpayment, mobile widths, and role isolation. Changes are split into domain/tests, UI, and handoff commits on `develop`.

### 4. Implement Worker workflows (UC2, UC5–UC9)

Delivered on 2026-10-15 as local demo panels at `/`. UC6 is also available to Admin without granting other Worker permissions. Native tests (26 total), lint, production build, cross-role Chromium checks, and six-panel mobile checks passed. Domain/tests and shared-state/UI commits were pushed separately to `origin/develop`; the handoff is a third documentation group.

Automatic shortage calculation is deliberately disabled because D08 is unresolved. The UI shows saved required quantities, usage, reservations, free stock, and incoming orders; order quantity is manually entered for review. Whole-piece quantities, reservation/production safety gates, and demo payment/status choices are not confirmed production policy. See `docs/05-phase-four-handoff.md`.

- UC2: prepare/save/send a quotation, or reject a request; minimum 60% markup is confirmed, while exact inputs and rounding require definition.
- UC5: show `qty_on_hand`, `qty_reserved`, and `qty_available`; reserve materials only according to confirmed stock logic.
- UC6: create material orders for both Admin and Worker, as confirmed during Phase 1.
- UC7: record good/defective receipts and Supplier payment according to confirmed fields/methods.
- UC8: track production, material use, actual cost/time, and evidence attachments.
- UC9: record delivery or pickup, invoice, and payment information as authorized.

### 5. Implement Admin workflows

Delivered on 2026-10-15 as local demo management at `/`. Owner confirmed add/edit, deactivate/reactivate, password change, and required name/email/phone. The Admin-only screen provides synthetic profiles, search/status filtering, forms, status confirmation, and password-change simulation. Existing UC6 purchasing is unchanged. Real password changes require the Backend authentication contract; the app never persists or transmits password text.

- Support Worker management and Supplier ordering only within confirmed permissions. Do not grant Admin Worker UCs or offer permanent deletion/job reassignment.
- Preserve shared workshop data during profile/status edits. Reload/global reset restores all role fixtures; pending Admin forms clear on reset.
- Treat new-profile active default, simple email validation, contact-format/uniqueness, and real login/session effects as explicit prototype choices or pending decisions, not new business rules.
- Verify required fields, immutable profile updates, status toggling, role isolation, password-entry clearing, no credential persistence/transmission, and mobile layout.
- Do not add material/unit/Supplier master-data management or order-approval screens until approved.

### 6. Apply shared display and interaction rules

Delivered on 2026-10-15 for the existing demo panels, without new dependencies, folders, routes, endpoints, or business transitions. Forty native tests, lint/build, all three prior browser regression suites, focused canceled-read/focus/mobile/timezone checks, and four storage-failure scenarios passed. Exact production UI/API/loading/retry contracts remain open; local synchronous saves do not fabricate network loading or remote success.

- Display time in `Asia/Bangkok`, amounts in baht, and no VAT.
- Use the documented entity and status names. Do not offer actions for unconfirmed transitions.
- Provide loading, empty, and error states for each implemented flow; exact copy and retry semantics require definition.
- For failed uploads, provide “Upload again” to start a new upload. Do not assume automatic or resumable retries.
- Do not show an operation as successful until the system confirms it.
- Never place S3 or authentication secrets in frontend code. Configure the API base URL through environment variables.

Implemented details: shared display-only helpers and unit tests; shared dialogs with unique accessible titles and focus restoration; common file picker/preview with processing state, hint/error association, and aborted-read cleanup; contextual Customer empty states; keyboard focus/touch-size/mobile input improvements; atomic local action notices; page-memory demo role fallback on read/write/remove failure. Storage fallback is not authentication and cannot delete a stored role when browser removal is forbidden. See the handoff for integration limits and the checklist mapping.

### 7. Integrate with Backend

Owner authorized integration. Implement in coherent groups: (1) tested memory-only Bearer API client with exact decimal/int64 handling and private upload protocol; (2) real login/registration, memberships/invitations, UC1 requests/files/inbox, UC2 quotations and UC3 decisions/terms at the existing `/` panel structure; (3) verification and handoff. Real mode must never use demo records or automatically fall back to the demo after API failure. Keep UC4–UC9 demo-only because the backend has no contracts for them yet.

Contract overrides: Backend `docs/AUTH.md`, `UC1.md`, `UC2.md`, `UC3.md` define active integration behavior. Sixth distinct customer rejection cancels (five permit revision); accepted deposit rounds upward to a satang; immutable terms/deadline come from server. API money is decimal strings; quantities use int64 without JS precision loss. Required Worker email/phone remain an explicit backend implementation gap: do not integrate contact writes by dropping fields. Backend code/schema changes are not part of this frontend phase.

Delivered groups: `2f0b6ac` API utilities/tests, `7a446a3` connected screens/configuration, `81b69cc` demo six-rejection correction, then documentation handoff. Each implementation group was pushed separately to `origin/develop`. Verification passed: 47 native tests, lint, production build, and real Chromium → isolated Go API/PostgreSQL/private S3/outbox flow including genuine stale-edit 409, fresh-intent upload retry and sixth-rejection cancellation. No backend source, existing database or unrelated dependency edits were changed. See `docs/08-backend-integration-handoff.md` for setup, full changed-file list and remaining gaps.

Request the reads and actions listed in `docs/02-frontend.md` under “Needs from Backend.” Agree on the API contract before wiring request/response logic. Backend remains the source of truth for business validation and atomic transactions, including UC2, UC7, and UC8.

## Validation checklist

### 10. Designed shell on live/mock API and connected UC6–UC9 — implementation delivered; full-stack verification pending (2026-10-25)

Owner direction: use `DESIGN.md` (from the UX/UI Figma) as the visual spec and finish the frontend before database/system integration, with mocks. Owner chose one designed shell for live and test use, test accounts on an in-browser contract mock (no new config key), and routes aligned to backend permissions (approved route list in `docs/11-phase-ten-handoff.md`).

Groups (each pushed to `origin/develop`): `97692af` transport + contract mock (AUTH, UC1–UC9) with tests; `a5628d0` shell on the memory-only live/mock session, UC1–UC5 screens in role routes, new routes; `6913dbd` remove the fixture demo; `1ae70ce` UC6; `53bb6fa` UC7; `76f3793` UC8; `8ce9054` UC9; documentation handoff. 44 native tests + TypeScript pass; headless Chrome flows pass against the mock. Pending: real-stack verification (Docker), ESLint config/dependency mismatch and the Next.js security upgrade — both need owner approval.

### 9. Integrate live UC5 inventory — implementation delivered; full-stack verification pending (2026-10-23)

Owner requested backend integration. Resume pending real UC4 verification if Docker becomes healthy, then connect live UC5: staff inventory search/read; Admin unit/material catalog and reasoned exact stock additions/count corrections; Worker queued-job full material plans, release and explicit reservation top-up. Backend UC1–UC9 is now implemented, but this frontend delivery is intentionally UC5, not a guessed implementation of all remaining phases. Read UC5.md and current material handler/view DTOs at backend 028dd88. Honor UC7 financial redaction: Workers receive quantities but not avg_cost, movement costs/private payload/reasons. No new dependencies/routes/folders or backend edits; preserve package edits.

Groups: exact six-decimal types/validation/tests; catalog/stock UI; job plan/reservation UI; real or explicitly stubbed verification and handoff. Commands retain exact idempotency keys/payloads for explicit uncertain-response retry, reload current GET after replay, never auto-retry or treat reservation as consumption.

Delivered/pushed: `37d4006` exact domain/tests; `909f670` catalog/stock; `2960f76` plans/reservations; `bd676fb` clipped nonfocused skip link. 58 native tests, TypeScript and changed-file lint pass. Contract-stubbed browser checks are UI-only; real UC4/UC5 checks remain blocked because Docker does not respond after normal startup. No Docker repair/reset/data change. Build compiles/prerenders but exits 1 on recurring Next.js security-upgrade gate; no upgrades authorized. Existing whole-project appearance.tsx lint error remains. See `docs/10-phase-nine-handoff.md`. Next frontend scope: UC6 Admin supplier ordering, then UC7 receiving, UC8 production, UC9 delivery/settlement; none is connected by this phase.

### 8. Connect Worker contacts and UC4 fulfillment — implementation done; full-stack verification pending

Owner authorized the next frontend phase. Backend develop `ab0c224` now implements required Worker contacts and UC4 (also UC5/UC6, intentionally deferred to following frontend phases). Use AUTH.md/UC4.md and verified DTOs, no backend changes. Preserve existing `/` panels/design, dependencies, memory-only sessions and unrelated package edits.

Commit groups: exact evidence/contact types and validation tests; real Admin Worker add/edit with nullable legacy display; UC4 Customer file-to-evidence submission and Admin/Worker review with queued job display; verification/handoff. Use a new ready upload for rejected replacement, retain identical idempotency payload for uncertain submission retry, and distinguish technical upload completion from payment verification. No bank transfer or invoice action. Later backend-confirmed Admin-only UC6 overrides the older shared Admin/Worker rule; no live procurement actions in this phase.

Implemented/pushed groups: `58279b7` exact inputs/tests; `9a37d21` merge existing upstream designed auth/routes (preserved plan rename to uppercase PLAN.md); `b29e722` live Worker contacts; `6ad3f82` UC4 submission/review/job display. This is not an all-green completed phase: real API/PostgreSQL/S3 browser verification remains blocked by Docker Desktop startup at its dockerInference socket. Normal startup failed; no reset, socket/data deletion or settings change was attempted. Owner was asked to start Docker. Production build + 53 native tests + changed-file lint + design snapshot/detector pass. Contract-stubbed browser checks pass and are explicitly not backend verification. Full-project lint still flags upstream appearance.tsx effect/unused directive; do not suppress or silently claim success. See docs/09-phase-eight-handoff.md. Next: once Docker is healthy, run real UC4 verification, then separately authorize/connect frontend UC5 (not backend UC7).

- Verify role navigation and permissions against confirmed rules.
- Verify the individual/company Deposit and PO thresholds: five rejections allow revision, the sixth cancels.
- Verify installment payment display and invoice states (`unpaid`, `partial`, `paid`).
- Verify stock values use the confirmed availability/shortage logic.
- Verify files are documents/images no larger than 100 MB and failed uploads offer “Upload again.”
- Verify displayed time uses `Asia/Bangkok`, currency is baht, and VAT is omitted.
- Verify all implemented status actions correspond to confirmed transitions.
- Run the existing project scripts (`npm run lint`, `npm run build`) after application changes; do not add dependencies for validation.

## Out of scope until separately confirmed

- New dependencies or dependency upgrades.
- Folder restructuring.
- Invented API endpoints/contracts, routes, form fields, roles, notifications, or business rules.
- A guessed money-rounding rule or invoice due-date policy; markup basis and the Deposit/PO deadline are confirmed.
- Supplier login or unconfirmed Admin/master-data capabilities.

## Design / workflow integration — 2026-10-16

Owner authorized merging the saved orange design with the functional develop workflows.
- Restored Landing, common Login/Register presentation, light/dark transitions and Small/Medium/Large UI presets.
- Staff is the UI name for domain/API role Worker. UC2 and UC5–UC9 remain Staff duties. Admin manages Staff profiles and UC6 purchasing; no implicit inheritance.
- Separate URLs under /staff, /customer and /admin replace the historical single-page panels. Root layout owns the shared demo provider so client navigation and role switching retain records and attached files.
- Overview counts derive from shared data. Former placeholder request/payment/debtor paths redirect to the corresponding functional workspace.
- Settings and account remain outside the scrolling sidebar region; mobile uses a drawer.
- `/login` and `/register` keep the designed auth presentation while using the connected backend authentication and registration flow. Three clearly labeled local demo bypass buttons sit below the real form without granting live access.
- Business validation is preserved, including demo-only assumptions. Both demo and backend quotation flows now use the confirmed rule: five rejections allow revision and the sixth cancels.
- UI details and route inventory: DESIGN.md. Verification evidence: docs/08-design-workflow-integration.md.

## Systems Analysis report documentation — done (2026-10-29)

- [x] Read the supplied `SA Project (1).md` and compare it with current frontend/backend requirements and implementation contracts.
- [x] Add a numbered system-analysis overview and index, one numbered frontend guide for each implemented UC1–UC9, and a reconciliation note for source-only UC10–UC12.
- [x] Update frontend documentation links to the guarded real-backend demo workflow fixture; distinguish account-only seed data from optional workflow data.
- [x] Add the new-doc numbering rule without renaming historical files or changing application behavior.
- [x] Check doc references, filename convention, whitespace, and changed-file scope. No application code or dependencies changed.

Decision: current backend UC/API contracts and owner-confirmed rules take precedence over historical report details. Existing filenames remain stable; all new documentation uses a zero-padded three-digit prefix plus a descriptive title.
