/**
 * Demo dataset for the pre-onboarding phase: 12 fictional Mumbai restaurants
 * used to exercise the full UI (home feed sections, category chips, search,
 * detail screen, claim/booking flow, favourites, profile stats) before any
 * real restaurant has been onboarded.
 *
 * This doubles as the answer to "what do we actually need to collect from a
 * restaurant at onboarding?" — every field below is one the app renders, so
 * the shape of this file is effectively the onboarding form.
 *
 * REPLACE, DON'T EXTEND, when real restaurants arrive: these are invented
 * businesses at invented addresses. See seed.ts for how they're loaded.
 *
 * Photos are Unsplash CDN URLs (free license, hotlinking permitted). They
 * are stand-ins for real restaurant photography — swap coverImageUrl /
 * galleryUrls for the restaurant's own images at onboarding.
 */

export interface DemoOffer {
  discountPercentage: number;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  minSpendPaise: number | null;
  capacityPerDay: number;
  /** How much of today's capacity is already taken, so the UI shows varied
   * "N left" numbers instead of every offer sitting at full capacity. */
  claimedToday: number;
}

export interface DemoRestaurant {
  /** Stable slug — drives the deterministic UUIDs in seed.ts so re-running
   * the seed updates rows instead of duplicating them. */
  key: string;
  name: string;
  description: string;
  cuisines: string[];
  priceTier: number;
  addressLine: string;
  /** Offset from LAUNCH_CITY.center, which is what distanceKm is measured
   * from (see restaurant.mapper.ts — MVP never reads the device's GPS). */
  latOffset: number;
  lngOffset: number;
  ratingAvg: number;
  ratingCount: number;
  coverImageUrl: string;
  galleryUrls: string[];
  openTime: string;
  closeTime: string;
  offers: DemoOffer[];
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Offer windows deliberately tile the whole day: every restaurant has one
 * 00:00–23:59 band plus two narrow high-discount bands. This matters
 * because getTodayOccurrences() only returns an offer as active while the
 * wall clock sits inside its window — without the 24h band, a demo run
 * outside trading hours shows cards with no discount badge at all, which
 * is exactly what a late-night run hits. The narrow bands are what make
 * the badge change through the day and what populate "Here's what you
 * missed" once they end.
 *
 * DEMO COMPROMISE: the 24h band is wider than any real restaurant would
 * run, and it is deliberately NOT matched to openTime/closeTime — those
 * stay realistic so the detail screen exercises both its Open and Closed
 * states. The visible side effect is that outside trading hours a
 * restaurant reads "Closed" while still showing a claimable deal. Narrow
 * offer[0] to the trading window for each real restaurant at onboarding.
 */
export const DEMO_RESTAURANTS: DemoRestaurant[] = [
  {
    key: 'mowgli',
    name: 'Mowgli Street Food',
    description:
      'Indian street food classics — pav bhaji, chaat and kathi rolls — in a relaxed, modern room off Linking Road.',
    cuisines: ['Indian', 'Cafe'],
    priceTier: 2,
    addressLine: '12 Linking Road, Bandra West',
    latOffset: 0.004,
    lngOffset: 0.003,
    ratingAvg: 4.6,
    ratingCount: 1512,
    coverImageUrl:
      'https://plus.unsplash.com/premium_photo-1694506374847-ced565472398?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1743517894265-c86ab035adef?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1695297516698-fd7a320a55e5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1641642398289-a1fb63ee58a8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1570560258879-af7f8e1447ac?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '08:00',
    closeTime: '23:00',
    offers: [
      {
        discountPercentage: 20,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 30_000,
        capacityPerDay: 40,
        claimedToday: 12,
      },
      {
        discountPercentage: 45,
        daysOfWeek: ALL_DAYS,
        startTime: '15:00',
        endTime: '17:30',
        minSpendPaise: 30_000,
        capacityPerDay: 20,
        claimedToday: 14,
      },
      {
        discountPercentage: 30,
        daysOfWeek: ALL_DAYS,
        startTime: '20:30',
        endTime: '23:00',
        minSpendPaise: 50_000,
        capacityPerDay: 15,
        claimedToday: 4,
      },
    ],
  },
  {
    key: 'bombay',
    name: 'Bombay Biryani House',
    description:
      'Slow-cooked dum biryani served in sealed handis, alongside kebabs from the charcoal grill. Family-run since 1998.',
    cuisines: ['Biryani', 'North Indian'],
    priceTier: 2,
    addressLine: '48 Mohammed Ali Road, Dongri',
    latOffset: 0.01,
    lngOffset: 0.008,
    ratingAvg: 4.7,
    ratingCount: 2841,
    coverImageUrl:
      'https://plus.unsplash.com/premium_photo-1723708882892-de33ff578c11?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://plus.unsplash.com/premium_photo-1694141251673-1758913ade48?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1752673508949-f4aeeaef75f0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1708184528306-f75a0a5118ee?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1538334421852-687c439c92f4?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '11:00',
    closeTime: '23:30',
    offers: [
      {
        discountPercentage: 15,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 40_000,
        capacityPerDay: 50,
        claimedToday: 20,
      },
      {
        discountPercentage: 50,
        daysOfWeek: ALL_DAYS,
        startTime: '14:30',
        endTime: '17:00',
        minSpendPaise: 60_000,
        capacityPerDay: 25,
        claimedToday: 22,
      },
      {
        discountPercentage: 35,
        daysOfWeek: ALL_DAYS,
        startTime: '21:00',
        endTime: '23:30',
        minSpendPaise: 40_000,
        capacityPerDay: 18,
        claimedToday: 6,
      },
    ],
  },
  {
    key: 'hyderabad',
    name: 'Hyderabad Spice Room',
    description:
      'Hyderabadi kitchen known for its 24-hour marinated mutton biryani, mirchi ka salan and double ka meetha.',
    cuisines: ['Biryani', 'Hyderabadi'],
    priceTier: 3,
    addressLine: '7 Hill Road, Bandra West',
    latOffset: -0.015,
    lngOffset: 0.012,
    ratingAvg: 4.5,
    ratingCount: 1967,
    coverImageUrl:
      'https://plus.unsplash.com/premium_photo-1694141253763-209b4c8f8ace?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1633945274309-2c16c9682a8c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1714611626323-5ba6204453be?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1694141250007-fc4711bb9df1?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1670984940156-c7f833fe8397?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '11:30',
    closeTime: '23:00',
    offers: [
      {
        discountPercentage: 20,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 50_000,
        capacityPerDay: 45,
        claimedToday: 17,
      },
      {
        discountPercentage: 40,
        daysOfWeek: ALL_DAYS,
        startTime: '15:00',
        endTime: '18:00',
        minSpendPaise: 50_000,
        capacityPerDay: 30,
        claimedToday: 25,
      },
      {
        discountPercentage: 25,
        daysOfWeek: ALL_DAYS,
        startTime: '21:30',
        endTime: '23:00',
        minSpendPaise: 35_000,
        capacityPerDay: 12,
        claimedToday: 9,
      },
    ],
  },
  {
    key: 'napoli',
    name: 'Napoli Wood Fired',
    description:
      'Neapolitan pizza from a 450°C wood oven, 48-hour fermented dough, imported San Marzano tomatoes and fior di latte.',
    cuisines: ['Pizza', 'Italian'],
    priceTier: 3,
    addressLine: '22 Colaba Causeway, Colaba',
    latOffset: 0.02,
    lngOffset: -0.01,
    ratingAvg: 4.8,
    ratingCount: 1104,
    coverImageUrl:
      'https://plus.unsplash.com/premium_photo-1733266807710-f8f8de34416f?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1566843972142-a7fcb70de55a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1672856398893-2fb52d807874?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1672856399643-47ddf6b2d6d6?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1685397067025-d293a18099ba?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '12:00',
    closeTime: '23:30',
    offers: [
      {
        discountPercentage: 15,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 60_000,
        capacityPerDay: 40,
        claimedToday: 11,
      },
      {
        discountPercentage: 45,
        daysOfWeek: ALL_DAYS,
        startTime: '15:30',
        endTime: '18:30',
        minSpendPaise: 60_000,
        capacityPerDay: 22,
        claimedToday: 19,
      },
      {
        discountPercentage: 30,
        daysOfWeek: ALL_DAYS,
        startTime: '21:30',
        endTime: '23:30',
        minSpendPaise: 45_000,
        capacityPerDay: 16,
        claimedToday: 5,
      },
    ],
  },
  {
    key: 'crust',
    name: 'Crust & Co.',
    description:
      'All-day pizza cafe with thin-crust sourdough bases, cold brew on tap and a long communal table for working.',
    cuisines: ['Pizza', 'Cafe'],
    priceTier: 2,
    addressLine: '5 Chapel Road, Bandra West',
    latOffset: -0.008,
    lngOffset: 0.022,
    ratingAvg: 4.3,
    ratingCount: 736,
    coverImageUrl:
      'https://images.unsplash.com/photo-1724232822245-f430d53466e0?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://plus.unsplash.com/premium_photo-1679924471091-f7cd7ad90ddf?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1673439306780-2b457e65da70?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563245738-9169ff58eccf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1494346480775-936a9f0d0877?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '09:00',
    closeTime: '23:00',
    offers: [
      {
        discountPercentage: 20,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 35_000,
        capacityPerDay: 50,
        claimedToday: 24,
      },
      {
        discountPercentage: 40,
        daysOfWeek: ALL_DAYS,
        startTime: '14:00',
        endTime: '17:00',
        minSpendPaise: 35_000,
        capacityPerDay: 28,
        claimedToday: 20,
      },
      {
        discountPercentage: 25,
        daysOfWeek: ALL_DAYS,
        startTime: '20:00',
        endTime: '23:00',
        minSpendPaise: 50_000,
        capacityPerDay: 20,
        claimedToday: 7,
      },
    ],
  },
  {
    key: 'grind',
    name: 'The Daily Grind',
    description:
      'Single-origin espresso bar and breakfast counter. Pour-overs, house granola and the best cardamom bun in Lower Parel.',
    cuisines: ['Cafe', 'Coffee'],
    priceTier: 2,
    addressLine: '3 Senapati Bapat Marg, Lower Parel',
    latOffset: 0.006,
    lngOffset: -0.005,
    ratingAvg: 4.4,
    ratingCount: 892,
    coverImageUrl:
      'https://plus.unsplash.com/premium_photo-1663932464937-e677ddfc1d55?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1650300817493-26c8f88879dc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1642647916334-82e513d9cc48?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543745503-c03673999b29?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1727456097852-cb5e11d18e61?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '07:00',
    closeTime: '22:30',
    offers: [
      {
        discountPercentage: 25,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 20_000,
        capacityPerDay: 60,
        claimedToday: 31,
      },
      {
        discountPercentage: 50,
        daysOfWeek: ALL_DAYS,
        startTime: '07:00',
        endTime: '10:00',
        minSpendPaise: 20_000,
        capacityPerDay: 30,
        claimedToday: 26,
      },
      {
        discountPercentage: 35,
        daysOfWeek: ALL_DAYS,
        startTime: '15:00',
        endTime: '18:00',
        minSpendPaise: 25_000,
        capacityPerDay: 25,
        claimedToday: 12,
      },
    ],
  },
  {
    key: 'patty',
    name: 'Patty & Bun',
    description:
      'Dry-aged beef and chicken burgers on toasted brioche, hand-cut fries, and thick shakes. Counter service, loud music.',
    cuisines: ['Burgers', 'American'],
    priceTier: 2,
    addressLine: '19 Juhu Tara Road, Juhu',
    latOffset: 0.028,
    lngOffset: 0.014,
    ratingAvg: 4.5,
    ratingCount: 2210,
    coverImageUrl:
      'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1551782450-17144efb9c50?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1538333581680-29dd4752ddf2?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '11:00',
    closeTime: '23:30',
    offers: [
      {
        discountPercentage: 15,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 40_000,
        capacityPerDay: 45,
        claimedToday: 18,
      },
      {
        discountPercentage: 40,
        daysOfWeek: ALL_DAYS,
        startTime: '15:00',
        endTime: '18:00',
        minSpendPaise: 40_000,
        capacityPerDay: 25,
        claimedToday: 21,
      },
      {
        discountPercentage: 30,
        daysOfWeek: ALL_DAYS,
        startTime: '21:00',
        endTime: '23:30',
        minSpendPaise: 30_000,
        capacityPerDay: 20,
        claimedToday: 8,
      },
    ],
  },
  {
    key: 'smash',
    name: 'Smash House',
    description:
      'Smashed-patty burgers cooked to order on a flat top, crinkle fries and soft-serve. Open late for the Andheri crowd.',
    cuisines: ['Burgers', 'Fast Food'],
    priceTier: 1,
    addressLine: '64 Lokhandwala Complex, Andheri West',
    latOffset: -0.03,
    lngOffset: -0.018,
    ratingAvg: 4.2,
    ratingCount: 1384,
    coverImageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://plus.unsplash.com/premium_photo-1684534125661-614f59f16f2e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1670984940113-f3aa1cd1309a?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '11:00',
    closeTime: '23:59',
    offers: [
      {
        discountPercentage: 20,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 25_000,
        capacityPerDay: 55,
        claimedToday: 29,
      },
      {
        discountPercentage: 45,
        daysOfWeek: ALL_DAYS,
        startTime: '16:00',
        endTime: '19:00',
        minSpendPaise: 25_000,
        capacityPerDay: 30,
        claimedToday: 27,
      },
      {
        discountPercentage: 35,
        daysOfWeek: ALL_DAYS,
        startTime: '22:00',
        endTime: '23:59',
        minSpendPaise: 20_000,
        capacityPerDay: 15,
        claimedToday: 6,
      },
    ],
  },
  {
    key: 'sakura',
    name: 'Sakura Sushi Bar',
    description:
      'Eight-seat sushi counter with a daily-changing nigiri selection, flown-in bluefin and a short sake list.',
    cuisines: ['Sushi', 'Japanese'],
    priceTier: 4,
    addressLine: '31 Bandra Kurla Complex, BKC',
    latOffset: 0.035,
    lngOffset: -0.025,
    ratingAvg: 4.9,
    ratingCount: 418,
    coverImageUrl:
      'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://plus.unsplash.com/premium_photo-1668146927669-f2edf6e86f6f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1635526910429-051cf1ed127e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1696449241254-11cf7f18ce32?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '12:00',
    closeTime: '23:00',
    offers: [
      {
        discountPercentage: 15,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 80_000,
        capacityPerDay: 30,
        claimedToday: 9,
      },
      {
        discountPercentage: 40,
        daysOfWeek: ALL_DAYS,
        startTime: '14:00',
        endTime: '17:00',
        minSpendPaise: 80_000,
        capacityPerDay: 18,
        claimedToday: 15,
      },
      {
        discountPercentage: 25,
        daysOfWeek: ALL_DAYS,
        startTime: '20:30',
        endTime: '23:00',
        minSpendPaise: 70_000,
        capacityPerDay: 14,
        claimedToday: 5,
      },
    ],
  },
  {
    key: 'umami',
    name: 'Umami Omakase',
    description:
      'Twelve-course omakase menu, one sitting a night. Chef selects; you sit back. Reservation strongly recommended.',
    cuisines: ['Sushi', 'Asian'],
    priceTier: 4,
    addressLine: '9 Worli Sea Face, Worli',
    latOffset: -0.042,
    lngOffset: 0.02,
    ratingAvg: 4.8,
    ratingCount: 263,
    coverImageUrl:
      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1668146932065-d08643791942?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1617196034738-26c5f7c977ce?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1601351841251-766245326eee?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '12:30',
    closeTime: '23:30',
    offers: [
      {
        discountPercentage: 20,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 90_000,
        capacityPerDay: 25,
        claimedToday: 8,
      },
      {
        discountPercentage: 45,
        daysOfWeek: ALL_DAYS,
        startTime: '15:00',
        endTime: '18:00',
        minSpendPaise: 90_000,
        capacityPerDay: 16,
        claimedToday: 14,
      },
      {
        discountPercentage: 30,
        daysOfWeek: ALL_DAYS,
        startTime: '21:00',
        endTime: '23:30',
        minSpendPaise: 75_000,
        capacityPerDay: 12,
        claimedToday: 4,
      },
    ],
  },
  {
    key: 'sugar',
    name: 'Sugar & Spice Patisserie',
    description:
      'French-technique patisserie — laminated pastry in the morning, entremets and tarts by afternoon. Everything baked on site.',
    cuisines: ['Dessert', 'Bakery'],
    priceTier: 2,
    addressLine: '14 Turner Road, Khar West',
    latOffset: 0.012,
    lngOffset: 0.03,
    ratingAvg: 4.7,
    ratingCount: 1043,
    coverImageUrl:
      'https://plus.unsplash.com/premium_photo-1665669263531-cdcbe18e7fe4?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1597528662465-55ece5734101?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1665669248059-0a70291944f5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1565182363525-f95648bbeee0?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1665660297779-aa352940b21c?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '08:00',
    closeTime: '22:00',
    offers: [
      {
        discountPercentage: 25,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 15_000,
        capacityPerDay: 60,
        claimedToday: 27,
      },
      {
        discountPercentage: 50,
        daysOfWeek: ALL_DAYS,
        startTime: '08:00',
        endTime: '11:00',
        minSpendPaise: 15_000,
        capacityPerDay: 35,
        claimedToday: 30,
      },
      {
        discountPercentage: 35,
        daysOfWeek: ALL_DAYS,
        startTime: '17:00',
        endTime: '20:00',
        minSpendPaise: 20_000,
        capacityPerDay: 25,
        claimedToday: 11,
      },
    ],
  },
  {
    key: 'gelato',
    name: 'Gelato Roma',
    description:
      'Small-batch gelato churned twice daily — pistachio from Bronte, Alphonso in season, and a rotating dairy-free row.',
    cuisines: ['Dessert', 'Cafe'],
    priceTier: 1,
    addressLine: '2 Carter Road Promenade, Bandra West',
    latOffset: -0.02,
    lngOffset: -0.038,
    ratingAvg: 4.4,
    ratingCount: 1655,
    coverImageUrl:
      'https://images.unsplash.com/photo-1765478006783-2df9698dfef6?auto=format&fit=crop&w=1200&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1780444100067-d2146c41346a?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1726718460687-821ed3830cf0?auto=format&fit=crop&w=800&q=80',
      'https://plus.unsplash.com/premium_photo-1723600885957-31ddca568fe2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1602829331360-914620637a53?auto=format&fit=crop&w=800&q=80',
    ],
    openTime: '10:00',
    closeTime: '23:30',
    offers: [
      {
        discountPercentage: 20,
        daysOfWeek: ALL_DAYS,
        startTime: '00:00',
        endTime: '23:59',
        minSpendPaise: 12_000,
        capacityPerDay: 70,
        claimedToday: 33,
      },
      {
        discountPercentage: 40,
        daysOfWeek: ALL_DAYS,
        startTime: '14:00',
        endTime: '17:00',
        minSpendPaise: 12_000,
        capacityPerDay: 40,
        claimedToday: 34,
      },
      {
        discountPercentage: 30,
        daysOfWeek: ALL_DAYS,
        startTime: '20:00',
        endTime: '23:30',
        minSpendPaise: 18_000,
        capacityPerDay: 30,
        claimedToday: 9,
      },
    ],
  },
];

/**
 * Which restaurants appear in which home-feed carousel, and in what order.
 * Hand-curated — there is no ranking algorithm at MVP (see
 * home-feed-sections.config.ts / api-contracts.md GET /home-feed).
 */
export const DEMO_FEATURES: Record<string, string[]> = {
  // Biggest headline discount available today.
  highestOffer: ['bombay', 'grind', 'sugar', 'napoli', 'umami', 'smash'],
  // Closest to LAUNCH_CITY.center, which is what distanceKm is measured from.
  openNearYou: ['mowgli', 'grind', 'bombay', 'hyderabad', 'napoli', 'crust'],
  // Founder's picks — deliberately spread across cuisines.
  topPicks: ['sakura', 'napoli', 'mowgli', 'sugar', 'patty', 'gelato'],
};
