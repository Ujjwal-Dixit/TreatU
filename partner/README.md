# TreatU Partner

The restaurant-side app: owners log in, post offers (discount, time window,
minimum bill, today-only or a date range), watch today's claims, and redeem
the codes customers show at the table. Same backend as the customer app —
everything here goes through `/api/v1/restaurant-owner/*` (see
`docs/architecture/api-contracts.md`).

## Run it

```bash
cp .env.example .env     # only needed for a physical device / Android emulator
npm install
npm run ios              # Metro on port 8082, so it runs alongside the customer app (8081)
```

The backend must be running (`cd ../backend && npm run start:dev`).

Log in with **+919800000001** — the seeded owner of *Mowgli Street Food*. The
OTP is printed in the backend terminal. Any number that isn't a
`restaurant_owner` is turned away at login; partner accounts are created by
us at onboarding (see `backend/prisma/seed.ts`), there is no self-signup.

## End-to-end check

1. Partner app → **Create New Offer** → Today Only, a window that includes now.
2. Customer app (logged in as +919800000000) → open Mowgli Street Food → the
   offer is listed → **Redeem** → note the 6-character code.
3. Partner app → Home → **Customers Today** → enter the code → **Redeem**.
4. Customer app → Bookings → the booking now shows as redeemed.

## Known gaps

- "Continue with Google", "Sign up", notifications, the outlet switcher and
  restaurant-details editing are placeholders that explain they're not built.
- Re-running `npm run prisma:seed` deletes offers on the demo restaurants that
  the seed didn't create, unless they already have claims.
- Shared code (HTTP client, token store) is copied from the customer app,
  not shared — promote to a package if the two drift.
