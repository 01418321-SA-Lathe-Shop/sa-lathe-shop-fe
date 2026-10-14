<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project-specific guidance

- This repository is the frontend for the Machine Shop Custom Manufacturing System. Read `docs/02-frontend.md` before making project changes; treat it as the source of truth for product workflows and requirements.
- Preserve the existing project layout: Next.js App Router files live under `app/`; do not restructure folders without asking.
- Follow the versions already declared in `package.json` (Next.js 16.4.0, React 19.3.0, TypeScript, and Tailwind CSS 4). Do not install or upgrade dependencies without asking.
- Keep UI behavior aligned with the documented Customer, Worker, and Admin permissions and UC1–UC9 workflows. Preserve entity names and status values exactly. Do not infer Admin permissions beyond those documented.
- The UI must not contain S3 or authentication secrets. Use environment configuration for the API base URL; authentication/session details are not yet defined.
- Display times in `Asia/Bangkok`, money in baht, and do not add VAT. Enforce the documented 100 MB document/image upload limit and offer “Upload again” after a failed upload (new upload, not automatic retry).
- Do not invent form fields, routes, endpoints, API shapes, status transitions, error behavior, or business rules. Mark unspecified items as “To be defined” and surface conflicts/open questions before choosing an implementation.
- Preserve temporary assumptions and proposals as such. Confirmed pricing uses minimum 60% markup on material plus labor cost. Required Deposit/PO must be submitted within 14 days after quotation acceptance. Both Admin and Worker may perform UC6; planned materials and required quantities are saved per JOB. Exact shortage logic and the UC7-to-UC5 handoff remain unconfirmed.
- Initial login may use explicitly labeled demo accounts until Backend defines real authentication. Treat demo login as prototype behavior; it does not establish production authentication or API authorization.
- Before editing application code, follow the generated Next.js instructions above and consult the relevant local Next.js guide under `node_modules/next/dist/docs/`.

## Commit and push workflow

- Work on `develop` and push ongoing project commits to `origin/develop`. Verify the active branch before editing or committing; do not commit or push ongoing work to `main` unless the user explicitly requests it.
- Commit work in small, coherent groups, each with one understandable purpose and a descriptive message. Keep each group easy to review, debug, and revert.
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

Continue the current user request without reporting immediately. Ignore routine debugging and unverified changes. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Keep a qualifying candidate through the reporting pass even if you resolve or work around it. A successful fix changes the report outcome; it does not erase the friction that qualified it.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `node node_modules/next/dist/bin/next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
