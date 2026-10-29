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
