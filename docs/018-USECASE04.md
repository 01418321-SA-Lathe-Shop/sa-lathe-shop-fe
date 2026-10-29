# UC4 — PO/deposit evidence and job opening

## Purpose

Collect the required customer-issued PO and/or deposit evidence, allow staff review, and open the production job only after all required evidence is approved.

## Actors and UI responsibilities

- **Customer/company member:** upload and submit the required evidence for an accepted quotation.
- **Worker/Admin:** review evidence with one immutable outcome and an expected version.
- **System:** enforce the original deadline and create exactly one queued job when all required approvals are complete.

## Frontend flow

1. Read the accepted quotation's saved terms and deadline.
2. Upload a private file; upload completion only means the file passed technical validation, not that the PO or payment is approved.
3. Submit the PO or deposit evidence using the matching contract fields.
4. Show pending/approved/rejected review state and any resulting job returned by the backend.
5. For a rejected replacement, use a fresh upload. For an uncertain write, retain the identical idempotency key and payload for explicit retry.

## Confirmed rules

- The evidence deadline is acceptance time plus 14 days (336 hours); the frontend cannot extend it.
- Deposit and PO requirements follow the immutable terms from UC3. Staff approval, not upload, gates job opening.
- Preserve private evidence access and role-specific redaction.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/004-UC4.md`.
