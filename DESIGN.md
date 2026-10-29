---
name: Lathe Shop Control — Customer
description: Customer dark industrial design tokens aligned with landing page; legacy Staff, Admin, Landing and Auth specifications remain separate below.
colors:
  customer-action: "#ff923f"
  customer-action-hover: "#ffaa66"
  customer-background: "#060707"
  customer-drawer: "#060707"
  customer-surface: "#111313"
  customer-surface-2: "#191c1c"
  customer-ink: "#f4f4f1"
  customer-muted: "#a5aaa7"
  customer-line: "#343838"
  customer-tint: "#241911"
  customer-information: "#69d5d6"
  customer-success: "#52c480"
  customer-danger: "#ef786f"
typography:
  customer-heading:
    fontFamily: "Noto Sans Thai, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-.02em"
  customer-title:
    fontFamily: "Noto Sans Thai, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.5
  customer-body:
    fontFamily: "Noto Sans Thai, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.65
  customer-metadata:
    fontFamily: "Noto Sans Thai, sans-serif"
    fontSize: ".875rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  customer-field: "8px"
  customer-control: "10px"
  customer-document: "12px"
  customer-attention: "16px"
spacing:
  customer-tight: "8px"
  customer-inline: "16px"
  customer-section: "24px"
  customer-document: "32px"
  customer-wide: "48px"
components:
  customer-button-primary:
    backgroundColor: "{colors.customer-action}"
    textColor: "#121514"
    rounded: "{rounded.customer-control}"
    padding: "11px 20px"
  customer-button-primary-hover:
    backgroundColor: "{colors.customer-action-hover}"
  customer-button-secondary:
    backgroundColor: "{colors.customer-surface}"
    textColor: "{colors.customer-ink}"
    rounded: "{rounded.customer-control}"
    padding: "9px 16px"
  customer-button-danger:
    backgroundColor: "{colors.customer-danger}"
    textColor: "#121514"
    rounded: "{rounded.customer-control}"
    padding: "11px 20px"
  customer-field:
    backgroundColor: "{colors.customer-surface}"
    textColor: "{colors.customer-ink}"
    rounded: "{rounded.customer-field}"
    padding: "10px 12px"
  customer-document:
    backgroundColor: "{colors.customer-surface}"
    rounded: "{rounded.customer-document}"
    padding: "32px"
---

# Lathe Shop Control — Design specification

อัปเดตล่าสุด: 2026-10-30 · สถานะ: login และ workspace ใช้ real API เท่านั้น; ปุ่ม Local test เชื่อม password-free endpoint เมื่อเปิด config เฉพาะ local; browser login จริงผ่านครบ 6 บัญชี ไม่ใช่การรับรอง workflow ทั้งหมด

เอกสารนี้ใช้ส่งต่องานให้ designer และ developer เพื่อสร้าง UI ให้ตรงกับระบบปัจจุบัน อ่านคู่กับ `docs/02-frontend.md` ซึ่งเป็นแหล่งอ้างอิง Business Flow และ permission การตรวจ frontend ด้วย unit tests ไม่ใช่หลักฐานว่า real Backend หรือ UC1–UC9 ทำงานครบ

### Current authentication surface — 2026-10-29

This supersedes historical mock-mode descriptions below. `/login` and `/register`
use the configured real API only. Login has a collapsed, explicitly labelled
real-backend demo-account picker approved by the owner. With the explicit public
UI flag enabled and a loopback API base, its summary is "บัญชีทดสอบ Local · เข้าสู่ระบบทันที".
Each button clears the password and calls `/auth/local-test/login` with username
only, then confirms `/auth/me` and navigates by server role. Without that opt-in,
selection only fills username and clears/focuses password for normal sign-in.
The panel explains privileged local-only access; no passwords or roles are sent
by its buttons. Registration does not show the picker. Buttons and normal form
disable during sign-in. Disabled endpoint (404), unavailable identity (401/403),
rate limit (429) and network failure show feedback without automatic retry or
fallback. Customer,
Staff and Admin workspaces have no mock account switching, reset or lost-response
simulation. All sessions remain memory-only, require login after reload, and keep
existing server role checks, logout and expiry behavior. Existing error/empty
states remain; unavailable backend data never becomes fictional records. Public
landing illustrations and unit-test transport stubs are not browser demo access.
The browser fixture modules, fixture-only tests, mock private-object resolver and
73 obsolete mock/bypass CSS selectors are removed. Historical screenshots and
phase notes remain archival; they do not describe an available mock login.

## Overview

**Creative North Star: "Dark Industrial Customer Workspace"**

The Customer portal uses the same dark industrial palette as the cinematic landing page: deep obsidian background (`#060707`) shared by both the main workspace and navigation drawer, dark metal surfaces (`#111313` / `#191c1c`), precise boundary lines (`#343838`), glowing burnt-orange action accents (`#ff923f`, hover `#ffaa66`), and high-legibility light text (`#f4f4f1`, muted `#a5aaa7`).

The frontmatter and the eight canonical sections here apply only to the authenticated Customer surface. Staff, Admin, Landing and Auth retain their existing visual systems and specifications below. Source authority is `src/features/customer/customer.module.css` and `customer-shell.tsx`; the frontmatter records the dark baseline, while the stylesheet defines both palettes and complete component states.

The `.impeccable/design.json` sidecar extends these tokens with source-derived component previews and breakpoints. Its eight-step tonal ramps are synthesized preview aids, not additional shipped CSS tokens. Preview snippets resolve Customer-local variables to literals because those variables are not declared on the document root; runtime typography uses the self-hosted font, while standalone previews use the same family name with the documented fallback.

**Key Characteristics:**

- Thai-first readable typography.
- Task-specific layouts with clear document and status hierarchy.
- Flat surfaces, restrained borders and explicit actions.

## Colors

### Primary

Burnt Orange (`customer-action`) identifies actions and selected states; its separate hover tone is reserved for filled primary actions. Pale Workshop Tint separates attention and confirmation regions without competing with the document.

### Secondary

Information Blue identifies information and informational statuses; keyboard focus uses the orange/copper token described under Buttons. Workshop Green and Signal Red communicate success and danger together with text, never color alone.

Light mode uses warm canvas `#f6f3ef`, white surface `#ffffff`, secondary surface
`#faf8f5`, ink `#241d18`, muted text `#746b64` and line `#ded8d1`. Copper text
`#954711` (hover `#78380d`) is deliberately separate from filled actions
`#df741e` (hover `#ed8734`, dark foreground `#121514`). Light informational,
success and danger text use `#166c70`, `#1f7048`, `#ab3933`; badge backgrounds
mix the current semantic color at 10% over the surface, with 35% mixed borders.
Filled danger uses white text in Light and dark text in Dark. Shared links,
tabs, status labels, avatars and timelines inherit these tokens on every
Customer route; the previous dashboard-only Light color patch is unnecessary.

### Neutral

The main canvas and drawer navigation (`.cust-sidebar` and `.cust-mobile-menu`) share the deep obsidian `#060707` tone, matching the cinematic landing page background. Dark metal surfaces (`#111313`) and elevated slabs (`#191c1c`) form cards, panels, and document containers. Titanium white (`#f4f4f1`) leads for primary copy; quiet alloy gray (`#a5aaa7`) supports metadata; milled boundary lines (`#343838`) separate records and rails. The Customer dark palette is directly drawn from the cinematic landing page.

**The Surface Scope Rule.** Customer tokens must not replace Staff, Admin, Landing or Auth tokens.

**Shared appearance preference (2026-10-28).** Customer, Staff, Admin and Auth read
the same `lathe-theme` preference. Without a saved choice, all follow the system
color scheme, including subsequent system changes; the stable SSR snapshot is
dark. A failed storage write keeps the explicit choice in page memory, even if
stale storage remains readable. Matching cross-tab storage changes refresh that
preference. UI-size uses the same current-page fallback. This stores only display
preferences, never session data. Landing now follows this same preference: warm
light surfaces and dark ink in Light, original cinematic obsidian in Dark.
Customer settings use per-instance `useId` radio-group names, so settings retained
by App Router do not uncheck the currently visible theme or size controls.

## Typography

### Deposit/PO quotation-style alignment — 2026-10-29

Customer Deposit/PO reuses Quotation's document layout: the main column contains the existing original PO preview, upload form and evidence history, with a right-hand `cust-price-panel` showing the accepted full-job price, quantity/no-VAT label, saved customer type, evidence deadline and required-evidence checklist. It uses the same `quotationLayout` grid, 32px gap, 260–320px rail and <=1200px summary-first stack as Quotation. Nested PO preview information stacks under the original document to avoid squeezing it beside a second rail. Deposit/PO list view choices now use the same document pill tabs as quotation status tabs; existing list/filter/pagination components remain shared. Original PO content, statuses, API calls, upload and uncertain-write handling, deadline and approval gates are unchanged; no fabricated deposit document, PDF or internal costs are introduced.

### Local-test account switching — 2026-10-29

“สลับบัญชีทดสอบ” appears in Staff/Admin sidebar settings and Customer desktop sidebar/mobile menu only when the active session was created via guarded Local test login and the existing loopback opt-in is enabled. Ordinary password sessions, even with a demo username, do not show it. The UI-only provenance marker stays in session memory and is never an authorization claim. Clicking expands an inline six-account list without signing out or visiting login. Selecting an account authenticates it through the existing local-test endpoint, confirms `/auth/me`, revokes the previous session and replaces the workspace by server role. The current account is labelled/disabled; all choices disable while pending. Cancel/Escape closes the list and restores focus without changing accounts. Failed replacement login keeps the current account and shows an inline error. If old-session logout cannot be confirmed, clear local state, clean up the candidate best-effort and show the existing expiry/revocation warning at login rather than silently switching. Staff mobile navigation closes after success; Customer shell remounts by account ID. Normal logout remains separate. No password, persisted token, automatic retry, browser mock or new endpoint is added.

### Staff/Admin grouped Thai navigation and bell — 2026-10-29

Step 0 of the approved Staff/Admin redesign (Overview content unchanged). The sidebar groups pages by workflow stage with Thai 0.75rem/650 muted group labels (no tracking): Staff — ภาพรวม, งานขาย (คำขอและใบเสนอราคา), การผลิต (งานผลิต, สต๊อกวัตถุดิบ, รับเข้าวัตถุดิบ), ส่งมอบและการเงิน (ส่งมอบและใบแจ้งหนี้); Admin — ภาพรวม, งานขาย, การผลิต (งานผลิต, สต๊อกวัตถุดิบ), จัดซื้อ (สั่งซื้อวัตถุดิบ, รับเข้าวัตถุดิบ), ส่งมอบและการเงิน (ส่งมอบและรับชำระ), then a top-ruled ผู้ดูแลระบบ section (จัดการพนักงาน). Staff `/staff/quotations` and Admin `/admin/requests` share the label คำขอและใบเสนอราคา; Staff's delivery page is labelled ส่งมอบและใบแจ้งหนี้ because Staff do not receive payments. URLs, routes and permissions are unchanged; การแจ้งเตือน stays routable but leaves the sidebar. Page eyebrows show the Thai stage (0.8125rem, no tracking); workspace descriptions and the sidebar role card are Thai.

The navbar bell now matches Customer: a 44px button with an orange count badge (all loaded notifications, `•`/`99+` when the read is incomplete), opening a native dialog — a 25rem dropdown under the navbar on desktop and a full-screen sheet at ≤700px. It lists the eight newest notifications with Thai wording for the backend's five fixed titles (display only), request number and relative Bangkok time, unread tint and dot, "อ่านทั้งหมด" (only after a complete read), close, and "ดูการแจ้งเตือนทั้งหมด" to the role inbox. Opening an item marks it read then opens the role's request page with `?request=`. Focus returns to the bell on close. This supersedes the bell-as-link sentence below. Known behavior: after client navigation Next.js keeps the previous route mounted but hidden (Cache Components), so a hidden second shell can exist in the DOM.

### Staff/Admin shared page kit and งานผลิต — 2026-10-29

Step 1 of the approved Staff/Admin redesign. New pages share `src/components/staff-ui/` (Thai labels and formatting plus components): pill `StatusTabs` with counts and an orange count badge where the role must act, a search form (48px input with icon plus ค้นหา), 48px buttons (primary orange / secondary outline / danger / text), `Field` with hint and error, `NextAction` panel, numbered `Steps` (done ✓ in `--success`, current orange), `Collapsible`, native `ConfirmDialog` (centred, ≤32rem; optional checklist must be fully ticked before the confirm button enables; full-width stacked buttons on phones), `RetryPanel` for uncertain writes (ส่งซ้ำแบบเดิม keeps the original key/payload; โหลดข้อมูลล่าสุด re-reads), success `Toast` (5s), skeleton, empty and load-error states, and a notice when a list stops at the 1,000-row read cap. Rules are prefixed with `.live-workspace` so they win over legacy workflow button styles. A `--success` token (dark `#52c480`, light `#1f7048`) is added to both themes for done/ready states only.

งานผลิต (`/staff/production`, `/admin/production`) is a prioritized list beside a detail panel (24rem list column, 24px gap; one column at ≤64rem where the list and detail swap and a กลับรายการ link appears). The toolbar has two rows: tabs รอเริ่มงาน / กำลังผลิต / ผลิตเสร็จ / ทั้งหมด (counts from the full job list read 100 per call; Staff see an attention badge on รอเริ่มงาน), then search (literal request number or description) and อัปเดตข้อมูล. Open work is sorted by the customer-requested date, labelled "ลูกค้าต้องการ … (ไม่ใช่กำหนดส่งที่ร้านยืนยัน)", with a day-countdown chip; undated jobs come last; finished jobs sort newest first. Each card is one link showing request number, status, description, quantity, rework cycle, material readiness for queued jobs (read per job, six at a time: พร้อม ✓ / ยังไม่ครบ N รายการ / ยังไม่มีแผน / แผนเปลี่ยน) and the next action. The selected job, tab and search live in the URL (`?tab=&q=&job=`).

The detail shows facts, the four steps, then one task panel by status. Queued: material plan lines with names, units and shortages, the material-plan editor (moved here from the materials page and the request opened-job section) with the shared material picker, จองเพิ่มตามแผนเดิม, and เริ่มผลิต (enabled only when the saved plan is ready at the job's plan version, confirmed in a dialog). In progress (Staff): segments ใช้วัตถุดิบ (prefill "ใช้ตามที่จองไว้", extra materials via picker), เวลาทำงาน (+15/+30/+60 chips with a running "จะเพิ่ม…" summary), รูปงาน (image upload with อัปโหลดอีกครั้ง after failure), and ปิดงาน behind a two-item checklist dialog. Completed: a NextAction to ส่งมอบ. Admin sees the same list and detail read-only, plus the actual-cost section and labor-cost form; no Staff write buttons are rendered. History and system events are collapsed. Endpoints, payloads, idempotency, version checks, statuses and permissions are unchanged; the separate “Job material plans” list on สต๊อกวัตถุดิบ and the plan panel inside the request opened-job section are removed because the plan now lives in production.

### Staff/Admin คำขอและใบเสนอราคา — 2026-10-30

Step 2 of the approved Staff/Admin redesign (`/staff/quotations`, `/admin/requests`; redirects unchanged; Overview untouched). One page named คำขอและใบเสนอราคา uses the shared kit: the header with one อัปเดตข้อมูล button, six status tabs with counts (ต้องทำใบเสนอราคา, รอลูกค้าตอบ, รอมัดจำ/PO, รอตรวจหลักฐาน, เปิดงานแล้ว, ปิดแล้ว) in the URL as `?stage=`, and one search box for request number or description. The 🟠 attention dot appears on ต้องทำใบเสนอราคา for Staff and on รอตรวจหลักฐาน for both roles. Stages are views worked out from existing quotation and Deposit/PO data, not new statuses; the server still decides every transition. Counts read every request 100 per call, up to 1,000, with a warning beyond that; a request whose quotation or Deposit/PO cannot be read is counted separately as “ยังโหลดขั้นตอนล่าสุดไม่ได้” with its own retry, not hidden.

The list and detail use the shared list/detail layout (`staff-layout.module.css`). The detail shows the summary, one next-action card for the current stage, and collapsed secondary sections (ประวัติ, ประวัติระบบ). Staff quote form: material and labour totals, offered price, and a minimum price requested from the existing estimate endpoint (the browser does not calculate it). Inline checks flag an offer below the server minimum and invalid amounts; “ไม่มี VAT” is shown. บันทึกร่าง saves a draft; ส่งใบเสนอราคา saves first if needed, then confirms in a dialog and keeps the existing send API. Refuse-request sits in a collapsed section and requires a customer-visible reason. Deposit/PO review lists one row per evidence item with the file, declared amount and time, approve/reject choice (reason when rejecting), and a file-checked checkbox before confirming. Opened jobs link to `…/production?job=…`. Admin sees costs and reviews evidence but gets no quote or refuse controls.

Browser walk (Chrome, real local API, Staff `anan.staff` and Admin `pim.admin`): 1280px and 390px, Light and Dark, no horizontal page scroll, no console errors, and no API writes attempted (non-GET requests aborted and counted, zero). At 390px the status tabs scroll inside their own row; the hidden tab labels previously widened the page to 421px, fixed by making the tab links a positioning context. The งานผลิต page was re-walked the same way after its layout moved. Limits: the customer name is “To be defined” (Staff receive only `customer_id`); saves, send, approve and reject were not exercised against the live API (writes intercepted only); widths 360, 768 and 1920px were not walked.

### Staff/Admin สต๊อกวัตถุดิบ and ข้อมูลหลัก — 2026-10-30

Step 3 of the approved Staff/Admin redesign (`/staff/materials`, `/admin/materials`; no new route). Admin gets two underline view tabs, สต๊อก and ข้อมูลหลัก (หน่วย/วัตถุดิบ) (`?view=catalog`); Staff see only สต๊อก and `?view=catalog` falls back to it. The stock view has pill filter chips with counts from real values only: ทั้งหมด / มีของพร้อมใช้ (พร้อมใช้ > 0) / หมด (พร้อมใช้ = 0) / มีการจอง / ปิดใช้งาน (`?filter=`; no “ใกล้หมด”, there is no reorder level), one search box (the server's literal name search, `?q=`), and อัปเดตข้อมูล. Materials load 100 per call up to 1,000 with the cap notice. Stock is a table at desktop widths (name with unit, คงเหลือ, จองแล้ว, พร้อมใช้ in bold, Admin-only ต้นทุนเฉลี่ย/หน่วย, status badge มีของพร้อมใช้ green / หมด red / ปิดใช้งาน grey); at ≤48rem each row becomes a card with labelled values in three columns. Quantities drop trailing zeros; stored values stay exact.

Opening a material (`?material=`) shows the new shared side panel (`Drawer`, native modal `<dialog>`: right edge, 36rem wide on desktop, full screen on phones, close button and Escape). It shows quantities, a note that reservations do not consume stock, and the movement history with Thai mode labels (เพิ่มสต๊อก, แก้ยอดตามที่นับ, รับจากผู้ขาย, เบิกใช้ในงาน), before → after balance and time. Reasons and costs appear only when the API returns them (Admin). Admin also gets ปรับสต๊อก as a numbered step form: ① choose เพิ่มสต๊อก or แก้ยอดตามที่นับ, ② quantity, ③ unit cost (addition only), then reason. A sticky summary bar previews “คงเหลือ 105 → 110” exactly, and a count below the reserved quantity is blocked with a field error. A checklist confirmation follows, and the unchanged idempotent payload is sent with a RetryPanel after an unclear response. ข้อมูลหลัก lists units as chips with an inline add-unit form, and materials with status and แก้ไข. The add-material and edit (rename, active toggle) forms open in the side panel; the panel says that a unit cannot be changed and that nothing is deleted. The shared `Toast` timer no longer restarts when its page re-renders, so success messages now disappear after 5 seconds on every redesigned page.

Browser walk (Chrome, real local API, writes intercepted): `pim.admin` at 1280 Dark, 390 Light, 360 Dark, 768 Light and 1920 Dark; `anan.staff` at 1280 Dark and 390 Light. No horizontal page scroll and no console errors. The intercepted stock addition, unit creation and material PATCH bodies matched the previous payloads, and toasts cleared after 5 s. Not exercised against the live API: actual saves, conflicts, and the retry path. Known limit: ข้อมูลหลัก is not a separate sidebar item; it is reached through the view tab.

### Staff/Admin navbar alignment — 2026-10-29

Staff/Admin now follow Customer's navbar composition: a 64px desktop bar with muted real-connection/session notice left and one right-aligned action group (icon theme switch and bell). At the existing Staff mobile navigation breakpoint (900px), a 72px bar shows the logo left and theme/bell/menu right. The bell links to the existing role-scoped inbox; it does not reuse Customer notification targets, add API reads or fabricate unread counts. Sign-out remains in the sidebar/footer on desktop and mobile. Removed scattered breadcrumb/API-pill/topbar-sign-out controls; page headings and sidebar retain current location/role information. Existing sidebar/menu behavior and role permissions remain unchanged. Shared Light/Dark variables govern the whole bar.

### Separate appearance controls — 2026-10-28

Theme is an icon-only 44px-minimum sun/moon quick action, not a Settings dialog trigger. Its Thai accessible name and native tooltip describe the destination theme. It uses the existing shared appearance store and transition, with no new storage or auth behavior. Landing places it beside sign-in, Customer beside the bell on desktop/mobile, Staff/Admin in the topbar, and Auth retains its existing toolbar position. Settings retains only text/display-size choices (Small/Medium/Large); Customer keeps its existing Settings page and other surfaces keep their existing Settings entry. No visible text accompanies the theme icon. This supersedes historical theme-radio descriptions below. Existing theme colors, routes and permissions remain unchanged.

Noto Sans Thai is self-hosted through Next/font for Customer only, with a sans-serif fallback. The frontmatter hierarchy records heading, section title, body and metadata roles. Rem text responds to the existing UI-size preference; most Customer spacing and target dimensions are currently fixed pixels, not a fully rem-scaled spacing system. The shared brand retains its existing identity styling.

## Layout

On desktop (>1024px), Customer navigation docks on the left as a 17rem persistent sidebar drawer (`width: 17rem; height: 100dvh; background: #060707`), sharing the obsidian background with the workspace stage offset (`margin-left: 17rem; width: calc(100% - 17rem); max-width: calc(100% - 17rem)`). Content spans the full available width with fluid side padding (`clamp(1.25rem, 2.5vw, 2.5rem)`), eliminating artificial max-width constraints on wide viewports (1280px, 1440px, 1920px, and 2560px ultrawide). Dashboards, request lists, quotations, invoices, and job tracking expand to fill the full stage. Forms and single-column steps maintain an ergonomic readable maximum width (`clamp(540px, 60vw, 760px)`) or use a balanced 2-column layout with a sticky summary panel. The desktop stage features a sticky 64px topbar with fluid padding, mode indicators, mock controls, and notification access.

On tablet/mobile (≤1024px), the desktop sidebar is hidden, the stage margin is reset (`width: 100%`), and the sticky top navbar (`.cust-navbar`, background `#060707`) with logo, notifications, and menu toggle takes over. The existing full-screen mobile drawer dialog (`.cust-mobile-menu`) uses the same background as the canvas and remains unchanged by the request-list adaptation. At tablet breakpoint (≤880px), multi-column task layouts stack into single columns with fluid gaps, sticky side summaries unstick to inline/top order, and filter toolbars wrap responsively. On mobile (≤640px), content padding becomes 1rem (16px), buttons and actions take full width, notification dialogs become full-screen sheets (`100dvh`), and quotation decisions sit above the safe-area edge with reserved content space.

The Request and normal Job lists are scoped exceptions to the general tablet stacking breakpoint: their full-width card grids have two columns above 640px and one column at 640px and below. Grid gaps are 24px/16px and card padding is 24px/20px respectively, with 16px corners. Search stays above wrapping real-status pill navigation; loaded-query count badges do not imply global totals. The existing query-selected detail replaces each list; no permanent detail panel or new detail drawer is introduced.

Overview is a quick-look operational dashboard with quick-action navigation, four equal-width summary cells, a compact attention queue and one equal two-column panel grid. The first row pairs invoice due/balance with active work; the second pairs completed/shipping readiness with chronological activity. Sibling panels stretch to the same row height without fixed heights or independent column stacks. Panels stack at ≤1200px; summary cells become two equal columns at ≤640px. Requests use responsive record cards and separate document details; quotations use a price/decision rail; Deposit/PO uses an evidence checklist; normal jobs use record cards while unchanged Job details use a timeline; receipt uses a focused decision form; invoices prioritize balance; account/settings use split task layouts. These are Customer surface patterns, not prescriptions for Landing or Staff.

## Elevation & Depth

Customer surfaces are predominantly flat: solid fills and thin dividers provide hierarchy. Request and normal Job list cards are scoped exceptions, with a restrained resting shadow and a shadow-only hover treatment as recorded in their presentation guidance below. Native dialogs occupy the browser top layer and use translucent backdrops. Motion does not carry task meaning; reduced motion disables Customer transitions and animations.

## Shapes

Fields have gently rounded corners, controls slightly fuller corners, and documents restrained rounded containers as recorded in the frontmatter. Attention containers use the largest extracted corner. Avatars and timeline markers are circular; these exceptions communicate identity or sequence rather than turning every surface into a card.

## Components

### Buttons

Primary and danger actions have a 48px minimum height, while ordinary buttons and links have a 44px minimum target. Primary hover uses the theme's separate filled-action hover tone without changing to pale link text. Focus uses a 2px outline offset by 3px: `#ffb16d` in Dark, copper `#954711` in Light. Request/Job card keyboard focus uses the same token. Disabled ordinary controls use muted text on the secondary surface with reduced opacity. Secondary and text-link actions retain a quieter visual role.

### Inputs / Fields

Inputs use a 48px minimum height and a muted-tone 1px border; textarea height starts at 110px and resizes vertically. Labels stay visible. Checkbox/radio controls retain native semantics and are paired with larger labeled targets.

Placeholder text uses the full muted color rather than an extra opacity layer.

### Cards / Containers

Document/form surfaces use the frontmatter document padding and corner treatment, reduced to 20px padding on mobile. Attention uses a bordered surface. Divider-separated rows remain the default for record lists other than the scoped Request and normal Job list card grids described in Layout; lists outside those two adaptations remain unchanged.

### Navigation

Desktop navigation uses a persistent 17rem left sidebar drawer with background `#060707` matching the main background canvas, categorized sections (Workspace, งานของฉัน, เอกสารและการชำระเงิน, บัญชี), icons (`grid`, `file`, `machine`, `clock`, `layers`, `wallet`, `inbox`, `sun`), active page highlighting, and a user footer with avatar, name, and logout. Mobile/tablet navigation (≤1024px) retains the sticky top navbar and opens a full-screen native `<dialog className="cust-mobile-menu">`, not a capped-width drawer. It fills the viewport with the existing theme, zero outer margin/border/radius, `width: 100%` and `height: 100dvh`. A fixed-within-dialog header holds the title and 44px close control; the middle profile/navigation region alone scrolls; a separate bottom region holds a quieter outlined logout action. Safe-area padding protects all edges; long identity/label text wraps. Navigation items remain at least 48px high and preserve active-page semantics. All links use client navigation to retain the memory-only session, closing the dialog on selection. Native modal behavior contains focus and supports Escape/return focus. Opening locks document/body scrolling; closing/unmount restores the previous inline overflow values. Moving above 1024px closes the modal and releases the lock. The trigger exposes its expanded state and dialog association. Entry motion is 180ms ease-out and is disabled under reduced motion. No routes, permissions, notification behavior, desktop layout or business rules change.

### Chips

Compact status badges pair a written status with a colored dot. Their color is semantic, not a substitute for the status label or an invented backend state.

### Theme coverage (2026-10-28)

The shared preference applies across routes, not just the settings preview.
Customer sidebar, desktop topbar, mobile navbar, full-screen menu and footer
use the current canvas and boundary tokens; dialogs, notifications, panels,
forms and secondary buttons inherit current surfaces and ink. The desktop
topbar no longer has a hard-coded black translucent fill. Staff/Admin Light
sidebar and topbar also use the existing warm canvas token instead of unrelated
green-tinted fills. Global `color-scheme` is explicitly set for both themes.
The earlier dark-only background descriptions in Layout/Navigation describe
Dark mode, not a fixed color in Light mode.

The rendered quotation paper, uploaded PO image/PDF and printed documents keep
their original white/document colors in either theme. They are document content,
not workspace chrome; no color inversion or modification of uploaded files is
applied. Rendered quotation paper scopes primary/secondary ink to `#202623` and
`#57615b`, with native Light color-scheme, so shared small-text rules cannot
inherit pale Dark metadata ink onto white paper. The public cinematic landing
follows the shared Light/Dark preference without changing document content.

## Do's and Don'ts

- Do keep Customer typography, palette and layout scoped to the authenticated Customer workspace.
- Do distinguish request, quotation, evidence, job, delivery and invoice states in both copy and layout.
- Do preserve keyboard focus, native dialog behavior and explicit loading, empty, error and partial-data states.
- Don't expose staff costs, stock or supplier data to decorate Customer views.
- Don't describe mock browser checks as live backend verification.
- Don't persist session tokens, signed links or transient retry payloads in browser storage.

## แหล่งอ้างอิง

| ไฟล์ | หน้าที่ |
| --- | --- |
| `DESIGN.md` | Design system, component, responsive และ handoff rules |
| `app/globals.css` | Global tokens, base elements, document-level theme/scale และ shared motion |
| `src/components/appearance/appearance.module.css`, `src/features/auth/auth.module.css`, `src/features/workspace/workspace.module.css` | Component-owned styles, responsive และ theme overrides; zero-specificity local owner scopes คง descendant class contracts เดิม |
| `src/features/landing/` | Landing markup, content, scoped CSS Module และ procedural scene |
| `src/components/appearance/` | Icons, Logo, theme/scale provider และ Settings |
| `src/features/workspace/` | Shared role shell, permissions mapping และ URL |
| `src/components/ui/workflows.module.css` | Functional UC forms/tables และ role shell overrides |
| `src/features/auth/` | Connected Login/Register และ memory-only live/mock session |
| `src/features/inbox/`, `src/features/memberships/` | Inbox และ company memberships แยกจาก login |
| `app/mock-*.ts` | In-browser mock backend ตามสัญญา API (dev/preview เท่านั้น) |
| `app/layout.tsx` | Font loading, language และ provider |
| `app/**/page.tsx` | Route จริง |
| `docs/02-frontend.md` | Business rules, roles และ UC1–UC9 |

ภาคผนวกท้ายไฟล์สร้างจาก source จริงและรักษาลำดับ CSS cascade หากตารางสรุปไม่ครอบคลุมค่าใด ให้ใช้ภาคผนวกพร้อม markup เป็นค่าตัดสิน

## Customer redesign — approved wireframes, batch 1 (2026-10-27)

- Customer only: top navbar replaces the sidebar. Navigation groups are ภาพรวม, งานของฉัน (คำขอผลิต/งานผลิต/ประวัติ), เอกสารและการชำระเงิน, and account/settings. Staff/Admin, public Landing and Login/Register remain unchanged, including the newer login-focus fix.
- `src/features/customer/` owns the new surface. `customer.module.css` is scoped to its root; Noto Sans Thai is self-hosted by Next/font only for this surface. First-use Customer theme is light; existing saved light/dark and UI-size preferences are honored without changing Staff/Admin defaults.
- Palette: #F5F6F4 background, #FFFFFF surface, #202624 text, #59635E secondary, #B54708 action, #1D4ED8 information, #166534 success, #B42318 error; body/action text 16px, metadata 14px, section 20px, heading 28px. Rem dimensions respect the current UI-size setting; touch targets >=44px. Dark variant uses explicit readable foregrounds.
- Overview is an attention queue plus recent work, not equal menu cards. Customer request/job/quote/evidence/delivery/invoice labels remain separate. Exact money and int64 versions are not converted to floats. No production, stock or cost DTO is requested by Customer.
- Bell opens an accessible native dialog: dropdown at desktop, full-screen sheet below 700px. The desktop bell opens independently; the mobile bell first closes its menu through an optional `beforeOpen` callback. Personal notifications group by Bangkok today/earlier, support All/Unread and explicit load-more. Read-all composes the existing per-item PATCH only after the whole bounded collection is known; partial failures keep confirmed reads. Unread reversal remains visibly unavailable; no endpoint is invented. Current notifications link to the authorized request because typed event/job/invoice targets are absent. Existing title patterns are localized for display only, never authorization/routing.
- Existing paginated reads are traversed with a 1,000-record safety boundary and bounded sales-enrichment concurrency; incomplete data is labeled, never advertised as an exact global count. No live-to-mock fallback. Mock account controls stay explicitly labeled.
- Batch 1 intentionally retains existing customer forms inside the new shell until the next cohesive batch. Full customer wireframe coverage is not claimed at this checkpoint.

## Customer requests, quotation decisions and Deposit/PO — batch 2 (2026-10-27)

- Existing Customer URLs are retained. Query selectors (`request`, `quotation`, `view=new`, list `q/status`) give navigable detail states; UUID selectors are validated before path interpolation. Lists keep the query/filter in the URL, with no session tokens or signed links stored there. No new App Router special file or API endpoint is added.
- Requests now use searchable full-width rows (stacked mobile) and separate document-style details. Quote and deposit lists have their own document-price and evidence-checklist patterns. Filters operate on the explicitly traversed collection; incomplete enrichment/paging is disclosed.
- The four-step request wizard is ผู้สั่ง / รายละเอียด / ไฟล์แนบ / ตรวจทาน, with a desktop live summary. Customer type is derived from membership. Files are selected locally, then request creation precedes uploading. A created request ID and per-file outcomes remain in memory: upload retry never recreates the request or reuploads ready files. An uncertain non-idempotent create freezes resubmission and directs inspection of the request list. No persisted draft is implied.
- Quote detail shows whole-job price, scope, comparison/history and separate decision confirmation; mobile decision controls are fixed above the bottom edge with reserved content space. Five rejections permit revision, the sixth warns and cancels. Versioned decisions preserve the original exact payload on explicit uncertain retry. Preview terms use exact satang math; persisted terms and deadline are shown from server history/fulfillment after acceptance.
- Deposit/PO detail pairs immutable terms with the applicable upload form. Private upload completion precedes explicit evidence submission; PO omits amount/time. One deposit is minimum-to-full, not installments. Ready file, pending/approved/rejected evidence, overdue state and actual opened job are distinct. Existing private signed downloads expose a clear เปิดใบ PO action. No local expiry, banking verification or staff approval is invented.
- New customer forms are Thai, use labels and 44px targets, and keep internal IDs/costs out of the UI. Staff/Admin forms are unchanged.

## Customer jobs, receipt, finance and account — batch 3 (2026-10-27)

- `/customer/jobs` now mounts the existing authenticated Customer shell instead of redirecting to requests; `/customer/payments` now mounts the invoice workspace instead of redirecting to the combined legacy workspace. No URL or route file is removed. `/customer/delivery-payment` is the receipt workspace; `?job=UUID` selects details. `/customer/documents` remains a compatible redirect to Deposit/PO.
- Job list uses existing Customer `/fulfillment/jobs` data and request labels, never Staff `/production/jobs` or stock. Job detail has a vertical queued/in_progress/completed timeline, separate shipment and invoice rails, approved deposit, linked original request/quotation and rework history. No supplier details, stock quantities, actual costs or made-up percentages are exposed. Requested date remains distinct from a promised date (not supplied). Customer production photos and material-waiting status remain explicitly unsupported, not fabricated.
- Inspection is a focused delivery summary and decision form with required acknowledgement. Acceptance is final; return requires a reason and reopens the same job, preserving invoice and payments. Payment is not gated on acceptance, and acceptance is not gated on payment. Closed requests display the server's accepted-and-paid result.
- Invoice list/detail emphasize exact outstanding balance and immutable due date from server credit terms, not the 14-day UC4 deadline. The list (`customer-invoice-list.tsx`, `customer-invoices.module.css`) opens with three loaded-data summary tiles (total outstanding in the accent tint, overdue count turning red when above zero, invoices with pending proof), URL `status` pills with counts in the job-list pill style, and 2/1-column stretched-link cards with a 4px accent left rule (green when paid). Each card shows the invoice number, request reference, large balance, an approved-paid progress bar (pending proof is excluded), due date with a Bangkok calendar-day chip (`อีก N วัน` / `ครบกำหนดวันนี้` / `เกินกำหนด N วัน`, the overview's wording) and a primary hint only when bank payment is allowed. The detail (`customer-invoice.tsx`) has a full-width balance hero (badge, due chip, accent amount turning green when paid, progress bar, due/issued/credit-days facts), the pending-proof alert with the exact pending total, a numbered three-step bank form (amount with a "pay full balance" fill chip and inline over-balance/format guidance, Bangkok transfer time, slip upload) ending in a submit bar that repeats the amount, a sticky "สรุปยอด" ledger (amount − approved = balance, deposit note, no VAT) and a status-dotted payment timeline. At ≤1024px it stacks hero → alert → form → ledger → history. Inline guidance never replaces `paymentPayload`; the payload, retry and upload behavior are unchanged. Bank installments require a ready private file, nonfuture Bangkok time and a positive amount within balance. Pending proof does not reduce the balance. Command fields freeze after an uncertain response; explicit retry preserves original UUID/payload/version. Payment proof download is offered only for the current uploader. Customer cannot issue invoices, set credit terms, approve proof or record cash.
- Account/company uses the actual membership/owner flags. Owner invitation and join flows are distinct, one-use/24-hour and memory-only; no customer profile/password mutations are invented. Settings uses existing theme and size preferences with immediate preview and an explicit blocked-storage warning. Auth tokens still never touch browser storage.
- Customer shell is keyed by account ID so a mock-account switch destroys prior customer data/forms, notification dialog and transient file/retry state. Staff/Admin and public/auth surfaces are unchanged. The old shared customer forms are no longer mounted by the new Customer workspace.
- Read-all notification failures reconcile confirmed successful reads with the local unread collection and count; failed items remain actionable. No unsupported bulk endpoint or optimistic all-read claim is added.
- Active navigation follows the actual path rather than treating nested job/payment pages as Overview. Related original-request/quotation links are stacked with an 8px gap and independent touch targets.

## Customer responsive full-width layout — batch 4 (2026-10-27)

- Customer layout is fully responsive and full-width across all supported viewports (360px, 390px, 768px, 1024px, 1280px, 1440px, 1920px, 2560px).
- Replaced rigid 1180px and 1280px containers on .cust-main, .cust-footer, .cust-nav-inner, and .cust-environment with width: 100%; max-width: 100% and fluid padding clamp(1rem, 2.5vw, 2.5rem).
- Replaced 100vh with 100dvh for all full-height containers (.cust-stage, .cust-main, .cust-mobile-menu, .cust-notification-dialog).
- Multi-column grids (.cust-overview-grid, .cust-detail-grid, .cust-quotation-layout, .cust-wizard-grid, .cust-job-detail, .cust-inspection-layout, .cust-account-layout, .cust-settings-layout) now collapse to single columns at tablet breakpoint (≤880px), eliminating column cramping on 768px portrait tablets.
- Grid and flex children enforce min-width: 0 to prevent horizontal content overflow. Media elements (img, ideo, canvas) enforce max-width: 100%; height: auto.
- Forms and single-column steps retain readable bounds (clamp(540px, 60vw, 760px)) or 2-column layouts with summary panels on wide viewports.
- Touch targets on interactive elements (sidebar links, footer buttons, tabs, pagination) are maintained at >=44px. Zero horizontal scroll across all screen widths.


## Customer drawer background and landing color alignment — batch 5 (2026-10-27)

- Drawer background (`.cust-sidebar` and `.cust-mobile-menu`) updated to `var(--cust-bg)` (`#060707`), perfectly matching the main workspace background canvas and landing page obsidian color.
- Topbar (`.cust-topbar`) backdrop tint updated to `rgba(6, 7, 7, 0.85)` and mobile navbar (`.cust-navbar`) background unified with `var(--cust-bg)`.
- Reaffirmed main color tokens strictly matching the cinematic landing page: `#060707` background and drawer, `#111313` card surfaces, `#191c1c` elevated slabs/hover states, `#343838` milled boundaries, and `#ff923f` burnt-orange action highlights.
## Visual direction

Private-file viewing correction (2026-10-27): files without a download filename
open in a new tab, preserving the original app's memory-only session. Named
downloads keep their filename behavior. Signed links are requested on demand,
never persisted, and retain `noopener`, `noreferrer` and `no-referrer` protections.
Verified with a private PO popup in the contract mock and a native regression test.

The following legacy visual sections describe Staff/Admin and preserved public/auth surfaces unless explicitly labeled otherwise. The Customer-specific normative sections above supersede their historical Customer shell references.

- Modern industrial dashboard: หัวเรื่องและตัวเลขใหญ่ การ์ดมุมมน เส้นขอบบาง และพื้นที่ว่างชัดเจน
- สีแบรนด์คือส้มบน charcoal ใน Dark และส้มเข้มบนพื้นขาวอมครีมใน Light
- ส้มใช้กับ primary action, selected state, progress และข้อมูลสำคัญ ส่วน cyan, violet, yellow และ red ใช้แยกชุดข้อมูล
- Landing ใช้ cinematic procedural WebGL machining scene ตาม reference video; พื้นที่ทำงานยังเน้นรายการ ตาราง และสถานะตามเดิม
- Public Landing เป็นภาษาไทย (`lang="th"`) ตามคำขอล่าสุด; workspace navigation และ Settings เป็นภาษาไทยตามเดิม; functional UC forms ยังเป็นภาษาอังกฤษ ชื่อแสดง Worker เป็น Staff โดยคง domain/API role เดิม

## Typography

Workspace body font stack (unchanged):

```css
var(--font-geist-sans), "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif
```

Geist และ Geist Mono โหลดจาก `next/font/google` ด้วย subset `latin`; workspace body ใช้ Geist Sans variable และฟอนต์ไทย fallback ตาม OS เช่นเดิม ส่วน Public Landing โหลด Noto Sans Thai ผ่าน `next/font/google` ด้วย subset `thai`/`latin` และ self-host เฉพาะหน้านี้ด้วย `--font-landing-thai` จึงไม่อาศัยฟอนต์ไทยที่ติดตั้งในเครื่อง; brand wordmark ยังคง Geist

| Use | Medium size | Weight / behavior |
| --- | --- | --- |
| Landing hero | `clamp(3rem,5.2vw,5.5rem)` | 510, line-height 1.28, tracking -.015em; mobile `clamp(2.25rem,10vw,4.5rem)` |
| Landing section | `clamp(2.5rem,4vw,4.5rem)` | 500, line-height 1.3, tracking -.015em |
| Staff h1 | `clamp(2.25rem,3vw,3rem)` (36–48px) | 700, line-height 1.15 |
| Customer / Admin h1 | ค่าเดียวกับ Staff h1 | 700 |
| Login showcase h1 | `clamp(3.875rem,6.2vw,6.5rem)` (62–104px) | line-height .95 |
| Login/Register h2 | `clamp(2.625rem,4vw,3.875rem)` (42–62px) | line-height 1 |
| Panel h2 | 1.1875rem (19px) | 700 |
| Metric / Revenue | 2.0625rem / 2.4375rem (33/39px) | bold, tracking -.05em |
| Sidebar menu | .875rem (14px) | 600; selected 700 |
| Workspace identity | .75rem (12px) | 700 |
| Brand title/subtitle | 1.125/.5625rem (18/9px) | tracking .18/.2em |
| Eyebrow | .625rem (10px) | 700, tracking .18em |
| Table cell | .75rem (12px) | ellipsis on overflow |
| Settings title/legend/choice | 1.5/.9375/.9375rem | 700/700/600 |

ข้อความ metadata และกราฟบางตำแหน่งมีขนาด 7–11px ตาม CSS นี่คือค่าปัจจุบัน ไม่ใช่การรับรอง accessibility; ต้องตรวจ contrast และความอ่านง่าย โดยเฉพาะ preset เล็ก

## UI scale

| Preset | Stored value | Scale | 1rem at browser base 16px |
| --- | --- | --- | --- |
| เล็ก | `small` | .9 | 14.4px |
| กลาง | `medium` | 1 | 16px |
| ใหญ่ | `large` | 1.15 | 18.4px |

`html { font-size: calc(100% * var(--ui-scale)); }` ทำให้ทุกมิติ rem ขยายพร้อมกัน: font, icon, button, input, spacing, radius และ sidebar ค่า viewport/fr/% ไม่ได้ถูกคูณแบบ browser zoom ใช้ rem กับมิติ component ใหม่ ใช้ unitless line-height และ viewport unit กับความสูงจอ Media query ที่เขียนเป็น rem อิง browser initial font size ไม่เปลี่ยนตาม scale จึงต้องทดสอบ breakpoint และ Large แยกกัน

ตัวอย่าง sidebar 17rem = 244.8/272/312.8px ที่ Small/Medium/Large; icon default 1.125rem = 16.2/18/20.7px

## Color tokens

| Token | Dark | Light | Role |
| --- | --- | --- | --- |
| `--bg` | `#0a0b0b` | `#f6f3ef` | page background |
| `--surface` | `#111313` | `#ffffff` | panel/dialog |
| `--surface-2` | `#171919` | `#faf8f5` | secondary control |
| `--surface-3` | `#202323` | `#eee9e3` | emphasized secondary |
| `--line` | `#292d2c` | `#ded8d1` | border |
| `--line-soft` | `#202322` | `#ece7e1` | divider |
| `--text` | `#f3f5ef` | `#241d18` | primary text |
| `--muted` | `#919893` | `#746b64` | secondary text |
| `--lime` | `#ff9b45` | `#df741e` | brand orange / primary / selected |
| `--lime-soft` | `#d97724` | `#b85a18` | secondary orange |
| `--cyan` | `#69d5d6` | `#258f94` | data accent |
| `--violet` | `#8d7ef6` | `#6855d4` | data accent |
| `--warning` | `#e6b967` | `#a97013` | warning/data |
| `--danger` | `#ef786f` | `#c74e49` | danger |

ชื่อ `--lime` เป็นชื่อเก่าที่ยังอยู่ แต่ค่าจริงคือส้ม Primary foreground `#21150c`, border `#ffc184`, dark hover `#ffad63` Active sidebar Dark ใช้ `#242824 → #1a1d1b`; Light ใช้ `#ffead8 → #fff6ee` เปลี่ยน theme token อย่างเดียวไม่พอสำหรับ component ที่มี hex override; ดู CSS snapshot

## Geometry and elevation

- Border ปกติ `.0625rem solid var(--line)` (1px ที่ Medium)
- Control radius `.625–.8125rem`; sidebar item `.6875rem`; cards `1.0625–1.125rem`; Settings `1.5rem`
- Settings shadow `0 1.5rem 5.625rem #0004`; backdrop `#0008` + blur `.3125rem`
- Primary shadow `0 .5rem 1.625rem rgba(255,155,69,.12)`
- z-index: topbar 15, sidebar 20, request modal 50; native dialog อยู่ top layer
- Spacing ที่ใช้บ่อย: 4, 6, 8, 10, 12, 16, 20, 24, 28, 32, 44, 48px แต่ระบบปัจจุบันไม่ได้บังคับ 4px grid

## Components

### Sidebar

Desktop sidebar width17rem, padding1.875rem 1.375rem 1.5rem, fixed height100dvh และ flex column ทั้งสามบทบาทใช้ shell เดียวกัน ส่วน .sidebar-scroll รวม Brand / Workspace / Navigation มี flex1, min-height0, overflow:auto และ thin scrollbar

Settings และ Account อยู่นอกพื้นที่เลื่อนเป็น flex:none พร้อมชื่อบทบาทจริง Item สูง3.0625rem, gap.4375rem, icon box2rem และ aria-current; active weight700

ที่ ≤900px ใช้ drawer width min(20rem,88vw), z45, scrim z44 พร้อมปุ่มเมนูใน topbar ปิดด้วย Escape หรือคลิก scrim ได้ Settings/Account ยังอยู่ท้าย drawer

### Topbar and controls

Topbar แสดง role/current page, badge โหมด (`.api-mode-badge`: "Connected API" สี cyan หรือ "Mock backend" สี warning, pill radius, .6875rem uppercase) และปุ่มชิดขวา: โหมดจริงคือ "ออกจากระบบ"; โหมด mock คือ "สลับบัญชีทดสอบ" (`details.mock-switcher`) ที่เปิดเมนู `.mock-switcher-menu` (width min(22rem,100vw−2rem), radius1rem, shadow เดียวกับ Settings) แสดงบัญชีทดสอบสี่บัญชี, checkbox จำลอง response หายในคำสั่งเขียนครั้งถัดไป และปุ่มรีเซ็ตข้อมูล mock Desktop สูง5.25rem; mobile สูงอย่างน้อย4.5rem ไม่มี search ที่ยังไม่ทำงาน ปุ่มสร้างคำขออยู่ที่ Customer → คำขอผลิต ใช้ Link เปลี่ยนหน้าและ button สำหรับ action ทุก icon-only control มี accessible label

Sidebar footer แสดงชื่อบัญชีจริงจาก `/auth/me`, initials เป็น avatar, บทบาท · username และปุ่มออกจากระบบ (revoke session ที่ server)

### Cards and tables

Page content max105rem, padding3rem 2.75rem 4.75rem Overview ใช้ตัวเลขจาก shared records และ cards3columns → 2 ที่75rem → 1 ที่600px Card padding1.75rem, heading1.2rem, body.85rem ไม่มีกราฟ/ยอดขายที่ hardcode แยกจาก flow

Record layout31%/1fr ยุบ1columnที่68.75rem Cards เลือกได้จริงและ details/actions ใช้ shared domain state Semantic tables มี overflow-x:auto, cell padding.875rem ไม่มี placeholder pagination

### Forms and dialogs

Phase 8 extension (2026-10-19): connected Admin → Workers adds inline Create/Edit profiles with required name, email and phone alongside username/employee number. Existing account status/password controls stay real; legacy null contacts display as missing, not invented values. Editing loads the current profile from the API. Inputs reuse `.form-field` and semantic theme tokens; `.live-editor` uses divider-separated inline sections, not new modal/card layers. `.live-worker-row` separates records with a thin divider. New spacing uses rem so Small/Medium/Large continue to apply. Backend/API role remains `worker`; connected legacy English labels are retained in this scope.

Phase 9 UC5 extension (2026-10-23): connected Staff/Admin navigation adds Materials. Search is submitted explicitly, paginated in groups of 20, and never falls back to demo records. Divider-separated material rows show exact six-place on-hand/reserved/available quantities with fixed base units; only Admin sees average costs and audit reasons. Open material expands history and, for Admin, inline rename/activation and stock controls. Stock corrections are absolute counts (also allowed for inactive materials); additions require an active material and unit cost. Every adjustment requires an audit reason and confirmation. An uncertain write freezes its exact key/version/payload and offers an explicit identical retry or reload, never automatic retry. Catalog creation is not idempotent, so recovery copy asks users to reload before repeating. Catalog forms use existing semantic tokens, rem spacing and wrapping action groups; no new routes, fonts or dependencies.

Job-plan entry is inside the server-returned opened job under an approved quotation, not an invented job-list route. Staff/Admin see required/reserved/consumed/shortage quantities and server readiness; Customers never mount this panel. Only Staff on an ongoing request’s queued job gets the inline editor. Search adds distinct active materials, existing unknown/inactive IDs are preserved, quantities stay exact six-place strings. Save sends the whole desired list and confirms an empty release; explicit Recheck acts on the saved plan (not local edits). Uncertain commands freeze their original key/version/payload and offer identical retry. Reload/close warns before discarding local edits/retry. Admin sees the same plan read-only; costs are absent. Plan rows wrap into one column on narrow screens and use existing theme/scale tokens.

Bounded Phase 9 visual QA: the connected skip link uses a clipped one-pixel nonfocused state, not a negative top offset that can appear inside full-page captures after scrolling. Keyboard focus restores the full link at 1rem from the top/left. No other visual redesign is included.

UC6 connected screen (2026-10-24, Admin → สั่งซื้อวัตถุดิบ): the shared `.record-layout` lists supplier orders as `.record-list-item` cards (short `MO-` number, supplier, status + supplier-response badges, THB total) beside a `.record-detail` with a frozen supplier snapshot, `.detail-grid` facts, a `.workflow-table` of lines inside `.table-scroll`, immutability note and event history (`.payment-history`). Allowed responses come from the UC6 state table: accept (optional note, `.button-primary`), reject (required reason) and cancel (required reason, `.button-danger`); each opens an inline `.live-editor` form with a confirmation checkbox. "New supplier order" opens a `.workflow-form-panel` with active-supplier select, optional Asia/Bangkok expected time, optional job-reference checkboxes, `.live-plan-line` rows for exact quantity/unit cost with per-line and total THB previews (`.price-summary`, server total authoritative) and a reusable material search. A lost response shows `RetryNote` with "Retry identical order"; the frozen key prevents duplicates. Suppliers are managed below in divider rows with Active/Inactive badges, search, inline full-replacement edit and an add form. Status badges for backend values (accepted/received/resolved, ordered/in_progress/claimed, queued/partially_received/pending_claim/unpaid, cancelled) reuse the existing four colour families in both themes.

UC7 connected screen (2026-10-24, Staff/Admin → รับเข้าวัตถุดิบ): accepted supplier orders use the same list/detail layout with a `.workflow-table` of ordered, good received, damaged (history) and outstanding quantities (six places, base unit). While not fully received, an inline `.live-editor` "Record a delivery" form shows one `.live-plan-line` per outstanding material plus one per claimed defect (replacement rows show what the claim still owes); blank rows are skipped and a confirmation checkbox is required. Damaged-goods claims are divider rows (`.live-evidence-record`) with pending_claim/claimed/resolved badges and a required supplier-contact note form. Receipts render as `.payment-history`. Admin alone sees "Supplier payment (Admin)": total, credit days (set once via confirm, no default), due time, payment status, then one full settlement form (bank/cash, Asia/Bangkok paid time, reusable `PrivateUpload` proof — required for bank, optional for cash) and proof download afterwards. Staff see a note that prices/credit/payment are Admin-only. Every command keeps its frozen key for "Retry identical …". Identifier spans in list cards use `.record-code` (no capitalisation).

UC8 connected screen (2026-10-24, Staff/Admin → งานผลิต): the job list comes from `/production/jobs` (job/cycle code, request code, status, start/completion time). The detail adds one request label (number · description · quantity), a `.detail-grid` of cycle/start/completion/labor total and a materials table (planned, reserved now, used from reservation, total used, released). Staff actions are stacked `.live-editor` sections by status: queued → "Start production" (enabled only when the saved plan is ready at the current plan version, with a pointer to Materials otherwise); in progress → incremental actual-use form (one field per planned material plus "Add extra / unplanned material" search), labor-minutes form, optional private JPEG/PNG photo upload and "Complete job" with confirmation. Admin sees no production actions, only "Actual cost (Admin)" with material/labor/total and a labor-cost form (save/revise). History shows actual use (Admin adds unit cost/amount columns), labor entries, photo downloads and events. All commands use `useRetryableWrite` (frozen key/payload, "Retry identical …" plus "Discard & reload"). Resource reloads of the same record now keep the last server data visible (marked Working…) instead of collapsing the detail, so position is kept after each command.

UC9 connected screen (2026-10-24, ส่งมอบและรับชำระ for all three roles): the job list shows job/request codes, invoice number and balance, and job/invoice/delivery/closure badges. The detail shows the request label, a `.detail-grid` (request status, production cycle with "(free rework)", approved deposit, balance to invoice, credit days), an invoice block with the existing `.balance-strip` (amount/paid/balance) and immutable issue/due times, then only the role's currently valid actions as `.live-editor` sections: Admin credit days (once, confirm); Staff/Admin "Issue invoice" (fixed amount, confirm) and shipment (self/third-party, receiver name); Customer inspection (accept is final; return needs a rework reason and reopens the same job) and bank-proof payment (amount ≤ balance, Asia/Bangkok time, required single-use `PrivateUpload`); Admin cash receipt (optional proof) and per-payment review (approve, or reject with a reason, after a confirmation checkbox). Deliveries, payments (hidden from Staff; proof download only for the submitter or Admin), rework history and events follow. A green note marks a closed request. Action forms in the UC7–UC9 details render only from settled data, so a reload that lands mid-entry cannot clear a form being filled in.

UC4 extension appears inline under each approved connected quotation: Deposit/PO requirements, original deadline, upload-and-submit form for Customer, private evidence download, one manual review for Admin/Staff, rejection history and server-returned queued job. Keep amount/date controls labeled THB/Asia-Bangkok. File validation and staff approval are separate steps. Exact submission/review retry controls preserve immutable original payloads after uncertain responses; no automatic retries. Deadline/cancellation/current job come from backend, never demo fixtures. Evidence records use divider-separated `.live-evidence-record` rows and tabular numerals; the review checkbox uses `.live-review-confirm`. No new route, visual identity, icon library, font, or dependency is added.

Connected mobile actions wrap by whole button (8rem flex basis) rather than splitting words. Scope notice separates heading/body with .5rem. Skip-to-workspace is hidden offscreen until keyboard focus. After an approved/sent/draft quote, no additional create-revision form is offered; existing drafts use Edit and new revisions require rejected history. This prevents irrelevant UC2 controls distracting from UC4 fulfillment.

Connected auth ใช้ดีไซน์ Login/Register หลักที่ `/login` และ `/register` ร่วมกับ backend เดียวกันสำหรับ Customer, Staff และ Admin โดย session อยู่ใน memory และไม่ fallback เข้า mock เมื่อ API ล้มเหลว เข้าสู่ระบบสำเร็จแล้วจะไปที่ภาพรวมของบทบาทใน designed shell ใต้ฟอร์มจริงมีส่วน "บัญชีทดสอบ — Mock backend" พร้อมปุ่มสี่ปุ่ม (ลูกค้าบริษัท, ลูกค้าบุคคล, Staff, Admin) ที่เข้าสู่ระบบผ่าน mock backend ในเบราว์เซอร์ (โหลดเมื่อกดครั้งแรกเท่านั้น) บัญชีทดสอบใช้ข้อมูล mock ชุดเดียวกันจนกว่าจะรีโหลดหรือรีเซ็ต

Auth spacing ใช้ระยะจากช่องสุดท้ายถึงปุ่มหลัก `1.5rem`, จากปุ่มหลักถึงลิงก์สลับ Login/Register `1rem`, ก่อน divider ของส่วนบัญชีทดสอบ `1.75rem` และระหว่างปุ่ม bypass `.75rem` เพื่อรักษาลำดับสายตาในทุก UI scale ช่องกรอกข้อมูลใน `.login-field` แสดงสถานะโฟกัสที่กรอบนอกมน (`.login-field > div:focus-within`) ด้วยสีส้มและ soft glow ring; คอนโทรลภายใน (`input`, `select`) ปิด outline บน `:focus` และ `:focus-visible` เพื่อป้องกันกรอบเหลี่ยมทับซ้อนภายในกรอบมน

ส่วน "บัญชีทดสอบ — Mock backend" ใช้ native `details/summary` และปิดเป็นค่าเริ่มต้น หัวข้อสูงอย่างน้อย `3.5rem` มี chevron หมุนเมื่อเปิด รองรับ keyboard และปิด transition เมื่อผู้ใช้ตั้งค่า reduced motion

UC forms ทุกหน้าเป็นฟอร์ม connected: ตรวจ input ฝั่ง client แล้วส่งให้ backend (หรือ mock) ตัดสิน ไฟล์ใช้ signed private upload จำกัด100MB และปุ่ม "Upload again" สร้าง intent ใหม่ (fixture demo เดิมถูกนำออกแล้ว) Input1rem, button min-height2.875rem, panel radius1rem, heading1.375rem, bodyอย่างน้อย.75rem สีพื้น/ขอบ/ข้อความใช้ semantic tokens ใน workflows.css Status badges มีสีแยก light/dark

Settings ใช้ native dialog width min(32.5rem,100vw−2rem), max-height100dvh−2rem, overflow:auto ตัวเลือก radio มีกรอบปุ่ม min-height3.25rem สถานะปัจจุบันแสดงด้วยกรอบส้มและ checked state เท่านั้น คำสั่ง UC ที่ย้อนไม่ได้ใช้ native confirm หรือ checkbox ยืนยันในฟอร์ม inline ไม่มี modal UC แยก

### Icons and brand

Icon เป็น inline SVG viewBox `0 0 24 24`, fill none, stroke currentColor, width1.8, round cap/join ขนาด default1.125rem ชุดชื่อ: grid, inbox, machine, truck, file, layers, wallet, clock, search, plus, arrow, bell, logout, close, sun, moon ค่า width/height SSR และ client ต้องตรงกัน

Brand mark เป็น CSS square สีส้มหมุน45° พร้อมกากบาทเข้ม ขนาด2.0625rem; ใช้ข้อความ LATHE / SHOP CONTROL ไม่มี logo image file. Landing ใช้ mark เดิมย่อเป็น1.8rem/1.5rem และ procedural Three.js machine แทน CSS illustration.

### Landing animation restored to the furnace scene (2026-10-29)

At the owner's request the short-lived procedural lathe turning scene (commit `74c21a7`) is withdrawn. The robot arm → conveyor → furnace → finished ingot loop described in the historical subsection below is the current scene again, with its original timings, posters and tests. Two refinements from the lathe batch are kept:

- **Visible pause control.** The invisible full-scene toggle stays replaced by a top-right pill (`.cinematic-scene-toggle`): inline pause/play SVG, Thai label หยุดชั่วคราว/เล่นต่อ, a minimum height of 44px, `aria-pressed` and the existing focus ring. It is translucent `#0b0d0dcc` in Dark, and white with a `--line` border in Light. This supersedes the "no visible controls" sentence below.
- **Shadow type.** The renderer requests `PCFShadowMap`, because three r186 removed `PCFSoftShadowMap` and already fell back to it with a console warning.

### Landing shop sections and scroll motion (2026-10-29)

The public page now sells the shop first; the order-tracking system becomes one proof point. Copy and data live in `landing-content.ts` and `landing-config.ts`. Every unconfirmed fact is a visible `[placeholder]`, listed in `docs/landing-shop-sections.md`. The furnace scene is unchanged.

**Hero.**
- Headline: กลึงงานตามแบบ / เนี้ยบ ตรงสเปก / ส่งไว คุยง่าย. The paragraph names Bangkok Machine Shop. All Thai copy is written in a natural, conversational shop voice, without gendered particles (ครับ/ค่ะ).
- CTA: ขอใบเสนอราคา → `/register`. The caption links to `#services`.
- Pills: บริการ · วัสดุ · ขั้นตอน · คำถาม · ติดต่อ. At ≤767px they scroll horizontally instead of wrapping.
- Stats: 30 ปีประสบการณ์ and 837 งานที่ส่งมอบแล้ว (owner-confirmed figures), replacing the old 9 workflows / 3 roles.
- The LATHE / SHOP CONTROL brand mark is shared with the workspaces and is unchanged.

**Sections.** Each one uses a different layout.

| # | Section | Anchor | Layout |
|---|---|---|---|
| 1 | บริการ | `#services` | 3/2/1-column icon cards; local SVG icons in the shared 24px, 1.8-stroke style |
| 2 | วัสดุที่เรารับงาน | `#materials` | Heading beside the materials table (the capability card was removed at the owner's request) |
| 3 | ผลงาน | `#work` | 4-column mosaic with a 2×2 lead tile; neutral brushed placeholders until `gallery[].image` is set (rendered through `next/image`) |
| 4 | ทำไมต้องเรา | `#why` | Sticky statement beside six numbered proof points |
| 5 | ขั้นตอน | `#process` | Five numbered steps on a connector line (vertical at ≤1100px). Below them, one full-width row (`.landing-terms`, 1.15fr/1fr, equal height): the Deposit/PO rules card beside a "เรื่องที่ควรรู้ก่อนสั่งงาน" facts card (`.landing-facts`, 2×2 accent figures: 14 วัน, ไม่บวก VAT, แบ่งจ่ายได้, แก้ให้ฟรี). The row stacks at ≤1100px, and the facts become one column at ≤767px |
| 6 | คำถามที่พบบ่อย | `#faq` | Native `<details name>` accordion beside a sticky heading |
| 7 | ติดต่อ | `#contact` | CTA panel beside a contact card with a click-to-load map facade |

Testimonials are omitted because no real content exists.

**Section frame.**
- Padding: `7rem 4.5%` desktop, `4.5rem 1.25rem` mobile.
- Separator: a `--soft-line` top border.
- Eyebrow: accent text with a 1.75rem rule.
- Mobile headings use `clamp(2rem, 8.5vw, 2.5rem)` with `text-wrap: balance`.
- New tokens on the scope:

| Token | Dark | Light |
|---|---|---|
| `--accent-ink` | `#ffad6a` | `#943c0d` |
| `--soft-line` | `#ffffff17` | `--line` |
| `--card` | faint gradient | white |
| `--ease-out` | `cubic-bezier(.16,1,.3,1)` | same |

**Motion** (`landing-motion.tsx`, no library):
- Smooth anchor scrolling, with `scroll-padding-top: 5rem`.
- A 2px orange page-progress bar.
- A compact frosted sticky bar that slides in after 70% of the hero has scrolled past. It holds the logo, section links with `aria-current` on the section in view, and the CTA. Mobile shows only the logo and CTA.
- A one-time blur-and-rise entrance for the hero copy, with the copy fading and lifting as the hero scrolls away and a slight parallax and scale on the scene.
- `[data-reveal]` items rise, unblur and fade in once, staggered 90ms by `--i`. The reveal uses the `translate` property, so card hover (`transform`) never waits for the stagger.
- The process connector draws itself.
- The FAQ animates its height through `::details-content` where `interpolate-size` is supported, and the plus icon rotates into a minus.
- Hover states: service cards lift with an orange glow, gallery media zooms, table rows tint.

**Fallbacks.**
- Content is hidden for reveals only after JavaScript sets `data-motion`, so a no-JavaScript visitor sees everything.
- The reveal observer's root extends far above the viewport, so anything scrolled past (fast scroll, anchor jump) never stays hidden.
- Reduced motion keeps all content visible and removes smooth scrolling, transforms and the entrance animations.

**SEO.**
- `app/page.tsx` sets a Thai title, description and OpenGraph text.
- FAQPage JSON-LD is generated from the same FAQ array; answers that still contain a `[placeholder]` are withheld until filled.
- Heading order: one h1, one h2 per section, then h3.

### Cinematic public landing (2026-10-28)

Theme fix: `/` follows the existing shared `data-theme` preference, including saved/system changes, rather than forcing Dark. Light uses warm `#f6f3ef` background, `#241d18` ink, `#62574e` secondary text, white stat surfaces, `#d8cfc5` borders and copper `#943c0d` action/focus accents. Navbar, logo text, pills, CTA, captions, stats, workflow, capabilities and footer all adapt. The metallic 3D machine, orange furnace, animation timing, transparent canvas and fallback artwork remain unchanged; these are illustrative content, not inverted images. No new theme state or storage is introduced.

Historical baseline below describes the original Dark implementation; the shared-theme behavior above supersedes its fixed-dark restriction. In Light only, a vertical alpha mask feathers the illustration band's outer edges into the warm page without altering the original artwork.

Only `/` changes. `src/features/landing/landing.module.css` scopes a fixed dark `#060707` world without changing saved workspace appearance. The public page is now Thai, including navigation, calls to action, descriptions, loading/error states and accessible names. Noto Sans Thai is self-hosted by Next/font and scoped to the landing; the existing LATHE / SHOP CONTROL brand retains Geist. Thai headline line-height1.28 and tracking−.015em leave room for marks; desktop size3–5.5rem and mobile2.25–4.5rem. Auth links, logo/pill navigation, caption and two glass stats remain. Counts (9 workflows, 3 roles) are product facts, not recycling or delivery guarantees. The furnace sequence is illustrative, not a statement of shop services. The desktop hero is at least47rem/100svh; the 3D band sits between49% from the top and16% from the bottom, below the headline. The camera remains fixed near-side-on, now slightly higher to reveal depth. No captions or text-reveal delays interrupt the story.

`landing-config.ts` owns public copy. `process-config.ts` owns cumulative durations: pickup1.0s → place0.8s → feed1.2s → melt0.9s → output1.1s, total5.0s on desktop AND mobile. The last0.3s is included in output and freezes the pose/belt. Arm movement uses cubic ease-in-out, belt travel is linear, ingot settling is cubic ease-out. On repeat, the previous ingot fades over the next cycle's first0.18s as fresh scrap fades in; arm, belt phase and final ingot rotation remain continuous. One GSAP clock drives mutable Three.js objects, not per-frame React updates. Local procedural geometry, reflection environment and lighting need no external model/HDR or API.

The robotic arm places a bent bracket onto visible rollers/slats; the box furnace hides it, brightens, pulses once, emits sparse sparks and a short molten stream into an exit mold; a beveled ingot slides out and cools to metallic gray. Refinement adds a shared seeded brushed-metal roughness/bump texture, capsule arm links, piston rods, joint rings, instanced hex fasteners, access panels, side housing and a channel-shaped spout. Lower reflection/ambient fill creates darker cavities and distinct rim highlights. One soft shadow map is1024px desktop/512px mobile; feet and machinery cast onto a transparent shadow-catching ground. Conveyor surface speed matches scrap feed displacement; pickup height is reduced and retraction takes34% of the placement stage instead of24%. Desktop retains restrained DOF and lightweight gripper ghost trails. Heat wisps remain an approximation, not physical refraction. At <768px text stacks above a15rem scene; sparks24→8, DPR1.5→1, DOF/trails disabled. At ≤380px caption/stats are separated vertically.

The entire playback action bar is removed at the owner's request. There are no visible Pause/Loop/Replay/Final-frame buttons. The illustration itself is a transparent native button: click/tap or Enter/Space pauses/resumes; it has a Thai accessible name/description, aria-pressed and an inset focus outline without a new toolbar. Loop stays a code configuration, defaulttrue. Real text remains visible immediately. Reduced motion bypasses Canvas and the interactive overlay, showing the final poster; no-JavaScript does likewise. Lazy-load/context failures or10s initialization timeout show a still with a Thai notice. Offscreen/hidden tabs pause the clock AND renderer; paused/finished scenes render on demand. Regenerated final WebPs carry procedural provenance. No audio, dependency installation or business workflow change.

## Routes

| URL | Surface |
| --- | --- |
| / | Landing |
| /login, /register | ฟอร์มดีไซน์หลักที่เชื่อม sign-in / customer registration จริง พร้อมบัญชีทดสอบ mock backend ใต้ฟอร์ม |
| /staff | Staff overview |
| /staff/quotations, /staff/materials, /staff/receiving, /staff/production, /staff/delivery-payment, /staff/inbox | UC1/UC2/UC4 review, UC5, UC7–UC9, การแจ้งเตือน |
| /customer | Customer overview |
| /customer/requests, /customer/quotations, /customer/deposit-po, /customer/delivery-payment, /customer/inbox, /customer/memberships | UC1 / UC3 / UC4 / UC9, การแจ้งเตือน, บริษัทและคำเชิญ |
| /admin, /admin/requests, /admin/workers, /admin/materials, /admin/orders, /admin/receiving, /admin/production, /admin/delivery-payment, /admin/inbox | Admin overview, UC1–UC4 read/review, จัดการ Staff, UC5 catalog/stock, UC6, UC7 finance, UC8 labor cost, UC9 terms/payments |

Legacy redirects: /staff/orders → /staff/receiving (UC6 เป็นของ Admin เท่านั้นตาม backend UC6.md); /staff/requests → /staff/quotations; /staff/delivery, /staff/payments, /staff/debtors → /staff/delivery-payment; /customer/documents → /customer/deposit-po. Customer jobs and payments now render their own task workspaces at their existing URLs.

Root layout ถือ `ApiSessionProvider` (memory-only) จึงรักษา session ระหว่าง client navigation; reload หรือออกจากระบบจะล้าง session และข้อมูล mock Route guard ส่งผู้ไม่มี session ไป /login และผู้ผิดบทบาทไปภาพรวมของตน เป็นการจัดหน้า ไม่ใช่ authorization; backend ตรวจสิทธิ์ทุกคำสั่ง เมนูตามบทบาทสะท้อนสิทธิ์ที่ backend ยืนยัน: Admin มีคำขอ (อ่าน/ตรวจ UC4), พนักงาน, วัตถุดิบ, สั่งซื้อ UC6, รับเข้า (การเงิน), งานผลิต (ค่าแรง) และส่งมอบ/รับชำระ (terms/ตรวจการชำระ); Staff ไม่มีการจัดการพนักงานและไม่มี UC6

## Responsive contract

| Width | Behavior |
| --- | --- |
| >900px | Sidebar fixed17rem และ pinned Settings/Account |
| ≤900px | Sidebar drawer, main margin0, topbar menu button |
| ≤75rem | Overview cards2columns |
| ≤68.75rem | Record layout1column |
| ≤600px | Cards/forms1column; tables scroll horizontally |
| ≤73.75rem / ≤51.25rem | Auth narrower columns / single column |
| ≤767px | Public landing hero and shop sections stack to one column; pills scroll horizontally; sticky bar shows logo + CTA only; lighter 15rem scene |
| ≤1100px | Landing services/gallery use 2 columns; process steps turn vertical; reasons use 1 column |
| ≤380px | Public landing caption sits above full-width stat cards to avoid overlap |

ทดสอบ Large แยกจาก breakpoint เพราะ rem media queries อิง browser initial font size

## State, motion and accessibility

- `localStorage`: `lathe-theme` light/dark และ `lathe-ui-size` small/medium/large; อ่าน legacy `lathe-text-size` ได้
- ใช้ `useSyncExternalStore` อ่าน browser preferences โดย server/hydration snapshot เป็น dark/medium เพื่อไม่ให้ SSR/client markup ต่างกัน; effect ซิงก์เฉพาะ document attributes ไม่เรียก setState; อ่าน legacy size key และใช้งานในหน้าปัจจุบันได้เมื่อ storage ถูกบล็อก
- Theme ใช้ `startViewTransition` ถ้ารองรับ; 320ms ease-in-out, fallback transition250ms; reduced-motion ปิด animation
- Navigation active สะท้อน path และรองรับ refresh/back/forward Settings radio checked เป็น semantic state; แต่ละ instance ใช้ useId แยก radio group เพื่อไม่ชนกับหน้าที่ Next เก็บไว้ใน cache; dialogใช้ Tab/Escape ตาม native behavior
- Root/workspace และ public landing ใช้ `lang=th`; landing แปลข้อความเป็นไทยแล้ว ส่วน functional UC forms คงเดิม; เงินบาท เวลา Asia/Bangkok ไม่มี VAT Key icon controls มี aria-label
- ทุกหน้าใน shell ใช้ loading/error/empty/success states จาก request จริง (live หรือ mock) และ native confirm สำหรับคำสั่งที่ย้อนไม่ได้; full accessibility audit และการทดสอบกับ Go/PostgreSQL/S3 จริงยังรอ
- ปุ่มที่ไม่มี class ภายใน `.live-workspace` ใช้รูปแบบ secondary (border `--line`, radius .75rem, พื้น `--surface`, hover ขอบส้ม) ปุ่มหลักใช้ `.button-primary` เดิม

## Handoff verification

1. ตรวจ 2 themes × 3 UI sizes ว่า font/icon/input/card ขยายพร้อมกัน
2. ตรวจ desktop/tablet/mobile และหน้าต่างเตี้ย โดย Large1200×650 sidebarต้อง scrollและ footerอยู่ในจอ
3. ตรวจตารางกว้าง ชื่อยาว เงินบาท ภาษาไทยหลายบรรทัด และ dialogสูงกว่าจอ
4. ตรวจ Settings keyboard, checked border, persistence, reduced motion และ hydration console
5. ตรวจ Business Flow กับ `docs/02-frontend.md`; mock data/profile ไม่ใช่ permission/API contract
6. รัน TypeScript/build ตามความเสี่ยง และ `node scripts/sync-design.mjs --check`

## Maintenance rule

ทุกครั้งที่เปลี่ยน visual, font, color, size, spacing, icon, theme, scale, component, layout, responsive behavior, interaction หรือ route ต้องอัปเดตส่วนอธิบายและ Change log ใน `DESIGN.md` ในชุดงานเดียวกัน จากนั้นรัน:

```sh
node scripts/sync-design.mjs
node scripts/sync-design.mjs --check
git diff --check
```

Generator อัปเดตเฉพาะภาคผนวกจาก source ไม่สามารถตรวจความถูกต้องของคำอธิบาย ผู้แก้ต้องทบทวน prose ด้วย ไม่มี background watcher หรือ CI auto-update ติดตั้งไว้

### Request-list presentation — 2026-10-28

Owner-approved reference adaptation changes composition, not the Customer palette.
The request list has a wrapping status-pill navigation with count badges,
plus its existing applied search form. Filters retain `q/status` URLs, literal
matching, newest-first sorting, 20-record pagination and all four request states
(pending/ongoing/completed/canceled). Counts describe loaded records matching the
applied query before the selected status; loading shows an ellipsis, and incomplete
collections retain their existing warning. No new count/profile endpoint or
authorization change is introduced. The new CSS Module is scoped under its list
owner; shared badges, navigation, drawer, detail and wizard remain unchanged.

The reference's composition is translated to the existing dark/orange system,
not its white/purple identity. A two-column full-width grid above 640px becomes
one column at 640px and below, with 24px/16px gaps and 24px/20px card padding.
Cards have a 16px radius and `0 4px 16px rgba(0,0,0,.12)` shadow; hover changes
only shadow, never position/scale. Fills and text retain existing Customer
variables and saved Light/Dark preferences; the existing `#ffb16d` focus outline
is reused. A list-local primary-link hover correction restores its intended
existing `#121514` foreground instead of inheriting the generic link hover color;
it is a state-cascade fix, not a palette change. Request-card pill badge geometry (also reused by Jobs) retains the shared badge's exact
value, wording and color mapping, including its existing neutral canceled tone.

Cards show exact request number/quantity, a two-line description (full text in
the unchanged detail), request state, Bangkok creation/requested dates, current
sales step and original follow-up destinations. The small machine/clock/inbox
icons reuse the existing icon system. A customer-ID lookup from the existing
`/customers` read supplies the footer's customer name/type, with explicit loading
or unavailable text instead of invented values. Requested dates retain the
non-promised-date caveat. A stretched native Link opens the existing request
detail from the card surface; secondary quotation/evidence/job links remain
independently focusable above it. Card keyboard focus is visible. No request
detail drawer or sticky selected-card state is added: the current query selector
replaces the list, just as before. The navigation drawer remains unchanged.

Initial loading uses four static decorative skeletons and one status announcement.
Read failure retains retry/error feedback and never becomes an empty-list success;
unknown count badges show a dash rather than a known zero. Empty/search-empty
messages and 20-record paging retain their original actions. No new backend call,
photo preview, signed link, dimensions, progress percentage, contact action, map,
right-hand permanent panel or timeline is introduced. The existing palette is
preserved even where legacy Light-theme colors have separate contrast limitations;
this local restyle is not a global accessibility/palette audit or a full AA claim.
The scope, finish-review findings, evidence and limitations are recorded in
`docs/customer-request-list-restyle.md`.

### Job-list adaptation — 2026-10-28

The Customer job list uses the incumbent request-card pattern and the same scoped
CSS Module, not a new identity or duplicated card stylesheet. Presentation-only
literal search and query-scoped counts use the existing authorized jobs/requests collections.
Production status remains queued/in_progress/completed/cancelled; delivery and
invoice status are separate. Preserve server job order, exact request references
and missing-metadata fallbacks. No new API, business transition or date is added.
The same 2-column grid (1 column at 640px), spacing, corner/shadow, status pills,
existing machine/date icons and keyboard-focus treatment align both lists. Cards
open the unchanged job detail with a stretched native Link; no drawer is added.
They show request reference/name/quantity, actual request creation/requested dates,
production badge, rework note and separate delivery summary. Missing dates are
explicit, never job creation dates or shop-confirmed promises; no progress is
invented. Search/status URLs reset/clamp the existing 20-item local pagination;
clearing filters resets the input. Counts distinguish loading/failed/partial
reads; four static skeletons share one announcement. Job details, history,
inspection and payment screens, all commands and the original two list reads
remain unchanged. No Customer inventory/cost/supplier access is introduced.

### Customer documents — approved Customer-only UC4/quotation adaptation

Quotation and UC4 lists share a scoped document workspace. Real Customer-visible
quotation states are sent/approved/rejected (no draft/canceled/requote tab). UC4
keeps obligations, including deposit-only and not-yet-uploaded cases, separate
from the uploaded-PO view; PO revisions use their own pending/approved/rejected
evidence state. No Supplier UC6 screen, palette, navigation drawer or business
rule is changed. Lists use full-width desktop rows and mobile cards at 640px.
Status counts, literal search, Bangkok date ranges, customer type, sort and
20-item URL pagination describe the existing bounded loaded collection, never
global totals. Price filters compare exact decimal satang and are quote-only;
PO amounts/numbers/issue dates are not invented. Existing /customers reads are
used for list identity; existing fulfillment reads supply PO rows and terms.
Filters persist in harmless URL parameters; controls remount from those applied
parameters on chip removal, clear and history navigation, so stale draft values
cannot silently reapply. An account-scoped, in-memory cache
retains at most 20 list navigation contexts and restores list scroll after data
and fonts settle. No session credentials or private file links are persisted.
Details remain full-page views on the existing query-selector URLs, not new
routes or permanent list split panes. A rendered quotation uses an explicit
Customer-visible field whitelist; no staff cost fields, invented issuer data,
item lines or validity dates enter the document. Its paper surface remains white
in either app theme for document fidelity: ink #202623, secondary #57615b, rules
#dce1dd, 12px corners and a 0 8px 24px rgb(0 0 0 / .06) shadow. Body is .9375rem,
labels .8125rem and headings/totals 1.5rem; 32px padding becomes 20px on mobile.
The wide detail grid places the document beside the existing decision/price
panel; at 1200px and below the action panel precedes the document. Price terms
on accepted documents come from saved decisions, never a recalculation using a
changed profile. Print/Save as PDF is native browser printing, including a quick
list action. An ephemeral body-level print portal isolates only that same
document, waits for fonts and required data, and removes itself after printing.
It is not an original Backend PDF or a new quotation-content contract.

Uploaded UC4 PO files have a separate preview/metadata region above the existing
obligations, evidence form and history. It uses the authorized request attachment
collection and selected PO evidence; an invalid selector never chooses another
file. The narrow metadata rail stacks each label above its value rather than
inheriting the wider generic definition grid. PDF/PNG/JPEG are native previews; other supported documents offer the
original download without conversion. Loading/read failure, unsupported types
and missing metadata have explicit recovery. A fresh signed GET is read with no
cookies, API token or referrer, rejecting redirects and expired links. Bounded
bytes, size and signatures are validated, then retyped from authorized metadata
into memory-only Blob URLs, revoked on file switch/unmount. Reopening retries a
read, not a business write. New evidence refreshes the attachment projection.
Preview/upload completion is not evidence approval. No PDF library, API endpoint,
supplier screen, status, pricing formula or permission is added. Storage GET CORS
and native preview support still require verification on the real deployment.

### Customer Overview dashboard — 2026-10-28

`/customer` uses `customer-overview.module.css`, isolated from all other screens.
An inline shortcut rail leads to the existing jobs, quotations and payments
pages; the primary button opens the existing request wizard. A divider-separated
four-cell summary covers loaded work, sent quotations, inspectable deliveries
and exact invoice balance only. Unknown values use a dash, partial reads are
explicit, and failed refreshes retain earlier values with a warning.

The full-width attention queue initially shows one priority action, expanding locally.
Below, one equal two-column grid (>1200px) pairs invoice due/balance and work
in its first row, readiness and a chronological activity rail in its second.
Four direct sibling panels stretch to equal heights within each row; row height
is content-driven, never fixed or clipped. DOM, visual and keyboard orders agree.
Panels stack at ≤1200px; four equal summary cells become two at ≤640px. Task panels have 16px
corners, 24px gaps/padding, 20px mobile padding and solid existing-theme fills.
Text uses the existing .875/1/1.25/1.75rem hierarchy; static skeletons have 8px
corners. Quick-look previews show two invoices, three active jobs, two readiness
records and two factual dated activities. More controls reveal remaining
loaded records locally; activity reveals two more at a time. Work names
clamp visually to two lines while retaining full accessible text. Large invoice
amounts wrap their entire value block below the name instead of splitting digits.
Dashboard-local light overrides use copper `#954711` for secondary links/hover
and focus outlines and teal `#166c70` for informational badge text, for readable
contrast on white. Filled primary actions and all other surfaces keep their
existing tokens; these are not a global theme migration.

Invoice rows show actual `due_at`, approved-current balance and pending-proof
warning. Deposit/PO stays separate in Attention. Readiness means actual completed
or shipping state, not an invented delivery forecast: the Customer DTO still
lacks a shop-confirmed arrival date. Customer-requested dates do not substitute
for that date. Activity uses timestamped authorized DTO facts, excludes private
raw event/actor data, and explicitly does not claim real-time notification.
Details, business writes, navbar notifications, APIs and dependencies are unchanged.

### Change log

| Date | Change | Verification |
| --- | --- | --- |
| 2026-10-30 | Staff/Admin redesign Step 3: สต๊อกวัตถุดิบ table/cards with real-value filter chips, shared side panel (`Drawer`) with movement history, Admin step-form stock adjustment with exact preview and reserved-quantity block, ข้อมูลหลัก view tab for units and materials; shared Toast timer fix | 174 native tests, type check, lint, source audit, DESIGN sync, build; Chrome walk Admin 360/390/768/1280/1920 and Staff 390/1280, Light and Dark, writes intercepted |
| 2026-10-30 | Staff/Admin redesign Step 2: คำขอและใบเสนอราคา with six stage tabs and counts from existing reads, one next-action card per stage, automatic minimum-price check, Deposit/PO evidence review, collapsed refuse and history; stage-domain unit tests; CSS registered in the source appendix | Stage/count/price/evidence domain tests (9 new; 172 native tests), type check, lint, source audit, line limits, production build; Chrome walk as Staff and Admin at 1280px and 390px, both themes, writes intercepted (0), no horizontal overflow after tab fix |
| 2026-10-29 | Staff/Admin redesign Step 1: shared Thai staff-ui kit (tabs, search, buttons, steps, confirm dialog, retry panel, toast, states), `--success` token, shared material picker; งานผลิต rebuilt as prioritized list + detail with readiness, plan editor moved in from the materials page and request opened-job section, segmented work recording and checklist close; Admin read-only plus labor cost | Production list/format domain tests, 163 native tests, type check, lint, source audit, build; Chrome real local API with every write intercepted (no DB writes) as anan.staff, kittipong.staff and pim.admin at 1280px Dark and 390px Light: correct usage/time/complete payloads and versions, Start disabled on short plan, close gated by checklist, no overflow or console errors |
| 2026-10-29 | Staff/Admin redesign Step 0: workflow-grouped Thai sidebar with separated Admin section, shared คำขอและใบเสนอราคา label, Thai eyebrows/descriptions, Customer-style notification bell with unread count and dropdown; remove unused inbox-link CSS | Navigation/notification tests (every permitted page grouped once, Thai titles), 154 native tests, type check, lint, source audit, build; Chrome real local API read-only as anan.staff and pim.admin at 1280px Dark/Light and 390px: no overflow or console errors, focus returns to bell |
| 2026-10-29 | Customer invoices: summary tiles, status pills with counts, cards with paid progress and due-day chips; detail balance hero, numbered bank-payment steps with fill-balance and inline amount guidance, sticky ledger and payment timeline; remove unused `.cust-payment-layout`/`.cust-invoice-summary`/`.cust-list-price` rules | Invoice domain tests (exact cents, Bangkok days, pending excluded), 151 native tests, type check, lint, source audit, build; Chrome real local API (somchai unpaid, nida.company paid) at 1280/390px Dark and 1280px Light: no overflow or console errors, over-balance message, fill chip, submit gated on upload |
| 2026-10-29 | Match Customer Deposit/PO detail and view tabs to Quotation document layout and price rail | Presentation regressions, responsive/theme browser checks, lint and build; existing evidence logic preserved |
| 2026-10-29 | Landing: remove the capability card (materials table now sits beside its heading); pair the Deposit/PO card with a full-width order-facts card; rewrite all public Thai copy in a natural shop voice; reveal tall items as soon as they enter the viewport | Type check, lint, native tests, build; Chrome walks at 1440 and 360px: no overflow, no stuck reveals |
| 2026-10-29 | Fill landing hero stats with owner-confirmed figures: 30 years of experience, 837 jobs delivered | Type check, landing lint, served-HTML check |
| 2026-10-29 | Shop-first landing: new hero copy, services, materials/tolerances, gallery, why-us, 5-step process with Deposit/PO rules, FAQ accordion with JSON-LD, contact/map facade; smooth scrolling, scroll reveals, sticky section bar, progress line and hero parallax; placeholders for unconfirmed facts | 145 native tests, type check, lint, source audit, production build; real-GPU Chrome walks at 1440/390/360px in Dark/Light, reduced motion and JavaScript off: no overflow, no stuck reveals, keyboard FAQ, valid JSON-LD |
| 2026-10-29 | Restore the robot arm → conveyor → furnace → ingot landing animation at the owner's request; keep the visible pause pill and use `PCFShadowMap` | Restored timeline tests pass; type check, lint and production build pass; real-GPU browser walk at 1440/390/360px |
| 2026-10-29 | Replace landing robot/furnace loop with a 16 s procedural lathe turning scene (bar feed, jaw clamp, spindle inertia, shader-driven cut, chips, coolant, mist, eject); procedural dark-bay reflections; visible pause pill; regenerate transparent posters | 149 native tests (9 new timeline tests), lint, source audit, production build; real-GPU Chrome captures at 1440/390/360px, paused-frame identity, reduced-motion still, no horizontal overflow |
| 2026-10-29 | Replace switch-to-login redirect with an inline local-test account list; confirm new identity before old-session revocation and direct role navigation | 145 native tests, real six-account browser chain, old-token 401 checks, mobile same-role menu close, cancel and simulated failure preservation; normal logout still works |
| 2026-10-29 | Add test-session-only account switch in sidebar/mobile menu and focus the login picker after sign-out | Provenance/visibility/logout regressions, scoped browser checks, lint and production build |
| 2026-10-29 | Align Staff/Admin navbar with Customer's grouped desktop/mobile layout; retain role inbox and sidebar sign-out | Scoped responsive/theme/keyboard browser checks with test-only network responses, native tests, lint and build |
| 2026-10-29 | Connect six demo buttons to real password-free local-test API behind explicit loopback UI opt-in; preserve normal login and memory-only sessions | Real browser login/me/role navigation/logout/revocation passed for all six accounts at desktop/mobile; company membership boundary reads passed; simulated error checks are recorded separately |
| 2026-10-28 | Separate icon-only navbar theme action from Settings; retain text-size controls only inside Settings | Component regressions for destination labels, immediate action and size-only settings; desktop/mobile browser checks use controlled test responses, not real account verification |
| 2026-10-28 | Add owner-approved username-only picker for six real-backend demo identities below the login form; no mock, stored password or automatic login | Component regressions and desktop/mobile browser checks cover selection, password clearing/focus, manual login and registration exclusion |
| 2026-10-28 | Delete browser fixture implementation and mock-only tests/object resolver; remove 73 obsolete mock/bypass selectors while preserving live login/workspace styles | Source/import audit, native tests, production build and desktop/mobile login checks; no backend data or dependencies removed |
| 2026-10-28 | Remove browser-mock login shortcuts and workspace controls; make sessions live-only without changing routes or role permissions | Native session regressions cover configured API login, /auth/me, connection failure without fallback and backend logout; real seeded-account browser verification remains blocked separately |
| 2026-10-28 | Landing follows the shared Light/Dark preference; add warm light chrome, readable copper actions and a feathered scene boundary without recoloring machinery or changing animation | 134 native tests, lint, production build and actual settings switching at desktop/mobile; no API or workflow changes |
| 2026-10-28 | Theme batch 2: theme-aware Customer chrome, shared Light text/action/status/focus palette, full-strength placeholders and matching Staff/Admin Light navigation; remove dashboard-only color patches | Palette contrast regressions plus scoped mock desktop/mobile route, menu, bell and preference checks; paper ink isolated while original document/PDF colors, API and business behavior are preserved |
| 2026-10-28 | Theme batch 1: unify Customer/shared appearance snapshots, system-change subscriptions and current-page fallback when writes fail | Native regressions cover system/saved preference, failed writes with readable stale storage and subscriber cleanup; no API/session changes |
| 2026-10-28 | Overview quick-look layout: replace independent unequal columns with one equal two-column, row-aligned grid; four equal summary cells; compact previews with local expansion and unchanged authorized data | Native layout/expansion regressions and scoped responsive browser verification; same routes, APIs, due dates, money and permissions |
| 2026-10-28 | Overview batch 2: task dashboard with existing-route quick actions, loaded-data summary, invoice due/balance rows, active production, completed/shipping readiness, factual chronological activity and dashboard-local Light link/focus/information contrast corrections | Scoped native/browser checks and limitations in docs/customer-overview-dashboard.md; targeted finish recheck SHIP on original three contrast findings; same API reads and business logic |
| 2026-10-28 | Overview batch 1: presentation-only dashboard projections for authorized actions, invoice balance/due dates, production readiness and factual timestamped history | Domain regressions cover exact money, independent receipt/payment, original evidence gates, missing dates and private-event exclusion; visual dashboard follows separately |
| 2026-10-28 | Job-list batch 2: reuse request-card presentation for Customer jobs, real status tabs/counts, literal search and robust local paging; preserve detail/history/inspection/payment views | Native card and domain regressions plus scoped browser checks; no new API or business transitions |
| 2026-10-28 | Job-list batch 1: presentation-only literal search and real production-status counts over existing authorized data | Native tests cover int64 references, literal matching, preserved order and missing request metadata; UI follows separately |
| 2026-10-28 | Document batch 2: Customer-safe quotation document/native print and private UC4 PO preview; preserve original decision and evidence writes, evidence history and existing navigation | Native preview security/whitelist tests and scoped mock/browser checks; full evidence and real-stack limitations in docs/customer-documents-handoff.md |
| 2026-10-28 | Document batch 1: shared Customer quotation/UC4 lists with actual-status pills, loaded-query counts, applied filters/chips/sort and URL paging; separate UC4 obligations from uploaded PO evidence | Domain tests for exact money, Bangkok dates, original identifiers and authorized projections; document preview/print follows in batch 2 |
| 2026-10-28 | Request-list batch 2: responsive record cards, existing machine icon, date rows, membership footer, accessible whole-card link and static skeleton; unknown counts remain distinct from zero; restore existing primary-link hover foreground and reconcile active layout prose | 83 native tests; Chrome 375/640/768/1280/1440px Dark plus 375/1280px Light; synthetic loading/read-error/empty/31-record pagination checks and scoped finish review. Build/check evidence and remaining limitations are recorded in the request-list handoff; not Go/PostgreSQL/S3 verification |
| 2026-10-28 | Request-list batch 1: replace the status select with wrapping pill navigation and loaded-record count badges; preserve applied search/status URLs and all four Request statuses | Literal-query/count unit tests plus existing checks; no API, theme or detail-view change |
| 2026-10-28 | Replace Customer mobile/tablet capped-width drawer with full-screen navigation; separate scroll region, safe-area header/footer, quiet logout, scroll-lock cleanup and desktop-resize close | Native lifecycle regression tests and scoped browser responsive/keyboard checks; no live-backend claim |
| 2026-10-27 | Fix desktop notification bell crash by making the mobile-only pre-open callback optional; preserve mobile menu-close ordering | Regression tests exercise the actual bell click handler with and without the callback |
| 2026-10-27 | Move Customer desktop navigation into persistent 17rem left sidebar drawer; keep sticky top navbar and dialog menu on mobile | Native tests, source audit, design sync check, and browser verification |
| 2026-10-27 | Align Customer portal color palette with landing page dark aesthetic (`#060707` bg, `#111313`/`#191c1c` surfaces, `#343838` line, `#ff923f` burnt-orange action, dark default theme) | Native tests, source audit, design sync check, and browser verification |
| 2026-10-27 | Merge Customer-only normative tokens, canonical design sections and `.impeccable/design.json`; record batch 3 notification reconciliation, path-active navigation and spaced related links; preserve Staff/Landing specifications | Token/source consistency and documentation checks; implementation verification is recorded separately in the Customer handoff, not claimed as live backend testing |
| 2026-10-27 | ปิด redundant inner outline บน `:is(input, select):focus-visible` ใน `.login-field` เพื่อให้โฟกัสแสดงที่กรอบนอกมน `.login-field > div:focus-within` เท่านั้น | ตรวจสอบ visual rendering ในเบราว์เซอร์ทั้ง Dark และ Light mode, snapshot check และ native tests |
| 2026-10-27 | เหลือ global stylesheet ไฟล์เดียว; ย้าย appearance/auth/workspace เป็น CSS Modules; ลบ selector ที่ไม่พบ required class ใน source literals/dynamic prefixes และเก็บ selector กำกวมไว้; audit ใน docs/refactor/css-cleanup.json | Native tests, lint, TypeScript, build, routes และ desktop/mobile baseline comparison |
| 2026-10-27 | จัด UC screens/domain logic ตาม feature; shared forms ใช้ CSS Module scoped ที่ theme provider; จำกัด Tailwind loader ไม่ให้แปลง CSS Modules โดยไม่เพิ่ม dependency | Native tests, lint, TypeScript, build และ route inventory เดิม |
| 2026-10-27 | ย้าย landing เป็น feature; แยก robot arm, conveyor, furnace, workpiece และ primitives; CSS Module ใช้ local owner กับ zero-specificity scope เพื่อคง cascade เดิม; ลบเฉพาะ SVG starter 5 ไฟล์ที่อนุมัติ | Timing tests, lint, TypeScript, build; รูปแบบและ public image URLs เดิม |
| 2026-10-27 | จัด shared infrastructure, auth และ workspace ไว้ใน src; แยก icons, API types, inbox และ memberships ตามหน้าที่ โดยไม่เปลี่ยน UI หรือ URL | Native tests, lint, TypeScript, build และ design snapshot |
| 2026-10-27 | แก้ preference hydration ด้วย external-store subscription แทน setState ใน effect; คง Settings, theme transition และ scale เดิม | Preference unit tests; full lint, TypeScript และ browser regression checks |
| 2026-10-27 | Thai landing with self-hosted Noto Sans Thai; remove action bar, retain scene tap/keyboard pause; add brushed metals, mechanical details, soft shadows and refined arm/conveyor motion |5 timing tests; type/lint/build; desktop/mobile, Thai font, no toolbar, offscreen and fallback checks |
| 2026-10-27 | Replace one-shot spindle intro with configurable five-second arm/conveyor/furnace/ingot loop, playback controls and lighter mobile rendering | Timing tests, type/lint and browser checks; current evidence in landing handoff |
| 2026-10-27 | Keep no-JavaScript final artwork sharp as well as real text; correct scoped landing breakpoint summary | No-JS browser check; design documentation audit |
| 2026-10-27 | Replace public landing with reference-led cinematic machining story, English factual copy, configurable single timeline, lighter mobile scene, Skip intro and static accessible fallback | Targeted lint/type checks and bounded browser inspection; final handoff records actual evidence |
| 2026-10-27 | Add approved Three.js / React Three Fiber / GSAP procedural scene foundation and configurable 10.85s choreography; not mounted on homepage in this foundation commit | TypeScript and dependency audit; visual integration follows in a separate commit |
| 2026-10-24 | Connect UC9 delivery, invoice terms/issue, inspection with free rework, installment bank proof, cash and payment review; hide action forms while a record reloads | UC9 domain tests; headless Chrome end-to-end: terms → invoice → ship → return → rework complete → reship → accept → bank proof → Admin approval → request closed; no overflow/console errors |
| 2026-10-24 | Connect UC8 production start/use/time/photos/completion and Admin labor cost; `useRetryableWrite`; same-record reloads keep the detail visible | UC8 domain tests; headless Chrome: start ready job, planned + unplanned use, minutes, photo, completion releases unused, Admin labor cost totals; no overflow/console errors |
| 2026-10-24 | Connect UC7 receiving, replacement claims and Admin supplier settlement; shared `PrivateUpload`; `.record-code` list identifiers | UC7 domain tests; headless Chrome: Staff claim + replacement + full receipt (no finance shown), Admin credit days + bank proof required + paid; no overflow/console errors |
| 2026-10-24 | Connect UC6 Admin supplier orders and suppliers; shared `Status`/`RetryNote` helpers; status colours for UC5–UC9 values | UC6 domain tests; headless Chrome: accept, lost-response identical retry (one order), exact 8.38 total, supplier validation, no overflow/console errors |
| 2026-10-24 | Remove the unreachable fixture demo workspaces, demo role storage and demo dialogs; every shell page now reads the live or mock API | TypeScript + 31 native tests; design snapshot |
| 2026-10-24 | Designed shell uses the memory-only live/mock session; connected UC1–UC5 screens move into role routes; new Admin/Inbox/Membership routes; mode badge and mock account switcher; Staff orders redirect | 68 native tests, TypeScript; headless Chrome shell navigation (no console errors, no horizontal overflow) |
| 2026-10-19 | Connect inline UC4 evidence submission/review and queued job display under approved quotations; preserve theme/scale tokens | Exact domain tests + build; real full-stack browser flow in Phase 8 handoff |
| 2026-10-23 | Connect UC5 material search, role-filtered history, Admin catalog and exact audited stock adjustments | Exact UC5 domain tests; Phase 9 verification/handoff records actual runtime coverage |
| 2026-10-23 | Add job-linked saved plans, explicit reservation/release and role-aware readiness display | Worker-only queued plan writes; focused tests and Phase 9 browser checks |
| 2026-10-19 | Add connected Worker contact create/edit and retain nullable legacy profiles; preserve upstream auth design/routes | Exact contact tests + build; browser verification in Phase 8 handoff |
| 2026-10-19 | Preserve upstream designed auth/routes while merging Phase 8 exact evidence/contact primitives; no intentional visual redesign | Production build + 53 native tests; source appendix refreshed |
| 2026-10-16 | Merge design with functional develop flows, Admin routes, Staff naming, shared provider, pinned sidebar และ workflow theme tokens | Verification: docs/08-design-workflow-integration.md |
| 2026-10-16 | Merge latest develop: connected AUTH/UC1–UC3 at `/login` and `/register`, separate demo entry, sixth-rejection rule และ themed live surfaces | 47 tests + production build |
| 2026-10-16 | ย้าย logic AUTH จริงเข้า Login/Register ดีไซน์หลักโดยตรง และวาง Customer/Staff/Admin bypass ไว้ใต้ฟอร์ม | Browser + 47 tests + production build |
| 2026-10-16 | ปรับ vertical rhythm ของปุ่ม Login/Register, ลิงก์สลับหน้า และ demo bypass | Browser + design snapshot |
| 2026-10-16 | ทำส่วนบัญชีทดสอบใต้ฟอร์มให้ collapse ได้และปิดเป็นค่าเริ่มต้น | Browser keyboard/state + production build |
| 2026-10-16 | Initial implemented-design baseline: themes, UI scale, scrollable sidebar, Settings border state, typography, routes and source snapshot | Source comparison and snapshot check |

### Staff/Admin Overview — 2026-10-28

The owner-pinned reference changes only the Overview content, not the navbar,
navigation drawer, production forms or Customer portal. Both roles use a shared
shop queue (no personal assignments). Four Job-only current-status buttons select
the named filtered list. Creation-cohort ranges use Bangkok calendar boundaries,
default 30 days; priority backlog is separately labelled all dates. No fabricated
trend, ETA, stock readiness or finance appears. Reports use the new read-only
backend dashboard contract, never first-100 counts or a live-error mock fallback.

At the default Medium/16px base, Overview alone fills the available stage, with
32px desktop/16px mobile side padding, compact 28px heading, 18px section titles,
16px body and 14px metadata (all implemented as rem-scaled dimensions).
Its CSS Module inherits Staff/Admin theme/scale tokens. At >=1280px the main/rail
split uses a 2fr main and minmax(17rem, 1fr) rail; the main has equal 2x2 metrics,
4 across >=1440px. Below 1280px the
priority queue follows the metrics; below 704px the named table becomes rows.
Panels use 1rem corners, 1.5rem padding (1.25rem at <=44rem) and restrained
borders. Summary values use 2rem; completion-summary values 1.25rem; weekday axes
use .75rem and calendar cells .1875rem corners. Pills use 2rem corners. These
are Staff-local data/graphic scales, not additions to Customer frontmatter.
Quick links differ
by confirmed role; Admin worker management is navigation only. Existing production
details accept a validated optional job UUID selector under Suspense; no command
or form changes. Loading, stale refresh, empty/filter-empty and retry errors are
distinct. The heatmap is independent rolling twelve-month first-completion
history, not current-cycle completed_at or a fictional productivity chart.
Its 35rem minimum calendar scrolls within its own labelled region, never the
page; Monday-first weeks pad only with noninteractive out-of-period blanks. Month
labels and five neutral-to-orange intensity levels retain both palettes. Exact
period captions include both years. On narrow viewports the calendar initially
shows the newest days; subsequent manual pointer/wheel/key positioning is kept
through resize, with a mobile scroll/date-input hint. Hovered-day counts derive
from the latest report rather than retaining an obsolete day object. Exact
date/count labels, roving arrow/Home/End keys, Enter selection, Escape dismissal
and a native 44px date input make daily details available beyond color or hover.
Day names load only on intent (140ms delay, cancelable reads, first three names
plus full-day pagination); no startup per-job reads. Four summary facts show
total, latest tied best day, today/yesterday-ending streak and weekly average.
Missing audit history is disclosed and streak/average stay unavailable. Section
IDs use useId to avoid cached App Router tree collisions. No new library/raster.
See docs/staff-overview-surface.md.

Change log: 2026-10-28 — Staff/Admin shared-queue reporting layout, named list and
accessible first-completion heatmap;
preserved Customer, navbar/drawer and shared Light/Dark preferences.

## Generated source appendix

อย่าแก้เนื้อหาระหว่าง markers ด้วยมือ CSS snapshot รักษาทุก declaration ตามลำดับ รวม selector เก่าที่อาจไม่ได้ render อยู่ จึงใช้ประกอบกับ component markup

<!-- DESIGN-SNAPSHOT:START -->

### A. Full CSS specification — app/globals.css

Preserve order and media-query context when reproducing the design.

```css
/* Global tokens, base elements and shared motion. */
@import "tailwindcss";

:root {
  color-scheme: dark;
  --ui-scale: 1;
  --bg: #0a0b0b;
  --surface: #111313;
  --surface-2: #171919;
  --surface-3: #202323;
  --line: #292d2c;
  --line-soft: #202322;
  --text: #f3f5ef;
  --muted: #919893;
  --lime: #ff9b45;
  --lime-soft: #d97724;
  --cyan: #69d5d6;
  --violet: #8d7ef6;
  --warning: #e6b967;
  --danger: #ef786f;
  --success: #52c480;
}
html { font-size: calc(100% * var(--ui-scale)); }
html[data-ui-size="small"] { --ui-scale: .9; }
html[data-ui-size="large"] { --ui-scale: 1.15; }

* { box-sizing: border-box; }
html, body { min-height: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-geist-sans), "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif; }
button, input, textarea { font: inherit; }
button { color: inherit; }
button, label { -webkit-tap-highlight-color: transparent; }
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 320ms; animation-timing-function: ease-in-out; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
}

html[data-theme="light"] {
  color-scheme: light;
  --bg: #f6f3ef;
  --surface: #ffffff;
  --surface-2: #faf8f5;
  --surface-3: #eee9e3;
  --line: #ded8d1;
  --line-soft: #ece7e1;
  --text: #241d18;
  --muted: #746b64;
  --lime: #df741e;
  --lime-soft: #b85a18;
  --cyan: #258f94;
  --violet: #6855d4;
  --warning: #a97013;
  --danger: #c74e49;
  --success: #1f7048;
}
:root { --foreground: var(--text); --border: var(--line); --accent: var(--lime); }
```

### A1. Appearance, auth and workspace CSS Modules

src/components/appearance/appearance.module.css

```css
/* Locally owned styles; legacy descendant class contracts are intentionally preserved. */
:where(.scope) :global(.demo-account-switch) { display: inline-flex; align-items: center; justify-content: flex-start; gap: .5rem; width: 100%; min-height: 44px; margin-bottom: .5rem; padding: .75rem; border: 1px solid var(--cust-line, var(--line)); border-radius: 10px; background: var(--cust-surface, var(--surface)); color: var(--cust-ink, var(--text)); font: inherit; cursor: pointer; }
:where(.scope) :global(.demo-account-switch):focus-visible { outline: 2px solid var(--cust-accent, var(--lime)); outline-offset: 3px; }
:where(.scope) :global(.demo-account-switch):hover:not(:disabled) { background: var(--cust-surface-2, var(--surface-2)); }
:where(.scope) :global(.demo-account-switch):disabled { opacity: .6; cursor: wait; }
:where(.scope) :global(.demo-account-switcher) { width: 100%; }
:where(.scope) :global(.demo-account-switcher) > summary { list-style: none; }
:where(.scope) :global(.demo-account-switcher) > summary::-webkit-details-marker { display: none; }
:where(.scope) :global(.demo-account-switch)[aria-disabled="true"] { opacity: .6; cursor: wait; }
:where(.scope) :global(.demo-switch-panel) { display: grid; gap: .5rem; max-height: min(30rem, 65dvh); overflow-y: auto; margin-bottom: .75rem; padding: .5rem; border: 1px solid var(--cust-line, var(--line)); border-radius: 10px; color: var(--cust-ink, var(--text)); background: var(--cust-surface, var(--surface)); }
:where(.scope) :global(.demo-switch-panel) p { margin: .25rem; font-size: .8125rem; line-height: 1.6; }
:where(.scope) :global(.demo-switch-panel) button { display: grid; gap: .25rem; min-height: 44px; padding: .625rem; border: 1px solid var(--cust-line, var(--line)); border-radius: 8px; background: var(--cust-surface-2, var(--surface-2)); color: inherit; text-align: left; font: inherit; cursor: pointer; }
:where(.scope) :global(.demo-switch-panel) button span { font-size: .8125rem; color: var(--cust-muted, var(--muted)); }
:where(.scope) :global(.demo-switch-panel) button:disabled { opacity: .6; cursor: default; }
:where(.scope) :global(.demo-switch-panel) button:hover:not(:disabled) { border-color: var(--cust-accent, var(--lime)); }
:where(.scope) :global(.demo-switch-panel) button:focus-visible { outline: 2px solid var(--cust-accent, var(--lime)); outline-offset: 2px; }
:where(.scope) :global(.demo-switch-panel) [role="alert"] { color: var(--cust-danger, var(--danger)); }
:where(.scope) :global(.theme-quick-toggle) { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 2.75rem; height: 2.75rem; min-width: 44px; min-height: 44px; padding: 0; border: 1px solid var(--cust-line, var(--line)); border-radius: .6875rem; background: var(--cust-surface, var(--surface)); color: var(--cust-ink, var(--text)); cursor: pointer; }
:where(.scope) :global(.theme-quick-toggle):hover { background: var(--cust-surface-2, var(--surface-2)); }
:where(.scope) :global(.theme-quick-toggle):focus-visible { outline: 2px solid var(--cust-accent, var(--lime)); outline-offset: 3px; }
:where(.scope) :global(.theme-quick-toggle) svg { width: 1.25rem; height: 1.25rem; }
:where(.scope) :global(.appearance-settings) { width: min(32.5rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); margin: auto; padding: 1.75rem; overflow: auto; border: 0.0625rem solid var(--line); border-radius: 1.5rem; background: var(--surface); color: var(--text); box-shadow: 0 1.5rem 5.625rem #0004; text-align: left; }
:where(.scope) :global(.appearance-settings)::backdrop { background: #0008; backdrop-filter: blur(0.3125rem); }
:where(.scope) :global(.settings-heading) { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
:where(.scope) :global(.settings-heading) h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
:where(.scope) :global(.settings-heading) button { flex-shrink: 0; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: var(--surface-2); cursor: pointer; }
:where(.scope) :global(.appearance-settings) > p, :where(.scope) :global(.appearance-settings) > small { color: var(--muted); font-size: 0.8125rem; line-height: 1.7; }
:where(.scope) :global(.appearance-settings) fieldset { margin: 1.5rem 0; padding: 0; border: 0; }
:where(.scope) :global(.appearance-settings) legend { margin-bottom: 0.75rem; font-size: 0.9375rem; font-weight: 700; }
:where(.scope) :global(.settings-options) { display: flex; gap: 0.625rem; }
:where(.scope) :global(.settings-options) label { position: relative; flex: 1; min-width: 0; cursor: pointer; }
:where(.scope) :global(.settings-options) input { position: absolute; opacity: 0; width: 0.0625rem; height: 0.0625rem; }
:where(.scope) :global(.settings-options) span { display: flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 3.25rem; padding: 0.625rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: var(--surface-2); font-size: 0.9375rem; font-weight: 600; }
:where(.scope) :global(.settings-options) input:checked + span { color: var(--lime); border-color: var(--lime); background: color-mix(in srgb, var(--lime) 12%, var(--surface)); box-shadow: inset 0 0 0 0.0625rem var(--lime); }
:where(.scope) :global(.settings-options) input:focus-visible + span { outline: 0.125rem solid var(--lime); outline-offset: 0.1875rem; }
:where(.scope) :global(.settings-preview) { padding: 1.125rem; margin-bottom: 1.125rem; border: 0.0625rem solid var(--line); border-radius: 0.875rem; background: var(--surface-2); font-size: 1rem; line-height: 1.7; }
:where(.scope) :global(.settings-preview) p { margin: 0.375rem 0 0; color: var(--muted); font-size: 0.875rem; }
:where(.scope) :global(.appearance-settings) :global(.settings-done) { display: flex; justify-content: center; width: 100%; min-height: 3rem; height: auto; margin-top: 1.375rem; font-size: 0.875rem; }
:where(.scope) :global(.settings-trigger):global(.theme-toggle) span { font-size: 0.8125rem; letter-spacing: 0; }
:where(.scope) :global(.brand) { height: 2.875rem; display: flex; align-items: center; gap: 0.6875rem; padding: 0 0.5rem; letter-spacing: .04em; }
:where(.scope) :global(.brand) > span:last-child { display: flex; flex-direction: column; line-height: 1; }
:where(.scope) :global(.brand) b { font-size: 1rem; letter-spacing: .18em; }
:where(.scope) :global(.brand) small { margin-top: 0.3125rem; color: #777e79; font-size: 0.5rem; letter-spacing: .2em; }
:where(.scope) :global(.brand-mark) { position: relative; width: 1.8125rem; height: 1.8125rem; border-radius: 0.5rem; background: var(--lime); transform: rotate(45deg); box-shadow: 0 0 1.75rem rgba(255,155,69,.2); }
:where(.scope) :global(.brand-mark):before, :where(.scope) :global(.brand-mark):after, :where(.scope) :global(.brand-mark) span:before, :where(.scope) :global(.brand-mark) span:after { content: ""; position: absolute; background: #151815; border-radius: 0.1875rem; }
:where(.scope) :global(.brand-mark):before { width: 0.8125rem; height: 0.25rem; left: 0.5rem; top: 0.75rem; }
:where(.scope) :global(.brand-mark):after { width: 0.25rem; height: 0.8125rem; left: 0.75rem; top: 0.5rem; }
:where(.scope) :global(.live-dot) { width: 0.375rem; height: 0.375rem; display: inline-block; margin-right: 0.375rem; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 0.25rem rgba(255,155,69,.1), 0 0 0.8125rem rgba(255,155,69,.42); }
:where(.scope) :global(.primary-button), :where(.scope) :global(.secondary-button) { height: 2.375rem; padding: 0 0.9375rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.625rem; cursor: pointer; }
:where(.scope) :global(.primary-button) { border: 0.0625rem solid #ffc184; background: var(--lime); color: #21150c; font-size: 0.6875rem; font-weight: 700; box-shadow: 0 0.5rem 1.625rem rgba(255,155,69,.12); }
:where(.scope) :global(.primary-button):hover { background: #ffad63; }
:where(.scope) :global(.secondary-button) { border: 0.0625rem solid var(--line); background: var(--surface-2); color: #aab0ac; }
:where(.scope) :global(.eyebrow) { display: block; margin-bottom: 0.375rem; color: #69706c; font-size: 0.5625rem; font-weight: 700; letter-spacing: .18em; }
:where(.scope) :global(.brand) { height: 3.25rem; gap: 0.8125rem; }
:where(.scope) :global(.brand-button) { width: 100%; border: 0; background: transparent; color: var(--text); cursor: pointer; text-align: left; }
:where(.scope) :global(.brand-mark) { width: 2.0625rem; height: 2.0625rem; border-radius: 0.5625rem; }
:where(.scope) :global(.brand-mark):before { width: 0.9375rem; left: 0.5625rem; top: 0.875rem; }:where(.scope) :global(.brand-mark):after { height: 0.9375rem; left: 0.875rem; top: 0.5625rem; }
:where(.scope) :global(.brand) b { font-size: 1.125rem; }:where(.scope) :global(.brand) small { font-size: 0.5625rem; }:where(.scope) :global(.primary-button), :where(.scope) :global(.secondary-button) { height: 2.6875rem; }:where(.scope) :global(.primary-button) { padding: 0 1.1875rem; font-size: 0.75rem; }:where(.scope) :global(.eyebrow) { margin-bottom: 0.5rem; font-size: 0.625rem; }:where(.scope) :global(.hero-kicker) { width: fit-content; margin-bottom: 1.75rem; padding: 0.5625rem 0.75rem; border: 0.0625rem solid #30352f; border-radius: 0.5625rem; background: rgba(20,23,20,.75); color: #858d86; font-size: 0.625rem; font-weight: 700; letter-spacing: .16em; }
@media (max-width: 56.25rem) {:where(.scope) :global(.brand) { height:2.5rem }:where(.scope) :global(.topbar) :global(.primary-button){padding:0 0.6875rem}:where(.scope) :global(.topbar) :global(.primary-button){font-size:0}:where(.scope) :global(.topbar) :global(.primary-button) :global(.icon){width:1.125rem} }
:global(.theme-root):where(.scope) { min-height: 100vh; color-scheme: dark; background: var(--bg); color: var(--text); }
:where(.scope) :global(.theme-toggle) { flex-shrink: 0; min-width: 5.875rem; height: 2.6875rem; padding: 0 0.8125rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5625rem; border: 0.0625rem solid var(--line); border-radius: 0.6875rem; background: var(--surface); color: var(--text); cursor: pointer; transition: background-color .25s ease, color .25s ease, border-color .25s ease; }
:where(.scope) :global(.theme-toggle):focus-visible { outline: 0.125rem solid var(--lime); outline-offset: 0.1875rem; }
:where(.scope) :global(.sidebar-theme) { margin-top: auto; padding: 1.25rem 0; }
:where(.scope) :global(.sidebar-theme) :global(.theme-toggle) { width: 100%; justify-content: flex-start; }
:where(.scope) :global(.sidebar-theme) + :global(.sidebar-footer) { margin-top: 0; }
@media (min-width: 56.251rem) {
  :where(.scope) :global(.sidebar) > :global(.brand), :where(.scope) :global(.sidebar) > :global(.sidebar-theme) {
    flex-shrink: 0;
  }
  :where(.scope) :global(.sidebar) > :global(.sidebar-theme) {
    margin-top: 0;
    padding: 0.75rem 0 0.625rem;
    border-top: 0.0625rem solid var(--line);
    background: inherit;
  }
}
:global(.theme-root):where(.scope), :global(.theme-root):where(.scope) :where(header, aside, section, article, button, input, select, textarea) { transition: background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease; }
@media (max-width: 56.25rem) {
  :where(.scope) :global(.sidebar-theme) { margin-top: 0.75rem; padding: 0; }
  :where(.scope) :global(.sidebar-theme) :global(.theme-toggle) { width: auto; }
}
@media (prefers-reduced-motion: reduce) {
  :global(.theme-root):where(.scope), :global(.theme-root):where(.scope) *, :global(.theme-root):where(.scope) *::before, :global(.theme-root):where(.scope) *::after { transition: none !important; }
}
:where(.scope) :global(.theme-toggle) span { font-size: 0.5rem; font-weight: 750; letter-spacing: .14em; }
:where(.scope) :global(.theme-toggle):hover { border-color: #8b5126; color: var(--lime); transform: translateY(-0.0625rem); }

:global(.theme-root):where(.scope):global([data-theme="light"]) {
  color-scheme: light;
  --bg: #f6f3ef;
  --surface: #ffffff;
  --surface-2: #faf8f5;
  --surface-3: #eee9e3;
  --line: #ded8d1;
  --line-soft: #ece7e1;
  --text: #241d18;
  --muted: #746b64;
  --lime: #df741e;
  --lime-soft: #b85a18;
  --cyan: #258f94;
  --violet: #6855d4;
  --warning: #a97013;
  --danger: #c74e49;
}

:global([data-theme="light"]) :where(.scope) :global(.theme-toggle) { border-color: var(--line); background: #fff; color: #463c34; }
:global([data-theme="light"]) :where(.scope) :global(.hero-kicker) { border-color: #ddd3ca; background: rgba(255,255,255,.8); color: #463c34; }
:global([data-theme="light"]) :where(.scope) :global(.eyebrow) { color: #727c73; }
:global([data-theme="light"]) :where(.scope) :global(.secondary-button) { border-color: var(--line); background: #eef1eb; color: #4f5a50; }

@media (max-width: 35rem) {
  :where(.scope) :global(.theme-toggle) { min-width: 2.6875rem; width: 2.6875rem; padding: 0; }
  :where(.scope) :global(.sidebar-theme) :global(.theme-toggle) { padding: 0 0.8125rem; width: auto; }
  :where(.scope) :global(.sidebar-theme) :global(.theme-toggle) span { display: inline; }
  :where(.scope) :global(.theme-toggle) span { display: none; }
}
```

src/features/auth/auth.module.css

```css
/* Locally owned styles; legacy descendant class contracts are intentionally preserved. */
:where(.scope) :global(.auth-account-picker) { margin-top: 1.5rem; border-top: 1px solid var(--line); color: var(--text); }
:where(.scope) :global(.auth-account-picker) summary { min-height: 44px; padding: .75rem 0; cursor: pointer; font-size: .875rem; font-weight: 600; }
:where(.scope) :global(.auth-account-picker) p { margin: 0 0 .75rem; color: var(--muted); font-size: .8125rem; line-height: 1.7; }
:where(.scope) :global(.auth-account-list) { display: grid; gap: .5rem; }
:where(.scope) :global(.auth-account-list) button { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: .25rem .75rem; min-height: 44px; padding: .75rem; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--text); text-align: left; font: inherit; cursor: pointer; }
:where(.scope) :global(.auth-account-list) strong { font-size: .875rem; overflow-wrap: anywhere; }
:where(.scope) :global(.auth-account-list) span { color: var(--muted); font-size: .8125rem; }
:where(.scope) :global(.auth-account-list) button:hover:not(:disabled) { border-color: var(--lime); background: var(--surface-2); }
:where(.scope) :global(.auth-account-picker) :is(summary, button):focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }
:where(.scope) :global(.auth-account-list) button:disabled { opacity: .6; cursor: wait; }
:global(.login-page):where(.scope) { min-height: 100vh; display: grid; grid-template-columns: minmax(30rem,1.08fr) minmax(30rem,.92fr); background: #090b0a; }
:where(.scope) :global(.login-showcase) { position: relative; min-height: 100vh; overflow: hidden; padding: 2.375rem 3.375rem; display: flex; flex-direction: column; background: radial-gradient(circle at 70% 48%,rgba(255,155,69,.16),transparent 27%),linear-gradient(145deg,#15120f,#080a09 72%); border-right: 0.0625rem solid var(--line); }
:where(.scope) :global(.login-showcase):before { content:""; position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent 0,transparent 4.3125rem,rgba(255,255,255,.025) 4.375rem),repeating-linear-gradient(90deg,transparent 0,transparent 4.3125rem,rgba(255,255,255,.025) 4.375rem); mask-image:linear-gradient(90deg,#000,transparent 90%); }
:where(.scope) :global(.login-showcase-copy) { position: relative; z-index: 3; margin: auto 0; max-width: 41.25rem; }
:where(.scope) :global(.login-showcase-copy) :global(.hero-kicker) { display: block; }
:where(.scope) :global(.login-showcase-copy) h1 { margin: 0; font-size: clamp(3.875rem,6.2vw,6.5rem); line-height: .95; letter-spacing: -.075em; }
:where(.scope) :global(.login-showcase-copy) p { max-width: 34.375rem; margin: 1.75rem 0 0; color: #7b847d; font-size: 0.9375rem; line-height: 1.85; }
:where(.scope) :global(.login-machine) { position: absolute; right: -9.375rem; bottom: -10.3125rem; width: 36.875rem; height: 36.875rem; display: grid; place-items: center; opacity: .62; }
:where(.scope) :global(.login-machine) :global(.machine-core) { transform: scale(1.25); }
:where(.scope) :global(.login-showcase-footer) { position: relative; z-index: 3; display: flex; justify-content: space-between; color: #59615b; font-size: 0.5625rem; letter-spacing: .13em; }
:where(.scope) :global(.login-panel) { min-height: 100vh; padding: 2.375rem 8vw; display: flex; flex-direction: column; justify-content: center; background: #0d0f0e; }
:where(.scope) :global(.login-back) { position: absolute; top: 2.375rem; padding: 0; border: 0; background: transparent; color: #717972; font-size: 0.6875rem; cursor: pointer; }
:where(.scope) :global(.login-back):hover { color: var(--text); }
:where(.scope) :global(.login-card) { width: min(31.25rem,100%); margin: 0 auto; }
:where(.scope) :global(.login-card) h2 { margin: 0.6875rem 0 0.5rem; font-size: clamp(2.625rem,4vw,3.875rem); line-height: 1; letter-spacing: -.055em; }
:where(.scope) :global(.login-card) > p { margin: 0 0 1.9375rem; color: #747c75; font-size: 0.8125rem; }
:where(.scope) :global(.login-field) { margin-top: 1.0625rem; display: flex; flex-direction: column; gap: 0.5rem; color: #929a93; font-size: 0.6875rem; }
:where(.scope) :global(.login-field) > div { height: 3.5rem; padding: 0 1rem; display: flex; align-items: center; gap: 0.75rem; border: 0.0625rem solid #303532; border-radius: 0.75rem; background: #111412; color: #6f7771; }
:where(.scope) :global(.login-field) > div:focus-within { border-color: #a55d28; box-shadow: 0 0 0 0.1875rem rgba(255,155,69,.07); }
:where(.scope) :global(.login-field) input { width: 100%; height: 100%; border: 0; outline: 0; background: transparent; color: #d8ddd9; font: inherit; font-size: 0.8125rem; }
:where(.scope) :global(.login-field) :is(input, select):focus,
:where(.scope) :global(.login-field) :is(input, select):focus-visible { outline: none; }
:where(.scope) :global(.login-submit) { width: 100%; height: 3.5rem; padding: 0 1.125rem; display: flex; align-items: center; justify-content: center; gap: 0.6875rem; border: 0.0625rem solid #ffc184; border-radius: 0.8125rem; background: var(--lime); color: #21150c; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
:where(.scope) :global(.login-register-link) { width:100%; margin-top:1.0625rem; border:0; background:transparent; color:#747c75; font-size: 0.625rem; cursor:pointer }:where(.scope) :global(.login-register-link) strong { margin-left:0.25rem;color:var(--lime);font-weight:650 }

@media (max-width: 73.75rem) {
  :global(.login-page):where(.scope) { grid-template-columns: .9fr 1.1fr; }:where(.scope) :global(.login-showcase) { padding: 2.125rem; }:where(.scope) :global(.login-panel) { padding-left: 6vw; padding-right: 6vw; }
}
@media (max-width: 51.25rem) {
  :global(.login-page):where(.scope) { grid-template-columns: 1fr; }:where(.scope) :global(.login-showcase) { display:none; }:where(.scope) :global(.login-panel) { padding: 5.9375rem 1.375rem 3.125rem; }:where(.scope) :global(.login-back) { top: 1.75rem; }:where(.scope) :global(.login-card) { max-width: 33.75rem; }
}
@media (max-width: 35rem) {
  :where(.scope) :global(.login-card) h2{font-size: 2.875rem}
}
:where(.scope) :global(.auth-toolbar) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; margin-bottom: 2.5rem; }
:where(.scope) :global(.auth-toolbar) :global(.login-back) { position: static; }
:where(.scope) :global(.login-panel):has(:global(.auth-toolbar)) { padding-top: 2rem; }

:global([data-theme="light"]) :global(.login-page):where(.scope) { background: #f7f4f0; }
:global([data-theme="light"]) :where(.scope) :global(.login-showcase) { border-color: var(--line); background: radial-gradient(circle at 70% 48%,rgba(223,116,30,.2),transparent 29%),linear-gradient(145deg,#f1e9e1,#faf9f7 72%); }
:global([data-theme="light"]) :where(.scope) :global(.login-showcase):before { background: repeating-linear-gradient(0deg,transparent 0,transparent 4.3125rem,rgba(24,32,25,.045) 4.375rem),repeating-linear-gradient(90deg,transparent 0,transparent 4.3125rem,rgba(24,32,25,.045) 4.375rem); }
:global([data-theme="light"]) :where(.scope) :global(.login-panel) { background: #fafbf8; }
:global([data-theme="light"]) :where(.scope) :global(.login-showcase-footer) { color: #746b64; }
:global([data-theme="light"]) :where(.scope) :global(.login-field)>div:focus-within { border-color: #c86b27; box-shadow: 0 0 0 0.1875rem rgba(223,116,30,.12); }
:global([data-theme="light"]) :where(.scope) :global(.login-back), :global([data-theme="light"]) :where(.scope) :global(.login-showcase-copy) p, :global([data-theme="light"]) :where(.scope) :global(.login-card)>p { color: #667066; }
:global([data-theme="light"]) :where(.scope) :global(.login-field) { color: #4f5a50; }
:global([data-theme="light"]) :where(.scope) :global(.login-field)>div { border-color: #d2d8ce; background: #fff; color: #717b72; }
:global([data-theme="light"]) :where(.scope) :global(.login-field) input { color: #1b241c; }
:global([data-theme="light"]) :where(.scope) :global(.login-field) input::placeholder { color: #9aa29a; }
```

src/features/workspace/workspace.module.css

```css
/* Locally owned styles; legacy descendant class contracts are intentionally preserved. */
:where(.scope) :global(.topbar.workspace-navbar) { height: 64px; padding: 0 clamp(1rem, 2.5vw, 2.5rem); gap: 16px; background: var(--bg); backdrop-filter: none; }
:where(.scope) :global(.workspace-navbar-environment) { min-width: 0; color: var(--muted); font-size: .8125rem; }
:where(.scope) :global(.workspace-navbar-brand) { display: none; }
:where(.scope) :global(.workspace-navbar-actions) { display: flex; align-items: center; flex-shrink: 0; gap: 16px; margin-left: auto; }
@media (max-width: 56.25rem) {
  :where(.scope) :global(.topbar.workspace-navbar) { height: 72px; }
  :where(.scope) :global(.workspace-navbar-environment) { display: none; }
  :where(.scope) :global(.workspace-navbar-brand) { display: block; min-width: 0; }
  :where(.scope) :global(.workspace-navbar-brand) :global(.brand) { padding: 0; }
  :where(.scope) :global(.workspace-navbar-actions) { gap: 8px; }
  :where(.scope) :global(.workspace-navbar-actions) :global(.mobile-navigation) { width: 44px; height: 44px; flex-shrink: 0; }
  :where(.scope) :global(.integrated-sidebar) :global(.sidebar-footer) { display: flex; }
}
:global(.app-shell):where(.scope) { min-height: 100vh; background: radial-gradient(circle at 88% -10%, rgba(255,155,69,.07), transparent 28%), var(--bg); }
:where(.scope) :global(.sidebar) { position: fixed; inset: 0 auto 0 0; z-index: 20; width: 15.25rem; padding: 1.625rem 1.125rem 1.25rem; display: flex; flex-direction: column; border-right: 0.0625rem solid var(--line); background: rgba(12,14,14,.97); }
:where(.scope) :global(.nav-list) { display: flex; flex-direction: column; gap: 0.3125rem; }
:where(.scope) :global(.nav-list) a { text-decoration: none; }
:where(.scope) :global(.nav-list) a:focus-visible { outline: 0.125rem solid var(--lime); outline-offset: 0.125rem; }
:where(.scope) :global(.nav-label) { padding: 0 0.75rem 0.6875rem; color: #59605c; font-size: 0.5625rem; font-weight: 700; letter-spacing: .2em; }
:where(.scope) :global(.nav-list) :is(button, a) { width: 100%; height: 2.6875rem; padding: 0 0.6875rem; display: grid; grid-template-columns: 1.875rem 1fr auto; align-items: center; gap: 0.3125rem; border: 0.0625rem solid transparent; border-radius: 0.6875rem; background: transparent; color: #89908c; text-align: left; font-size: 0.8125rem; cursor: pointer; transition: .2s ease; }
:where(.scope) :global(.nav-list) :is(button, a):hover { color: #d9ddd8; background: #151817; }
:where(.scope) :global(.nav-list) :is(button, a):global(.active) { color: var(--text); border-color: #343835; background: linear-gradient(90deg, #242824, #1a1d1b); font-weight: 700; }
:where(.scope) :global(.nav-list) :is(button, a):global(.active) :global(.nav-icon) { color: var(--lime); background: #352820; }
:where(.scope) :global(.nav-icon) { width: 1.75rem; height: 1.75rem; display: grid; place-items: center; border-radius: 0.5rem; }
:where(.scope) :global(.nav-list) em { min-width: 1.375rem; height: 1.25rem; padding: 0 0.375rem; display: grid; place-items: center; border-radius: 0.5625rem; background: #272b28; color: #b9c0bb; font-size: 0.625rem; font-style: normal; }
:where(.scope) :global(.sidebar-footer) { margin-top: auto; padding: 1.0625rem 0.4375rem 0.0625rem; display: grid; grid-template-columns: 2.375rem 1fr 1.5rem; align-items: center; border-top: 0.0625rem solid var(--line); }
:where(.scope) :global(.sidebar-footer) :global(.avatar) { width: 2rem; height: 2rem; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(140deg, #464d49, #242825); color: var(--lime); font-size: 0.625rem; font-weight: 700; }
:where(.scope) :global(.sidebar-footer) > div:nth-child(2) { min-width: 0; display: flex; flex-direction: column; }
:where(.scope) :global(.sidebar-footer) strong { overflow: hidden; color: #dfe2de; font-size: 0.6875rem; text-overflow: ellipsis; white-space: nowrap; }
:where(.scope) :global(.sidebar-footer) span { color: #636a66; font-size: 0.5625rem; }
:where(.scope) :global(.sidebar-footer) button { border: 0; background: transparent; color: #686f6a; cursor: pointer; }

:where(.scope) :global(.app-stage) { min-height: 100vh; margin-left: 15.25rem; }
:where(.scope) :global(.topbar) { height: 4.75rem; padding: 0 1.75rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.0625rem solid var(--line); background: rgba(10,11,11,.83); backdrop-filter: blur(1.125rem); position: sticky; top: 0; z-index: 15; }
:where(.scope) :global(.status-ribbon) { display: flex; gap: 0.5625rem; align-items: center; }
:where(.scope) :global(.status-ribbon) > span { padding: 0.4375rem 0.625rem; border: 0.0625rem solid var(--line-soft); border-radius: 0.5625rem; color: #747b77; background: #101211; font-size: 0.625rem; }
:where(.scope) :global(.status-ribbon) > span:first-child { color: #aab0ab; }
:where(.scope) :global(.search) { height: 2.375rem; display: flex; align-items: center; gap: 0.5625rem; padding: 0 0.75rem; border: 0.0625rem solid var(--line); border-radius: 0.625rem; background: #101212; color: #68706b; }
:where(.scope) :global(.search) { width: 17.75rem; }
:where(.scope) :global(.search) input { width: 100%; border: 0; outline: 0; background: transparent; color: #dce0dc; font-size: 0.6875rem; }
:where(.scope) :global(.search) input::placeholder { color: #5f6662; }
:where(.scope) :global(.icon-button) { position: relative; width: 2.375rem; height: 2.375rem; display: grid; place-items: center; border: 0.0625rem solid var(--line); border-radius: 0.625rem; background: #121414; color: #949b96; cursor: pointer; }
:where(.scope) :global(.icon-button) > span { position: absolute; top: 0.5rem; right: 0.5rem; width: 0.3125rem; height: 0.3125rem; border-radius: 50%; background: var(--lime); }

:global(.page-content):where(.scope) { max-width: 96.25rem; margin: 0 auto; padding: 2.25rem 2rem 3.75rem; }
:where(.scope) :global(.page-heading) { min-height: 4.625rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.625rem; }
:where(.scope) :global(.page-heading) h1 { margin: 0; font-size: clamp(1.625rem, 2.35vw, 2.375rem); line-height: 1.15; letter-spacing: -.045em; }
:where(.scope) :global(.page-heading) p { margin: 0.4375rem 0 0; color: var(--muted); font-size: 0.75rem; }
:where(.scope) :global(.panel) { position: relative; border: 0.0625rem solid var(--line); border-radius: 0.9375rem; background: linear-gradient(145deg, #141616, #101212); }
:where(.scope) :global(.progress) { display: grid; grid-template-columns: 1fr 1.5625rem; align-items: center; gap: 0.375rem; }
:where(.scope) :global(.progress) > div { height: 0.1875rem; overflow: hidden; border-radius: 0.3125rem; background: #2b2f2c; }
:where(.scope) :global(.progress) i { display: block; height: 100%; border-radius: inherit; background: var(--lime); }
:where(.scope) :global(.progress) span { color: #777e79; font-size: 0.5rem; }

:where(.scope) :global(.workspace-stats) { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8125rem; margin-bottom: 0.8125rem; }
:where(.scope) :global(.workspace-stats) article { min-height: 7rem; padding: 1rem 1.125rem; display: flex; flex-direction: column; border: 0.0625rem solid var(--line); border-radius: 0.875rem; background: var(--surface); }
:where(.scope) :global(.workspace-stats) span { color: #777e79; font-size: 0.625rem; }:where(.scope) :global(.workspace-stats) strong { margin-top: 0.4375rem; font-size: 1.5rem; letter-spacing: -.04em; }:where(.scope) :global(.workspace-stats) small { margin-top: auto; color: #5e6561; font-size: 0.5rem; }
:where(.scope) :global(.data-row):not(:global(.data-head)):hover { background: #171a18; }:where(.scope) :global(.status-pill) { padding: 0.375rem 0.5625rem; border-radius: 0.5rem; background: #2a211a; color: var(--lime); font-size: 0.5625rem; }:where(.scope) :global(.upload){height:2.625rem;padding:0 0.75rem;display:flex;flex-direction:column;justify-content:center;border:0.0625rem dashed #3a3f3c;border-radius:0.625rem;background:#0d0f0f;color:#a0a6a2}:where(.scope) :global(.upload) small{color:#59605c;font-size: 0.4375rem}
:where(.scope) :global(.sidebar) { width: 17rem; padding: 1.875rem 1.375rem 1.5rem; }
:where(.scope) :global(.nav-list) { gap: 0.4375rem; }:where(.scope) :global(.nav-list) :is(button, a) { height: 3.0625rem; font-size: 0.875rem; }:where(.scope) :global(.nav-icon) { width: 2rem; height: 2rem; }
:where(.scope) :global(.app-stage) { margin-left: 17rem; }:where(.scope) :global(.topbar) { height: 5.25rem; padding: 0 2.25rem; }:where(.scope) :global(.status-ribbon) > span { padding: 0.5rem 0.75rem; font-size: 0.6875rem; }
:where(.scope) :global(.search) { width: 20.625rem; }:where(.scope) :global(.search), :where(.scope) :global(.icon-button) { height: 2.6875rem; }
:global(.page-content):where(.scope) { max-width: 105rem; padding: 3rem 2.75rem 4.75rem; }:where(.scope) :global(.page-heading) { min-height: 5.375rem; margin-bottom: 1.9375rem; }:where(.scope) :global(.page-heading) h1 { font-size: clamp(2.25rem,3vw,3rem); font-weight: 680; }:where(.scope) :global(.page-heading) p { margin-top: 0.625rem; font-size: 0.875rem; }:where(.scope) :global(.panel) { border-radius: 1.125rem; }:where(.scope) :global(.progress) span { font-size: 0.5625rem; }
:where(.scope) :global(.workspace-stats) { gap: 1rem; margin-bottom: 1rem; }:where(.scope) :global(.workspace-stats) article { min-height: 8.75rem; padding: 1.3125rem; }:where(.scope) :global(.workspace-stats) span { font-size: 0.75rem; }:where(.scope) :global(.workspace-stats) strong { font-size: 2rem; }:where(.scope) :global(.workspace-stats) small { font-size: 0.5625rem; }
:where(.scope) :global(.machine-orbit) { position: absolute; border: 0.0625rem solid rgba(255,155,69,.15); border-radius: 50%; }:where(.scope) :global(.orbit-one) { width: 33.75rem; height: 33.75rem; }:where(.scope) :global(.orbit-two) { width: 26.875rem; height: 26.875rem; border-color: rgba(255,255,255,.06); }
:where(.scope) :global(.machine-core) { position:absolute; width:11.875rem; height:11.875rem; border:0.0625rem solid #4d3b2f; border-radius:50%; background:radial-gradient(circle at 42% 38%,#72513a 0,#2d2119 16%,#121512 42%,#090b0a 70%); box-shadow:0 0 0 1.75rem rgba(255,255,255,.012),0 0 5rem rgba(255,155,69,.12); }:where(.scope) :global(.machine-core):before, :where(.scope) :global(.machine-core):after{content:"";position:absolute;inset:1.6875rem;border:0.0625rem dashed #74543d;border-radius:50%}:where(.scope) :global(.machine-core):after{inset:3.8125rem;border-style:solid;background:#090b0a}:where(.scope) :global(.machine-core) span, :where(.scope) :global(.machine-core) i{position:absolute;z-index:2;top:5.75rem;left:-1.375rem;width:14.625rem;height:0.3125rem;border-radius:0.5625rem;background:linear-gradient(90deg,transparent,#bd6d31,var(--lime),#bd6d31,transparent);transform:rotate(45deg)}:where(.scope) :global(.machine-core) i{transform:rotate(-45deg)}

@media (max-width: 70rem) { :where(.scope) :global(.sidebar) { width: 12.875rem; }:where(.scope) :global(.app-stage) { margin-left:12.875rem }:where(.scope) :global(.search) { width:13.75rem }:where(.scope) :global(.status-ribbon) span:nth-child(n+2){display:none} }
@media (max-width: 56.25rem) { :where(.scope) :global(.sidebar) { position:relative; width:100%; height:auto; min-height:0; padding:1rem; border-right:0; border-bottom:0.0625rem solid var(--line) }:where(.scope) :global(.nav-list){margin-top:1rem;display:grid;grid-template-columns:repeat(4,minmax(7.5rem,1fr));overflow-x:auto;padding-bottom:0.25rem}:where(.scope) :global(.nav-label), :where(.scope) :global(.sidebar-footer){display:none}:where(.scope) :global(.nav-list) :is(button, a){min-width:7.5rem}:where(.scope) :global(.app-stage){margin-left:0}:where(.scope) :global(.topbar){height:4rem;padding:0 1rem}:where(.scope) :global(.status-ribbon){display:none}:where(.scope) :global(.search){width:auto;flex:1}:global(.page-content):where(.scope){padding:1.5625rem 1rem 2.8125rem}:where(.scope) :global(.page-heading){min-height:0}:where(.scope) :global(.page-heading) h1{font-size: 1.75rem}:where(.scope) :global(.workspace-stats){grid-template-columns:1fr} }
@media (max-width: 30rem) {:where(.scope) :global(.page-heading){flex-direction:column}:where(.scope) :global(.workspace-stats){grid-template-columns:1fr} }
@media (max-width: 47.5rem) {:where(.scope) :global(.machine-orbit):global(.orbit-one) { width: 24.375rem; height: 24.375rem; }:where(.scope) :global(.machine-orbit):global(.orbit-two) { width: 19.375rem; height: 19.375rem; }:where(.scope) :global(.machine-core) { width: 9.0625rem; height: 9.0625rem; }:where(.scope) :global(.machine-core):before{inset:1.375rem}:where(.scope) :global(.machine-core):after{inset:3rem}:where(.scope) :global(.machine-core) span, :where(.scope) :global(.machine-core) i{top:4.375rem;left:-0.875rem;width:10.75rem}
}
@media (max-width: 30rem) {:where(.scope) :global(.machine-orbit):global(.orbit-one){width:20.625rem;height:20.625rem}:where(.scope) :global(.machine-orbit):global(.orbit-two){width:16.25rem;height:16.25rem}
}
:where(.scope) :global(.staff-space) { margin: 1.875rem 0 1.375rem; padding: 0.875rem 0.9375rem; display: flex; flex-direction: column; gap: 0.25rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: #111412; }
:where(.scope) :global(.staff-space) span { color: var(--lime); font-size: 0.5rem; font-weight: 700; letter-spacing: .16em; }
:where(.scope) :global(.staff-space) strong { color: #9ca39d; font-size: 0.75rem; font-weight: 700; }
:where(.scope) :global(.sidebar) :global(.nav-list) :is(button, a):not(:global(.active)) { font-weight: 600; }
:global(.app-shell):where(.scope) :is(h1, h2), :where(.scope) :global(.customer-portal) :is(h1, h2) { font-weight: 700; }
@media (max-width: 51.25rem) {:where(.scope) :global(.staff-space){display:none}
}
@media (min-width: 56.251rem) {
  :where(.scope) :global(.sidebar) {
    height: 100dvh;
    min-height: 0;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    overflow: hidden;
  }
  :where(.scope) :global(.sidebar) > :global(.staff-space), :where(.scope) :global(.sidebar) > :global(.sidebar-footer) {
    flex-shrink: 0;
  }
  :where(.scope) :global(.sidebar) > :global(.nav-list) {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
    padding: 0.1875rem 0.375rem 0.75rem 0.1875rem;
    mask-image: linear-gradient(to bottom, transparent 0, #000 0.5rem, #000 calc(100% - 0.75rem), transparent 100%);
  }
  :where(.scope) :global(.sidebar) > :global(.nav-list) > * { flex-shrink: 0; }
  :where(.scope) :global(.sidebar) > :global(.sidebar-footer) {
    margin-top: 0;
    background: inherit;
  }
}
:global([data-theme="light"]) :where(.scope) :global(.machine-orbit) { border-color: rgba(201,97,21,.24); }
:global([data-theme="light"]) :where(.scope) :global(.machine-orbit):global(.orbit-two) { border-color: rgba(24,32,25,.09); }
:global([data-theme="light"]) :where(.scope) :global(.machine-core) { border-color: #dfc4ae; background: radial-gradient(circle at 42% 38%,#fff 0,#f7e6d7 28%,#eee1d5 70%); box-shadow: 0 0 0 1.75rem rgba(223,116,30,.025),0 0 5rem rgba(223,116,30,.08); }
:global([data-theme="light"]) :where(.scope) :global(.machine-core):before { border-color: #cba17e; }
:global([data-theme="light"]) :where(.scope) :global(.machine-core):after { border-color: #d4b699; background: #faf3ec; }

:global([data-theme="light"]) :global(.app-shell):where(.scope) { background: radial-gradient(circle at 88% -10%,rgba(223,116,30,.13),transparent 30%),var(--bg); }
:global([data-theme="light"]) :where(.scope) :global(.sidebar) { border-color: var(--line); background: var(--bg); }
:global([data-theme="light"]) :where(.scope) :global(.staff-space), :global([data-theme="light"]) :where(.scope) :global(.status-ribbon)>span, :global([data-theme="light"]) :where(.scope) :global(.search), :global([data-theme="light"]) :where(.scope) :global(.icon-button) { border-color: var(--line); background: #fff; color: #5f695f; }
:global([data-theme="light"]) :where(.scope) :global(.staff-space) strong, :global([data-theme="light"]) :where(.scope) :global(.status-ribbon)>span:first-child { color: #4d574e; }
:global([data-theme="light"]) :where(.scope) :global(.topbar) { border-color: var(--line); background: var(--bg); }
:global([data-theme="light"]) :where(.scope) :global(.search) input { color: #202921; }
:global([data-theme="light"]) :where(.scope) :global(.search) input::placeholder { color: #8b948b; }
:global([data-theme="light"]) :where(.scope) :global(.nav-list) :is(button, a) { color: #5f695f; }
:global([data-theme="light"]) :where(.scope) :global(.nav-list) :is(button, a):hover { color: #263027; background: #eef1e9; }
:global([data-theme="light"]) :where(.scope) :global(.nav-list) :is(button, a):global(.active) { border-color: #edc7a8; color: #482d1a; background: linear-gradient(90deg,#ffead8,#fff6ee); }
:global([data-theme="light"]) :where(.scope) :global(.nav-list) :is(button, a):global(.active) :global(.nav-icon) { background: #f8d9bf; color: #a64c0d; }
:global([data-theme="light"]) :where(.scope) :global(.sidebar-footer) :global(.avatar) { background: #ffead8; color: #a64c0d; }
:global([data-theme="light"]) :where(.scope) :global(.nav-list) em { background: #e3e8de; color: #566057; }
:global([data-theme="light"]) :where(.scope) :global(.sidebar-footer) strong { color: #364037; }
:global([data-theme="light"]) :where(.scope) :global(.sidebar-footer) span, :global([data-theme="light"]) :where(.scope) :global(.sidebar-footer) button, :global([data-theme="light"]) :where(.scope) :global(.nav-label) { color: #727c73; }
:global([data-theme="light"]) :where(.scope) :global(.panel), :global([data-theme="light"]) :where(.scope) :global(.workspace-stats) article { border-color: var(--line); background: linear-gradient(145deg,#fff,#f5f7f2); box-shadow: 0 0.9375rem 2.625rem rgba(45,56,40,.05); }
:global([data-theme="light"]) :where(.scope) :global(.workspace-stats) span { color: #606b61; }
:global([data-theme="light"]) :where(.scope) :global(.workspace-stats) small { color: #737d74; }
:global([data-theme="light"]) :where(.scope) :global(.progress) div { border-color: var(--line); background: #e7eae4; }
:global([data-theme="light"]) :where(.scope) :global(.data-row):not(:global(.data-head)):hover { background: #f3f5f0; }
:global([data-theme="light"]) :where(.scope) :global(.status-pill) { background: #ffeadb; color: #a64c0d !important; }
:global([data-theme="light"]) :where(.scope) :global(.upload) { border-color: var(--line); background: #f7f8f4; color: #263027; }

/* Grouped Thai sidebar (workflow stages; Admin-only section separated). */
:where(.scope) :global(.nav-group) { display: flex; flex-direction: column; gap: inherit; margin-top: 0.75rem; }
:where(.scope) :global(.nav-group-label) { padding: 0 0.75rem 0.25rem; color: var(--muted); font-size: 0.75rem; font-weight: 650; letter-spacing: 0; }
:where(.scope) :global(.nav-group-admin) { margin-top: 1rem; padding-top: 0.875rem; border-top: 0.0625rem solid var(--line); }
:where(.scope) :global(.staff-space) span { font-size: 0.75rem; letter-spacing: 0; }
@media (max-width: 56.25rem) {
  :where(.scope) :global(.integrated-sidebar) :global(.nav-list) { display: flex; flex-direction: column; overflow-x: visible; }
}

/* Navbar bell with unread count and dropdown (same pattern as the Customer navbar). */
:where(.scope) :global(.workspace-bell) { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 10px; background: transparent; color: var(--text); cursor: pointer; }
:where(.scope) :global(.workspace-bell):hover { background: var(--surface-2); }
:where(.scope) :global(.workspace-bell):focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }
:where(.scope) :global(.workspace-bell) > span { position: absolute; top: 4px; right: 2px; min-width: 18px; height: 18px; padding: 0 5px; display: grid; place-items: center; border-radius: 999px; background: var(--lime); color: #160e08; font-size: 0.6875rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }
:where(.scope) :global(.workspace-bell-dialog) { position: fixed; inset: 72px clamp(1rem, 2.5vw, 2.5rem) auto auto; margin: 0; width: min(25rem, calc(100vw - 2rem)); max-height: min(36rem, calc(100dvh - 6rem)); padding: 0; overflow: auto; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--text); box-shadow: 0 24px 64px rgba(0, 0, 0, .35); }
:where(.scope) :global(.workspace-bell-dialog)::backdrop { background: rgba(0, 0, 0, .25); }
:where(.scope) :global(.workspace-bell-dialog) > section { display: grid; }
:where(.scope) :global(.workspace-bell-dialog) header { position: sticky; top: 0; display: flex; align-items: center; gap: 8px; padding: 12px 12px 12px 20px; border-bottom: 1px solid var(--line); background: var(--surface); }
:where(.scope) :global(.workspace-bell-dialog) h2 { margin: 0 auto 0 0; font-size: 1.0625rem; }
:where(.scope) :global(.workspace-bell-text) { min-height: 44px; padding: 0 8px; border: 0; background: transparent; color: var(--lime); font: inherit; font-size: 0.875rem; cursor: pointer; }
:where(.scope) :global(.workspace-bell-text):disabled { color: var(--muted); cursor: default; }
:where(.scope) :global(.workspace-bell-close) { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 10px; background: transparent; color: var(--text); cursor: pointer; }
:where(.scope) :global(.workspace-bell-note) { margin: 0; padding: 16px 20px; color: var(--muted); font-size: 0.875rem; }
:where(.scope) :global(.workspace-bell-dialog) ol { margin: 0; padding: 0; list-style: none; }
:where(.scope) :global(.workspace-bell-dialog) li { position: relative; border-bottom: 1px solid var(--line); }
:where(.scope) :global(.workspace-bell-dialog) li[data-unread] { background: color-mix(in srgb, var(--lime) 7%, var(--surface)); }
:where(.scope) :global(.workspace-bell-dialog) li > a { display: grid; gap: 4px; min-height: 56px; padding: 12px 40px 12px 20px; color: var(--text); text-decoration: none; }
:where(.scope) :global(.workspace-bell-dialog) li > a:hover { background: var(--surface-2); }
:where(.scope) :global(.workspace-bell-dialog) li > a:focus-visible { outline: 2px solid var(--lime); outline-offset: -2px; }
:where(.scope) :global(.workspace-bell-dialog) li strong { font-size: 0.9375rem; font-weight: 600; }
:where(.scope) :global(.workspace-bell-dialog) li span:not(.workspace-bell-dot) { color: var(--muted); font-size: 0.8125rem; }
:where(.scope) :global(.workspace-bell-dot) { position: absolute; top: 50%; right: 18px; width: 8px; height: 8px; margin-top: -4px; border-radius: 50%; background: var(--lime); }
:where(.scope) :global(.workspace-bell-all) { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 52px; color: var(--lime); text-decoration: none; font-weight: 600; font-size: 0.9375rem; }
:global([data-theme="light"]) :where(.scope) :is(:global(.workspace-bell-text), :global(.workspace-bell-all)) { color: var(--lime-soft); }
@media (max-width: 43.75rem) {
  :where(.scope) :global(.workspace-bell-dialog) { inset: 0; width: 100%; max-width: 100%; height: 100dvh; max-height: 100dvh; border: 0; border-radius: 0; }
}
/* Thai stage eyebrow above the page title: no tracking, readable size. */
:where(.scope) :global(.page-heading) :global(.eyebrow) { color: var(--muted); font-size: 0.8125rem; font-weight: 650; letter-spacing: 0; }
```

### A2. Shared workflow styles — src/components/ui/workflows.module.css

```css
/* Shared UC forms, derived from develop and adapted to the design tokens. */
/* Customer demo workflows (UC1, UC3, UC4, UC9). */
:where(.scope) :global(.workflow-toolbar) { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.125rem; }
:where(.scope) :global(.workflow-toolbar) > p { color: var(--muted); font-size: 0.75rem; line-height: 1.6; }
:where(.scope) :global(.workflow-success) { padding: 0.9375rem 1.125rem; background: var(--surface-2); border: 0.0625rem solid var(--line); color: var(--text); border-radius: 0.5rem; font-size: 0.75rem; line-height: 1.7; margin-bottom: 1.125rem; overflow-wrap: anywhere; }
:where(.scope) :global(.field-error) { font-size: 0.75rem; color: var(--text); background: var(--surface-2); border: 0.0625rem solid var(--line); padding: 0.75rem; border-radius: 0.4375rem; margin: 0.625rem 0; line-height: 1.7; }
:where(.scope) :global(.record-layout) { display: grid; grid-template-columns: minmax(12.5rem, 31%) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
:where(.scope) :global(.record-list) { display: grid; gap: 0.625rem; }
:where(.scope) :global(.record-list-item) { min-width: 0; width: 100%; text-align: left; display: grid; gap: 0.75rem; padding: 1.0625rem; border: 0.0625rem solid var(--border); border-radius: 0.5625rem; background: var(--surface-2); }
:where(.scope) :global(.record-list-item):hover { border-color: var(--line); }
:where(.scope) :global(.record-list-item):global(.selected) { border-color: var(--accent); box-shadow: inset 0.1875rem 0 var(--accent); background: var(--surface-2); }
:where(.scope) :global(.record-list-item) > span:first-child { font-size: 0.75rem; color: var(--text); text-transform: capitalize; }
:where(.scope) :global(.record-list-item) > strong { font-size: 0.75rem; line-height: 1.6; font-weight: 550; overflow-wrap: anywhere; }
:where(.scope) :global(.record-list-bottom) { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; align-items: center; }
:where(.scope) :global(.record-list-bottom) > span:last-child { font-size: 0.75rem; color: var(--text); }
:where(.scope) :global(.record-status) { display: inline-flex; align-items: center; border-radius: 0.3125rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 550; color: var(--text); background: var(--surface-2); width: fit-content; }
:where(.scope) :global(.status-approved), :where(.scope) :global(.status-paid), :where(.scope) :global(.status-delivered), :where(.scope) :global(.status-completed) { background: var(--surface-2); color: var(--text); }
:where(.scope) :global(.status-sent), :where(.scope) :global(.status-ongoing), :where(.scope) :global(.status-shipping) { background: var(--surface-2); color: var(--text); }
:where(.scope) :global(.status-partial), :where(.scope) :global(.status-pending) { background: var(--surface-2); color: var(--text); }
:where(.scope) :global(.status-canceled), :where(.scope) :global(.status-rejected), :where(.scope) :global(.status-returned) { background: var(--surface-2); color: var(--text); }
:where(.scope) :global(.record-detail), :where(.scope) :global(.workflow-form-panel) { background: var(--surface-2); border: 0.0625rem solid var(--border); border-radius: 0.625rem; padding: 1.5625rem; min-width: 0; }
:where(.scope) :global(.record-heading) { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.9375rem; }
:where(.scope) :global(.record-heading) h2 { font-size: 1.1875rem; line-height: 1.5; letter-spacing: -.025em; margin-top: 0.5rem; font-weight: 600; overflow-wrap: anywhere; }
:where(.scope) :global(.record-id) { font-size: 0.75rem; color: var(--text); overflow-wrap: anywhere; margin: 0.75rem 0 1.25rem; }
:where(.scope) :global(.detail-grid) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; padding: 1.125rem; border: 0.0625rem solid var(--border); border-radius: 0.5rem; background: var(--surface-2); margin: 1.25rem 0; }
:where(.scope) :global(.detail-grid) dt { font-size: 0.75rem; color: var(--text); margin-bottom: 0.375rem; }
:where(.scope) :global(.detail-grid) dd { margin: 0; font-size: 0.75rem; overflow-wrap: anywhere; }
:where(.scope) :global(.record-detail) h3 { font-size: 0.75rem; margin: 1.5rem 0 0.75rem; font-weight: 600; }
:where(.scope) :global(.attachment-list) { display: grid; gap: 0.5625rem; margin: 0.75rem 0 1.25rem; }
:where(.scope) :global(.attachment-link) { display: flex; justify-content: space-between; gap: 0.75rem; width: 100%; min-height: 2.75rem; padding: 0.6875rem 0.8125rem; background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.375rem; color: var(--text); font-size: 0.75rem; text-align: left; overflow-wrap: anywhere; margin: 0.5rem 0; }
:where(.scope) :global(.attachment-link) > span { color: var(--text); font-weight: 600; flex-shrink: 0; }
:where(.scope) :global(.price-summary) { padding: 1.4375rem; background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.5625rem; display: grid; gap: 0.625rem; }
:where(.scope) :global(.price-summary) > span { font-size: 0.75rem; color: var(--text); }
:where(.scope) :global(.price-summary) > strong { font-size: 2rem; letter-spacing: -.045em; font-weight: 600; color: var(--text); }
:where(.scope) :global(.terms-summary) { padding: 1.125rem 0; font-size: 0.75rem; line-height: 1.8; }
:where(.scope) :global(.terms-summary) > strong { font-weight: 600; }
:where(.scope) :global(.terms-summary) > p { color: var(--text); font-size: 0.75rem; margin-top: 0.375rem; }
:where(.scope) :global(.workflow-note) { font-size: 0.75rem; color: var(--text); line-height: 1.8; margin: 0.9375rem 0; }
:where(.scope) :global(.form-actions) { display: flex; gap: 0.625rem; flex-wrap: wrap; margin: 1.25rem 0; }
:where(.scope) :global(.button-danger) { background: var(--surface-2); color: var(--text); border: 0.0625rem solid var(--line); border-radius: 0.5rem; min-height: 2.875rem; padding: 0.75rem 1.125rem; font-size: 0.75rem; }
:where(.scope) button:disabled { cursor: not-allowed; opacity: .45; }
:where(.scope) :global(.revision-history) { margin-top: 1.75rem; border-top: 0.0625rem solid var(--border); padding-top: 1rem; }
:where(.scope) :global(.revision-history) summary, :where(.scope) :global(.demo-tools) summary { cursor: pointer; color: var(--text); font-size: 0.75rem; min-height: 1.875rem; }
:where(.scope) :global(.revision-history) p { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.625rem; font-size: 0.75rem; align-items: center; padding: 0.625rem 0; }
:where(.scope) :global(.workflow-form-panel) { margin-bottom: 1.375rem; }
:where(.scope) :global(.workflow-form-panel) h2 { font-size: 1.25rem; letter-spacing: -.025em; margin-bottom: 1.25rem; }
:where(.scope) :global(.form-field) { display: grid; gap: 0.5rem; color: var(--text); font-size: 0.75rem; margin-bottom: 1.1875rem; }
:where(.scope) :global(.form-field) input, :where(.scope) :global(.form-field) textarea, :where(.scope) :global(.form-field) select { width: 100%; min-width: 0; background: var(--surface-2); color: var(--foreground); border: 0.0625rem solid var(--line); border-radius: 0.4375rem; padding: 0.75rem; min-height: 2.8125rem; font-size: 0.875rem; }
:where(.scope) :global(.form-field) textarea { resize: vertical; line-height: 1.7; }
:where(.scope) :global(.file-picker) { padding: 0.9375rem; border: 0.0625rem dashed var(--line); background: var(--surface-2); border-radius: 0.5rem; margin-bottom: 1rem; }
:where(.scope) :global(.file-picker) label { display: grid; gap: 0.75rem; font-size: 0.75rem; color: var(--text); font-weight: 550; }
:where(.scope) :global(.file-picker) input { width: 100%; min-width: 0; color: var(--text); font-size: 0.75rem; }
:where(.scope) :global(.file-picker) input::file-selector-button { background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.3125rem; padding: 0.5625rem; margin-right: 0.625rem; color: var(--text); cursor: pointer; }
:where(.scope) :global(.file-picker-hint) { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.625rem; margin-top: 0.75rem; align-items: center; }
:where(.scope) :global(.file-picker-hint) > span { font-size: 0.75rem; color: var(--text); line-height: 1.7; }
:where(.scope) :global(.text-action) { color: var(--text); background: transparent; border: 0; padding: 0.3125rem 0; font-size: 0.75rem; text-decoration: underline; text-underline-offset: 0.1875rem; }
:where(.scope) :global(.text-action), :where(.scope) :global(.revision-history) summary, :where(.scope) :global(.demo-tools) summary { min-height: 2.75rem; }
:where(.scope) :global(.file-picker)[aria-busy="true"] { border-style: solid; }
@media (max-width: 47.5rem) { :where(.scope) :global(.form-field) input, :where(.scope) :global(.form-field) textarea, :where(.scope) :global(.form-field) select { font-size: 1rem; } :where(.scope) :global(.file-picker) input::file-selector-button { min-height: 2.75rem; } }
:where(.scope) :global(.confirmation-files) { display: grid; gap: 1rem; margin-bottom: 1.25rem; }
:where(.scope) :global(.balance-strip) { background: var(--surface-2); border: 0.0625rem solid var(--border); border-radius: 0.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.9375rem; padding: 1.25rem; margin: 1.375rem 0; }
:where(.scope) :global(.balance-strip) span { display: block; font-size: 0.75rem; color: var(--text); margin-bottom: 0.4375rem; }
:where(.scope) :global(.balance-strip) strong { font-size: 1.3125rem; color: var(--text); letter-spacing: -.03em; }
:where(.scope) :global(.payment-history) { list-style: none; padding: 0; margin: 0; }
:where(.scope) :global(.payment-history) li { display: flex; justify-content: space-between; gap: 0.75rem; border-bottom: 0.0625rem solid var(--border); padding: 0.75rem 0; font-size: 0.75rem; color: var(--text); }
:where(.scope) :global(.payment-history) strong { color: var(--text); }
:where(.scope) :global(.payment-form) { padding: 1.125rem; border: 0.0625rem solid var(--line); border-radius: 0.5rem; }
:where(.scope) :global(.demo-tools) { border-top: 0.0625rem solid var(--border); margin-top: 1.75rem; padding-top: 1.125rem; }
:where(.scope) :global(.demo-tools) p { font-size: 0.75rem; line-height: 1.7; color: var(--text); margin: 0.625rem 0; }
:where(.scope) :global(.demo-tools) button { margin: 0.5rem 0.625rem 0 0; font-size: 0.75rem; }
:where(.scope) :global(.customer-dialog) { width: min(40rem, calc(100vw - 2rem)); max-height: calc(100svh - 2.5rem); overflow-y: auto; background: var(--surface-2); color: var(--foreground); border: 0.0625rem solid var(--line); border-radius: 0.75rem; padding: 1.5625rem; margin: auto; box-shadow: 0 1.25rem 5rem #00000033; }
:where(.scope) :global(.customer-dialog)::backdrop { background: var(--surface-2); }
:where(.scope) :global(.worker-form-grid) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 1.125rem; margin-top: 1.375rem; }
:where(.scope) :global(.stock-cards) { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
:where(.scope) :global(.stock-card) { padding: 1rem; border: 0.0625rem solid var(--border); border-radius: 0.5rem; min-width: 0; }
:where(.scope) :global(.stock-card) h3, :where(.scope) :global(.supplier-order) h3, :where(.scope) :global(.worker-workflow) h3 { font-size: 0.8125rem; font-weight: 600; line-height: 1.6; margin: 0.875rem 0; }
:where(.scope) :global(.stock-card) :global(.detail-grid) { padding: 0; background: transparent; border: 0; margin-bottom: 0; }
:where(.scope) :global(.table-scroll) { width: 100%; min-width: 0; overflow-x: auto; margin: 1.25rem 0; border: 0.0625rem solid var(--border); border-radius: 0.5rem; }
:where(.scope) :global(.workflow-table) { width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left; }
:where(.scope) :global(.workflow-table) th, :where(.scope) :global(.workflow-table) td { padding: 0.875rem; border-bottom: 0.0625rem solid var(--border); white-space: nowrap; }
:where(.scope) :global(.workflow-table) thead { background: var(--surface-2); color: var(--text); }
:where(.scope) :global(.workflow-table) tbody th { font-weight: 500; }
:where(.scope) :global(.worker-history-row) { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.875rem 0; border-bottom: 0.0625rem solid var(--border); font-size: 0.75rem; overflow-wrap: anywhere; }
:where(.scope) :global(.worker-history-row) > span { min-width: 0; }
:where(.scope) :global(.worker-history-row) small { display: block; font-size: 0.75rem; color: var(--text); margin-top: 0.4375rem; line-height: 1.7; overflow-wrap: anywhere; }
:where(.scope) :global(.supplier-order) { border: 0.0625rem solid var(--border); padding: 1.125rem; border-radius: 0.5rem; margin-bottom: 1.125rem; }
:where(.scope) :global(.supplier-order) :global(.button-danger) { margin-top: 1rem; }
:where(.scope) :global(.worker-ledger) { max-height: 25rem; overflow-y: auto; }
:where(.scope) :global(.admin-toolbar-actions) { display: flex; flex-wrap: wrap; gap: 0.625rem; }
:where(.scope) :global(.admin-filters) { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 1.125rem; }
:where(.scope) :global(.admin-boundary) { background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.5rem; padding: 1rem; }
:where(.scope) :global(.worker-contact) { overflow-wrap: anywhere; }
:where(.scope) :global(.status-active) { background: var(--surface-2); color: var(--text); }
:where(.scope) :global(.status-inactive) { background: var(--surface-2); color: var(--text); }
@media (max-width: 37.5rem) { :where(.scope) :global(.admin-filters) { grid-template-columns: 1fr; gap: 0; } :where(.scope) :global(.admin-toolbar-actions) { width: 100%; } :where(.scope) :global(.admin-toolbar-actions) > button { flex: 1; } }
@media (max-width: 68.75rem) { :where(.scope) :global(.stock-cards) { grid-template-columns: 1fr; } }
@media (max-width: 37.5rem) { :where(.scope) :global(.worker-form-grid) { grid-template-columns: 1fr; } :where(.scope) :global(.worker-workflow) :global(.workflow-toolbar) > button { width: 100%; } :where(.scope) :global(.supplier-order) { padding: 0.8125rem; } }
:where(.scope) :global(.dialog-heading) { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.9375rem; margin-bottom: 1.25rem; }
:where(.scope) :global(.dialog-heading) h2 { font-size: 1.25rem; letter-spacing: -.025em; overflow-wrap: anywhere; }
:where(.scope) :global(.dialog-heading) > button { flex-shrink: 0; font-size: 0.75rem; }
:where(.scope) :global(.attachment-preview) { display: block; width: 100%; max-height: 55svh; object-fit: contain; margin: 1.25rem 0; }
:where(.scope) :global(.sample-document) { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text); background: var(--surface-2); padding: 1.375rem; font-size: 0.75rem; line-height: 1.8; margin: 1.25rem 0; }
@media (max-width: 68.75rem) { :where(.scope) :global(.record-layout) { grid-template-columns: 1fr; } :where(.scope) :global(.record-list) { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 37.5rem) { :where(.scope) :global(.workflow-toolbar) { flex-wrap: wrap; } :where(.scope) :global(.record-list) { grid-template-columns: 1fr; max-height: 20rem; overflow-y: auto; } :where(.scope) :global(.record-detail), :where(.scope) :global(.workflow-form-panel) { padding: 1.125rem; } :where(.scope) :global(.record-heading) { flex-wrap: wrap; } :where(.scope) :global(.record-heading) h2 { font-size: 1.125rem; } :where(.scope) :global(.detail-grid) { gap: 1rem 0.625rem; padding: 0.875rem; } :where(.scope) :global(.balance-strip) { padding: 0.9375rem; gap: 0.625rem; } :where(.scope) :global(.balance-strip) strong { font-size: 1.125rem; } :where(.scope) :global(.price-summary) > strong { font-size: 1.75rem; } :where(.scope) :global(.customer-dialog) { padding: 1.25rem; } :where(.scope) :global(.form-actions) > button { flex: 1; } }

/* Unified controls and role shells. Dimensions scale with the root rem size. */
:where(.scope) :global(.button-primary), :where(.scope) :global(.button-secondary), :where(.scope) :global(.button-danger) { display:inline-flex; align-items:center; justify-content:center; gap:.625rem; min-height:2.875rem; padding:.75rem 1.125rem; border-radius:.75rem; font:inherit; font-size:.875rem; font-weight:650; cursor:pointer; }
:where(.scope) :global(.button-primary) { background:var(--lime); border:1px solid var(--lime); color:#211509; }
:where(.scope) :global(.button-secondary) { background:var(--surface); border:1px solid var(--line); color:var(--text); }
:where(.scope) :global(.button-danger) { color:var(--danger); border-color:var(--danger); }
:where(.scope) :is(button,a,input,select,textarea,summary,[tabindex]):focus-visible { outline:2px solid var(--lime); outline-offset:3px; }
:where(.scope) button:disabled { opacity:.5; cursor:not-allowed; }
:where(.scope) :global(.form-field) :is(input,textarea,select) { font-size:1rem; color:var(--text); background:var(--surface); }
:where(.scope) :global(.form-field), :where(.scope) :global(.file-picker) label, :where(.scope) :global(.detail-grid) dt, :where(.scope) :global(.record-id), :where(.scope) :global(.workflow-note), :where(.scope) :global(.workflow-toolbar)>p, :where(.scope) :global(.record-list-item)>span:first-child { color:var(--muted); }
:where(.scope) :global(.record-detail), :where(.scope) :global(.workflow-form-panel), :where(.scope) :global(.record-list-item) { background:var(--surface); border-radius:1rem; }
:where(.scope) :global(.record-list-item):global(.selected) { background:color-mix(in srgb,var(--lime) 10%,var(--surface)); }
:where(.scope) :global(.record-heading) h2, :where(.scope) :global(.workflow-form-panel) h2 { font-size:1.375rem; font-weight:700; }
:where(.scope) :global(.record-detail) h3 { font-size:1rem; }
:where(.scope) :global(.record-list-item)>strong { font-size:.9375rem; font-weight:650; }
:where(.scope) :global(.text-action), :where(.scope) :global(.attachment-link)>span { color:var(--lime); }
:where(.scope) :global(.price-summary)>strong { color:var(--lime); }
:where(.scope) :global(.field-error) { color:var(--danger); border-color:var(--danger); background:color-mix(in srgb,var(--danger) 8%,var(--surface)); }
:where(.scope) :global(.workflow-success) { color:var(--text); border-color:var(--lime); background:color-mix(in srgb,var(--lime) 8%,var(--surface)); }
:where(.scope) :global(.record-status) { background:var(--surface-3); color:var(--text); }
:where(.scope) :global(.status-approved), :where(.scope) :global(.status-paid), :where(.scope) :global(.status-completed), :where(.scope) :global(.status-active), :where(.scope) :global(.status-delivered) { background:#163e32; color:#a9edce; }
:where(.scope) :global(.status-sent), :where(.scope) :global(.status-ongoing), :where(.scope) :global(.status-shipping) { background:#163846; color:#ace3f2; }
:where(.scope) :global(.status-partial), :where(.scope) :global(.status-pending) { background:#45341b; color:#ffdc97; }
:where(.scope) :global(.status-canceled), :where(.scope) :global(.status-rejected), :where(.scope) :global(.status-returned) { background:#492626; color:#ffb5af; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-approved),:global(.status-paid),:global(.status-completed),:global(.status-active),:global(.status-delivered)) { background:#e0f1e8; color:#23553f; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-sent),:global(.status-ongoing),:global(.status-shipping)) { background:#deedf5; color:#24596d; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-partial),:global(.status-pending)) { background:#fff0cd; color:#715119; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-canceled),:global(.status-rejected),:global(.status-returned)) { background:#ffe5e1; color:#8d3229; }
:where(.scope) :global(.customer-dialog) { background:var(--surface); width:min(42rem,calc(100vw - 2rem)); }
:where(.scope) :global(.customer-dialog)::backdrop { background:#0008; }
:where(.scope) :global(.demo-context) { color:var(--muted); font-size:.8rem; line-height:1.7; margin:1rem 0 1.5rem; }
:where(.scope) :global(.integrated-shell) :global(.integrated-sidebar) { display:flex; flex-direction:column; position:fixed; inset:0 auto 0 0; width:17rem; height:100dvh; min-height:0; overflow:hidden; }
:where(.scope) :global(.sidebar-scroll) { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; padding-right:.25rem; }
:where(.scope) :global(.integrated-sidebar) :global(.nav-list) { display:flex; flex-direction:column; overflow:visible; }
:where(.scope) :global(.integrated-sidebar) :global(.sidebar-theme) { flex:none; margin:0; padding:.75rem 0; }
:where(.scope) :global(.integrated-sidebar) :global(.sidebar-footer) { display:grid; flex:none; margin:0; padding-top:1rem; }
:where(.scope) :global(.integrated-sidebar) :global(.brand) { flex-shrink:0; }
:where(.scope) :global(.integrated-shell) :global(.app-stage) { margin-left:17rem; min-width:0; }
:where(.scope) :global(.integrated-topbar) { display:flex; gap:1rem; }
:where(.scope) :global(.integrated-topbar) :global(.eyebrow) { margin:0; }
:where(.scope) :global(.switch-account) { margin-left:auto; font-size:.8rem; text-decoration:none; padding:.7rem 1rem; }
:where(.scope) :global(.mobile-navigation) { display:none; }
:where(.scope) :global(.workspace-links) { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; }
:where(.scope) :global(.workspace-link-card) { padding:1.75rem; min-width:0; text-decoration:none; display:flex; flex-direction:column; align-items:flex-start; gap:.8rem; transition:border-color .2s,transform .2s; }
:where(.scope) :global(.workspace-link-card):hover { border-color:var(--lime); transform:translateY(-2px); }
:where(.scope) :global(.workspace-link-card) h2 { font-size:1.2rem; color:var(--text); }
:where(.scope) :global(.workspace-link-card) p { font-size:.85rem; color:var(--muted); line-height:1.7; flex:1; }
:where(.scope) :global(.workspace-card-icon) { color:var(--lime); background:color-mix(in srgb,var(--lime) 12%,transparent); padding:.75rem; border-radius:.8rem; }
:where(.scope) :global(.workspace-card-action) { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:var(--lime); margin-top:.8rem; }
:where(.scope) :global(.workflow-skip) { position:fixed; top:-10rem; left:1rem; z-index:100; background:var(--surface); padding:1rem; color:var(--text); }
:where(.scope) :global(.workflow-skip):focus { top:1rem; }
:where(.scope) :global(.navigation-scrim) { display:none; }
:where(.scope) :global(.auth-availability) { color:var(--muted); font-size:.85rem; line-height:1.8; padding:1rem; border:1px solid var(--line); border-radius:.75rem; margin:1.5rem 0; }
:where(.scope) :global(.login-card) :global(.live-fields) { gap:0; }
:where(.scope) :global(.login-card) :global(.login-submit) { margin-top:1.5rem; }
:where(.scope) :global(.login-register-link) { display:block; margin-top:1rem; text-align:center; line-height:1.5; }
:where(.scope) :global(.login-field) select { width:100%; border:0; outline:0; background:transparent; color:var(--text); font:inherit; font-size:.8125rem; }
:where(.scope) :global(.login-field) select:focus,
:where(.scope) :global(.login-field) select:focus-visible { outline: 0; }
:where(.scope) :global(.auth-help), :where(.scope) :global(.auth-api) { display:block; color:var(--muted); font-size:.6875rem; line-height:1.6; }
:where(.scope) :global(.auth-help) { margin:.625rem 0 0; }
:where(.scope) :global(.auth-api) { margin-top:1rem; text-align:center; opacity:.7; }
@media(max-width:75rem) { :where(.scope) :global(.workspace-links) { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:900px) {
  :where(.scope) :global(.integrated-shell) :global(.integrated-sidebar) { width:min(20rem,88vw); transform:translateX(-100%); visibility:hidden; z-index:45; padding:1rem; }
  :where(.scope) :global(.integrated-shell) :global(.integrated-sidebar):global(.navigation-open) { transform:translateX(0); visibility:visible; }
  :where(.scope) :global(.integrated-shell) :global(.app-stage) { margin-left:0; }
  :where(.scope) :global(.integrated-sidebar) :global(.nav-label) { display:block; }
  :where(.scope) :global(.integrated-sidebar) :global(.nav-list) :is(a,button) { min-width:0; }
  :where(.scope) :global(.mobile-navigation) { display:inline-flex; }
  :where(.scope) :global(.navigation-scrim) { display:block; position:fixed; inset:0; background:#0009; border:0; z-index:44; }
  :where(.scope) :global(.integrated-topbar) { position:sticky; top:0; z-index:30; height:auto; min-height:4.5rem; padding:1rem; background:var(--surface); }
  :where(.scope) :global(.integrated-sidebar) :global(.sidebar-theme) :global(.theme-toggle) { width:100%; justify-content:flex-start; }
  :where(.scope) :global(.integrated-sidebar) :global(.sidebar-theme) :global(.theme-toggle) span { display:inline; }
}
@media(max-width:600px) {
  :where(.scope) :global(.workspace-links) { grid-template-columns:1fr; }
  :where(.scope) :global(.integrated-topbar) :global(.eyebrow) { font-size:.6rem; }
  :where(.scope) :global(.switch-account) { font-size:.7rem; padding:.6rem; }
  :where(.scope) :global(.workflow-content) :global(.button-primary), :where(.scope) :global(.workflow-content) :global(.button-secondary) { white-space:normal; }
}

/* Connected backend surfaces share the same appearance tokens and UI scale. */
:where(.scope) :global(.live-inventory-row) { padding-block: 1.25rem; border-bottom: 1px solid var(--line); min-width: 0; overflow-wrap: anywhere; }
:where(.scope) :global(.live-inventory-row) dl { font-variant-numeric: tabular-nums; }
:where(.scope) :global(.live-inventory-row) h3, :where(.scope) :global(.live-inventory-row) h5 { margin-bottom: .5rem; }
:where(.scope) :global(.live-plan-line) { display: flex; flex-wrap: wrap; align-items: end; gap: .75rem; padding-block: .75rem; border-bottom: 1px solid var(--line); }
:where(.scope) :global(.live-plan-line) :global(.form-field) { flex: 1 1 12rem; min-width: 0; }
:where(.scope) :global(.live-plan-line) :global(.record-id) { flex-basis: 100%; }
:where(.scope) :global(.live-fields) { display:grid; gap:.875rem; border:0; padding:0; min-width:0; }
:where(.scope) :global(.live-section) { border-top:.0625rem solid var(--line); padding-top:1.375rem; margin-top:1.5rem; }
:where(.scope) :global(.live-section) h3, :where(.scope) :global(.live-section) h4 { margin-bottom:.875rem; }
:where(.scope) :global(.live-section) form { margin-top:1.125rem; }
:where(.scope) :global(.workflow-error) { font-size:.8125rem; color:var(--danger); background:color-mix(in srgb,var(--danger) 8%,var(--surface)); border:.0625rem solid var(--danger); padding:.875rem; border-radius:.5rem; margin:.875rem 0; line-height:1.7; overflow-wrap:anywhere; }
:where(.scope) :global(.live-description), :where(.scope) :global(.private-invitation) { white-space:pre-wrap; overflow-wrap:anywhere; }
:where(.scope) :global(.private-invitation) { display:block; user-select:all; }
:where(.scope) :global(.live-workspace) button { min-height:2.75rem; padding:.5625rem .75rem; }
:where(.scope) :global(.live-workspace) :global(.form-actions) { align-items:center; }
:where(.scope) :global(.live-workspace) :global(.record-detail), :where(.scope) :global(.live-workspace) :global(.record-list-item) { overflow-wrap:anywhere; }
:where(.scope) :global(.live-editor) { margin:1.5rem 0; padding:1.25rem 0; border-top:.0625rem solid var(--line); border-bottom:.0625rem solid var(--line); }
:where(.scope) :global(.live-editor) h3 { margin-bottom:1rem; font-size:1.125rem; }
:where(.scope) :global(.live-worker-row) { padding:1.25rem 0; border-bottom:.0625rem solid var(--line-soft); }
:where(.scope) :global(.live-worker-row) p, :where(.scope) :global(.live-editor) p { line-height:1.7; font-size:.875rem; }
:where(.scope) :global(.live-worker-row) :global(.detail-grid) { background:transparent; }
:where(.scope) :global(.live-worker-row) :global(.form-actions)>button { flex:1 1 8rem; white-space:normal; overflow-wrap:normal; }
:where(.scope) :global(.live-workspace) :is(input,textarea,select) { caret-color:var(--lime); }
:where(.scope) :global(.live-workspace) ::selection { color:var(--text); background:color-mix(in srgb,var(--lime) 25%,var(--surface)); }
:where(.scope) :global(.fulfillment-section) { font-variant-numeric:tabular-nums; }
:where(.scope) :global(.live-evidence-record) { margin-top:1.25rem; padding:1.25rem 0; border-top:.0625rem solid var(--line-soft); }
:where(.scope) :global(.live-evidence-record) p { margin:.75rem 0; line-height:1.7; font-size:.875rem; overflow-wrap:anywhere; }
:where(.scope) :global(.live-review-confirm) { display:flex; align-items:start; gap:.75rem; line-height:1.6; }
:where(.scope) :global(.live-review-confirm) input { width:1.25rem; min-height:1.25rem; flex:none; margin-top:.1875rem; accent-color:var(--lime); }
@media(max-width:37.5rem) { :where(.scope) :global(.live-workspace) :global(.detail-grid) { grid-template-columns:1fr; } }

/* Connected shell: real API badge and sign-out. */
:where(.scope) :global(.integrated-topbar) :global(.api-mode-badge) { margin-left:auto; padding:.3125rem .625rem; border:.0625rem solid var(--line); border-radius:62.4375rem; color:var(--muted); font-size:.6875rem; font-weight:700; letter-spacing:.08em; text-transform:uppercase; white-space:nowrap; }
:where(.scope) :global(.integrated-topbar) :global(.api-mode-badge):global(.live) { color:var(--cyan); border-color:color-mix(in srgb,var(--cyan) 45%,var(--line)); }
:where(.scope) :global(.integrated-topbar) :global(.api-mode-badge) + :global(.switch-account) { margin-left:.75rem; }
:where(.scope) :global(.live-workspace) button:not([class]) { display:inline-flex; align-items:center; justify-content:center; gap:.5rem; border:.0625rem solid var(--line); border-radius:.75rem; background:var(--surface); color:var(--text); font:inherit; font-size:.875rem; font-weight:600; cursor:pointer; }
:where(.scope) :global(.live-workspace) button:not([class]):hover:not(:disabled) { border-color:var(--lime); }
@media(max-width:37.5rem) { :where(.scope) :global(.integrated-topbar) :global(.api-mode-badge) { padding:.25rem .5rem; font-size:.5625rem; letter-spacing:.04em; } }
/* UC5–UC9 backend status values reuse the existing four status colour families. */
:where(.scope) :global(.status-accepted), :where(.scope) :global(.status-received), :where(.scope) :global(.status-resolved) { background:#163e32; color:#a9edce; }
:where(.scope) :global(.status-ordered), :where(.scope) :global(.status-in_progress), :where(.scope) :global(.status-claimed) { background:#163846; color:#ace3f2; }
:where(.scope) :global(.status-queued), :where(.scope) :global(.status-partially_received), :where(.scope) :global(.status-pending_claim), :where(.scope) :global(.status-unpaid) { background:#45341b; color:#ffdc97; }
:where(.scope) :global(.status-cancelled) { background:#492626; color:#ffb5af; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-accepted),:global(.status-received),:global(.status-resolved)) { background:#e0f1e8; color:#23553f; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-ordered),:global(.status-in_progress),:global(.status-claimed)) { background:#deedf5; color:#24596d; }
:global([data-theme="light"]) :where(.scope) :is(:global(.status-queued),:global(.status-partially_received),:global(.status-pending_claim),:global(.status-unpaid)) { background:#fff0cd; color:#715119; }
:global([data-theme="light"]) :where(.scope) :global(.status-cancelled) { background:#ffe5e1; color:#8d3229; }
:where(.scope) :global(.record-list-item) > span:global(.record-code) { text-transform:none; overflow-wrap:anywhere; }
```

### A3. Cinematic public landing — src/features/landing/landing.module.css

```css
:global(.cinematic-page):where(.scope) {
  --text: #f4f4f1; --muted: #a5aaa7; --lime: #ff923f; --bg: #060707;
  --surface: #111313; --surface-2: #191c1c; --line: #343838;
  color: var(--text); background: var(--bg); color-scheme: dark; overflow-x: clip;
  font-family: var(--font-landing-thai), var(--font-geist-sans), sans-serif;
}
:global(.cinematic-page):where(.scope) ::selection { color: #160e08; background: #ffb479; }
:global(.cinematic-page):where(.scope) a { text-decoration: none; color: inherit; text-underline-offset: .25em; }
:global(.cinematic-page):where(.scope) :is(a, button):focus-visible { outline: 2px solid #ffb16d; outline-offset: 5px; }
:global(.cinematic-page):where(.scope) button { cursor: pointer; }
:where(.scope) :global(.cinematic-hero) { position: relative; min-height: max(47rem, 100svh); isolation: isolate; overflow: hidden; background: #060707; }
:where(.scope) :global(.cinematic-horizon) { position: absolute; z-index: -1; inset: 0; background: radial-gradient(ellipse 60% 12% at 53% 104%, #ff7c22 0%, #d4561a99 25%, transparent 72%), linear-gradient(0deg, #15191b 0%, #0b0e10 14%, #060707 46%); }
:where(.scope) :global(.cinematic-art) { position: absolute; z-index: 0; inset: 49% 0 16%; pointer-events: none; }
:where(.scope) :global(.cinematic-canvas) { position: absolute; inset: 0; opacity: 0; transition: opacity .3s; }
:where(.scope) :global(.cinematic-canvas)[data-ready="true"] { opacity: 1; }
:where(.scope) :global(.cinematic-canvas) canvas { display: block; }
:where(.scope) :global(.cinematic-poster) { position: absolute; inset: 0; display: block; }
:where(.scope) :global(.cinematic-poster) img { width: 100%; height: 100%; object-fit: contain; }
:where(.scope) :global(.cinematic-hero):has(:global(.cinematic-canvas)[data-ready="true"]) :global(.cinematic-poster) { visibility: hidden; }
:where(.scope) :global(.cinematic-hero)[data-state="loading"] :global(.cinematic-poster) { opacity: .45; filter: blur(4px); }
:where(.scope) :global(.cinematic-nav) { position: relative; z-index: 3; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 2.75rem; padding: 2rem 4.5%; }
:where(.scope) :global(.cinematic-brand) { width: fit-content; }
:where(.scope) :global(.cinematic-nav-actions) { display: flex; align-items: center; justify-content: flex-end; gap: .5rem; }
:global(.cinematic-page):where(.scope) :global(.brand) { padding: 0; font-family: var(--font-geist-sans), sans-serif; }
:global(.cinematic-page):where(.scope) :global(.brand) b { color: #f4f4f1; font-size: .875rem; }
:global(.cinematic-page):where(.scope) :global(.brand) small { color: #b0b5b2; }
:global(.cinematic-page):where(.scope) :global(.brand-mark) { width: 1.8rem; height: 1.8rem; box-shadow: none; border-radius: .3rem; }
:where(.scope) :global(.cinematic-nav-pills) { display: flex; gap: .4rem; justify-self: start; }
:where(.scope) :global(.cinematic-nav-pills) a { display: inline-flex; align-items: center; justify-content: center; min-height: 2.75rem; padding: 0 1rem; border: 1px solid #ffffff18; border-radius: 999px; background: #ffffff08; font-size: .75rem; color: #c0c4c1; transition: background .2s, color .2s; }
:where(.scope) :global(.cinematic-nav-pills) a:hover { color: white; background: #ffffff16; }
:where(.scope) :global(.cinematic-workspace) { display: inline-flex; align-items: center; gap: 1.5rem; min-height: 2.75rem; padding: 0 1rem; border: 1px solid #ffffff30; border-radius: .5rem; font-size: .75rem; transition: background .2s; }
:where(.scope) :global(.cinematic-workspace):hover { background: #ffffff12; }
:where(.scope) :global(.cinematic-workspace) span { font-size: 1rem; }
:where(.scope) :global(.cinematic-copy) { position: absolute; z-index: 2; left: 4.5%; top: 18%; width: 55%; pointer-events: none; }
:where(.scope) :global(.cinematic-copy) h1 { margin: 0; font-size: clamp(3rem, 5.2vw, 5.5rem); line-height: 1.28; letter-spacing: -.015em; font-weight: 510; }
:where(.scope) :global(.cinematic-line) { display: block; white-space: nowrap; }
:where(.scope) :global(.cinematic-description) { position: absolute; z-index: 2; top: 23%; right: 4.5%; width: 23%; max-width: 19rem; }
:where(.scope) :global(.cinematic-description) p { margin: 0; color: #b6bbb8; font-size: .875rem; line-height: 1.7; text-wrap: pretty; }
:where(.scope) :global(.cinematic-primary) { margin-top: 2rem; min-height: 3rem; padding: .75rem 1.25rem; display: inline-flex; align-items: center; gap: 2.25rem; color: #121514 !important; background: #f3f3ef; border-radius: .375rem; font-size: .8125rem; font-weight: 600; transition: background .2s, transform .2s; }
:where(.scope) :global(.cinematic-primary):hover { background: #ffd1ad; transform: translateY(-2px); }
:where(.scope) :global(.cinematic-primary) span { font-size: 1.125rem; }
:where(.scope) :global(.cinematic-bottom-copy) { position: absolute; z-index: 2; bottom: 3.5rem; left: 4.5%; isolation: isolate; }
:where(.scope) :global(.cinematic-bottom-copy)::before { content: ""; position: absolute; z-index: -1; inset: -.75rem -2rem -.5rem -1rem; background: linear-gradient(90deg, #080a0aee 65%, #080a0a00); pointer-events: none; }
:where(.scope) :global(.cinematic-bottom-copy) p { margin: 0; font-size: .875rem; line-height: 1.65; letter-spacing: 0; }
:where(.scope) :global(.cinematic-bottom-copy) a { margin-top: 1.5rem; display: inline-flex; align-items: center; gap: 1rem; min-height: 2.75rem; font-size: .6875rem; color: #c0c6c2; }
:where(.scope) :global(.cinematic-bottom-copy) a:hover { color: #ffb16d; }
:where(.scope) :global(.cinematic-stats) { position: absolute; z-index: 2; right: 4.5%; bottom: 3.5rem; display: flex; gap: .65rem; margin: 0; }
:where(.scope) :global(.cinematic-stats) > div { display: flex; flex-direction: column-reverse; justify-content: space-between; gap: .75rem; min-width: 10.25rem; padding: 1.1rem 1.2rem; border-radius: .75rem; background: linear-gradient(135deg, #ffffff0c, #ffffff03), #101414e8; backdrop-filter: blur(14px); box-shadow: 0 .75rem 2rem #0003; }
:where(.scope) :global(.cinematic-stats) dt { font-size: .75rem; color: #d2d6d3; }
:where(.scope) :global(.cinematic-stats) dd { display: flex; align-items: center; justify-content: space-between; margin: 0; font-size: 2rem; line-height: 1; font-weight: 500; letter-spacing: -.04em; font-variant-numeric: tabular-nums; }
:where(.scope) :global(.cinematic-stats) dd span { font-size: .875rem; color: #ffad6a; }
:where(.scope) :global(.cinematic-scene-notice) { position: absolute; left: 50%; transform: translateX(-50%); bottom: 8%; font-size: .75rem; color: #b8bfbb; }
:global(.cinematic-page):where(.scope) h2 { margin: 0; font-weight: 500; font-size: clamp(2.5rem, 4vw, 4.5rem); line-height: 1.3; letter-spacing: -.015em; }
:where(.scope) :global(.cinematic-footer) { max-width: 100rem; margin: 0 auto; padding: 2rem 4.5%; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 2rem; border-top: 1px solid #ffffff20; }
:where(.scope) :global(.cinematic-footer) > p { color: var(--muted); font-size: .75rem; }
:where(.scope) :global(.cinematic-footer) > div { display: flex; gap: 1.5rem; align-items: center; }
:where(.scope) :global(.cinematic-footer) > div > a { display: inline-flex; gap: 1rem; align-items: center; min-height: 2.75rem; font-size: .8125rem; }
:where(.scope) :global(.cinematic-footer) :global(.settings-trigger) { background: transparent; color: #c6cbc8; border-color: #ffffff30; }
@media (min-width: 768px) and (max-width: 1100px) {
  :where(.scope) :global(.cinematic-nav) { gap: 1.5rem; }
  :where(.scope) :global(.cinematic-nav-pills) a { padding-inline: .75rem; }
  :where(.scope) :global(.cinematic-description) { width: 23%; }
  :where(.scope) :global(.cinematic-stats) > div { min-width: 8.25rem; padding: 1rem; }
}
@media (max-width: 767px) {
  :where(.scope) :global(.cinematic-hero) { min-height: 57rem; display: flex; flex-direction: column; }
  :where(.scope) :global(.cinematic-nav) { grid-template-columns: 1fr auto; padding: 1.5rem 1.25rem 0; gap: 1.25rem 1rem; }
  :where(.scope) :global(.cinematic-nav-pills) { grid-row: 2; grid-column: 1 / -1; gap: .4rem; }
  :where(.scope) :global(.cinematic-nav-pills) a { font-size: .6875rem; min-height: 2.75rem; padding-inline: .9rem; }
  :where(.scope) :global(.cinematic-workspace) { padding-inline: .75rem; font-size: .6875rem; gap: .75rem; }
  :global(.cinematic-page):where(.scope) :global(.brand) b { font-size: .75rem; }
  :global(.cinematic-page):where(.scope) :global(.brand) small { font-size: .4375rem; }
  :global(.cinematic-page):where(.scope) :global(.brand-mark) { width: 1.5rem; height: 1.5rem; }
  :where(.scope) :global(.cinematic-copy) { position: relative; left: auto; top: auto; width: auto; margin: 3rem 1.25rem 0; }
  :where(.scope) :global(.cinematic-copy) h1 { font-size: clamp(2.25rem, 10vw, 4.5rem); }
  :where(.scope) :global(.cinematic-description) { position: relative; top: auto; right: auto; width: auto; max-width: 27rem; margin: 1.5rem 1.25rem 0; }
  :where(.scope) :global(.cinematic-description) p { font-size: .8125rem; max-width: 32ch; }
  :where(.scope) :global(.cinematic-primary) { margin-top: 1.25rem; }
  :where(.scope) :global(.cinematic-art) { position: relative; inset: auto; height: 15rem; width: 100%; flex: none; order: 1; margin-top: 1.25rem; margin-bottom: 8rem; }
  :where(.scope) :global(.cinematic-bottom-copy) { bottom: 2rem; left: 1.25rem; max-width: 35%; }
  :where(.scope) :global(.cinematic-bottom-copy) p { font-size: .6875rem; }
  :where(.scope) :global(.cinematic-bottom-copy) a { font-size: .625rem; margin-top: .75rem; gap: .4rem; }
  :where(.scope) :global(.cinematic-stats) { right: 1.25rem; bottom: 2.5rem; gap: .4rem; }
  :where(.scope) :global(.cinematic-stats) > div { min-width: 5.4rem; max-width: 6.5rem; padding: .8rem; gap: .7rem; }
  :where(.scope) :global(.cinematic-stats) dd { font-size: 1.75rem; }
  :where(.scope) :global(.cinematic-stats) dt { font-size: .6875rem; max-width: 12ch; line-height: 1.6; }
  :where(.scope) :global(.cinematic-scene-notice) { bottom: 10rem; width: 90%; text-align: center; }
  :where(.scope) :global(.cinematic-footer) { padding: 2rem 1.25rem; gap: 1.5rem; }
  :where(.scope) :global(.cinematic-footer) > p { width: 100%; order: 3; margin: 0; }
}
@media (max-width: 380px) {
  :where(.scope) :global(.cinematic-nav) { gap: 1rem .5rem; }
  :where(.scope) :global(.cinematic-workspace) { gap: .4rem; padding-inline: .6rem; }
  :where(.scope) :global(.cinematic-workspace) > span { display: none; }
  :where(.scope) :global(.cinematic-art) { margin-bottom: 12rem; }
  :where(.scope) :global(.cinematic-bottom-copy) { bottom: 9.5rem; max-width: calc(100% - 2.5rem); }
  :where(.scope) :global(.cinematic-bottom-copy) p br { display: none; }
  :where(.scope) :global(.cinematic-bottom-copy) a { margin-top: .2rem; }
  :where(.scope) :global(.cinematic-stats) { left: 1.25rem; right: 1.25rem; }
  :where(.scope) :global(.cinematic-stats) > div { flex: 1; max-width: none; }
  :where(.scope) :global(.cinematic-stats) dt { max-width: none; }
}
@media (prefers-reduced-motion: reduce) {
  :global(.cinematic-page):where(.scope) *, :global(.cinematic-page):where(.scope) *::before, :global(.cinematic-page):where(.scope) *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }
  :where(.scope) :global(.cinematic-hero) :global(.cinematic-poster) { opacity: 1; filter: none; }
}
:where(.scope) :global(.cinematic-sr-only) { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
:where(.scope) :global(.cinematic-scene-toggle) { position: absolute; z-index: 1; top: .5rem; right: 4.5%; display: inline-flex; align-items: center; gap: .5rem; min-height: 2.75rem; padding: 0 .9rem; border: 1px solid #ffffff26; border-radius: 999px; background: #0b0d0dcc; color: #d6dad7; font: inherit; font-size: .75rem; pointer-events: auto; backdrop-filter: blur(8px); transition: background .2s, color .2s; }
:where(.scope) :global(.cinematic-scene-toggle):hover { background: #1a1d1dee; color: #fff; }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-scene-toggle) { background: #fffffff0; color: var(--text); border-color: var(--line); }

/* Follow the shared appearance preference without changing the cinematic scene. */
:global([data-theme="light"]) :global(.cinematic-page):where(.scope) {
  --text: #241d18; --muted: #62574e; --lime: #bd5314; --bg: #f6f3ef;
  --surface: #ffffff; --surface-2: #eee8e1; --line: #d8cfc5;
  color-scheme: light;
}
:global([data-theme="light"]) :where(.scope) :global(.cinematic-hero) { background: var(--bg); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-art) { mask-image: linear-gradient(transparent, #000 12%, #000 82%, transparent); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-horizon) { background: radial-gradient(ellipse 60% 18% at 53% 104%, #f8ad71 0%, #f8ad7140 38%, transparent 75%), linear-gradient(0deg, #e6d9cc 0%, #f0e8df 14%, #f6f3ef 46%); }
:global([data-theme="light"]) :global(.cinematic-page):where(.scope) :global(.brand) b { color: var(--text); }
:global([data-theme="light"]) :global(.cinematic-page):where(.scope) :global(.brand) small { color: var(--muted); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-nav-pills) a { color: var(--muted); background: #ffffff80; border-color: var(--line); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-nav-pills) a:hover { color: var(--text); background: var(--surface-2); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-workspace) { border-color: var(--line); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-workspace):hover { background: var(--surface-2); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-description) p,
:global([data-theme="light"]) :where(.scope) :global(.cinematic-bottom-copy) a,
:global([data-theme="light"]) :where(.scope) :global(.cinematic-stats) dt,
:global([data-theme="light"]) :where(.scope) :global(.cinematic-scene-notice) { color: var(--muted); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-primary) { color: #ffffff !important; background: #943c0d; }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-primary):hover { background: #742e08; }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-bottom-copy)::before { background: linear-gradient(90deg, #f6f3eff5 65%, #f6f3ef00); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-stats) > div { background: #fffffff0; box-shadow: 0 .75rem 2rem #49321b14; }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-stats) dd span,
:global([data-theme="light"]) :where(.scope) :global(.cinematic-bottom-copy) a:hover { color: #943c0d; }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-footer) { border-color: var(--line); }
:global([data-theme="light"]) :where(.scope) :global(.cinematic-footer) :global(.settings-trigger) { color: var(--text); border-color: var(--line); }
:global([data-theme="light"]) :global(.cinematic-page):where(.scope) :is(a, button):focus-visible { outline-color: #943c0d; }

/* Shop sections and scroll motion (2026-10-29). Reveals hide content only after landing-motion.tsx sets data-motion. */
:global(html):has(.scope) { scroll-behavior: smooth; scroll-padding-top: 5rem; interpolate-size: allow-keywords; }
:global(.cinematic-page):where(.scope) { --accent-ink: #ffad6a; --soft-line: #ffffff17; --card: linear-gradient(160deg, #ffffff0a, #ffffff02); --ease-out: cubic-bezier(.16, 1, .3, 1); }
:global([data-theme="light"]) :global(.cinematic-page):where(.scope) { --accent-ink: #943c0d; --soft-line: var(--line); --card: #ffffff; }

/* Page progress and compact sticky bar. */
:where(.scope) :global(.landing-progress) { position: fixed; z-index: 60; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, #ff7c22, #ffb16d); transform-origin: 0 50%; transform: scaleX(var(--scroll-progress, 0)); pointer-events: none; }
:where(.scope) :global(.landing-sticky) { position: fixed; z-index: 50; top: .75rem; left: 50%; width: min(64rem, calc(100% - 2rem)); display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .375rem .375rem .375rem 1rem; border: 1px solid #ffffff1c; border-radius: 999px; background: #0b0d0dd9; backdrop-filter: blur(14px) saturate(140%); box-shadow: 0 1rem 2.5rem #0007; transform: translate(-50%, -150%); opacity: 0; visibility: hidden; transition: transform .55s var(--ease-out), opacity .3s, visibility 0s .55s; }
:global(.cinematic-page):where(.scope)[data-scrolled="true"] :global(.landing-sticky) { transform: translate(-50%, 0); opacity: 1; visibility: visible; transition: transform .55s var(--ease-out), opacity .3s, visibility 0s; }
:where(.scope) :global(.landing-sticky) nav { display: flex; gap: .25rem; }
:where(.scope) :global(.landing-sticky) nav a { display: inline-flex; align-items: center; min-height: 2.75rem; padding: 0 .85rem; border-radius: 999px; color: var(--muted); font-size: .75rem; transition: color .2s, background .2s; }
:where(.scope) :global(.landing-sticky) nav a:hover, :where(.scope) :global(.landing-sticky) nav a[aria-current] { color: var(--text); background: #ffffff12; }
:where(.scope) :global(.landing-sticky-cta) { display: inline-flex; align-items: center; gap: .75rem; min-height: 2.75rem; padding: 0 1.1rem; border-radius: 999px; background: #f3f3ef; color: #121514 !important; font-size: .75rem; font-weight: 600; transition: background .2s, transform .2s; }
:where(.scope) :global(.landing-sticky-cta):hover { background: #ffd1ad; transform: translateY(-1px); }

/* Hero: one-time entrance, then a gentle exit as the page scrolls. */
@keyframes rise { from { opacity: 0; translate: 0 .9em; filter: blur(8px); } to { opacity: 1; translate: 0 0; filter: none; } }
:where(.scope) :global(.cinematic-line) { animation: rise 1s var(--ease-out) both; }
:where(.scope) :global(.cinematic-line):nth-child(2) { animation-delay: .1s; }
:where(.scope) :global(.cinematic-line):nth-child(3) { animation-delay: .2s; }
:where(.scope) :global(.cinematic-description), :where(.scope) :global(.cinematic-bottom-copy), :where(.scope) :global(.cinematic-stats) { animation: rise 1s var(--ease-out) .35s both; }
:global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.cinematic-copy), :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.cinematic-description) { transform: translateY(calc(var(--hero-progress, 0) * -4rem)); opacity: calc(1 - var(--hero-progress, 0) * 1.2); }
:global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.cinematic-art) { transform: translateY(calc(var(--hero-progress, 0) * 2.5rem)) scale(calc(1 + var(--hero-progress, 0) * .04)); }

/* Scroll reveal: translate/opacity/blur on entry, staggered by --i. Hover uses transform, so it never waits for the stagger. */
:where(.scope) [data-reveal] { --reveal-delay: calc(var(--i, 0) * 90ms); transition: opacity .8s var(--ease-out) var(--reveal-delay), translate .9s var(--ease-out) var(--reveal-delay), filter .8s var(--ease-out) var(--reveal-delay); }
:global(.cinematic-page):where(.scope)[data-motion="ready"] [data-reveal]:not([data-revealed]) { opacity: 0; translate: 0 2rem; filter: blur(6px); }

/* Shared section frame. */
:where(.scope) :global(.landing-section) { max-width: 100rem; margin: 0 auto; padding: 7rem 4.5%; border-top: 1px solid var(--soft-line); }
:where(.scope) :global(.landing-heading) { max-width: 44rem; margin-bottom: 3.5rem; }
:where(.scope) :global(.landing-section) h2 { text-wrap: balance; }
:where(.scope) :global(.landing-eyebrow) { display: inline-flex; align-items: center; gap: .75rem; margin: 0 0 1.25rem; color: var(--accent-ink); font-size: .75rem; letter-spacing: .08em; }
:where(.scope) :global(.landing-eyebrow)::before { content: ""; width: 1.75rem; height: 1px; background: currentColor; }
:where(.scope) :global(.landing-lead) { margin: 1.5rem 0 0; color: var(--muted); font-size: .9375rem; line-height: 1.75; max-width: 34rem; text-wrap: pretty; }
:where(.scope) :global(.landing-section) h3 { margin: 0; font-size: 1.125rem; font-weight: 500; letter-spacing: -.01em; }
:global(.cinematic-page):where(.scope) :global(.landing-text-link) { display: inline-flex; align-items: center; gap: .6rem; min-height: 2.75rem; color: var(--accent-ink); font-size: .875rem; }
:where(.scope) :global(.landing-text-link):hover { text-decoration: underline; }

/* 1. Services: icon grid. */
:where(.scope) :global(.landing-services) { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
:where(.scope) :global(.landing-services) li { position: relative; padding: 2rem 1.75rem; border: 1px solid var(--soft-line); border-radius: .875rem; background: var(--card); overflow: hidden; transition: opacity .8s var(--ease-out) var(--reveal-delay), translate .9s var(--ease-out) var(--reveal-delay), filter .8s var(--ease-out) var(--reveal-delay), transform .35s var(--ease-out), border-color .35s, box-shadow .35s; }
:where(.scope) :global(.landing-services) li::after { content: ""; position: absolute; inset: auto -30% -60% -30%; height: 70%; background: radial-gradient(closest-side, #ff7c2233, transparent); opacity: 0; transition: opacity .45s; pointer-events: none; }
:where(.scope) :global(.landing-services) li:hover { transform: translateY(-4px); border-color: #ff923f55; box-shadow: 0 1.25rem 2.5rem #0005; }
:where(.scope) :global(.landing-services) li:hover::after { opacity: 1; }
:where(.scope) :global(.landing-service-icon) { display: inline-grid; place-items: center; width: 3rem; height: 3rem; margin-bottom: 1.5rem; border-radius: .75rem; background: #ff923f17; color: var(--accent-ink); transition: background .35s, color .35s; }
:where(.scope) :global(.landing-services) li:hover :global(.landing-service-icon) { background: #ff923f; color: #160e08; }
:where(.scope) :global(.landing-services) p { margin: .75rem 0 0; color: var(--muted); font-size: .875rem; line-height: 1.7; }

/* 2. Materials: heading beside the full-width materials table. */
:where(.scope) :global(.landing-materials) { display: grid; grid-template-columns: minmax(0, .85fr) minmax(0, 1.15fr); gap: 6%; align-items: start; }
:where(.scope) :global(.landing-materials) :global(.landing-heading) { margin-bottom: 0; }
:where(.scope) :global(.landing-table-wrap) { overflow-x: auto; }
:where(.scope) :global(.landing-table) { width: 100%; border-collapse: collapse; font-size: .875rem; }
:where(.scope) :global(.landing-table) th, :where(.scope) :global(.landing-table) td { padding: 1rem .75rem; border-bottom: 1px solid var(--soft-line); text-align: left; vertical-align: top; }
:where(.scope) :global(.landing-table) thead th { color: var(--muted); font-size: .75rem; font-weight: 400; }
:where(.scope) :global(.landing-table) tbody th { font-weight: 500; }
:where(.scope) :global(.landing-table) td { color: var(--muted); }
:where(.scope) :global(.landing-table) tbody tr { transition: background .25s; }
:where(.scope) :global(.landing-table) tbody tr:hover { background: #ff923f0d; }

/* 3. Gallery: asymmetric mosaic. */
:where(.scope) :global(.landing-gallery) { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 15rem; gap: 1rem; }
:where(.scope) :global(.landing-gallery) li:first-child { grid-column: span 2; grid-row: span 2; }
:where(.scope) :global(.landing-gallery) figure { height: 100%; margin: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: .75rem; }
:where(.scope) :global(.landing-gallery-media) { position: relative; overflow: hidden; border-radius: .875rem; border: 1px solid var(--soft-line); }
:where(.scope) :global(.landing-gallery-media) img, :where(.scope) :global(.landing-gallery-placeholder) { object-fit: cover; transition: transform .9s var(--ease-out); }
:where(.scope) :global(.landing-gallery) li:hover :global(.landing-gallery-media) img, :where(.scope) :global(.landing-gallery) li:hover :global(.landing-gallery-placeholder) { transform: scale(1.05); }
:where(.scope) :global(.landing-gallery-placeholder) { position: absolute; inset: 0; display: grid; place-items: center; color: var(--muted); font-size: .75rem; background: repeating-linear-gradient(90deg, #ffffff05 0 2px, transparent 2px 6px), linear-gradient(135deg, #1b1f1f, #2b3131 45%, #131616); }
:where(.scope) :global(.landing-gallery) figcaption { display: flex; justify-content: space-between; gap: 1rem; font-size: .8125rem; }
:where(.scope) :global(.landing-gallery) figcaption strong { font-weight: 500; }
:where(.scope) :global(.landing-gallery) figcaption span { color: var(--muted); }

/* 4. Why us: sticky statement + numbered proof list. */
:where(.scope) :global(.landing-why) { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); gap: 6%; align-items: start; }
:where(.scope) :global(.landing-why-statement) { position: sticky; top: 7rem; }
:where(.scope) :global(.landing-why-statement) h2 { margin-bottom: 1.5rem; }
:where(.scope) :global(.landing-reasons) { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2.75rem 3rem; }
:where(.scope) :global(.landing-reasons) li { display: grid; grid-template-columns: 2.75rem 1fr; gap: .75rem; padding-top: 1.5rem; border-top: 1px solid var(--soft-line); }
:where(.scope) :global(.landing-number) { color: var(--accent-ink); font-size: .8125rem; font-variant-numeric: tabular-nums; padding-top: .2rem; }
:where(.scope) :global(.landing-reasons) p { margin: .6rem 0 0; color: var(--muted); font-size: .875rem; line-height: 1.7; }

/* 5. Process: numbered steps on a line that draws itself, plus the Deposit/PO rules card. */
:where(.scope) :global(.landing-steps) { position: relative; list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1.5rem; }
/* The line runs from the first dot's centre to the last dot's centre (5 columns, 1.5rem gaps). */
:where(.scope) :global(.landing-steps)::before, :where(.scope) :global(.landing-steps)::after { content: ""; position: absolute; top: 1.25rem; left: 1.25rem; right: calc((100% - 6rem) / 5 - 1.25rem); height: 1px; background: var(--soft-line); }
:where(.scope) :global(.landing-steps)::after { background: linear-gradient(90deg, #ff7c22, #ffb16d); transform-origin: 0 50%; transition: transform 1.6s var(--ease-out) .2s; }
:global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.landing-steps):not([data-revealed])::after { transform: scaleX(0); }
:where(.scope) :global(.landing-steps) li { position: relative; z-index: 1; transition: opacity .7s var(--ease-out) calc(var(--i) * 140ms + .2s), translate .8s var(--ease-out) calc(var(--i) * 140ms + .2s); }
:global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.landing-steps):not([data-revealed]) li { opacity: 0; translate: 0 1.25rem; }
:where(.scope) :global(.landing-step-dot) { position: relative; z-index: 1; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; margin-bottom: 1.5rem; border: 1px solid #ff923f88; border-radius: 50%; background: var(--bg); color: var(--accent-ink); font-size: .875rem; font-variant-numeric: tabular-nums; }
:where(.scope) :global(.landing-steps) p { margin: .6rem 0 0; color: var(--muted); font-size: .8125rem; line-height: 1.7; }
/* Rules table and order facts share one equal-height row, so the band is always full width. */
:where(.scope) :global(.landing-terms) { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1rem; margin-top: 4rem; align-items: stretch; }
:where(.scope) :global(.landing-rules), :where(.scope) :global(.landing-facts) { padding: 2rem; border: 1px solid var(--soft-line); border-radius: 1rem; background: var(--card); }
:where(.scope) :global(.landing-facts) { background: radial-gradient(ellipse 80% 70% at 100% 0%, #ff7c221a, transparent 70%), var(--card); }
:where(.scope) :global(.landing-facts) h3 { margin-bottom: 1rem; }
:where(.scope) :global(.landing-facts) dl { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 1.5rem; }
:where(.scope) :global(.landing-facts) dl > div { padding: 1.25rem 0; border-top: 1px solid var(--soft-line); }
:where(.scope) :global(.landing-facts) dt { color: var(--accent-ink); font-size: 1.375rem; font-weight: 500; letter-spacing: -.01em; }
:where(.scope) :global(.landing-facts) dd { margin: .5rem 0 0; color: var(--muted); font-size: .8125rem; line-height: 1.7; }
:where(.scope) :global(.landing-rules) h3 { margin-bottom: 1rem; }
:where(.scope) :global(.landing-rules) > p { margin: 1.25rem 0 0; color: var(--muted); font-size: .8125rem; line-height: 1.7; }

/* 7. FAQ: native accordion, height animates where interpolate-size is supported. */
:where(.scope) :global(.landing-faq) { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 6%; align-items: start; }
:where(.scope) :global(.landing-faq) :global(.landing-heading) { position: sticky; top: 7rem; }
:where(.scope) :global(.landing-faq-list) details { border-bottom: 1px solid var(--soft-line); }
:where(.scope) :global(.landing-faq-list) summary { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-height: 2.75rem; padding: 1.35rem 0; cursor: pointer; list-style: none; font-size: 1rem; font-weight: 500; transition: color .2s; }
:where(.scope) :global(.landing-faq-list) summary::-webkit-details-marker { display: none; }
:where(.scope) :global(.landing-faq-list) summary:hover { color: var(--accent-ink); }
:where(.scope) :global(.landing-faq-mark) { position: relative; flex: none; width: 1.75rem; height: 1.75rem; border: 1px solid var(--soft-line); border-radius: 50%; transition: transform .4s var(--ease-out), border-color .3s; }
:where(.scope) :global(.landing-faq-mark)::before, :where(.scope) :global(.landing-faq-mark)::after { content: ""; position: absolute; inset: 50% auto auto 50%; width: .625rem; height: 1px; background: currentColor; translate: -50% -50%; transition: rotate .4s var(--ease-out); }
:where(.scope) :global(.landing-faq-mark)::after { rotate: 90deg; }
:where(.scope) :global(.landing-faq-list) details[open] :global(.landing-faq-mark) { transform: rotate(180deg); border-color: #ff923f88; }
:where(.scope) :global(.landing-faq-list) details[open] :global(.landing-faq-mark)::after { rotate: 0deg; }
:where(.scope) :global(.landing-faq-list) details p { margin: 0; padding: 0 3.25rem 1.5rem 0; color: var(--muted); font-size: .875rem; line-height: 1.8; }
@supports (interpolate-size: allow-keywords) {
  :where(.scope) :global(.landing-faq-list) details::details-content { block-size: 0; overflow: hidden; transition: block-size .45s var(--ease-out), content-visibility .45s allow-discrete; }
  :where(.scope) :global(.landing-faq-list) details[open]::details-content { block-size: auto; }
}

/* 8. Contact: CTA panel + contact card with click-to-load map. */
:where(.scope) :global(.landing-contact) { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 1.5rem; align-items: stretch; }
:where(.scope) :global(.landing-cta) { position: relative; overflow: hidden; padding: 3.5rem; border: 1px solid var(--soft-line); border-radius: 1.25rem; background: radial-gradient(ellipse 70% 60% at 15% 115%, #ff7c2240, transparent 70%), linear-gradient(160deg, #151919, #0b0d0d); }
:where(.scope) :global(.landing-cta) > p:not(:global(.landing-eyebrow)) { max-width: 30rem; margin: 1.5rem 0 0; color: var(--muted); font-size: .9375rem; line-height: 1.75; }
:where(.scope) :global(.landing-cta-actions) { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem 1.75rem; margin-top: 2rem; }
:where(.scope) :global(.landing-cta-actions) :global(.cinematic-primary) { margin-top: 0; }
:where(.scope) :global(.landing-contact-card) { display: flex; flex-direction: column; gap: 1.25rem; padding: 2rem; border: 1px solid var(--soft-line); border-radius: 1.25rem; background: var(--card); }
:where(.scope) :global(.landing-contact-card) dl { margin: 0; }
:where(.scope) :global(.landing-contact-card) dl > div { display: grid; grid-template-columns: 6.5rem 1fr; gap: 1rem; padding: .75rem 0; border-top: 1px solid var(--soft-line); font-size: .875rem; }
:where(.scope) :global(.landing-contact-card) dt { color: var(--muted); }
:where(.scope) :global(.landing-contact-card) dd { margin: 0; display: grid; gap: .25rem; overflow-wrap: anywhere; }
:global(.cinematic-page):where(.scope) :global(.landing-contact-card) dd a { color: var(--accent-ink); }
:where(.scope) :global(.landing-map-facade), :where(.scope) :global(.landing-map-frame) { width: 100%; aspect-ratio: 16 / 9; border: 0; border-radius: .75rem; }
:where(.scope) :global(.landing-map-facade) { display: grid; place-content: center; justify-items: center; gap: .6rem; padding: 1rem; text-align: center; color: var(--muted); background: repeating-linear-gradient(45deg, #ffffff04 0 1px, transparent 1px 14px), #121515; border: 1px dashed var(--soft-line); }
:where(.scope) :global(.landing-map-facade) p { margin: 0; font-size: .8125rem; }
:where(.scope) :global(.landing-map-facade) small { font-size: .6875rem; }
:where(.scope) :global(.landing-map-facade) button { min-height: 2.75rem; padding: 0 1.1rem; border: 1px solid var(--soft-line); border-radius: 999px; background: transparent; color: var(--text); font: inherit; font-size: .8125rem; }

@media (max-width: 1100px) {
  :where(.scope) :global(.landing-services) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  :where(.scope) :global(.landing-gallery) { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  :where(.scope) :global(.landing-steps) { grid-template-columns: 1fr; gap: 0; }
  :where(.scope) :global(.landing-steps)::before, :where(.scope) :global(.landing-steps)::after { top: 1.25rem; bottom: 1.25rem; left: 1.25rem; right: auto; width: 1px; height: auto; }
  :where(.scope) :global(.landing-steps)::after { transform-origin: 50% 0; }
  :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.landing-steps):not([data-revealed])::after { transform: scaleY(0); }
  :where(.scope) :global(.landing-steps) li { display: grid; grid-template-columns: 2.5rem 1fr; column-gap: 1.25rem; padding-bottom: 2rem; }
  :where(.scope) :global(.landing-step-dot) { grid-row: span 2; margin: 0; }
  :where(.scope) :global(.landing-steps) li h3 { padding-top: .55rem; }
  :where(.scope) :global(.landing-reasons) { grid-template-columns: 1fr; }
  :where(.scope) :global(.landing-terms) { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  :where(.scope) :global(.cinematic-nav-pills) { overflow-x: auto; scrollbar-width: none; flex-wrap: nowrap; margin-inline: -1.25rem; padding-inline: 1.25rem; }
  :where(.scope) :global(.cinematic-nav-pills) a { flex: none; }
  :where(.scope) :global(.landing-sticky) { padding-left: .75rem; }
  :where(.scope) :global(.landing-sticky) nav { display: none; }
  :where(.scope) :global(.landing-section) { padding: 4.5rem 1.25rem; }
  :global(.cinematic-page):where(.scope) :global(.landing-section) h2 { font-size: clamp(2rem, 8.5vw, 2.5rem); }
  :where(.scope) :global(.landing-heading) { margin-bottom: 2.5rem; }
  :where(.scope) :global(.landing-services) { grid-template-columns: 1fr; }
  :where(.scope) :global(.landing-materials), :where(.scope) :global(.landing-why), :where(.scope) :global(.landing-faq), :where(.scope) :global(.landing-contact) { grid-template-columns: 1fr; gap: 2.5rem; }
  :where(.scope) :global(.landing-terms), :where(.scope) :global(.landing-facts) dl { grid-template-columns: 1fr; }
  :where(.scope) :global(.landing-rules), :where(.scope) :global(.landing-facts) { padding: 1.5rem; }
  :where(.scope) :global(.landing-why-statement), :where(.scope) :global(.landing-faq) :global(.landing-heading) { position: static; }
  :where(.scope) :global(.landing-gallery) { grid-template-columns: 1fr; grid-auto-rows: 14rem; }
  :where(.scope) :global(.landing-gallery) li:first-child { grid-column: auto; grid-row: auto; }
  :where(.scope) :global(.landing-cta) { padding: 2.25rem 1.5rem; }
  :where(.scope) :global(.landing-contact-card) { padding: 1.5rem; }
  :where(.scope) :global(.landing-contact-card) dl > div { grid-template-columns: 5.5rem 1fr; }
  :where(.scope) :global(.landing-faq-list) details p { padding-right: 0; }
}
@media (prefers-reduced-motion: reduce) {
  :global(html):has(.scope) { scroll-behavior: auto; }
  :global(.cinematic-page):where(.scope)[data-motion="ready"] [data-reveal]:not([data-revealed]), :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.landing-steps):not([data-revealed]) li { opacity: 1; translate: none; filter: none; }
  :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.landing-steps):not([data-revealed])::after { transform: none; }
  :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.cinematic-copy), :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.cinematic-description), :global(.cinematic-page):where(.scope)[data-motion="ready"] :global(.cinematic-art) { transform: none; opacity: 1; }
}

/* Light theme for the shop sections. */
:global([data-theme="light"]) :where(.scope) :global(.landing-sticky) { background: #fffffff0; border-color: var(--line); box-shadow: 0 1rem 2.5rem #49321b1f; }
:global([data-theme="light"]) :where(.scope) :global(.landing-sticky) nav a:hover, :global([data-theme="light"]) :where(.scope) :global(.landing-sticky) nav a[aria-current] { background: var(--surface-2); }
:global([data-theme="light"]) :where(.scope) :global(.landing-sticky-cta) { background: #943c0d; color: #fff !important; }
:global([data-theme="light"]) :where(.scope) :global(.landing-sticky-cta):hover { background: #742e08; }
:global([data-theme="light"]) :where(.scope) :global(.landing-services) li:hover { border-color: #943c0d55; box-shadow: 0 1.25rem 2.5rem #49321b1a; }
:global([data-theme="light"]) :where(.scope) :global(.landing-service-icon) { background: #943c0d12; }
:global([data-theme="light"]) :where(.scope) :global(.landing-services) li:hover :global(.landing-service-icon) { background: #943c0d; color: #fff; }
:global([data-theme="light"]) :where(.scope) :global(.landing-gallery-placeholder) { background: repeating-linear-gradient(90deg, #00000006 0 2px, transparent 2px 6px), linear-gradient(135deg, #e9e3dc, #f7f4f0 45%, #ddd5cc); }
:global([data-theme="light"]) :where(.scope) :global(.landing-cta) { background: radial-gradient(ellipse 70% 60% at 15% 115%, #f8ad7155, transparent 70%), linear-gradient(160deg, #ffffff, #f0e8df); }
:global([data-theme="light"]) :where(.scope) :global(.landing-map-facade) { background: repeating-linear-gradient(45deg, #00000006 0 1px, transparent 1px 14px), var(--surface-2); }
:global([data-theme="light"]) :where(.scope) :global(.landing-step-dot) { border-color: #943c0d77; }
:global([data-theme="light"]) :where(.scope) :global(.landing-facts) { background: radial-gradient(ellipse 80% 70% at 100% 0%, #f8ad7133, transparent 70%), var(--card); }
```

### A4. Customer wireframe surface — src/features/customer/customer.module.css

```css
.root {
  --cust-bg: #060707;
  --cust-surface: #111313;
  --cust-surface-2: #191c1c;
  --cust-ink: #f4f4f1;
  --cust-muted: #a5aaa7;
  --cust-line: #343838;
  --cust-accent: #ff923f;
  --cust-tint: #241911;
  --cust-blue: #69d5d6;
  --cust-green: #52c480;
  --cust-red: #ef786f;
  --cust-action: #ff923f;
  --cust-action-hover: #ffaa66;
  --cust-link-hover: #ffaa66;
  --cust-focus: #ffb16d;
  --cust-on-danger: #121514;
  min-height: 100dvh;
  background: var(--cust-bg);
  color: var(--cust-ink);
  font: 400 1rem/1.65 var(--font-customer-thai), sans-serif;
  color-scheme: dark;
}
.root[data-customer-theme="dark"] {
  --cust-bg: #060707;
  --cust-surface: #111313;
  --cust-surface-2: #191c1c;
  --cust-ink: #f4f4f1;
  --cust-muted: #a5aaa7;
  --cust-line: #343838;
  --cust-accent: #ff923f;
  --cust-tint: #241911;
  --cust-blue: #69d5d6;
  --cust-green: #52c480;
  --cust-red: #ef786f;
  --cust-action: #ff923f;
  --cust-action-hover: #ffaa66;
  --cust-link-hover: #ffaa66;
  --cust-focus: #ffb16d;
  --cust-on-danger: #121514;
  color-scheme: dark;
}
.root[data-customer-theme="light"] {
  --cust-bg: #f6f3ef;
  --cust-surface: #ffffff;
  --cust-surface-2: #faf8f5;
  --cust-ink: #241d18;
  --cust-muted: #746b64;
  --cust-line: #ded8d1;
  --cust-accent: #954711;
  --cust-action: #df741e;
  --cust-action-hover: #ed8734;
  --cust-link-hover: #78380d;
  --cust-focus: #954711;
  --cust-on-danger: #ffffff;
  --cust-tint: #fff2e6;
  --cust-blue: #166c70;
  --cust-green: #1f7048;
  --cust-red: #ab3933;
  color-scheme: light;
}
.root *, .root *::before, .root *::after { box-sizing: border-box; }
.root :global(img), .root :global(video), .root :global(canvas) { max-width: 100%; height: auto; }
.root :global(::selection) { background: #ffb479; color: #160e08; }
.root :global(h1), .root :global(h2), .root :global(h3), .root :global(p) { margin: 0; }
.root :global(h1) { font-size: 1.75rem; line-height: 1.4; font-weight: 700; letter-spacing: -.02em; }
.root :global(h2) { font-size: 1.25rem; line-height: 1.5; font-weight: 650; }
.root :global(h3) { font-size: 1.0625rem; font-weight: 650; }
.root :global(a) { display: inline-flex; align-items: center; min-height: 44px; color: var(--cust-accent); text-decoration: none; text-underline-offset: 4px; }
.root :global(a:hover) { text-decoration: underline; color: var(--cust-link-hover); }
.root :global(button), .root :global(input), .root :global(textarea), .root :global(select) { font: inherit; }
.root :global(button), .root :global(summary) { min-height: 44px; cursor: pointer; }
.root :global(button) { border: 1px solid var(--cust-line); background: var(--cust-surface); color: var(--cust-ink); padding: 9px 16px; border-radius: 10px; transition: border-color .2s, background .2s; }
.root :global(button:hover:not(:disabled)) { border-color: var(--cust-accent); }
.root :global(.theme-quick-toggle) { padding: 0; }
.root :global(button:disabled) { cursor: not-allowed; color: var(--cust-muted); background: var(--cust-surface-2); border-color: var(--cust-line); opacity: 0.6; }
.root :global(:focus-visible) { outline: 2px solid var(--cust-focus); outline-offset: 3px; }
.root :global(input), .root :global(textarea), .root :global(select) { width: 100%; min-height: 48px; background: var(--cust-surface); color: var(--cust-ink); border: 1px solid var(--cust-line); border-radius: 8px; padding: 10px 12px; caret-color: var(--cust-accent); transition: border-color .2s; }
.root :global(input:focus), .root :global(textarea:focus), .root :global(select:focus) { border-color: var(--cust-accent); outline: none; }
.root :global(input::placeholder), .root :global(textarea::placeholder) { color: var(--cust-muted); opacity: 1; }
.root :global(textarea) { resize: vertical; min-height: 110px; }
.root :global(input[type="checkbox"]), .root :global(input[type="radio"]) { width: 20px; height: 20px; min-height: 20px; flex: 0 0 20px; accent-color: var(--cust-accent); }
.root :global(.cust-primary) { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 11px 20px; border-radius: 10px; font-weight: 600; border: 0; background: var(--cust-action); color: #121514; text-decoration: none; transition: background .2s, transform .2s; }
.root :global(.cust-primary:hover) { background: var(--cust-action-hover); color: #121514; text-decoration: none; }
.root :global(.cust-danger) { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 11px 20px; border-radius: 10px; font-weight: 600; border: 0; background: var(--cust-red); color: var(--cust-on-danger); text-decoration: none; transition: opacity .2s; }
.root :global(.cust-danger:hover) { opacity: .9; }
.root :global(.cust-link) { display: inline-flex; align-items: center; gap: 8px; border: 0; background: transparent; color: var(--cust-accent); padding: 8px 0; min-height: 44px; }
.root :global(.cust-muted), .root :global(small) { color: var(--cust-muted); }
.root :global(.cust-small) { font-size: .875rem; }
.root :global(.cust-skip) { position: fixed; top: -100px; left: 16px; z-index: 100; background: var(--cust-surface); padding: 12px; }
.root :global(.cust-skip:focus) { top: 8px; }
.root :global(.cust-sidebar) { position: fixed; inset: 0 auto 0 0; z-index: 25; width: 17rem; height: 100dvh; padding: 1.5rem 1.125rem 1.25rem; display: flex; flex-direction: column; background: var(--cust-bg); border-right: 1px solid var(--cust-line); }
.root :global(.cust-sidebar-scroll) { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; scrollbar-color: var(--cust-line) transparent; }
.root :global(.cust-sidebar-space) { margin: 1.25rem 0 1rem; padding: 0.75rem 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; border: 1px solid var(--cust-line); border-radius: 0.75rem; background: var(--cust-surface-2); }
.root :global(.cust-sidebar-space span) { color: var(--cust-accent); font-size: 0.625rem; font-weight: 700; letter-spacing: .16em; }
.root :global(.cust-sidebar-space strong) { color: var(--cust-ink); font-size: 0.8125rem; font-weight: 650; }
.root :global(.cust-sidebar-nav) { display: flex; flex-direction: column; gap: 0.25rem; }
.root :global(.cust-sidebar-label) { display: block; padding: 0.875rem 0.625rem 0.375rem; color: var(--cust-muted); font-size: 0.6875rem; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.root :global(.cust-sidebar-nav a), .root :global(.cust-mobile-menu nav a) { width: 100%; min-height: 44px; padding: 0 0.6875rem; display: grid; grid-template-columns: 2rem 1fr; align-items: center; gap: 0.5rem; border: 1px solid transparent; border-radius: 0.625rem; background: transparent; color: var(--cust-muted); text-decoration: none; font-size: 0.875rem; font-weight: 550; transition: background .2s, color .2s, border-color .2s; }
.root :global(.cust-sidebar-nav a:hover), .root :global(.cust-mobile-menu nav a:hover) { color: var(--cust-ink); background: var(--cust-surface-2); text-decoration: none; }
.root :global(.cust-sidebar-nav a[aria-current="page"]), .root :global(.cust-mobile-menu nav a[aria-current="page"]) { color: var(--cust-ink); border-color: var(--cust-line); background: var(--cust-tint); font-weight: 700; }
.root :global(.cust-sidebar-nav a[aria-current="page"] .cust-nav-icon), .root :global(.cust-mobile-menu nav a[aria-current="page"] .cust-nav-icon) { color: var(--cust-accent); }
.root :global(.cust-nav-icon) { display: grid; place-items: center; width: 1.75rem; height: 1.75rem; border-radius: 0.375rem; color: var(--cust-muted); }
.root :global(.cust-sidebar-footer) { margin-top: auto; padding-top: 1rem; border-top: 1px solid var(--cust-line); display: grid; grid-template-columns: 2.25rem 1fr 2.75rem; align-items: center; gap: 0.625rem; }
.root :global(.cust-sidebar-footer .cust-avatar) { width: 2.25rem; height: 2.25rem; font-size: 0.8125rem; }
.root :global(.cust-sidebar-footer > div) { min-width: 0; display: flex; flex-direction: column; }
.root :global(.cust-sidebar-footer strong) { font-size: 0.8125rem; color: var(--cust-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.root :global(.cust-sidebar-footer span) { font-size: 0.6875rem; color: var(--cust-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.root :global(.cust-sidebar-footer button) { min-height: 44px; width: 44px; padding: 0; display: grid; place-items: center; background: transparent; border: 1px solid transparent; border-radius: 0.5rem; color: var(--cust-muted); }
.root :global(.cust-sidebar-footer button:hover) { color: var(--cust-red); border-color: var(--cust-line); background: var(--cust-surface-2); }
.root :global(.cust-stage) { min-height: 100dvh; margin-left: 17rem; width: calc(100% - 17rem); max-width: calc(100% - 17rem); min-width: 0; display: flex; flex-direction: column; }
.root :global(.cust-topbar) { position: sticky; top: 0; z-index: 20; height: 64px; width: 100%; padding: 0 clamp(1rem, 2.5vw, 2.5rem); display: flex; align-items: center; justify-content: space-between; background: var(--cust-bg); border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-topbar-env) { display: flex; align-items: center; gap: 16px; font-size: .8125rem; color: var(--cust-muted); min-width: 0; flex-wrap: wrap; }
.root :global(.cust-topbar-actions) { display: flex; align-items: center; gap: 16px; flex-shrink: 0; }
.root :global(.cust-navbar) { display: none; }
.root :global(.cust-nav-inner) { width: 100%; max-width: 100%; margin: 0; padding: 0 clamp(1rem, 2.5vw, 2.5rem); min-height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.root :global(.brand) { flex-shrink: 0; width: auto; cursor: pointer; border: 0; padding: 0; background: transparent; color: var(--cust-ink); display: inline-flex; align-items: center; gap: 0.6875rem; font-family: var(--font-geist-sans), sans-serif; }
.root :global(.brand b) { color: var(--cust-ink); font-size: 1rem; letter-spacing: .18em; }
.root :global(.brand small) { color: var(--cust-muted); font-size: 0.5rem; letter-spacing: .2em; display: block; }
.root :global(.brand-mark) { position: relative; width: 1.8125rem; height: 1.8125rem; border-radius: 0.5rem; background: var(--cust-action); transform: rotate(45deg); box-shadow: 0 0 1.75rem rgba(255,146,63,.2); flex-shrink: 0; }
.root :global(.brand-mark):before, .root :global(.brand-mark):after { content: ""; position: absolute; background: #121514; border-radius: 0.1875rem; }
.root :global(.brand-mark):before { width: 0.8125rem; height: 0.25rem; left: 0.5rem; top: 0.75rem; }
.root :global(.brand-mark):after { width: 0.25rem; height: 0.8125rem; left: 0.75rem; top: 0.5rem; }
.root :global(.cust-nav-actions) { display: flex; align-items: center; gap: 16px; }
.root :global(.cust-avatar) { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; background: var(--cust-tint); color: var(--cust-accent); font-weight: 650; }
.root :global(.cust-bell) { display: grid; place-items: center; position: relative; width: 44px; height: 44px; padding: 8px; border: 0; background: transparent; }
.root :global(.cust-bell > span) { position: absolute; top: -2px; right: -7px; min-width: 21px; padding: 0 4px; border-radius: 12px; background: var(--cust-action); color: #121514; font-weight: 700; font-size: .75rem; }
.root :global(.cust-menu-toggle) { display: none; }
.root :global(.cust-environment) { display: none; }
.root :global(.cust-mobile-user) { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid var(--cust-line); margin-bottom: 12px; }
.root :global(.cust-mobile-user > div) { min-width: 0; overflow-wrap: anywhere; }
.root :global(.cust-mobile-user .cust-avatar) { flex-shrink: 0; }
.root :global(.cust-mobile-user strong) { display: block; font-size: 0.9375rem; color: var(--cust-ink); }
.root :global(.cust-mobile-user small) { color: var(--cust-muted); font-size: 0.8125rem; }
.root :global(.cust-mobile-actions) { flex-shrink: 0; padding: 12px max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); border-top: 1px solid var(--cust-line); }
.root :global(.cust-mobile-actions button) { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 48px; color: var(--cust-red); background: transparent; }
.root :global(.cust-main) { width: 100%; max-width: 100%; box-sizing: border-box; min-height: calc(100dvh - 180px); padding: clamp(1.25rem, 2.5vw, 2.5rem) clamp(1rem, 2.5vw, 2.5rem) 4rem; margin: 0; }
.root :global(.cust-heading) { margin-bottom: 32px; }
.root :global(.cust-heading > div) { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.root :global(.cust-heading p) { margin-top: 8px; color: var(--cust-muted); max-width: 65ch; }
.root :global(.cust-back) { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-bottom: 12px; }
.root :global(.cust-back svg) { transform: rotate(180deg); }
.root :global(.cust-overview-grid) { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: clamp(1.5rem, 2.5vw, 3rem); align-items: start; }
.root :global(.cust-overview-grid > section > h2) { margin-bottom: 16px; }
.root :global(.cust-attention) { background: var(--cust-surface); padding: clamp(1.25rem, 2vw, 2rem); border: 1px solid var(--cust-line); border-radius: 16px; }
.root :global(.cust-label) { display: inline-flex; align-items: center; gap: 8px; font-size: .875rem; color: var(--cust-accent); }
.root :global(.cust-attention h3) { font-size: 1.5rem; margin-top: 16px; overflow-wrap: anywhere; }
.root :global(.cust-attention > p) { margin-top: 12px; }
.root :global(.cust-due) { padding: 16px 0; }
.root :global(.cust-due strong) { display: block; font-size: 1.25rem; }
.root :global(.cust-attention > a) { margin-top: 24px; }
.root :global(.cust-section) { margin-top: 36px; }
.root :global(.cust-action-row) { display: flex; gap: 16px; padding: 20px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-action-row > svg) { margin-top: 5px; flex-shrink: 0; color: var(--cust-accent); }
.root :global(.cust-action-row p) { color: var(--cust-muted); margin: 4px 0; overflow-wrap: anywhere; }
.root :global(.cust-action-row a) { display: inline-flex; gap: 8px; align-items: center; min-height: 44px; }
.root :global(.cust-toolbar) { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.root :global(.cust-recent-row) { display: grid; gap: 12px; padding: 24px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-recent-row a) { display: block; color: var(--cust-ink); overflow-wrap: anywhere; }
.root :global(.cust-recent-row a > *) { display: block; }
.root :global(.cust-recent-row a > span) { color: var(--cust-muted); font-size: .875rem; }
.root :global(.cust-badge) { display: inline-flex; width: fit-content; align-items: center; gap: 7px; padding: 4px 10px; border-radius: 6px; background: var(--cust-surface-2); border: 1px solid var(--cust-line); color: var(--cust-muted); font-size: .875rem; font-weight: 550; }
.root :global(.cust-badge.success) { color: var(--cust-green); border-color: color-mix(in srgb, var(--cust-green) 35%, var(--cust-surface)); background: color-mix(in srgb, var(--cust-green) 10%, var(--cust-surface)); }
.root :global(.cust-badge.info) { color: var(--cust-blue); border-color: color-mix(in srgb, var(--cust-blue) 35%, var(--cust-surface)); background: color-mix(in srgb, var(--cust-blue) 10%, var(--cust-surface)); }
.root :global(.cust-badge.danger) { color: var(--cust-red); border-color: color-mix(in srgb, var(--cust-red) 35%, var(--cust-surface)); background: color-mix(in srgb, var(--cust-red) 10%, var(--cust-surface)); }
.root :global(.cust-status-dot) { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.root :global(.cust-page-end) { display: flex; justify-content: space-between; align-items: center; gap: 16px; color: var(--cust-muted); font-size: .875rem; margin-top: 48px; }
.root :global(.cust-alert) { padding: 16px; border: 1px solid var(--cust-line); border-radius: 10px; margin: 16px 0; background: var(--cust-surface); overflow-wrap: anywhere; }
.root :global(.cust-alert.danger) { color: var(--cust-red); }
.root :global(.cust-alert.success) { color: var(--cust-green); }
.root :global(.cust-alert button) { margin-top: 8px; }
.root :global(.cust-empty) { padding: 40px 24px; text-align: center; color: var(--cust-muted); }
.root :global(.cust-empty h2) { color: var(--cust-ink); margin: 16px 0 8px; }
.root :global(.cust-empty > a) { margin-top: 20px; }
.root :global(.cust-loading) { padding: 16px 0; color: var(--cust-muted); display: flex; align-items: center; gap: 12px; }
.root :global(.cust-loading > span) { width: 48px; height: 8px; border-radius: 4px; background: var(--cust-line); }
.root :global(.cust-tabs) { display: flex; gap: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--cust-line); overflow-x: auto; scrollbar-width: thin; }
.root :global(.cust-tabs > a), .root :global(.cust-tabs > button) { display: flex; align-items: center; min-height: 48px; padding: 8px 0; border: 0; border-bottom: 2px solid transparent; border-radius: 0; background: transparent; white-space: nowrap; color: var(--cust-muted); }
.root :global(.cust-tabs [aria-current="page"]), .root :global(.cust-tabs [aria-pressed="true"]) { color: var(--cust-accent); border-bottom-color: var(--cust-accent); font-weight: 650; }
.root :global(.cust-notification-dialog) { margin: 92px clamp(1rem, 2.5vw, 2.5rem) 0 auto; padding: 0; border: 1px solid var(--cust-line); border-radius: 14px; width: min(430px, calc(100% - 2rem)); max-width: 92vw; max-height: calc(100dvh - 116px); color: var(--cust-ink); background: var(--cust-surface); }
.root :global(.cust-notification-dialog::backdrop) { background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px); }
.root :global(.cust-inbox-panel) { display: flex; flex-direction: column; padding: 20px; max-height: calc(100dvh - 116px); }
.root :global(.cust-inbox-panel .cust-toolbar) { gap: 8px; }
.root :global(.cust-inbox-panel > .cust-small) { margin: 12px 0; }
.root :global(.cust-notification-scroll) { min-height: 0; max-height: 52dvh; overflow-y: auto; scrollbar-color: var(--cust-muted) var(--cust-bg); }
.root :global(.cust-notification-page) { width: 100%; max-width: min(100%, 880px); margin: 0 auto; }
.root :global(.cust-notification-page .cust-notification-scroll) { max-height: none; }
.root :global(.cust-group-title) { font-size: .875rem; color: var(--cust-muted); padding: 20px 4px 8px; }
.root :global(.cust-notification) { display: flex; gap: 12px; padding: 16px 8px; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-notification.unread) { background: var(--cust-tint); border-radius: 8px; }
.root :global(.cust-notice-icon) { flex-shrink: 0; color: var(--cust-accent); padding-top: 4px; }
.root :global(.cust-notification > div) { min-width: 0; flex: 1; }
.root :global(.cust-notification a) { display: block; color: var(--cust-ink); overflow-wrap: anywhere; }
.root :global(.cust-notification strong) { display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: .875rem; }
.root :global(.cust-notification time) { color: var(--cust-muted); font-size: .875rem; }
.root :global(.cust-unread-dot) { background: var(--cust-accent); width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 10px; }
.root :global(.cust-notification details) { position: relative; }
.root :global(.cust-notification summary) { display: grid; place-items: center; min-width: 44px; }
.root :global(.cust-notification details > div) { position: absolute; right: 0; min-width: 220px; padding: 8px; z-index: 1; background: var(--cust-surface); border: 1px solid var(--cust-line); border-radius: 10px; }
.root :global(.cust-notification details button) { display: block; width: 100%; text-align: left; border: 0; }
.root :global(.cust-load-more) { display: block; margin: 16px auto; }
.root :global(.cust-inbox-footer) { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; border-top: 1px solid var(--cust-line); margin-top: 16px; }
.root :global(.cust-inbox-panel > .cust-toolbar), .root :global(.cust-inbox-panel > .cust-tabs), .root :global(.cust-inbox-footer), .root :global(.cust-notification-help) { flex-shrink: 0; }
.root :global(.cust-notification-help summary) { display: flex; align-items: center; color: var(--cust-muted); font-size: .875rem; }
.root :global(.cust-mobile-menu) { position: fixed; inset: 0; margin: 0; width: 100%; max-width: 100%; height: 100dvh; max-height: 100dvh; border: 0; border-radius: 0; padding: 0; overflow: hidden; background: var(--cust-bg); color: var(--cust-ink); }
.root :global(.cust-mobile-menu[open]) { display: flex; flex-direction: column; animation: customer-menu-enter 180ms cubic-bezier(.16, 1, .3, 1); }
.root :global(.cust-mobile-menu::backdrop) { background: var(--cust-bg); }
.root :global(.cust-mobile-header) { flex-shrink: 0; margin: 0; padding: max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left)); border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-mobile-header button) { width: 44px; height: 44px; display: grid; place-items: center; padding: 8px; }
.root :global(.cust-mobile-scroll) { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 max(16px, env(safe-area-inset-right)) 16px max(16px, env(safe-area-inset-left)); scrollbar-width: thin; scrollbar-color: var(--cust-muted) var(--cust-bg); }
.root :global(.cust-mobile-menu nav) { display: grid; gap: 4px; }
.root :global(.cust-mobile-menu nav a) { min-height: 48px; padding: 10px 12px; color: var(--cust-ink); overflow-wrap: anywhere; }
@keyframes customer-menu-enter { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.root :global(.cust-footer) { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; padding: 1.5rem clamp(1rem, 2.5vw, 2.5rem); width: 100%; max-width: 100%; box-sizing: border-box; margin: auto 0 0 0; border-top: 1px solid var(--cust-line); color: var(--cust-muted); font-size: .875rem; }
.root :global(.cust-field) { display: grid; gap: 8px; margin-bottom: 20px; font-weight: 550; }
.root :global(.cust-field small) { font-weight: 400; font-size: .875rem; }
.root :global(.cust-actions) { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-top: 24px; }
.root :global(.cust-pagination) { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 32px; }
.root :global(.cust-disclosure) { border-top: 1px solid var(--cust-line); padding: 12px 0; margin-top: 24px; }
.root :global(.cust-disclosure > summary) { display: flex; align-items: center; color: var(--cust-accent); }
.root :global(.cust-checkbox) { display: flex; gap: 12px; align-items: flex-start; min-height: 44px; margin-top: 20px; }
.root :global(.cust-checkbox input) { margin-top: 4px; }
.root :global(.cust-confirm) { padding: 24px; background: var(--cust-tint); border: 1px solid var(--cust-line); border-radius: 12px; margin: 24px 0; }
.root :global(fieldset) { border: 0; padding: 0; margin: 0; min-width: 0; }
.root :global(.cust-filters) { display: grid; grid-template-columns: minmax(0, 2fr) minmax(180px, 1fr) auto; align-items: end; gap: 16px; margin-bottom: 24px; }
.root :global(.cust-filters .cust-field) { margin: 0; }
.root :global(.cust-filter-result) { margin: 16px 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.root :global(.cust-request-head), .root :global(.cust-request-row) { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(150px, auto); gap: clamp(1rem, 1.5vw, 1.5rem); align-items: center; }
.root :global(.cust-request-head) { padding: 16px 0; font-size: .875rem; color: var(--cust-muted); border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-request-row) { padding: 24px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-request-row time) { font-size: .875rem; color: var(--cust-muted); }
.root :global(.cust-request-row p) { margin-top: 8px; }
.root :global(.cust-record-title) { display: grid; color: var(--cust-ink); gap: 4px; overflow-wrap: anywhere; }
.root :global(.cust-record-title small) { font-size: .875rem; }
.root :global(.cust-document), .root :global(.cust-form-surface) { background: var(--cust-surface); border: 1px solid var(--cust-line); padding: clamp(1.25rem, 2vw, 2rem); border-radius: 12px; min-width: 0; }
.root :global(.cust-document > h2), .root :global(.cust-form-surface > h2) { margin-bottom: 24px; }
.root :global(.cust-definition) { margin: 24px 0; }
.root :global(.cust-definition > div) { display: grid; grid-template-columns: minmax(120px, 180px) minmax(0, 1fr); gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-definition dt) { color: var(--cust-muted); }
.root :global(.cust-definition dd) { margin: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
.root :global(.cust-definition dd small) { display: block; }
.root :global(.cust-detail-grid), .root :global(.cust-quotation-layout) { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 440px); gap: clamp(1.5rem, 2vw, 2.5rem); align-items: start; }
.root :global(.cust-side-summary) { padding: clamp(1.25rem, 2vw, 1.5rem); background: var(--cust-surface); border: 1px solid var(--cust-line); border-radius: 12px; position: sticky; top: 104px; }
.root :global(.cust-side-summary .cust-definition > div) { grid-template-columns: 1fr; gap: 4px; }
.root :global(.cust-side-summary > *) + :global(*) { margin-top: 16px; }
.root :global(.cust-file-row), .root :global(.cust-file-list li) { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-file-row > span), .root :global(.cust-file-list span) { min-width: 0; overflow-wrap: anywhere; }
.root :global(.cust-file-row small), .root :global(.cust-file-list small) { display: block; }
.root :global(.cust-history-row) { padding: 16px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-history-row p) { margin: 6px 0; overflow-wrap: anywhere; }
.root :global(.cust-stepper) { display: flex; list-style: none; padding: 0; margin: 0 0 32px; gap: clamp(12px, 2vw, 24px); overflow-x: auto; scrollbar-width: none; }
.root :global(.cust-stepper li) { display: flex; align-items: center; gap: 8px; color: var(--cust-muted); flex-shrink: 0; }
.root :global(.cust-stepper span) { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; background: var(--cust-surface); border: 1px solid var(--cust-line); }
.root :global(.cust-stepper [aria-current="step"]) { color: var(--cust-accent); font-weight: 650; }
.root :global(.cust-stepper [aria-current="step"] span) { background: var(--cust-action); color: #121514; border: 0; font-weight: 700; }
.root :global(.cust-stepper .done span) { border-color: var(--cust-green); color: var(--cust-green); }
.root :global(.cust-wizard-grid) { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(300px, 420px); gap: clamp(1.5rem, 2.5vw, 2.5rem); align-items: start; }
.root :global(.cust-wizard-summary) { padding: 24px 0; position: sticky; top: 104px; }
.root :global(.cust-file-list) { padding: 0; list-style: none; }
.root :global(.cust-document-row) { display: flex; justify-content: space-between; align-items: center; gap: clamp(1rem, 2vw, 2rem); padding: 28px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-document-row h2) { margin: 8px 0 12px; overflow-wrap: anywhere; }
.root :global(.cust-document-action) { flex-shrink: 0; text-align: right; }
.root :global(.cust-price-panel) { background: var(--cust-surface); border: 1px solid var(--cust-line); padding: clamp(1.25rem, 2vw, 2rem); border-radius: 12px; position: sticky; top: 104px; }
.root :global(.cust-price-panel > p) { margin-top: 16px; }
.root :global(.cust-price-panel > section) { margin: 24px 0; padding-top: 24px; border-top: 1px solid var(--cust-line); }
.root :global(.cust-hero-price) { display: block; font-size: clamp(1.5rem, 2.5vw, 2rem); margin-top: 8px; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.root :global(.cust-terms-list) { padding-left: 20px; }
.root :global(.cust-terms-list li) { margin: 10px 0; }
.root :global(.cust-decision-bar) { display: grid; gap: 12px; margin-top: 24px; }
.root :global(.cust-preserve) { white-space: pre-wrap; overflow-wrap: anywhere; }
.root :global(.cust-checklist) { list-style: none; padding: 0; margin: 20px 0; }
.root :global(.cust-checklist li) { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding: 12px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-upload) { padding: 24px; border: 1px dashed var(--cust-line); border-radius: 12px; margin: 24px 0; background: var(--cust-surface-2); }
.root :global(.cust-upload .cust-field) { margin-top: 16px; }
.root :global(.cust-upload > button) { margin-top: 16px; }
.root :global(.cust-upload input) { max-width: 100%; padding: 8px; font-size: .875rem; }
.root :global(.cust-list-filter) { width: 100%; max-width: min(100%, 360px); }
.root :global(.cust-job-row) { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: clamp(1.5rem, 2vw, 2rem); padding: 28px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-job-row h2) { margin: 8px 0 12px; overflow-wrap: anywhere; }
.root :global(.cust-job-row p) { margin-top: 8px; }
.root :global(.cust-job-action) { text-align: right; align-self: center; }
.root :global(.cust-job-detail) { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, 440px); gap: clamp(1.5rem, 2.5vw, 2.5rem); align-items: start; }
.root :global(.cust-job-summary) { display: grid; gap: 32px; }
.root :global(.cust-job-summary > section) { padding-bottom: 24px; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-job-summary p), .root :global(.cust-job-summary .cust-badge), .root :global(.cust-job-summary .cust-primary) { margin-top: 12px; }
.root :global(.cust-timeline) { list-style: none; padding: 0; margin: 32px 0; }
.root :global(.cust-timeline li) { display: flex; gap: 20px; position: relative; padding: 0 0 36px; color: var(--cust-muted); }
.root :global(.cust-timeline li:not(:last-child))::after { content: ""; position: absolute; width: 1px; background: var(--cust-line); top: 42px; left: 20px; bottom: 0; }
.root :global(.cust-timeline-point) { width: 42px; height: 42px; display: grid; place-items: center; border: 1px solid var(--cust-line); border-radius: 50%; flex-shrink: 0; }
.root :global(.cust-timeline .current) { color: var(--cust-accent); }
.root :global(.cust-timeline .done) { color: var(--cust-green); }
.root :global(.cust-timeline .current .cust-timeline-point) { background: var(--cust-tint); border-color: var(--cust-accent); }
.root :global(.cust-timeline p) { font-size: .875rem; margin-top: 4px; }
.root :global(.cust-inspection-layout) { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(300px, 420px); gap: clamp(1.5rem, 2.5vw, 2.5rem); align-items: start; }
.root :global(.cust-inspection-decision) { padding: 24px 0; }
.root :global(.cust-inspection-decision p) { margin: 12px 0; }
.root :global(.cust-inspection-decision .cust-primary), .root :global(.cust-inspection-decision .cust-danger) { display: flex; width: 100%; margin-top: 24px; }
.root :global(.cust-inspection-decision fieldset > .cust-link) { margin-top: 12px; }
.root :global(.cust-account-layout) { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1.8fr); gap: clamp(1.5rem, 3.5vw, 4rem); align-items: start; }
.root :global(.cust-account-profile) { padding: 24px 0; }
.root :global(.cust-profile-avatar) { width: 72px; height: 72px; display: grid; place-items: center; font-size: 1.75rem; background: var(--cust-tint); color: var(--cust-accent); border-radius: 50%; margin-bottom: 16px; }
.root :global(.cust-membership) { padding: 24px 0; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-membership p) { color: var(--cust-muted); margin-top: 8px; }
.root :global(.cust-narrow) { width: 100%; max-width: min(100%, 720px); margin: 0; }
.root :global(.cust-narrow > p), .root :global(.cust-narrow > button) { margin-top: 20px; }
.root :global(.cust-secret) { padding: 24px; background: var(--cust-surface-2); border: 1px dashed var(--cust-line); border-radius: 10px; margin: 24px 0; }
.root :global(.cust-secret output) { display: block; overflow-wrap: anywhere; margin-top: 16px; user-select: all; }
.root :global(.cust-settings-layout) { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: clamp(1.5rem, 3vw, 3rem); align-items: start; }
.root :global(.cust-preference) { padding-bottom: 24px; margin-bottom: 24px; border-bottom: 1px solid var(--cust-line); }
.root :global(.cust-preference legend) { font-size: 1.25rem; margin-bottom: 16px; font-weight: 650; }
.root :global(.cust-preference label) { display: flex; align-items: center; gap: 12px; min-height: 48px; cursor: pointer; }
.root :global(.cust-settings-preview) { padding: clamp(1.25rem, 2vw, 2rem); background: var(--cust-surface); border: 1px solid var(--cust-line); border-radius: 12px; }
.root :global(.cust-settings-preview h3) { margin-top: 24px; }
.root :global(.cust-settings-preview p), .root :global(.cust-settings-preview .cust-badge) { margin-top: 16px; }

.root :global(.cust-overview-grid > *),
.root :global(.cust-detail-grid > *),
.root :global(.cust-quotation-layout > *),
.root :global(.cust-wizard-grid > *),
.root :global(.cust-job-row > *),
.root :global(.cust-job-detail > *),
.root :global(.cust-inspection-layout > *),
.root :global(.cust-account-layout > *),
.root :global(.cust-settings-layout > *),
.root :global(.cust-filters > *),
.root :global(.cust-request-row > *),
.root :global(.cust-document-row > *) {
  min-width: 0;
}

@media (max-width: 1024px) {
  .root :global(.cust-sidebar) { display: none; }
  .root :global(.cust-topbar) { display: none; }
  .root :global(.cust-stage) { margin-left: 0; width: 100%; max-width: 100%; }
  .root :global(.cust-navbar) { display: block; position: sticky; top: 0; z-index: 30; width: 100%; background: var(--cust-bg); border-bottom: 1px solid var(--cust-line); }
  .root :global(.cust-nav-inner) { width: 100%; max-width: 100%; padding: 0 clamp(1rem, 2.5vw, 2.5rem); min-height: 72px; }
  .root :global(.cust-nav-actions) { margin-left: auto; gap: 12px; }
  .root :global(.cust-menu-toggle) { display: grid; place-items: center; width: 44px; height: 44px; padding: 8px; border: 1px solid var(--cust-line); border-radius: 8px; background: var(--cust-surface-2); color: var(--cust-ink); }
  .root :global(.cust-environment) { display: flex; align-items: center; gap: 16px; width: 100%; max-width: 100%; margin: 0; padding: 12px clamp(1rem, 2.5vw, 2.5rem) 0; font-size: .8125rem; color: var(--cust-muted); }
}

@media (max-width: 880px) {
  .root :global(.cust-overview-grid) { grid-template-columns: minmax(0, 1fr); gap: 32px; }
  .root :global(.cust-detail-grid),
  .root :global(.cust-quotation-layout),
  .root :global(.cust-wizard-grid),
  .root :global(.cust-job-detail),
  .root :global(.cust-inspection-layout),
  .root :global(.cust-account-layout),
  .root :global(.cust-settings-layout) {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .root :global(.cust-detail-grid > .cust-side-summary),
  .root :global(.cust-quotation-layout > .cust-price-panel) {
    grid-row: 1;
    position: static;
  }
  .root :global(.cust-wizard-summary),
  .root :global(.cust-price-panel),
  .root :global(.cust-side-summary) {
    position: static;
  }
  .root :global(.cust-job-row) { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .root :global(.cust-job-action) { text-align: left; }
  .root :global(.cust-filters) { grid-template-columns: minmax(0, 1fr) minmax(160px, auto) auto; }
}

@media (max-width: 640px) {
  .root :global(.cust-nav-inner) { min-height: 64px; padding: 0 1rem; }
  .root :global(.cust-environment) { padding: 8px 1rem 0; flex-direction: column; align-items: flex-start; gap: 6px; }
  .root :global(.cust-main) { padding: 1.25rem 1rem 2.5rem; }
  .root :global(.cust-heading > div) { align-items: flex-start; flex-direction: column; gap: 16px; }
  .root :global(.cust-heading > div > .cust-primary) { width: 100%; }
  .root :global(.cust-attention) { padding: 1.25rem; }
  .root :global(.cust-attention .cust-primary) { width: 100%; }
  .root :global(.cust-page-end) { align-items: flex-start; flex-direction: column; gap: 12px; }
  .root :global(.cust-footer) { padding: 1.5rem 1rem; flex-direction: column; }
  .root :global(.cust-notification-dialog) { inset: 0; margin: 0; width: 100%; max-width: 100%; height: 100dvh; max-height: 100dvh; border: 0; border-radius: 0; }
  .root :global(.cust-inbox-panel) { padding: 1rem; max-height: 100dvh; height: 100dvh; }
  .root :global(.cust-inbox-panel .cust-notification-scroll) { max-height: calc(100dvh - 280px); }
  .root :global(.cust-tabs) { gap: 16px; }
  .root :global(.cust-filters) { grid-template-columns: 1fr; gap: 12px; }
  .root :global(.cust-filters .cust-primary) { width: 100%; }
  .root :global(.cust-request-head) { display: none; }
  .root :global(.cust-request-row) { grid-template-columns: 1fr; gap: 12px; padding: 18px 0; }
  .root :global(.cust-document), .root :global(.cust-form-surface), .root :global(.cust-price-panel), .root :global(.cust-side-summary) { padding: 1.25rem; }
  .root :global(.cust-definition > div) { grid-template-columns: 1fr; gap: 4px; }
  .root :global(.cust-stepper) { gap: 6px; justify-content: space-between; }
  .root :global(.cust-stepper li) { flex-direction: column; font-size: .75rem; gap: 4px; text-align: center; }
  .root :global(.cust-wizard-summary) { padding: 16px 0; border-top: 1px solid var(--cust-line); }
  .root :global(.cust-wizard-grid .cust-actions .cust-primary) { flex: 1; width: 100%; }
  .root :global(.cust-document-row) { align-items: stretch; flex-direction: column; gap: 16px; padding: 20px 0; }
  .root :global(.cust-document-action) { text-align: left; }
  .root :global(.cust-decision-bar) { position: fixed; bottom: 0; left: 0; right: 0; width: 100%; max-width: 100%; box-sizing: border-box; z-index: 20; background: var(--cust-surface); padding: 12px 16px max(12px, env(safe-area-inset-bottom)); border-top: 1px solid var(--cust-line); gap: 6px; }
  .root :global(.cust-main:has(.cust-decision-bar)) { padding-bottom: 180px; }
  .root :global(.cust-inspection-decision), .root :global(.cust-account-profile), .root :global(.cust-settings-preview) { padding: 16px 0; }
}

@media (prefers-reduced-motion: reduce) {
  .root *, .root *::before, .root *::after { scroll-behavior: auto; transition: none; animation: none; }
  .root :global(.cust-mobile-menu[open]) { animation: none; }
}
.root :global(.cust-related-links) { display: grid; justify-items: start; gap: 8px; }
```

### A5. Request list presentation — src/features/customer/customer-requests.module.css

```css
.list { min-width: 0; }
.list a:global(.cust-primary):hover { color: #121514; }
.list .searchForm { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; gap: 16px; margin-bottom: 24px; }
.list .searchForm > label { margin: 0; }
.list .searchForm > button { min-height: 48px; }
.list .statusFilters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.list .statusFilters a { min-height: 44px; gap: 10px; padding: 8px 14px; border-radius: 999px; color: var(--cust-muted); background: var(--cust-surface); text-decoration: none; font-size: .875rem; }
.list .statusFilters a:hover { background: var(--cust-surface-2); color: var(--cust-ink); }
.list .statusFilters a[aria-current="page"] { background: var(--cust-tint); color: var(--cust-accent); font-weight: 650; }
.list .count { min-width: 24px; padding: 0 6px; border-radius: 999px; background: var(--cust-surface-2); color: var(--cust-ink); text-align: center; font-variant-numeric: tabular-nums; }
.list .visuallyHidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.list .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin-top: 24px; }
.list .card { position: relative; min-width: 0; display: flex; flex-direction: column; padding: 24px; border-radius: 16px; background: var(--cust-surface); box-shadow: 0 4px 16px rgba(0, 0, 0, .12); transition: box-shadow 180ms ease-out; }
.list .card:hover { box-shadow: 0 8px 24px rgba(0, 0, 0, .18); }
.list .card:has(.openCard:focus-visible) { outline: 2px solid var(--cust-focus); outline-offset: 3px; }
.list .cardHeader { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.list .cardHeader > div { min-width: 0; }
.list .cardHeader strong { display: block; color: var(--cust-ink); font-size: 1.0625rem; overflow-wrap: anywhere; font-variant-numeric: tabular-nums; }
.list .cardHeader > svg { flex-shrink: 0; color: var(--cust-muted); }
.list .metaLabel { display: block; color: var(--cust-muted); font-size: .875rem; }
.list .cardTitle { margin: 16px 0 12px; font-size: 1.125rem; line-height: 1.5; font-weight: 650; }
.list .openCard { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--cust-ink); overflow-wrap: anywhere; text-decoration: none; }
.list .openCard:hover { color: var(--cust-ink); text-decoration: none; }
.list .openCard:focus-visible { outline: none; }
.list .openCard::after { content: ""; position: absolute; inset: 0; border-radius: 16px; }
.list .card :global(.cust-badge) { border-radius: 999px; }
.list .dates { display: grid; gap: 16px; margin: 24px 0 20px; }
.list .dates dt { display: flex; align-items: center; gap: 10px; color: var(--cust-muted); font-size: .875rem; }
.list .dates dt svg { flex-shrink: 0; }
.list .dates dd { margin: 4px 0 0 26px; color: var(--cust-ink); font-size: .9375rem; overflow-wrap: anywhere; }
.list .dates small { display: block; margin-top: 4px; font-size: .8125rem; }
.list .nextStep { padding-bottom: 20px; color: var(--cust-muted); font-size: .875rem; }
.list .quantity { color: var(--cust-ink); margin-bottom: 4px; }
.list .secondaryLink { position: relative; z-index: 1; margin-top: 4px; font-size: .875rem; }
.list .buyer { position: relative; display: grid; justify-items: start; gap: 4px; padding-top: 20px; margin-top: auto; border-top: 1px solid var(--cust-line); pointer-events: none; overflow-wrap: anywhere; }
.list .buyer strong { font-size: 1rem; color: var(--cust-ink); }
.list .buyer > span:not(.openHint) { color: var(--cust-muted); font-size: .875rem; }
.list .openHint { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin-top: 4px; color: var(--cust-accent); font-size: .875rem; }
.list .skeleton { min-height: 440px; gap: 24px; }
.list .skeleton > span { height: 16px; width: 70%; border-radius: 6px; background: var(--cust-surface-2); }
.list .skeleton > span:nth-child(2) { width: 90%; height: 44px; }
.list .skeleton > span:nth-child(3) { width: 35%; height: 28px; border-radius: 999px; }
.list .skeleton > span:last-child { margin-top: auto; }
@media (max-width: 640px) {
  .list .searchForm { gap: 12px; }
  .list .statusFilters a { padding: 8px 12px; }
  .list .grid { grid-template-columns: minmax(0, 1fr); gap: 16px; }
  .list .card { padding: 20px; }
}
@media (prefers-reduced-motion: reduce) { .list .card { transition: none; } }
```

### A6. Customer document workspaces — src/features/customer/customer-documents.module.css

```css
.scope { min-width: 0; }
.scope a:global(.cust-primary):hover { color: #121514; }
.scope .total { color: var(--cust-muted); margin: -12px 0 24px; }
.scope .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.scope .tabs a { gap: 10px; padding: 8px 14px; min-height: 44px; background: var(--cust-surface); color: var(--cust-muted); border-radius: 999px; text-decoration: none; }
.scope .tabs a:hover { color: var(--cust-ink); background: var(--cust-surface-2); }
.scope .tabs a[aria-current="page"] { color: var(--cust-accent); background: var(--cust-tint); }
.scope .count { min-width: 24px; padding: 0 6px; background: var(--cust-surface-2); color: var(--cust-ink); border-radius: 999px; text-align: center; font-variant-numeric: tabular-nums; }
.scope .filters { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; align-items: end; padding: 24px; background: var(--cust-surface); border-radius: 12px; margin-bottom: 16px; }
.scope .filters > label { min-width: 0; margin: 0; }
.scope .filters > label:first-child { grid-column: span 2; }
.scope .filterActions { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; }
.scope .filterActions button { min-height: 48px; }
.scope .chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.scope .chips a { max-width: 100%; padding: 6px 12px; gap: 12px; background: var(--cust-tint); color: var(--cust-ink); border-radius: 999px; overflow-wrap: anywhere; }
.scope .rows { display: grid; margin-top: 24px; }
.scope .row { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(0, 1.7fr) minmax(130px, .9fr) minmax(150px, 1fr); gap: 24px; padding: 28px 0; border-bottom: 1px solid var(--cust-line); align-items: start; }
.scope .row > div { min-width: 0; overflow-wrap: anywhere; }
.scope .rowTitle { display: block; color: var(--cust-ink); font-weight: 650; margin-bottom: 12px; }
.scope .rowTitle:hover { color: var(--cust-accent); }
.scope .row p { margin-top: 8px; color: var(--cust-muted); font-size: .875rem; }
.scope .workName { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }
.scope .label { display: block; color: var(--cust-muted); font-size: .875rem; margin-bottom: 8px; }
.scope .row time { font-size: .875rem; }
.scope .rowActions { text-align: right; }
.scope .rowActions > strong, .scope .rowActions > small { display: block; }
.scope .rowActions a { justify-content: flex-end; }
.scope .mobileMore { display: none; }
.scope .skeletons { display: grid; gap: 16px; margin: 24px 0; }
.scope .skeleton { height: 140px; background: var(--cust-surface); border-radius: 12px; }
.scope :global(.cust-document-navigation) { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
.scope :global(.cust-document-navigation) > div { display: flex; flex-wrap: wrap; gap: 16px; }
.scope .quotationLayout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); gap: 32px; align-items: start; }
.scope .quotationLayout > * { min-width: 0; }
.scope .depositLayout .previewLayout { grid-template-columns: minmax(0, 1fr); gap: 24px; }
.scope .depositLayout :global(.cust-document) > h2 { margin-bottom: 24px; }
.scope .depositLayout :global(.cust-price-panel) :global(.cust-definition) > div { grid-template-columns: minmax(0, 1fr); gap: 4px; }
.scope .depositLayout :global(.cust-price-panel) :global(.cust-checklist li) { flex-wrap: wrap; gap: 8px; }
.paper { --cust-ink: #202623; --cust-muted: #57615b; color-scheme: light; margin: 16px 0 24px; padding: 32px; background: #fff; color: #202623; box-shadow: 0 8px 24px rgb(0 0 0 / .06); border-radius: 12px; overflow-wrap: anywhere; font-size: .9375rem; }
.paper h2 { font-size: 1.5rem; font-weight: 700; margin: 0 0 12px; }
.paper h3 { font-size: 1rem; font-weight: 650; margin: 0 0 16px; }
.paper p { margin: 8px 0; }
.paperHeader { padding-bottom: 24px; border-bottom: 1px solid #dce1dd; }
.documentFacts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; margin: 24px 0; }
.documentFacts > div { min-width: 0; }
.documentFacts dt { color: #57615b; font-size: .8125rem; margin-bottom: 6px; }
.documentFacts dd { margin: 0; font-weight: 600; }
.documentFacts small { display: block; font-weight: 400; margin-top: 6px; font-size: .8125rem; color: #57615b; }
.paperScope { margin-top: 32px; }
.paperTotal { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 12px; padding: 24px 0; border-block: 1px solid #dce1dd; font-variant-numeric: tabular-nums; }
.paperTotal strong { font-size: 1.5rem; }
.paperTotal small { grid-column: 1 / -1; color: #57615b; }
.paperFooter { margin-top: 32px; color: #57615b; font-size: .8125rem; }
.scope .poSection { margin-bottom: 40px; padding-bottom: 32px; border-bottom: 1px solid var(--cust-line); }
.scope .documentToolbar { display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 16px; margin-bottom: 24px; }
.scope .documentToolbar h2 { margin-bottom: 12px; }
.scope .previewLayout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(240px, 300px); gap: 32px; align-items: start; }
.scope .previewLayout > * { min-width: 0; }
.scope .previewInfo { padding: 24px; border-radius: 12px; background: var(--cust-surface); overflow-wrap: anywhere; }
.scope .previewInfo :global(.cust-definition > div) { grid-template-columns: minmax(0, 1fr); gap: 4px; }
.scope .filePreview object { display: block; width: 100%; height: 680px; background: #fff; border: 0; border-radius: 12px; }
.scope .filePreview > p { margin-top: 16px; }
.scope .previewFallback { min-height: 280px; padding: 32px; display: flex; flex-direction: column; align-items: start; justify-content: center; gap: 16px; background: var(--cust-surface); border-radius: 12px; overflow-wrap: anywhere; }
.printRoot { display: none; }
@media print {
  :global(body):has(.printRoot) > :not(.printRoot) { display: none !important; }
  .printRoot { display: block !important; color: #202623; background: #fff; font-size: 11pt; }
  .printRoot .paper { box-shadow: none; border-radius: 0; margin: 0; padding: 0; font-size: 11pt; }
  .printRoot .paperHeader, .printRoot .paperTotal, .printRoot .documentFacts > div { break-inside: avoid; }
}
@media (max-width: 1200px) { .scope .quotationLayout, .scope .previewLayout { grid-template-columns: minmax(0, 1fr); } .scope .quotationLayout > aside { order: -1; position: static; } }
@media (max-width: 1100px) { .scope .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .scope .row { grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); } .scope .rowActions { text-align: left; } .scope .rowActions a { justify-content: flex-start; } }
@media (max-width: 640px) {
  .scope .filters { grid-template-columns: minmax(0, 1fr); padding: 16px; }
  .scope .filters > label:first-child { grid-column: auto; }
  .scope .row { grid-template-columns: minmax(0, 1fr); gap: 20px; padding: 20px; border: 0; border-radius: 12px; background: var(--cust-surface); }
  .scope .rows { gap: 16px; }
  .scope .desktopDownload { display: none; }
  .scope .mobileMore { display: block; }
  .scope .mobileMore summary { display: flex; align-items: center; min-height: 44px; color: var(--cust-accent); }
  .paper { padding: 20px; }
  .documentFacts { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .paperTotal { grid-template-columns: minmax(0, 1fr); }
  .scope .filePreview object { height: 480px; }
  .scope .previewFallback { padding: 20px; }
}
```

### A7. Customer overview dashboard — src/features/customer/customer-overview.module.css

```css
.dashboard { min-width: 0; }
.dashboard a:global(.cust-primary):hover { color: #121514; }
.dashboard .quickActions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin: 0 0 24px; }
.dashboard .quickActions > span { color: var(--cust-muted); font-size: .875rem; }
.dashboard .quickActions a { gap: 8px; padding: 8px 12px; border: 1px solid var(--cust-line); border-radius: 10px; color: var(--cust-ink); background: var(--cust-surface); font-size: .875rem; }
.dashboard .quickActions a:hover { border-color: var(--cust-accent); background: var(--cust-surface-2); text-decoration: none; }
.dashboard .quickActions button { display: inline-flex; gap: 8px; align-items: center; margin-left: auto; font-size: .875rem; }
.dashboard .summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); padding: 24px 0; border-top: 1px solid var(--cust-line); border-bottom: 1px solid var(--cust-line); margin: 0; }
.dashboard .summary > div { padding: 0 24px; min-width: 0; border-right: 1px solid var(--cust-line); }
.dashboard .summary > div:first-child { padding-left: 0; }
.dashboard .summary > div:last-child { padding-right: 0; border: 0; }
.dashboard .summary dt { font-size: .875rem; color: var(--cust-muted); }
.dashboard .summary dd { margin: 8px 0 0; font-size: 1.75rem; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.dashboard .summary dd > span { font-size: .875rem; font-weight: 400; color: var(--cust-muted); margin-left: 8px; }
.dashboard .summary .money { font-size: 1.25rem; }
.dashboard .scope { color: var(--cust-muted); font-size: .875rem; margin: 12px 0 24px; }
.dashboard .attention { padding: 24px; background: var(--cust-surface); border-radius: 16px; margin-bottom: 24px; }
.dashboard .sectionHead { display: flex; align-items: center; justify-content: space-between; gap: 8px 16px; flex-wrap: wrap; margin-bottom: 8px; }
.dashboard .sectionHead h2 { font-size: 1.25rem; line-height: 1.5; margin: 0; }
.dashboard .sectionHead > span { color: var(--cust-muted); font-size: .875rem; }
.dashboard .sectionHead > a { gap: 4px; font-size: .875rem; }
.dashboard .sectionHead > svg { color: var(--cust-muted); flex-shrink: 0; }
.dashboard .panelGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: stretch; gap: 24px; }
.dashboard .panel { min-width: 0; display: flex; flex-direction: column; align-items: stretch; background: var(--cust-surface); padding: 24px; border-radius: 16px; }
.dashboard .hint { color: var(--cust-muted); font-size: .875rem; margin: 4px 0 16px; }
.dashboard .empty { color: var(--cust-muted); font-size: 1rem; margin: 16px 0 8px; max-width: 65ch; }
.dashboard .rows, .dashboard .actionList { list-style: none; margin: 0; padding: 0; }
.dashboard .rows > li, .dashboard .actionList > li { padding: 16px 0; border-bottom: 1px solid var(--cust-line); }
.dashboard .rows > li:last-child, .dashboard .actionList > li:last-child { border-bottom: 0; padding-bottom: 4px; }
.dashboard .actionList > li { display: flex; justify-content: space-between; align-items: center; gap: 16px 32px; }
.dashboard .actionList > li > div { min-width: 0; }
.dashboard .workName { margin: 4px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.dashboard .truncate { min-width: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }
.dashboard small { display: block; font-size: .875rem; overflow-wrap: anywhere; }
.dashboard .actionEnd { display: flex; align-items: center; gap: 16px 24px; flex-shrink: 0; max-width: 48%; }
.dashboard .actionEnd small { text-align: right; }
.dashboard .actionEnd time { display: block; color: var(--cust-ink); }
.dashboard .outlineAction { gap: 8px; padding: 8px 14px; border: 1px solid var(--cust-line); border-radius: 10px; color: var(--cust-ink); font-size: .875rem; white-space: nowrap; }
.dashboard .outlineAction:hover { border-color: var(--cust-accent); color: var(--cust-ink); text-decoration: none; background: var(--cust-surface-2); }
.dashboard .paymentRow { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px 16px; }
.dashboard .paymentRow > div:first-child { flex: 1 1 180px; min-width: 0; }
.dashboard .paymentRow :global(.cust-badge) { margin-top: 8px; }
.dashboard .documentLink { color: var(--cust-ink); font-weight: 650; gap: 8px; }
.dashboard .paymentEnd { flex: 1 0 auto; max-width: 100%; text-align: right; font-variant-numeric: tabular-nums; overflow-wrap: normal; }
.dashboard .paymentEnd strong { display: block; font-size: 1.25rem; margin: 8px 0; }
.dashboard .paymentEnd time { display: block; font-size: .875rem; color: var(--cust-muted); }
.dashboard .paymentEnd small { margin-top: 8px; }
.dashboard .due, .dashboard .overdue { font-size: .875rem; }
.dashboard .overdue { color: var(--cust-red); font-weight: 650; }
.dashboard .due { color: var(--cust-muted); }
.dashboard .readyRow { display: grid; justify-items: start; gap: 8px; }
.dashboard .readyRow p { font-size: .875rem; margin: 0; color: var(--cust-muted); }
.dashboard .workLink { max-width: 100%; color: var(--cust-ink); font-weight: 600; gap: 8px; overflow-wrap: anywhere; }
.dashboard .workLink svg, .dashboard .activity a svg { flex-shrink: 0; }
.dashboard .dateNote { display: flex; align-items: flex-start; gap: 8px; color: var(--cust-muted); font-size: .875rem; margin: 24px 0 0; }
.dashboard .dateNote svg { flex-shrink: 0; margin-top: 4px; }
.dashboard .workRow { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.dashboard .workRow > div { min-width: 0; }
.dashboard .workRow > :global(.cust-badge) { flex-shrink: 0; margin-top: 8px; }
.dashboard .bottomLink { gap: 8px; font-size: .875rem; margin-top: 8px; }
.dashboard .activity { list-style: none; margin: 16px 0 0; padding: 0; }
.dashboard .activity li { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 16px; padding: 0 0 16px; position: relative; }
.dashboard .activity li:not(:last-child)::before { content: ""; position: absolute; left: 15px; top: 32px; bottom: 0; width: 1px; background: var(--cust-line); }
.dashboard .marker { width: 32px; height: 32px; display: grid; place-items: center; color: var(--cust-muted); background: var(--cust-surface-2); border-radius: 50%; }
.dashboard .activity strong { font-size: 1rem; display: block; }
.dashboard .activity a { max-width: 100%; gap: 4px; color: var(--cust-ink); font-size: .875rem; overflow-wrap: anywhere; }
.dashboard .activityMeta { display: flex; flex-wrap: wrap; column-gap: 12px; align-items: baseline; }
.dashboard .activity time { font-size: .875rem; color: var(--cust-muted); }
.dashboard .more { min-height: 44px; width: 100%; margin-top: 16px; font-size: .875rem; }
.dashboard .skeleton { display: grid; gap: 16px; padding: 24px 0; }
.dashboard .skeleton > span:not(.srOnly) { height: 16px; width: 85%; background: var(--cust-surface-2); border-radius: 8px; }
.dashboard .skeleton > span:nth-child(2) { width: 65%; }
.dashboard .skeleton > span:nth-child(3) { width: 40%; }
.dashboard .srOnly { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.dashboard .footnote { color: var(--cust-muted); font-size: .875rem; margin: 32px 0 0; }
@media (max-width: 1200px) {
  .dashboard .actionEnd { flex-direction: column; align-items: flex-end; gap: 8px; }
  .dashboard .panelGrid { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 640px) {
  .dashboard .quickActions { gap: 8px; }
  .dashboard .quickActions > span { width: 100%; }
  .dashboard .quickActions > a { width: auto; flex: 1 1 auto; justify-content: center; }
  .dashboard .quickActions button { width: 100%; margin: 8px 0 0; justify-content: center; }
  .dashboard .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 16px; }
  .dashboard .summary > div { padding: 0; border: 0; }
  .dashboard .summary dd { font-size: 1.75rem; }
  .dashboard .summary .money { font-size: 1.25rem; }
  .dashboard .summary dt { font-size: .875rem; }
  .dashboard .attention, .dashboard .panel { padding: 20px; }
  .dashboard .actionList > li { flex-direction: column; align-items: stretch; }
  .dashboard .actionEnd { max-width: none; align-items: stretch; }
  .dashboard .actionEnd small { text-align: left; }
  .dashboard .outlineAction { justify-content: center; }
  .dashboard .paymentRow { display: block; }
  .dashboard .paymentEnd { text-align: left; }
  .dashboard .workRow { flex-direction: column; gap: 4px; }
  .dashboard .readyRow { justify-items: stretch; }
  .dashboard .readyRow > :global(.cust-badge) { justify-self: start; }
}
```

### A8. Staff/Admin overview — src/features/staff-overview/overview.module.css

```css
.dashboard { display: grid; grid-template-columns: minmax(0, 2fr) minmax(17rem, 1fr); grid-template-areas: "toolbar toolbar" "summary rail" "activity rail" "jobs rail"; align-items: start; gap: 1.5rem; color: var(--text); font-size: 1rem; line-height: 1.6; }
.dashboard, .dashboard * { min-width: 0; }
.dashboard h2, .dashboard h3, .dashboard p { margin: 0; }
.dashboard h2 { font-size: 1.125rem; line-height: 1.5; font-weight: 650; }
.dashboard h3 { font-size: 1rem; }
.dashboard button, .dashboard select { min-height: 2.75rem; border: 1px solid var(--line); border-radius: .625rem; padding: .5rem .75rem; background: var(--surface); color: var(--text); font-size: .875rem; cursor: pointer; }
.dashboard button:hover:not(:disabled), .dashboard select:hover { border-color: var(--lime); }
.dashboard button:disabled { cursor: default; opacity: .6; }
.dashboard :is(a, button, select, input):focus-visible { outline: 2px solid var(--lime-soft); outline-offset: 3px; }
.dashboard a { color: inherit; text-decoration: none; text-underline-offset: .2em; }
.dashboard a:hover { text-decoration: underline; }
.dashboard ::selection { background: var(--lime); color: var(--bg); }
.dashboard input { accent-color: var(--lime); caret-color: var(--text); }
.toolbar { grid-area: toolbar; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
.toolbar > .error, .toolbar > [role="status"] { flex-basis: 100%; }
.controls { display: flex; align-items: end; flex-wrap: wrap; gap: .75rem; }
.controls label { display: grid; gap: .25rem; font-size: .875rem; color: var(--muted); }
.controls select { min-width: 8rem; }
.controls button { display: flex; align-items: center; gap: .5rem; }
.muted { color: var(--muted); font-size: .875rem; }
.summary { grid-area: summary; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.dashboard .metric { padding: 1.25rem; min-height: 8.5rem; display: grid; gap: .5rem; text-align: left; border-radius: 1rem; background: var(--surface); }
.metric > span { display: flex; justify-content: space-between; gap: .5rem; font-size: .875rem; }
.metric > span svg { color: var(--muted); flex-shrink: 0; }
.metric strong { font-size: 2rem; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; line-height: 1.2; }
.metric small { font-size: .875rem; color: var(--muted); }
.dashboard .metric[data-selected="true"] { border-color: var(--lime-soft); background: color-mix(in srgb, var(--lime) 8%, var(--surface)); }
.panel { padding: 1.5rem; background: var(--surface); border: 1px solid var(--line); border-radius: 1rem; }
.panel > .muted { margin-top: .375rem; }
.rail { grid-area: rail; display: grid; gap: 1.5rem; }
.priorityList { display: grid; margin-top: 1.5rem; }
.priorityList a { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr) auto 1rem; gap: .75rem; padding: 1.125rem 0; align-items: start; border-bottom: 1px solid var(--line-soft); }
.priorityList a:last-child { border: 0; padding-bottom: 0; }
.priorityList a:first-child { padding-top: 0; }
.priorityList svg { margin-top: .2rem; color: var(--lime-soft); }
.priorityList strong { font-size: .875rem; font-weight: 600; }
.priorityList small { display: block; margin-top: .375rem; color: var(--muted); font-size: .875rem; }
.priorityList a > span { font-size: 1.125rem; font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.shortcuts { display: grid; margin-top: 1.5rem; }
.shortcuts a { display: flex; gap: .75rem; align-items: center; min-height: 3.25rem; border-bottom: 1px solid var(--line-soft); font-size: .875rem; }
.shortcuts a > svg:first-child { color: var(--lime-soft); }
.shortcuts a > svg:last-child { margin-left: auto; }
.shortcuts a:last-child { border: 0; }
.quick > .textLink { margin-top: 1rem; }
.textLink { display: inline-flex; align-items: center; min-height: 2.75rem; gap: .5rem; font-size: .875rem; font-weight: 600; }
.activity { grid-area: activity; min-height: 12rem; }
.heatmap { margin-top: 1.5rem; }
.heatmapMeta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .5rem; font-size: .875rem; color: var(--muted); }
.calendarScroll { overflow-x: auto; max-width: 100%; margin-top: 1.25rem; padding: .25rem .25rem .75rem; scrollbar-color: var(--line) var(--surface); overscroll-behavior-x: contain; }
.calendarScroll:focus-visible { outline: 2px solid var(--lime-soft); outline-offset: 2px; }
.calendarFrame { min-width: 35rem; }
.months { display: grid; grid-template-columns: repeat(var(--weeks), minmax(0, 1fr)); gap: .1875rem; margin-left: 1.75rem; margin-bottom: .5rem; font-size: .875rem; color: var(--muted); }
.months span { white-space: nowrap; }
.calendarBody { display: flex; gap: .5rem; }
.weekdays { flex: 0 0 1.25rem; display: flex; flex-direction: column; justify-content: space-around; font-size: .75rem; color: var(--muted); }
.calendar { display: grid; grid-template-columns: repeat(var(--weeks), minmax(0, 1fr)); gap: .1875rem; width: 100%; align-items: start; }
.week { display: grid; grid-template-rows: repeat(7, minmax(0, 1fr)); gap: .1875rem; }
.week > span { aspect-ratio: 1; }
.dashboard .day { position: relative; min-height: 0; height: auto; width: 100%; aspect-ratio: 1; border: 1px solid color-mix(in srgb, var(--line) 50%, transparent); padding: 0; border-radius: .1875rem; background: var(--surface-2); }
.dashboard .day[data-level="1"], .legend i[data-level="1"] { background: color-mix(in srgb, var(--lime) 25%, var(--surface-2)); }
.dashboard .day[data-level="2"], .legend i[data-level="2"] { background: color-mix(in srgb, var(--lime) 45%, var(--surface-2)); }
.dashboard .day[data-level="3"], .legend i[data-level="3"] { background: color-mix(in srgb, var(--lime) 70%, var(--surface-2)); }
.dashboard .day[data-level="4"], .legend i[data-level="4"] { background: var(--lime); }
.dashboard .day[data-selected="true"] { outline: 2px solid var(--text); outline-offset: 1px; }
.dashboard .day:focus-visible { z-index: 1; outline: 2px solid var(--text); outline-offset: 2px; }
.legend { display: flex; align-items: center; justify-content: end; gap: .375rem; font-size: .875rem; color: var(--muted); margin: .5rem 0 1.5rem; }
.legend i { display: block; width: .75rem; height: .75rem; background: var(--surface-2); border-radius: .1875rem; }
.calendarHint { display: none; color: var(--muted); font-size: .875rem; margin-bottom: 1.25rem !important; }
.completionStats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; gap: 1.25rem; padding-top: 1.25rem; border-top: 1px solid var(--line-soft); }
.completionStats dt { color: var(--muted); font-size: .875rem; }
.completionStats dd { font-size: 1.25rem; font-weight: 650; margin: .375rem 0 0; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.completionStats dd small { font-size: .875rem; color: var(--muted); font-weight: 400; }
.noHistory, .historyWarning { margin-top: 1.25rem !important; font-size: .875rem; color: var(--muted); }
.datePicker { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem; margin-top: 1.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line-soft); font-size: .875rem; }
.datePicker input { min-height: 2.75rem; max-width: 100%; padding: .5rem .75rem; background: var(--surface); color: var(--text); border: 1px solid var(--line); border-radius: .625rem; font-size: 1rem; }
.dayPreview { margin-top: 1rem; padding: 1rem; background: var(--surface-2); border-radius: .625rem; font-size: .875rem; }
.dayPreview ul { margin: .75rem 0; padding-left: 1.25rem; }
.dayPreview li { margin-top: .375rem; overflow-wrap: anywhere; }
.previewActions { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; }
.jobs { grid-area: jobs; }
.sectionHead { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: start; gap: 1rem; }
.sectionHead p { margin-top: .375rem; }
.sectionHead h2 { scroll-margin-top: 7rem; }
.tabs { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.25rem 0 .5rem; }
.dashboard .tabs button { display: flex; gap: .5rem; align-items: center; border-radius: 2rem; background: transparent; }
.tabs button span { padding: 0 .375rem; background: var(--surface-2); border-radius: 1rem; font-size: .875rem; font-variant-numeric: tabular-nums; }
.dashboard .tabs button[aria-pressed="true"] { border-color: var(--lime-soft); background: color-mix(in srgb, var(--lime) 10%, var(--surface)); }
.table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 1rem; }
.table th, .table td { text-align: left; vertical-align: top; padding: 1rem .5rem; border-bottom: 1px solid var(--line-soft); font-size: .875rem; overflow-wrap: anywhere; }
.table th:first-child { width: 40%; padding-left: 0; }
.table th:last-child { width: 16%; padding-right: 0; }
.table thead th { color: var(--muted); font-weight: 400; }
.table tbody th { font-weight: 600; }
.table tbody th > a { display: block; min-height: 2.75rem; }
.table tbody th > small { display: block; font-size: .875rem; color: var(--muted); font-weight: 400; margin-top: .5rem; }
.badge { display: inline-flex; align-items: center; gap: .4rem; padding: .25rem .5rem; background: var(--surface-2); border-radius: 2rem; color: var(--text); font-size: .875rem; font-weight: 400; }
.badge i { width: .4rem; height: .4rem; border-radius: 50%; flex-shrink: 0; background: var(--muted); }
.badge[data-status="queued"] i { background: var(--warning); }
.badge[data-status="in_progress"] i { background: var(--cyan); }
.badge[data-status="completed"] i { background: var(--lime); }
.badge[data-status="cancelled"] i { background: var(--danger); }
.pagination { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1.25rem; font-size: .875rem; color: var(--muted); }
.pagination > div { display: flex; gap: .5rem; }
.filterChip { display: flex; flex-wrap: wrap; gap: .75rem; align-items: center; margin-top: 1rem; font-size: .875rem; }
.filterChip > span { padding: .5rem .75rem; background: var(--surface-2); border-radius: .625rem; }
.empty { padding: 2rem 0; display: grid; justify-items: start; gap: 1rem; }
.empty p { color: var(--muted); font-size: .875rem; max-width: 65ch; }
.error { border: 1px solid var(--danger); background: var(--surface); border-radius: .625rem; padding: 1rem; font-size: .875rem; }
.error p, .error button { margin-top: .75rem; }
.skeleton { display: grid; gap: .75rem; padding: 1.5rem 0; }
.skeleton > span:not(.srOnly) { background: var(--surface-2); border-radius: .5rem; height: 1.25rem; }
.skeleton > span:nth-child(2) { width: 70%; }
.srOnly { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
:global(.page-content):has(.dashboard) { max-width: none; padding: 2rem; }
:global(.page-content):has(.dashboard) > :global(.page-heading) { min-height: 0; margin-bottom: 1.25rem; }
:global(.page-content):has(.dashboard) > :global(.page-heading) h1 { font-size: 1.75rem; line-height: 1.4; letter-spacing: -.02em; }
@media (min-width: 90rem) { .summary { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 79.999rem) {
  .dashboard { grid-template-columns: minmax(0, 1fr); grid-template-areas: "toolbar" "summary" "queue" "activity" "jobs" "quick"; }
  .rail { display: contents; }
  .queue { grid-area: queue; }
  .quick { grid-area: quick; }
  .priorityList { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  .priorityList a { border-bottom: 0; padding: 0; grid-template-columns: 1.25rem minmax(0, 1fr) auto; }
  .priorityList a > svg:last-child { display: none; }
  .shortcuts { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 1.5rem; }
}
@media (max-width: 44rem) {
  :global(.page-content):has(.dashboard) { padding: 1.5rem 1rem 2.5rem; }
  .dashboard { gap: 1rem; }
  .panel { padding: 1.25rem; }
  .calendarHint { display: block; }
  .summary { gap: .75rem; }
  .dashboard .metric { padding: 1rem; }
  .metric > span svg { display: none; }
  .controls { width: 100%; }
  .controls label { flex: 1; }
  .priorityList { grid-template-columns: minmax(0, 1fr); gap: 0; }
  .priorityList a { padding: 1rem 0; border-bottom: 1px solid var(--line-soft); }
  .table, .table tbody { display: block; }
  .table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .table tr { display: grid; grid-template-columns: minmax(0, 1fr); padding: 1rem 0; gap: .625rem; border-bottom: 1px solid var(--line); }
  .table th, .table td { display: block; width: 100% !important; padding: 0; border: 0; }
  .table td[data-label]::before { content: attr(data-label); display: block; color: var(--muted); margin-bottom: .25rem; }
  .table td:last-child a { width: 100%; }
  .pagination { align-items: start; }
}
```

### A9. Staff/Admin shared page components — src/components/staff-ui/staff-ui.module.css

```css
/* Shared Staff/Admin components. Rules are prefixed with the page container so
   they deterministically outrank the legacy `.live-workspace button` defaults. */
.visuallyHidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* Buttons: 48px primary/secondary for shop-floor use, 44px text buttons. */
:global(.live-workspace) :is(.primary, .secondary, .danger) { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 10px 20px; border-radius: 10px; font: inherit; font-size: 0.9375rem; font-weight: 650; line-height: 1.3; text-align: center; cursor: pointer; transition: background-color .15s, border-color .15s; }
:global(.live-workspace) .primary { border: 1px solid transparent; background: var(--lime); color: #160e08; }
:global(.live-workspace) .primary:hover:not(:disabled) { background: color-mix(in srgb, var(--lime) 85%, #fff); }
:global(.live-workspace) .secondary { border: 1px solid var(--line); background: var(--surface); color: var(--text); }
:global(.live-workspace) .secondary:hover:not(:disabled) { border-color: var(--lime); }
:global(.live-workspace) .danger { border: 1px solid var(--danger); background: color-mix(in srgb, var(--danger) 12%, var(--surface)); color: var(--danger); }
:global(.live-workspace) .text { min-height: 44px; padding: 8px 4px; border: 0; background: transparent; color: var(--lime); font: inherit; font-size: 0.9375rem; font-weight: 600; cursor: pointer; }
:global(.live-workspace) :is(.primary, .secondary, .danger, .text):disabled { opacity: .5; cursor: not-allowed; }
:global(.live-workspace) :is(.primary, .secondary, .danger, .text):focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }
:global([data-theme="light"]) :global(.live-workspace) .text { color: var(--lime-soft); }

/* Status badge: Thai text plus a shaped dot (never colour alone). */
.badge { display: inline-flex; align-items: center; gap: 7px; width: fit-content; min-height: 28px; padding: 3px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2); color: var(--muted); font-size: 0.8125rem; font-weight: 600; line-height: 1.3; white-space: nowrap; }
.dot { width: 8px; height: 8px; flex-shrink: 0; border-radius: 50%; background: currentColor; }
.badge[data-tone="action"], .badge[data-tone="today"] { color: var(--lime); border-color: color-mix(in srgb, var(--lime) 40%, var(--line)); background: color-mix(in srgb, var(--lime) 10%, var(--surface)); }
.badge[data-tone="action"] .dot, .badge[data-tone="today"] .dot { border-radius: 2px; transform: rotate(45deg); }
.badge[data-tone="progress"] { color: var(--cyan); border-color: color-mix(in srgb, var(--cyan) 40%, var(--line)); background: color-mix(in srgb, var(--cyan) 10%, var(--surface)); }
.badge[data-tone="done"] { color: var(--success); border-color: color-mix(in srgb, var(--success) 40%, var(--line)); background: color-mix(in srgb, var(--success) 10%, var(--surface)); }
.badge[data-tone="problem"], .badge[data-tone="danger"] { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 40%, var(--line)); background: color-mix(in srgb, var(--danger) 10%, var(--surface)); }
.badge[data-tone="problem"] .dot, .badge[data-tone="danger"] .dot { border-radius: 1px; }
:global([data-theme="light"]) :is(.badge[data-tone="action"], .badge[data-tone="today"]) { color: var(--lime-soft); }

/* Status tabs with counts (same pattern as Customer lists). */
.tabs { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
:global(.live-workspace) .tabs a { position: relative; flex-shrink: 0; display: inline-flex; align-items: center; gap: 10px; min-height: 44px; padding: 8px 14px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); color: var(--muted); font-size: 0.875rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
:global(.live-workspace) .tabs a:hover { color: var(--text); border-color: var(--lime); }
:global(.live-workspace) .tabs a[aria-current="page"] { color: var(--text); border-color: var(--lime); background: color-mix(in srgb, var(--lime) 12%, var(--surface)); }
:global(.live-workspace) .tabs a:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.count { min-width: 24px; padding: 0 7px; border-radius: 999px; background: var(--surface-2); color: var(--text); text-align: center; font-variant-numeric: tabular-nums; }
.count[data-attention] { background: var(--lime); color: #160e08; }

/* Search */
.search { display: flex; gap: 8px; min-width: min(100%, 22rem); }
.search label { position: relative; flex: 1; display: flex; align-items: center; min-width: 0; }
.search label > svg { position: absolute; left: 14px; color: var(--muted); pointer-events: none; }
:global(.live-workspace) .search input { width: 100%; min-height: 48px; padding: 10px 14px 10px 42px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; font-size: 0.9375rem; }
:global(.live-workspace) .search input:focus { outline: none; border-color: var(--lime); }

/* Form fields */
.field { display: grid; gap: 6px; min-width: 0; }
.field > span { font-size: 0.9375rem; font-weight: 600; }
.field small { color: var(--muted); font-size: 0.8125rem; }
.field .fieldError { color: var(--danger); }
:global(.live-workspace) .field :is(input, textarea, select) { width: 100%; min-height: 48px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); color: var(--text); font: inherit; font-size: 1rem; }
:global(.live-workspace) .field textarea { min-height: 88px; resize: vertical; }
:global(.live-workspace) .field :is(input, textarea, select):focus { outline: none; border-color: var(--lime); }
:global(.live-workspace) .field input[aria-invalid="true"] { border-color: var(--danger); }

/* Next-action card and step indicator */
.nextAction { display: grid; gap: 16px; padding: clamp(1rem, 2vw, 1.5rem); border: 1px solid color-mix(in srgb, var(--lime) 45%, var(--line)); border-radius: 16px; background: color-mix(in srgb, var(--lime) 6%, var(--surface)); }
.nextAction > h3 { margin: 0; font-size: 1.125rem; }
.steps { display: flex; flex-wrap: wrap; gap: 8px 20px; margin: 0; padding: 0; list-style: none; font-size: 0.875rem; color: var(--muted); }
.steps li { display: inline-flex; align-items: center; gap: 8px; }
.steps li > span { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--line); background: var(--surface); font-weight: 700; font-size: 0.8125rem; }
.steps li[data-state="done"] { color: var(--text); }
.steps li[data-state="done"] > span { border-color: var(--success); background: var(--success); color: var(--surface); }
.steps li[data-state="current"] { color: var(--text); font-weight: 650; }
.steps li[data-state="current"] > span { border-color: var(--lime); background: var(--lime); color: #160e08; }

.row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }

/* Collapsible history */
.collapsible { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
.collapsible > summary { display: flex; align-items: center; min-height: 52px; padding: 0 16px; font-weight: 650; cursor: pointer; list-style-position: inside; }
.collapsible > summary:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.collapsible > div { display: grid; gap: 20px; padding: 4px 16px 16px; }

/* Confirmation dialog */
.dialog { width: min(32rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); margin: auto; padding: 0; border: 1px solid var(--line); border-radius: 16px; background: var(--surface); color: var(--text); box-shadow: 0 24px 64px rgba(0, 0, 0, .4); }
.dialog::backdrop { background: rgba(0, 0, 0, .5); }
.dialog form { display: grid; gap: 16px; padding: 24px; }
.dialog h2 { margin: 0; font-size: 1.25rem; }
.dialogBody { color: var(--text); line-height: 1.6; }
.dialogBody p { margin: 0; }
.check { display: flex; align-items: flex-start; gap: 12px; min-height: 44px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; cursor: pointer; }
.check input { width: 20px; height: 20px; margin: 2px 0 0; accent-color: var(--lime); flex-shrink: 0; }
.dialogActions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 12px; }
:global(.live-workspace) .dialogActions > button { min-width: 8rem; }

/* Side panel (drawer): right edge on desktop, full screen on phones */
.drawer { width: min(36rem, 100vw); max-width: 100vw; height: 100dvh; max-height: 100dvh; margin: 0 0 0 auto; padding: 0; border: 0; border-left: 1px solid var(--line); background: var(--surface); color: var(--text); box-shadow: -24px 0 64px rgba(0, 0, 0, .35); }
.drawer[open] { display: grid; grid-template-rows: auto minmax(0, 1fr); animation: drawerIn .2s ease-out; }
.drawer::backdrop { background: rgba(0, 0, 0, .5); }
@keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
.drawerHeader { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--line); }
.drawerHeader h2 { margin: 0; font-size: 1.25rem; line-height: 1.35; overflow-wrap: anywhere; }
:global(.live-workspace) .drawerHeader > button { min-width: 48px; padding: 10px; }
.drawerBody { display: grid; align-content: start; gap: 20px; padding: 20px; overflow-y: auto; }

/* Feedback */
.retry { display: grid; gap: 8px; padding: 16px; border: 1px solid color-mix(in srgb, var(--warning) 50%, var(--line)); border-radius: 12px; background: color-mix(in srgb, var(--warning) 8%, var(--surface)); }
.retry p { margin: 0; color: var(--text); font-size: 0.9375rem; }
.error { margin: 0; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--danger) 45%, var(--line)); border-radius: 10px; background: color-mix(in srgb, var(--danger) 8%, var(--surface)); color: var(--danger); font-size: 0.9375rem; }
.toast { position: fixed; z-index: 60; left: 50%; bottom: 24px; transform: translateX(-50%); max-width: calc(100vw - 2rem); }
.toast:not(:empty) { display: flex; align-items: center; gap: 10px; padding: 12px 18px; border: 1px solid color-mix(in srgb, var(--success) 45%, var(--line)); border-radius: 12px; background: var(--surface); color: var(--text); font-weight: 600; box-shadow: 0 12px 32px rgba(0, 0, 0, .3); }
.toast > span { color: var(--success); font-weight: 700; }
.notice { margin: 0; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface-2); color: var(--text); font-size: 0.875rem; }

/* Loading, empty and error states */
.skeleton { display: grid; gap: 12px; }
.skeleton > span { display: block; height: 104px; border-radius: 14px; background: linear-gradient(90deg, var(--surface) 0%, var(--surface-2) 50%, var(--surface) 100%); background-size: 200% 100%; animation: shimmer 1.4s ease-in-out infinite; }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }
.empty { display: grid; justify-items: center; gap: 8px; padding: 40px 24px; border: 1px dashed var(--line); border-radius: 14px; color: var(--muted); text-align: center; }
.empty h3 { margin: 4px 0 0; color: var(--text); font-size: 1.0625rem; }
.empty p { margin: 0; max-width: 36ch; }
.loadError { display: grid; justify-items: start; gap: 8px; padding: 16px; border: 1px solid color-mix(in srgb, var(--danger) 45%, var(--line)); border-radius: 12px; background: color-mix(in srgb, var(--danger) 6%, var(--surface)); }
.loadError p { margin: 0; color: var(--muted); }

@media (max-width: 640px) {
  .dialogActions { flex-direction: column-reverse; }
  :global(.live-workspace) .dialogActions > button { width: 100%; }
}
@media (prefers-reduced-motion: reduce) { .skeleton > span, .drawer[open] { animation: none; } }
```

### A10. Staff/Admin production — src/features/production/production.module.css

```css
/* งานผลิต (UC8) page-specific rules; the list/detail layout is staff-ui/staff-layout.module.css. */
.readiness { display: inline-flex; align-items: center; gap: 8px; width: fit-content; font-size: 0.875rem; font-weight: 650; color: var(--muted); }
.readiness::before { content: "•"; font-weight: 700; }
.readiness[data-state="ready"] { color: var(--success); }
.readiness[data-state="ready"]::before { content: "✓"; }
.readiness:is([data-state="short"], [data-state="empty"], [data-state="changed"]) { color: var(--lime); }
.readiness:is([data-state="short"], [data-state="empty"], [data-state="changed"])::before { content: "!"; }
.readiness[data-state="error"] { color: var(--danger); }
:global([data-theme="light"]) .readiness:is([data-state="short"], [data-state="empty"], [data-state="changed"]) { color: var(--lime-soft); }

.planLines { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.planLines li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.planLines li[data-short] { border-color: color-mix(in srgb, var(--danger) 45%, var(--line)); }
.planLines strong { flex: 1 1 12rem; overflow-wrap: anywhere; }
.planLines span { color: var(--muted); font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
.planLines .short { color: var(--danger); font-weight: 650; }
.editor { display: grid; gap: 14px; min-width: 0; }
.editor fieldset { display: grid; gap: 14px; min-width: 0; margin: 0; padding: 0; border: 0; }
.editorLine { display: flex; align-items: flex-end; gap: 8px; }
.editorLine > label { flex: 1; }

/* Work panel (in progress) */
.segments { display: flex; gap: 4px; padding: 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface-2); }
:global(.live-workspace) .segments button { flex: 1; min-width: 0; min-height: 44px; padding: 8px 6px; white-space: nowrap; border: 0; border-radius: 9px; background: transparent; color: var(--muted); font: inherit; font-weight: 650; cursor: pointer; }
:global(.live-workspace) .segments button[aria-pressed="true"] { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, .2); }
:global(.live-workspace) .segments button:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.usageRow { display: grid; gap: 8px; padding: 12px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); }
:global(.live-workspace) .fill { justify-self: start; min-height: 44px; font-size: 0.875rem; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.closeJob { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px 16px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; }
.closeJob h3 { margin: 0 0 4px; font-size: 1rem; }
.closeJob > :is([role="alert"]) { grid-column: 1 / -1; }

/* Materials and photo history */
.materials { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.materials li { display: grid; gap: 8px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 12px; }
.materials small { color: var(--muted); font-weight: 400; }
.materials dl { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 0; }
.materials dt { color: var(--muted); font-size: 0.8125rem; }
.materials dd { margin: 2px 0 0; font-weight: 650; font-variant-numeric: tabular-nums; }
.materials dd small { display: block; font-size: 0.75rem; }
:global(.live-workspace) .photoRow { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

@media (max-width: 40rem) {
  .materials dl { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .closeJob { grid-template-columns: minmax(0, 1fr); }
}
```

### A11. Staff/Admin shared list and detail layout — src/components/staff-ui/staff-layout.module.css

```css
/* Staff/Admin list + detail page layout shared by the redesigned pages. Uses the shared theme tokens. */
.page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; min-width: 0; }
.visuallyHidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.toolbar { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.toolbarEnd { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.toolbarEnd > form { flex: 1 1 20rem; max-width: 36rem; min-width: 0; }
.warning { margin: 0; padding: 12px 14px; border: 1px solid color-mix(in srgb, var(--warning) 45%, var(--line)); border-radius: 10px; background: color-mix(in srgb, var(--warning) 8%, var(--surface)); color: var(--text); font-size: 0.9375rem; line-height: 1.6; }
.filterNote { margin: 0; color: var(--muted); font-size: 0.875rem; }
:global(.live-workspace) .filterNote a { margin-left: 8px; color: var(--lime); }
.muted { margin: 0; color: var(--muted); font-size: 0.9375rem; line-height: 1.6; }

/* View tabs (two views on one route), checkbox toggle and collapsible note. */
.views { display: flex; gap: 4px; border-bottom: 1px solid var(--line); overflow-x: auto; }
:global(.live-workspace) .views a { flex-shrink: 0; display: inline-flex; align-items: center; min-height: 48px; padding: 8px 16px; border-bottom: 3px solid transparent; color: var(--muted); font-weight: 650; text-decoration: none; white-space: nowrap; }
:global(.live-workspace) .views a:hover { color: var(--text); }
:global(.live-workspace) .views a[aria-current="page"] { color: var(--text); border-bottom-color: var(--lime); }
:global(.live-workspace) .views a:focus-visible { outline: 2px solid var(--lime); outline-offset: -2px; }
.toggle { display: inline-flex; align-items: center; gap: 10px; width: fit-content; min-height: 48px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; font-weight: 600; cursor: pointer; }
.toggle input { width: 20px; height: 20px; margin: 0; accent-color: var(--lime); }
.note { color: var(--muted); font-size: 0.875rem; }
.note summary { min-height: 44px; display: flex; align-items: center; font-weight: 600; cursor: pointer; }
.note p { margin: 0; line-height: 1.6; }

.layout { display: grid; grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr); gap: 24px; align-items: start; }
.list { display: grid; gap: 12px; min-width: 0; }
.detail { min-width: 0; }
.placeholder { position: sticky; top: 96px; }

/* Record cards: the whole card is one link (one tap target). */
:global(.live-workspace) .card { display: grid; gap: 6px; padding: 16px 18px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); color: var(--text); text-decoration: none; transition: border-color .15s, background-color .15s; }
:global(.live-workspace) .card:hover { border-color: color-mix(in srgb, var(--lime) 60%, var(--line)); text-decoration: none; }
:global(.live-workspace) .card[aria-current="true"] { border-color: var(--lime); background: color-mix(in srgb, var(--lime) 7%, var(--surface)); box-shadow: inset 4px 0 0 var(--lime); }
:global(.live-workspace) .card:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.cardTop { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.cardTop strong { font-size: 0.9375rem; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.cardTitle { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 1.0625rem; font-weight: 650; line-height: 1.45; overflow-wrap: anywhere; }
.cardMeta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; color: var(--muted); font-size: 0.875rem; }
.cardNext { display: inline-flex; align-items: center; gap: 6px; margin-top: 4px; color: var(--lime); font-size: 0.9375rem; font-weight: 650; }
.cardNext[data-quiet] { color: var(--muted); }
:global([data-theme="light"]) .cardNext:not([data-quiet]) { color: var(--lime-soft); }

/* Detail */
.detailCard { display: grid; gap: 20px; padding: clamp(1rem, 2.2vw, 1.75rem); border: 1px solid var(--line); border-radius: 16px; background: var(--surface); min-width: 0; }
:global(.live-workspace) .back { display: none; align-items: center; gap: 6px; min-height: 44px; width: fit-content; color: var(--lime); font-weight: 650; text-decoration: none; }
.back svg { transform: rotate(180deg); }
.detailHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.detailHeader h2 { margin: 0; font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.35; overflow-wrap: anywhere; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin: 8px 0 0; color: var(--muted); font-size: 0.9375rem; }
.meta small { font-size: 0.8125rem; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 12px; margin: 0; }
.facts > div { padding: 12px 14px; border-radius: 12px; background: var(--surface-2); min-width: 0; }
.facts dt { color: var(--muted); font-size: 0.8125rem; }
.facts dd { margin: 4px 0 0; font-weight: 650; overflow-wrap: anywhere; }
:global(.live-workspace) .linkButton { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: fit-content; min-height: 48px; padding: 10px 20px; border-radius: 10px; background: var(--lime); color: #160e08; font-weight: 650; text-decoration: none; }
:global(.live-workspace) .linkButton:hover { text-decoration: none; background: color-mix(in srgb, var(--lime) 85%, #fff); }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.problem { margin: 0; color: var(--danger); font-weight: 600; }

/* Forms with a summary + main button bar */
.form { display: grid; gap: 14px; min-width: 0; }
.form fieldset { display: grid; gap: 14px; min-width: 0; margin: 0; padding: 0; border: 0; }
.submitBar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 12px; background: var(--surface-2); }
.submitBar > span { color: var(--muted); font-size: 0.9375rem; overflow-wrap: anywhere; }
:global(.live-workspace) .submit { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 10px 22px; border: 0; border-radius: 10px; background: var(--lime); color: #160e08; font: inherit; font-weight: 650; cursor: pointer; }
:global(.live-workspace) .submit:hover:not(:disabled) { background: color-mix(in srgb, var(--lime) 85%, #fff); }
:global(.live-workspace) .submit:disabled { opacity: .5; cursor: not-allowed; }
:global(.live-workspace) .submit:focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }

/* Sections and history */
.section { display: grid; gap: 12px; }
.section h3 { margin: 0; font-size: 1.0625rem; }
.historyBlock { display: grid; gap: 8px; }
.historyBlock h4 { margin: 0; font-size: 0.9375rem; }
.timeline { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.timeline li { display: grid; gap: 2px; padding: 10px 0 10px 16px; border-left: 2px solid var(--line); }
.timeline li span { color: var(--muted); font-size: 0.875rem; overflow-wrap: anywhere; }
.code { margin: 0; color: var(--muted); font-size: 0.8125rem; overflow-wrap: anywhere; }

@media (max-width: 64rem) {
  .layout { grid-template-columns: minmax(0, 1fr); }
  .layout[data-detail] .list, .layout:not([data-detail]) .detail { display: none; }
  :global(.live-workspace) .back { display: inline-flex; }
}
@media (max-width: 40rem) {
  .toolbarEnd > form { flex-basis: 100%; max-width: none; }
  .detailHeader { flex-direction: column; }
  .submitBar { flex-direction: column; align-items: stretch; }
  :global(.live-workspace) .submit { width: 100%; }
  .submitBar[data-sticky] { position: sticky; bottom: 0; z-index: 2; box-shadow: 0 -8px 24px rgba(0, 0, 0, .18); }
}
@media (prefers-reduced-motion: reduce) { :global(.live-workspace) .card { transition: none; } }
```

### A12. Staff/Admin requests and quotations — src/features/requests/requests.module.css

```css
/* คำขอและใบเสนอราคา (UC1–UC4) page-specific rules; the list/detail layout is staff-ui/staff-layout.module.css. */
.files { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.files li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; min-width: 0; }
.files li > span { display: grid; gap: 2px; min-width: 0; }
.files strong { overflow-wrap: anywhere; }
.files small { color: var(--muted); font-size: 0.8125rem; }

.moneyGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.minimum { margin: 0; padding: 12px 14px; border-radius: 10px; background: var(--surface-2); color: var(--muted); font-size: 0.9375rem; font-variant-numeric: tabular-nums; }
.minimum strong { color: var(--text); }

.checklist { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.checklist li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; }
.checklist li > span { width: 1.25rem; color: var(--muted); font-weight: 700; text-align: center; }
.checklist li[data-state="approved"] > span { color: var(--success); }
.checklist li[data-state="pending"] > span { color: var(--lime); }
.checklist small { color: var(--muted); font-size: 0.875rem; }
.checklist li[data-state="rejected"] small { color: var(--danger); }

.evidence { display: grid; gap: 10px; padding: 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); min-width: 0; }
.evidence > header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; }
.evidenceList { display: grid; gap: 10px; }
.legend { margin-bottom: 4px; padding: 0; font-weight: 650; }
.choices { display: flex; flex-wrap: wrap; gap: 10px; }
.choices label, .check { display: inline-flex; align-items: center; gap: 10px; min-height: 48px; padding: 8px 16px; border: 1px solid var(--line); border-radius: 10px; cursor: pointer; }
.choices label:has(input:checked) { border-color: var(--lime); background: color-mix(in srgb, var(--lime) 10%, var(--surface)); }
.choices input, .check input { width: 20px; height: 20px; margin: 0; accent-color: var(--lime); }
.check { align-items: flex-start; line-height: 1.5; }

@media (max-width: 40rem) {
  .moneyGrid { grid-template-columns: minmax(0, 1fr); }
  .choices label { flex: 1; justify-content: center; }
}
```

### A13. Staff/Admin materials and master data — src/features/inventory/inventory.module.css

```css
/* สต๊อกวัตถุดิบ (UC5) page-specific rules; list/detail pieces come from staff-ui/staff-layout.module.css. */

/* Stock table: a real table on desktop, one card per material on phones. */
.stock { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); font-variant-numeric: tabular-nums; }
.stock th, .stock td { padding: 12px 16px; border-bottom: 1px solid var(--line); text-align: right; vertical-align: middle; }
.stock thead th { color: var(--muted); font-size: 0.8125rem; font-weight: 600; }
.stock :is(thead th, tbody th):first-child { text-align: left; }
.stock tbody tr:last-child > * { border-bottom: 0; }
.stock td:last-child, .stock thead th:last-child { text-align: left; }
.stock tbody th { display: grid; gap: 2px; font-weight: 400; }
:global(.live-workspace) .stock tbody th a { color: var(--text); font-size: 1rem; font-weight: 650; text-decoration: none; overflow-wrap: anywhere; }
:global(.live-workspace) .stock tbody th a:hover { color: var(--lime); text-decoration: underline; }
:global(.live-workspace) .stock tbody th a:focus-visible { outline: 2px solid var(--lime); outline-offset: 2px; }
.stock tbody th small { color: var(--muted); font-size: 0.8125rem; }
.stock tbody tr[aria-current="true"] > * { background: color-mix(in srgb, var(--lime) 7%, var(--surface)); }

.movementTitle { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-variant-numeric: tabular-nums; }
.modeGroup { display: grid; gap: 6px; }
.modeGroup > span { font-size: 0.9375rem; font-weight: 600; }
.modes { display: flex; flex-wrap: wrap; gap: 8px; }
.modes label { display: inline-flex; align-items: center; gap: 10px; min-height: 48px; padding: 10px 14px; border: 1px solid var(--line); border-radius: 10px; font-weight: 600; cursor: pointer; }
.modes label:has(input:checked) { border-color: var(--lime); background: color-mix(in srgb, var(--lime) 10%, var(--surface)); }
.modes label:has(input:disabled) { opacity: .5; cursor: not-allowed; }
.modes input { width: 20px; height: 20px; margin: 0; accent-color: var(--lime); }

/* ข้อมูลหลัก */
.catalog { display: grid; gap: 16px; }
.unitList { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.unitList li { padding: 6px 12px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface-2); font-size: 0.875rem; }
.inlineForm { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; }
.inlineForm > label { flex: 1 1 14rem; max-width: 24rem; }
.inlineForm > :is(p, [role="alert"]) { flex-basis: 100%; }
.catalogList { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.catalogList li { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); }
.catalogList li:last-child { border-bottom: 0; }
.catalogList li > span:first-child { display: grid; gap: 2px; min-width: 0; overflow-wrap: anywhere; }
.catalogList small { color: var(--muted); font-size: 0.8125rem; }

@media (max-width: 48rem) {
  .stock, .stock tbody, .stock tr, .stock th, .stock td { display: block; }
  .stock { border: 0; background: transparent; }
  .stock thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .stock tbody { display: grid; gap: 12px; }
  .stock tbody tr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 12px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 14px; background: var(--surface); }
  .stock tbody tr > * { padding: 0; border: 0; text-align: left; }
  .stock tbody th, .stock td:last-child { grid-column: 1 / -1; }
  .stock td[data-label]::before { content: attr(data-label); display: block; color: var(--muted); font-size: 0.75rem; }
  .stock td:last-child::before { display: none; }
  .catalogList li { grid-template-columns: minmax(0, 1fr) auto; }
  .catalogList li > :last-child { grid-column: 1 / -1; justify-self: start; }
}
```

### B. Font loading and root layout — app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "../src/components/appearance/appearance";
import { ApiSessionProvider } from "../src/features/auth/api-session";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lathe Shop Control",
  description: "ระบบจัดการงานผลิตสำหรับโรงกลึงตามสั่ง",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AppThemeProvider><Suspense fallback={<p role="status">กำลังเตรียมพื้นที่ทำงาน…</p>}><ApiSessionProvider>{children}</ApiSessionProvider></Suspense></AppThemeProvider></body>
    </html>
  );
}
```

### B2. Scoped Thai landing font — src/features/landing/landing-page.tsx

```tsx
import Link from "next/link";
import { Noto_Sans_Thai } from "next/font/google";
import { SettingsToggle } from "../../components/appearance/appearance";
import { Logo } from "../../components/appearance/icons";

import { Hero } from "./landing-hero";
import { sectionLinks } from "./landing-nav";
import { LandingMotion } from "./landing-motion";
import { Contact, Faq, FaqJsonLd, Gallery, Materials, Process, Reasons, Services } from "./landing-sections";
import { shop } from "./landing-content";
import styles from "./landing.module.css";

const thai = Noto_Sans_Thai({ subsets: ["thai", "latin"], display: "swap", variable: "--font-landing-thai" });

export default function LandingPage() {
  return <main className={`cinematic-page ${styles.scope} ${thai.variable}`} lang="th">
    <div className="landing-progress" aria-hidden="true" />
    {/* Compact bar shown after the hero; hidden from keyboard and AT until it appears. */}
    <header className="landing-sticky">
      <Link href="/" className="cinematic-brand" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link>
      <nav aria-label="ไปยังหัวข้อ">{sectionLinks.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
      <Link href="/register" className="landing-sticky-cta">ขอใบเสนอราคา <span aria-hidden="true">↗</span></Link>
    </header>
    <Hero />
    <Services />
    <Materials />
    <Gallery />
    <Reasons />
    <Process />
    <Faq />
    <Contact />
    <footer className="cinematic-footer">
      <Link href="/" aria-label="หน้าหลัก Lathe Shop Control"><Logo /></Link>
      <p>{shop.name} · {shop.address}</p>
      <div><SettingsToggle /><Link href="/register">ขอใบเสนอราคา <span aria-hidden="true">↗</span></Link></div>
    </footer>
    <FaqJsonLd />
    <LandingMotion />
  </main>;
}
```

### C. SVG geometry and brand markup — src/components/appearance/icons.tsx

```tsx


type IconName = "grid" | "inbox" | "machine" | "truck" | "file" | "layers" | "wallet" | "clock" | "search" | "plus" | "arrow" | "bell" | "logout" | "close" | "sun" | "moon";


export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p: Record<IconName, React.ReactNode> = { grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>, inbox: <><path d="M4 4h16v13H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></>, machine: <path d="M5 20V8h14v12M8 8V4h8v4M9 13h6M12 10v6"/>, truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>, file: <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/>, layers: <path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>, wallet: <path d="M4 6h15v13H4zM4 9V5h12M15 13h6v4h-6z"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, search: <><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>, plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="m9 18 6-6-6-6"/>, bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>, logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/>, close: <path d="M6 6l12 12M18 6 6 18"/>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>, moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/> };
  return <svg aria-hidden="true" className="icon" width={`${size / 16}rem`} height={`${size / 16}rem`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
}


export function Logo({ onClick }: { onClick?: () => void }) {
  const mark = <><span className="brand-mark"><span/></span><span><b>LATHE</b><small>SHOP CONTROL</small></span></>;
  return onClick ? <button className="brand brand-button" onClick={onClick} aria-label="กลับหน้าแรก">{mark}</button> : <div className="brand">{mark}</div>;
}
```

### D. Route file inventory

- `app/admin/delivery-payment/page.tsx`
- `app/admin/inbox/page.tsx`
- `app/admin/materials/page.tsx`
- `app/admin/orders/page.tsx`
- `app/admin/page.tsx`
- `app/admin/production/page.tsx`
- `app/admin/receiving/page.tsx`
- `app/admin/requests/page.tsx`
- `app/admin/workers/page.tsx`
- `app/customer/delivery-payment/page.tsx`
- `app/customer/deposit-po/page.tsx`
- `app/customer/documents/page.tsx`
- `app/customer/inbox/page.tsx`
- `app/customer/jobs/page.tsx`
- `app/customer/memberships/page.tsx`
- `app/customer/page.tsx`
- `app/customer/payments/page.tsx`
- `app/customer/quotations/page.tsx`
- `app/customer/requests/page.tsx`
- `app/login/page.tsx`
- `app/page.tsx`
- `app/register/page.tsx`
- `app/staff/debtors/page.tsx`
- `app/staff/delivery-payment/page.tsx`
- `app/staff/delivery/page.tsx`
- `app/staff/inbox/page.tsx`
- `app/staff/materials/page.tsx`
- `app/staff/orders/page.tsx`
- `app/staff/page.tsx`
- `app/staff/payments/page.tsx`
- `app/staff/production/page.tsx`
- `app/staff/quotations/page.tsx`
- `app/staff/receiving/page.tsx`
- `app/staff/requests/page.tsx`

<!-- DESIGN-SNAPSHOT:END -->
