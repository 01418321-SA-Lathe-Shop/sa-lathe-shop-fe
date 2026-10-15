# Phase 1 — Product and Integration Decisions

Status: **In progress — discovery prepared; outstanding decisions need confirmation.**

Source of truth: `docs/02-frontend.md`. Owner confirmations received on 2026-10-15 are recorded explicitly below. This register does not introduce routes, endpoints, or an implementation contract.

## Repository findings

- At the Phase 1 review, the application consisted of the Next.js starter in `app/page.tsx`, with `app/layout.tsx`, `app/globals.css`, and favicon. Phase 2 added the demo shell; Phase 3 added Customer actions; Phase 4 added Worker actions and Admin UC6 ordering with shared in-memory demo records. See their handoff documents. Production authentication and real business API actions remain unimplemented.
- `package.json` declares Next.js 16.4.0, React 19.3.0, TypeScript, and Tailwind CSS 4. This is compatible with the guide's Next.js requirement; the guide does not prescribe exact versions or a folder layout.
- `docs/02-frontend.md` is the available frontend requirements guide. It contains data/action needs, but no endpoint contract, exact field schema, or authentication design.
- Existing changes in `package.json` and `package-lock.json` are outside this documentation task and are excluded from its commits.
- The generated Next.js guidance in `AGENTS.md` is preserved. Local Next.js guides must be consulted before application code changes.

## Confirmed requirements

| Requirement | Confirmed behavior | Related UCs |
|---|---|---|
| Roles | Customer, Admin, Worker require login; Supplier is external | UC1–UC9 |
| Customer types | `individual` and `company` are customer types, not roles | UC1, UC3, UC4 |
| Deposit/PO | individual: 50% Deposit, no PO; company price ≤ THB 10,000: PO only; company price > THB 10,000: PO + 50% Deposit | UC3, UC4 |
| Rejections | Count Customer rejections; cancel request on fifth rejection | UC3 |
| Pricing | Owner confirmed markup: minimum `final_price = (material cost + labor cost) × 1.60`; higher prices are not excluded by the minimum requirement | UC2 |
| Deposit/PO deadline | Owner confirmed required Deposit/PO must be submitted within 14 days after quotation acceptance; invoice payment terms are not established by this decision | UC3, UC4 |
| Purchasing role | Owner confirmed Admin and Worker can place material orders | UC6 |
| Initial login | Owner approved explicitly labeled demo accounts until Backend defines real authentication; production security remains open | UC1–UC9 |
| Planned materials | Owner approved a saved material/required-quantity list per JOB; exact schema and shortage logic remain open | UC5, UC6 |
| Installments | Multiple payments allowed; invoice status moves `unpaid` → `partial` → `paid` as amounts are allocated | UC9 |
| Files | Documents/images up to 100 MB; failed upload requires a new upload | UC1, UC4, UC8, UC9 |
| Display/identifiers | UUID; `Asia/Bangkok`; money in baht; no VAT | UC1–UC9 |
| Stock | Available = on hand − active reserved quantity; good goods only increase stock/cost average; defective goods are recorded separately | UC5, UC7, UC8 |

## Decision register

All open entries are **To be defined**. Suggestions or source assumptions do not become confirmed requirements without a decision.

| ID | Topic / question | Current evidence / temporary assumption | Blocks |
|---|---|---|---|
| D01 | Production authentication provider, session, reset, account linkage to `PERSON`? | Initial explicitly labeled demo accounts approved; real authentication remains deferred | Production authentication and Backend integration; demo login may proceed |
| D02 | What are the exact production screens/routes, fields, validation, error copy, and list behavior? | Authorized demo phases use panels at `/`; Phase 3 implements minimal Customer forms for review. Their shape is not a confirmed Backend field contract | Final business forms/routes; agree designs before adding folders |
| D03 | What are endpoints, payloads, errors, pagination, and date/money serialization? | Only “Needs from Backend” reads/actions are documented | Real API integration for all UCs |
| D04 | Which Admin actions exist beyond Worker management and UC6? What operations does Worker management include? | UC6 is now confirmed for both roles; master-data CRUD and order approval remain undefined | Phase 5 Admin screens and permission policy |
| D05 | When does `JOB_REQUEST` become `completed`? | JOB production completes before delivery; request completion could follow delivery or full payment | UC9 completion display and final lifecycle |
| D06 | Invoice payment due terms and exact deadline/time calculation? | Required Deposit/PO within 14 days after quotation acceptance is confirmed; invoice due terms and boundary handling remain undefined | Exact UC4 deadline behavior and UC9 invoice due behavior |
| D07 | Production money precision, rounding, and threshold comparison? | Minimum 60% markup confirmed. Demo input/display uses two decimals and integer satang; half-satang Deposits are explicitly rejected. These are prototype choices for review | Production UC2 calculation, UC4 Deposit rounding, UC9 serialization |
| D08 | Exact planned-material schema, unit precision, shortage calculation, and reservation/usage variance? | Saved material/required quantity per JOB confirmed. Phase 4 uses whole pieces, shows factual counts, and leaves automatic shortage calculation disabled. Demo orders use manual quantities. Demo safety gates freeze plans after reservations/orders, require full reservation to start, and full planned issuance plus saved actuals to complete; these gates are proposals, not confirmed policy | Production UC5–UC8 quantities, order validation, release/variance policy |
| D09 | Which Supplier payment methods exist and how is credit settled? | `CREDIT` → `pending`; other methods → `paid`. Phase 4 provides explicitly labeled status simulations only, after a first receipt; it does not define methods, payment amounts, timing, or credit settlement | UC7 production payment fields/actions |
| D10 | Notification channels, recipients, events, retry policy, and UI? | Outbox + worker required; shop/customer notifications and collection reminders mentioned | Notification implementation and Backend integration |
| D11 | MIME/extension allowlist, signed URL lifetime/access, partial upload cleanup? | Documents/images ≤100 MB and upload-again behavior confirmed. Demo checks common extensions and 100,000,000 bytes; production MIME/content validation and storage contract remain open | Secure real upload integration |
| D12 | Missing transitions and proposed statuses? | Item `partially_received` is proposed; `requote`, `released`, `preparing`, `in_transit`, defect resolution/write-off, and account active/inactive rules lack defined actions | Related action controls and lifecycle implementation |
| D13 | Does receipt in UC7 return to UC5 to recheck job readiness? | UC7-to-UC5 connection is a temporary proposal. Phase 4 offers manual stock recheck/top-up reservation and never automatically starts production on receipt | Production receiving-to-readiness handoff |
| D14 | Who verifies Customer installments before they affect invoice balances? | Phase 3's explicitly labeled local recording immediately updates sample invoices only; it does not define production verification policy | Production Customer-payment workflow |

## UI/API needs by use case

| UC | Known reads/actions | Missing contract/design decision |
|---|---|---|
| UC1 | Submit request and attachments; read request/file information | Exact request fields; upload contract (D02, D03, D11) |
| UC2 | Read request/quotation/cost; save draft, send quotation, reject request | Fields, rounding, errors (D02, D03, D07) |
| UC3 | Read quotation/revisions and rejection count; accept/reject | Atomic response/count result and error behavior (D02, D03) |
| UC4 | Read customer type, price, Deposit/PO terms/evidence; submit required evidence | Deadline scope, record validation, money/file contract (D02, D03, D06, D07, D11) |
| UC5 | Read material on-hand/reserved/available quantities; check/reserve | Planned inputs, shortage formula, concurrency error response (D02, D03, D08) |
| UC6 | Select Supplier/materials; read order/items; order as Admin or Worker | Order fields and Backend action contract (D02, D03, D08) |
| UC7 | Read order/items; record good/defective receipt and Supplier payment | Payment options, receipt status, readiness handoff (D02, D03, D09, D12, D13) |
| UC8 | Read JOB/reservations/usage; update production, actual cost/time, files | Exact fields, file contract, material-use action contract (D02, D03, D08, D11, D12) |
| UC9 | Read delivery/invoice/payment allocations; deliver, inspect, return, receive installments | Completion, due terms, payment serialization/validation (D02, D03, D05, D06, D07, D11) |

## Readiness and Phase 1 exit criteria

- [x] Read frontend source and repository guidance.
- [x] Compare repository baseline with documented stack/structure.
- [x] Record known facts, open decisions, and affected UCs.
- [x] Confirm markup basis, UC6 roles, and the Deposit/PO deadline.
- [x] Approve demo accounts for initial login and saved planned-material quantities per JOB.
- [x] Proceed with owner-authorized Phase 2 demo navigation using only confirmed role groups. Detailed forms and additional Admin permissions remain open; production authentication is explicitly deferred.
- [ ] Define or explicitly defer each remaining workflow/API decision with an owner-approved implementation boundary.
- [ ] Record answers consistently in the frontend guide, this register, and the implementation plan.
- [ ] Mark Phase 1 complete only after its agreed exit criteria are satisfied.

Phase 2 may proceed once its specific dependencies are confirmed, with unfinished later-UC decisions still recorded as open. Current deliverables make the decisions reviewable; they do not establish a production API or security implementation.

## Verification and commit groups

This phase changes Markdown only. Verify document consistency, references, preserved status identifiers, and whitespace with `git diff --check`; application build/lint are not required for this documentation change.

1. Project guidance and commit/push policy in `AGENTS.md`.
2. Phase 1 decision register, source-guide confirmations, and the implementation plan.

Commit and push each coherent verified group. Exclude unrelated package changes. Report unresolved decisions and push outcome at handoff.
