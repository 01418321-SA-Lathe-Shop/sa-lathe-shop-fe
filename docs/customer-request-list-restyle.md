# Customer request list — structural adaptation

Date: 2026-10-28

Surface: `/customer/requests` list only

Mode: Operate

Direction: owner-prescribed, code-led narrow extension of the incumbent Customer workspace

## Approved direction

**THESIS.** Make real requests easier to scan and open through status pills and structured record cards, while retaining the Customer identity and existing workflows.

**OWN-WORLD.** The logistics reference supplies composition, not a new visual identity. The owner explicitly required no color changes and retention of the existing drawer. Keep the Customer palette, saved Light/Dark preference, Noto Sans Thai, sidebar, navbar, menu and full-screen mobile navigation drawer. This is not a white/purple reproduction or an exact pixel match to the reference.

**STORY.** Start with the existing title and new-request action, search the loaded authorized records, narrow by real request state, scan factual cards, then open the existing request detail or an independently available quotation/evidence/job follow-up. Requested dates remain distinct from shop-confirmed promises.

**FIRST VIEWPORT.** Existing work tabs, heading/action and submitted search lead into wrapping status pills with count badges, followed by the full-width request-card grid. The surrounding shell stays intact. There is no permanent right-hand detail panel, selected-card mode or new detail drawer.

**FORM.** The owner prescribed the structural direction; no seed, new-world workshop or concept tournament is needed. `PRODUCT.md` is absent and was not invented. Incumbent source and the approved scope are the authority.

**FINISH.** “unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance”. This extension introduces no shipping raster assets: all icons are existing inline SVGs, and skeletons are CSS. Review PNGs are browser evidence, not product artwork.

## Shipped presentation contract

- Five wrapping filter links cover All plus `pending`, `ongoing`, `completed` and `canceled`, using existing Thai labels and semantic badge colors. The selected link exposes `aria-current`.
- Counts derive from successfully loaded requests matching the applied literal search query, before the selected status filter. Loading is an ellipsis; a failed initial read shows a dash, not a fabricated zero. Existing partial-collection warnings remain.
- The grid is two columns above 640px and one column at 640px and below. Gaps are 24px/16px, padding 24px/20px and card corners 16px. Resting and hover shadows are restrained; hover never translates or scales the card. Reduced motion disables its transition.
- Cards show actual request number, two-line-clamped description, request status, quantity, Bangkok creation/requested dates, current sales step and customer name/type from the existing `/customers` read. Missing/loading profile data has honest fallback text. Full description remains available in the unchanged detail and the link's accessible name.
- Machine, inbox, clock and arrow graphics reuse the existing icon system. No request-photo service, dimensions, map, contact action, fabricated progress, timeline or supporting endpoint is added.
- The main description is a native Next Link stretched across the card. Follow-up links remain separate and independently focusable above that surface. Keyboard focus outlines the card, and normal native link behavior is retained.
- Four static decorative loading cards share one status announcement. Existing retry/error, initial-empty, filtered-empty, clear-filter and create-request actions remain. Local pagination remains 20 records; search/status URL state and newest-first ordering are unchanged.
- The list-local primary CTA hover rule restores the already intended `#121514` foreground. It fixes inherited link-hover specificity without changing any palette token.

## Boundaries and source ownership

| File | Responsibility |
| --- | --- |
| `src/features/customer/customer-request-list.tsx` | Status navigation/count presentation, factual card content, native card/follow-up links, static skeletons |
| `src/features/customer/customer-requests.module.css` | List-owned layout, pill/card geometry, responsive behavior, focus and hover states |
| `src/features/customer/customer-requests.tsx` | Compose the list with existing reads/search/filter/pagination; retain detail and wizard behavior |
| `src/features/customer/customer-domain.ts` | Count helper derived from existing literal-query matching and real request statuses |
| `DESIGN.md` | Current request-grid guidance, scoped presentation contract and changelog; historical dated guidance retained |

No new API contract, route, authorization rule, dependency, session persistence or business state is introduced. Existing API reads and enrichment remain authoritative; this work does not claim to implement unavailable data. The detail query route, creation wizard, sidebar/navbar/menu and navigation drawer remain intact. Staff, Admin, Landing, Auth and other Customer lists are outside the restyle.

The `DESIGN.md` frontmatter and `.impeccable/design.json` token sidecar are preserved: this ordinary extension consumes existing color variables. Pre-existing metadata drift is not repaired as a side effect. In particular, some sidecar descriptive names and the existing overview's light-theme-frontmatter wording predate the current dark token values; those are separate documentation-maintenance work, not permission to alter colors here.

## Verification and finish review

The scoped finish review examined normal and edge-state captures. Its initial disposition was **fix** for two findings: the inherited primary-link hover foreground and active `DESIGN.md` layout prose that still described request rows. Both were corrected in scope. The final verdict was **ship** at the scope of those two fixes: four explicit hover recaptures and replacement 640px capture confirmed the foreground correction, and the reviewer verified the updated layout prose. This is not a new whole-product accessibility or live-backend certification.

Evidence was captured under `.impeccable/review/request-list/` for review, then retained outside the source checkout as `request-list-review/` in the associated ChatGPT task workspace. The normal matrix is Dark at 375, 640, 768, 1280 and 1440px, and Light at 375 and 1280px. Filtered-empty captures accompany that matrix. Explicit primary-hover captures cover Dark/Light at 375/1280px. Additional captures cover initial loading, initial read error, no requests and long-text pagination.

The machine-readable browser reports are `request-cards-qa.json` and `request-list-states-qa.json` in the associated ChatGPT task workspace, not application runtime data. They record:

- Expected one/two-column behavior and no horizontal overflow in the seven-view matrix.
- Keyboard/card-surface navigation, unchanged detail/wizard, and applied search/filter behavior.
- Synthetic intercepted-contract loading, error/retry, empty and 31-record pagination (20 + 11), long text, exact quantity, honest profile failure and no new API kinds; both reports have no recorded browser errors.

83 native tests passed in the final check. The final production build passed with 37 routes; final lint and source audit passed across 161 source files with no unused/unreachable findings. TypeScript and the source dependency/import audit also passed; this is not a vulnerability audit. The parent delivery pass refreshed the source snapshot and confirmed `sync-design --check` and `git diff --check` after the documentation write.

## Limitations

These are mock/browser and synthetic contract-read checks, not verification against live Go, PostgreSQL or S3. They do not establish global counts for a bounded/partial collection, an exact match to the logistics reference, or complete accessibility conformance. Existing Light-theme contrast limitations remain because the owner expressly prohibited palette changes; no full AA claim is made. No shipping raster was added, so no new raster provenance record is required.
