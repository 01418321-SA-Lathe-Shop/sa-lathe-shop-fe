# UC9 — Delivery, invoices, customer inspection, and payment

## Purpose

Coordinate delivery, issue the post-deposit invoice, record customer inspection/returns, and settle the balance with role-specific financial visibility.

## Actors and UI responsibilities

- **Worker/Admin:** issue the job invoice and record whole-job delivery by self or third party; no carrier tracking integration is implied.
- **Customer/company member:** inspect the delivered job, accept it, return it with a reason for same-job free rework before acceptance, or submit bank-payment evidence.
- **Admin only:** set the confirmed invoice terms, review/reject customer bank evidence, and record cash receipts.

## Frontend flow

1. Load job, delivery, invoice balance, and only fields authorized for the current role.
2. Record delivery/receiver and show the server-confirmed state.
3. Let the Customer accept or return the delivery; show the unchanged invoice during permitted rework.
4. Submit bank evidence for an amount within the current balance; Admin reviews it. Cash receipt entry remains Admin-only.
5. Show closure only when the latest delivery is accepted and the invoice is fully paid.

## Boundaries

Installments are supported with exact allocation and no overpayment. Staff never receive customer payment details or proof. Rework is free and tied to the same job before acceptance; do not fabricate a refund, warranty, carrier API, or post-acceptance return flow.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/009-UC9.md`.
