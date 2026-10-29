# UC8 — Production execution and actual usage

## Purpose

Track job execution, actual material use, labor time, optional production photos, and completion reconciliation.

## Actors and UI responsibilities

- **Worker:** start an eligible job, record incremental material use and whole labor minutes, upload optional private photos, and complete the job.
- **Admin:** monitor jobs and enter/revise actual labor cost; cost fields remain Admin-only.

## Frontend flow

1. Read the queued job and current material-plan version/readiness.
2. Enable start only when the plan is nonempty and fully reserved at the current version.
3. Record actual use incrementally. The server consumes the job's own reservation first, then free stock; permitted extra/unplanned use must not steal another job's reservation.
4. Record labor time, optional photos, and completion; render server-confirmed state and cost visibility by role.

## Boundaries

Starting a job does not automatically consume its plan. Completion releases unused reservations without adding physical stock. Do not invent worker assignment rules, hourly rates, or mandatory photos.

## Contract references

Frontend: `docs/02-frontend.md` and `docs/real-api-only.md`. Backend repo (`SA-Lathe-Shop-BE`): `docs/008-UC8.md`.
