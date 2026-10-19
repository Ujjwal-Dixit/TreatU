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
  not stored/denormalized in MVP, recomputed on read. totalSavedPaise uses
  the bill staff recorded at redemption; where none was recorded it falls
  back to the offer's minimum spend (a floor, never an overstatement)

PATCH /me
  body: { name?, avatarUrl? }
  200: UserDTO
```

## Discovery (customer-facing)

Location strategy: the city is a fixed app constant for the single-city
launch. The app asks for foreground location on Home (for the out-of-area
banner) and, when granted, sends coarse `lat`/`lng` (2 decimals, ~1 km) on
the discovery endpoints below and on `GET /claims/{id}` so `distanceKm` is
measured from the customer. Omitted, or more than 50 km from the city
centre (browsing from another city), distances fall back to the city
centre. Nothing is stored. (Revises the original "no GPS in MVP" decision.)
`city` param exists in these contracts now so adding city #2 later is a
data change, not an API break.

```
GET /home-feed?city={city}&lat={lat}&lng={lng}
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

GET /restaurants?city={city}&category={key}&search={q}&cursor={cursor}&lat={lat}&lng={lng}
  public, paginated (cursor-based, not offset — offer lists change
  frequently enough that page-drift from offset pagination would be visible)
  200: { items: RestaurantCardDTO[], nextCursor: string | null }

GET /restaurants/{id}
  public
  200: RestaurantDetailDTO (see below)
  404 if not found or not `active`

POST /restaurants/{id}/favorite      -> 204   (auth required)
DELETE /restaurants/{id}/favorite    -> 204   (auth required)
GET /favorites?lat={lat}&lng={lng}   -> RestaurantCardDTO[]   (auth required)
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
  distanceKm: number;       // computed server-side from the customer's lat/lng (if sent and in-city) or the city centre — the client sends a position, never a distance
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
  activeOffers: OfferCardDTO[];      // today's in-window occurrences: claimable ones first, then sold-out ones (status "exhausted", seatsLeft 0) so a deal doesn't vanish when it fills up
  pastOffersToday: OfferCardDTO[];  // "here's what you missed" — today's already-expired occurrences
}
```

### `OfferCardDTO`
```ts
{
  offerAvailabilityId: string;
  discountPercentage: number;
  conditionLabel: string;
  description: string;        // owner-written, may be ""
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
  Claims are expired lazily: every read path first flips `claimed` claims
  past expiresAt to `expired` (no background job), so these lists are
  always accurate

GET /claims/{id}?lat={lat}&lng={lng}
  auth required, must belong to caller
  200: ClaimDTO       — the Dining Pass screen

POST /claims/{id}/cancel
  auth required, must belong to caller, only while status = claimed
  204 — releases capacity: decrements the OfferAvailability.capacityClaimed
  counter in the same transaction as the status change
```

### `ClaimDTO`
```ts
{
  id: string;
  restaurant: {
    id: string, name: string, coverImageUrl: string,
    cuisines: string[], addressLine: string,
    latitude: number, longitude: number,
    distanceKm: number          // same basis as RestaurantCardDTO
  };                            // everything the Dining Pass screen shows
  redemptionCode: string;
  discountPercentage: number;
  minSpendPaise: number | null;
  billAmountPaise: number | null;  // recorded by staff at redemption, if they did
  savedPaise: number | null;       // actual discount; null unless the bill was recorded
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
PATCH /restaurant-owner/restaurant        body: any of name, description (max 500), cuisines (1-6),
                                          priceTier, addressLine, operatingHours
  operatingHours replaces the whole week: one entry per open day, a missing
  day = closed. 400 INVALID_OPERATING_HOURS for a repeated day or
  closeTime <= openTime (overnight unsupported; "until midnight" = 23:59).
  Publishes offers.changed so customer apps refetch the restaurant.

GET   /restaurant-owner/dashboard
  200: { restaurant: { id, name, cuisines, coverImageUrl },
         customersToday: number,            — non-cancelled claims on today's occurrences
         activeOffers: OwnerOfferDTO[] }    — displayStatus === "active"

GET   /restaurant-owner/offers            200: OwnerOfferDTO[]  (archived excluded)
GET   /restaurant-owner/offers/{id}       200: OwnerOfferDTO
POST  /restaurant-owner/offers            body: OfferConfigDTO -> 200: OwnerOfferDTO
PATCH /restaurant-owner/offers/{id}       body: any subset of OfferConfigDTO, plus
                                          status: "active" | "paused" | "archived"
  400 INVALID_OFFER_WINDOW  — endTime <= startTime (overnight windows unsupported)
  400 OFFER_WINDOW_PASSED   — "today" offer whose endTime has already passed
  400 INVALID_DATE_RANGE    — endDate < startDate, or range entirely in the past

GET   /restaurant-owner/claims/today
  200: OwnerClaimDTO[]  — ClaimDTO + customer: { name, phoneLast4 }; today's
  occurrences only, in the restaurant's timezone (partner app "Customers Today")

GET   /restaurant-owner/offers/{offerId}/claims?date={date}
  200: ClaimDTO[]  — who claimed today's occurrence, for the restaurant to
  reconcile against walk-ins

POST  /restaurant-owner/claims/redeem
  body: { code: string, billAmountPaise?: number }
  200: ClaimDTO       — marks status=redeemed, sets redeemedAt (and the bill,
                        if given — powers the customer's real savings)
  404 if no claim matches that code for this restaurant
  409 { error.code: "CLAIM_ALREADY_PROCESSED" }  — already redeemed/cancelled/expired
  409 { error.code: "CLAIM_EXPIRED" }  — offer window ended; also flips the
      claim to status=expired
  409 { error.code: "BILL_BELOW_MINIMUM", details: { minSpendPaise } } —
      billAmountPaise given and below the offer's minimum; not redeemed
  Conditional update: two staff phones redeeming the same code at once —
      exactly one succeeds
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
  startTime: string;            // "HH:mm", restaurant-local
  endTime: string;              // must be after startTime
  minSpendPaise?: number | null;
  capacityPerDay?: number;      // 1-500, default 20. On PATCH also updates today's and
                                // future occurrences (never below seats already claimed)
  description?: string;         // max 100
  availability: "today" | "dateRange" | "weekly";
  startDate?: string;           // "YYYY-MM-DD", required for dateRange
  endDate?: string;             // "YYYY-MM-DD", required for dateRange
  daysOfWeek?: number[];        // ISO 1=Mon..7=Sun, required for weekly
  status?: "active" | "paused";
}
```
"today" is resolved to the restaurant-local date server-side; the client
never sends it as a date.

### `OwnerOfferDTO`
```ts
{
  id: string;
  discountPercentage: number;
  startTime: string; endTime: string;
  timeLabel: string;            // "4:00 PM - 8:00 PM"
  minSpendPaise: number | null;
  capacityPerDay: number;
  description: string;
  availability: "today" | "dateRange" | "weekly";
  availabilityLabel: string;    // "Today Only" / "20 Oct – 25 Oct" / "Every day"
  startDate: string | null; endDate: string | null;
  daysOfWeek: number[];
  status: "active" | "paused" | "archived";
  displayStatus: "active" | "scheduled" | "paused" | "ended";  // derived from status + dates + now
  today: { claimed: number; total: number } | null;            // null = doesn't run today
}
```

## Realtime

```
GET /events          Server-Sent Events (text/event-stream), optional Bearer token
```

Events are change *signals*, not data — clients respond by refetching the
REST resources above, so authorization stays in one place and a missed
event costs one stale screen, never inconsistent data.

| event | data | delivered to |
|---|---|---|
| `offers.changed` | `{ restaurantId }` | everyone (incl. logged out) — offer created/edited/paused/ended, today's seat count moved, or the restaurant's details/hours changed |
| `claim.changed` | `{ claimId, restaurantId }` | the customer who owns the claim, and that restaurant's owner — claimed, cancelled, redeemed, expired |

A `: ping` comment is sent every 25s to keep proxies from closing the
connection. The token is checked once at connect; clients reconnect when
their token changes and refetch everything after any reconnect (events
aren't replayed). Single-instance pub/sub for now — see
`backend/src/realtime/realtime.service.ts` for the multi-instance path.

## Admin

No admin API/UI in MVP. Restaurant + owner-user creation for the
hand-curated launch happens via a direct seed script against the database,
not a built endpoint — building an admin panel now would be scope the
confirmed MVP philosophy explicitly doesn't need yet. Revisit once
onboarding volume makes a script impractical.
