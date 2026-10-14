# Phase 2 — Demo Application Shell Handoff

Status: **Completed for the approved demo scope**, 2026-10-15.

Requirements: `docs/02-frontend.md`. Open product decisions remain tracked in `docs/01-phase-one-decisions.md`; completion of this demo phase does not close those decisions.

## Implemented behavior

- Responsive demo account selection for Customer, Worker, and Admin, explicitly labeled as demo access. No credentials or live business data are required.
- Sign-in enters the selected role's overview; sign-out returns to account selection and clears demo session state.
- Role is restored after refresh in the same tab using `sessionStorage`. Only the three exact documented roles are accepted. Blocked storage uses page memory and does not persist through reload.
- Sidebar navigation on desktop and a toggleable mobile navigation menu. Escape closes the mobile menu and restores focus to its toggle; panel selection closes the menu and focuses its heading.
- Clickable overview cards and empty workspace panels for later workflows. These panels do not perform business mutations or claim live data exists.
- Visible demo labels, Asia/Bangkok/THB/no-VAT context, keyboard focus styles, and a skip-to-workspace link.
- Updated page metadata and a workshop visual identity.

## Role navigation

| Role | Available workspaces |
|---|---|
| Customer | Overview; Requests (UC1); Quotations (UC3); Deposit & PO (UC4); Delivery & payments (UC9) |
| Worker | Overview; Quotations (UC2); Materials (UC5); Material orders (UC6); Receiving (UC7); Production (UC8); Delivery & payments (UC9) |
| Admin | Overview; Workers (documented Admin responsibility); Material orders (UC6) |

Admin does not inherit Worker production/receiving/quotation permissions. Supplier has no demo account. Customer type (`individual`/`company`) is not treated as a role.

## Implementation boundaries

- The app retains `/` as its only business route; workspace selection is client state. Refresh restores the role and returns to overview. There are no new route folders.
- `app/demo-access.ts` owns the typed role/workspace registry and selection checks. `app/demo-session.ts` owns demo role storage and subscriptions. `app/page.tsx` renders login and the shell using those boundaries.
- Demo role checks are a prototype navigation boundary. They do not authenticate a real identity or authorize Backend requests. Production authentication and server permissions require the Backend contract.
- No API endpoints, business form schemas, money rounding, production status transitions, upload adapter, or notification integration were invented.
- Existing dependencies and folder structure are retained. Unrelated `package.json` and `package-lock.json` edits are excluded from phase commits.

## Run locally

From the project root, with the existing dependencies available:

```text
npm run dev
```

Open the localhost URL printed by Next.js. Select a demo role, enter the workspace, select sidebar items or cards, and use Sign out to switch roles.

The production build can be checked with:

```text
npm run build
npm run start
```

Browser verification during this phase used the built app at `http://127.0.0.1:3101`. Port 3100 was used for initial development checks. These are local test addresses, not deployment settings.

## Verification results

| Check | Result |
|---|---|
| `npm run lint` | Passed |
| `npm run build` | Passed; `/` prerendered successfully |
| `node --test app/demo-access.test.mjs` | 5 tests passed, using existing Node v24.19.0 |
| Customer browser navigation | UC1/UC3/UC4/UC9 shown; workshop/Admin actions excluded |
| Worker browser navigation | UC2/UC5–UC9 shown; Worker management excluded |
| Admin browser navigation | Workers and UC6 only |
| Demo persistence/sign-out | Same-tab refresh restores role; sign-out returns to login |
| Mobile layout | Checked at 390px and 320px; no horizontal overflow observed |
| Mobile keyboard navigation | Toggle, focus movement, Escape dismissal, and panel focus verified |
| Production browser console | No captured warnings/errors in the tested flow |
| Whitespace/diff review | `git diff --check` passed before commit |

Native tests check invalid role values, Customer/Worker/Admin access boundaries, exact UC mapping, and valid overview/workspace selection. A Node module-type warning can appear for direct TypeScript imports; tests pass without changing `package.json` or adding dependencies.

## Next-phase dependencies

Phase 3 covers Customer business workflows. Before implementing their detailed forms/actions, resolve exact fields and data contracts, money precision/rounding, file allowlist, invoice due terms, and `JOB_REQUEST.completed` behavior. These open decisions are not answered by the demo shell.

## Commit grouping

1. `eca1508`: demo shell, storage/access boundaries, styles/metadata, and role-access tests.
2. Separate documentation handoff: phase status, source-guide implementation notes, this verification record, and Next.js-generated guidance.

Both groups are pushed to `origin/develop`, following the incremental commit rule.
