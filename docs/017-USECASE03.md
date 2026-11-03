# UC3 — Customer quotation decision and terms

## Purpose

Record the Customer's accept/reject decision on the latest sent quotation and preserve the terms established by that decision.

## Actors and UI responsibilities

- **Customer:** any active member of the relevant company may decide for that company's request; individual Customers decide for their own requests.
- **Worker/Admin:** read resulting states and terms according to their permissions; the client does not manufacture a decision history.

## Frontend flow

1. Load the latest sent quotation and the current decision history.
2. Present accept and reject actions only when the server state permits them.
3. After submission, render the returned decision and immutable terms; reload current state after an uncertain response rather than silently issuing a new decision.

## Confirmed rules

- Five distinct rejections permit another quotation revision; the sixth rejection cancels the request.
- Quotation price and applicable terms are server-owned snapshots. The frontend must not infer customer type or recalculate terms from a displayed price.
- Company permissions derive from active membership, not only company ownership.

## Contract references

Frontend: `docs/02-frontend.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/003-UC3.md`.

## Use-case description alignment (2026-11-03)

Source: `Use_Case_Description_UC1-UC12.md`. The backend contract (`docs/003-UC3.md`) takes precedence; conflicts are recorded in backend `docs/025-uc-spec-alignment.md`.

- The source description cancels the request on the 5th rejection. The confirmed rule and the backend cancel on the 6th: rejections 1 to 5 allow a revision, and the sixth cancels. Show the rejection count and the revision state exactly as the API returns them.
- The terms shown after acceptance come from the stored acceptance snapshot. Do not recompute them in the browser from customer type and price.
