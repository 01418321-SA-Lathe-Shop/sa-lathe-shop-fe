# Phase 3 — Customer Demo Workflows

Status: **Implemented and verified as a local prototype for review**, 2026-10-15. Production decisions remain open in `docs/01-phase-one-decisions.md`.

Historical handoff: Phase 4 supersedes the original sign-out/reset behavior described below. Customer and Worker now share in-memory records and files across demo role switches; reload or global reset clears them. See `docs/05-phase-four-handoff.md` for current behavior. The Phase 3 verification results below describe that phase's original build.

## Scope

| Use case | Implemented demo behavior |
|---|---|
| UC1 | Create a request with job details, customer type, and optional document/image attachments. New requests start `pending` and wait for a Worker estimate |
| UC3 | Review quotation revision history, accept/reject the current `sent` quotation, show rejection count, and cancel on the fifth rejection. A rejected quotation cannot be answered twice; a Worker must issue a revision |
| UC4 | Show exact Deposit/PO requirements; attach and inspect local evidence; submit within 14 days of quotation acceptance; create one `queued` JOB when requirements are met |
| UC9 | Inspect a sample delivery, accept or return it, record local sample installments, show allocation history/balance and `unpaid`/`partial`/`paid`, reject overpayment, and reopen production on return |

No real request, Supplier order, payment transfer, remote file upload, or notification is sent. The app keeps `/` and the existing directory structure; no dependencies were added.

## Sample scenarios

These are synthetic demonstrations, not real customer records. Customer type is varied per sample to exercise terms without finalizing production account ownership/schema.

| Scenario | Quotation | Requirement / purpose |
|---|---|---|
| Individual mold insert | THB 6,400.00 | THB 3,200.00 Deposit, no PO |
| Company threshold example | THB 10,000.00 | PO, no Deposit |
| Company mold assembly | THB 16,000.00 | PO and THB 8,000.00 Deposit |
| Fifth-response example | THB 9,600.00, revision 5 | Four prior rejections; one more cancels the request |
| Completed production/delivery | THB 12,800.00 | Deposit of THB 6,400.00 already deducted; invoice balance starts at THB 6,400.00 |

Rejecting a quotation never fabricates a new Worker quotation. Confirming an order does not fabricate completed production or a delivery. The delivery fixture exists separately so UC9 can be tried before the Worker phase.

## Prototype choices and remaining decisions

- Forms use job details, customer type, attachments, and installment amount. Exact production fields/API contracts are still to be agreed.
- Amounts use integer satang internally and two decimal places for local input/display. Inputs must be positive, fit safe integer arithmetic, and not exceed the balance. Production precision/rounding remains open; the demo refuses a half-satang Deposit rather than selecting a rounding rule.
- The 14-day prototype cutoff is quotation acceptance plus 14 × 24 hours. Late evidence is blocked, and outstanding unconfirmed orders expire on the next 10-second timer/focus check. Confirmed JOBs do not expire. Exact production date-boundary policy remains open.
- Common PDF/Office/text/OpenDocument and image extensions are accepted locally up to decimal 100 MB. This is a prototype selection filter, not MIME/content scanning or a production security allowlist.
- “Record demo installment” changes only the local sample invoice. Whether production Customer payments require Worker verification is still open.
- The final trigger for `JOB_REQUEST.completed` remains open; delivery/invoice can be fully accepted/paid while request status stays `ongoing` in this prototype.
- Invoice due dates, signed URLs, real file storage, production authentication, and Backend authorization remain deferred.

The above choices are visible for review and are not recorded as new confirmed business rules. Follow-up answers can replace them without changing the confirmed 50% Deposit, company threshold, five-rejection limit, or installment support.

## Local state and files

- Customer state lives in the mounted Customer workspace. Switching between Customer panels/overview preserves it; sign-out or reload restores sample scenarios. The Phase 2 demo role itself still restores from `sessionStorage`.
- File objects stay in browser memory. No content or credential is persisted or transmitted by the attachment control. Object URLs are created only on preview and revoked on close/unmount.
- Local images can be previewed. Other documents can be downloaded to open with the user's viewer. “Use demo document” creates an explicitly labeled sample text document that can also be inspected in the modal.
- “Demo tools” provides reset and a one-shot failed attachment. A failure requires a fresh selection via “Upload again” or another explicit selection; there is no automatic retry.
- Draft Deposit/PO evidence is keyed to its request, so it cannot confirm a different request after selection changes.

## Validation

From the project root, using existing dependencies:

```text
node --test app/customer-domain.test.mjs app/customer-files.test.mjs app/demo-access.test.mjs
npm run lint
npm run build
```

| Check | Result |
|---|---|
| Native Node tests | 15 passed: terms, fixtures, UUIDs, duplicate responses, fifth rejection, required proofs, expiry, delivery return, installment balance/replay/overpayment, files, decimal input, and role boundaries |
| ESLint | Passed |
| Production build | Passed; static `/` generated |
| HTTP smoke | 200; expected login and title rendered |
| Browser UC1 | Request created, unsupported file rejected, demo attachment inspected |
| Browser UC3 | Accept works; fifth rejection cancels and removes response controls |
| Browser UC4 | Individual Deposit, company PO-only, and company PO+Deposit all checked; required-proof controls and queued JOB verified |
| Browser file failure | One-shot failure shown, confirmation blocked, fresh attachment succeeds |
| Browser UC9 | Delivery accepted; overpayment rejected; THB 123.45 + THB 6,276.55 settled THB 6,400.00 exactly; two history entries; extra payment controls removed |
| Browser return | Delivery `returned`, JOB `in_progress`, local payment recording paused |
| Browser role boundary | Worker does not render Customer forms; invalid stored Supplier role returns to login |
| Responsive checks | No horizontal overflow at 390px/320px; desktop/mobile screenshots reviewed |
| Browser errors | No page exceptions captured during checked flows |

The app browser connector was unavailable during this phase. Browser checks used an already installed Playwright runtime and headless Chromium outside the repository; no test dependency or browser was installed into the project. A Node module-type warning can occur in native TypeScript-import tests; it does not affect their result.

Browser testing found and fixed the Customer-type selector's accessible label. Visual review also corrected navigation focus/scroll behavior and scoped action notices to their workspace.

## Run and try it

```text
npm run dev
```

Open the URL printed by Next.js, enter the Customer demo, and select Requests, Quotations, Deposit & PO, or Delivery & payments. For the current checked production build, the local preview used `http://127.0.0.1:3101`.

Use the fifth-response fixture to check cancellation without implementing Worker quotation edits. Use the ready-delivery fixture for installment and return checks. Reset sample data to repeat a scenario. Business changes reset on reload/sign-out.

## Commit groups and files

1. `b2d0284` — domain rules, synthetic fixtures, file/money helpers, and native tests.
2. `6da7cb7` — Customer screens, attachment previews, responsive styles, and shell integration.
3. Documentation handoff — phase status, open decisions, source-guide implementation notes, and this verification record.

All groups are pushed to `origin/develop`. Existing package-file edits are excluded.

Implementation files: `app/customer-domain.ts`, `app/customer-domain.test.mjs`, `app/customer-fixtures.ts`, `app/customer-files.ts`, `app/customer-files.test.mjs`, `app/customer-workspace.tsx`, `app/page.tsx`, `app/globals.css`.

Documentation files: `plan.md`, `docs/01-phase-one-decisions.md`, `docs/02-frontend.md`, `docs/04-phase-three-handoff.md`.
