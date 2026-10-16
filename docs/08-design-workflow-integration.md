# Design and workflow integration — 2026-10-16

The owner authorized merging the saved design branch into develop, displaying Worker as Staff, and providing separate Admin pages.

## Delivered

- Integrated the orange Landing and appearance system with the functional Customer, Staff and Admin demos.
- Kept domain/API role identifiers and existing business functions unchanged. Staff is the display name of Worker.
- Added separate role URLs and navigation. Admin has Staff-profile management and material orders; Staff retains UC2 and UC5–UC9. Customer retains UC1/UC3/UC4/UC9.
- Replaced the old static dashboard rows and disconnected counts with shared-data workspaces. Legacy routes redirect to their functional equivalents; see DESIGN.md.
- Placed DemoWorkshopProvider in the root layout so client navigation and role switches retain records and file references. Reload still resets sample data.
- Kept Settings and account outside the sidebar scroll region, including the mobile drawer. Unique radio group IDs prevent settings from conflicting with cached route instances.
- Preserved light/dark transitions and Small/Medium/Large UI scale. Adapted all imported workflow styles to rem dimensions and semantic colors.
- Preserved the exact backend client and its upload tests. Real login/registration and real UC screen integration remain unfinished Phase 7 work. The credential forms are disabled with an explicit explanation; demo entry remains available for all three roles.

## Verification

- Production build and TypeScript passed; all generated routes compiled.
- 45 native domain/API tests passed, covering permissions, quotation/deposit/payment rules, purchasing/stock/production consistency, profile management, exact API numbers, uploads and session fallback.
- Browser: Customer submitted a new request with a demo document; Staff saw the same request/file and sent a THB 2,400 quotation; Customer saw and accepted it. Sample records survived all client route and role changes.
- Browser: Admin added a Staff profile and created a material order; Staff saw that order in Receiving and recorded a good receipt; Production showed the updated free stock.
- Browser: Staff opening /admin was redirected to /staff. Opening /admin/workers after sign-out redirected to /login.
- Browser: Light/Large at 1200×650 had no page horizontal overflow; sidebar content 672px scrolled inside a 453px region, account bottom 622px remained inside the viewport.
- Browser: Dark/Large at 390×844 had no page horizontal overflow; mobile drawer account bottom 825px remained inside the viewport. Settings reflected the selected theme/size.
- Browser console after a fresh direct-route load had no errors or warnings.
- DESIGN.md source snapshot and whitespace checks are run before committing.

## Existing validation limitation

The installed/pinned eslint-config-next 14.2.35 is incompatible with the repository's ESLint 9 flat config. The unchanged npm run lint fails resolving eslint-config-next/core-web-vitals. A compatibility check also exposed an old react-hooks plugin using the removed context.getScope API. No dependencies were installed/upgraded, no lint rules were disabled, and the original ESLint config was retained. Production build, TypeScript and native rule tests provide the verified checks for this merge.

## Remaining boundaries

This integration is a functional local demo, not production authentication or real payments/uploads. Form labels from develop remain largely English while the shell is Thai. The historical demo fifth-rejection rule is unchanged; the backend sixth-rejection contract belongs to Phase 7 integration. Existing open material-quantity, shortage and transaction-policy decisions remain open.
