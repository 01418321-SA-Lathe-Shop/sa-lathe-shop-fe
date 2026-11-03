# 026 — Password change and printable business documents

Status (2026-11-03): implemented on `develop`. Backend endpoint in
SA-Lathe-Shop-BE `7cf805a` (`POST /auth/password`, documented in backend
`docs/000-auth.md` and `docs/openapi.yaml`). Document details (shop profile,
customer billing, quotation note/valid-until, customer PO) use backend
migration 000017 and the endpoints in backend `docs/020-printed-documents.md`.
No new runtime dependency.

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
| `document-print.tsx` | `PrintDocument`: portal rendered only while printing, A4 `@page`, page numbers (`หน้า n / N`) and document reference in the page margin, Sarabun Thai font loaded explicitly before printing, `?print=1` auto-print from lists |
| `business-documents.tsx` | `QuotationDocument`, `PurchaseOrderDocument` (supplier), `JobContractDocument` |
| `customer-po-document.tsx` | `CustomerPurchaseOrderDocument` (customer's own bilingual PO) |
| `document-parties.tsx` | `useDocumentParties` (shop profile + customer billing) and `QuotationPrint` |
| `job-contract-print.tsx` | Loads accepted quotation, saved terms, opened job, invoice state and both parties for the contract |
| `documents-domain.ts` | Shop/customer parties, missing-contract-information list, long Thai dates, `bahtText` (amount in Thai words, BAHTTEXT style) |
| `documents.module.css` | Print-only A4 styles, independent of the app theme |

| Document | Where | Who fills it in | Data source |
| --- | --- | --- | --- |
| Quotation (ใบเสนอราคา) | Customer quotation detail; Staff/Admin request detail (latest non-draft quote) | Worker (price, note, valid-until) | request, quotation, accept decision `terms`, shop profile, customer billing |
| Customer PO (ใบสั่งซื้อ) | Customer มัดจำและ PO, when terms require a PO | Customer (PO number, date, remarks) | `/quotations/{id}/customer-po`, accepted terms (amount), shop profile, customer billing |
| Material purchase order (ใบสั่งซื้อวัสดุ) | Admin material-order detail | Admin (UC6 order) | the order from `/material-orders` |
| Job contract (สัญญาจ้างทำของ) | Customer job detail; Staff/Admin production detail | built from saved data | above plus `/quotations/{id}/fulfillment`, `/fulfillment/jobs/{id}` |

Shop details are edited by Admin in Settings → ระบบ → ข้อมูลร้านบนเอกสาร;
customer billing details by the customer owner in Settings → บัญชีของฉัน →
ข้อมูลออกเอกสาร. Writing the PO does not submit it: the customer prints, signs
and uploads it through the existing PO evidence form, and staff review that
upload as before. No document adds VAT.

## Missing information (never guessed)

Owner decision 2026-11-03: shop, customer and supplier details that were never
saved are hidden (the landing page's confirmed shop name is used until Admin
saves one). Facts the system does not store keep dotted lines to write in by
hand, as do the contract's party clauses. Staff sign with a pen; signature
dates come from the record (quotation sent date, material order date, customer
PO issue date) where one exists, and names are written by hand. All document
text is black.

Not stored, printed as fill-in lines:

- Shop logo: no upload exists, so the letterhead is text only.
- Company signatory name on the contract.
- Confirmed delivery date and place: `job.due_at` is copied from the customer's requested date, so it is not printed as a commitment.
- Discounts and per-unit prices: quotes are one whole-job price; unit price prints as —.
- Supplier address and supplier credit terms on the material PO.
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

Native tests (documents domain, render tests for all four documents, Thai
amount words, password rules), TypeScript, ESLint, source audit, DESIGN sync,
production build. Headless Chromium against the local API and demo data: Admin
saved shop details; a company customer saved billing details and wrote a PO;
PDFs of the customer PO (one page), quotation (one page) and contract (two
pages, page numbers correct) were generated and checked; Staff saw the
customer's billing details on the contract. The first headless run printed the
PO with no text because the font had not loaded, which led to the explicit font
load. Not verified: a physical printer, the Staff quote editor's new fields in
the browser (covered by types and the backend tests), and phone widths for the
new settings forms.
