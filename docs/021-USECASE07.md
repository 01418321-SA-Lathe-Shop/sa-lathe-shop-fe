# UC7 — Material receiving, claims, and supplier settlement

## Purpose

Record good and damaged quantities received against an accepted material order, manage replacement-only claims, and record the authorized supplier settlement.

## Actors and UI responsibilities

- **Admin and Worker:** receive eligible orders and manage replacement claims.
- **Admin only:** view supplier prices/credit/payment details, set per-order credit terms, record settlement, and access supplier payment evidence.
- **Supplier:** receives external communication; does not use an application account.

## Frontend flow

1. Load an accepted order and its remaining quantities.
2. Record a partial/full receipt of good and/or damaged quantities within the backend's outstanding limit.
3. Show replacement claim state separately; damaged stock is not usable inventory.
4. Show Admin-only payment terms and settlement controls after full good receipt.

## Boundaries

Damaged quantities are handled by replacement, not refund or write-off. Supplier credit days are entered per order with no default. Settlement is one full cash or bank payment; bank proof is required and cash proof/photo is optional. No automatic UC5 reservation/allocation is implied by a receipt.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/007-UC7.md`.
