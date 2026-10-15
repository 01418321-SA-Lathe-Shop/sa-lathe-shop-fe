# Phase 4 — Worker Demo Workflows

Status: **Implemented and verified as a local prototype for review**, 2026-10-15. Production decisions remain open in `docs/01-phase-one-decisions.md`; this phase does not resolve them by implementation.

## Scope

| Workspace | Role / UC | Implemented local behavior |
|---|---|---|
| Quotations | Worker / UC2 | Read requests/attachments/Customer PO, enter material and labor costs and final price, enforce 60% minimum markup, save hidden draft, send, revise after rejection, reject request |
| Materials | Worker / UC5 | Search material names, show stock/reservations/free quantity/Moving Average, save planned materials and quantities per JOB, reserve available planned stock, view factual required/used/reserved/free/incoming counts and movement ledger |
| Material orders | Worker and Admin / UC6 | Select queued job and saved planned material, Supplier, manual order quantity, unit price; create/list demo orders. Worker may simulate external Supplier rejection before any receipt |
| Receiving | Worker / UC7 | Partial/full receipt of good and defective goods; good-only stock and Moving Average; defect/claim log; simulate Supplier paid or CREDIT pending; manual link back to stock |
| Production | Worker / UC8 | Read job/plan/reservation/usage, start, issue reserved material partially/fully, record actual cost/minutes and document/image evidence, complete, resume returned work |
| Delivery & payments | Worker / UC9 | Record delivery/pickup, recipient and evidence; create invoice less applicable Deposit; record installments; redeliver reworked jobs without a second invoice/Deposit deduction |

Customer UC1/UC3/UC4/UC9 remains available. Role changes use the existing demo sign-out/login flow, not a new role-switch route. Admin has no access to Worker receiving/production/inspection actions; Worker management stays a Phase 5 placeholder pending D04.

No API calls, PostgreSQL transactions, remote file uploads, external notifications, Supplier orders, or payment transfers are performed. `/`, the existing `app/` layout, and dependencies are unchanged.

## Shared data and file lifecycle

- `DemoWorkshopProvider` holds a single in-memory sample state above login/role panels. Signing out does not discard committed demo records, allowing Customer → Worker → Customer walkthroughs. Unsubmitted forms are not persisted across role/workspace unmounts.
- Reload restores fixtures for all roles; only the selected demo role restores from tab `sessionStorage`. There is no cross-tab, multi-device, or server persistence.
- Reset asks for confirmation and resets all roles' records and files. A reset generation remounts workspace forms so old unsaved quantities/evidence do not leak into fresh fixtures.
- Shared file objects can be opened by the next demo role. Blob preview URLs are created on demand and revoked on close/unmount; no S3 credentials or real auth tokens are present.
- Documents/images use the existing common-extension filter and decimal 100 MB limit. “Fail next evidence upload (demo)” exercises failure; “Upload again” starts a fresh selection. Production allowlist/content validation remains D11.
- Required Deposit/PO expiry still runs on a 10-second timer and focus check. It updates requests without replacing shared stock/order state. The prototype's exact cutoff remains acceptance + 14 × 24 hours, pending final date-boundary policy.

## Integrity and demo-only decisions

| Topic | Behavior / pending production decision |
|---|---|
| UC2 consistency | Request and quotation/cost update in one pure state transformation. Sent/approved quotations are not overwritten; a rejected revision may get a new draft. Drafts/internal costs are not displayed in Customer views |
| Price / money | Minimum `(material + labor) × 1.60` is confirmed. Local input is two-decimal THB → integer satang. Invalid/under-minimum prices and half-satang Deposit are rejected rather than rounded. Production precision is D07 |
| Quantities | Demo inventory uses whole `pcs` quantities, per input up to 1,000,000. This cap/unit precision is a local form guard, not a confirmed business maximum or order limit |
| Shortage | **No automatic shortage result/recommendation.** Display factual counts and let a person enter demo order quantity. No duplicate-coverage ceiling is inferred; review existing incoming orders manually. Final formula/order policy is D08 |
| Reservation | Available = on hand − active reservations. Top-up reserves only free unreserved planned quantity; repeat action cannot overbook. Plans lock after reservations/active orders as a demo safety gate; release/edit/variance policy is pending |
| UC7 consistency | One pure update records receipt, good-only material/average/movement, defect and order/item status. No partial mutation if validation fails. No duplicate receipt ID or over-receipt |
| Cost precision | Moving Average and issue costs retain exact numerator/denominator strings derived with BigInt. Two-decimal display is formatting only. Defects do not enter average; issue does not change average. Production NUMERIC precision remains open |
| Receipt states | Cumulative good + defective fulfills an ordered line, with all-defective line shown `damaged`; order may be `received` while job still lacks usable stock. Item `partially_received` remains a documented proposal, not a newly confirmed enum |
| Supplier / claims | Explicit status simulations only; CREDIT → pending, simulated paid → paid, after a first receipt. No final payment method/amount/timing/settlement decision. Simulated claim sets CLAIMED; no actual notification, resolution/write-off, or replacement workflow |
| Handoff | Manual stock recheck/reservation; no automatic start after receipt. UC7-to-UC5 remains a proposal (D13) |
| UC8 consistency | Issue updates usage, decrements on hand, creates ledger movement and splits active/consumed reservation in one transformation. It cannot issue more than reserved, remaining planned, or on-hand quantity |
| Production gates | Demo start requires all planned quantities reserved. Completion requires saved actuals and full planned issuance; these deliberately conservative gates avoid silently releasing leftover stock. Exact actual fields, variance and rework accounting require confirmation. Returned jobs retain saved actuals and usage; actuals can be revised |
| UC9 consistency | Initial invoice is approved quote less applicable recorded Deposit. Installments reject overpayment/replay. Return pauses payment and resumes job; redelivery preserves original invoice ID, total, and payments. No request-completion or invoice-deadline policy inferred |
| Authorization | Existing role navigation plus Worker/Admin panel guard. These are demo UI restrictions, not production access control. Backend must enforce identity, ownership, authorization, concurrency, and transactions |

## Run and try it

```text
npm run dev
```

Open the printed localhost URL. For this phase's production-build verification, the server used `http://127.0.0.1:3101`.

### Stock / purchasing / production walkthrough

1. Enter Worker demo → Materials. The rubber mold sample JOB requires 8 tool steel plates; opening stock is 3. Reserve available planned stock. Start production remains disabled.
2. Material orders → choose that job/material, Supplier, quantity 5, unit price THB 3,000. This is a manually chosen test quantity, not an automatic shortage recommendation.
3. Receiving → record 2 good and 1 defective. Only 2 enter stock. Simulate claim notification and CREDIT pending if desired. Record the remaining 2 good.
4. Recheck stock manually and reserve again. Only 7 usable pieces can be reserved; production remains disabled. The received order's one defective item is not usable stock.
5. Admin can create a separate manually chosen order for 1 plate at THB 3,500. Switch to Worker to receive it, simulate paid if desired, then recheck/reserve stock. This illustrates roles without granting Admin receiving access.
6. Production → start, issue the reserved 8 pieces, save actual cost/time/evidence, complete. Moving Average for this exact receipt sequence is THB 2,687.50/piece. Production precision/rounding remains open.
7. Delivery & payments → choose the job, method/recipient/evidence, create delivery/invoice. Switch to Customer to inspect or return, then Worker for rework/redelivery; the existing invoice/payment history must remain intact.

### Cross-role quotation walkthrough

1. Customer → Requests → submit a request and local attachment.
2. Sign out → Worker → Quotations → select the new request. Enter THB 3,000 material, THB 1,000 labor, THB 6,400 final price. Save draft; Customer must not see it in Quotations.
3. Switch back to Worker and send. Customer can accept/reject; acceptance starts the 14-day required-evidence period.
4. Submit applicable Deposit/PO in Customer demo to create a queued JOB. Worker can then save its plan and continue the workflow. Company THB 6,400 requires PO only.

## Verification evidence

Using existing dependencies, from the project root:

```text
node --test app/worker-domain.test.mjs app/customer-domain.test.mjs app/customer-files.test.mjs app/demo-access.test.mjs
npm run lint
npm run build
```

| Boundary / check | Result |
|---|---|
| Native domain/file/access tests | 26 passed, including existing Customer regressions, markup/drafts/revisions, reservation idempotency/cross-job exclusivity, plans, incoming counts without shortage, partial/all-defective receipts, exact fractional average/issue cost, production gates, invoice reuse |
| ESLint / TypeScript / production build | Passed; static `/` generated with a Suspense loading boundary for current-time demo initialization |
| UI → local state → UI | Cross-role creation, preview, draft visibility, send/accept/PO, saved plan/reservation, issue, actuals, completion, pickup/invoice verified in Chromium |
| Return/rework | Customer returns, Worker completes rework/redelivers, previous installment/invoice preserved, Customer accepts/settles |
| Stock / receiving | Search empty/match, manual order, partial good/bad receipt, claim, pending CREDIT, exclusion of defect from readiness, replacement receipt/manual reserve/start/issue verified |
| Admin boundary | UC6 order succeeds; receiving/production actions absent |
| Files | Shared Customer attachment opens for Worker; production evidence failure followed by explicit new selection succeeds |
| Customer regression | Previous Phase 3 browser checks pass on the Phase 4 build: individual and both company Deposit/PO cases, fifth rejection, failed-upload recovery, delivery acceptance/return, exact installment settlement/overpayment, invalid-role recovery |
| Global reset | Clears shared Customer records; workspace forms remount to clear stale unsaved files/inputs |
| Mobile | All six Worker panels checked at 390px and 320px: no page-level horizontal overflow; wide factual table has its own scroll region |
| Browser / HTTP | No captured page exceptions or HTTP responses ≥400 during the successful workflow |
| API / database / object storage | Not connected; not claimed verified |

Browser automation used the already installed external Playwright/Chromium runtime; no project dependency was added. Visual desktop/mobile screenshots were reviewed. Native TypeScript-import tests emit the existing module-type warning; tests pass. Browser checks found and fixed accessible dropdown names. Production build found and fixed the missing current-time loading boundary; ordinary validation/debugging did not identify a qualifying framework feedback issue.

The React checklist influenced the shared provider, pure/immutable action updates, derived stock values, keyed form resets, cleanup of preview URLs/listeners, accessible labels, role guards, and responsive scrolling. The verification checklist followed UI → in-memory transformation → UI; no nonexistent backend boundary was claimed.

## Commits and changed files

All groups are on `develop`, pushed separately to `origin/develop`:

1. `038b82b` — tested Worker domain/fixtures and Customer model extension.
2. `6d5ae49` — connected Worker screens/shared demo state and extra precision/isolation tests.
3. Documentation group — source-guide prototype notes, decision register, phase plan, historical handoff correction, and this handoff.

Application/test files: `app/customer-domain.ts`, `app/worker-domain.ts`, `app/worker-fixtures.ts`, `app/worker-domain.test.mjs`, `app/workshop-context.tsx`, `app/customer-workspace.tsx`, `app/worker-workspace.tsx`, `app/page.tsx`, `app/globals.css`.

Documentation files: `plan.md`, `docs/01-phase-one-decisions.md`, `docs/02-frontend.md`, `docs/04-phase-three-handoff.md`, `docs/05-phase-four-handoff.md`.

Existing user changes to `package.json` / `package-lock.json` are preserved and excluded. Nothing under synced `sources/` was edited. No deployment/publication was performed by this phase.

## Next phase

Phase 5 is Admin Worker management. Before defining those screens/actions, confirm D04: which operations Admin may perform, required Worker fields, account lifecycle, and status-change rules. UC6 ordering is already available. Do not invent worker CRUD, new Admin permissions, master-data management, or real auth endpoints.

Subsequent owner confirmation: add/edit, deactivate/reactivate, and password change are approved; Worker name/email/phone are required. Phase 5 implements local profile management and a clearly labeled password-change simulation, without inventing real auth endpoints or account/session effects. See `docs/06-phase-five-handoff.md` for the current handoff; this Phase 4 section records the earlier decision boundary.
