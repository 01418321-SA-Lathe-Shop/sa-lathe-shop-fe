# UC6 — Supplier procurement orders

## Purpose

Let the shop order raw materials from external suppliers and record supplier responses. This is procurement, not stock receiving.

## Actors and UI responsibilities

- **Admin only:** maintain supplier records, create/read orders, record external acceptance or rejection, and review order history.
- **Supplier:** remains an external party; there is no Supplier login or self-service portal.
- **Worker:** does not create or manage procurement orders in the current backend contract.

## Frontend flow

1. Search/select the supplier and materials available through authorized Admin reads.
2. Create an immutable order with exact quantities/prices and any supported job references.
3. Record supplier acceptance/rejection using the backend's version and idempotency requirements.
4. Direct receiving to UC7; do not change on-hand stock from this screen.

## Boundaries

An order may cover multiple jobs or general replenishment and may exceed a current job requirement. The order itself does not allocate incoming stock, block UC5 plans, change reservations, or alter physical stock/average cost. Do not grant Worker procurement permissions based on older source diagrams.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/006-UC6.md`.

## Use-case description alignment (2026-11-03)

Source: `Use_Case_Description_UC1-UC12.md`. The backend contract (`docs/006-UC6.md`) takes precedence; conflicts are recorded in backend `docs/025-uc-spec-alignment.md`.

- The source description lets a Technician (Worker) place orders. The confirmed UC6 contract is Admin only. Do not show the order screens to Workers.
- After a supplier rejects an order, Admin creates a new order with another supplier. There is no "find another supplier" action.
- Order status is `ordered` or `cancelled`; receiving progress comes from receipts, not from an order status value.
