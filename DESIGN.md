# Lathe Shop Control — Design specification

อัปเดตล่าสุด: 2026-10-19 · สถานะ: merged design + connected AUTH/UC1–UC3; Phase 8 UC4/contact integration in progress

เอกสารนี้ใช้ส่งต่องานให้ designer และ developer เพื่อสร้าง UI ให้ตรงกับระบบปัจจุบัน อ่านคู่กับ `docs/02-frontend.md` ซึ่งเป็นแหล่งอ้างอิง Business Flow และ permission ข้อมูลบนหน้าปัจจุบันหลายส่วนเป็น mock data และยังไม่ใช่หลักฐานว่า Backend หรือ UC1–UC9 ทำงานครบ

## แหล่งอ้างอิง

| ไฟล์ | หน้าที่ |
| --- | --- |
| `DESIGN.md` | Design system, component, responsive และ handoff rules |
| `app/globals.css` | ค่าจริงของ selector, breakpoint, theme และ state |
| `app/dashboard.tsx` | Landing markup |
| `app/appearance.tsx` | Icons, Logo, theme/scale provider และ Settings |
| `app/workspace-shell.tsx`, `app/workspace-routes.ts` | Shared role shell, permissions mapping และ URL |
| `app/workflows.css` | Functional UC forms/tables และ role shell overrides |
| `app/auth-gateway.tsx`, `app/backend-workspace.tsx` | Connected Login/Register ในดีไซน์หลัก และปุ่ม demo bypass ใต้ฟอร์ม |
| `app/layout.tsx` | Font loading, language และ provider |
| `app/**/page.tsx` | Route จริง |
| `docs/02-frontend.md` | Business rules, roles และ UC1–UC9 |

ภาคผนวกท้ายไฟล์สร้างจาก source จริงและรักษาลำดับ CSS cascade หากตารางสรุปไม่ครอบคลุมค่าใด ให้ใช้ภาคผนวกพร้อม markup เป็นค่าตัดสิน

## Visual direction

- Modern industrial dashboard: หัวเรื่องและตัวเลขใหญ่ การ์ดมุมมน เส้นขอบบาง และพื้นที่ว่างชัดเจน
- สีแบรนด์คือส้มบน charcoal ใน Dark และส้มเข้มบนพื้นขาวอมครีมใน Light
- ส้มใช้กับ primary action, selected state, progress และข้อมูลสำคัญ ส่วน cyan, violet, yellow และ red ใช้แยกชุดข้อมูล
- Landing เน้น editorial headline กับ machine illustration ที่วาดด้วย CSS พื้นที่ทำงานเน้นรายการ ตาราง และสถานะ
- Landing, navigation และ Settings เป็นภาษาไทย; functional UC forms จาก develop ยังเป็นภาษาอังกฤษ ชื่อแสดง Worker เปลี่ยนเป็น Staff โดยคง domain/API role เดิม

## Typography

Body font stack:

```css
var(--font-geist-sans), "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif
```

Geist และ Geist Mono โหลดจาก `next/font/google` ด้วย subset `latin`; body ใช้ Geist Sans variable ฟอนต์ไทยสองตัวเป็น fallback เท่านั้นและยังไม่ได้ bundle จึงอาจต่างกันตาม OS ถ้าต้องการรูปทรงภาษาไทยเหมือนกันทุกเครื่อง ต้องเพิ่ม font asset/loading เป็นงานออกแบบแยก

| Use | Medium size | Weight / behavior |
| --- | --- | --- |
| Landing hero | `clamp(3.625rem,6vw,5.75rem)` (58–92px) | 730, line-height .98, tracking -.072em |
| Landing section | `clamp(2.625rem,4.5vw,4.125rem)` (42–66px) | line-height 1.02, tracking -.06em |
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

Topbar แสดง role/current page และลิงก์เปลี่ยนบัญชีทดสอบชิดขวา Desktop สูง5.25rem; mobile สูงอย่างน้อย4.5rem ไม่มี search/notification ที่ยังไม่ทำงาน ปุ่มสร้างคำขออยู่ที่ Customer → คำขอผลิต ใช้ Link เปลี่ยนหน้าและ button สำหรับ action ทุก icon-only control มี accessible label

### Cards and tables

Page content max105rem, padding3rem 2.75rem 4.75rem Overview ใช้ตัวเลขจาก shared records และ cards3columns → 2 ที่75rem → 1 ที่600px Card padding1.75rem, heading1.2rem, body.85rem ไม่มีกราฟ/ยอดขายที่ hardcode แยกจาก flow

Record layout31%/1fr ยุบ1columnที่68.75rem Cards เลือกได้จริงและ details/actions ใช้ shared domain state Semantic tables มี overflow-x:auto, cell padding.875rem ไม่มี placeholder pagination

### Forms and dialogs

Phase 8 extension (2026-10-19): connected Admin → Workers adds inline Create/Edit profiles with required name, email and phone alongside username/employee number. Existing account status/password controls stay real; legacy null contacts display as missing, not invented values. Editing loads the current profile from the API. Inputs reuse `.form-field` and semantic theme tokens; `.live-editor` uses divider-separated inline sections, not new modal/card layers. `.live-worker-row` separates records with a thin divider. New spacing uses rem so Small/Medium/Large continue to apply. Backend/API role remains `worker`; connected legacy English labels are retained in this scope.

Connected auth ใช้ดีไซน์ Login/Register หลักที่ `/login` และ `/register` ร่วมกับ backend เดียวกันสำหรับ Customer, Staff และ Admin โดย session อยู่ใน memory และไม่ fallback เข้า demo เมื่อ API ล้มเหลว ใต้ฟอร์มจริงมีส่วน "บัญชีทดสอบ — ข้ามการเข้าสู่ระบบ" พร้อมปุ่ม Customer/Staff/Admin สามปุ่ม

Auth spacing ใช้ระยะจากช่องสุดท้ายถึงปุ่มหลัก `1.5rem`, จากปุ่มหลักถึงลิงก์สลับ Login/Register `1rem`, ก่อน divider ของ demo bypass `1.75rem` และระหว่างปุ่ม bypass `.75rem` เพื่อรักษาลำดับสายตาในทุก UI scale

ส่วน "บัญชีทดสอบ — ข้ามการเข้าสู่ระบบ" ใช้ native `details/summary` และปิดเป็นค่าเริ่มต้น หัวข้อสูงอย่างน้อย `3.5rem` มี chevron หมุนเมื่อเปิด รองรับ keyboard และปิด transition เมื่อผู้ใช้ตั้งค่า reduced motion

UC forms มี validation, local attachment preparation/preview และ Upload again ตาม develop จำกัด100MB ยังไม่มี S3 upload จริง Input1rem, button min-height2.875rem, panel radius1rem, heading1.375rem, bodyอย่างน้อย.75rem สีพื้น/ขอบ/ข้อความใช้ semantic tokens ใน workflows.css Status badges มีสีแยก light/dark

Settings ใช้ native dialog width min(32.5rem,100vw−2rem), max-height100dvh−2rem, overflow:auto ตัวเลือก radio มีกรอบปุ่ม min-height3.25rem สถานะปัจจุบันแสดงด้วยกรอบส้มและ checked state เท่านั้น Dialog ของ UC ใช้ demo-ui.tsx พร้อม Escape และคืน focus

### Icons and brand

Icon เป็น inline SVG viewBox `0 0 24 24`, fill none, stroke currentColor, width1.8, round cap/join ขนาด default1.125rem ชุดชื่อ: grid, inbox, machine, truck, file, layers, wallet, clock, search, plus, arrow, bell, logout, close, sun, moon ค่า width/height SSR และ client ต้องตรงกัน

Brand mark เป็น CSS square สีส้มหมุน45° พร้อมกากบาทเข้ม ขนาด2.0625rem; ใช้ข้อความ LATHE / SHOP CONTROL ไม่มี logo image file ภาพเครื่องจักร Landing เป็น CSS illustration

## Routes

| URL | Surface |
| --- | --- |
| / | Landing |
| /login, /register | ฟอร์มดีไซน์หลักที่เชื่อม sign-in / customer registration จริง พร้อม demo bypass ใต้ฟอร์ม |
| /staff | Staff overview |
| /staff/quotations, /staff/materials, /staff/orders, /staff/receiving, /staff/production, /staff/delivery-payment | UC2 และ UC5–UC9 |
| /customer | Customer overview |
| /customer/requests, /customer/quotations, /customer/deposit-po, /customer/delivery-payment | UC1 / UC3 / UC4 / UC9 |
| /admin, /admin/workers, /admin/orders | Admin overview, จัดการ Staff และ UC6 |

Legacy redirects: /staff/requests → /staff/quotations; /staff/delivery, /staff/payments, /staff/debtors → /staff/delivery-payment; /customer/jobs → /customer/requests; /customer/documents → /customer/deposit-po; /customer/payments → /customer/delivery-payment

Root layout ถือ shared demo provider จึงรักษา records และ File references ระหว่าง client navigation/role switch; reload ล้างตัวอย่าง Route guard ส่งผู้ไม่มี demo role ไป /login และผู้ผิดบทบาทไปภาพรวมของตน เป็นการแยก demo UI ไม่ใช่ production authorization Admin มีเพียงจัดการพนักงานและสั่งซื้อ Staff ไม่ได้สิทธิ์จัดการพนักงาน

## Responsive contract

| Width | Behavior |
| --- | --- |
| >900px | Sidebar fixed17rem และ pinned Settings/Account |
| ≤900px | Sidebar drawer, main margin0, topbar menu button |
| ≤75rem | Overview cards2columns |
| ≤68.75rem | Record layout1column |
| ≤600px | Cards/forms1column; tables scroll horizontally |
| ≤73.75rem / ≤51.25rem | Auth narrower columns / single column |
| ≤70rem / ≤47.5rem | Landing hero / workflow becomes single column |

ทดสอบ Large แยกจาก breakpoint เพราะ rem media queries อิง browser initial font size

## State, motion and accessibility

- `localStorage`: `lathe-theme` light/dark และ `lathe-ui-size` small/medium/large; อ่าน legacy `lathe-text-size` ได้
- ค่าเริ่ม state dark/medium แล้วอ่าน storage/system preference หลัง mount เพื่อไม่ให้ SSR/client markup ต่างกัน
- Theme ใช้ `startViewTransition` ถ้ารองรับ; 320ms ease-in-out, fallback transition250ms; reduced-motion ปิด animation
- Navigation active สะท้อน path และรองรับ refresh/back/forward Settings radio checked เป็น semantic state; แต่ละ instance ใช้ useId แยก radio group เพื่อไม่ชนกับหน้าที่ Next เก็บไว้ใน cache; dialogใช้ Tab/Escape ตาม native behavior
- หน้าใช้ `lang=th`; เงินบาท เวลา Asia/Bangkok ไม่มี VAT Key icon controls มี aria-label
- Functional demo มี existing empty/error/success states และ native dialogs; full accessibility audit และ production auth/network behavior ยังรอ integration

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

### Change log

| Date | Change | Verification |
| --- | --- | --- |
| 2026-10-19 | Add connected Worker contact create/edit and retain nullable legacy profiles; preserve upstream auth design/routes | Exact contact tests + build; browser verification in Phase 8 handoff |
| 2026-10-19 | Preserve upstream designed auth/routes while merging Phase 8 exact evidence/contact primitives; no intentional visual redesign | Production build + 53 native tests; source appendix refreshed |
| 2026-10-16 | Merge design with functional develop flows, Admin routes, Staff naming, shared provider, pinned sidebar และ workflow theme tokens | Verification: docs/08-design-workflow-integration.md |
| 2026-10-16 | Merge latest develop: connected AUTH/UC1–UC3 at `/login` and `/register`, separate demo entry, sixth-rejection rule และ themed live surfaces | 47 tests + production build |
| 2026-10-16 | ย้าย logic AUTH จริงเข้า Login/Register ดีไซน์หลักโดยตรง และวาง Customer/Staff/Admin bypass ไว้ใต้ฟอร์ม | Browser + 47 tests + production build |
| 2026-10-16 | ปรับ vertical rhythm ของปุ่ม Login/Register, ลิงก์สลับหน้า และ demo bypass | Browser + design snapshot |
| 2026-10-16 | ทำส่วนบัญชีทดสอบใต้ฟอร์มให้ collapse ได้และปิดเป็นค่าเริ่มต้น | Browser keyboard/state + production build |
| 2026-10-16 | Initial implemented-design baseline: themes, UI scale, scrollable sidebar, Settings border state, typography, routes and source snapshot | Source comparison and snapshot check |

## Generated source appendix

อย่าแก้เนื้อหาระหว่าง markers ด้วยมือ CSS snapshot รักษาทุก declaration ตามลำดับ รวม selector เก่าที่อาจไม่ได้ render อยู่ จึงใช้ประกอบกับ component markup

<!-- DESIGN-SNAPSHOT:START -->

### A. Full CSS specification — app/globals.css

Preserve order and media-query context when reproducing the design.

```css
@import "tailwindcss";

:root {
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
}

/* Scale all rem-based UI dimensions together; viewport heights stay viewport-sized. */
html { font-size: calc(100% * var(--ui-scale)); }
html[data-ui-size="small"] { --ui-scale: .9; }
html[data-ui-size="large"] { --ui-scale: 1.15; }
.appearance-settings { width: min(32.5rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); margin: auto; padding: 1.75rem; overflow: auto; border: 0.0625rem solid var(--line); border-radius: 1.5rem; background: var(--surface); color: var(--text); box-shadow: 0 1.5rem 5.625rem #0004; text-align: left; }
.appearance-settings::backdrop { background: #0008; backdrop-filter: blur(0.3125rem); }
.settings-heading { display: flex; justify-content: space-between; align-items: start; gap: 1rem; }
.settings-heading h2 { margin: 0; font-size: 1.5rem; font-weight: 700; }
.settings-heading button { flex-shrink: 0; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: var(--surface-2); cursor: pointer; }
.appearance-settings > p, .appearance-settings > small { color: var(--muted); font-size: 0.8125rem; line-height: 1.7; }
.appearance-settings fieldset { margin: 1.5rem 0; padding: 0; border: 0; }
.appearance-settings legend { margin-bottom: 0.75rem; font-size: 0.9375rem; font-weight: 700; }
.settings-options { display: flex; gap: 0.625rem; }
.settings-options label { position: relative; flex: 1; min-width: 0; cursor: pointer; }
.settings-options input { position: absolute; opacity: 0; width: 0.0625rem; height: 0.0625rem; }
.settings-options span { display: flex; align-items: center; justify-content: center; gap: 0.5rem; min-height: 3.25rem; padding: 0.625rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: var(--surface-2); font-size: 0.9375rem; font-weight: 600; }
.settings-options input:checked + span { color: var(--lime); border-color: var(--lime); background: color-mix(in srgb, var(--lime) 12%, var(--surface)); box-shadow: inset 0 0 0 0.0625rem var(--lime); }
.settings-options input:focus-visible + span { outline: 0.125rem solid var(--lime); outline-offset: 0.1875rem; }
.settings-preview { padding: 1.125rem; margin-bottom: 1.125rem; border: 0.0625rem solid var(--line); border-radius: 0.875rem; background: var(--surface-2); font-size: 1rem; line-height: 1.7; }
.settings-preview p { margin: 0.375rem 0 0; color: var(--muted); font-size: 0.875rem; }
.appearance-settings .settings-done { display: flex; justify-content: center; width: 100%; min-height: 3rem; height: auto; margin-top: 1.375rem; font-size: 0.875rem; }
.settings-trigger.theme-toggle span { font-size: 0.8125rem; letter-spacing: 0; }

* { box-sizing: border-box; }
html, body { min-height: 100%; }
body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-geist-sans), "IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif; }
button, input, textarea { font: inherit; }
button { color: inherit; }
button, label { -webkit-tap-highlight-color: transparent; }

.app-shell { min-height: 100vh; background: radial-gradient(circle at 88% -10%, rgba(255,155,69,.07), transparent 28%), var(--bg); }
.sidebar { position: fixed; inset: 0 auto 0 0; z-index: 20; width: 15.25rem; padding: 1.625rem 1.125rem 1.25rem; display: flex; flex-direction: column; border-right: 0.0625rem solid var(--line); background: rgba(12,14,14,.97); }
.brand { height: 2.875rem; display: flex; align-items: center; gap: 0.6875rem; padding: 0 0.5rem; letter-spacing: .04em; }
.brand > span:last-child { display: flex; flex-direction: column; line-height: 1; }
.brand b { font-size: 1rem; letter-spacing: .18em; }
.brand small { margin-top: 0.3125rem; color: #777e79; font-size: 0.5rem; letter-spacing: .2em; }
.brand-mark { position: relative; width: 1.8125rem; height: 1.8125rem; border-radius: 0.5rem; background: var(--lime); transform: rotate(45deg); box-shadow: 0 0 1.75rem rgba(255,155,69,.2); }
.brand-mark:before, .brand-mark:after, .brand-mark span:before, .brand-mark span:after { content: ""; position: absolute; background: #151815; border-radius: 0.1875rem; }
.brand-mark:before { width: 0.8125rem; height: 0.25rem; left: 0.5rem; top: 0.75rem; }
.brand-mark:after { width: 0.25rem; height: 0.8125rem; left: 0.75rem; top: 0.5rem; }
.role-switch { display: grid; grid-template-columns: 1fr 1fr; gap: 0.1875rem; padding: 0.1875rem; margin: 1.6875rem 0.1875rem 1.9375rem; border: 0.0625rem solid var(--line); border-radius: 0.625rem; background: #0b0d0c; }
.role-switch button { height: 2rem; border: 0; border-radius: 0.4375rem; background: transparent; color: #767d78; font-size: 0.75rem; cursor: pointer; }
.role-switch button.active { background: var(--surface-3); color: var(--text); box-shadow: inset 0 0 0 0.0625rem #303432; }
.nav-list { display: flex; flex-direction: column; gap: 0.3125rem; }
.nav-list a { text-decoration: none; }
.nav-list a:focus-visible { outline: 0.125rem solid var(--lime); outline-offset: 0.125rem; }
.topbar.staff-topbar { justify-content: flex-end; }
.staff-topbar .topbar-actions { margin-left: auto; justify-content: flex-end; min-width: 0; }
.customer-route-content { display: grid; gap: 1rem; }
.customer-stage .customer-route-content .customer-side-stack { grid-template-columns: minmax(0,1fr); }
.customer-route-content .status-pill { display: inline-block; margin-top: 1.25rem; }
.nav-label { padding: 0 0.75rem 0.6875rem; color: #59605c; font-size: 0.5625rem; font-weight: 700; letter-spacing: .2em; }
.nav-list :is(button, a) { width: 100%; height: 2.6875rem; padding: 0 0.6875rem; display: grid; grid-template-columns: 1.875rem 1fr auto; align-items: center; gap: 0.3125rem; border: 0.0625rem solid transparent; border-radius: 0.6875rem; background: transparent; color: #89908c; text-align: left; font-size: 0.8125rem; cursor: pointer; transition: .2s ease; }
.nav-list :is(button, a):hover { color: #d9ddd8; background: #151817; }
.nav-list :is(button, a).active { color: var(--text); border-color: #343835; background: linear-gradient(90deg, #242824, #1a1d1b); font-weight: 700; }
.nav-list :is(button, a).active .nav-icon { color: var(--lime); background: #352820; }
.nav-icon { width: 1.75rem; height: 1.75rem; display: grid; place-items: center; border-radius: 0.5rem; }
.nav-list em { min-width: 1.375rem; height: 1.25rem; padding: 0 0.375rem; display: grid; place-items: center; border-radius: 0.5625rem; background: #272b28; color: #b9c0bb; font-size: 0.625rem; font-style: normal; }
.sidebar-footer { margin-top: auto; padding: 1.0625rem 0.4375rem 0.0625rem; display: grid; grid-template-columns: 2.375rem 1fr 1.5rem; align-items: center; border-top: 0.0625rem solid var(--line); }
.sidebar-footer .avatar { width: 2rem; height: 2rem; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(140deg, #464d49, #242825); color: var(--lime); font-size: 0.625rem; font-weight: 700; }
.sidebar-footer > div:nth-child(2) { min-width: 0; display: flex; flex-direction: column; }
.sidebar-footer strong { overflow: hidden; color: #dfe2de; font-size: 0.6875rem; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-footer span { color: #636a66; font-size: 0.5625rem; }
.sidebar-footer button { border: 0; background: transparent; color: #686f6a; cursor: pointer; }

.app-stage { min-height: 100vh; margin-left: 15.25rem; }
.topbar { height: 4.75rem; padding: 0 1.75rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.0625rem solid var(--line); background: rgba(10,11,11,.83); backdrop-filter: blur(1.125rem); position: sticky; top: 0; z-index: 15; }
.status-ribbon { display: flex; gap: 0.5625rem; align-items: center; }
.status-ribbon > span { padding: 0.4375rem 0.625rem; border: 0.0625rem solid var(--line-soft); border-radius: 0.5625rem; color: #747b77; background: #101211; font-size: 0.625rem; }
.status-ribbon > span:first-child { color: #aab0ab; }
.live-dot { width: 0.375rem; height: 0.375rem; display: inline-block; margin-right: 0.375rem; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 0.25rem rgba(255,155,69,.1), 0 0 0.8125rem rgba(255,155,69,.42); }
.topbar-actions { display: flex; align-items: center; gap: 0.625rem; }
.search, .table-search { height: 2.375rem; display: flex; align-items: center; gap: 0.5625rem; padding: 0 0.75rem; border: 0.0625rem solid var(--line); border-radius: 0.625rem; background: #101212; color: #68706b; }
.search { width: 17.75rem; }
.search input, .table-search input { width: 100%; border: 0; outline: 0; background: transparent; color: #dce0dc; font-size: 0.6875rem; }
.search input::placeholder, .table-search input::placeholder { color: #5f6662; }
.icon-button { position: relative; width: 2.375rem; height: 2.375rem; display: grid; place-items: center; border: 0.0625rem solid var(--line); border-radius: 0.625rem; background: #121414; color: #949b96; cursor: pointer; }
.icon-button > span { position: absolute; top: 0.5rem; right: 0.5rem; width: 0.3125rem; height: 0.3125rem; border-radius: 50%; background: var(--lime); }
.primary-button, .secondary-button { height: 2.375rem; padding: 0 0.9375rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.625rem; cursor: pointer; }
.primary-button { border: 0.0625rem solid #ffc184; background: var(--lime); color: #21150c; font-size: 0.6875rem; font-weight: 700; box-shadow: 0 0.5rem 1.625rem rgba(255,155,69,.12); }
.primary-button:hover { background: #ffad63; }
.secondary-button { border: 0.0625rem solid var(--line); background: var(--surface-2); color: #aab0ac; }

.page-content { max-width: 96.25rem; margin: 0 auto; padding: 2.25rem 2rem 3.75rem; }
.page-heading { min-height: 4.625rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.625rem; }
.eyebrow { display: block; margin-bottom: 0.375rem; color: #69706c; font-size: 0.5625rem; font-weight: 700; letter-spacing: .18em; }
.page-heading h1 { margin: 0; font-size: clamp(1.625rem, 2.35vw, 2.375rem); line-height: 1.15; letter-spacing: -.045em; }
.page-heading p { margin: 0.4375rem 0 0; color: var(--muted); font-size: 0.75rem; }
.heading-meta { display: flex; flex-direction: column; align-items: flex-end; padding-top: 0.875rem; }
.heading-meta span { color: #68706b; font-size: 0.625rem; }
.heading-meta strong { margin-top: 0.1875rem; color: #bcc2bd; font-size: 0.75rem; font-weight: 500; }
.customer-tag { margin-top: 0.6875rem; padding: 0.5625rem 0.75rem; border: 0.0625rem solid var(--line); border-radius: 0.625rem; color: #aab0ac; background: var(--surface); font-size: 0.6875rem; }
.quick-strip { min-height: 3.25rem; margin-bottom: 0.9375rem; padding: 0.4375rem 0.625rem; display: flex; align-items: center; gap: 0.375rem; overflow-x: auto; border: 0.0625rem solid var(--line); border-radius: 0.8125rem; background: rgba(17,19,19,.8); }
.quick-strip > span { padding: 0 0.6875rem 0 0.25rem; color: #646c67; font-size: 0.5625rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; white-space: nowrap; }
.quick-strip button { height: 1.9375rem; padding: 0 0.6875rem; border: 0.0625rem solid transparent; border-radius: 0.5rem; background: transparent; color: #777e79; font-size: 0.625rem; white-space: nowrap; cursor: pointer; }
.quick-strip button.selected { border-color: #373c39; background: #212422; color: #d9ddda; }
.quick-strip b { margin-left: 0.3125rem; color: #aeb5b0; font-size: 0.5625rem; }

.metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.8125rem; margin-bottom: 0.8125rem; }
.metric-card { position: relative; min-height: 8.875rem; padding: 1.0625rem 1.0625rem 0.9375rem; overflow: hidden; border: 0.0625rem solid var(--line); border-radius: 0.875rem; background: linear-gradient(145deg, #151717, #101212); }
.metric-card:after { content: ""; position: absolute; right: -1.875rem; bottom: -2.5rem; width: 7.5rem; height: 7.5rem; border-radius: 50%; background: rgba(255,255,255,.018); }
.metric-card.accent { border-color: #6e4a2f; background: linear-gradient(145deg, #2a211a, #171310 74%); }
.metric-top { display: flex; align-items: center; justify-content: space-between; color: #89908b; font-size: 0.625rem; }
.metric-top button { width: 1.5625rem; height: 1.5625rem; display: grid; place-items: center; border: 0.0625rem solid #2d312f; border-radius: 0.5rem; background: #191c1a; color: #656c67; }
.metric-card > strong { display: block; margin-top: 0.5rem; font-size: 1.5625rem; letter-spacing: -.05em; }
.metric-card.accent > strong { color: var(--lime); }
.metric-card > small { position: absolute; bottom: 0.875rem; left: 1.0625rem; color: #646b67; font-size: 0.5625rem; }
.mini-chart { position: absolute; right: 1rem; bottom: 1.0625rem; width: 5.25rem; height: 2.375rem; display: flex; align-items: flex-end; gap: 0.25rem; }
.mini-chart i { width: 0.5rem; min-height: 0.1875rem; border-radius: 0.1875rem 0.1875rem 0.0625rem 0.0625rem; background: #343936; }
.metric-card.accent .mini-chart i:nth-last-child(-n+3) { background: var(--lime-soft); }

.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(18.125rem, .85fr); gap: 0.8125rem; }
.panel { position: relative; border: 0.0625rem solid var(--line); border-radius: 0.9375rem; background: linear-gradient(145deg, #141616, #101212); }
.production-panel { min-height: 22.625rem; padding: 1.125rem; }
.panel-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; }
.panel-head h2 { margin: 0; font-size: 0.9375rem; font-weight: 600; letter-spacing: -.02em; }
.text-button { display: flex; align-items: center; gap: 0.25rem; border: 0; background: transparent; color: #747b77; font-size: 0.5625rem; cursor: pointer; }
.job-list { margin-top: 0.875rem; }
.job-row { min-height: 4.125rem; display: grid; grid-template-columns: 0.25rem 7.25rem minmax(9.0625rem,1fr) 6.5625rem 1.625rem; align-items: center; gap: 0.8125rem; border-top: 0.0625rem solid var(--line-soft); }
.job-row:first-child { border-top: 0; }
.job-indicator { width: 0.1875rem; height: 1.75rem; border-radius: 0.5rem; background: var(--lime); }
.tone-1 { background: var(--cyan); }.tone-2 { background: var(--violet); }.tone-3 { background: var(--warning); }
.job-id, .job-work { min-width: 0; display: flex; flex-direction: column; }
.job-id strong, .job-work strong { overflow: hidden; color: #cbd0cc; font-size: 0.625rem; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.job-id span, .job-work span { margin-top: 0.1875rem; overflow: hidden; color: #5f6662; font-size: 0.5625rem; text-overflow: ellipsis; white-space: nowrap; }
.progress { display: grid; grid-template-columns: 1fr 1.5625rem; align-items: center; gap: 0.375rem; }
.progress > div { height: 0.1875rem; overflow: hidden; border-radius: 0.3125rem; background: #2b2f2c; }
.progress i { display: block; height: 100%; border-radius: inherit; background: var(--lime); }
.progress span { color: #777e79; font-size: 0.5rem; }
.job-row > button { border: 0; background: transparent; color: #616763; }
.revenue-panel { min-height: 22.625rem; padding: 1.125rem; }
.trend { padding: 0.3125rem 0.5rem; border-radius: 0.4375rem; background: #20281d; color: var(--lime); font-size: 0.5625rem; }
.money { display: block; margin-top: 1.25rem; font-size: 1.8125rem; letter-spacing: -.05em; }
.muted { color: #626965; font-size: 0.5625rem; }
.bar-chart { position: absolute; left: 1.125rem; right: 1.125rem; bottom: 1rem; height: 10rem; display: grid; grid-template-columns: repeat(12, 1fr); gap: 0.3125rem; align-items: end; border-bottom: 0.0625rem solid #292d2b; background: repeating-linear-gradient(to bottom, transparent 0, transparent 2.4375rem, rgba(255,255,255,.035) 2.5rem); }
.bar-chart div { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 0.375rem; }
.bar-chart i { width: 72%; min-height: 0.25rem; border-radius: 0.1875rem 0.1875rem 0 0; background: #313633; }
.bar-chart i.hot { background: var(--lime); box-shadow: 0 0 1.125rem rgba(255,155,69,.18); }
.bar-chart span { color: #59605c; font-size: 0.4375rem; }
.alert-panel, .activity-panel { min-height: 16.25rem; padding: 1.125rem; }
.count-badge { position: absolute; top: 1.0625rem; right: 1.0625rem; min-width: 1.5rem; height: 1.375rem; display: grid; place-items: center; border-radius: 0.5rem; background: #2b302b; color: var(--lime); font-size: 0.5625rem; }
.material-item { min-height: 3.5625rem; display: grid; grid-template-columns: 2.4375rem 1fr auto; align-items: center; gap: 0.625rem; border-top: 0.0625rem solid var(--line-soft); }
.material-item:nth-of-type(2) { margin-top: 0.75rem; }
.material-code { width: 2.125rem; height: 2.125rem; display: grid; place-items: center; border-radius: 0.5625rem; background: rgba(255,155,69,.13); color: var(--lime); font-size: 0.5rem; font-weight: 700; }
.material-code.color-1 { background: rgba(105,213,214,.1); color: var(--cyan); }.material-code.color-2 { background: rgba(141,126,246,.1); color: var(--violet); }
.material-item div { display: flex; flex-direction: column; }.material-item strong { color: #c9ceca; font-size: 0.625rem; font-weight: 500; }.material-item small { color: #5d645f; font-size: 0.5rem; }
.material-item em { padding: 0.25rem 0.375rem; border-radius: 0.375rem; background: rgba(239,120,111,.1); color: var(--danger); font-size: 0.5rem; font-style: normal; }.material-item em.neutral { background: #282b2a; color: #858c87; }
.activity { min-height: 3.0625rem; display: grid; grid-template-columns: 0.5rem 1fr; align-items: center; gap: 0.625rem; border-top: 0.0625rem solid var(--line-soft); }
.activity:nth-of-type(2) { margin-top: 0.75rem; }.activity > i { width: 0.375rem; height: 0.375rem; border-radius: 50%; background: #3b403d; }.activity > i.active { background: var(--lime); box-shadow: 0 0 0 0.25rem rgba(255,155,69,.09); }
.activity div { display: flex; flex-direction: column; }.activity strong { color: #bdc2be; font-size: 0.5625rem; font-weight: 500; }.activity span { color: #5b625e; font-size: 0.5rem; }

.workspace-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.8125rem; margin-bottom: 0.8125rem; }
.workspace-stats article { min-height: 7rem; padding: 1rem 1.125rem; display: flex; flex-direction: column; border: 0.0625rem solid var(--line); border-radius: 0.875rem; background: var(--surface); }
.workspace-stats article.featured { border-color: #65432b; background: linear-gradient(145deg,#2a211a,#171310); }
.workspace-stats span { color: #777e79; font-size: 0.625rem; }.workspace-stats strong { margin-top: 0.4375rem; font-size: 1.5rem; letter-spacing: -.04em; }.workspace-stats .featured strong { color: var(--lime); }.workspace-stats small { margin-top: auto; color: #5e6561; font-size: 0.5rem; }
.data-panel { overflow: hidden; }
.table-tools { min-height: 4.125rem; padding: 0.8125rem 0.9375rem; display: flex; align-items: center; justify-content: space-between; border-bottom: 0.0625rem solid var(--line); }
.segmented { display: flex; gap: 0.1875rem; padding: 0.1875rem; border: 0.0625rem solid var(--line); border-radius: 0.5625rem; background: #0d0f0f; }
.segmented button { height: 1.8125rem; padding: 0 0.625rem; border: 0; border-radius: 0.375rem; background: transparent; color: #626965; font-size: 0.5625rem; cursor: pointer; }.segmented button.active { background: #232624; color: #c9ceca; }
.table-search { width: 12.5rem; height: 2.25rem; }
.data-table { overflow-x: auto; }
.data-row { position: relative; min-width: 50rem; width: 100%; min-height: 4rem; padding: 0 2.875rem 0 1.0625rem; display: grid; grid-template-columns: 1.1fr 1.1fr 1.4fr 1fr .9fr; align-items: center; gap: 1.125rem; border: 0; border-bottom: 0.0625rem solid var(--line-soft); background: transparent; text-align: left; cursor: pointer; }
.data-row:not(.data-head):hover { background: #171a18; }
.data-head { min-height: 2.6875rem; color: #565d59; background: #0d0f0f; font-size: 0.5rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; cursor: default; }
.data-row span { overflow: hidden; color: #a9afaa; font-size: 0.625rem; text-overflow: ellipsis; white-space: nowrap; }.data-row span:first-child { color: #d4d8d5; }.data-row span i { margin-right: 0.75rem; color: #505753; font-size: 0.5rem; font-style: normal; }
.data-row b { position: absolute; right: 1.0625rem; color: #555c58; }.cell-status { width: fit-content; padding: 0.375rem 0.5rem; border-radius: 0.4375rem; background: #2a211a; color: #ffb773 !important; }
.table-footer { min-height: 3.875rem; padding: 0 1rem; display: flex; align-items: center; justify-content: space-between; color: #5b625e; font-size: 0.5625rem; }.table-footer div { display: flex; gap: 0.25rem; }.table-footer button { height: 1.75rem; min-width: 1.75rem; padding: 0 0.5rem; border: 0.0625rem solid var(--line); border-radius: 0.4375rem; background: transparent; color: #747b77; font-size: 0.5625rem; }.table-footer button.active { border-color: #a35b24; color: var(--lime); background: #2a2018; }

.customer-grid { display: grid; grid-template-columns: minmax(0,1.6fr) minmax(16.875rem,.75fr); gap: 0.8125rem; }
.customer-job { grid-row: span 2; min-height: 26.875rem; padding: 1.3125rem; }.status-pill { padding: 0.375rem 0.5625rem; border-radius: 0.5rem; background: #2a211a; color: var(--lime); font-size: 0.5625rem; }
.customer-job-meta { margin-top: 1.625rem; display: grid; grid-template-columns: repeat(3,1fr); border: 0.0625rem solid var(--line); border-radius: 0.75rem; }.customer-job-meta div { padding: 0.875rem; display: flex; flex-direction: column; border-right: 0.0625rem solid var(--line); }.customer-job-meta div:last-child { border-right: 0; }.customer-job-meta span { color: #606763; font-size: 0.5rem; }.customer-job-meta strong { margin-top: 0.25rem; color: #c9ceca; font-size: 0.625rem; }
.timeline { margin: 2.875rem 0.625rem 2.625rem; display: grid; grid-template-columns: repeat(4,1fr); }.timeline div { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5625rem; color: #5d645f; font-size: 0.5625rem; }.timeline div:after { content:""; position:absolute; top:0.8125rem; left:50%; width:100%; height:0.0625rem; background:#303532; z-index:0; }.timeline div:last-child:after { display:none; }.timeline i { width:1.6875rem; height:1.6875rem; display:grid; place-items:center; z-index:1; border:0.0625rem solid #3a3f3c; border-radius:50%; background:#161918; color:#69706c; font-size: 0.5625rem; font-style:normal; }.timeline .done i { border-color:#b96a2d; background:#2b2018; color:var(--lime); }.timeline .done:after { background:#9c5724; }
.job-note { min-height: 4.5rem; padding: 0.875rem 1rem; display: grid; grid-template-columns: 0.75rem 1fr auto; align-items: center; gap: 0.5rem; border: 0.0625rem solid #493426; border-radius: 0.75rem; background: #201812; }.job-note div { display:flex; flex-direction:column; }.job-note strong { color:#d3d8d3; font-size: 0.625rem; }.job-note span { color:#687068; font-size: 0.5rem; }.job-note b { color:var(--lime); font-size: 1.0625rem; }
.quote-panel { padding: 1.25rem; background: linear-gradient(145deg,#2a211a,#15120f); }.quote-panel h2 { margin: 0.125rem 0 0.3125rem; font-size: 1rem; }.quote-panel p { margin:0; color:#707772; font-size: 0.5625rem; }.quote-panel > strong { display:block; margin-top:1.0625rem; color:var(--lime); font-size: 1.6875rem; }.quote-panel > small { display:block; color:#626963; font-size: 0.5rem; }.quote-panel .primary-button { width:100%; margin-top:1.125rem; }
.docs-panel { padding:1.25rem; }.doc-row { min-height:3.5625rem; display:grid; grid-template-columns:2.125rem 1fr 1.5rem; align-items:center; gap:0.5625rem; border-top:0.0625rem solid var(--line-soft); }.doc-row:nth-of-type(2){margin-top:0.75rem}.doc-row>span { width:1.875rem; height:1.875rem; display:grid; place-items:center; border-radius:0.5rem; background:#222623; color:#818983; }.doc-row div{display:flex;flex-direction:column}.doc-row strong{color:#bfc4c0;font-size: 0.5625rem;font-weight:500}.doc-row small{color:#59605c;font-size: 0.5rem}.doc-row button{border:0;background:transparent;color:#5b625e}

.modal-backdrop { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 1.25rem; background: rgba(2,3,3,.72); backdrop-filter: blur(0.5rem); }
.modal { width: min(45rem, 100%); overflow: hidden; border: 0.0625rem solid #363b38; border-radius: 1.125rem; background: #121414; box-shadow: 0 1.875rem 5.625rem rgba(0,0,0,.65); }
.modal-head { padding: 1.375rem; display:flex; align-items:flex-start; justify-content:space-between; border-bottom:0.0625rem solid var(--line); }.modal h2{margin:0;font-size: 1.25rem}.modal p{margin:0.3125rem 0 0;color:#747b76;font-size: 0.625rem}
.form-grid { padding:1.375rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem; }.form-grid label { display:flex; flex-direction:column; gap:0.4375rem; color:#969d98; font-size: 0.5625rem; }.form-grid label.full { grid-column:1/-1; }.form-grid input,.form-grid textarea { width:100%; border:0.0625rem solid var(--line); border-radius:0.625rem; outline:0; background:#0d0f0f; color:#dce0dc; padding:0 0.75rem; }.form-grid input{height:2.625rem}.form-grid textarea{height:5.375rem;padding-top:0.75rem;resize:vertical}.form-grid input:focus,.form-grid textarea:focus{border-color:#a45e29}.upload{height:2.625rem;padding:0 0.75rem;display:flex;flex-direction:column;justify-content:center;border:0.0625rem dashed #3a3f3c;border-radius:0.625rem;background:#0d0f0f;color:#a0a6a2}.upload small{color:#59605c;font-size: 0.4375rem}
.modal-actions { padding:0.9375rem 1.375rem; display:flex; justify-content:flex-end; gap:0.5rem; border-top:0.0625rem solid var(--line); }

/* Bold scale pass */
.sidebar { width: 17rem; padding: 1.875rem 1.375rem 1.5rem; }
.brand { height: 3.25rem; gap: 0.8125rem; }
.brand-button { width: 100%; border: 0; background: transparent; color: var(--text); cursor: pointer; text-align: left; }
.brand-mark { width: 2.0625rem; height: 2.0625rem; border-radius: 0.5625rem; }
.brand-mark:before { width: 0.9375rem; left: 0.5625rem; top: 0.875rem; }.brand-mark:after { height: 0.9375rem; left: 0.875rem; top: 0.5625rem; }
.brand b { font-size: 1.125rem; }.brand small { font-size: 0.5625rem; }
.role-switch { margin-top: 1.9375rem; margin-bottom: 2.25rem; }.role-switch button { height: 2.25rem; font-size: 0.8125rem; }
.nav-list { gap: 0.4375rem; }.nav-list :is(button, a) { height: 3.0625rem; font-size: 0.875rem; }.nav-icon { width: 2rem; height: 2rem; }
.app-stage { margin-left: 17rem; }.topbar { height: 5.25rem; padding: 0 2.25rem; }.status-ribbon > span { padding: 0.5rem 0.75rem; font-size: 0.6875rem; }
.search { width: 20.625rem; }.search,.table-search,.primary-button,.secondary-button,.icon-button { height: 2.6875rem; }.primary-button { padding: 0 1.1875rem; font-size: 0.75rem; }
.page-content { max-width: 105rem; padding: 3rem 2.75rem 4.75rem; }.page-heading { min-height: 5.375rem; margin-bottom: 1.9375rem; }.page-heading h1 { font-size: clamp(2.25rem,3vw,3rem); font-weight: 680; }.page-heading p { margin-top: 0.625rem; font-size: 0.875rem; }.eyebrow { margin-bottom: 0.5rem; font-size: 0.625rem; }
.quick-strip { min-height: 3.75rem; margin-bottom: 1.0625rem; padding: 0.5625rem 0.75rem; }.quick-strip button { height: 2.25rem; padding: 0 0.875rem; font-size: 0.6875rem; }
.metrics-grid { gap: 1rem; margin-bottom: 1rem; }.metric-card { min-height: 10.875rem; padding: 1.3125rem; border-radius: 1.0625rem; }.metric-top { font-size: 0.75rem; }.metric-card > strong { margin-top: 0.75rem; font-size: 2.0625rem; }.metric-card > small { bottom: 1.125rem; left: 1.3125rem; font-size: 0.625rem; }.mini-chart { right: 1.25rem; bottom: 1.25rem; width: 6.125rem; height: 3.0625rem; gap: 0.3125rem; }.mini-chart i { width: 0.5625rem; }
.dashboard-grid { gap: 1rem; }.panel { border-radius: 1.125rem; }.production-panel,.revenue-panel { min-height: 27.5rem; padding: 1.4375rem; }.panel-head h2 { font-size: 1.1875rem; }.job-list { margin-top: 1.1875rem; }.job-row { min-height: 4.9375rem; grid-template-columns: 0.25rem 8.4375rem minmax(10.625rem,1fr) 7.8125rem 1.75rem; gap: 1rem; }.job-id strong,.job-work strong { font-size: 0.75rem; }.job-id span,.job-work span { font-size: 0.625rem; }.progress span { font-size: 0.5625rem; }
.money { margin-top: 1.5625rem; font-size: 2.4375rem; }.bar-chart { left: 1.4375rem; right: 1.4375rem; bottom: 1.25rem; height: 13.125rem; gap: 0.4375rem; }
.alert-panel,.activity-panel { min-height: 19.875rem; padding: 1.4375rem; }.material-item { min-height: 4.25rem; }.material-code { width: 2.5rem; height: 2.5rem; font-size: 0.5625rem; }.material-item strong { font-size: 0.75rem; }.material-item small { font-size: 0.5625rem; }.activity { min-height: 3.8125rem; }.activity strong { font-size: 0.6875rem; }.activity span { font-size: 0.5625rem; }
.workspace-stats { gap: 1rem; margin-bottom: 1rem; }.workspace-stats article { min-height: 8.75rem; padding: 1.3125rem; }.workspace-stats span { font-size: 0.75rem; }.workspace-stats strong { font-size: 2rem; }.workspace-stats small { font-size: 0.5625rem; }
.table-tools { min-height: 4.75rem; padding: 1rem 1.1875rem; }.segmented button { height: 2.125rem; padding: 0 0.8125rem; font-size: 0.625rem; }.table-search { width: 15rem; }.data-row { min-height: 4.6875rem; padding-left: 1.3125rem; }.data-head { min-height: 3rem; font-size: 0.5625rem; }.data-row span { font-size: 0.75rem; }.table-footer { min-height: 4.375rem; font-size: 0.625rem; }

/* Landing */
.landing { min-height: 100vh; overflow: hidden; background: radial-gradient(circle at 82% 23%,rgba(255,155,69,.13),transparent 25%),radial-gradient(circle at 9% 8%,rgba(105,213,214,.035),transparent 18%),#090b0a; }
.landing-nav { max-width: 95rem; height: 6rem; margin: 0 auto; padding: 0 2.625rem; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 0.0625rem solid rgba(255,255,255,.08); }
.landing-nav .brand { padding: 0; }.landing-links { display: flex; gap: 2.25rem; }.landing-links a { color: #7f8781; font-size: 0.75rem; text-decoration: none; transition: color .2s; }.landing-links a:hover { color: var(--text); }
.landing-nav-actions { display: flex; justify-content: flex-end; gap: 0.625rem; }.landing-register { height: 2.6875rem; padding: 0 1.0625rem; border: 0.0625rem solid var(--line); border-radius: 0.6875rem; background: rgba(18,20,19,.8); color: #a7ada8; font-size: 0.75rem; cursor: pointer; }.landing-register:hover { border-color: #70482c; color: var(--lime); }.landing-nav-cta { height: 2.6875rem; }
.landing-hero { position: relative; max-width: 95rem; min-height: calc(100vh - 6rem); margin: 0 auto; padding: 5.125rem 2.625rem 6.25rem; display: grid; grid-template-columns: minmax(32.5rem,.94fr) minmax(33.75rem,1.06fr); align-items: center; gap: 2.375rem; }
.hero-copy { position: relative; z-index: 2; }.hero-kicker { width: fit-content; margin-bottom: 1.75rem; padding: 0.5625rem 0.75rem; border: 0.0625rem solid #30352f; border-radius: 0.5625rem; background: rgba(20,23,20,.75); color: #858d86; font-size: 0.625rem; font-weight: 700; letter-spacing: .16em; }
.hero-copy h1 { margin: 0; max-width: 47.5rem; font-size: clamp(3.625rem,6vw,5.75rem); line-height: .98; letter-spacing: -.072em; font-weight: 730; }.hero-copy h1 span { color: var(--lime); text-shadow: 0 0 3.125rem rgba(255,155,69,.16); }
.hero-copy > p { max-width: 38.75rem; margin: 1.875rem 0 0; color: #89918b; font-size: 1rem; line-height: 1.85; }
.hero-actions { margin-top: 2.125rem; display: flex; gap: 0.6875rem; }.hero-primary,.hero-secondary { height: 3.375rem; padding: 0 1.4375rem; display: inline-flex; align-items: center; gap: 0.6875rem; border-radius: 0.8125rem; font-size: 0.8125rem; font-weight: 650; cursor: pointer; }.hero-primary { border: 0.0625rem solid #ffc184; background: var(--lime); color: #21150c; box-shadow: 0 0.75rem 2.8125rem rgba(255,155,69,.15); }.hero-secondary { border: 0.0625rem solid #323734; background: #131615; color: #b5bbb6; }
.hero-proof { margin-top: 3.625rem; display: grid; grid-template-columns: repeat(3,1fr); max-width: 38.75rem; border-top: 0.0625rem solid var(--line); }.hero-proof div { min-height: 5.25rem; padding: 1.125rem 0.75rem 0 0; display: grid; grid-template-columns: 1.9375rem 1fr; gap: 0.75rem; border-right: 0.0625rem solid var(--line); }.hero-proof div:last-child { padding-left: 0.9375rem; border-right: 0; }.hero-proof strong { color: var(--lime); font-size: 0.6875rem; }.hero-proof span { color: #737b75; font-size: 0.625rem; line-height: 1.55; }
.hero-visual { position: relative; min-height: 41.25rem; display: grid; place-items: center; perspective: 87.5rem; }.hero-visual:before { content:""; position:absolute; inset:7% 0 0 7%; background: repeating-linear-gradient(0deg,transparent 0,transparent 2.6875rem,rgba(255,255,255,.026) 2.75rem),repeating-linear-gradient(90deg,transparent 0,transparent 2.6875rem,rgba(255,255,255,.026) 2.75rem); mask-image:radial-gradient(circle,#000 20%,transparent 72%); }
.machine-orbit { position: absolute; border: 0.0625rem solid rgba(255,155,69,.15); border-radius: 50%; }.orbit-one { width: 33.75rem; height: 33.75rem; }.orbit-two { width: 26.875rem; height: 26.875rem; border-color: rgba(255,255,255,.06); }
.machine-core { position:absolute; width:11.875rem; height:11.875rem; border:0.0625rem solid #4d3b2f; border-radius:50%; background:radial-gradient(circle at 42% 38%,#72513a 0,#2d2119 16%,#121512 42%,#090b0a 70%); box-shadow:0 0 0 1.75rem rgba(255,255,255,.012),0 0 5rem rgba(255,155,69,.12); }.machine-core:before,.machine-core:after{content:"";position:absolute;inset:1.6875rem;border:0.0625rem dashed #74543d;border-radius:50%}.machine-core:after{inset:3.8125rem;border-style:solid;background:#090b0a}.machine-core span,.machine-core i{position:absolute;z-index:2;top:5.75rem;left:-1.375rem;width:14.625rem;height:0.3125rem;border-radius:0.5625rem;background:linear-gradient(90deg,transparent,#bd6d31,var(--lime),#bd6d31,transparent);transform:rotate(45deg)}.machine-core i{transform:rotate(-45deg)}
.mock-dashboard { position: relative; z-index: 3; width: min(42.5rem,94%); min-height: 24.0625rem; padding: 1.375rem; border: 0.0625rem solid rgba(255,255,255,.15); border-radius: 1.25rem; background: linear-gradient(145deg,rgba(29,32,29,.96),rgba(11,13,12,.97)); box-shadow: 0 3.125rem 6.25rem rgba(0,0,0,.45); transform: rotateY(-7deg) rotateX(4deg) rotateZ(-1deg); backdrop-filter: blur(1.25rem); }
.mock-top { display:flex; align-items:flex-start; justify-content:space-between; padding-bottom:1.125rem; border-bottom:0.0625rem solid var(--line); }.mock-top div{display:flex;flex-direction:column}.mock-top span{color:#6c746e;font-size: 0.5rem;letter-spacing:.16em}.mock-top strong{margin-top:0.3125rem;font-size: 1.125rem}.mock-top em{color:#69706c;font-size: 0.5rem;font-style:normal}
.mock-job-focus { min-height: 9.6875rem; margin-top: 1.125rem; padding: 1.4375rem; display: flex; align-items: flex-start; justify-content: space-between; gap: 1.5rem; border: 0.0625rem solid #65432b; border-radius: 0.9375rem; background: linear-gradient(145deg,#2a211a,#151411); }.mock-job-focus>div { display:flex; flex-direction:column; }.mock-job-focus span { color:var(--lime);font-size: 0.5rem;font-weight:750;letter-spacing:.14em }.mock-job-focus strong { margin-top:1.125rem;font-size: 1.5625rem;letter-spacing:-.035em }.mock-job-focus small { margin-top:0.5625rem;color:#747b76;font-size: 0.5625rem}.mock-job-focus em { color:var(--lime);font-size: 2.375rem;font-style:normal;font-weight:730;line-height:1 }
.mock-progress { height: 0.4375rem; margin: -2.1875rem 1.4375rem 0; border-radius: 0.4375rem; background:#302a26; overflow:hidden }.mock-progress i { display:block;width:78%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#b86223,var(--lime)) }
.mock-flow { margin-top: 2.8125rem; display:grid;grid-template-columns:repeat(4,1fr) }.mock-flow>div { position:relative;display:flex;flex-direction:column;align-items:center;gap:0.625rem;color:#6c746e;font-size: 0.5rem}.mock-flow>div:after { content:"";position:absolute;top:0.9375rem;left:50%;width:100%;height:0.0625rem;background:#343936 }.mock-flow>div:last-child:after { display:none }.mock-flow i { position:relative;z-index:1;width:1.9375rem;height:1.9375rem;display:grid;place-items:center;border:0.0625rem solid #3a403c;border-radius:50%;background:#121513;color:#737b75;font-style:normal }.mock-flow .done i { border-color:#a55d28;background:#2b2018;color:var(--lime) }.mock-flow .done:after { background:#955020 }
.visual-label,.visual-chip { position:absolute;z-index:5;border:0.0625rem solid #353a36;background:rgba(17,20,18,.9);box-shadow:0 1.125rem 2.8125rem rgba(0,0,0,.35);backdrop-filter:blur(0.75rem)}.visual-label{top:4.0625rem;right:1.0625rem;padding:0.5625rem 0.75rem;border-radius:0.5625rem;color:#8b938c;font-size: 0.5rem;letter-spacing:.12em}.visual-chip{padding:0.8125rem 0.9375rem;display:flex;flex-direction:column;border-radius:0.75rem}.visual-chip span{color:#69706b;font-size: 0.4375rem;letter-spacing:.12em}.visual-chip strong{margin-top:0.25rem;font-size: 1.125rem}.left-chip{left:0;bottom:8.125rem}.right-chip{right:0.125rem;bottom:5.3125rem}.right-chip strong{color:var(--lime)}
.landing-workflow { padding: 6.875rem max(2.625rem,calc((100vw - 89.75rem)/2)); display:grid;grid-template-columns:.7fr 1.3fr;gap:5rem;background:#0d0f0e;border-top:0.0625rem solid var(--line);border-bottom:0.0625rem solid var(--line)}.section-heading>span{color:#6c746e;font-size: 0.5625rem;font-weight:700;letter-spacing:.18em}.section-heading h2,.capability-lead h2{margin:0.9375rem 0 0;font-size: clamp(2.625rem,4.5vw,4.125rem);line-height:1.02;letter-spacing:-.06em}.section-heading p{max-width:24.375rem;margin:1.5rem 0 0;color:#7e867f;font-size: 0.8125rem;line-height:1.8}.workflow-steps{display:grid;grid-template-columns:1fr 1fr;border-top:0.0625rem solid var(--line);border-left:0.0625rem solid var(--line)}.workflow-steps article{position:relative;min-height:14.375rem;padding:1.625rem;border-right:0.0625rem solid var(--line);border-bottom:0.0625rem solid var(--line)}.workflow-steps article>span{color:var(--lime);font-size: 0.625rem}.workflow-steps article>i{position:absolute;right:1.5625rem;top:1.5625rem;width:0.5625rem;height:0.5625rem;border-radius:50%;background:#343a35}.workflow-steps h3{margin:3.375rem 0 0.625rem;font-size: 1.125rem}.workflow-steps p{margin:0;max-width:16.875rem;color:#717872;font-size: 0.6875rem;line-height:1.7}
.landing-capabilities{padding:6.875rem max(2.625rem,calc((100vw - 89.75rem)/2)) 8.125rem}.capability-lead{display:flex;align-items:flex-end;justify-content:space-between}.capability-lead .eyebrow{align-self:flex-start}.capability-lead h2{text-align:right}.capability-grid{margin-top:4.0625rem;display:grid;grid-template-columns:repeat(3,1fr);gap:0.9375rem}.capability-grid article{min-height:15.625rem;padding:1.6875rem;border:0.0625rem solid var(--line);border-radius:1.125rem;background:linear-gradient(145deg,#151817,#0e100f)}.capability-grid .icon{color:var(--lime)}.capability-grid strong{display:block;margin-top:4.5rem;font-size: 1.125rem}.capability-grid p{max-width:20.625rem;margin:0.6875rem 0 0;color:#717872;font-size: 0.6875rem;line-height:1.75}
.landing-footer{max-width:95rem;min-height:6.875rem;margin:0 auto;padding:0 2.625rem;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-top:0.0625rem solid var(--line)}.landing-footer .brand{padding:0}.landing-footer p{color:#606762;font-size: 0.625rem}.landing-footer>button{justify-self:end;display:flex;align-items:center;gap:0.4375rem;border:0;background:transparent;color:#a1a8a2;font-size: 0.6875rem;cursor:pointer}

@media (max-width: 70rem) { .sidebar { width: 12.875rem; }.app-stage { margin-left:12.875rem }.metrics-grid { grid-template-columns:repeat(2,1fr) }.dashboard-grid { grid-template-columns:1fr }.production-panel,.revenue-panel { min-height:21.25rem }.search { width:13.75rem }.status-ribbon span:nth-child(n+2){display:none} }
@media (max-width: 56.25rem) { .sidebar { position:relative; width:100%; height:auto; min-height:0; padding:1rem; border-right:0; border-bottom:0.0625rem solid var(--line) }.brand { height:2.5rem }.role-switch{position:absolute;top:0.9375rem;right:1rem;width:9.375rem;margin:0}.nav-list{margin-top:1rem;display:grid;grid-template-columns:repeat(4,minmax(7.5rem,1fr));overflow-x:auto;padding-bottom:0.25rem}.nav-label,.sidebar-footer{display:none}.nav-list :is(button, a){min-width:7.5rem}.app-stage{margin-left:0}.topbar{height:4rem;padding:0 1rem}.status-ribbon{display:none}.topbar-actions{width:100%}.search{width:auto;flex:1}.page-content{padding:1.5625rem 1rem 2.8125rem}.page-heading{min-height:0}.page-heading h1{font-size: 1.75rem}.heading-meta{display:none}.metrics-grid{grid-template-columns:1fr 1fr}.dashboard-grid,.customer-grid{grid-template-columns:1fr}.customer-job{grid-row:auto}.workspace-stats{grid-template-columns:1fr}.job-row{grid-template-columns:0.25rem 1fr 5rem 1.5625rem}.job-work{display:none}.form-grid{grid-template-columns:1fr}.form-grid label.full{grid-column:auto}.quick-strip>span{display:none}.topbar .primary-button{padding:0 0.6875rem}.topbar .primary-button{font-size:0}.topbar .primary-button .icon{width:1.125rem} }
@media (max-width: 30rem) { .metrics-grid{grid-template-columns:1fr}.page-heading{flex-direction:column}.workspace-stats{grid-template-columns:1fr}.table-tools{align-items:stretch;flex-direction:column;gap:0.5625rem}.table-search{width:100%}.segmented{overflow-x:auto}.quick-strip{margin-left:-1rem;margin-right:-1rem;border-radius:0}.customer-job-meta{grid-template-columns:1fr}.customer-job-meta div{border-right:0;border-bottom:0.0625rem solid var(--line)}.customer-job-meta div:last-child{border-bottom:0}.timeline{margin-left:-0.5rem;margin-right:-0.5rem}.modal-backdrop{padding:0.5rem}.modal{max-height:calc(100vh - 1rem);overflow:auto} }

@media (max-width: 70rem) {
  .landing-nav { grid-template-columns: 1fr auto; }.landing-links { display: none; }
  .landing-hero { grid-template-columns: 1fr; padding-top: 4.375rem; }.hero-copy { max-width: 48.75rem; }.hero-visual { min-height: 37.5rem; }
  .landing-workflow { grid-template-columns: 1fr; gap: 3.125rem; }.capability-lead { align-items: flex-start; flex-direction: column; }.capability-lead h2 { text-align: left; }
}
@media (max-width: 47.5rem) {
  .landing-nav { height: 5.125rem; padding: 0 1.125rem; }.landing-nav-actions .landing-register { display: none; }.landing-nav-cta { padding: 0 0.8125rem; }
  .landing-hero { min-height: auto; padding: 3.4375rem 1.125rem 4.375rem; }.hero-copy h1 { font-size: clamp(3.0625rem,14vw,4.5rem); }.hero-copy > p { font-size: 0.875rem; }.hero-proof { margin-top: 2.625rem; }
  .hero-visual { min-height: 30rem; margin-top: 1.5625rem; }.machine-orbit.orbit-one { width: 24.375rem; height: 24.375rem; }.machine-orbit.orbit-two { width: 19.375rem; height: 19.375rem; }.machine-core { width: 9.0625rem; height: 9.0625rem; }.machine-core:before{inset:1.375rem}.machine-core:after{inset:3rem}.machine-core span,.machine-core i{top:4.375rem;left:-0.875rem;width:10.75rem}.mock-dashboard { min-height: 20.625rem; padding: 0.9375rem; }.visual-label { top:1.25rem;right:0.3125rem; }
  .landing-workflow,.landing-capabilities { padding: 4.875rem 1.125rem; }.workflow-steps { grid-template-columns: 1fr; }.workflow-steps article { min-height: 11.875rem; }.capability-grid { grid-template-columns: 1fr; margin-top: 2.5rem; }.capability-grid article { min-height: 13.125rem; }.capability-grid strong { margin-top: 3.25rem; }
  .landing-footer { min-height: 9.375rem; padding: 1.5625rem 1.125rem; grid-template-columns: 1fr auto; }.landing-footer p { grid-column: 1/-1; grid-row: 2; }.landing-footer>button { grid-column: 2;grid-row:1; }
}
@media (max-width: 30rem) {
  .landing-nav .brand small { display:none; }.landing-nav-cta { font-size:0; }.landing-nav-cta .icon { width:1.125rem;height:1.125rem; }
  .hero-copy h1 { font-size: 3rem; }.hero-actions { align-items:stretch;flex-direction:column; }.hero-primary,.hero-secondary { justify-content:center; }.hero-proof { grid-template-columns:1fr; }.hero-proof div,.hero-proof div:last-child { min-height:3.75rem;padding:0.875rem 0;border-right:0;border-bottom:0.0625rem solid var(--line); }
  .hero-visual { min-height:26.25rem;margin-left:-1.25rem;margin-right:-1.25rem}.mock-dashboard{width:100%;transform:rotateY(-4deg) rotateX(3deg)}.mock-job-focus{padding:1.125rem;min-height:9.0625rem}.mock-job-focus strong{font-size: 1.25rem}.mock-job-focus em{font-size: 1.9375rem}.mock-progress{margin-left:1.125rem;margin-right:1.125rem}.machine-orbit.orbit-one{width:20.625rem;height:20.625rem}.machine-orbit.orbit-two{width:16.25rem;height:16.25rem}
  .section-heading h2,.capability-lead h2 { font-size: 2.625rem; }.landing-footer>button{font-size:0}.landing-footer>button .icon{width:1.25rem;height:1.25rem}
}

/* Staff identity */
.staff-space { margin: 1.875rem 0 1.375rem; padding: 0.875rem 0.9375rem; display: flex; flex-direction: column; gap: 0.25rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: #111412; }
.staff-space span { color: var(--lime); font-size: 0.5rem; font-weight: 700; letter-spacing: .16em; }
.staff-space strong { color: #9ca39d; font-size: 0.75rem; font-weight: 700; }
.sidebar .nav-list :is(button, a):not(.active) { font-weight: 600; }
.app-shell :is(h1, h2), .customer-portal :is(h1, h2) { font-weight: 700; }

/* Login */
.login-page { min-height: 100vh; display: grid; grid-template-columns: minmax(30rem,1.08fr) minmax(30rem,.92fr); background: #090b0a; }
.login-showcase { position: relative; min-height: 100vh; overflow: hidden; padding: 2.375rem 3.375rem; display: flex; flex-direction: column; background: radial-gradient(circle at 70% 48%,rgba(255,155,69,.16),transparent 27%),linear-gradient(145deg,#15120f,#080a09 72%); border-right: 0.0625rem solid var(--line); }
.login-showcase:before { content:""; position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent 0,transparent 4.3125rem,rgba(255,255,255,.025) 4.375rem),repeating-linear-gradient(90deg,transparent 0,transparent 4.3125rem,rgba(255,255,255,.025) 4.375rem); mask-image:linear-gradient(90deg,#000,transparent 90%); }
.login-home { position: relative; z-index: 3; width: fit-content; padding: 0; border: 0; background: transparent; color: var(--text); cursor: pointer; }
.login-showcase-copy { position: relative; z-index: 3; margin: auto 0; max-width: 41.25rem; }
.login-showcase-copy .hero-kicker { display: block; }
.login-showcase-copy h1 { margin: 0; font-size: clamp(3.875rem,6.2vw,6.5rem); line-height: .95; letter-spacing: -.075em; }
.login-showcase-copy p { max-width: 34.375rem; margin: 1.75rem 0 0; color: #7b847d; font-size: 0.9375rem; line-height: 1.85; }
.login-machine { position: absolute; right: -9.375rem; bottom: -10.3125rem; width: 36.875rem; height: 36.875rem; display: grid; place-items: center; opacity: .62; }
.login-machine .machine-core { transform: scale(1.25); }
.login-showcase-footer { position: relative; z-index: 3; display: flex; justify-content: space-between; color: #59615b; font-size: 0.5625rem; letter-spacing: .13em; }
.login-panel { min-height: 100vh; padding: 2.375rem 8vw; display: flex; flex-direction: column; justify-content: center; background: #0d0f0e; }
.login-back { position: absolute; top: 2.375rem; padding: 0; border: 0; background: transparent; color: #717972; font-size: 0.6875rem; cursor: pointer; }
.login-back:hover { color: var(--text); }
.login-card { width: min(31.25rem,100%); margin: 0 auto; }
.login-card h2 { margin: 0.6875rem 0 0.5rem; font-size: clamp(2.625rem,4vw,3.875rem); line-height: 1; letter-spacing: -.055em; }
.login-card > p { margin: 0 0 1.9375rem; color: #747c75; font-size: 0.8125rem; }
.login-role { margin-bottom: 1.6875rem; padding: 0.25rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem; border: 0.0625rem solid var(--line); border-radius: 0.875rem; background: #090b0a; }
.login-role > button { min-height: 4.625rem; padding: 0 0.9375rem; display: flex; align-items: center; gap: 0.75rem; border: 0.0625rem solid transparent; border-radius: 0.625rem; background: transparent; color: #6f7771; text-align: left; cursor: pointer; }
.login-role > button.active { border-color: #70482c; background: #2a2018; color: var(--lime); }
.login-role > button span { display: flex; flex-direction: column; gap: 0.1875rem; }
.login-role strong { color: #c4cac5; font-size: 0.8125rem; }.login-role small { color: #687069; font-size: 0.5rem; }
.login-field { margin-top: 1.0625rem; display: flex; flex-direction: column; gap: 0.5rem; color: #929a93; font-size: 0.6875rem; }
.login-field > div { height: 3.5rem; padding: 0 1rem; display: flex; align-items: center; gap: 0.75rem; border: 0.0625rem solid #303532; border-radius: 0.75rem; background: #111412; color: #6f7771; }
.login-field > div:focus-within { border-color: #a55d28; box-shadow: 0 0 0 0.1875rem rgba(255,155,69,.07); }
.login-field input { width: 100%; height: 100%; border: 0; outline: 0; background: transparent; color: #d8ddd9; font: inherit; font-size: 0.8125rem; }
.login-options { margin: 1.125rem 0 1.5rem; display: flex; justify-content: space-between; color: #6d756e; font-size: 0.625rem; }.login-options label { display: flex; align-items: center; gap: 0.4375rem; }.login-options input { accent-color: var(--lime); }.login-options button { border: 0; background: transparent; color: #9ba39c; font-size: 0.625rem; cursor: pointer; }
.login-submit { width: 100%; height: 3.5rem; padding: 0 1.125rem; display: flex; align-items: center; justify-content: center; gap: 0.6875rem; border: 0.0625rem solid #ffc184; border-radius: 0.8125rem; background: var(--lime); color: #21150c; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
.login-register-link { width:100%; margin-top:1.0625rem; border:0; background:transparent; color:#747c75; font-size: 0.625rem; cursor:pointer }.login-register-link strong { margin-left:0.25rem;color:var(--lime);font-weight:650 }
.login-divider { margin: 1.5rem 0 1.0625rem; display: flex; align-items: center; gap: 0.75rem; color: #59615b; font-size: 0.5625rem; }.login-divider:before,.login-divider:after{content:"";height:0.0625rem;flex:1;background:var(--line)}.login-divider span{white-space:nowrap}
.bypass-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.625rem; }.bypass-actions > button { min-height: 4.75rem; padding: 0 0.875rem; display: grid; grid-template-columns: 1.5rem 1fr 1rem; align-items: center; gap: 0.625rem; border: 0.0625rem solid #343936; border-radius: 0.75rem; background: #111412; color: #747c75; text-align: left; cursor: pointer; transition: border-color .2s,background .2s,transform .2s; }.bypass-actions > button:hover{border-color:#8b5126;background:#211914;transform:translateY(-0.0625rem)}.bypass-actions > button>span{display:flex;flex-direction:column;gap:0.25rem}.bypass-actions strong{color:#c5cbc6;font-size: 0.6875rem}.bypass-actions small{color:#626a63;font-size: 0.4375rem;line-height:1.4}.bypass-actions button>.icon:last-child{width:0.875rem;height:0.875rem}
.demo-note { margin-top: 1.125rem; padding: 0.875rem 1rem; display: flex; align-items: center; gap: 0.75rem; border: 0.0625rem solid var(--line); border-radius: 0.75rem; background: #101311; }.demo-note > span { display:flex; flex-direction:column; gap:0.1875rem; }.demo-note strong { color:#9ca49d; font-size: 0.625rem; }.demo-note small { color:#5f675f; font-size: 0.5rem; }
.register-panel { padding-top:5.25rem;padding-bottom:3.25rem }.register-card { width:min(36.875rem,100%) }.register-grid { display:grid;grid-template-columns:1fr 1fr;gap:0 0.75rem }.register-grid .full { grid-column:1/-1 }.register-grid select { width:100%;height:100%;border:0;outline:0;background:transparent;color:#d8ddd9;font:inherit;font-size: 0.8125rem}.register-grid option { color:#171a18;background:#fff }.register-submit { margin-top:1.5625rem }.register-note { margin-top:1.125rem;padding:0.8125rem 0.9375rem;display:flex;align-items:center;gap:0.75rem;border:0.0625rem solid #4c3829;border-radius:0.75rem;background:#17130f }.register-note>span { display:flex;flex-direction:column;gap:0.1875rem }.register-note strong { color:#c8b8aa;font-size: 0.625rem}.register-note small { color:#746a62;font-size: 0.5rem;line-height:1.45 }

/* Standalone customer portal */
.customer-portal { min-height: 100vh; background: radial-gradient(circle at 78% 13%,rgba(255,155,69,.09),transparent 24%),#0b0d0c; }
.customer-nav { position: sticky; top: 0; z-index: 20; height: 5.75rem; padding: 0 max(1.875rem,calc((100vw - 91.25rem)/2)); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 0.0625rem solid rgba(255,255,255,.08); background: rgba(11,13,12,.9); backdrop-filter: blur(1.25rem); }
.customer-nav .brand { padding: 0; }.customer-nav > nav { display: flex; gap: 0.25rem; }.customer-nav > nav button { height: 2.375rem; padding: 0 0.9375rem; border: 0; border-radius: 0.5625rem; background: transparent; color: #717972; font-size: 0.6875rem; cursor: pointer; }.customer-nav > nav button.active { background: #20241f; color: #d4dad5; }
.customer-nav-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.8125rem; }.customer-alert { position: relative; width: 2.5rem; height: 2.5rem; display: grid; place-items:center; border:0.0625rem solid var(--line);border-radius:0.625rem;background:#111412;color:#828a83}.customer-alert i{position:absolute;top:0.5rem;right:0.5rem;width:0.375rem;height:0.375rem;border-radius:50%;background:var(--lime)}
.customer-profile { display: flex; align-items: center; gap: 0.5625rem; }.customer-profile > span { width: 2.375rem; height: 2.375rem; display: grid; place-items: center; border: 0.0625rem solid #70482c; border-radius: 0.625rem; background: #2a211a; color: var(--lime); font-size: 0.625rem; font-weight: 700; }.customer-profile > div { display: flex; flex-direction: column; }.customer-profile strong { color:#c3c9c4;font-size: 0.625rem}.customer-profile small{color:#656d66;font-size: 0.5rem}
.customer-logout { display:flex;align-items:center;gap:0.4375rem;border:0;background:transparent;color:#6d756f;font-size: 0.5625rem;cursor:pointer}.customer-logout .icon{width:0.9375rem;height:0.9375rem}
.customer-content { max-width: 91.25rem; margin: 0 auto; padding: 2.5rem 2.25rem 6.25rem; }
.customer-sidebar { overflow-y: auto; }
.customer-topbar { justify-content: space-between; gap: 1rem; }
.customer-content [id] { scroll-margin-top: 6.25rem; }
.customer-stage .customer-welcome { min-height: 13.75rem; flex-wrap: wrap; }
.customer-stage .customer-welcome h1 { font-size: clamp(2.625rem,4.2vw,4.25rem); }
.customer-stage .customer-portal-grid { grid-template-columns: minmax(0,1.3fr) minmax(17.5rem,.85fr); }
.customer-stage .customer-side-stack { grid-template-columns: minmax(0,1fr); }
.customer-stage .customer-portal-grid > *, .customer-stage .customer-summary > * { min-width: 0; }
@media (max-width: 80rem) {
  .customer-stage .customer-portal-grid { grid-template-columns: minmax(0,1fr); }
  .customer-stage .customer-side-stack { grid-template-columns: repeat(2,minmax(0,1fr)); }
}
@media (max-width: 56.25rem) {
  .customer-sidebar .nav-list { grid-template-columns: repeat(5,minmax(8.75rem,1fr)); }
  .customer-sidebar .staff-space { display: none; }
  .customer-sidebar .sidebar-footer { display: grid; margin-top: 0.875rem; padding-top: 0.875rem; }
  .customer-stage .customer-content { padding: 2rem 1.125rem 5rem; }
  .customer-stage .customer-welcome { min-height: 0; }
}
@media (max-width: 37.5rem) {
  .customer-stage .customer-side-stack { grid-template-columns: minmax(0,1fr); }
  .customer-stage .customer-welcome h1 { font-size: clamp(2.125rem,9vw,3.0625rem); }
}
.customer-welcome { min-height: 15.625rem; display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; border-bottom: 0.0625rem solid var(--line); }
.customer-welcome h1 { margin: 0.75rem 0 0; font-size: clamp(3.25rem,5.2vw,5.125rem); line-height: .98; letter-spacing: -.07em; }.customer-welcome h1 em { color: var(--lime); font-style: normal; }.customer-welcome p{max-width:37.5rem;margin:1.375rem 0 3rem;color:#788078;font-size: 0.8125rem;line-height:1.75}.customer-welcome .hero-primary{margin-bottom:3rem;white-space:nowrap}
.customer-summary { margin: 1.375rem 0; display: grid; grid-template-columns: repeat(3,1fr); gap: 0.875rem; }.customer-summary article { min-height: 9.375rem; padding: 1.375rem 1.5rem; display: flex; flex-direction: column; border: 0.0625rem solid var(--line); border-radius: 1.0625rem; background: linear-gradient(145deg,#151817,#0f1110); }.customer-summary article:first-child{border-color:#70482c;background:linear-gradient(145deg,#2a211a,#14110f)}.customer-summary span{color:#747c75;font-size: 0.6875rem}.customer-summary strong{margin-top:0.75rem;font-size: 2.25rem;letter-spacing:-.04em}.customer-summary article:first-child strong{color:var(--lime)}.customer-summary small{margin-top:auto;color:#606861;font-size: 0.5625rem}.customer-summary small .live-dot{display:inline-block;margin-right:0.4375rem}
.customer-portal-grid { display: grid; grid-template-columns: minmax(0,1.35fr) minmax(22.5rem,.65fr); gap: 0.875rem; }.customer-focus-card,.customer-action-card,.customer-documents{border:0.0625rem solid var(--line);border-radius:1.125rem;background:#121513}.customer-focus-card{min-height:36.875rem;padding:1.75rem}.customer-card-head{display:flex;align-items:flex-start;justify-content:space-between}.customer-card-head h2{margin:0.3125rem 0 0;font-size: 1.5rem}.customer-focus-meta{margin-top:1.5rem;display:flex;gap:0.5rem}.customer-focus-meta span{padding:0.4375rem 0.625rem;border:0.0625rem solid var(--line);border-radius:0.5rem;color:#7c847d;font-size: 0.5625rem}.customer-progress{margin:4.375rem 0 0}.customer-progress-label{display:flex;align-items:flex-end;justify-content:space-between}.customer-progress-label span{color:#788079;font-size: 0.6875rem}.customer-progress-label strong{color:var(--lime);font-size: 2.625rem;line-height:1}.customer-progress-track{height:0.5rem;margin-top:1.125rem;border-radius:0.5rem;background:#272c28;overflow:hidden}.customer-progress-track i{display:block;width:78%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#b86223,var(--lime))}.customer-progress p{margin:0.6875rem 0 0;color:#626a63;font-size: 0.5625rem}.customer-steps{margin:3.625rem 0 3rem;display:grid;grid-template-columns:repeat(4,1fr)}.customer-steps>div{position:relative;display:flex;flex-direction:column;align-items:center;gap:0.625rem;color:#626a63;font-size: 0.5625rem}.customer-steps>div:after{content:"";position:absolute;z-index:0;top:0.9375rem;left:50%;width:100%;height:0.0625rem;background:#303532}.customer-steps>div:last-child:after{display:none}.customer-steps i{position:relative;z-index:1;width:1.9375rem;height:1.9375rem;display:grid;place-items:center;border:0.0625rem solid #3a403c;border-radius:50%;background:#121513;color:#6c746d;font-style:normal}.customer-steps .done i{border-color:#a55d28;background:#2b2018;color:var(--lime)}.customer-steps .done:after{background:#955020}.customer-link{display:flex;align-items:center;gap:0.4375rem;border:0;background:transparent;color:#aeb5af;font-size: 0.625rem;cursor:pointer}
.customer-side-stack{display:grid;gap:0.875rem}.customer-action-card{padding:1.5625rem;background:linear-gradient(145deg,#2b211a,#121512)}.customer-action-card h2{margin:0.3125rem 0 0.4375rem;font-size: 1.375rem}.customer-action-card p{margin:0;color:#747c75;font-size: 0.625rem}.customer-action-card>strong{display:block;margin-top:1.75rem;color:var(--lime);font-size: 2.5rem;letter-spacing:-.04em}.customer-action-card>small{display:block;margin-top:0.25rem;color:#656d66;font-size: 0.5625rem}.customer-action-card .primary-button{width:100%;margin-top:1.5625rem;justify-content:center}.customer-documents{padding:1.5625rem}.customer-doc-row{width:100%;min-height:4.125rem;padding:0;display:grid;grid-template-columns:2.375rem 1fr 1.25rem;align-items:center;gap:0.625rem;border:0;border-top:0.0625rem solid var(--line-soft);background:transparent;color:#687069;text-align:left;cursor:pointer}.customer-doc-row:nth-of-type(1){margin-top:1.125rem}.customer-doc-row>span{width:2.25rem;height:2.25rem;display:grid;place-items:center;border-radius:0.5625rem;background:#202420;color:#929a93}.customer-doc-row>div{display:flex;flex-direction:column;gap:0.25rem}.customer-doc-row strong{color:#bdc3be;font-size: 0.625rem;font-weight:500}.customer-doc-row small{color:#5f675f;font-size: 0.5rem}.customer-doc-row>.icon{width:0.9375rem}

@media (max-width: 73.75rem) {
  .login-page { grid-template-columns: .9fr 1.1fr; }.login-showcase { padding: 2.125rem; }.login-panel { padding-left: 6vw; padding-right: 6vw; }
  .customer-nav { grid-template-columns: auto 1fr auto; }.customer-nav > nav { justify-self: center; }.customer-profile > div,.customer-logout { display:none; }.customer-portal-grid { grid-template-columns: 1fr; }.customer-side-stack { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 51.25rem) {
  .login-page { grid-template-columns: 1fr; }.login-showcase { display:none; }.login-panel { padding: 5.9375rem 1.375rem 3.125rem; }.login-back { top: 1.75rem; }.login-card { max-width: 33.75rem; }
  .customer-nav { height: auto; min-height: 4.875rem; padding: 0.8125rem 1.125rem; grid-template-columns: 1fr auto; }.customer-nav > nav { grid-column:1/-1;grid-row:2;margin-top:0.625rem;width:100%;justify-content:flex-start;overflow-x:auto}.customer-nav > nav button{white-space:nowrap}.customer-content{padding:3rem 1.125rem 4.375rem}.customer-welcome{min-height:0;align-items:flex-start;flex-direction:column}.customer-welcome p{margin-bottom:0}.customer-welcome .hero-primary{margin-bottom:2.625rem}.customer-summary{grid-template-columns:1fr}.customer-side-stack{grid-template-columns:1fr}.staff-space{display:none}
}
@media (max-width: 35rem) {
  .login-card h2{font-size: 2.875rem}.login-options{align-items:flex-start;flex-direction:column;gap:0.75rem}.bypass-actions,.register-grid{grid-template-columns:1fr}.register-grid .full{grid-column:auto}.register-panel{padding-top:5.75rem}
  .customer-nav .brand small{display:none}.customer-profile{display:none}.customer-welcome h1{font-size: 3.0625rem}.customer-welcome .hero-primary{width:100%;justify-content:center}.customer-focus-card{min-height:0;padding:1.25rem}.customer-focus-meta{flex-wrap:wrap}.customer-progress{margin-top:2.8125rem}.customer-steps{margin:2.8125rem -0.5rem 2.375rem}.customer-steps span{font-size: 0.5rem;text-align:center}.customer-action-card,.customer-documents{padding:1.25rem}
}

/* Theme system */
.theme-root { min-height: 100vh; color-scheme: dark; background: var(--bg); color: var(--text); }
.theme-toggle { flex-shrink: 0; min-width: 5.875rem; height: 2.6875rem; padding: 0 0.8125rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5625rem; border: 0.0625rem solid var(--line); border-radius: 0.6875rem; background: var(--surface); color: var(--text); cursor: pointer; transition: background-color .25s ease, color .25s ease, border-color .25s ease; }
.theme-toggle:focus-visible { outline: 0.125rem solid var(--lime); outline-offset: 0.1875rem; }
.sidebar-theme { margin-top: auto; padding: 1.25rem 0; }
.sidebar-theme .theme-toggle { width: 100%; justify-content: flex-start; }
.sidebar-theme + .sidebar-footer { margin-top: 0; }

/* Keep account controls visible; only the navigation consumes scrollable space. */
@media (min-width: 56.251rem) {
  .sidebar {
    height: 100dvh;
    min-height: 0;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr) auto auto;
    overflow: hidden;
  }
  .sidebar > .brand,
  .sidebar > .staff-space,
  .sidebar > .sidebar-theme,
  .sidebar > .sidebar-footer {
    flex-shrink: 0;
  }
  .sidebar > .nav-list {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
    scrollbar-width: thin;
    scrollbar-color: var(--line) transparent;
    padding: 0.1875rem 0.375rem 0.75rem 0.1875rem;
    mask-image: linear-gradient(to bottom, transparent 0, #000 0.5rem, #000 calc(100% - 0.75rem), transparent 100%);
  }
  .sidebar > .nav-list > * { flex-shrink: 0; }
  .sidebar > .sidebar-theme {
    margin-top: 0;
    padding: 0.75rem 0 0.625rem;
    border-top: 0.0625rem solid var(--line);
    background: inherit;
  }
  .sidebar > .sidebar-footer {
    margin-top: 0;
    background: inherit;
  }
}
.auth-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; width: 100%; margin-bottom: 2.5rem; }
.auth-toolbar .login-back { position: static; }
.login-panel:has(.auth-toolbar) { padding-top: 2rem; }
::view-transition-old(root), ::view-transition-new(root) { animation-duration: 320ms; animation-timing-function: ease-in-out; }
.theme-root, .theme-root :where(header, aside, section, article, button, input, select, textarea) { transition: background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease; }
@media (max-width: 56.25rem) {
  .sidebar-theme { margin-top: 0.75rem; padding: 0; }
  .sidebar-theme .theme-toggle { width: auto; }
}
@media (prefers-reduced-motion: reduce) {
  .theme-root, .theme-root *, .theme-root *::before, .theme-root *::after { transition: none !important; }
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
}
.theme-toggle span { font-size: 0.5rem; font-weight: 750; letter-spacing: .14em; }
.theme-toggle:hover { border-color: #8b5126; color: var(--lime); transform: translateY(-0.0625rem); }

html[data-theme="light"], .theme-root[data-theme="light"] {
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

[data-theme="light"] .theme-toggle { border-color: var(--line); background: #fff; color: #463c34; }
[data-theme="light"] .landing { background: radial-gradient(circle at 82% 23%,rgba(223,116,30,.17),transparent 27%),radial-gradient(circle at 8% 5%,rgba(37,143,148,.07),transparent 20%),#f8f6f2; }
[data-theme="light"] .landing-nav,[data-theme="light"] .landing-footer,[data-theme="light"] .customer-welcome { border-color: var(--line); }
[data-theme="light"] .landing-links a,[data-theme="light"] .landing-footer p,[data-theme="light"] .hero-copy>p,[data-theme="light"] .section-heading p,[data-theme="light"] .capability-grid p,[data-theme="light"] .hero-proof span { color: #697269; }
[data-theme="light"] .landing-register,[data-theme="light"] .hero-secondary,[data-theme="light"] .hero-kicker { border-color: #ddd3ca; background: rgba(255,255,255,.8); color: #463c34; }
[data-theme="light"] .hero-secondary { text-decoration: none; }
[data-theme="light"] .hero-proof,[data-theme="light"] .hero-proof div { border-color: var(--line); }
[data-theme="light"] .hero-visual:before { background: repeating-linear-gradient(0deg,transparent 0,transparent 2.6875rem,rgba(24,32,25,.055) 2.75rem),repeating-linear-gradient(90deg,transparent 0,transparent 2.6875rem,rgba(24,32,25,.055) 2.75rem); }
[data-theme="light"] .machine-orbit { border-color: rgba(201,97,21,.24); }
[data-theme="light"] .machine-orbit.orbit-two { border-color: rgba(24,32,25,.09); }
[data-theme="light"] .machine-core { border-color: #dfc4ae; background: radial-gradient(circle at 42% 38%,#fff 0,#f7e6d7 28%,#eee1d5 70%); box-shadow: 0 0 0 1.75rem rgba(223,116,30,.025),0 0 5rem rgba(223,116,30,.08); }
[data-theme="light"] .machine-core:before { border-color: #cba17e; }
[data-theme="light"] .machine-core:after { border-color: #d4b699; background: #faf3ec; }
[data-theme="light"] .mock-dashboard { border-color: var(--line); background: linear-gradient(145deg,#fff,#faf6f1); color: var(--text); box-shadow: 0 1.875rem 4.375rem rgba(80,53,32,.14); }
[data-theme="light"] .mock-top span,[data-theme="light"] .mock-top em,[data-theme="light"] .mock-job-focus small { color: var(--muted); }
[data-theme="light"] .mock-job-focus { border-color: #edc7a8; background: linear-gradient(145deg,#fff4e9,#fffaf5); }
[data-theme="light"] .mock-job-focus span,[data-theme="light"] .mock-job-focus em { color: #ac4e0b; }
[data-theme="light"] .mock-progress { background: #eddfd3; }
[data-theme="light"] .mock-flow>div { color: var(--muted); }
[data-theme="light"] .mock-flow>div:after { background: #d8cec4; }
[data-theme="light"] .mock-flow i { border-color: #d8cec4; background: #fff; color: var(--muted); }
[data-theme="light"] .mock-flow .done i { border-color: #e4ac7f; background: #ffead8; color: #a64c0d; }
[data-theme="light"] .mock-flow .done:after { background: #e4ac7f; }
[data-theme="light"] .visual-label,[data-theme="light"] .visual-chip { border-color: var(--line); background: rgba(255,255,255,.94); color: var(--muted); box-shadow: 0 0.75rem 1.875rem rgba(80,53,32,.1); }
[data-theme="light"] .landing-footer>button { color: #67452c; }
[data-theme="light"] .landing-workflow { border-color: var(--line); background: #edf0e7; }
[data-theme="light"] .workflow-steps,[data-theme="light"] .workflow-steps article { border-color: #d2d8cb; }
[data-theme="light"] .workflow-steps p { color: #626d63; }
[data-theme="light"] .capability-grid article { border-color: var(--line); background: linear-gradient(145deg,#fff,#f1f3ec); box-shadow: 0 1rem 2.8125rem rgba(45,57,39,.06); }

[data-theme="light"] .login-page { background: #f7f4f0; }
[data-theme="light"] .login-showcase { border-color: var(--line); background: radial-gradient(circle at 70% 48%,rgba(223,116,30,.2),transparent 29%),linear-gradient(145deg,#f1e9e1,#faf9f7 72%); }
[data-theme="light"] .login-showcase:before { background: repeating-linear-gradient(0deg,transparent 0,transparent 4.3125rem,rgba(24,32,25,.045) 4.375rem),repeating-linear-gradient(90deg,transparent 0,transparent 4.3125rem,rgba(24,32,25,.045) 4.375rem); }
[data-theme="light"] .login-panel { background: #fafbf8; }
[data-theme="light"] .login-showcase-footer { color: #746b64; }
[data-theme="light"] .login-options button { color: #67452c; }
[data-theme="light"] .login-field>div:focus-within { border-color: #c86b27; box-shadow: 0 0 0 0.1875rem rgba(223,116,30,.12); }
[data-theme="light"] .login-back,[data-theme="light"] .login-showcase-copy p,[data-theme="light"] .login-card>p,[data-theme="light"] .login-options { color: #667066; }
[data-theme="light"] .login-field { color: #4f5a50; }
[data-theme="light"] .login-field>div { border-color: #d2d8ce; background: #fff; color: #717b72; }
[data-theme="light"] .login-field input { color: #1b241c; }
[data-theme="light"] .register-grid select { color:#1b241c }
[data-theme="light"] .login-field input::placeholder { color: #9aa29a; }
[data-theme="light"] .bypass-actions>button,[data-theme="light"] .demo-note { border-color: #d5dacF; background: #f4f6f0; color: #536053; }
[data-theme="light"] .bypass-actions>button:hover { border-color: #e1995e; background: #fff0e6; }
[data-theme="light"] .bypass-actions strong,[data-theme="light"] .demo-note strong { color: #303a31; }
[data-theme="light"] .bypass-actions small,[data-theme="light"] .demo-note small,[data-theme="light"] .login-divider { color: #778078; }
[data-theme="light"] .register-note { border-color:#efc7aa;background:#fff3e9 }.theme-root[data-theme="light"] .register-note strong { color:#5f4633 }.theme-root[data-theme="light"] .register-note small { color:#826e5e }

[data-theme="light"] .app-shell { background: radial-gradient(circle at 88% -10%,rgba(223,116,30,.13),transparent 30%),var(--bg); }
[data-theme="light"] .sidebar { border-color: var(--line); background: rgba(248,250,245,.97); }
[data-theme="light"] .staff-space,[data-theme="light"] .status-ribbon>span,[data-theme="light"] .search,[data-theme="light"] .table-search,[data-theme="light"] .icon-button { border-color: var(--line); background: #fff; color: #5f695f; }
[data-theme="light"] .staff-space strong,[data-theme="light"] .status-ribbon>span:first-child { color: #4d574e; }
[data-theme="light"] .topbar { border-color: var(--line); background: rgba(245,247,241,.88); }
[data-theme="light"] .search input,[data-theme="light"] .table-search input { color: #202921; }
[data-theme="light"] .search input::placeholder,[data-theme="light"] .table-search input::placeholder { color: #8b948b; }
[data-theme="light"] .nav-list :is(button, a) { color: #5f695f; }
[data-theme="light"] .nav-list :is(button, a):hover { color: #263027; background: #eef1e9; }
[data-theme="light"] .nav-list :is(button, a).active { border-color: #edc7a8; color: #482d1a; background: linear-gradient(90deg,#ffead8,#fff6ee); }
[data-theme="light"] .nav-list :is(button, a).active .nav-icon { background: #f8d9bf; color: #a64c0d; }
[data-theme="light"] .sidebar-footer .avatar { background: #ffead8; color: #a64c0d; }
[data-theme="light"] .nav-list em,[data-theme="light"] .count-badge { background: #e3e8de; color: #566057; }
[data-theme="light"] .sidebar-footer strong,[data-theme="light"] .heading-meta strong { color: #364037; }
[data-theme="light"] .sidebar-footer span,[data-theme="light"] .sidebar-footer button,[data-theme="light"] .nav-label,[data-theme="light"] .eyebrow { color: #727c73; }
[data-theme="light"] .quick-strip { border-color: var(--line); background: rgba(255,255,255,.76); }
[data-theme="light"] .quick-strip button { color: #667067; }
[data-theme="light"] .quick-strip button.selected { border-color: #cbd2c6; background: #e9ece5; color: #263027; }
[data-theme="light"] .quick-strip b { color: #59635a; }
[data-theme="light"] .metric-card,[data-theme="light"] .panel,[data-theme="light"] .workspace-stats article { border-color: var(--line); background: linear-gradient(145deg,#fff,#f5f7f2); box-shadow: 0 0.9375rem 2.625rem rgba(45,56,40,.05); }
[data-theme="light"] .metric-card.accent,[data-theme="light"] .workspace-stats article.featured { border-color: #efc7a5; background: linear-gradient(145deg,#fff0e4,#fafbf7 74%); }
[data-theme="light"] .metric-card:after { background: rgba(46,58,41,.025); }
[data-theme="light"] .metric-top,[data-theme="light"] .panel-head .eyebrow,[data-theme="light"] .workspace-stats span { color: #606b61; }
[data-theme="light"] .metric-top button { border-color: #d9ddd5; background: #f0f2ed; color: #667067; }
[data-theme="light"] .metric-card>small,[data-theme="light"] .workspace-stats small,[data-theme="light"] .muted { color: #737d74; }
[data-theme="light"] .mini-chart i,[data-theme="light"] .bar-chart i { background: #cfd5cc; }
[data-theme="light"] .metric-card.accent .mini-chart i:nth-last-child(-n+3) { background: var(--lime-soft); }
[data-theme="light"] .bar-chart i.hot { background: var(--lime); box-shadow: 0 0 1.125rem rgba(223,116,30,.12); }
[data-theme="light"] .trend { background: #ffead8; color: #a64c0d; }
[data-theme="light"] .material-item em.neutral { background: #eee9e3; color: #645b53; }
[data-theme="light"] .bar-chart { border-color: #d5dad2; background: repeating-linear-gradient(to bottom,transparent 0,transparent 2.4375rem,rgba(37,48,39,.055) 2.5rem); }
[data-theme="light"] .job-row,[data-theme="light"] .material-item,[data-theme="light"] .activity,[data-theme="light"] .doc-row { border-color: var(--line-soft); }
[data-theme="light"] .job-id strong,[data-theme="light"] .job-work strong,[data-theme="light"] .material-item strong,[data-theme="light"] .activity strong { color: #303a31; }
[data-theme="light"] .job-id span,[data-theme="light"] .job-work span,[data-theme="light"] .material-item small,[data-theme="light"] .activity span { color: #717b72; }
[data-theme="light"] .progress div,[data-theme="light"] .segmented { border-color: var(--line); background: #e7eae4; }
[data-theme="light"] .segmented button.active { background: #fff; color: #2d372e; }
[data-theme="light"] .table-tools,[data-theme="light"] .data-row,[data-theme="light"] .table-footer { border-color: var(--line); }
[data-theme="light"] .table-footer { color: var(--muted); }
[data-theme="light"] .table-footer button { border-color: var(--line); background: #fff; color: #645b53; }
[data-theme="light"] .table-footer button:hover { border-color: #e4ac7f; background: #fff5ec; color: #a64c0d; }
[data-theme="light"] .table-footer button.active { border-color: #dc975f; background: #ffead8; color: #923f08; }
[data-theme="light"] .data-head { background: #eef1eb; color: #687269; }
[data-theme="light"] .data-row:not(.data-head):hover { background: #f3f5f0; }
[data-theme="light"] .data-row span,[data-theme="light"] .doc-row strong { color: #4e594f; }
[data-theme="light"] .data-row span:first-child { color: #202a21; }
[data-theme="light"] .cell-status,[data-theme="light"] .status-pill { background: #ffeadb; color: #a64c0d !important; }

[data-theme="light"] .customer-portal { background: radial-gradient(circle at 78% 13%,rgba(223,116,30,.14),transparent 25%),#f7f4f0; }
[data-theme="light"] .customer-nav { border-color: var(--line); background: rgba(247,249,243,.91); }
[data-theme="light"] .customer-nav>nav button { color: #69736a; }
[data-theme="light"] .customer-nav>nav button.active { background: #e4e8de; color: #263027; }
[data-theme="light"] .customer-alert,[data-theme="light"] .customer-profile>span { border-color: var(--line); background: #fff; color: #59645a; }
[data-theme="light"] .customer-profile strong { color: #344035; }
[data-theme="light"] .customer-welcome p,[data-theme="light"] .customer-summary span,[data-theme="light"] .customer-summary small { color: #68736a; }
[data-theme="light"] .customer-summary article,[data-theme="light"] .customer-focus-card,[data-theme="light"] .customer-action-card,[data-theme="light"] .customer-documents { border-color: var(--line); background: linear-gradient(145deg,#fff,#f5f7f2); box-shadow: 0 1rem 2.8125rem rgba(45,57,39,.055); }
[data-theme="light"] .customer-summary article:first-child,[data-theme="light"] .customer-action-card { border-color: #efc7aa; background: linear-gradient(145deg,#fff0e6,#fafbf7); }
[data-theme="light"] .customer-focus-meta span { border-color: var(--line); color: #59645a; }
[data-theme="light"] .customer-progress-track { background: #dce1d8; }
[data-theme="light"] .customer-progress p,[data-theme="light"] .customer-steps>div { color: #6b756c; }
[data-theme="light"] .customer-steps i { border-color: #ccd2c8; background: #fff; color: #687269; }
[data-theme="light"] .customer-steps .done i { border-color: #e1995e; background: #fff0e2; }
[data-theme="light"] .customer-link,[data-theme="light"] .customer-doc-row strong { color: #3b463c; }
[data-theme="light"] .customer-doc-row { border-color: var(--line-soft); color: #677168; }
[data-theme="light"] .customer-doc-row>span { background: #eef1eb; color: #59645a; }

[data-theme="light"] .modal-backdrop { background: rgba(34,43,35,.36); }
[data-theme="light"] .modal { border-color: #ccd2c7; background: #fff; box-shadow: 0 1.875rem 5.625rem rgba(45,57,39,.22); }
[data-theme="light"] .modal-head,[data-theme="light"] .modal-actions { border-color: var(--line); }
[data-theme="light"] .modal p,[data-theme="light"] .form-grid label { color: #687269; }
[data-theme="light"] .form-grid input,[data-theme="light"] .form-grid textarea,[data-theme="light"] .upload { border-color: var(--line); background: #f7f8f4; color: #263027; }
[data-theme="light"] .secondary-button { border-color: var(--line); background: #eef1eb; color: #4f5a50; }

@media (max-width: 35rem) {
  .theme-toggle { min-width: 2.6875rem; width: 2.6875rem; padding: 0; }
  .sidebar-theme .theme-toggle { padding: 0 0.8125rem; width: auto; }
  .sidebar-theme .theme-toggle span { display: inline; }
  .theme-toggle span { display: none; }
}
```

### A2. Shared workflow styles — app/workflows.css

```css
/* Shared UC forms, derived from develop and adapted to the design tokens. */
:root { --foreground: var(--text); --border: var(--line); --accent: var(--lime); }
/* Customer demo workflows (UC1, UC3, UC4, UC9). */
.workflow-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1.125rem; }
.workflow-toolbar > p { color: var(--muted); font-size: 0.75rem; line-height: 1.6; }
.workflow-success { padding: 0.9375rem 1.125rem; background: var(--surface-2); border: 0.0625rem solid var(--line); color: var(--text); border-radius: 0.5rem; font-size: 0.75rem; line-height: 1.7; margin-bottom: 1.125rem; overflow-wrap: anywhere; }
.field-error { font-size: 0.75rem; color: var(--text); background: var(--surface-2); border: 0.0625rem solid var(--line); padding: 0.75rem; border-radius: 0.4375rem; margin: 0.625rem 0; line-height: 1.7; }
.record-layout { display: grid; grid-template-columns: minmax(12.5rem, 31%) minmax(0, 1fr); gap: 1.25rem; align-items: start; }
.record-list { display: grid; gap: 0.625rem; }
.record-list-item { min-width: 0; width: 100%; text-align: left; display: grid; gap: 0.75rem; padding: 1.0625rem; border: 0.0625rem solid var(--border); border-radius: 0.5625rem; background: var(--surface-2); }
.record-list-item:hover { border-color: var(--line); }
.record-list-item.selected { border-color: var(--accent); box-shadow: inset 0.1875rem 0 var(--accent); background: var(--surface-2); }
.record-list-item > span:first-child { font-size: 0.75rem; color: var(--text); text-transform: capitalize; }
.record-list-item > strong { font-size: 0.75rem; line-height: 1.6; font-weight: 550; overflow-wrap: anywhere; }
.record-list-bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; align-items: center; }
.record-list-bottom > span:last-child { font-size: 0.75rem; color: var(--text); }
.record-status { display: inline-flex; align-items: center; border-radius: 0.3125rem; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 550; color: var(--text); background: var(--surface-2); width: fit-content; }
.status-approved, .status-paid, .status-delivered, .status-completed { background: var(--surface-2); color: var(--text); }
.status-sent, .status-ongoing, .status-shipping { background: var(--surface-2); color: var(--text); }
.status-partial, .status-pending { background: var(--surface-2); color: var(--text); }
.status-canceled, .status-rejected, .status-returned { background: var(--surface-2); color: var(--text); }
.record-detail, .workflow-form-panel { background: var(--surface-2); border: 0.0625rem solid var(--border); border-radius: 0.625rem; padding: 1.5625rem; min-width: 0; }
.record-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.9375rem; }
.record-heading h2 { font-size: 1.1875rem; line-height: 1.5; letter-spacing: -.025em; margin-top: 0.5rem; font-weight: 600; overflow-wrap: anywhere; }
.record-id { font-size: 0.75rem; color: var(--text); overflow-wrap: anywhere; margin: 0.75rem 0 1.25rem; }
.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; padding: 1.125rem; border: 0.0625rem solid var(--border); border-radius: 0.5rem; background: var(--surface-2); margin: 1.25rem 0; }
.detail-grid dt { font-size: 0.75rem; color: var(--text); margin-bottom: 0.375rem; }
.detail-grid dd { margin: 0; font-size: 0.75rem; overflow-wrap: anywhere; }
.record-detail h3 { font-size: 0.75rem; margin: 1.5rem 0 0.75rem; font-weight: 600; }
.attachment-list { display: grid; gap: 0.5625rem; margin: 0.75rem 0 1.25rem; }
.attachment-link { display: flex; justify-content: space-between; gap: 0.75rem; width: 100%; min-height: 2.75rem; padding: 0.6875rem 0.8125rem; background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.375rem; color: var(--text); font-size: 0.75rem; text-align: left; overflow-wrap: anywhere; margin: 0.5rem 0; }
.attachment-link > span { color: var(--text); font-weight: 600; flex-shrink: 0; }
.price-summary { padding: 1.4375rem; background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.5625rem; display: grid; gap: 0.625rem; }
.price-summary > span { font-size: 0.75rem; color: var(--text); }
.price-summary > strong { font-size: 2rem; letter-spacing: -.045em; font-weight: 600; color: var(--text); }
.terms-summary { padding: 1.125rem 0; font-size: 0.75rem; line-height: 1.8; }
.terms-summary > strong { font-weight: 600; }
.terms-summary > p { color: var(--text); font-size: 0.75rem; margin-top: 0.375rem; }
.workflow-note { font-size: 0.75rem; color: var(--text); line-height: 1.8; margin: 0.9375rem 0; }
.form-actions { display: flex; gap: 0.625rem; flex-wrap: wrap; margin: 1.25rem 0; }
.button-danger { background: var(--surface-2); color: var(--text); border: 0.0625rem solid var(--line); border-radius: 0.5rem; min-height: 2.875rem; padding: 0.75rem 1.125rem; font-size: 0.75rem; }
button:disabled { cursor: not-allowed; opacity: .45; }
.revision-history { margin-top: 1.75rem; border-top: 0.0625rem solid var(--border); padding-top: 1rem; }
.revision-history summary, .demo-tools summary { cursor: pointer; color: var(--text); font-size: 0.75rem; min-height: 1.875rem; }
.revision-history p { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.625rem; font-size: 0.75rem; align-items: center; padding: 0.625rem 0; }
.workflow-form-panel { margin-bottom: 1.375rem; }
.workflow-form-panel h2 { font-size: 1.25rem; letter-spacing: -.025em; margin-bottom: 1.25rem; }
.form-field { display: grid; gap: 0.5rem; color: var(--text); font-size: 0.75rem; margin-bottom: 1.1875rem; }
.form-field input, .form-field textarea, .form-field select { width: 100%; min-width: 0; background: var(--surface-2); color: var(--foreground); border: 0.0625rem solid var(--line); border-radius: 0.4375rem; padding: 0.75rem; min-height: 2.8125rem; font-size: 0.875rem; }
.form-field textarea { resize: vertical; line-height: 1.7; }
.file-picker { padding: 0.9375rem; border: 0.0625rem dashed var(--line); background: var(--surface-2); border-radius: 0.5rem; margin-bottom: 1rem; }
.file-picker label { display: grid; gap: 0.75rem; font-size: 0.75rem; color: var(--text); font-weight: 550; }
.file-picker input { width: 100%; min-width: 0; color: var(--text); font-size: 0.75rem; }
.file-picker input::file-selector-button { background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.3125rem; padding: 0.5625rem; margin-right: 0.625rem; color: var(--text); cursor: pointer; }
.file-picker-hint { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 0.625rem; margin-top: 0.75rem; align-items: center; }
.file-picker-hint > span { font-size: 0.75rem; color: var(--text); line-height: 1.7; }
.text-action { color: var(--text); background: transparent; border: 0; padding: 0.3125rem 0; font-size: 0.75rem; text-decoration: underline; text-underline-offset: 0.1875rem; }
.text-action, .revision-history summary, .demo-tools summary { min-height: 2.75rem; }
.file-picker[aria-busy="true"] { border-style: solid; }
@media (max-width: 47.5rem) { .form-field input, .form-field textarea, .form-field select { font-size: 1rem; } .file-picker input::file-selector-button { min-height: 2.75rem; } }
.confirmation-files { display: grid; gap: 1rem; margin-bottom: 1.25rem; }
.balance-strip { background: var(--surface-2); border: 0.0625rem solid var(--border); border-radius: 0.5rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.9375rem; padding: 1.25rem; margin: 1.375rem 0; }
.balance-strip span { display: block; font-size: 0.75rem; color: var(--text); margin-bottom: 0.4375rem; }
.balance-strip strong { font-size: 1.3125rem; color: var(--text); letter-spacing: -.03em; }
.payment-history { list-style: none; padding: 0; margin: 0; }
.payment-history li { display: flex; justify-content: space-between; gap: 0.75rem; border-bottom: 0.0625rem solid var(--border); padding: 0.75rem 0; font-size: 0.75rem; color: var(--text); }
.payment-history strong { color: var(--text); }
.payment-form { padding: 1.125rem; border: 0.0625rem solid var(--line); border-radius: 0.5rem; }
.demo-tools { border-top: 0.0625rem solid var(--border); margin-top: 1.75rem; padding-top: 1.125rem; }
.demo-tools p { font-size: 0.75rem; line-height: 1.7; color: var(--text); margin: 0.625rem 0; }
.demo-tools button { margin: 0.5rem 0.625rem 0 0; font-size: 0.75rem; }
.customer-dialog { width: min(40rem, calc(100vw - 2rem)); max-height: calc(100svh - 2.5rem); overflow-y: auto; background: var(--surface-2); color: var(--foreground); border: 0.0625rem solid var(--line); border-radius: 0.75rem; padding: 1.5625rem; margin: auto; box-shadow: 0 1.25rem 5rem #00000033; }
.customer-dialog::backdrop { background: var(--surface-2); }
.worker-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 1.125rem; margin-top: 1.375rem; }
.stock-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
.stock-card { padding: 1rem; border: 0.0625rem solid var(--border); border-radius: 0.5rem; min-width: 0; }
.stock-card h3, .supplier-order h3, .worker-workflow h3 { font-size: 0.8125rem; font-weight: 600; line-height: 1.6; margin: 0.875rem 0; }
.stock-card .detail-grid { padding: 0; background: transparent; border: 0; margin-bottom: 0; }
.table-scroll { width: 100%; min-width: 0; overflow-x: auto; margin: 1.25rem 0; border: 0.0625rem solid var(--border); border-radius: 0.5rem; }
.workflow-table { width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: left; }
.workflow-table th, .workflow-table td { padding: 0.875rem; border-bottom: 0.0625rem solid var(--border); white-space: nowrap; }
.workflow-table thead { background: var(--surface-2); color: var(--text); }
.workflow-table tbody th { font-weight: 500; }
.worker-history-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 0.75rem; padding: 0.875rem 0; border-bottom: 0.0625rem solid var(--border); font-size: 0.75rem; overflow-wrap: anywhere; }
.worker-history-row > span { min-width: 0; }
.worker-history-row small { display: block; font-size: 0.75rem; color: var(--text); margin-top: 0.4375rem; line-height: 1.7; overflow-wrap: anywhere; }
.supplier-order { border: 0.0625rem solid var(--border); padding: 1.125rem; border-radius: 0.5rem; margin-bottom: 1.125rem; }
.supplier-order .button-danger { margin-top: 1rem; }
.worker-ledger { max-height: 25rem; overflow-y: auto; }
.admin-toolbar-actions { display: flex; flex-wrap: wrap; gap: 0.625rem; }
.admin-filters { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 1.125rem; }
.admin-boundary { background: var(--surface-2); border: 0.0625rem solid var(--line); border-radius: 0.5rem; padding: 1rem; }
.worker-contact { overflow-wrap: anywhere; }
.status-active { background: var(--surface-2); color: var(--text); }
.status-inactive { background: var(--surface-2); color: var(--text); }
@media (max-width: 37.5rem) { .admin-filters { grid-template-columns: 1fr; gap: 0; } .admin-toolbar-actions { width: 100%; } .admin-toolbar-actions > button { flex: 1; } }
@media (max-width: 68.75rem) { .stock-cards { grid-template-columns: 1fr; } }
@media (max-width: 37.5rem) { .worker-form-grid { grid-template-columns: 1fr; } .worker-workflow .workflow-toolbar > button { width: 100%; } .supplier-order { padding: 0.8125rem; } }
.dialog-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.9375rem; margin-bottom: 1.25rem; }
.dialog-heading h2 { font-size: 1.25rem; letter-spacing: -.025em; overflow-wrap: anywhere; }
.dialog-heading > button { flex-shrink: 0; font-size: 0.75rem; }
.attachment-preview { display: block; width: 100%; max-height: 55svh; object-fit: contain; margin: 1.25rem 0; }
.sample-document { white-space: pre-wrap; overflow-wrap: anywhere; color: var(--text); background: var(--surface-2); padding: 1.375rem; font-size: 0.75rem; line-height: 1.8; margin: 1.25rem 0; }
@media (max-width: 68.75rem) { .record-layout { grid-template-columns: 1fr; } .record-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 37.5rem) { .workflow-toolbar { flex-wrap: wrap; } .record-list { grid-template-columns: 1fr; max-height: 20rem; overflow-y: auto; } .record-detail, .workflow-form-panel { padding: 1.125rem; } .record-heading { flex-wrap: wrap; } .record-heading h2 { font-size: 1.125rem; } .detail-grid { gap: 1rem 0.625rem; padding: 0.875rem; } .balance-strip { padding: 0.9375rem; gap: 0.625rem; } .balance-strip strong { font-size: 1.125rem; } .price-summary > strong { font-size: 1.75rem; } .customer-dialog { padding: 1.25rem; } .form-actions > button { flex: 1; } }

/* Unified controls and role shells. Dimensions scale with the root rem size. */
.button-primary,.button-secondary,.button-danger { display:inline-flex; align-items:center; justify-content:center; gap:.625rem; min-height:2.875rem; padding:.75rem 1.125rem; border-radius:.75rem; font:inherit; font-size:.875rem; font-weight:650; cursor:pointer; }
.button-primary { background:var(--lime); border:1px solid var(--lime); color:#211509; }
.button-secondary { background:var(--surface); border:1px solid var(--line); color:var(--text); }
.button-danger { color:var(--danger); border-color:var(--danger); }
:is(button,a,input,select,textarea,summary,[tabindex]):focus-visible { outline:2px solid var(--lime); outline-offset:3px; }
button:disabled { opacity:.5; cursor:not-allowed; }
.form-field :is(input,textarea,select) { font-size:1rem; color:var(--text); background:var(--surface); }
.form-field,.file-picker label,.detail-grid dt,.record-id,.workflow-note,.workflow-toolbar>p,.record-list-item>span:first-child { color:var(--muted); }
.record-detail,.workflow-form-panel,.record-list-item { background:var(--surface); border-radius:1rem; }
.record-list-item.selected { background:color-mix(in srgb,var(--lime) 10%,var(--surface)); }
.record-heading h2,.workflow-form-panel h2 { font-size:1.375rem; font-weight:700; }
.record-detail h3 { font-size:1rem; }
.record-list-item>strong { font-size:.9375rem; font-weight:650; }
.text-action,.attachment-link>span { color:var(--lime); }
.price-summary>strong { color:var(--lime); }
.field-error { color:var(--danger); border-color:var(--danger); background:color-mix(in srgb,var(--danger) 8%,var(--surface)); }
.workflow-success { color:var(--text); border-color:var(--lime); background:color-mix(in srgb,var(--lime) 8%,var(--surface)); }
.record-status { background:var(--surface-3); color:var(--text); }
.status-approved,.status-paid,.status-completed,.status-active,.status-delivered { background:#163e32; color:#a9edce; }
.status-sent,.status-ongoing,.status-shipping { background:#163846; color:#ace3f2; }
.status-partial,.status-pending { background:#45341b; color:#ffdc97; }
.status-canceled,.status-rejected,.status-returned { background:#492626; color:#ffb5af; }
[data-theme="light"] :is(.status-approved,.status-paid,.status-completed,.status-active,.status-delivered) { background:#e0f1e8; color:#23553f; }
[data-theme="light"] :is(.status-sent,.status-ongoing,.status-shipping) { background:#deedf5; color:#24596d; }
[data-theme="light"] :is(.status-partial,.status-pending) { background:#fff0cd; color:#715119; }
[data-theme="light"] :is(.status-canceled,.status-rejected,.status-returned) { background:#ffe5e1; color:#8d3229; }
.customer-dialog { background:var(--surface); width:min(42rem,calc(100vw - 2rem)); }
.customer-dialog::backdrop { background:#0008; }
.demo-context { color:var(--muted); font-size:.8rem; line-height:1.7; margin:1rem 0 1.5rem; }
.integrated-shell .integrated-sidebar { display:flex; flex-direction:column; position:fixed; inset:0 auto 0 0; width:17rem; height:100dvh; min-height:0; overflow:hidden; }
.sidebar-scroll { flex:1; min-height:0; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; padding-right:.25rem; }
.integrated-sidebar .nav-list { display:flex; flex-direction:column; overflow:visible; }
.integrated-sidebar .sidebar-theme { flex:none; margin:0; padding:.75rem 0; }
.integrated-sidebar .sidebar-footer { display:grid; flex:none; margin:0; padding-top:1rem; }
.integrated-sidebar .brand { flex-shrink:0; }
.integrated-shell .app-stage { margin-left:17rem; min-width:0; }
.integrated-topbar { display:flex; gap:1rem; }
.integrated-topbar .eyebrow { margin:0; }
.switch-account { margin-left:auto; font-size:.8rem; text-decoration:none; padding:.7rem 1rem; }
.mobile-navigation { display:none; }
.workspace-links { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1rem; }
.workspace-link-card { padding:1.75rem; min-width:0; text-decoration:none; display:flex; flex-direction:column; align-items:flex-start; gap:.8rem; transition:border-color .2s,transform .2s; }
.workspace-link-card:hover { border-color:var(--lime); transform:translateY(-2px); }
.workspace-link-card h2 { font-size:1.2rem; color:var(--text); }
.workspace-link-card p { font-size:.85rem; color:var(--muted); line-height:1.7; flex:1; }
.workspace-card-icon { color:var(--lime); background:color-mix(in srgb,var(--lime) 12%,transparent); padding:.75rem; border-radius:.8rem; }
.workspace-card-action { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:var(--lime); margin-top:.8rem; }
.workflow-skip { position:fixed; top:-10rem; left:1rem; z-index:100; background:var(--surface); padding:1rem; color:var(--text); }
.workflow-skip:focus { top:1rem; }
.navigation-scrim { display:none; }
.auth-availability { color:var(--muted); font-size:.85rem; line-height:1.8; padding:1rem; border:1px solid var(--line); border-radius:.75rem; margin:1.5rem 0; }
.login-card .live-fields { gap:0; }
.login-card .login-submit { margin-top:1.5rem; }
.login-card .bypass-actions { grid-template-columns:1fr; gap:.75rem; }
.login-card .bypass-actions button { min-height:4.5rem; }
.login-register-link { display:block; margin-top:1rem; text-align:center; line-height:1.5; }
.demo-bypass { margin-top:1.75rem; border-top:.0625rem solid var(--line); border-bottom:.0625rem solid var(--line); }
.demo-bypass summary { display:flex; align-items:center; justify-content:space-between; gap:1rem; min-height:3.5rem; color:var(--muted); font-size:.6875rem; cursor:pointer; list-style:none; }
.demo-bypass summary::-webkit-details-marker { display:none; }
.demo-bypass summary i { width:.625rem; height:.625rem; flex:none; border-right:.09375rem solid currentColor; border-bottom:.09375rem solid currentColor; transform:rotate(45deg); transition:transform .2s ease; }
.demo-bypass[open] summary i { transform:rotate(225deg); }
.demo-bypass-content { padding:0 0 1rem; }
.demo-bypass .demo-context { margin-bottom:0; }
.login-field select { width:100%; border:0; outline:0; background:transparent; color:var(--text); font:inherit; font-size:.8125rem; }
.auth-help,.auth-api { display:block; color:var(--muted); font-size:.6875rem; line-height:1.6; }
.auth-help { margin:.625rem 0 0; }
.auth-api { margin-top:1rem; text-align:center; opacity:.7; }
@media(prefers-reduced-motion:reduce) { .demo-bypass summary i { transition:none; } }
@media(max-width:75rem) { .workspace-links { grid-template-columns:repeat(2,minmax(0,1fr)); } }
@media(max-width:900px) {
  .integrated-shell .integrated-sidebar { width:min(20rem,88vw); transform:translateX(-100%); visibility:hidden; z-index:45; padding:1rem; }
  .integrated-shell .integrated-sidebar.navigation-open { transform:translateX(0); visibility:visible; }
  .integrated-shell .app-stage { margin-left:0; }
  .integrated-sidebar .nav-label { display:block; }
  .integrated-sidebar .nav-list :is(a,button) { min-width:0; }
  .mobile-navigation { display:inline-flex; }
  .navigation-scrim { display:block; position:fixed; inset:0; background:#0009; border:0; z-index:44; }
  .integrated-topbar { position:sticky; top:0; z-index:30; height:auto; min-height:4.5rem; padding:1rem; background:var(--surface); }
  .integrated-sidebar .sidebar-theme .theme-toggle { width:100%; justify-content:flex-start; }
  .integrated-sidebar .sidebar-theme .theme-toggle span { display:inline; }
}
@media(max-width:600px) {
  .workspace-links { grid-template-columns:1fr; }
  .integrated-topbar .eyebrow { font-size:.6rem; }
  .switch-account { font-size:.7rem; padding:.6rem; }
  .workflow-content .button-primary,.workflow-content .button-secondary { white-space:normal; }
}

/* Connected backend surfaces share the same appearance tokens and UI scale. */
.live-shell { min-height:100svh; background:var(--bg); }
.live-header,.live-tabs { display:flex; gap:1rem; align-items:center; flex-wrap:wrap; padding:1rem 5%; background:var(--surface); border-bottom:.0625rem solid var(--line); }
.live-header { justify-content:space-between; }
.live-header>div { display:flex; flex-wrap:wrap; align-items:center; gap:1rem; }
.live-tabs button { text-transform:capitalize; padding:.625rem 1rem; border-radius:.5rem; }
.live-tabs button[aria-current="page"] { background:color-mix(in srgb,var(--lime) 12%,var(--surface)); color:var(--lime); }
.live-main { max-width:87.5rem; margin:auto; padding:1.75rem 5%; }
.live-main>h1 { font-size:1.5625rem; margin-bottom:.75rem; overflow-wrap:anywhere; }
.live-main .demo-notice { margin:1.25rem 0; }
.live-fields { display:grid; gap:.875rem; border:0; padding:0; min-width:0; }
.live-section { border-top:.0625rem solid var(--line); padding-top:1.375rem; margin-top:1.5rem; }
.live-section h3,.live-section h4 { margin-bottom:.875rem; }
.live-section form { margin-top:1.125rem; }
.workflow-error { font-size:.8125rem; color:var(--danger); background:color-mix(in srgb,var(--danger) 8%,var(--surface)); border:.0625rem solid var(--danger); padding:.875rem; border-radius:.5rem; margin:.875rem 0; line-height:1.7; overflow-wrap:anywhere; }
.live-description,.private-invitation { white-space:pre-wrap; overflow-wrap:anywhere; }
.private-invitation { display:block; user-select:all; }
.live-shell button { min-height:2.75rem; padding:.5625rem .75rem; }
.live-shell .form-actions { align-items:center; }
.live-shell .record-detail,.live-shell .record-list-item { overflow-wrap:anywhere; }
.live-editor { margin:1.5rem 0; padding:1.25rem 0; border-top:.0625rem solid var(--line); border-bottom:.0625rem solid var(--line); }
.live-editor h3 { margin-bottom:1rem; font-size:1.125rem; }
.live-worker-row { padding:1.25rem 0; border-bottom:.0625rem solid var(--line-soft); }
.live-worker-row p,.live-editor p { line-height:1.7; font-size:.875rem; }
.live-worker-row .detail-grid { background:transparent; }
.live-shell :is(input,textarea,select) { caret-color:var(--lime); }
.live-shell ::selection { color:var(--text); background:color-mix(in srgb,var(--lime) 25%,var(--surface)); }
@media(max-width:37.5rem) { .live-main { padding:1.25rem .875rem; } .live-main .detail-grid { grid-template-columns:1fr; } .live-tabs { gap:.25rem; padding:.5rem; } }
```

### B. Font loading and root layout — app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppThemeProvider } from "./appearance";
import { DemoWorkshopProvider } from "./workshop-context";
import { Suspense } from "react";
import "./workflows.css";

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
      <body className="min-h-full flex flex-col"><AppThemeProvider><Suspense fallback={<p role="status">กำลังเตรียมพื้นที่ทำงาน…</p>}><DemoWorkshopProvider>{children}</DemoWorkshopProvider></Suspense></AppThemeProvider></body>
    </html>
  );
}
```

### C. SVG geometry and brand markup — app/appearance.tsx

```tsx
function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const p: Record<IconName, React.ReactNode> = { grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>, inbox: <><path d="M4 4h16v13H4z"/><path d="M4 13h4l2 3h4l2-3h4"/></>, machine: <path d="M5 20V8h14v12M8 8V4h8v4M9 13h6M12 10v6"/>, truck: <><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></>, file: <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/>, layers: <path d="m12 3 9 5-9 5-9-5zM3 12l9 5 9-5M3 16l9 5 9-5"/>, wallet: <path d="M4 6h15v13H4zM4 9V5h12M15 13h6v4h-6z"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, search: <><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></>, plus: <path d="M12 5v14M5 12h14"/>, arrow: <path d="m9 18 6-6-6-6"/>, bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>, logout: <path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/>, close: <path d="M6 6l12 12M18 6 6 18"/>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>, moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/> };
  return <svg aria-hidden="true" className="icon" width={`${size / 16}rem`} height={`${size / 16}rem`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p[name]}</svg>;
}

export function Logo({ onClick }: { onClick?: () => void }) {
  const mark = <><span className="brand-mark"><span/></span><span><b>LATHE</b><small>SHOP CONTROL</small></span></>;
  return onClick ? <button className="brand brand-button" onClick={onClick} aria-label="กลับหน้าแรก">{mark}</button> : <div className="brand">{mark}</div>;
}

export
```

### D. Route file inventory

- `app/admin/orders/page.tsx`
- `app/admin/page.tsx`
- `app/admin/workers/page.tsx`
- `app/customer/delivery-payment/page.tsx`
- `app/customer/deposit-po/page.tsx`
- `app/customer/documents/page.tsx`
- `app/customer/jobs/page.tsx`
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
- `app/staff/materials/page.tsx`
- `app/staff/orders/page.tsx`
- `app/staff/page.tsx`
- `app/staff/payments/page.tsx`
- `app/staff/production/page.tsx`
- `app/staff/quotations/page.tsx`
- `app/staff/receiving/page.tsx`
- `app/staff/requests/page.tsx`

<!-- DESIGN-SNAPSHOT:END -->
