# Phase 9 — Connected UC5 inventory and job material plans

Date: 2026-10-23. **Implementation delivered; real frontend UC4/UC5 verification pending Docker recovery.** Stubbed browser results below do not prove that Go, PostgreSQL or private storage ran successfully.

## Scope and entry points

Backend reference: develop `028dd88`, `docs/UC5.md`, `internal/material` DTOs/handler/service/views and PostgreSQL stock/plan implementations. Backend now implements UC1–UC9. This frontend phase connects **UC5 only** after existing AUTH/UC1–UC4; UC6–UC9 are not connected. Backend code was not modified.

Sign in at `/login` with a real account. Landing `/`, `/register`, session/token boundaries and separate demo role URLs are unchanged. Never use demo bypass as proof of live permissions. No new dependency, configuration key, folder restructure, route, auth provider or Next.js proxy was added. Unrelated user changes in package.json/package-lock.json were preserved and excluded from commits.

| Role | Entry | Delivered behavior |
| --- | --- | --- |
| Staff (`worker`) | Connected Materials tab | Search/read quantities, material active state/fixed unit, paginated stock history; no financial/private reason display |
| Admin | Connected Materials tab | Same reads plus unit/material creation, material rename/deactivate/reactivate, audited stock additions/count corrections, financial history |
| Staff | Requests → open request → approved quotation → opened job → Planned materials | Read/save complete desired list; partial allocation/shortage/readiness; explicit reservation top-up; confirm empty-plan release |
| Admin | Same opened job | Read-only material plan; no Worker write inheritance |
| Customer | Connected Requests | Existing fulfillment/job display; no inventory tab or plan API calls |

Plans deliberately use the actual job returned by UC4. No generic job-list endpoint was invented. Existing plan lines display material IDs because the plan response does not include names/units. Search in Materials or the editor to look up fixed units. Search results are paginated, not the complete catalog; unknown/inactive existing IDs are never silently removed.

## API mapping

All calls reuse the existing per-session memory-only Bearer client, abort on unmount/expiry, reject redirects and never fall back to fixtures.

| Method/path | UI/action | Role |
| --- | --- | --- |
| GET /units | Available fixed base units; `{items}`, maximum 1,000 | Admin/Worker |
| POST /units | Trimmed unique unit name, max 50 Unicode characters | Admin |
| GET /materials?search=...&limit=20&offset=... | Literal case-insensitive name search, encoded query; `{items}` only | Admin/Worker |
| POST /materials | Unique material name max 200 characters and loaded unit ID | Admin |
| PATCH /materials/{id} | Rename/active checkbox with expected_version; unit cannot change | Admin |
| POST /materials/{id}/stock | Reasoned addition or absolute count correction; UUID idempotency key | Admin |
| GET /materials/{id}/movements?limit=20&offset=... | Server audit history, role-redacted; `{items}` only | Admin/Worker |
| GET /jobs/{id}/materials | Version/readiness and required/reserved/consumed/shortage | Admin/Worker |
| PUT /jobs/{id}/materials | Complete desired list and expected version/key | Worker |
| POST /jobs/{id}/materials/reserve | Recheck saved list with expected version/key, no lines | Worker |

## Exact stock and plan behavior

- Quantity/unit cost is NUMERIC(18,6), serialized as decimal **strings**, up to 12 whole digits and six fraction digits. No floats, exponents, negative values or silent rounding. Display retains all six places. Quote/invoice money remains a separate two-place domain.
- Addition requires an active material, positive quantity, nonnegative unit cost and reason. Correction is an **absolute counted total**, can correct inactive materials, omits unit_cost, preserves average cost and cannot undercut active reservations. Zero correction is valid if nothing is reserved. Server owns moving-average arithmetic.
- Every stock change requires a trimmed 1–2,000-character audit reason and user confirmation. This is administrative stock, not UC7 supplier receiving or a supplier payment. Names/reasons disallow NUL/CR/LF; names are unique ignoring case. No material deletion or unit conversion/replacement.
- Worker material/history responses omit average/unit/before/after costs and private audit reasons/payloads. UI also gates these displays to Admin. Existing auth is still authoritative on the backend.
- Worker saves only an ongoing request's queued job. Initial plan version is 0; initial material stock version is 1. Full explicit plan has at most 500 distinct positive-quantity lines. Removed/reduced lines release this job's excess. Explicit `[]` releases all after confirmation. Inactive existing requirements may be retained/reduced/released, not newly added/increased.
- Allocation is backend-owned and can be partial. UI displays returned shortage/readiness, not a guessed calculation. Reservations protect other jobs, do not consume physical stock and do not change cost. Consumed quantities remain separate.
- Recheck explicitly tops up the **saved** plan, not unsaved edits. Incoming stock does not automatically allocate. Backend checks status/access/version again on every write; conflicts are never overwritten. Production commands remain outside this frontend phase.

## Uncertain writes and recovery

Stock and plan commands generate a UUID once per new intent. After constructing a canonical payload, freeze inputs and preserve the original key, version, quantities/cost/reason/lines in component memory. An explicit identical retry sends the same body; no automatic write retry or modified payload under the same key. Backend replay can return a historical snapshot, so success/replay always triggers a current GET.

After a failed response, inspect current stock/plan before preparing a different command. Plan reload/close warns before discarding local edits or retry state. Navigation/reload/sign-out can discard memory, not server data. Catalog create/update has no idempotency-key contract: reload before repeating an uncertain write. Do not imply an unsuccessful HTTP response guarantees rollback.

Loading/error/empty states are real request states. Reload controls are explicit; stale responses are ignored through existing resource hooks. The synchronous command guard blocks duplicate clicks. No optimistic stock/payment changes or secrets/browser token persistence were introduced.

## Run and acceptance checklist

1. Use existing dependencies; do not install/upgrade without approval. Use the backend's latest setup/runbook and a healthy Docker engine. Its current UC1–UC9 binary requires migrations through **000012**, including UC5/UC7 plan-consumption fields. Never run disposable migrations/bootstrap against business data without authorization.
2. Configure the existing public `NEXT_PUBLIC_API_BASE_URL` using `.env.example`/private local configuration. This is a build-time browser URL, not a secret; rebuild after changing it. API CORS must allow the actual browser origin. Keep PostgreSQL/S3/auth secrets entirely outside frontend config. No env file was changed in this phase.
3. Run `npm run dev`, or build then `npm run start`. Current Next.js security gate prevents claiming a clean production build; resolve an approved security upgrade before production release.
4. Admin creates a unit/material and adds stock with an audit reason; reload and inspect persisted quantities/cost/history. Search literal `%`/`_` and ordinary substrings, rename/deactivate/reactivate, correct an inactive material without unit_cost, reject additions to inactive materials and counts below reservations.
5. Worker opens a UC4-created queued job, saves a requirement larger than available and verifies partial reservation/shortage. Admin adds stock; verify no automatic top-up. Worker explicitly rechecks, verifies readiness, reduces/removes lines and confirms full release. Check physical stock did not change from reservations.
6. Verify exact duplicate-key replay after response loss, stale version conflicts, concurrent jobs, backend status/access revalidation, unknown/inactive plan lines, role-redacted JSON and Customers denied from direct inventory/plan API calls. Frontend stubs do not prove these backend guarantees.
7. Complete the pending real UC4 deposit/PO/private-file/job-opening verification as well. No Docker reset/socket deletion/WSL shutdown/data/settings change is authorized by this handoff.

## Verification evidence

| Boundary/check | Result in this phase |
| --- | --- |
| Exact domain + existing native tests | **58 passed**, including five new UC5 tests (full decimal range, plan validation/duplicates/empty release, stock modes/reserved lower bound/inactive correction, Unicode catalog validation) |
| TypeScript (`tsc --noEmit`) | Passed |
| Changed-file ESLint | Passed for inventory/domain/plan/fulfillment/workspace |
| Whole-project lint | **Not passed**: existing appearance.tsx:45 synchronous setState in effect; line 50 unused directive warning. No suppression/dependency change |
| Production compilation/type-check/28 prerendered routes | Completes; **overall build exits 1** with SecurityFatalError recommending Next.js security upgrade. Repeating the suggested build does not clear the gate. No upgrade authorized/performed |
| Browser → contract-shaped API stubs → UI | Passed: create/search, deactivate/reactivate, inactive absolute correction without unit_cost, exact addition and response-loss replay, Worker financial redaction, partial plan/retry, explicit top-up, Admin read-only, conflict/reload, confirmed release, Customer isolation, no runtime errors |
| Responsive/theme | 390×844 and 1440×1000 Light/Large screenshots inspected; no horizontal document overflow. One bounded correction clips the nonfocused skip link; keyboard focus restores it |
| Design docs/snapshot | Prose/date/changelog updated, snapshot matches; detector returned `[]`; whitespace checked |
| Real browser → Go → PostgreSQL/storage | **Pending, not passed.** Docker missing/unresponsive engine; one normal detached startup and bounded engine probe still timed out. Stopped only our hung CLI; no settings/data/reset changes. No new test containers/volumes created |

The browser runner used the already-installed external Playwright runtime and synthetic in-memory API stubs, not a new dependency. Its initial missing token_type fixture was corrected to match the login contract. Unit/stub success is deliberately separated from unexecuted real-stack checks. Historical Phase 8 build results do not describe the current security-gated build.

The UI guidance preserved existing appearance/rem scaling, inline controls and role boundaries. React/verification guidance informed exact server-state reads, cancellation, retry snapshots and clear evidence-layer reporting; no visual redesign or provider migration was introduced.

## Remaining work

1. Recover Docker normally or provide an accessible approved backend, then run real UC4/UC5 acceptance checks. Repair/reset of Docker requires separate authority.
2. Approve a security dependency upgrade; resolve current Next.js build gate. Existing unrelated appearance lint error also remains.
3. Next integration phase: **UC6 Admin-only supplier catalog/orders**, then UC7 receiving/claims/supplier payments, UC8 production/issues/evidence, UC9 delivery/invoices/installment settlement. Read each current backend contract before coding; older Admin/Worker UC6 demo permissions are historical.
4. Auth persistence/refresh/reset, Supplier login, extra notifications or unconfirmed policies are not silently added.

## Commits and changed files

Normal pushes to `origin/develop`: `37d4006` exact UC5 domain/tests; `909f670` catalog/stock UI; `2960f76` job plans/reservations; `bd676fb` skip-link clipping; final documentation handoff is a separate commit. No force push or main changes.

Task-owned repository files:

- `app/backend-inventory-domain.ts`
- `app/backend-inventory-domain.test.mjs`
- `app/backend-inventory.tsx`
- `app/backend-material-plan.tsx`
- `app/backend-fulfillment.tsx`
- `app/backend-workspace.tsx`
- `app/workflows.css`
- `DESIGN.md`
- `AGENTS.md`
- `PLAN.md`
- `docs/02-frontend.md`
- `docs/09-phase-eight-handoff.md` (historical-status note only)
- `docs/10-phase-nine-handoff.md`

Local verification scripts/screenshots remain outside the repository in the task workspace. Backend and unrelated package edits were not changed by this phase.
