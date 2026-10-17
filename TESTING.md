# Tester builds

Two apps, one backend:

| | Customer app | Partner app |
|---|---|---|
| Folder | repo root | `partner/` |
| App ID (Android + iOS) | `com.treatu.app` | `com.treatu.partner` |
| Demo login | +91 98000 00000 | +91 98000 00001 (owner of Mowgli Street Food) |

Testers log in with the fixed OTP the test backend is configured with
(`OTP_TEST_CODE`) — no SMS is sent. Only numbers listed in
`OTP_TEST_NUMBERS` can log in that way; to add a tester, add their number
there and restart the backend. Partner logins also need a `restaurant_owner`
account (created by the seed, not by signing up).

## One-time setup

1. **Test backend** — deploy `backend/` (see *Deploying a test server* in
   `backend/README.md`) and seed it.
2. **Point the apps at it** — in both `eas.json` files, replace
   `https://REPLACE-WITH-TEST-BACKEND/api/v1` with the real URL (keep the
   `/api/v1`). `EXPO_PUBLIC_` values are compiled into the app: changing
   the URL means a new build.
3. **Expo account** — `npm install -g eas-cli`, `eas login`, then run
   `eas init` once in the repo root and once in `partner/` (writes each
   app's project ID into its `app.json` — commit that).

## Android: APK to share directly

```bash
eas build -p android --profile preview          # in the repo root
cd partner && eas build -p android --profile preview
```

Each build ends with a link and QR code. Testers open it on their phone and
install (Android will ask them to allow installs from that source).

## iOS: TestFlight

Needs an Apple Developer account. `preview` on iOS would be an ad-hoc build
installable only on devices registered beforehand, so use TestFlight:

```bash
eas build -p ios --profile production
eas submit -p ios --latest
```

Then add testers in App Store Connect → TestFlight. Do the same in `partner/`.

## Later: Play Store internal testing

`eas build -p android --profile production` produces the `.aab` for the Play
Console's internal-testing track (needs a Play developer account; the first
upload to a new app is done by hand in the Play Console).
