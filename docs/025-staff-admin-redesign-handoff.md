# Staff/Admin redesign — handoff

Status date: 2026-10-29 · Branch `develop` · Last pushed commit `d64f659`

## Goal and constraints

Redesign every Staff and Admin page to be simpler, Thai-language and easier to use.

- Keep every API call, payload, status value, permission and retry behavior unchanged. Only layout, wording and navigation change.
- Keep brand colors and the existing drawer pattern.
- Do not touch the Overview page (ภาพรวม) content. New pages match its style.
- No new libraries. Anything the documents do not define is raised as a question, not invented.

## Owner decisions

| Topic | Decision |
| --- | --- |
| Language | Thai everywhere |
| Counts | Load every record through existing endpoints, 100 per call, up to 1,000, with a warning beyond that |
| Material plan | Shows material names and units; lives only in งานผลิต |
| Sorting | Open work sorted by the customer-requested date, labelled “ไม่ใช่กำหนดส่งที่ร้านยืนยัน” |
| Out of scope | Customers, reports, settings, bulk actions |
| Production page | Readiness shown on queue cards, “fill” buttons allowed, prioritized list (not a board) |
| Requests page | Customer name “to be defined”; minimum price requested automatically; six stage tabs; one send button that saves first |

Assumptions taken after the owner's “go” (not explicitly answered):

- The local database stays read-only. Saves are verified only with intercepted (fake) API responses in the browser walks.
- The shared sidebar and bell also wrap the Overview page; its content is unchanged.

## Completed and pushed

| Commit | Purpose |
| --- | --- |
| `38a3d8e` | Customer invoice list and payment detail redesign |
| `6a6eb07` | Step 0: Thai workflow-grouped Staff/Admin sidebar with a separate Admin section; notification bell with unread count and dropdown (`workspace-bell.tsx`, `workspace-notifications.ts`) |
| `d64f659` | Step 1: shared kit `src/components/staff-ui/`, `--success` token, Thai `MaterialPicker`, rebuilt งานผลิต |

Step 1 details:

- Shared kit: status tabs with counts, search, buttons, steps, checklist confirm dialog, uncertain-write retry panel, toast, loading/empty/error states, Thai format helpers (`staff-format.ts`) and status labels (`staff-labels.ts`).
- งานผลิต: prioritized list beside a detail panel, material readiness on cards, plan editor moved in from the materials page and request opened-job section, work recording in three segments (materials used / time / photos), close job behind a checklist dialog. Admin sees the page read-only plus actual labor cost.
- Verification: Chrome walks as `anan.staff`, `kittipong.staff` and `pim.admin` at 1280px Dark and 390px Light with every write intercepted (correct payloads and versions, no overflow, no console errors); 163 native tests, type check, lint, source audit, build, DESIGN sync check and `git diff --check`.

## In progress (uncommitted): Step 2 — คำขอและใบเสนอราคา

Files in `src/features/requests/`:

| File | Content |
| --- | --- |
| `request-stage-domain.ts` | Pure logic: stage per request, counts, sorting, Deposit/PO checklist, minimum-price check, rejection count |
| `request-index.ts` | Loads all requests, then quotations and Deposit/PO for open requests only, six at a time |
| `requests.tsx` (rewritten) | Tabs ต้องทำใบเสนอราคา / รอลูกค้าตอบ / รอมัดจำ/PO / รอตรวจหลักฐาน / เปิดงานแล้ว / ปิดแล้ว; URL `?stage=&q=&request=` (the bell's `?request=` links open the right request) |
| `request-detail.tsx` | Summary, customer files, next-action card per stage, collapsed history |
| `request-quote.tsx` | Quote form with automatic server minimum estimate, send-saves-first behind a confirm dialog, Thai 409 conflict message, refuse request |
| `request-evidence.tsx` | Deposit/PO terms and checklist, approve/reject review with exact retry, opened job linking to production |
| `requests.module.css` | Page-specific styles |

Other changes in the working tree:

- List/detail layout extracted to `src/components/staff-ui/staff-layout.module.css`; production now imports it. Adds a sticky submit bar on phones.
- `staff-labels.ts`: request, quotation and evidence status maps. `staff-format.ts`: `dueDayCountdown` for the Deposit/PO deadline.
- Deleted with `git rm`: `src/features/quotations/quotations.tsx`, `src/features/fulfillment/fulfillment.tsx` (Customer uses its own components; `fulfillment-domain.ts` stays).
- `connected-workspace.tsx` no longer passes the `focus` prop.

Status: type check, lint and source audit pass; the existing 163 tests pass. Not yet checked in a browser.

Remaining for Step 2:

1. Add `tests/features/requests/request-stage-domain.test.mjs`.
2. Re-walk งานผลิต, because its CSS moved to the shared layout file.
3. Walk the requests page as Staff and Admin at 1280px and 390px, both themes, with writes intercepted.
4. Register `staff-layout.module.css` and `requests.module.css` in `scripts/sync-design.mjs`.
5. Add a DESIGN.md section and change-log row; run `node scripts/sync-design.mjs`, `--check`, `git diff --check` and `npm run build`.
6. Commit and push.

## Not started

| Step | Page | Key points |
| --- | --- | --- |
| 3 | สต๊อกวัตถุดิบ + Admin ข้อมูลหลัก (`?view=catalog`) | Movement types `addition` / `correction` / `purchase_receive` / `job_issue`; no “low stock” chip (no reorder level in data) |
| 4 | สั่งซื้อวัตถุดิบ (Admin) | Tabs from real supplier order/response statuses; switch to `MaterialPicker`, remove `MaterialSearch` |
| 5 | รับเข้าวัตถุดิบ | Tabs incl. claims `pending_claim`/`claimed`; Admin-only supplier payment section |
| 6 | ส่งมอบและใบแจ้งหนี้ (Staff) / ส่งมอบและรับชำระ (Admin) | Tabs from existing action rules; balance at top; one action card per role |
| 7 | จัดการพนักงาน (Admin) | Searchable list; create/edit side panel; password panel; username-change logout warning |
| 8 | การแจ้งเตือน page | Same Thai list style as the bell |
| 9 | Wrap-up | DESIGN.md consolidation; final walk of every page for both roles |

## Working notes

- Every step: tests, type check, lint, `npm run audit:source` (unused exports fail), build; `src` `.ts`/`.tsx` files must stay at 310 lines or fewer; update DESIGN.md in the same step; commit and push per step.
- New CSS Module rules are prefixed with `:global(.live-workspace)` so they win over legacy workflow styles.
- Browser walks use local CDP scripts that log in through the local-test demo buttons and navigate with `window.next.router.push` (the session is memory-only). In Git Bash, run with `MSYS_NO_PATHCONV=1`. Dev server on :3000, backend on :8080.
- Next.js Cache Components keep the previous route mounted but hidden, so a second hidden `.app-shell` can exist in the DOM. This is expected.

## Open question

- Customer name on Staff/Admin request cards is “To be defined”: Staff receive only `customer_id`, and no endpoint returns the customer's name to Staff.
