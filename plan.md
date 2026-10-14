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
- Phases 2–7: not started. Do not implement behavior that depends on unanswered decisions.
- Commit each coherent, verified group separately with a descriptive purpose. Push groups as work progresses and push all completed work before handing off a finished phase. Do not leave the entire project for one final commit/push.
- Stage only task-related files/hunks and exclude unrelated user edits. Use the detailed commit and push workflow in `AGENTS.md`.
- Documentation verification: review consistency with the source guide, check references, and run `git diff --check`. Application checks are required when application code changes.

## Delivery phases

### 1. Confirm unresolved product and integration decisions

Keep implementation choices that depend on these items open until confirmed:

- Explicitly labeled demo accounts are approved for initial frontend login. Production authentication provider, session/reset behavior, and account linkage to `PERSON` remain open.
- Exact screens/routes, form fields, validation copy, loading/empty/error behavior, and pagination/filter/sort.
- API endpoints, request/response shapes, error format, date/money serialization, and file authorization/signed URL behavior.
- The complete Admin permission boundary; both Admin and Worker may perform UC6, confirmed during Phase 1.
- Whether `JOB_REQUEST.completed` occurs after delivery or after full invoice payment.
- Required Deposit/PO must be submitted within 14 days after quotation acceptance, confirmed during Phase 1. Invoice payment terms remain to be defined.
- Money precision/rounding for confirmed minimum price `(material cost + labor cost) × 1.60` (60% markup).
- Planned material and required quantity will be saved per JOB, confirmed during Phase 1. Exact input/storage schema and the conflicting stock-shortage calculation remain to be defined.
- Supplier payment options and settlement of pending credit.
- Notification channels, events, recipients, and UI behavior.
- File MIME/extension allowlist and handling of incomplete uploads.
- Status transitions missing from the source, including proposed `MATERIAL_ORDER_ITEM.partially_received`.

### 2. Establish role-aware application shell

- Use the existing App Router structure; add folders only when the screen design is confirmed.
- Provide explicitly labeled demo login and role-aware navigation for Customer, Worker, and Admin. Real authentication remains deferred until Backend defines its contract.
- Do not expose Supplier as an in-app role unless requirements change; Supplier is currently an external actor.
- Do not grant unconfirmed Admin capabilities or assume Admin inherits all Worker permissions.

### 3. Implement Customer workflows (UC1, UC3, UC4, UC9)

- UC1: submit a manufacturing request and document/image attachments up to 100 MB.
- UC3: review quotation revisions and accept/reject; show rejection count and the fifth-rejection cancellation behavior.
- UC4: present Deposit/PO rules by customer type and quotation amount; collect the applicable evidence.
- UC9: show delivery/invoice information, support installment payments, and let the Customer inspect/accept or return work.

### 4. Implement Worker workflows (UC2, UC5–UC9)

- UC2: prepare/save/send a quotation, or reject a request; minimum 60% markup is confirmed, while exact inputs and rounding require definition.
- UC5: show `qty_on_hand`, `qty_reserved`, and `qty_available`; reserve materials only according to confirmed stock logic.
- UC6: create material orders for both Admin and Worker, as confirmed during Phase 1.
- UC7: record good/defective receipts and Supplier payment according to confirmed fields/methods.
- UC8: track production, material use, actual cost/time, and evidence attachments.
- UC9: record delivery or pickup, invoice, and payment information as authorized.

### 5. Implement Admin workflows

- Support Worker management and Supplier ordering only within confirmed permissions.
- Do not add material/unit/Supplier master-data management or order-approval screens until approved.

### 6. Apply shared display and interaction rules

- Display time in `Asia/Bangkok`, amounts in baht, and no VAT.
- Use the documented entity and status names. Do not offer actions for unconfirmed transitions.
- Provide loading, empty, and error states for each implemented flow; exact copy and retry semantics require definition.
- For failed uploads, provide “Upload again” to start a new upload. Do not assume automatic or resumable retries.
- Do not show an operation as successful until the system confirms it.
- Never place S3 or authentication secrets in frontend code. Configure the API base URL through environment variables.

### 7. Integrate with Backend

Request the reads and actions listed in `docs/02-frontend.md` under “Needs from Backend.” Agree on the API contract before wiring request/response logic. Backend remains the source of truth for business validation and atomic transactions, including UC2, UC7, and UC8.

## Validation checklist

- Verify role navigation and permissions against confirmed rules.
- Verify the individual/company Deposit and PO thresholds and the fifth-rejection behavior.
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
