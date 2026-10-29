<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project-specific guidance

- Owner-approved update (2026-10-29): when NEXT_PUBLIC_LOCAL_TEST_LOGIN_ENABLED=true AND API base is loopback, the six demo buttons call real POST /auth/local-test/login with username only, then GET /auth/me and use its role. Otherwise retain username-only selection/manual password login. Backend separately requires LOCAL_TEST_ACCOUNT_ENABLE=true and active seed-owned identities. Never enable password-free Admin access publicly; no passwords, tokens or roles in config/storage. Preserve normal login/logout/expiry; no mock/fallback or automatic retry. See docs/local-test-login-handoff.md. The picker is not shown on registration.
- Current owner decision (2026-10-28): the browser mock is removed. All login/workspaces use the configured real API; do not restore sample-account shortcuts, mock transports or live-to-fixture fallback. Historical prototype/mock instructions below are archival and superseded. Test-only fetch stubs remain allowed. See `docs/real-api-only.md`; real demo accounts require operator setup and private credentials per backend `docs/015-demo-seed.md` and `016-frontend-demo-handoff.md`. Backend docs now use numbered filenames (`000-auth.md`, `000-setup.md`, `001-uc1.md`, etc.); resolve historical names against the current backend docs folder. No migration, seed or deployment without separate authorization.
- This repository is the frontend for the Machine Shop Custom Manufacturing System. Read `docs/02-frontend.md` before making project changes; treat it as the source of truth for product workflows and requirements.
- App Router routes and special files remain under `app/`. The owner-approved cleanup groups non-route code under `src/features/`, shared code under `src/components/`, `src/hooks/`, `src/lib/`, and mirrored native tests under `tests/`. Do not move route folders or change URLs without asking.
- Follow the versions already declared in `package.json` (Next.js 16.4.3, React 19.3.0, TypeScript, and the existing Tailwind CSS 4 setup). Do not install, remove, upgrade, or migrate dependencies without asking.
- Keep UI behavior aligned with the documented Customer, Worker, and Admin permissions and UC1–UC9 workflows. Preserve entity names and status values exactly. Do not infer Admin permissions beyond those documented.
- The UI must not contain S3 or authentication secrets. Use `NEXT_PUBLIC_API_BASE_URL` for the public API URL. Real integration uses the existing Go backend's memory-only opaque Bearer session; never put tokens in localStorage/sessionStorage, URLs or logs. Read `docs/08-backend-integration-handoff.md` and backend `docs/AUTH.md`, `UC1.md`, `UC2.md`, `UC3.md` before changing connected behavior.
- Display times in `Asia/Bangkok`, money in baht, and do not add VAT. Enforce the documented 100 MB document/image upload limit and offer “Upload again” after a failed upload (new upload, not automatic retry).
- Do not invent form fields, routes, endpoints, API shapes, status transitions, error behavior, or business rules. Mark unspecified items as “To be defined” and surface conflicts/open questions before choosing an implementation.
- Preserve temporary assumptions and proposals as such. Confirmed pricing uses minimum 60% markup on material plus labor cost. Required Deposit/PO must be submitted within 14 days after quotation acceptance. Backend's newer confirmed UC6 contract is Admin-only and supersedes the older Admin/Worker procurement rule. UC5/UC6 are implemented in backend but not connected by frontend Phase 8; read their latest contracts before the following phase.
- Current Phase 10: the designed shell runs on the real API client for AUTH and UC1–UC9; test accounts use the explicit in-browser contract mock (`app/mock-*.ts`), never a fallback for live failures. Read `docs/11-phase-ten-handoff.md` and backend UC6–UC9.md before changing UC6–UC9 screens; keep the mock routes in step with any contract change. Next.js is 16.4.3 (owner-approved security upgrade); `next build` and ESLint run. Hosting for student testing is Vercel + Railway (`docs/12-deploy-vercel-railway.md`); real-stack verification is pending that deployment. Historical Phase 9 note: Phase 9 connected live UC5 plus AUTH/UC1–UC4; read `docs/10-phase-nine-handoff.md`, backend UC5.md and current role-filtered DTOs. Staff reads/searches; Admin alone manages units/materials/stock; Worker alone writes ongoing queued-job plans/reservations; Admin plans are read-only and Customers never fetch them. Quantities/unit cost use exact NUMERIC(18,6), unlike two-place quote money. Corrections are absolute, omit unit cost and may correct inactive stock; additions require active materials. Retry preserves original key/payload/version and GETs current state after replay. Live UC6 is Admin-only. Older scope statements below are historical. Real frontend UC4/UC5 verification is pending Docker; production compile passes but build exits 1 on Next.js security gate. Ask before upgrading dependencies.
- Initial login may use explicitly labeled demo accounts until Backend defines real authentication. Treat demo login as prototype behavior; it does not establish production authentication or API authorization.
- The merged design uses `/` for Landing and `/login` / `/register` for real auth; role-route bypass remains demo-only. Never fall back to demo records on API failure. Frontend Phase 8 connects authentication, Worker contact create/edit and UC1–UC4. Read backend AUTH.md/UC4.md and `docs/09-phase-eight-handoff.md`; contacts are required on create, nullable for legacy reads, non-unique. Evidence upload completion is not staff approval; preserve original idempotency payloads on explicit uncertain-write retry. Real UC5–UC9 are not connected. Five Customer quotation rejections allow revision; the sixth cancels. Money is exact decimal strings, and int64 quantities must not lose JavaScript precision. File upload retries create fresh intents, never reuse failed completion state. Phase 8 real-backend verification is pending Docker recovery, distinct from passing stubbed browser checks.
- Before editing application code, follow the generated Next.js instructions above and consult the relevant local Next.js guide under `node_modules/next/dist/docs/`.
- Current source ownership is documented in `docs/refactor/README.md`; historical `app/backend-*` and `app/mock-*` paths refer to their original phase. Preserve direct imports/lazy scene boundaries and the deterministic CSS order in `src/components/ui/style-scopes.ts`. Native tests run with `npm test`; use `npm run audit:source` for the compiler-based dead-code/import graph audit. CSS Modules must bypass the existing Tailwind loader rule.

## Design documentation maintenance

- Read `DESIGN.md` before changing UI. It records the current visual specification; `docs/02-frontend.md` remains the source of truth for business workflows.
- For every change to fonts, colors, dimensions, spacing, icons, themes, UI scale, components, layout, responsive behavior, interactions, or routes, update the affected prose/tables in `DESIGN.md` in the same work item before reporting completion.
- Update the document's revision date and change log. Distinguish implemented behavior from proposals and known limitations; do not claim demo flows are production integrations.
- Run `node scripts/sync-design.mjs` to refresh the source appendix, then `node scripts/sync-design.mjs --check` and `git diff --check`. The generator does not replace manually updating the specification prose.
- Include `DESIGN.md` with the corresponding implementation changes when committing. Do not edit synced ChatGPT reference files under `sources/`.

## Commit and push workflow

- Work on `develop` and push ongoing project commits to `origin/develop`. Verify the active branch before editing or committing; do not commit or push ongoing work to `main` unless the user explicitly requests it.
- Commit work in small, coherent groups, each with one understandable purpose and a descriptive message. Keep each group easy to review, debug, and revert.
- Before staging, identify the purpose of each commit batch. Keep independent bug fixes, dependency/lockfile repairs, and workflow documentation in separate commits; include tightly coupled tests and required design documentation with their implementation. Do not use a final catch-all commit.
- Inspect `git diff --cached --stat` and `git diff --cached` before committing each batch. Verify and push that batch before beginning the next independent batch. At handoff, list commit hashes and their individual purposes.
- A merge commit preserves the existing granular commits; do not squash them into one implementation commit. Never rewrite or force-push already-published `develop` history merely to reorganize it without explicit approval for the history rewrite.
- Validate each group before committing. Stage specific files or hunks; exclude unrelated user changes and secrets.
- Push verified commit groups as work progresses, and finish every completed phase with all its commits pushed to the configured remote branch. Do not collect the entire project into one final commit and push.
- Use normal pushes. If a push fails, inspect the cause, preserve local commits, and report what remains unpublished; do not force-push or rewrite shared history without explicit authorization.
- For documentation-only groups, check accuracy, references, and diffs. For application groups, run the relevant existing checks before committing.
- At handoff, report phase status, changed files, verification results, commit groups, and push outcome. Unresolved product decisions remain pending rather than being marked confirmed.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
