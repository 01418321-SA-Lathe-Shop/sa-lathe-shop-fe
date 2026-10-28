# Customer quotation and UC4 documents

Date: 2026-10-28 · Branch: `develop` · Mode: Operate

## Approved scope

Customer-only extension of the incumbent workspace, not a new visual identity.
Keep the existing orange palette, Noto Sans Thai, saved Light/Dark preference,
navbar, full-screen mobile navigation and existing routes. Supplier UC6 and
Staff/Admin screens are unchanged. No dependency or Backend endpoint was added.

- `/customer/quotations`: authorized sent/approved/rejected quotations, including
  revisions. The existing legacy `view=history` link remains usable.
- `/customer/deposit-po`: all approved-quotation obligations remain available,
  including deposit-only and not-yet-uploaded cases. `view=po` lists uploaded PO
  evidence, including rejected history, not an invented standalone PO resource.
- Detail selectors remain `request`, `quotation` and optional PO `evidence` UUID.
  A full-page detail replaces the list; no permanent right split pane or new
  route/drawer is introduced.

## Presentation and data contract

| Surface | Implemented behavior |
| --- | --- |
| Lists | Desktop rows; mobile cards at 640px and below; real-status tabs and counts, literal search, Bangkok date range, customer type, quote-only exact price range, explicit sort, removable chips, 20-item URL pagination |
| Scope of counts/filters | Existing bounded authorized loaded collections only, not server-global totals; loading/failed/partial reads never claim a complete total |
| List identity | Existing `/customers` read supplies name/type; accepted terms preserve frozen customer type when available |
| Quotation document | Explicit safe field whitelist; request, scope, quantity, material specification, sent/requested dates, final price and no VAT; approved terms use saved decisions |
| Quotation print | Native browser Print / Save as PDF, also reachable from a list action; same rendered document in a temporary isolated print root, waiting for data/fonts; not an original Backend PDF |
| PO document | Existing request attachment metadata plus selected authorized `kind=po` evidence; native PDF/PNG/JPEG preview; unsupported document types retain original download |
| Missing PO fields | No extracted PO number, amount or issue date exists. UI uses request reference and evidence submission date, and explicitly explains this limitation |
| Navigation | In-memory account-scoped snapshots (maximum 20 list contexts); previous/next follow captured filtered results; back preserves harmless URL filters/page and restores scroll after loading/fonts; direct links do not invent neighbors |
| States | Static skeleton, initial empty, filtered empty with clear, initial read error/retry, incomplete collections; preview loading/failure/retry, unsupported and missing metadata; invalid evidence never silently opens another file |
| Filter controls | Applied URL parameters key the form: chip removal, clear and browser Back/Forward reset text and selects; a subsequent Apply cannot resurrect stale removed filters |
| PO metadata | Narrow rail uses stacked label/value definitions, not the shared wide two-column definition grid |

## Existing business behavior retained

Quote decisions still use the existing versioned command and confirmation,
reason validation and identical explicit retry. Five rejections allow another
revision; the sixth cancels the request. Customer-invisible draft quotations and
internal material/labor/profit data never enter lists or printable content.

UC4 keeps its original checklist, immutable acceptance/deadline terms, single
deposit evidence validation, upload-intent → storage PUT → complete protocol,
submission payloads, manual approval and full evidence history. Upload/preview
success is **not** approval and does not create a Job. New evidence remounts the
attachment projection so a just-uploaded PO can preview without a page refresh.

## Private-file boundary

`BackendApi.preview()` uses the existing signed download endpoint, followed by an
explicitly approved storage GET. It never changes the existing `download()` path.

- Metadata allowlist is ready PDF/PNG/JPEG with matching filename extension.
- Maximum 100,000,000 bytes; bounded streamed bytes and actual size/signature
  must match before rendering.
- HTTP(S), no URL credentials, future expiry; no redirects, cookies, API Bearer,
  forwarded signed-link headers, cache or referrer on the storage GET.
- MIME comes from authorized metadata, not storage's forced octet-stream.
- The session and component abort signals govern the request. Blob URLs exist
  only in memory and are revoked on file changes/unmount. No token, signed URL,
  private file or navigation snapshot is persisted or logged.
- Native preview or CORS failure leaves original download available. Word,
  Excel and TXT are not converted by a third party.

## Source ownership

| Files | Purpose |
| --- | --- |
| `src/features/customer/customer-documents-domain.ts` | Authorized row projection, exact money/date filters/sort and safe list/detail URL construction |
| `customer-documents.tsx`, `customer-document-filters.tsx` | Shared list presentation, actual-status tabs, filters/chips/pagination and per-row file/print actions |
| `customer-document-navigation.tsx`, `customer-shell.tsx` | Account-lifetime navigation memory and filter/page/scroll restoration |
| `customer-sales.tsx`, `customer-deposits.tsx` | Existing workflows with the new document surfaces composed around unchanged commands |
| `customer-quotation-document.tsx` | Safe document rendering and native print lifecycle |
| `customer-po-preview.tsx` | Authorized evidence selection, attachment reads, native preview and recovery |
| `customer-documents.module.css` | Scoped shared lists, paper/preview/detail layout and isolated print styles |
| `src/lib/api/private-preview.ts`, `backend-api.ts` | Read-only private preview transport; existing downloads/uploads unchanged |
| `customer-content.tsx` | Evidence-selector UUID validation |
| `tests/features/customer/customer-documents-domain.test.mjs`, `tests/features/customer/customer-document-filters.test.mjs`, `tests/features/customer/customer-quotation-document.test.mjs`, `tests/lib/api/private-preview.test.mjs` | Exact filters, URL-bound form resets, safe projections/print fields, private read security and cancellation |
| `DESIGN.md`, `scripts/sync-design.mjs` | Implemented visual contract and generated source appendix |

Unqualified feature filenames above are under `src/features/customer/`.

## Verification and remaining boundaries

- 98 native tests; TypeScript, ESLint, production build (37 routes), compiler-based
  source audit (no unreachable/unused/dependency findings), design sync and
  whitespace checks pass.
- Chrome mock browser: 360/640/1280/1920px list widths, Light/Dark samples,
  quotation document, print-only isolation, unsupported TXT fallback, real PDF
  upload/preview through the explicit in-browser mock, pending manual approval,
  invalid evidence selector, Blob revocation and individual quotation acceptance
  retaining a 1,800.00-baht deposit on a 3,600.00-baht quotation. No page errors.
- Synthetic intercepted contract reads: loading, error/retry, initial empty,
  26-document pagination (20 + 6), filtered previous/next, back preserving page
  and scroll, nine `sent` records, literal search with unsafe int64 and long
  unbroken content at 360px. No internal production/material/supplier reads.
- Detector ran once on changed UI targets; advisory pill-radius and document-paper
  color/type/shadow findings reflect the incumbent pills or scoped readable paper
  treatment, not a new app palette. No second detector run is required.
- Independent finish review initially requested two fixes: stale uncontrolled
  filter values after URL changes, and cramped PO metadata. After one scoped
  correction batch, the verdict scored both **resolved** and approved shipping
  the reviewed Customer extension. This is not production-integration approval.
- Reviewer-fix confirmation: type → Apply → remove chip → Apply does not restore
  removed text; Clear resets type/sort, and browser Back/Forward restores applied
  text/select values. PO metadata values measure 252px at 1280px after the scoped
  layout correction; PDF and unsupported-file rails plus 360px PDF view recaptured.

The pre-existing `.impeccable/design.json` drift was reported, not repaired: this
ordinary extension preserves the incumbent system and documents its scoped paper
treatment in `DESIGN.md`. No system-wide token migration is included.

These checks are **not** live Go/PostgreSQL/S3 verification. Real deployment must
still verify authorized signed links, storage GET CORS, expiry, native PDF/image
support and real browser Print/Save as PDF. The mock seed uses TXT evidence;
native PDF tests upload a clearly fictional test document. Search/filter/sort
remain client-side over the existing bounded reads, not new server filters.
Print pagination, cross-browser printing/native viewers, assistive technology
and browser-zoom verification remain pending. The independent document comparison
found no source/ownership mismatch and requested this explicit limitation record.

## Commit checkpoints

1. `2b7d89c feat(customer): unify quotation and UC4 document lists` — lists,
   exact filters and account-scoped navigation; verified and pushed independently.
2. Detail preview/print checkpoint — rendered quotation/native printing, secure
   PO preview and coupled regression tests/design documentation.
