/**
 * Local dev sample data AND the template for real onboarding: MVP has no
 * admin UI/API (confirmed decision — hand-curated launch), so a restaurant
 * goes live by adding an entry to demo-data.ts and running this script
 * against the target database. Everything here is upserted on a
 * deterministic id, so re-running updates rows instead of duplicating them
 * — which also makes this the "reset the demo to a known state" command.
 *
 * The dataset is 12 invented Mumbai restaurants (see demo-data.ts) that
 * exist purely to make the UI look live before real restaurants are
 * onboarded. Delete them — don't build on top of them — once onboarding
 * starts.
 */
import { PrismaClient, type ClaimStatus } from '@prisma/client';
import { LAUNCH_CITY } from '../src/config/city.config';
import {
  getLocalDateTimeParts,
  zonedTimeToUtc,
} from '../src/common/time/timezone.util';
import { DEMO_RESTAURANTS, DEMO_FEATURES } from './demo-data';

const prisma = new PrismaClient();

/** Phone number to log in with to see the populated Bookings / Favourites /
 * Profile screens. The OTP is printed to the backend console by
 * ConsoleOtpSender — there's no real SMS gateway wired up yet. */
const DEMO_CUSTOMER_PHONE = '+919800000000';
const DEMO_OWNER_PHONE = '+919800000001';

/** Deterministic UUIDs keyed off position, so ids stay stable across runs
 * and the upserts above are genuinely idempotent. */
const pad2 = (n: number): string => n.toString().padStart(2, '0');
const restaurantId = (i: number): string =>
  `00000000-0000-0000-0000-0000000000${pad2(i + 1)}`;
const offerId = (i: number, j: number): string =>
  `00000000-0000-0000-0000-00000001${pad2(i + 1)}${pad2(j + 1)}`;
const claimId = (n: number): string =>
  `00000000-0000-0000-0000-0000000300${pad2(n + 1)}`;

/** "2026-08-31" minus n days, staying in plain YYYY-MM-DD. */
function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Claims for the demo customer, covering every state the Bookings screen
 * splits on (Active vs Past) plus the redeemed rows the Profile stats are
 * computed from. offerIndex points into that restaurant's offers array. */
const DEMO_CLAIMS: {
  key: string;
  offerIndex: number;
  daysAgo: number;
  status: ClaimStatus;
  code: string;
}[] = [
  // Active — today, on each restaurant's wide all-day band.
  {
    key: 'bombay',
    offerIndex: 0,
    daysAgo: 0,
    status: 'claimed',
    code: 'BMB4K2',
  },
  {
    key: 'grind',
    offerIndex: 0,
    daysAgo: 0,
    status: 'claimed',
    code: 'GRD7Q9',
  },
  // Past, redeemed — these three drive totalSaved / offersRedeemed /
  // restaurantsVisited on the Profile tab.
  {
    key: 'napoli',
    offerIndex: 1,
    daysAgo: 5,
    status: 'redeemed',
    code: 'NPL3X8',
  },
  {
    key: 'sakura',
    offerIndex: 1,
    daysAgo: 12,
    status: 'redeemed',
    code: 'SKR5M2',
  },
  {
    key: 'sugar',
    offerIndex: 1,
    daysAgo: 3,
    status: 'redeemed',
    code: 'SGR9T4',
  },
  // Past, never redeemed.
  {
    key: 'gelato',
    offerIndex: 1,
    daysAgo: 8,
    status: 'expired',
    code: 'GLT6H3',
  },
];

/** Restaurants the demo customer has hearted. */
const DEMO_FAVORITES = ['sakura', 'napoli', 'sugar', 'mowgli'];

async function main(): Promise<void> {
  const { date: today } = getLocalDateTimeParts(LAUNCH_CITY.timezone);

  const customer = await prisma.user.upsert({
    where: { phoneNumber: DEMO_CUSTOMER_PHONE },
    update: {},
    create: {
      phoneNumber: DEMO_CUSTOMER_PHONE,
      name: 'Demo User',
      role: 'customer',
    },
  });

  // One owner account, linked to the first restaurant only — enough to
  // exercise the restaurant-owner endpoints without inventing 12 logins.
  const owner = await prisma.user.upsert({
    where: { phoneNumber: DEMO_OWNER_PHONE },
    update: {},
    create: {
      phoneNumber: DEMO_OWNER_PHONE,
      name: 'Mowgli Street Food (Owner)',
      role: 'restaurant_owner',
    },
  });

  const idByKey = new Map<string, string>();
  /** offer id + its parent restaurant, keyed "restaurantKey:offerIndex". */
  const offersByKey = new Map<
    string,
    {
      id: string;
      endTime: string;
      discountPercentage: number;
      minSpendPaise: number | null;
    }
  >();

  for (const [i, def] of DEMO_RESTAURANTS.entries()) {
    const id = restaurantId(i);
    idByKey.set(def.key, id);

    const fields = {
      name: def.name,
      description: def.description,
      cuisines: def.cuisines,
      priceTier: def.priceTier,
      addressLine: def.addressLine,
      city: LAUNCH_CITY.slug,
      latitude: LAUNCH_CITY.center.latitude + def.latOffset,
      longitude: LAUNCH_CITY.center.longitude + def.lngOffset,
      timezone: LAUNCH_CITY.timezone,
      operatingHours: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
        dayOfWeek,
        openTime: def.openTime,
        closeTime: def.closeTime,
      })),
      coverImageUrl: def.coverImageUrl,
      galleryUrls: def.galleryUrls,
      ratingAvg: def.ratingAvg,
      ratingCount: def.ratingCount,
      status: 'active' as const,
    };

    await prisma.restaurant.upsert({
      where: { id },
      update: fields,
      create: {
        id,
        ...fields,
        // Only the first restaurant gets an owner account; the rest are
        // ownerless, which the schema allows.
        ...(i === 0 ? { ownerUserId: owner.id } : {}),
      },
    });

    for (const [j, offer] of def.offers.entries()) {
      const oid = offerId(i, j);
      const offerFields = {
        restaurantId: id,
        discountPercentage: offer.discountPercentage,
        daysOfWeek: offer.daysOfWeek,
        startTime: offer.startTime,
        endTime: offer.endTime,
        minSpendPaise: offer.minSpendPaise,
        capacityPerDay: offer.capacityPerDay,
        status: 'active' as const,
      };
      await prisma.offer.upsert({
        where: { id: oid },
        update: offerFields,
        create: { id: oid, ...offerFields },
      });

      offersByKey.set(`${def.key}:${j}`, {
        id: oid,
        endTime: offer.endTime,
        discountPercentage: offer.discountPercentage,
        minSpendPaise: offer.minSpendPaise,
      });

      // Pre-create today's occurrence with part of its capacity already
      // taken, so the UI shows varied "N left" numbers rather than every
      // offer sitting untouched at full capacity. Without this the rows
      // are created lazily at 0 claimed on first read (OffersService).
      const capacityClaimed = Math.min(
        offer.claimedToday,
        offer.capacityPerDay,
      );
      await prisma.offerAvailability.upsert({
        where: {
          offerId_date: {
            offerId: oid,
            date: new Date(`${today}T00:00:00.000Z`),
          },
        },
        update: { capacityClaimed, capacityTotal: offer.capacityPerDay },
        create: {
          offerId: oid,
          date: new Date(`${today}T00:00:00.000Z`),
          capacityTotal: offer.capacityPerDay,
          capacityClaimed,
        },
      });
    }
  }

  // Drop any offer on a demo restaurant that this seed did not just write —
  // otherwise offers from an earlier version of the dataset linger and show
  // up as extra deals on the detail screen. Cascades to their availability
  // rows; a stale offer that already has claims against it is left alone
  // rather than silently destroying booking history.
  const knownOfferIds = [...offersByKey.values()].map((o) => o.id);
  const strayOffers = await prisma.offer.findMany({
    where: {
      restaurantId: { in: [...idByKey.values()] },
      id: { notIn: knownOfferIds },
    },
    select: {
      id: true,
      availabilities: { select: { _count: { select: { claims: true } } } },
    },
  });
  const deletable = strayOffers
    .filter((o) => o.availabilities.every((a) => a._count.claims === 0))
    .map((o) => o.id);
  if (deletable.length > 0) {
    await prisma.offer.deleteMany({ where: { id: { in: deletable } } });
  }
  const skipped = strayOffers.length - deletable.length;
  if (skipped > 0) {
    console.warn(
      `Left ${skipped} stale offer(s) in place — they have claims against them.`,
    );
  }
  // Home-feed carousels. Rows are replaced wholesale so removing a
  // restaurant from DEMO_FEATURES actually removes it from the feed.
  await prisma.restaurantFeature.deleteMany({});
  for (const [sectionKey, keys] of Object.entries(DEMO_FEATURES)) {
    for (const [rank, key] of keys.entries()) {
      const id = idByKey.get(key);
      if (!id) throw new Error(`DEMO_FEATURES references unknown key "${key}"`);
      await prisma.restaurantFeature.create({
        data: { restaurantId: id, sectionKey, rank: rank + 1 },
      });
    }
  }

  await prisma.favorite.deleteMany({ where: { userId: customer.id } });
  for (const key of DEMO_FAVORITES) {
    const id = idByKey.get(key);
    if (!id) throw new Error(`DEMO_FAVORITES references unknown key "${key}"`);
    await prisma.favorite.create({
      data: { userId: customer.id, restaurantId: id },
    });
  }

  for (const [n, spec] of DEMO_CLAIMS.entries()) {
    const restaurant = idByKey.get(spec.key);
    const offer = offersByKey.get(`${spec.key}:${spec.offerIndex}`);
    if (!restaurant || !offer) {
      throw new Error(
        `DEMO_CLAIMS references unknown offer "${spec.key}:${spec.offerIndex}"`,
      );
    }

    const date = shiftDate(today, -spec.daysAgo);
    const availability = await prisma.offerAvailability.upsert({
      where: {
        offerId_date: {
          offerId: offer.id,
          date: new Date(`${date}T00:00:00.000Z`),
        },
      },
      update: {},
      create: {
        offerId: offer.id,
        date: new Date(`${date}T00:00:00.000Z`),
        capacityTotal: 20,
        capacityClaimed: 1,
        status: spec.daysAgo === 0 ? 'active' : 'expired',
      },
    });

    // Same rule the live claim path uses: a claim dies at the end of its
    // offer's window, in the restaurant's own timezone.
    const expiresAt = zonedTimeToUtc(date, offer.endTime, LAUNCH_CITY.timezone);
    const claimedAt = zonedTimeToUtc(date, '12:30', LAUNCH_CITY.timezone);
    const claimFields = {
      userId: customer.id,
      offerAvailabilityId: availability.id,
      restaurantId: restaurant,
      redemptionCode: spec.code,
      discountPercentageSnapshot: offer.discountPercentage,
      minSpendPaiseSnapshot: offer.minSpendPaise,
      status: spec.status,
      claimedAt,
      expiresAt,
      redeemedAt:
        spec.status === 'redeemed'
          ? zonedTimeToUtc(date, '13:15', LAUNCH_CITY.timezone)
          : null,
    };

    await prisma.claim.upsert({
      where: { id: claimId(n) },
      update: claimFields,
      create: { id: claimId(n), ...claimFields },
    });
  }

  const offerCount = DEMO_RESTAURANTS.reduce(
    (sum, r) => sum + r.offers.length,
    0,
  );
  console.log(
    `Seeded ${DEMO_RESTAURANTS.length} restaurants, ${offerCount} offers, ` +
      `${DEMO_FAVORITES.length} favourites and ${DEMO_CLAIMS.length} claims.\n` +
      `Log in as ${DEMO_CUSTOMER_PHONE} (OTP is printed to this console) to see them.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
