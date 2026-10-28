# Customer overview dashboard — 2026-10-28

## Scope and behavior

Authenticated `/customer` only. The existing navbar, theme, routes, request/job
details and UC1–UC9 commands are unchanged. No dependencies, API endpoints,
polling or backend changes. Use existing explicitly labeled test accounts to
preview; live errors never fall back to demo records.

- Primary action: ส่งคำขอผลิตใหม่. Secondary shortcuts: jobs, quotations,
  payments and manual refresh. Refresh is disabled while reads settle.
- Four inline summaries: ongoing production jobs, latest sent quotations,
  deliveries eligible for inspection, and exact unpaid invoice balances.
  Values cover loaded authorized records only, not global statistics.
- Attention: existing quotation/evidence/inspection/payment gates, ordered by
  actual deadlines first. One row initially; expand locally for the rest.
- Payments: two earliest-due unpaid/partial invoices initially, actual due time, current
  balance and pending-proof warning. Pending proof does not reduce the balance.
  Deposit/PO obligations stay in Attention; these are not counted as invoices.
- Work: first three ongoing jobs in existing server order, Thai production badge,
  original request reference and quantity. Original Job detail links retained.
- Ready: completed jobs with no current shipment or a latest shipping/returned
  shipment; shipping first. Two initially. No fake arrival date/progress.
- Activity: factual timestamped request creation, quote sending, UC4 evidence
  submission/review, Job creation, recorded production cycles, deliveries and
  invoice issue. Two initially; show two more without fetching. Time-descending,
  deterministic ties. Missing, invalid and Go-zero timestamps are omitted. No internal
  event/actor/version data, invented notifications or real-time subscription.

## Data boundaries / unresolved backend capability

Same existing `useSalesIndex` (`/requests`, scoped quotation histories and
approved-quotation fulfillment) plus `/fulfillment/jobs`. No stock, supplier,
private production/photo or cost reads. Monetary sums use BigInt satang and return
decimal strings; unsafe request numbers/quantities stay exact. Asia/Bangkok, THB,
no VAT. Existing bounded collection/partial-read warnings remain visible.

Customer UC9 Job DTO has no shop-confirmed delivery/arrival date. The readiness
section therefore states actual production/shipping state and explicitly says
the confirmed receiving date is unavailable; requested deadlines are not promises.
The generic UC9 events lack sufficient outcome detail for a full payment-review
feed, so they are not parsed or shown as inferred events. No new contract invented.
No snapshot-diff notification is generated when refreshing this dashboard.

## Presentation and source ownership

Preserve incumbent dark industrial tokens and optional light theme. One orange
primary action; outlined contextual actions; inline summary with dividers, not
four decorative metric cards. Flat 16px-corner task panels, 24px spacing/padding
(20px on mobile), one equal two-column grid above 1200px; one column at ≤1200px.
Payment/work share the first row; readiness/activity share the second. Direct
sibling panels stretch to equal row heights without fixed heights or clipping.
Summary has four equal columns above 640px, two at ≤640px. Real links/labels, existing Dark focus ring,
dashboard-local Light focus override and 44px targets. Commit-style activity rail uses existing consistent line icons, not Git
identifiers. Loading skeletons are static and do not require motion.
Light dashboard-only secondary link/hover and focus use `#954711`; informational
badge foreground uses `#166c70`, resolving inherited low-contrast colors locally.
The orange filled primary action, dark theme and all other pages are unchanged.
All previews expand locally; no loaded record is lost or refetched on expansion.
Work names use visual two-line clamps, retaining full accessible text. Large
invoice amounts move to a full row instead of splitting digits in narrow columns.

| File | Responsibility |
| --- | --- |
| `src/features/customer/customer-overview-domain.ts` | Pure authorized projections, due labels and exact invoice total |
| `src/features/customer/customer-overview.tsx` | Existing reads, dashboard composition, quick actions and summary |
| `src/features/customer/customer-overview-panels.tsx` | Attention, payment, readiness, work, activity and loading/empty states |
| `src/features/customer/customer-overview.module.css` | Overview-only responsive presentation |
| `tests/features/customer/customer-overview-domain.test.mjs` | Projection/precision/date/privacy regressions |
| `tests/features/customer/customer-overview-panels.test.mjs` | Rendered action destinations, labels and activity expansion |
| `scripts/sync-design.mjs` | Include overview CSS in deterministic design appendix |
| `DESIGN.md` | Updated canonical Layout pattern and scoped specification |
| `docs/customer-overview-dashboard.md` | This handoff |

## Verification

- 118 native tests pass, including thirteen projection/panel regressions.
- TypeScript, ESLint, production build (37 routes), source audit (181 sources,
  63 entrypoints; no unused/dead/import findings), design sync and diff checks.
- Explicit contract-mock Chrome: 360/640/768/1280/1440/1920px dark and
  360/1440px light, no horizontal overflow or page errors. Invoice keyboard
  activation opens original detail; jobs/new-request shortcuts retain routes.
  Activity expands locally and pending proof leaves the invoice balance unchanged.
- Synthetic contract reads: initial loading (unknown, not zero), failed reads
  (not a false empty state), refresh recovery, empty account, partial metadata,
  overdue invoices, exact large totals/int64, mobile long text, expanded attention,
  failed refresh retaining old money, no ETA invention and no internal API reads.
- One scoped design detector pass raised size/radius advisories; new styles were
  aligned to the documented hierarchy and 8px skeleton corners. No dependencies
  or shared tokens changed. Independent targeted finish recheck returned SHIP:
  the original three Light contrast findings were resolved. This was not an
  expanded review. Documentation audit confirmed the scoped specification and
  source appendix; its precise handoff wording corrections are included here.

Mock and intercepted browser checks do not verify live Go/PostgreSQL/S3 behavior
or a deployed website. Full assistive-technology/cross-browser testing remains
separate. Pre-existing `.impeccable/design.json` preview drift is not repaired here.

## Quick-look layout follow-up — 2026-10-28

The owner requested a simpler desktop overview with equal grids. The former
independent unequal columns have been replaced by four direct grid children,
preserving DOM/visual/keyboard order: payments, work, readiness, activity.
CSS Grid stretches each pair to equal row height; no fixed height, clipped panel
or nested scroll region is used. Summary cells are now equally wide as well.
Initial previews are compact on every screen size, and expansion remains local.

- Native regressions cover direct sibling panel order and every local expansion.
- Mock Chrome geometry checks confirm equal widths, top edges and heights of
  paired panels at 1280/1440/1920px, including expanded activity. At 1200px and below
  the same DOM order becomes a single column. 360/640/768/1200px and dark/light
  captures have no horizontal overflow.
- Synthetic geometry checks cover loading, error, empty and long-text states;
  payment/work/readiness expansion reveals all loaded records without API calls.
  The tested large payment-row invoice amount remains unbroken; exact
  large-money/int64 values are preserved.
- Layout detector before/after reports no findings. Existing APIs, projections,
  business gates and the navbar are unchanged; no dependency or route added.

These are scoped mock/intercepted checks, not new live-backend/deployment proof.
Independent layout finish review returned **SHIP** with no material layout
blocker. Scope caveat: the unbroken-number check covers invoice/payment amounts;
an extreme summary total can still wrap on a 360px screen, without clipping or
dropping digits. It is not a global no-wrapping guarantee.
