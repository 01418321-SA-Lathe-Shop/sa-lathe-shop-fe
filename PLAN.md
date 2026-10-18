# Frontend Implementation Plan

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

### 8. Connect Worker contacts and UC4 fulfillment — in progress

Owner authorized the next frontend phase. Backend develop `ab0c224` now implements required Worker contacts and UC4 (also UC5/UC6, intentionally deferred to following frontend phases). Use AUTH.md/UC4.md and verified DTOs, no backend changes. Preserve existing `/` panels/design, dependencies, memory-only sessions and unrelated package edits.

Commit groups: exact evidence/contact types and validation tests; real Admin Worker add/edit with nullable legacy display; UC4 Customer file-to-evidence submission and Admin/Worker review with queued job display; verification/handoff. Use a new ready upload for rejected replacement, retain identical idempotency payload for uncertain submission retry, and distinguish technical upload completion from payment verification. No bank transfer or invoice action. Later backend-confirmed Admin-only UC6 overrides the older shared Admin/Worker rule; no live procurement actions in this phase.

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
