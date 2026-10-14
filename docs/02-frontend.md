# Machine Shop Custom Manufacturing System — Frontend Guide

## Project summary

The system brings customer requests, quotations, production jobs, material purchasing/receiving, inventory, delivery, and payments into one workflow. It addresses the current lack of job/payment tracking and reliable stock information. The business is not registered as a company and does not charge VAT, as confirmed by the owner.

| Actor / role | Responsibilities in the workflow | Use cases |
|---|---|---|
| Customer (`individual` or `company`) | Submit requests and attachments, view/respond to quotations, submit Deposit or PO evidence, inspect delivered work, and pay | UC1, UC3, UC4, UC9 |
| Worker (technician) | Estimate prices, check/reserve stock, order materials, receive goods/record Supplier payment, produce/issue materials, deliver/record payment | UC2, UC5–UC9 |
| Admin | Manage Workers and order from Suppliers, as confirmed by the owner | No separate UC; UC6 names Worker as its actor |
| Supplier | Accept/reject orders, deliver materials, and receive payment; an external actor | UC6, UC7 |

Customer `individual` and `company` are customer types, not permission roles. Every use case has a login precondition. Supplier is an external actor. Do not implicitly grant Admin permissions beyond those explicitly listed.

### UC1–UC9 workflow

```mermaid
flowchart TD
  UC1[UC1 Customer submits request and attachments] --> UC2[UC2 Worker prepares estimate]
  UC2 -->|Send quotation| UC3[UC3 Customer reviews and responds]
  UC2 -->|Save draft| UC2
  UC2 -->|Reject request| CANCELED[Request canceled]
  UC3 -->|Customer rejects fewer than 5 times| UC2
  UC3 -->|5th rejection| CANCELED
  UC3 -->|Accept: determine Deposit/PO| UC4[UC4 Record Deposit and/or PO]
  UC4 -->|Requirements met within the deadline| JOB[Create JOB: queued]
  UC4 -->|Deadline missed after 14 days, temporary assumption| CANCELED
  JOB --> UC5[UC5 Check and reserve materials]
  UC5 -->|Materials available| UC8[UC8 Produce and record actual usage]
  UC5 -->|Materials insufficient| UC6[UC6 Order materials from Supplier]
  UC6 --> UC7[UC7 Receive good/defective goods and record payment]
  UC7 -.->|Check availability again; connection requires confirmation| UC5
  UC8 -->|JOB completed| UC9[UC9 Invoice and delivery]
  UC9 -->|Customer returns the work| UC8
  UC9 -->|Customer accepts and may pay in installments| DONE[Close when fully allocated/paid]
```

The flow is based on the Use Cases, Sequence Diagrams, and Collaboration Diagrams summarized in the overview. The UC7-to-UC5 return is a temporary proposal; that handoff requires confirmation.

### Glossary: entities shown or used by Frontend

| Entity / term | Meaning in the UI |
|---|---|
| `JOB_REQUEST` | Customer manufacturing request before a job is opened |
| `QUOTATION` | Quotation that may have multiple revisions |
| `QUOTATION_COST` | Material cost, labor cost, and final price associated with a quotation |
| `DEPOSIT` | Deposit based on customer type and quoted amount |
| `PURCHASE_ORDER` (PO) | Company customer's PO to confirm production |
| `JOB` | Production job opened after terms are confirmed |
| `MATERIAL_RESERVATION` | Stock quantity reserved for a job |
| `MATERIAL_ORDER`, `MATERIAL_ORDER_ITEM` | Material order from a Supplier and its order lines |
| `STOCK_MOVEMENT` | History of material receipts, issues, adjustments, or returns |
| `MATERIAL_DEFECT_LOG` | Defective material and Supplier claim record |
| `DELIVERY` | Delivery or customer pickup, including recipient and evidence |
| `INVOICE` | Customer invoice; initial amount is job price less Deposit |
| `PAYMENT`, `PAYMENT_ALLOCATION` | Payment and allocation to an invoice; multiple payments are supported |
| `MATERIAL` | Material and `avg_cost`, using Moving Average from good received stock, excluding defective goods |

## Frontend scope and display requirements

- Use **Next.js**.
- The Frontend **must never hold or embed secrets**, such as S3 or authentication secrets. Configure the API base URL through environment variables as noted in the overview. Authentication/session details remain to be defined.
- Backend uses PostgreSQL, S3-compatible object storage (URL stored in DB), Outbox + worker, and Docker Compose. Notifications to the shop/customer and reminders to follow up on collection are required, but channels and UI details remain to be defined.
- Display time in `Asia/Bangkok`; display money in baht; **do not charge VAT**.
- IDs are UUIDs, but how UUIDs appear in the UI is not specified.
- Attachments support documents and images up to 100 MB. If upload fails, show an “Upload again” action (start a new upload, not automatic retry).
- Show permissions/navigation for Customer, Admin, and Worker. Supplier is not a system user in the current workflow.

## Navigation and screens by role

The overview specifies use cases and permissions, but **does not specify exact screen names, routes, layouts, or navigation**. The groups below are workflow screens/steps inferred as necessary from the UCs, not a confirmed screen count or URL design.

| Role | Screen/work groups | UCs | Limits / notes |
|---|---|---|---|
| Customer | Login; submit request and attachments; view/respond to quotation; submit Deposit/PO evidence; inspect delivery and pay invoice | UC1, UC3, UC4, UC9 | `individual`/`company` are customer types; PO/Deposit requirements depend on customer type/price; show relevant lifecycle statuses below |
| Worker | Login; estimate/send quotation; check/reserve stock; order materials; receive good/defective goods and record Supplier payment; perform work/issue materials; deliver/record payment | UC2, UC5–UC9 | UC6 names Worker as actor; Admin's UC6 permission is unconfirmed |
| Admin | Login; manage Workers; order from Suppliers as confirmed by the owner | No separate UC; UC6 | Scope of Worker-management screens and other permissions must be defined; do not assume Admin has all Worker permissions |
| Supplier | No in-app navigation specified in the current workflow | UC6, UC7 | External actor; whether Supplier logs into the system is not specified |

## Business rules the UI must reflect

| Topic | Required UI behavior |
|---|---|
| Login | Customer, Admin, and Worker must log in before using a UC; login/session/reset details remain to be defined |
| Customer type | `individual` and `company` are customer types, not roles |
| Deposit/PO | `individual`: 50% Deposit, no PO; `company` price ≤ THB 10,000: PO only; `company` price > THB 10,000: PO + 50% Deposit |
| Quotation rejection | Count Customer rejections; up to 5; the request is automatically canceled on the 5th rejection |
| Payments | Installments are allowed; invoice is `partial` until fully paid, then `paid` |
| Payment period | 14 days; start date and scope (Deposit/PO/invoice) are unconfirmed, so due-date/countdown display must wait for clarification |
| Pricing | `final_price` consists of material cost + labor cost + minimum 60% profit; the basis for 60% is unclear. Do not invent or display a guessed formula |
| Stock | `qty_available = qty_on_hand - qty_reserved` for active reservations; only good materials increase on-hand stock; defects are separate and have a defect log |
| VAT | No VAT; the business is not registered as a company, as confirmed |

## UC1–UC9: UI steps, inputs, actions, and states

The overview does not define routes, complete form schemas, or error codes. Only known inputs/rules are listed; missing information is marked **To be defined**. Each flow needs loading, empty, and error states; their exact copy and behavior are **to be defined**, except upload failure, which must offer an action to upload again.

| UC | Steps / known data and validation | Actions / states the UI must support |
|---|---|---|
| UC1 Submit request | Customer enters job details and attaches documents/images ≤ 100 MB; exact fields and detail validation are **to be defined** | Submit request; loading during submission; initial empty state as designed; validation/error behavior to be defined; show “Upload again” after upload failure |
| UC2 Estimate price | Worker estimates material cost, labor cost, and final price; minimum 60% profit but the basis is unclear; exact input fields are **to be defined** | Save draft, send quotation, or reject request; show `draft`/`sent`; loading/errors and confirmation messages to be defined |
| UC3 Respond to quotation | Customer views quotation/revisions and accepts or rejects; show rejection count, limit 5 | Accept to UC4; reject back to UC2; cancel request on fifth rejection; loading/empty/error copy and behavior after limit to be defined |
| UC4 Deposit/PO | Show rules by customer type/price: individual = 50% Deposit, no PO; company ≤ THB 10,000 = PO only; company > THB 10,000 = PO + 50% Deposit. Collect evidence per workflow; exact fields/file types/due date to be defined | Submit/record Deposit or PO; create JOB when requirements are met; 14-day expiry is a temporary assumption; states for expiration/missing documents to be defined |
| UC5 Check/reserve stock | Show `qty_available = qty_on_hand - qty_reserved`; UC5 accepts `requiredMaterials`, but the fields/source of planned quantities are unclear | Check and reserve material; if available, proceed to UC8; if short, go to UC6. Shortage formula conflicts in the source; do not calculate results from unconfirmed information. Loading/empty/error to be defined |
| UC6 Order materials | Select Supplier and order needed materials per workflow; form fields/validation are not specified | Submit order; Worker is the UC actor, while the owner separately confirmed Admin can order from Suppliers; exact role permissions need confirmation; statuses/errors to be defined |
| UC7 Receive goods | Show good/defective received quantities; record Supplier payment; exact fields/payment methods are not specified | Receive goods/record payment; order status changes based on receipt; may return to UC5 for stock recheck (temporary proposal); errors/loading to be defined |
| UC8 Produce | Show job/material issuance; record images, actual cost/time; file is a document/image ≤ 100 MB; exact production fields are not specified | Start/continue/record actual usage; `JOB` goes to `in_progress`, then `completed`; returned work resumes production; show “Upload again” after upload failure; other states/errors to be defined |
| UC9 Deliver/receive payment | Show delivery/pickup, recipient/evidence, invoice; initial amount is job price less Deposit; support installments; exact fields/evidence types are not specified | Deliver and record payment; Customer inspects/pays; returned work goes back to UC8; loading/empty/error and balance/allocation display to be defined |

### Loading, empty, error, and upload retry

- Design loading, empty, and error states for every page/flow. Copy, request retry behavior, and behavior when data fails to load are **to be defined**.
- If upload fails, let the user start a new upload with an “Upload again” action; resumable upload and automatic retry are not specified.
- Validate the 100 MB limit and support the stated document/image categories. MIME/extension allowlist and validation copy are **to be defined**.
- Do not display a submission/save as successful until the system confirms it; exact behavior/API contract remains to be defined.

## Status labels and user-triggered transitions

Use the exact status values below as system names; English display labels are not defined by the overview. The table separates specified transitions from statuses without a defined transition.

| Entity | Status values | Transitions the user/workflow can trigger |
|---|---|---|
| `JOB_REQUEST` | `pending`, `ongoing`, `completed`, `canceled` | Create as `pending`; sending quotation sets `ongoing`; rejection/expiry sets `canceled`; no transition to `completed` is specified |
| `QUOTATION` | `draft`, `sent`, `approved`, `rejected`; ER also has `requote` without a transition | Worker saves draft/sends; Customer accepts/rejects; rejection creates a new `draft` revision; fifth rejection cancels request; `requote` must be defined |
| `JOB` | `queued`, `in_progress`, `completed`, `cancelled` | Create as `queued`; production starts as `in_progress`; production completion sets `completed`; customer return resumes as `in_progress` |
| `MATERIAL_RESERVATION` | `reserved`, `consumed`, `released` | Reserve as `reserved`; issue as `consumed`; `released` has no workflow transition |
| `MATERIAL_ORDER` | `ordered`, `partially_received`, `received`, `cancelled` | Order as `ordered`; partial receipt as `partially_received`; full receipt as `received`; Supplier rejection as `cancelled` |
| `MATERIAL_ORDER_ITEM` | ER: `ordered`, `preparing`, `in_transit`, `received`, `damaged`, `cancelled`; proposal to add `partially_received` | Cumulative partial/full receipt; an entirely defective item may be `damaged`; `preparing`/`in_transit` transitions are absent from workflow |
| `MATERIAL_DEFECT_LOG` | `PENDING_CLAIM`, `CLAIMED`, `RESOLVED`, `WRITTEN_OFF` | Record defect as `PENDING_CLAIM`; notify Supplier to set `CLAIMED`; no workflow for `RESOLVED`/`WRITTEN_OFF` |
| `DELIVERY` | `preparing`, `shipping`, `delivered`, `returned` | UC9 creates `shipping`; Customer acceptance sets `delivered`; return sets `returned`; no transition to `preparing` is specified |
| `INVOICE` | `unpaid`, `partial`, `paid` | Create as `unpaid`; partial payment sets `partial`; full payment sets `paid` |
| `MATERIAL_ORDER.payment_status` | `unpaid`, `pending`, `paid` | Create as `unpaid`; CREDIT sets `pending`; other methods set `paid` per UC7; actual method is unclear |
| `WORKER.status`, `ADMIN.status` | `active`, `inactive` | Enums exist; status-change rules are not specified |

Adding `MATERIAL_ORDER_ITEM.partially_received` is a proposal. `JOB_REQUEST.completed`, `QUOTATION.requote`, `DELIVERY.preparing`, `MATERIAL_RESERVATION.released`, `preparing`/`in_transit`, and other statuses without transitions need definition. The UI should not offer an action whose transition/permission has not been confirmed.

## Needs from Backend (instead of an API contract)

Endpoints, request/response fields, and error codes are not included in the overview, so there is no API contract here. Backend should provide the reads/actions below for each flow; exact fields must be agreed before integration.

| Screen/flow | Data to read | Actions required |
|---|---|---|
| Login / role navigation | Logged-in user and role used to render navigation | Login/logout; session/reset/provider to be defined |
| UC1 Request | `JOB_REQUEST` list/details and file URL/metadata needed for display | Create request, upload file, start a new upload after failure |
| UC2–UC3 Quotation | Request, quotation revisions/status, `QUOTATION_COST` visible to the role, rejection count | Save draft/send/reject request; Customer accept/reject; enforce limit of 5 |
| UC4 Deposit/PO | Customer type, quotation amount, required terms, Deposit/PO records, due/expiry once defined | Attach/record Deposit or PO evidence; create JOB when requirements are met |
| UC5 Stock | `MATERIAL` quantities, `qty_on_hand`, `qty_reserved`, `qty_available`, reservations, and required/planned materials once designed | Check availability and reserve; return shortage/needed quantity according to confirmed logic |
| UC6 Order | Selectable Suppliers/materials, shortage, `MATERIAL_ORDER` and items/status | Create/send order; role policy needs confirmation |
| UC7 Receiving | Order/items, good/defective received quantities, `MATERIAL`, defect/claim, Supplier payment status | Record receipt, stock movement/cost update, defect, Supplier payment |
| UC8 Production | `JOB`, reservations, stock, actual material usage, actual cost/time, images and URLs | Change job status, record material use/issue, upload production evidence |
| UC9 Delivery/invoice | Delivery/status/evidence, invoice totals/balance/status, payment allocations | Record delivery/acceptance/return; issue invoice; receive multiple payments and allocate amounts |
| All list screens | Pagination/filter/sort requirements are unspecified | Define format and parameters |

Backend is the source of truth for business validation; UI validation only helps users catch errors before submission. Error response, date/money serialization, signed URL lifetime, and file-read authorization are **to be defined**.

### Changes that must succeed consistently

The following are Backend transaction/data-integrity requirements. The UI must not treat partial data changes as a successful action before the result is confirmed:

- UC2: Update `JOB_REQUEST` and create `QUOTATION` and `QUOTATION_COST` in one transaction.
- UC7: Received items, `MATERIAL`, `STOCK_MOVEMENT`, `MATERIAL_DEFECT_LOG`, and `MATERIAL_ORDER` status/payment must remain consistent in one transaction.
- UC8: Material usage, decrementing `qty_on_hand`, `STOCK_MOVEMENT`, and changing the reservation to `consumed` must occur in one transaction.

## Open questions and temporary assumptions affecting UI

| Topic | Known information | Confirmation needed / assumption |
|---|---|---|
| Who performs UC6 | UC6 names Worker; owner confirmed Admin can order from Supplier | Temporary assumption: Admin and Worker can use UC6; confirm permissions |
| Admin permissions | Admin manages Workers and orders from Suppliers, per owner | Other screens/permissions, master data `MATERIAL`, `UNIT`, `SUPPLIER`, and order approval are undefined |
| `JOB_REQUEST.completed` | Exists in ER but has no UC transition; JOB completes before delivery | Confirm whether request is shown as completed after delivery or after invoice is fully paid |
| 60% profit formula | Final price = material + labor + minimum 60% profit | Confirm whether based on total cost or sales margin; do not guess a value |
| 14 days | Payment period is 14 days | Temporary assumption: applies to sending Deposit/PO after quotation approval for UC4 expiry; confirm start date and invoice scope before showing due date/countdown |
| Planned materials/shortage | UC5 accepts `requiredMaterials`; Q6.1 shortage formula conflicts with UC5 | Confirm Worker input and formula; do not calculate a stock-shortage preview from unconfirmed logic |
| Upload | Documents/images ≤ 100 MB; failed upload must be uploaded again | MIME/extension allowlist, partial upload handling, signed URL lifetime/acquisition method remain to be defined |
| Authentication | Customer/Admin/Worker login | Provider, session, reset/login UI, and linkage to `PERSON` remain undefined |
| Supplier payment | `CREDIT` is `pending`; other methods are `paid` per UC7 | Payment options and outstanding-credit settlement UI need definition |
| Notifications | Notify shop/customer and remind staff to follow up on collection | Channel, event, recipients, and notification UI need definition |
| UI details | Overview has UCs/flow but no routes, exact form fields, loading/error copy, pagination/filter/sort | Must be defined; the screen groups here are not a confirmed screen inventory |

## Frontend day-one checklist

- Prepare the agreed Node.js version and Docker Compose for backend dependencies.
- Create the Next.js app; configure API base URL through environment variables; **never embed S3 or authentication secrets in Frontend**.
- Start with role-aware navigation and login for Customer/Admin/Worker; hide permissions that are not confirmed.
- Build the UC1–UC4 flow first using the same entity/status names as this guide; do not bind to request/response shapes until the data contract is agreed.
- Build upload UI for documents/images ≤ 100 MB; after failure, provide an “Upload again” action.
- Display time in `Asia/Bangkok`, money in baht, and no VAT; do not implement a 60% profit formula until its basis is confirmed.
- Prepare loading/empty/error states for each workflow and wait for the Backend error/message contract.

## Coverage from the source overview

| Section in `00-overview.md` | Location in this file |
|---|---|
| Goals and problems addressed / registration and VAT status | Project summary; Frontend scope |
| Technology scope | Frontend scope and display requirements; checklist |
| Actors and workflow permissions | Project summary; Navigation and screens by role |
| Glossary | Glossary: entities shown or used by Frontend |
| Process overview and UC1–UC9 | UC1–UC9 workflow; UI steps table |
| Statuses and transitions | Status labels and user-triggered transitions |
| Confirmed business rules | Business rules the UI must reflect |
| Transactions and data integrity | Changes that must succeed consistently; UC7/UC8 behaviors; Needs from Backend |
| Open questions and temporary assumptions | Open questions and temporary assumptions affecting UI |
| Frontend day-one checklist | Frontend day-one checklist |
| Use case traceability | UC1–UC9 table; Needs from Backend |
