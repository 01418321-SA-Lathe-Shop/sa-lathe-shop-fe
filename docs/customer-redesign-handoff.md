# Customer redesign handoff — 2026-10-27

## Approved scope and structure

The owner approved the complete 17-screen Thai wireframe family after reviewing
the shared light industrial style, task-specific layouts and mobile/desktop flows.
Implementation belongs to `src/features/customer/`; shared contracts and staff
screens are preserved. No package/lockfile, backend, database or auth contract change.

| Approved screen | Existing URL / selector |
|---|---|
| Overview | `/customer` |
| Request list | `/customer/requests` with optional `q/status` |
| Four-step request wizard | `/customer/requests?view=new` |
| Request detail/private attachments | `/customer/requests?request=UUID` |
| Quotation inbox/history | `/customer/quotations`, `?view=history` |
| Quote detail/comparison/decision | `/customer/quotations?request=UUID&quotation=UUID` |
| Deposit/PO checklist | `/customer/deposit-po` |
| Evidence submission/history/private PO | `/customer/deposit-po?request=UUID&quotation=UUID` |
| Job list/history | `/customer/jobs`, `?view=history` |
| Job timeline | `/customer/jobs?job=UUID` |
| Customer inspection/return | `/customer/delivery-payment?job=UUID` |
| Invoice list | `/customer/payments` |
| Invoice/instalment proof | `/customer/payments?job=UUID` |
| Notifications | Navbar dialog and `/customer/inbox` |
| Account/company memberships | `/customer/memberships` |
| Owner invitation / joining | `/customer/memberships?view=invite&company=UUID`, `?view=join` |
| Display settings | `/customer?view=settings` |

Jobs/payments now render at their existing URLs rather than redirecting. Documents
keeps its original Deposit/PO compatibility redirect. No route folder was moved.
Lists retain only harmless search/record selectors in URLs; tokens, file bytes,
signed links, invitation secrets and retry payloads stay out of URLs/storage/logs.

## Safety and contract boundaries

- Customer shell is keyed by account ID. Logout, expiry or switching identity
  destroys the prior account's transient reads, notifications, files and writes.
- First-use Customer theme is light; a stored theme/size is respected. Staff/Admin
  defaults remain untouched. Only non-secret appearance settings use browser storage.
- Bounded paginated reads traverse up to 1,000 records, disclose partial data and
  never claim a first-page count is a global total. Sales enrichment concurrency is six.
  Very large installations need server-side scoped search/aggregation in a later contract.
- Every Customer read uses a customer-authorized request/quotation/fulfillment or
  personal inbox endpoint. No internal cost, supplier, stock or production-photo call.
- Request creation is not idempotent. An uncertain create blocks blind resubmission.
  Once created, file retries upload only unfinished files to that same request.
- Five distinct quote rejections permit revision; the sixth cancels. Acceptance
  previews use exact upward-rounded satang math; actual saved terms come from server.
- Deposit/PO due time is acceptance +336 hours. Evidence approval is manual. One
  deposit may be minimum-to-full; PO has no money/time fields. Invoice installments
  are a different workflow, with server-provided due dates and no VAT.
- Versioned commands preserve their original key/payload/version after uncertain
  responses. Identical explicit retry or discard/reload is offered, never auto retry.
- Customer receipt and payment remain independent. A return reopens the same Job
  for free rework. Request closes only after accepted latest delivery and paid invoice.

## Honest unsupported parts

- Current inbox DTO has only request ID/title/read time, not structured event/job/
  invoice targets. Notifications link to the request, not a guessed entity. Display-only
  localization of known legacy titles does not determine access or business outcomes.
- Read-all composes existing per-item PATCH calls only on a complete collection.
  Partial failures keep confirmed reads. Mark-unread is visibly disabled; there is
  no invented bulk/count/unread API, realtime channel or unsupported event producer.
- Promised job deadlines, customer-visible production photos and material-waiting
  states are not supplied by the authorized Customer DTOs. The UI says so. It does
  not infer a shortage from `queued` or expose internal photos/plans to fill the gap.
- There is no customer profile edit/reset-password, company member management,
  payment gateway, invoice PDF generation or carrier tracking added by this work.

## Verification

- TypeScript, ESLint and source audit passed; 70 native tests passed for Customer
  workflows, including three partial/uncertain notification-read regressions.
- Production build passed (37 routes). Dependencies and route inventory unchanged.
- The separate private-file correction brings the final suite to 71 passing tests.
  Opening an uploaded PO was verified in a new tab with the original authenticated
  app tab preserved; named downloads retain their filename behavior.
- Forty initial screenshots cover the planned page states at 375px/1280px;
  corrected Job and bell views were captured again at both widths. No horizontal
  overflow or runtime errors were observed in these checks.
- Actual menu/link navigation, Job-to-request backlink, invoice detail and bell
  read-all passed at both widths. A separate mobile mock flow passed Deposit/PO
  submission, identical payment retry (one row; balance unchanged pending approval),
  same-Job rework, account-switch isolation and individual quotation acceptance.
- Impeccable detector returned no findings. Independent bounded review scored the
  reported notification, document-link and navigation fixes resolved.
- Browser checks use the explicit contract mock, not live Go/PostgreSQL/S3. Live
  storage, real backend permissions/network failures and deployed-browser behavior
  still require integration testing; this is not a production certification.

## Local review

Use the existing `npm run dev`, open `/login`, expand the explicitly labeled test
accounts, and try both company and individual Customer accounts. Review the navbar,
request wizard/private file, quote decision, Deposit/PO, job timeline, inspection,
bank proof, memberships/invitation and appearance settings. Use the mock's lost-write
response control to inspect the original-payload retry flow. Reload resets the mock
and requires login; that is deliberate, not persistent production session behavior.
