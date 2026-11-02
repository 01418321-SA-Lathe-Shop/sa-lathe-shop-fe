# 026 — Password change and printable business documents

Status (2026-11-03): implemented on `develop`. Backend endpoint in
SA-Lathe-Shop-BE `7cf805a` (`POST /auth/password`, documented in backend
`docs/000-auth.md` and `docs/openapi.yaml`). No migration, no new runtime
dependency.

## Password change (all roles)

Settings → ความปลอดภัย → เปลี่ยนรหัสผ่าน (`src/features/settings/settings-page.tsx`).
Fields: current, new, confirm. Rules (client mirror of the server): at least 12
characters, at most 128 UTF-8 bytes, differs from current, does not contain the
username, confirmation matches. Wrong current password returns 400
`invalid_current_password` and keeps the session. Success revokes every other
session of the account; the calling session stays signed in. The route is rate
limited per IP like login. Admin resets of Worker passwords are unchanged.

## Documents

Shared module `src/features/documents/`:

| File | Purpose |
| --- | --- |
| `document-print.tsx` | `PrintDocument`: portal rendered only while printing, A4 `@page`, page numbers (`หน้า n / N`) and document reference in the page margin, Sarabun Thai font, `?print=1` auto-print from lists |
| `business-documents.tsx` | `QuotationDocument`, `PurchaseOrderDocument`, `JobContractDocument` |
| `job-contract-print.tsx` | Loads accepted quotation, saved terms, opened job and invoice state for the contract |
| `documents-domain.ts` | Placeholder detection for shop facts, job reference, missing-contract-information list, long Thai dates |
| `documents.module.css` | Print-only black-on-white A4 styles, independent of the app theme |

| Document | Where | Roles | Data source |
| --- | --- | --- | --- |
| Quotation (ใบเสนอราคา / QUOTATION) | Customer quotation detail; Staff/Admin request detail (latest non-draft quote) | Customer member, Worker, Admin | `/requests/{id}`, `/requests/{id}/quotations`, accept decision `terms`, `/customers` (Customer only) |
| Purchase order (ใบสั่งซื้อ / PURCHASE ORDER) | Admin material-order detail | Admin (UC6 is Admin-only) | the order from `/material-orders` |
| Job contract (สัญญาจ้างทำของ) | Customer job detail; Staff/Admin production detail | Customer member, Worker, Admin | above plus `/quotations/{id}/fulfillment`, `/fulfillment/jobs/{id}` |

The PO is the shop's UC6 supplier purchase order: it is the only purchase order
the system holds as structured data (lines, quantities, unit costs). A
customer's PO for UC4 is an uploaded file and keeps its existing original
download; the system does not extract its number or amounts.

## Missing information (printed as dotted fill-in lines, never guessed)

- Shop address, phone and tax ID: `landing-content.ts` still holds `[...]` placeholders; the shop name is used as published there.
- Customer address, phone, tax/ID number and company signatory: not stored by the backend.
- Customer name on Staff/Admin copies: Staff cannot read customer profiles; the customer code (first 8 characters of `customer_id`) is shown instead.
- Confirmed delivery date and place: `job.due_at` is copied from the customer's requested date, so it is not printed as a commitment.
- Quotation validity period, discounts, per-unit prices: not supported (quotes are a single whole-job price; unit price prints as —).
- Supplier address and supplier credit terms on the PO.
- Invoice credit days on the contract until Admin sets them (UC9).

## Legal review

The contract is a draft assembled from recorded data and confirmed business rules
(UC3 terms, UC4 deposit/PO deadline, UC9 single invoice, installments, whole-job
delivery and free pre-acceptance rework). It has not been reviewed by a lawyer.
Wording that needs review before real use: the hire-of-work classification,
"the quotation forms part of this contract", "acceptance is final", the
duplicate-original/witness closing clause, and the absence of warranty, late
delivery, penalty, termination and dispute clauses (none are defined in the
system, so none were invented). The UI states this next to the print button.

## Verification

Native tests (documents domain and render tests, password rules), TypeScript,
ESLint, source audit, DESIGN sync, production build. Browser walk against the
local API: password validation, wrong current password, success, other session
revoked, old password rejected; quotation, PO and contract rendered from demo
data with Thai text. Not verified: the actual browser print dialog / PDF output
and multi-page breaks on paper (the preview pane could not open a print dialog).
