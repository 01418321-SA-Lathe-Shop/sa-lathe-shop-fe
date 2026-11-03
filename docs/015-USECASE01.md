# UC1 — Customer registration, membership, and job request

## Purpose

Capture a made-to-order request and its supporting files, then let authorized shop staff review it. This corresponds to the source report's “ส่งรายละเอียด” use case.

## Actors and UI responsibilities

- **Customer:** register/sign in, view own or actively shared company requests, create a request, attach allowed files, and view request status.
- **Worker/Admin:** read requests only within the server-authorized shop scope; use the request details and attachments during review.
- Company membership and the server-returned role determine access; the client must not infer access from a name or tax ID.

## Frontend flow

1. Authenticate through the real API and load the active membership.
2. Collect the documented request fields: description, positive integer quantity, optional material specification, and optional future requested deadline.
3. Upload files through the private intent → object upload → completion flow; show ready/failed state separately from business approval.
4. Create the request and display the server response. A failed request or read stays an API error; it never switches to sample data.

## Boundaries

- Use the file allowlist and 100 MB maximum in the current backend contract; never expose public object URLs or store signed links.
- Preserve exact integer quantities (including large `int64` values) and Bangkok-local date entry rules documented by the product guide.
- Do not add drawing/blueprint authoring: the shop does not provide customer drafting services.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/001-UC1.md` and `docs/000-auth.md`.

## Use-case description alignment (2026-11-03)

Source: `Use_Case_Description_UC1-UC12.md`. The backend contract (`docs/001-UC1.md`) takes precedence; conflicts are recorded in backend `docs/025-uc-spec-alignment.md`.

- Sign-up for a new customer requires one address line (backend migration 000018, `address`, 1–500 characters). The source description's split fields (line 1, line 2, district, province, postal code) are not part of the contract; do not build them until the owner confirms.
- The source description checks duplicate phone or email at sign-up. The backend does not, because contacts are non-unique by decision. Do not show a client-side duplicate error for contacts.
- Verify the registration form collects the address before testing real sign-up; this alignment did not check the current form.
