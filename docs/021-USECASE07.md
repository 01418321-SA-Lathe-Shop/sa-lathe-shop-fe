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

## Use-case description alignment (2026-11-03)

Source: `Use_Case_Description_UC1-UC12.md`. The backend contract (`docs/007-UC7.md`) takes precedence; conflicts are recorded in backend `docs/025-uc-spec-alignment.md`.

- Supplier payment is not recorded at receipt. Admin sets credit days on the order (no default) and records one full cash or bank settlement after full good receipt. Do not show a pay-at-receipt action.
- Damaged units are not written off. They stay outstanding until good replacements arrive. Do not show a write-off option.
- The source description's notification that tells waiting jobs to start (Q7.7) is not implemented. Do not show it.
