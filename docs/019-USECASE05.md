# UC5 — Material catalog, stock, plans, and reservations

## Purpose

Give shop staff a current view of material availability and let authorized roles maintain the catalog, counted stock, and per-job material plans.

## Actors and UI responsibilities

- **Admin:** manage units/materials, record additions and count corrections with a reason, and read job plans.
- **Worker:** search/read the catalog and edit eligible queued-job plans or explicitly request reservation re-checks.
- **Customer:** has no inventory or job-plan access.

## Frontend flow

1. Search the server catalog and display exact on-hand, reserved, available, and shortage values returned by the API.
2. Admin stock additions require an exact quantity, unit cost, and reason. Count corrections use the server's absolute-count contract and must not undercut reservations.
3. Worker plan edits submit a complete explicit material list and the current plan version. Partial allocation and shortages are server results; saving a plan does not consume stock.
4. Show the persisted plan after save/re-check. A reservation is not actual usage, and new stock does not silently top up a plan.

## Boundaries

Keep quantities/unit cost as exact decimal strings with six-place precision. Do not perform arithmetic with JavaScript floating-point numbers, invent conversions other than the per-material factors the backend provides, or expose Admin-only average/movement costs to Worker views.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/005-UC5.md`.
