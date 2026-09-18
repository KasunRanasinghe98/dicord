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
- **Coordinator job approval closes the Phase 3 gap.**
  `POST /api/coordinator/jobs/[id]/approve` (`PENDING_APPROVAL` -> `OPEN`)
  and `.../reject` (`PENDING_APPROVAL` -> `CANCELLED`, with an optional
  reason stored in `coordinatorNotes`) are the two actions that were
  missing. `reject` is deliberately narrower than the state machine alone
  allows — `CANCELLED` is reachable from most non-terminal statuses, but
  "reject" specifically means declining a pending submission, not
  cancelling a live job; that broader coordinator override isn't built yet.
- **Worker/employer verification is a flat approve/reject action**
  (`POST /api/coordinator/{workers,employers}/[id]/verify`), not a queue
  with its own workflow — `verificationStatus` still doesn't gate anything
  else in the system yet (an unverified worker can apply, an unverified
  employer's jobs can still be approved). It's informational until a real
  reason emerges to enforce it.
- **Assignment/selection is deliberately not in Phase 4.** The blueprint
  lists "Assignment management" under the coordinator phase, but selecting
  applicants into confirmed assignments is really the start of the
  Application -> Assignment state-machine work (blueprint §12–14), which
  belongs with the rest of the staffing lifecycle in Phase 5, not bolted
  onto the dashboard phase.
- **Selection is two steps, not one: SELECTED then CONFIRMED.** A
  coordinator selecting an applicant (`POST /api/coordinator/applications/
  [id]/select`) only notifies the worker and waits — it does not create an
  Assignment. That only happens when the worker themselves confirms
  (`POST /api/worker/applications/[id]/confirm`), which is also the one
  place an Assignment + Attendance row get created. This mirrors the
  blueprint's worker journey (§29: "Get selected -> Confirm assignment") and
  keeps "applied" from ever silently becoming "assigned" (§12).
- **A direct replacement offer reuses the exact same mechanism as a normal
  selection.** `POST /api/coordinator/jobs/[id]/offer` just creates an
  Application straight at `SELECTED` (skipping `APPLIED`) for a worker who
  never applied, so every step downstream — confirm, decline, conflict
  checking, Assignment creation — is identical code to the normal path.
  Suggestions are ranked using the matching engine
  (`src/server/matching/build-candidate.ts` assembles real eligibility/score
  input from the DB) against every active worker not already involved with
  the job, not just other applicants — matching the blueprint's intent that
  replacement search the wider pool (§14).
- **Overlapping assignments are hard-blocked, not just soft-suggested.**
  `hasSchedulingConflict()` (interval overlap against every other CONFIRMED
  assignment) runs at both selection (soft — coordinator gets a warning) and
  confirmation (hard — the worker's own confirm is rejected even if they
  hold two simultaneous SELECTED offers), directly enforcing blueprint §28:
  "a worker cannot be assigned to overlapping jobs."
- **Attendance marking and job completion are split on purpose.**
  `POST /api/coordinator/assignments/[id]/attendance` only records the raw
  PRESENT/LATE/ABSENT fact — it never touches Application/Assignment status.
  All of that finalization (→ `COMPLETED`/`NO_SHOW` on both records, which is
  what work history will read from in Phase 6) happens exactly once, in
  `POST /api/coordinator/jobs/[id]/complete`, based on whatever the final
  attendance value turns out to be. One place decides "is this worker done",
  not two independently.
- **Found and fixed via real end-to-end testing, not by inspection:** the
  Phase 1 job state graph only let headcount move forward
  (`OPEN → PARTIALLY_FILLED → FULL`) and only let `FULL` reach
  `CONFIRMATION`. Two real gaps this missed: (1) if every confirmed worker
  cancels, a `PARTIALLY_FILLED`/`FULL`/`CONFIRMATION` job had nowhere legal
  to go even though it legitimately has zero confirmed workers again: fixed
  by making `OPEN`/`PARTIALLY_FILLED`/`FULL` mutually reachable. (2) "Start
  job" only worked from `FULL`, even though running short-staffed from
  `PARTIALLY_FILLED` is a legitimate coordinator call per §4 ("the
  coordinator must retain manual override/control"): fixed by making
  `CONFIRMATION` reachable from any headcount status. Both are covered by
  new tests in `state-machine.test.ts`.
- **Known gap, deferred:** there's no general "coordinator cancels a live
  job" action — only `PENDING_APPROVAL` jobs can be rejected by the
  coordinator; an employer can cancel their own `OPEN`+ job, but a
  coordinator overriding *someone else's* live job has no endpoint yet.
  Left for Phase 7 hardening unless a real need surfaces sooner.
- **Worker NIC is the real duplicate-registration guard, not the phone
  number.** `WorkerProfile.nic` is required and unique at the DB level
  (`src/lib/nic.ts` validates both the old 9-digit+V/X and new 12-digit Sri
  Lankan formats). Phone numbers are how a worker logs in, but they're
  cheap to acquire multiples of; NIC is what actually stops one person
  registering several times under different numbers to appear as several
  workers — verified end-to-end by trying to save the same NIC under two
  different phone-registered accounts and getting a 409. Surfaced on
  `/coordinator/workers` so the coordinator can cross-check it during
  verification. This required a schema change after the pilot's worth of
  local dev data already existed (no NIC on existing rows) — handled by
  resetting the local dev database (explicit user consent required and
  given; Prisma's CLI itself refuses destructive commands from an AI agent
  without it) rather than a backfill migration, since there's no real user
  data yet to preserve.
- **A Payment row is only created for a "successful hire"** (blueprint
  §18): job completion (`POST /api/coordinator/jobs/[id]/complete`) creates
  one per assignment that ends up `COMPLETED` (attended), never for a
  `NO_SHOW` — the platform doesn't charge a fee for a worker who didn't
  show up. `platformFeeAmount` is a snapshot of `PLATFORM_FEE_PER_WORKER`
  at completion time (`src/lib/config.ts`), not a live reference, so past
  records don't shift if the configured rate changes later.
- **Payment tracking is a flat two-party PENDING→PAID toggle**
  (`/coordinator/payments`, `POST .../mark-{employer,worker}-paid`) — no
  payment gateway, matching blueprint §18's explicit v0.1 scope. The
  `DISPUTED` status exists in the schema for later but has no UI yet.
- **Work history stays derived, never stored** (the Phase 1 decision holds):
  `src/server/workers/history.ts` is the one place that turns
  `Assignment`/`Attendance`/`Payment` rows into a summary (completed count,
  attendance rate, category breakdown, earned vs. paid-out), used by both
  the worker's own dashboard and available for a future coordinator "view
  worker" screen — so the two never present different numbers for the same
  underlying data.
- **Reports (`/coordinator/reports`) lead with blueprint §31's stated most
  important early metric** — jobs completed vs. total — before any
  reliability or revenue numbers. "Jobs fully staffed" isn't shown as its
  own metric: there's no snapshot of headcount-at-shift-start to measure
  against, so it would either be misleading or need new tracking; deferred
  rather than approximated into something that looks more precise than it
  is.
- **Page-level auth guards, not just the proxy.** Every `/coordinator`,
  `/worker`, and `/employer` route now has a `layout.tsx` that calls
  `requirePageRole()` (`src/server/auth/page-guard.ts`) before rendering
  anything. This was a real gap: those pages previously rendered their data
  — including worker NIC and phone numbers on `/coordinator/workers` —
  relying entirely on `src/proxy.ts`, which its own comment already called
  "a UX convenience, not the authorization boundary." Found by a dedicated
  security-review pass, not by inspection during normal development.
- **`accountStatus` is now actually enforced.** Both `requireRole()` (API
  routes) and `requirePageRole()` (pages) re-check the user's current
  `accountStatus` against the DB on every call, not just the JWT claim.
  Session cookies live 30 days with no revocation list, so without this,
  suspending or banning a user would have done nothing until their existing
  cookie happened to expire. Verified by suspending a live session's user
  mid-session and confirming immediate rejection on both a page and an API
  call. This adds one `User` lookup per authenticated request — the right
  tradeoff for a pilot; if latency ever matters more than instant
  revocation, the next step would be a short-TTL cache or a session-version
  claim, not reverting to trusting the JWT alone.
- **OTP request is now rate-limited** (`src/server/auth/rate-limit.ts`,
  in-memory fixed window: 5/phone and 20/IP per 15 minutes) — closes both
  an SMS-cost abuse vector and a way to keep resetting the 5-attempt
  lockout on the verify side by just requesting a fresh code. **Known
  limitation, stated plainly in the code**: in-memory counters don't work
  correctly on serverless (Vercel) where each invocation can be a fresh
  instance — fine for this pilot's likely single-process deployment, but a
  real production rollout needs a shared store (e.g. Upstash Redis).
- Smaller hardening items from the same review, all fixed: JWT verification
  now pins `algorithms: ["HS256"]` explicitly rather than trusting whatever
  the key type allows; `AUTH_SECRET` throws on startup if it's still the
  `.env.example` placeholder in production; `/api/jobs` query params are
  now zod-validated instead of being passed straight to Prisma (a bad
  `category`/`date` used to 500, now cleanly 400s); job completion moved
  its assignment read inside the transaction and made the status update
  conditional (`updateMany` guarded on `status: "CONFIRMED"`, skip on zero
  rows) to close a real race where a worker cancelling mid-completion could
  have gotten paid for a cancelled assignment.
- **Audit log finally has a viewer** (`/coordinator/audit-log`) — every
  phase since Phase 1 has been writing `AuditLog` rows, but there was no
  way to actually look at them until now. Shows the most recent 100 events;
  no pagination or filtering yet.
- Added `error.tsx` and `not-found.tsx` (App Router convention) so an
  unhandled exception or a bad URL shows a plain, non-technical message
  instead of a stack trace or Next's default error page, plus baseline
  security headers (`X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) in
  `next.config.ts`.

## Backups & deployment

Not yet done — this is guidance for whenever deployment actually happens,
not something this session did unilaterally (standing up real hosted
infrastructure needs your go-ahead).

- **Hosting plan** (decided at project start): Vercel for the app, a
  managed Postgres for the database. Neon or Supabase both work with
  Prisma; Neon's branching feature is convenient for a staging copy of the
  pilot data.
- **Before deploying**: generate a real `AUTH_SECRET` (`openssl rand -base64
  32`) — the placeholder now hard-fails in production rather than silently
  working. Set `SMS_PROVIDER` to a real provider once one is contracted;
  until then OTP codes only reach the server console, which obviously
  doesn't work for real users off your own machine.
- **Migrations in production**: use `prisma migrate deploy` (non-interactive,
  applies pending migrations) as a release step — never `migrate dev` or
  `migrate reset` against a database with real user data.
- **Backups**: Neon and Supabase both provide automatic point-in-time
  recovery on their paid tiers — check which tier the pilot actually runs
  on, since free tiers often have much shorter retention. If self-hosting
  Postgres instead, a nightly `pg_dump` to object storage (S3-compatible)
  is the minimum viable setup; this repo doesn't include that automation
  since it depends on where the database ends up living.
- **Rate limiting caveat**: the in-memory OTP rate limiter (above) needs a
  shared store before this runs on genuinely serverless infrastructure with
  multiple concurrent instances — check this before relying on it under
  real load.

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
- [x] **Phase 4** — coordinator dashboard expanded with pending-approval
      count, active jobs, pending applications, and today's jobs; job
      approve/reject actions; worker and employer verification with
      filterable lists (`/coordinator/workers`, `/coordinator/employers`).
      Selecting workers into assignments is deferred to Phase 5.
- [x] **Phase 5** — core staffing lifecycle: coordinator selection
      (`/coordinator/jobs/[id]`) and worker confirm/decline, replacement
      offers backed by the matching engine, hard scheduling-conflict
      checks, worker/coordinator assignment cancellation with headcount
      resync, attendance marking, and job start/complete with attendance-
      based Application/Assignment finalization.
- [x] **Phase 6** — Payment records auto-created on job completion for
      each successfully attended assignment (never for a no-show), a flat
      PENDING→PAID toggle for both employer and worker sides
      (`/coordinator/payments`), a derived work-history summary on the
      worker dashboard, and a coordinator reports page
      (`/coordinator/reports`) leading with jobs-completed/total.
- [x] **Phase 7** — pilot hardening: page-level auth guards, `accountStatus`
      revocation, OTP rate limiting, JWT/secret hardening, input validation,
      a completion-time race fix, global error/not-found pages, security
      headers, and an audit-log viewer. See "Security & hardening" and
      "Backups & deployment" below for what shipped and what's still
      manual/deferred.
