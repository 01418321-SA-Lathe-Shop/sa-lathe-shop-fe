# Password-free local-test login — 2026-10-29

## Scope and configuration

The six existing demo buttons can now authenticate against the real Go API.
No browser mock, embedded password, fabricated role or token persistence is used.
Normal password login and registration remain unchanged.

Frontend opt-in (public configuration, not a secret):

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_LOCAL_TEST_LOGIN_ENABLED=true
```

For local development put these in ignored `.env.development.local`, then restart
`npm run dev` if the running server does not reload its environment. This checkout
has that development-only file enabled. It is not committed; `.env.example`
defaults the flag to false. Production builds do not load this development file.
Next public configuration is build-time: rebuild to change a production setting.

The frontend flag accepts exact `true` and only loopback API hosts (`localhost`,
`127.0.0.1`, `[::1]`). Without it, the picker keeps its username-only/manual-password
behavior. These UI checks are not the server's security boundary.

Backend must independently be running against the operator-prepared seeded demo
database with `LOCAL_TEST_ACCOUNT_ENABLE=true`. The frontend neither enables that
server flag nor runs seeds/migrations. See backend `docs/016-frontend-demo-handoff.md`.
**Do not expose the enabled API to the public:** anyone who can reach it may sign
in as the demo Admin. Turning off the backend flag removes new shortcut logins,
not existing sessions; those still require revocation or expiry.

## Flow

1. Open `/login` and expand **บัญชีทดสอบ Local · เข้าสู่ระบบทันที**.
2. Select one of the six accounts. Clear the normal form's password; disable the
   form and picker through the existing pending-command handling.
3. `POST /auth/local-test/login` with **only** `{ "username": "pim.admin" }`.
4. Validate the standard Bearer login response and keep its opaque token in memory.
5. `GET /auth/me`; use its actual role for `/admin`, `/staff` or `/customer`.
6. Existing logout posts `/auth/logout`; expiry/401 use the same session cleanup.

No password, role, account UUID or enable flag is sent in the shortcut payload.
Registration never renders the picker. There is no automatic retry, password-login
fallback or fixture fallback. UI messages explain 404 (backend disabled), 401/403
(identity unavailable), 429 (wait at least one minute), and network failure.

## Real browser-to-backend verification

Date: 2026-10-29. Website `http://localhost:3000`, API `http://localhost:8080`.
Backend checkout inspected: `77d3568`; the running API's exact build revision was
not independently exposed/identified. The operator had already prepared and
started the API/database; this frontend task did not provision or change them.

Chrome used the actual buttons with no intercepted responses for these checks:

| Account | Viewport | Server role / route | Login / me | Logout / revoked me |
| --- | --- | --- | --- | --- |
| pim.admin | 1280px | admin / `/admin` | 200 / 200 | 204 / 401 |
| anan.staff | 390px | worker / `/staff` | 200 / 200 | 204 / 401 |
| kittipong.staff | 1280px | worker / `/staff` | 200 / 200 | 204 / 401 |
| nida.company | 390px | customer / `/customer` | 200 / 200 | 204 / 401 |
| ploy.company | 1280px | customer / `/customer` | 200 / 200 | 204 / 401 |
| somchai | 390px | customer / `/customer` | 200 / 200 | 204 / 401 |

- Exactly one local-test login request per click; no normal `/auth/login` call.
- CORS worked through the browser; token values were not written to logs/files.
  Browser localStorage/sessionStorage did not contain the issued tokens.
- Admin `/admin/workers?limit=1` read returned 200; Worker/Customer returned 403.
- Nida/Ploy `/customers` reads contain the same company ID with owner/member flags
  respectively. Somchai's memberships do not contain that company.
- Expected empty Customer workspace rendered; no horizontal overflow or runtime
  errors were observed. Every issued browser-test session was logged out/revoked.

These are real login/profile/permission reads, not a certification of UC1–UC9.
No new workflow data, invitations, files, stock or payments were created. Empty
data cannot prove populated company-request/workflow isolation. Normal real
password login and private S3 workflows were not reverified in this follow-up.

## Separate simulated/unit/build verification

- 136 native tests pass, including normal login regression, local-only opt-in,
  exact username payload, Bearer scope/logout and no fallback/retry on failure.
- Lint, TypeScript, source audit and production build pass; all 37 generated routes
  and runtime dependencies/lockfile remain unchanged.
- Desktop 1280px Light and mobile 390px Dark: intercepted 404/401/429/offline
  responses show recovery messages, keep login visible, clear passwords, re-enable
  buttons, make one attempt only and never call normal login as fallback.
  These failures were simulated; the real backend was not stopped/reconfigured.
- Production-default local preview at port 3100 confirmed password-free access
  remains off: selecting an account only fills username and sends no login request.
  That temporary preview was stopped after verification; no deployment occurred.

## Changes and commits

- `1d5468b`: real local-test API/session layer, guarded opt-in/error messages/tests.
- UI follow-up: connect the existing buttons, label local-only access, preserve
  manual-password mode when not opted in, and update current guidance/tests.
