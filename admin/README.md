# TreatU Admin

Web dashboard for admins: user and booking totals, and adding/removing
restaurants. Talks to the same backend as the apps (`/api/v1/admin/*`).

## Run locally

```bash
cp .env.example .env      # point VITE_API_URL at your backend
npm install
npm run dev
```

## Who can log in

Only numbers listed in the backend's `ADMIN_PHONE_NUMBERS`. They log in with
an OTP like everyone else; on a test server the number must also be in
`OTP_TEST_NUMBERS` so it gets the fixed `OTP_TEST_CODE`.

## Deploy (Vercel)

1. New project → import this repo → **Root directory** `admin`
   (Vercel detects Vite: build `npm run build`, output `dist`).
2. Environment variables: `VITE_API_URL` = `https://<backend>/api/v1`,
   and `VITE_ENV_LABEL` (`Demo data` on the test server, empty in
   production). They are baked in at build time; redeploy after changing.

## What removing a restaurant does

It's a soft delete: the restaurant disappears from the customer app, its
offers are archived, its owner is unlinked (they lose it in TreatU
Partner), and past bookings stay in customers' history.
