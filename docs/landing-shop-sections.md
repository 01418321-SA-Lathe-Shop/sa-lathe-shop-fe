# Landing shop sections and scroll motion — handoff (2026-10-29)

The public landing (`/`) now presents **Bangkok Machine Shop** to customers. It keeps the robot arm → conveyor → furnace → ingot animation in the hero.

## Story order

| # | Section | Anchor | Purpose |
|---|---|---|---|
| 0 | Hero | | What we are: shop headline, quote CTA, animation |
| 1 | บริการ | `#services` | What we make |
| 2 | วัสดุและความเที่ยงตรง | `#materials` | Can you machine my part? |
| 3 | ผลงาน | `#work` | Proof |
| 4 | ทำไมต้องเรา | `#why` | Reasons to choose us |
| 5 | ขั้นตอน | `#process` | How to order (UC1 → UC9 in customer terms) |
| 6 | คำถามที่พบบ่อย | `#faq` | Remaining doubts |
| 7 | ติดต่อ | `#contact` | Act: register, log in, call, LINE, visit |

The old "ทุกขั้นตอนเชื่อมถึงกัน" workflow section became section 5. The old "ทั้งโรงกลึงในระบบเดียว" system section became the order-tracking point in section 4. Both were merged per the owner's choice.

Testimonials are **not** built, because no real content exists. Add them only with real, permitted quotes.

## Where to edit

| What | File |
|---|---|
| Hero headline, paragraph, stats | `src/features/landing/landing-config.ts` |
| Shop contact details, map, services, materials, capability, gallery, reasons, steps, Deposit/PO rules, FAQ | `src/features/landing/landing-content.ts` |
| Section markup and FAQ JSON-LD | `src/features/landing/landing-sections.tsx` |
| Service icons | `src/features/landing/landing-icons.tsx` |
| Click-to-load map | `src/features/landing/landing-map.tsx` |
| Scroll effects | `src/features/landing/landing-motion.tsx` |
| Styles | `src/features/landing/landing.module.css` (section after "Shop sections and scroll motion") |
| Page title and description | `app/page.tsx` |

**Behaviour of contact fields and the map:**
- Contact channels become links automatically once `href` is filled: `tel:…`, `https://line.me/ti/p/…`, `mailto:…`.
- The map facade shows a "แสดงแผนที่" button once `mapEmbedUrl` is set. The Google iframe loads only after that click.
- `mapLink` adds an "เปิดใน Google Maps" link.

**Gallery photos:**
1. Put the images in `public/landing/work/`.
2. Set `image: "/landing/work/<file>.webp"` and an `alt` text for each `gallery` entry.

They render through `next/image`, sized per tile.

## Facts used from the system (not placeholders)

- Deposit/PO rules:

  | Customer | Requirement |
  |---|---|
  | Individual | 50% deposit, no PO |
  | Company, ≤ ฿10,000 | PO only |
  | Company, > ฿10,000 | PO + 50% deposit |

- The deposit may be anything from the minimum up to the full quoted total.
- Deposit/PO must be submitted within 14 days of accepting the quotation, or the request is cancelled.
- Upload types: PDF, DOC/DOCX, XLS/XLSX, TXT, JPEG and PNG, up to 100 MB per file. A failed upload offers "อัปโหลดอีกครั้ง".
- Prices are whole-job totals in baht, with no VAT.
- If the customer returns the work with a reason, the same job is reworked free and the invoice is unchanged.
- The invoice balance (price minus deposit) can be paid in installments.
- Delivery is by customer pickup or third-party shipping.
- Customers can track requests, quotations, production, delivery and invoices online.

These come from `docs/02-frontend.md` and the frontend upload validation. Not stated publicly: the internal 60% minimum markup, and the "five rejections allow revision, the sixth cancels" detail. The second is left to the quotation screen.

## Placeholders to fill

Every `[…]` on the page:

| Area | Placeholder | File |
|---|---|---|
| Hero stats | `[X]` ปีประสบการณ์, `[X]` งานที่ส่งมอบแล้ว | `landing-config.ts` |
| Contact | `[เบอร์โทรศัพท์]`, `[LINE ID]`, `[อีเมล]`, `[ที่อยู่ร้าน]`, `[วันทำการ]`, `[เวลาเปิด–ปิด]`, Google Maps embed URL and link | `landing-content.ts` (`shop`) |
| Services | Confirm all six services (turning, milling, threading, repair/replacement parts, prototypes, small to large batches) | `services` |
| Materials | Example grades for each of the 5 groups, plus "ยืนยันเกรดที่รับ" | `materials` |
| Capability | `[±X มม.]` tolerance, `[X มม.]` max diameter, `[X มม.]` max length, `[Ra X]` surface finish | `capability` |
| Gallery | 5 × `[ชื่อชิ้นงาน n]`, `[วัสดุ · จำนวน]`, plus photos | `gallery` |
| Why us | `[±X มม.]`, `[X–Y วันทำการ]` | `reasons` |
| FAQ | Lead time `[X–Y วันทำการ]`; CAD file handling; minimum order; materials confirmation; delivery area and fee | `faqs` |

Once a FAQ answer has no `[` left, it is automatically included in the FAQPage structured data.

## Motion and accessibility

- **Effects:** smooth anchor scrolling, a top progress line, a sticky section bar after the hero (`aria-current` on the section in view), a hero entrance and parallax, staggered blur-rise reveals, a self-drawing process line, and FAQ height animation where supported.
- **No library is added.** Everything uses an IntersectionObserver, one rAF-throttled scroll listener, and CSS.
- **No JavaScript:** everything is visible.
- **Reduced motion:** content is visible with no smooth scrolling, transforms or entrance animation. The hero shows the still poster.
- **Keyboard and semantics:** the FAQ uses native `<details>`, so Tab, Enter and Space work. The page has one h1, eight h2 and h3 items. Tables have captions and scoped headers. Targets are at least 44px.

## Verification

| Check | Result |
|---|---|
| `npm test` | 145 pass |
| `tsc --noEmit`, ESLint, `npm run audit:source` | Clean |
| `npm run build` | Pass |
| Chrome walks: 1440×900 (Dark and Light), 390×844 with reduced motion, 360×780, 1280×800 with JavaScript off | No horizontal overflow; no reveal left hidden; sticky bar visible after the hero; FAQ opens with Enter; FAQPage JSON-LD parses (5 filled answers); title set; no page exceptions |
