# MVP API Contracts

Status: draft — for review before implementation. Pairs with
[`data-model.md`](./data-model.md).

Base path: `/api/v1`. JSON over REST. Auth via `Authorization: Bearer
<accessToken>` except where noted public. Errors use a consistent shape:

```json
{ "error": { "code": "OFFER_SOLD_OUT", "message": "This offer is sold out for today.", "details": {} } }
```

`code` is a stable machine-readable string the mobile client can switch on
(e.g. to show a specific "sold out" UI vs a generic error state) — never make
the client parse `message` to decide behavior.

> **Wire format note:** fields are camelCase, not snake_case — both the backend and the Expo/React Native client are TypeScript, so there's no value in a translation layer between two ends of the same language. (An earlier draft of this doc used snake_case; this revision corrects it before any client code depends on the shape.)

## Auth (public)

Phone + OTP only for MVP (confirmed) — no email/social login.

```
POST /auth/otp/request
  body: { phoneNumber: string }
  204 on success
  429 if rate-limited (this endpoint is the classic OTP-spam abuse vector —
      rate limit per phoneNumber AND per source IP from day one, not later)
  502 { error.code: "OTP_SEND_FAILED" } — the SMS provider failed to
      deliver (only reachable when OTP_SENDER=twilio; the dev-only console
      sender can't fail this way). Surfaced as a real error rather than a
      204 for a code that will never arrive.

POST /auth/otp/verify
  body: { phoneNumber: string, code: string }
  200: { accessToken, refreshToken, user: UserDTO }
  401 on wrong/expired code

POST /auth/token/refresh
  body: { refreshToken: string }
  200: { accessToken, refreshToken }
  refresh tokens are rotated (old one invalidated on use) and revocable
  server-side — a stolen refresh token can be killed without waiting for
  natural expiry

POST /auth/logout
  body: { refreshToken: string }
  204 — revokes that refresh token
```

## Users

```
GET /me
  200: {
    ...UserDTO,
    stats: { totalSavedPaise: number, offersRedeemed: number, restaurantsVisited: number }
  }
  stats computed via aggregate query over Claim (see data-model.md) —
  not stored/denormalized in MVP, recomputed on read

PATCH /me
  body: { name?, avatarUrl? }
  200: UserDTO
```

## Discovery (customer-facing)

Location strategy: **no GPS permission requested in MVP** (confirmed) — city
is a fixed app constant for the single-city launch. `city` param exists in
these contracts now so adding city #2 later is a data change, not an API
break.

```
GET /home-feed?city={city}
  public (works logged-out, matches the design showing offers before login)
  200: {
    categories: [{ key: "biryani", label: "Biryani", iconEmoji: "🍚" }, ...],
    sections: [
      {
        key: "highestOffer" | "openNearYou" | "topPicks",
        title: string,
        restaurants: RestaurantCardDTO[]
      }
    ]
  }
  Section membership/ordering is admin-controlled (a `featuredRank` per
  restaurant per section, set when the founder onboards it) rather than a
  ranking algorithm — matches the hand-curated MVP approach; this is the
  seam where a real ranking model gets slotted in later without an API
  change.

GET /restaurants?city={city}&category={key}&search={q}&cursor={cursor}
  public, paginated (cursor-based, not offset — offer lists change
  frequently enough that page-drift from offset pagination would be visible)
  200: { items: RestaurantCardDTO[], nextCursor: string | null }

GET /restaurants/{id}
  public
  200: RestaurantDetailDTO (see below)
  404 if not found or not `active`

POST /restaurants/{id}/favorite      -> 204   (auth required)
DELETE /restaurants/{id}/favorite    -> 204   (auth required)
GET /favorites                        -> RestaurantCardDTO[]   (auth required)
```

### `RestaurantCardDTO` (list/feed contexts)
```ts
{
  id: string;
  name: string;
  coverImageUrl: string;
  cuisines: string[];
  priceTier: 1 | 2 | 3 | 4;
  ratingAvg: number;
  ratingCount: number;
  distanceKm: number;       // computed server-side from the fixed city center or user's saved address, never trust a client-supplied distance
  isFavorited: boolean;     // false for logged-out requests
  bestActiveOffer: {
    discountPercentage: number;
    conditionLabel: string;  // pre-rendered "Arrive before 9pm" / "Anytime today" / "4:00pm – 9:00pm" — computed server-side from start/end time vs now, so the client never reimplements offer-window-to-copy logic
    seatsLeft: number | null;
  } | null;
}
```

### `RestaurantDetailDTO`
```ts
{
  ...RestaurantCardDTO fields except bestActiveOffer,
  description: string;
  addressLine: string;
  isOpen: boolean;
  closesAtLabel: string;      // "Closes at 10:00pm"
  galleryUrls: string[];
  activeOffers: OfferCardDTO[];      // today's currently-valid occurrences
  pastOffersToday: OfferCardDTO[];  // "here's what you missed" — today's already-expired occurrences
}
```

### `OfferCardDTO`
```ts
{
  offerAvailabilityId: string;
  discountPercentage: number;
  conditionLabel: string;
  minSpendPaise: number | null;
  seatsLeft: number;
  status: "active" | "exhausted" | "expired";
}
```

`conditionLabel` and `isOpen`/`closesAtLabel` are computed server-side
from `Restaurant.timezone` and `Offer.startTime/endTime` — the client only
renders strings it's given, per the "backend is sole source of truth for
offer validity" rule. This also means changing that copy logic later never
requires a mobile app release.

## Offers / Claims (a.k.a. Bookings)

```
POST /offer-availabilities/{id}/claim
  auth required
  200: ClaimDTO
  409 { error.code: "OFFER_SOLD_OUT" }        — capacity exhausted (see atomic
                                                 UPDATE in data-model.md)
  409 { error.code: "OFFER_NOT_ACTIVE" }      — window has already ended
  200 body is the newly created Claim; no separate "confirm" step server-side
  — the mobile app is expected to show its own confirmation screen (terms,
  min spend) before calling this endpoint, since re-prompting after the
  server has already committed the claim would be confusing

GET /claims?status={claimed|redeemed|expired|cancelled}
  auth required — powers the Bookings tab and Profile > My Bookings/My Offers
  200: ClaimDTO[]

GET /claims/{id}
  auth required, must belong to caller
  200: ClaimDTO       — the redemption-code screen

POST /claims/{id}/cancel
  auth required, must belong to caller, only while status = claimed
  204 — releases capacity: decrements the OfferAvailability.capacityClaimed
  counter in the same transaction as the status change
```

### `ClaimDTO`
```ts
{
  id: string;
  restaurant: { id: string, name: string, coverImageUrl: string };
  redemptionCode: string;
  discountPercentage: number;
  minSpendPaise: number | null;
  status: "claimed" | "redeemed" | "expired" | "cancelled";
  claimedAt: string;   // ISO 8601, UTC
  expiresAt: string;
}
```

## Restaurant-owner endpoints (role: restaurant_owner)

Scoped to the caller's own restaurant only — every handler must verify
`restaurant.ownerUserId === caller.id`, never trust a restaurantId in the
URL alone for an owner-role token.

```
GET   /restaurant-owner/restaurant
PATCH /restaurant-owner/restaurant        body: profile/hours/gallery fields

GET   /restaurant-owner/offers
POST  /restaurant-owner/offers            body: OfferConfigDTO -> creates rule
PATCH /restaurant-owner/offers/{id}       body: partial OfferConfigDTO, or { status: "paused" }

GET   /restaurant-owner/offers/{offerId}/claims?date={date}
  200: ClaimDTO[]  — who claimed today's occurrence, for the restaurant to
  reconcile against walk-ins

POST  /restaurant-owner/claims/redeem
  body: { code: string }
  200: ClaimDTO       — marks status=redeemed, sets redeemedAt
  404 if no claim matches that code for this restaurant
  409 { error.code: "CLAIM_ALREADY_PROCESSED" }  — already redeemed/cancelled/expired
  Looked up by code, not by a claimId in the path — staff only ever has the
  code the customer shows them, never a claim's internal id. (An earlier
  draft of this doc had claimId in the path; corrected to match the actual
  flow before any client code depended on it.) Returns the full ClaimDTO
  rather than 204 so the staff-facing screen can confirm what was redeemed
  (discount %, customer) before moving on.
```

### `OfferConfigDTO`
```ts
{
  discountPercentage: number;   // 1-100
  daysOfWeek: number[];        // ISO weekday numbers, 1=Mon..7=Sun
  startTime: string;            // "HH:mm", restaurant-local
  endTime: string;
  minSpendPaise: number | null;
  capacityPerDay: number;
  status: "active" | "paused";
}
```

## Admin

No admin API/UI in MVP. Restaurant + owner-user creation for the
hand-curated launch happens via a direct seed script against the database,
not a built endpoint — building an admin panel now would be scope the
confirmed MVP philosophy explicitly doesn't need yet. Revisit once
onboarding volume makes a script impractical.
