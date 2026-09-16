# Digital Coordinator

A platform that digitizes the manual coordination of part-time/short-term
workforce staffing (initially university undergraduates in Sri Lanka) —
see `digital_coordinator_product_blueprint_v0.1.txt` for the full product
brief this build follows.

## Stack

- **Next.js 16** (App Router, TypeScript) — single app, UI + API routes.
- **PostgreSQL + Prisma** — relational data, migrations in `prisma/migrations`.
- **Auth**: phone number + OTP (no passwords). SMS delivery is pluggable
  (`src/server/auth/sms.ts`) — `SMS_PROVIDER=console` logs codes to the
  server console for local dev.
- **Vitest** for business-logic tests (job/application state machine,
  matching engine).

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env` and adjust if needed (defaults match the
   Docker Compose Postgres below).
3. Start Postgres: `docker compose up -d db`
4. Run migrations: `npm run db:migrate`
5. Seed demo data (a coordinator + a worker + an employer): `npm run db:seed`
6. `npm run dev` and open http://localhost:3000

Since there's no real SMS provider wired up yet, OTP codes are printed to
the terminal running `npm run dev`, formatted as:
`[SMS -> +94...] Your Digital Coordinator verification code is XXXXXX.`

Seeded demo accounts (log in with purpose `LOGIN`):
- Coordinator: `0770000000`
- Worker (profile complete): `0771111111`
- Employer (profile complete): `0772222222`

The seed also creates 3 demo jobs (OPEN, dated relative to whenever the seed
runs) so worker job-browsing has something to show — there's no employer
job-creation UI yet (Phase 3).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run test` | Run the Vitest suite |
| `npm run db:migrate` | Create/apply a Prisma migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed local demo data |

## Architecture notes / decisions

- **Modular monolith**, not microservices — folders under `src/server/`
  (`auth`, `jobs`, `matching`, `notifications`, `audit`) are the module
  boundaries.
- **Job and Application state machines are explicit code**
  (`src/server/jobs/state-machine.ts`), not just DB enum values — every
  transition is validated, terminal states (`COMPLETED`, `CANCELLED`) have
  no outgoing edges.
- **Matching/refill is deterministic, not AI** (`src/server/matching/engine.ts`):
  a hard eligibility filter plus a transparent, weighted ranking score.
- **WorkHistory and Verification are not separate tables.** Work history is
  derived from `Assignment`/`Attendance` records rather than duplicated;
  verification status lives directly on `WorkerProfile`/`EmployerProfile`.
  Revisit if either needs its own audit trail later.
- **COORDINATOR/ADMIN accounts are never self-registerable** — only
  `WORKER` and `EMPLOYER` can go through `/api/auth/otp/verify` with
  `purpose: REGISTER`. Coordinator accounts are provisioned directly
  (see `prisma/seed.ts`).
- Route-based access (`src/proxy.ts`, the Next.js 16 "proxy"/middleware
  convention) is a UX redirect only — every actual mutation must still call
  `requireRole()` server-side (`src/server/auth/guard.ts`); the frontend is
  never trusted for authorization.
- **Job browsing (Phase 2) is pull, not push.** Workers filter/browse open
  jobs themselves (`GET /api/jobs`); the matching engine's job is to
  auto-notify eligible workers and drive refill, which is a Phase 5
  concern once assignments/cancellations exist. A `isPreferredCategory`
  flag badges jobs matching the worker's stated preferences, but there's no
  ranking or auto-matching yet.
- **Timezone**: job date/time input is now explicitly pinned to Sri Lanka
  time (`src/lib/sri-lanka-time.ts`, fixed UTC+5:30 offset, no DST) rather
  than relying on server-local time — this holds regardless of what
  timezone the server process itself runs in (local dev happens to be
  Asia/Colombo; production/Vercel will be UTC). `prisma/seed.ts` still has
  the worked postmortem of the `@db.Date` pitfall that motivated this.
- **Job creation is DRAFT-first.** An employer's job starts as `DRAFT`
  (freely editable), and only becomes `PENDING_APPROVAL` via an explicit
  "Submit for approval" action (`POST /api/employer/jobs/[id]/submit`).
  Editing is blocked once submitted — blueprint §28 requires a *live* job's
  edits to preserve an audit trail, which is more than v0.1 needs; cancel
  and recreate is the escape hatch for now. Cancelling
  (`POST /api/employer/jobs/[id]/cancel`) is allowed from any non-terminal
  status. Every employer job route re-checks `job.employerId` against the
  caller's own `EmployerProfile` (`src/server/employers/guard.ts`) —
  `requireRole("EMPLOYER")` alone only proves "some employer".
- **There is no coordinator approval UI yet (Phase 4).** A submitted job
  sits in `PENDING_APPROVAL` and is invisible to workers until a
  coordinator moves it to `OPEN` — that action doesn't exist yet, so
  employer-created jobs are a dead end until Phase 4 ships. The 3 seeded
  demo jobs bypass this by being inserted directly as `OPEN`.

## Build phases (see blueprint §36)

- [x] **Phase 1** — project setup: repo structure, phone+OTP auth, roles,
      Prisma schema/migrations, basic UI shell (landing, login, three
      role-gated dashboard stubs).
- [x] **Phase 2** — worker profile completion (`/worker/onboarding`),
      preferences and weekly availability, job browsing with category
      filter (`/api/jobs`), and applying to a job (`/api/jobs/[id]/apply`).
- [x] **Phase 3** — employer profile completion (`/employer/onboarding`),
      job posting as DRAFT (`/employer/jobs/new`), editing drafts, submitting
      for approval, and cancelling (`/employer` job list + actions).
      Verification stays informational only for now — coordinator
      approve/reject actions are Phase 4.
- [ ] Phase 4 — coordinator dashboard: job approval, worker management, assignment
- [ ] Phase 5 — core staffing lifecycle: applications, selection, confirmation,
      cancellation, replacement, attendance, completion
- [ ] Phase 6 — work history, basic payment tracking, reports
- [ ] Phase 7 — pilot hardening: error handling, security, audit logs, tests,
      backups, UX cleanup, deployment
