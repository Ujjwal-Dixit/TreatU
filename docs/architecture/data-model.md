# MVP Data Model

Status: draft — for review before implementation.

Scope: only entities required for the confirmed MVP (single city, hand-curated
restaurants, phone+OTP auth, no payments, no in-app reviews, no rewards/coins).
Deferred entities are listed at the bottom with the reason they're deferred.

## Design decisions this schema encodes

- **Offer = recurring rule, `OfferAvailability` = one calendar day's instance
  of that rule.** A restaurant's screenshot shows two time-slots active on the
  same day ("35% off anytime today" plus "here's what you missed: 40% off
  before 3pm"), and capacity ("3 left") resets daily. Mixing the rule
  definition and the daily remaining-capacity counter into one row would
  couple config changes to runtime state and lose the daily audit trail.
  Splitting them is the standard way to model recurring-event-with-per-
  occurrence-state, and it's what lets us answer "is this offer valid right
  now" and "how many are left today" as separate, testable queries.
- **`Claim` snapshots discount %, min spend, and capacity source at claim
  time.** If a restaurant edits an offer's discount tomorrow, today's already-
  claimed redemptions must not silently change value. This is the difference
  between a real audit trail and a system where support tickets can't be
  resolved because "what did the customer actually see" isn't reconstructable.
- **No `Region`/`City` table yet.** Single-city launch (confirmed) means the
  supported city is a hardcoded app constant, not admin-configurable data.
  Promote it to a real table when city #2 is actually being scoped — building
  it now would be speculative.
- **`rating_avg` / `rating_count` live directly on `Restaurant`, seeded
  manually by the founder at onboarding.** The design shows ratings on every
  screen, but an in-app review-writing system is V1 scope. This is an
  intentional MVP shortcut — flagging it explicitly per the "don't fake
  production-readiness silently" rule: these numbers are admin-entered, not
  computed from real in-app reviews, until the Review entity ships.
- **No `Payment` entity.** Confirmed MVP flow: customer pays the restaurant
  directly, in person. The platform's job ends at issuing a redemption code.
- **No analytics/event-log table yet.** The Profile stats (Total Saved,
  Offers Redeemed, Restaurants Visited) shown in the design are computed by
  aggregate queries directly against `Claim` — there's no behavioural data
  those numbers need that isn't already in that table. An append-only event
  log is worth adding when we need funnel/behavioural analytics beyond these
  three counters (V1), not before.

## Entities

### `User`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| phone_number | text, unique | E.164 format, the only auth identifier for MVP |
| role | enum(customer, restaurant_owner, admin) | single role per account; a restaurant owner account is created by admin, not self-registered |
| name | text | |
| avatar_url | text, nullable | |
| created_at | timestamptz | |
| last_login_at | timestamptz, nullable | |

### `Restaurant`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| owner_user_id | uuid fk -> User, nullable | null until the founder creates/links an owner login |
| name | text | |
| description | text | |
| cuisines | text[] | e.g. `{Indian,Cafe}` — tag list, used for category chip filtering |
| price_tier | smallint (1-4) | renders as ₹ / ₹₹ / ₹₹₹ / ₹₹₹₹ |
| address_line | text | |
| city | text | hardcoded single value for MVP (see above) |
| latitude, longitude | float, float | plain floats, not PostGIS `geography(Point)` — MVP has no GPS-radius search (confirmed), only city-scoped distance display computed via haversine in application code. Migrate to PostGIS + a spatial index when real "near me" radius search is built (multi-city / V1); revising this from the original draft, which specified a geography column pre-emptively |
| timezone | text | IANA zone, e.g. `Asia/Kolkata` — required even with one city/timezone today, per the "backend is source of truth for offer timing" rule; expensive to retrofit later, free to add now |
| operating_hours | jsonb | `[{ day_of_week, open_time, close_time }]` — drives "Open • Closes at 10:00pm" |
| cover_image_url | text | |
| gallery_urls | text[] | |
| rating_avg | numeric(2,1) | seeded manually — see flag above |
| rating_count | integer | seeded manually |
| status | enum(pending, active, paused, rejected) | hand-curated approval state, set by admin directly (no self-serve registration flow in MVP) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes: btree on `(city, status)` for feed queries.

### `RestaurantFeature`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| restaurant_id | uuid fk -> Restaurant | |
| section_key | text | `highestOffer` \| `openNearYou` \| `topPicks` — the GET /home-feed sections |
| rank | integer | display order within that section |

Unique on `(restaurant_id, section_key)`. This is the hand-curation
mechanism: the founder sets which restaurants appear in which home-feed
section and in what order at onboarding time, instead of a ranking
algorithm — see api-contracts.md GET /home-feed.

### Auth infrastructure: `RefreshToken`, `OtpRequest`

Not called out as product/business entities above, but real schema needed
to implement the auth rules from api-contracts.md:

| `RefreshToken` column | type | notes |
|---|---|---|
| id | uuid pk | embedded in the token string itself so a presented token can be looked up without a table scan |
| user_id | uuid fk -> User | |
| token_hash | text | hash of the full token string, never the raw token — see hash.util.ts |
| expires_at | timestamptz | |
| revoked_at | timestamptz, nullable | set on rotation (single-use) or explicit logout — lets a compromised token be killed without waiting for natural expiry |

| `OtpRequest` column | type | notes |
|---|---|---|
| id | uuid pk | |
| phone_number | text, indexed | |
| code_hash | text | |
| expires_at | timestamptz | |
| consumed_at | timestamptz, nullable | |
| attempts | integer | enforces a max-guess limit per sent code |

### `Offer` (the recurring rule)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| restaurant_id | uuid fk -> Restaurant | |
| discount_percentage | smallint (1-100) | |
| days_of_week | smallint[] | e.g. `{1,2,3,4,5}` (Mon-Fri), ISO 8601 weekday numbers |
| start_time | time | restaurant-local time, e.g. `15:00` |
| end_time | time | restaurant-local time, e.g. `17:00` |
| min_spend | integer, nullable | smallest currency unit (paise), avoids float rounding issues |
| capacity_per_day | integer | how many redemptions this rule allows per calendar occurrence; set by the partner app's "Seats per Day" field (default 20) |
| description | text, default '' | optional customer-facing copy, max 100 chars |
| valid_from, valid_until | date, nullable | restaurant-local inclusive bounds. Both null = standing weekly rule on `days_of_week`. Partner app "Today Only" sets both to today; "Date Range" sets each (with `days_of_week` = all 7) |
| status | enum(active, paused, archived) | restaurant-controlled pause/resume; `archived` = ended by the owner, kept for claim history |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Deferred fields (not in MVP, added when a real requirement forces it, not
speculatively): `max_party_size`, menu/category restriction, "reservation
required" flag.

### `OfferAvailability` (one calendar day's instance of an Offer)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| offer_id | uuid fk -> Offer | |
| date | date | the restaurant-local calendar date this occurrence covers |
| capacity_total | integer | copied from `Offer.capacity_per_day` at creation time — protects history if the rule is edited later. Exception: editing the offer's capacity also updates today's and future rows (never below `capacity_claimed`), so a mid-day change takes effect immediately; past days are untouched |
| capacity_claimed | integer, default 0 | incremented atomically on claim |
| status | enum(active, exhausted, expired) | server-derived: `exhausted` when claimed >= total, `expired` once end_time has passed for `date` |
| created_at | timestamptz | |

Unique constraint: `(offer_id, date)`. Rows are created lazily — the first
request that needs "today's occurrence" for a given offer upserts it — rather
than requiring a standing cron job for MVP.

### `Claim` (a customer's redemption of one offer occurrence)
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk -> User | |
| offer_availability_id | uuid fk -> OfferAvailability | |
| restaurant_id | uuid fk -> Restaurant | denormalized to avoid a join on every "my bookings" list query |
| redemption_code | text, unique | short code shown to restaurant staff |
| discount_percentage_snapshot | smallint | copied at claim time, see snapshot rationale above |
| min_spend_snapshot | integer, nullable | copied at claim time |
| status | enum(claimed, redeemed, expired, cancelled) | |
| claimed_at | timestamptz | |
| redeemed_at | timestamptz, nullable | |
| bill_amount_paise | integer, nullable | entered by staff at redemption (optional). The only real spend figure the platform ever sees — customers pay the restaurant directly. Drives "Total saved"; without it that falls back to `min_spend_snapshot` as a floor |
| expires_at | timestamptz | end of that day's offer window. Claims past this are flipped to `expired` lazily, on any read of them — there is no background job |

Indexes: `(user_id, status)` for the Bookings/Profile views; `(restaurant_id,
claimed_at)` for restaurant-side claim views.

### `Favorite`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk -> User | |
| restaurant_id | uuid fk -> Restaurant | |
| created_at | timestamptz | |

Unique constraint: `(user_id, restaurant_id)`.

## Concurrency: claiming an offer

Claiming decrements shared capacity under concurrent requests, which is the
one place a race condition directly costs the restaurant money (overselling
a quiet-period allocation). MVP uses a single atomic statement rather than
application-level locking:

```sql
UPDATE offer_availability
SET capacity_claimed = capacity_claimed + 1
WHERE id = $1 AND capacity_claimed < capacity_total
RETURNING *;
```

Zero rows returned means "sold out" — the API returns 409, no separate
read-then-write race window exists.

## Deferred entities (not in MVP, with reason)

| entity | deferred to | reason |
|---|---|---|
| `Review` | V1 | ratings are admin-seeded for MVP; building review-writing, moderation, and rating recomputation is real scope not needed to validate the core loop |
| `Payment` | V1+ | MVP flow is pay-restaurant-directly; no gateway integration needed yet |
| `Region`/`City` | when city #2 is scoped | single hardcoded city for MVP |
| Rewards/Coins ledger | V1 | visible in design, explicitly out of MVP scope per confirmed decision |
| Analytics event log | V1 | MVP stats are direct aggregate queries on `Claim`; add an event log when funnel-level analytics is actually needed |
