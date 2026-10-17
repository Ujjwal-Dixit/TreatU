# Backend

NestJS modular monolith implementing [`/docs/architecture/data-model.md`](../docs/architecture/data-model.md)
and [`/docs/architecture/api-contracts.md`](../docs/architecture/api-contracts.md).
Read those first — this file is setup mechanics, not design rationale.

## Stack

Node/TypeScript, NestJS, PostgreSQL via Prisma, JWT auth (phone + OTP only
for MVP), Zod for env/JSON validation.

**Prisma is pinned to 6.19.3, not the newly-released 7.x** that `npm install`
would otherwise grab. Prisma 7 removed `datasource.url` from `schema.prisma`
in favor of a `prisma.config.ts` + driver-adapter pattern — a significant,
very recent breaking change to how the ORM is configured. For a project
meant to be production-grade, riding a major version that just shipped is
the wrong trade: 6.x is the proven, extensively-documented line. Revisit
once 7.x has had time to settle and the ecosystem (docs, Stack Overflow,
NestJS integration guides) has caught up.

## First-time setup

```bash
cp .env.example .env
# edit .env: at minimum set real JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
# (openssl rand -base64 48)

npm install
npm run db:up              # starts Postgres via docker-compose
npm run prisma:migrate     # creates the DB schema (prompts for a migration name first run)
npm run prisma:seed        # loads the 12-restaurant demo dataset (see below)
npm run start:dev
```

Health check: `GET http://localhost:3000/health` (unversioned, outside
`/api/v1` — see main.ts). Everything else is under `/api/v1`, matching
api-contracts.md.

The migration and seed have since been run end to end against a live local
Postgres, and the home-feed / restaurant-detail / claims / favourites /
`/me` endpoints verified against the seeded data. Note that `db:up` assumes
Docker; a Homebrew `postgresql@16` on port 5432 works identically and is
what this has actually been run against.

## Demo data

`npm run prisma:seed` loads 12 invented Mumbai restaurants (36 offers, 4
favourites, 6 claims) defined in [`prisma/demo-data.ts`](prisma/demo-data.ts).
They exist so the app can be navigated end to end before any real restaurant
is onboarded — and the shape of that file is effectively the onboarding form,
since every field in it is one the app renders.

The seed is idempotent and rewrites the demo rows on every run, so it doubles
as "reset the demo to a known state".

Log in as **+919800000000** to get the populated Bookings / Favourites /
Profile screens (2 active claims, 3 redeemed, 1 expired, ₹665 "saved"). The
OTP is printed to the backend console, not sent by SMS — see below.
**+919800000001** is a restaurant_owner account linked to the first
restaurant, for the owner-only endpoints.

Two deliberate compromises, both flagged in demo-data.ts:

- **Every restaurant has a 00:00–23:59 offer band.** Offers are only active
  while the wall clock is inside their window, so without it a demo run
  outside trading hours shows cards with no discount badge at all. The two
  narrower bands per restaurant (typically 40–50% off) are the realistic
  ones, and they are what make the badge change through the day and populate
  "Here's what you missed".
- **Operating hours stay realistic** rather than matching that 24h band, so
  the detail screen exercises both Open and Closed. The visible side effect
  is that late at night a restaurant reads "Closed" while still showing a
  claimable deal. Narrow `offers[0]` to the real trading window per
  restaurant at onboarding.

Photos are Unsplash CDN URLs (free license, hotlinking permitted) standing in
for real restaurant photography. They are remote URLs, so the demo needs
network access to render images.

## OTP delivery is mocked

`ConsoleOtpSender` (`src/auth/otp/console-otp-sender.ts`) logs the OTP code
instead of sending a real SMS — there's no SMS gateway account to wire up
yet, and that's a real cost/vendor decision (MSG91, Twilio, etc.) rather
than something to fake silently. It refuses to run when `NODE_ENV=production`
as a guardrail against shipping the mock. Swap the `OTP_SENDER` provider in
`auth.module.ts` for a real implementation before anyone but you tries to
log in.

**Test servers:** set `OTP_TEST_NUMBERS` (comma-separated E.164) and
`OTP_TEST_CODE` and those numbers log in with that fixed code, no SMS. This
is how testers sign in to a hosted test backend, where nobody can read the
console sender's output. Env validation refuses it when
`NODE_ENV=production`. Add a tester = add their number and restart.

## Deploying a test server

Any Node host with managed Postgres works (Render, Railway, Fly). Settings:

| setting | value |
|---|---|
| Root directory | `backend` |
| Build command | `npm ci && npx prisma generate && npm run build` |
| Start command | `npm run start:deploy` (applies pending migrations, then starts) |
| Health check path | `/health` |

Environment variables (see `.env.example`):

| variable | test-server value |
|---|---|
| `NODE_ENV` | `staging` — *not* `production`, which (correctly) refuses the test OTP numbers and the console sender |
| `DATABASE_URL` | the host's Postgres connection string |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | two different values from `openssl rand -base64 48` |
| `OTP_TEST_NUMBERS` | `+919800000000,+919800000001` plus any tester numbers |
| `OTP_TEST_CODE` | any 6 digits — share with testers |
| `TRUST_PROXY_HOPS` | `1` — the host's proxy; without it every tester shares one rate-limit bucket |

`PORT` is provided by the host. Load the demo data once, from your machine,
pointed at the hosted database's *external* connection string:

```bash
DATABASE_URL="<external connection string>" npm run prisma:seed
```

## Known gaps / things to revisit

- **Launch city is a placeholder.** `src/config/city.config.ts` hardcodes
  `Mumbai` with approximate center coordinates — confirm the real launch
  city (and its accurate center point, used for the displayed `distanceKm`)
  before onboarding real restaurants.
- **`npm audit` reports a high-severity advisory in `deepmerge-ts`**, pulled
  in transitively by `@prisma/config` (used by the Prisma CLI). This is a
  dev-tooling-only dependency — `@prisma/client` at runtime doesn't use it —
  and exploiting it would require attacker-controlled deeply-recursive input
  into local CLI config merging, which isn't a realistic path here. Fixing
  it via `npm audit fix --force` would downgrade to `prisma@6.12.0`, losing
  several months of real fixes for a non-exploitable-in-context issue, so
  it's being tracked rather than "fixed" — re-check when Prisma patches it
  upstream.
- **No admin API/UI**, on purpose — see data-model.md. Onboard real
  restaurants via `prisma/seed.ts` as a template, or write similar one-off
  scripts, until onboarding volume makes that impractical.
- **`RestaurantsService` list/feed building is N+1** (one offer-occurrence
  query per restaurant card) — acceptable at hand-curated, single-city
  restaurant counts; batch it if listing pages grow past a few dozen
  restaurants. Flagged inline in the code too.
- **Integration/e2e tests need a real database** (`PrismaService` connects
  on module init) — `npm run test:e2e` will fail until Postgres is running
  via `npm run db:up`. The DB-independent unit tests (pure business logic:
  offer condition-label copy, timezone conversion, haversine distance) run
  with plain `npm test` and don't need one.

## Scripts

| command | what |
|---|---|
| `npm run start:dev` | dev server, watch mode |
| `npm run build` / `start:prod` | production build/run (output is `dist/src/main.js` — `prisma/` is compiled too, which shifts the root) |
| `npm run start:deploy` | `prisma migrate deploy`, then `start:prod` — the hosted start command |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`--fix`) |
| `npm test` / `test:watch` / `test:cov` | unit tests |
| `npm run test:e2e` | integration tests — needs `db:up` first |
| `npm run db:up` / `db:down` | local Postgres via docker-compose |
| `npm run prisma:generate` | regenerate the Prisma client after a schema change |
| `npm run prisma:migrate` | create + apply a migration (`prisma migrate dev`) |
| `npm run prisma:seed` | run `prisma/seed.ts` |
