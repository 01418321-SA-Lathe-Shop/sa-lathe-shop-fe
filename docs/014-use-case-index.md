# Frontend Use Case Documentation Index

These numbered documents summarize the frontend-facing responsibilities for the implemented UC1–UC9 flows. Each detail page links back to the product guide and current backend contract. The original report contains additional proposed UCs 10–12; they are documented separately as source material and must not be mistaken for new frontend/API scope.

| File | Use case | Primary UI role(s) | Backend contract |
| --- | --- | --- | --- |
| [015-USECASE01.md](015-USECASE01.md) | Customer registration, membership, and job request | Customer; Worker/Admin reads as authorized | `docs/001-UC1.md` |
| [016-USECASE02.md](016-USECASE02.md) | Request review and quotation | Worker; Admin read-only; Customer reads sent quote | `docs/002-UC2.md` |
| [017-USECASE03.md](017-USECASE03.md) | Customer quotation decision and terms | Customer / active company member | `docs/003-UC3.md` |
| [018-USECASE04.md](018-USECASE04.md) | PO/deposit evidence and job opening | Customer, Worker, Admin | `docs/004-UC4.md` |
| [019-USECASE05.md](019-USECASE05.md) | Material catalog, stock, plans, and reservations | Admin, Worker | `docs/005-UC5.md` |
| [020-USECASE06.md](020-USECASE06.md) | Supplier procurement orders | Admin only | `docs/006-UC6.md` |
| [021-USECASE07.md](021-USECASE07.md) | Material receiving, claims, supplier settlement | Admin and Worker; financial actions Admin-only | `docs/007-UC7.md` |
| [022-USECASE08.md](022-USECASE08.md) | Production execution and actual usage | Worker; Admin monitors/costs | `docs/008-UC8.md` |
| [023-USECASE09.md](023-USECASE09.md) | Delivery, invoices, customer inspection, payment | Customer, Worker, Admin with distinct permissions | `docs/009-UC9.md` |
| [024-USECASE10-12.md](024-USECASE10-12.md) | Additional use cases appearing in the source report | Mixed / not all supported as described | `docs/000-auth.md`, `docs/005-UC5.md` |

## How to use this catalog

1. Use the numbered frontend page for role-visible behavior and presentation boundaries.
2. Use the corresponding backend UC contract for request/response fields, authorization, validation, statuses, retries, and transaction behavior.
3. Use `docs/02-frontend.md` for the consolidated product/UI integration rules. `docs/11-phase-ten-handoff.md` is a historical implementation snapshot, not the current auth/mock-mode contract; see `docs/real-api-only.md` for current behavior.
4. Do not copy the source report's SQL into frontend code or infer an endpoint from a diagram. The frontend calls documented backend APIs only.

## Status of the supplied source report

The report's UC1–UC9 sequence is traceable to the current numbered backend contracts. UC10–UC12 were added to the academic report's reviewed CRUD analysis; their scope differs from the current product. See `024-USECASE10-12.md` before planning any extension.
