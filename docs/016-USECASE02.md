# UC2 — Request review and quotation

## Purpose

Let the shop assess a request, prepare its cost estimate, and send a quotation for the Customer's decision. The source report describes request review, feasibility checks, and quotation preparation together.

## Actors and UI responsibilities

- **Worker:** review authorized requests, create/edit a draft quotation, send it, or refuse a request with the required reason.
- **Admin:** may inspect the shop queue and cost information but does not perform Worker quotation mutations.
- **Customer:** sees sent quotations and the customer-safe fields only.

## Frontend flow

1. Load the request and its private attachments through authorized reads.
2. Display the saved request and any editable draft without fabricating missing data.
3. Submit quote changes using the server's expected version; on a conflict, reload instead of overwriting newer work.
4. Show the server-calculated/saved quotation amount and status. Do not show internal material/labor costs to Customer accounts.

## Pricing and boundaries

The minimum price is based on a 60% markup over material plus labor cost for the whole requested quantity, rounded upward to a satang. Do not add VAT or independently recompute persisted terms in the browser. Exact fields, decimal handling, and refusal rules are defined by the current backend contract.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/002-UC2.md`.
