import { HttpStatus, Injectable } from '@nestjs/common';
import type {
  Offer,
  OfferAvailability,
  Prisma,
  Restaurant,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { AppException } from '../common/exceptions/app.exception';
import {
  getLocalDateTimeParts,
  formatTime12h,
  type LocalDateTimeParts,
} from '../common/time/timezone.util';
import {
  CreateOfferDto,
  UpdateOfferDto,
  type OfferAvailabilityKind,
} from './dto/offer-config.dto';
import {
  coversDate,
  toOwnerOfferDto,
  type OwnerOfferDto,
} from './mappers/owner-offer.mapper';

export interface OccurrenceWithOffer {
  availability: OfferAvailability;
  offer: Offer;
}

export interface OwnerDashboardDto {
  restaurant: {
    id: string;
    name: string;
    cuisines: string[];
    coverImageUrl: string;
  };
  /** Non-cancelled claims against today's offer occurrences. */
  customersToday: number;
  activeOffers: OwnerOfferDto[];
}

const ANYTIME_TODAY_WINDOW_MINUTES = 5 * 60; // see buildConditionLabel doc comment

/** Claims per day for an offer created without capacityPerDay. The
 * partner app always sends one (its "Seats per Day" field starts here). */
export const DEFAULT_CAPACITY_PER_DAY = 20;

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Restaurant-local date-only values are stored as UTC midnight of that
 * calendar date (Prisma @db.Date), matching OfferAvailability.date. */
function toDateOnly(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Today's currently-valid offer occurrences (`active`) and today's
   * already-ended ones (`past`, powers "here's what you missed" in the
   * restaurant detail screen), evaluated in the restaurant's own timezone —
   * never server/device time. Availability rows are get-or-created lazily
   * here rather than by a standing cron. */
  async getTodayOccurrences(
    restaurantId: string,
    timezone: string,
    now: Date = new Date(),
  ): Promise<{
    /** In window with seats left — claimable right now. */
    active: OccurrenceWithOffer[];
    /** In window but every seat taken. Still shown (as "Sold out") so a
     * customer sees the deal exists and can come back if someone cancels;
     * previously these fell through both lists and silently vanished. */
    soldOut: OccurrenceWithOffer[];
    past: OccurrenceWithOffer[];
  }> {
    const { date, time, weekday } = getLocalDateTimeParts(timezone, now);
    const todayDate = toDateOnly(date);

    const offers = await this.prisma.offer.findMany({
      where: {
        restaurantId,
        status: 'active',
        daysOfWeek: { has: weekday },
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: todayDate } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: todayDate } }] },
        ],
      },
    });

    const active: OccurrenceWithOffer[] = [];
    const soldOut: OccurrenceWithOffer[] = [];
    const past: OccurrenceWithOffer[] = [];

    for (const offer of offers) {
      const availability = await this.getOrCreateAvailability(offer, todayDate);
      const isWithinWindow = offer.startTime <= time && time <= offer.endTime;
      const hasCapacity =
        availability.capacityClaimed < availability.capacityTotal;

      if (isWithinWindow) {
        (hasCapacity ? active : soldOut).push({ availability, offer });
      } else if (time > offer.endTime) {
        past.push({ availability, offer });
      }
      // else: later today — not shown until its window opens.
    }

    return { active, soldOut, past };
  }

  async getOrCreateAvailability(
    offer: Offer,
    date: Date,
  ): Promise<OfferAvailability> {
    return this.prisma.offerAvailability.upsert({
      where: { offerId_date: { offerId: offer.id, date } },
      update: {},
      create: { offerId: offer.id, date, capacityTotal: offer.capacityPerDay },
    });
  }

  /**
   * Renders the human copy shown on offer cards ("Arrive before 9pm" /
   * "Anytime today" / "4:00pm – 9:00pm"). The source screenshots use all
   * three styles somewhat inconsistently for what look like similar cases,
   * so this is a deliberate, documented heuristic approximating that style
   * rather than a spec derived precisely from the mockups:
   *  - a wide window (>= 5 hours) reads as "Anytime today"
   *  - a narrower window we're currently inside reads as "Arrive before X"
   *  - a narrower window still in the future reads as the literal range
   * Revisit once we can eyeball this against the real Home/Detail screens.
   */
  buildConditionLabel(
    offer: Pick<Offer, 'startTime' | 'endTime'>,
    currentTime: string,
  ): string {
    const windowMinutes = this.minutesBetween(offer.startTime, offer.endTime);
    if (windowMinutes >= ANYTIME_TODAY_WINDOW_MINUTES) {
      return 'Anytime today';
    }
    if (currentTime >= offer.startTime && currentTime <= offer.endTime) {
      return `Arrive before ${formatTime12h(offer.endTime)}`;
    }
    return `${formatTime12h(offer.startTime)} – ${formatTime12h(offer.endTime)}`;
  }

  private minutesBetween(startTime: string, endTime: string): number {
    const [startHour = 0, startMinute = 0] = startTime.split(':').map(Number);
    const [endHour = 0, endMinute = 0] = endTime.split(':').map(Number);
    return endHour * 60 + endMinute - (startHour * 60 + startMinute);
  }

  // --- restaurant-owner management -----------------------------------

  async getDashboard(ownerUserId: string): Promise<OwnerDashboardDto> {
    const restaurant = await this.getOwnedRestaurantOrThrow(ownerUserId);
    const now = getLocalDateTimeParts(restaurant.timezone);

    const [offers, customersToday] = await Promise.all([
      this.listForOwner(ownerUserId),
      this.prisma.claim.count({
        where: {
          restaurantId: restaurant.id,
          status: { in: ['claimed', 'redeemed'] },
          offerAvailability: { date: toDateOnly(now.date) },
        },
      }),
    ]);

    return {
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        cuisines: restaurant.cuisines,
        coverImageUrl: restaurant.coverImageUrl,
      },
      customersToday,
      activeOffers: offers.filter((o) => o.displayStatus === 'active'),
    };
  }

  /** Every non-archived offer, newest first. Archived ("deleted") offers
   * are kept in the table for claim history but never shown to the owner. */
  async listForOwner(ownerUserId: string): Promise<OwnerOfferDto[]> {
    const restaurant = await this.getOwnedRestaurantOrThrow(ownerUserId);
    const offers = await this.prisma.offer.findMany({
      where: { restaurantId: restaurant.id, status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
    const now = getLocalDateTimeParts(restaurant.timezone);
    return Promise.all(offers.map((o) => this.toOwnerDto(o, now)));
  }

  async getForOwner(
    ownerUserId: string,
    offerId: string,
  ): Promise<OwnerOfferDto> {
    const { offer, restaurant } = await this.getOwnedOfferOrThrow(
      ownerUserId,
      offerId,
    );
    return this.toOwnerDto(offer, getLocalDateTimeParts(restaurant.timezone));
  }

  async createForOwner(
    ownerUserId: string,
    dto: CreateOfferDto,
  ): Promise<OwnerOfferDto> {
    const restaurant = await this.getOwnedRestaurantOrThrow(ownerUserId);
    const now = getLocalDateTimeParts(restaurant.timezone);

    this.assertValidWindow(dto.startTime, dto.endTime);
    const validity = this.resolveValidity(dto.availability, dto, now);

    const offer = await this.prisma.offer.create({
      data: {
        restaurantId: restaurant.id,
        discountPercentage: dto.discountPercentage,
        startTime: dto.startTime,
        endTime: dto.endTime,
        minSpendPaise: dto.minSpendPaise ?? null,
        capacityPerDay: dto.capacityPerDay ?? DEFAULT_CAPACITY_PER_DAY,
        description: dto.description?.trim() ?? '',
        status: dto.status ?? 'active',
        ...validity,
      },
    });
    this.realtime.publish({
      type: 'offers.changed',
      restaurantId: restaurant.id,
    });
    return this.toOwnerDto(offer, now);
  }

  async updateForOwner(
    ownerUserId: string,
    offerId: string,
    dto: UpdateOfferDto,
  ): Promise<OwnerOfferDto> {
    const { offer, restaurant } = await this.getOwnedOfferOrThrow(
      ownerUserId,
      offerId,
    );
    const now = getLocalDateTimeParts(restaurant.timezone);

    const startTime = dto.startTime ?? offer.startTime;
    const endTime = dto.endTime ?? offer.endTime;
    this.assertValidWindow(startTime, endTime);

    // Every column is listed explicitly — never spread the DTO into
    // Prisma, so only fields this endpoint means to expose can change.
    const data: Prisma.OfferUpdateInput = {
      discountPercentage: dto.discountPercentage,
      startTime: dto.startTime,
      endTime: dto.endTime,
      minSpendPaise: dto.minSpendPaise,
      capacityPerDay: dto.capacityPerDay,
      description: dto.description?.trim(),
      status: dto.status,
      ...(dto.availability
        ? this.resolveValidity(dto.availability, { ...dto, endTime }, now)
        : {}),
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.offer.update({ where: { id: offer.id }, data });

      // capacityTotal is snapshotted per day so past days keep their real
      // history — but an owner raising seats mid-afternoon expects today
      // to change, so today's and any future occurrences follow the edit.
      // Never drop below what's already claimed (would strand bookings).
      if (dto.capacityPerDay !== undefined) {
        const upcoming = await tx.offerAvailability.findMany({
          where: { offerId: offer.id, date: { gte: toDateOnly(now.date) } },
        });
        for (const availability of upcoming) {
          await tx.offerAvailability.update({
            where: { id: availability.id },
            data: {
              capacityTotal: Math.max(
                dto.capacityPerDay,
                availability.capacityClaimed,
              ),
            },
          });
        }
      }
      return result;
    });
    this.realtime.publish({
      type: 'offers.changed',
      restaurantId: restaurant.id,
    });
    return this.toOwnerDto(updated, now);
  }

  /** Only offers that run today get a today count; the availability row is
   * created on demand exactly as the customer-side read path does. */
  private async toOwnerDto(
    offer: Offer,
    now: LocalDateTimeParts,
  ): Promise<OwnerOfferDto> {
    const runsToday = offer.status !== 'archived' && coversDate(offer, now);
    const availability = runsToday
      ? await this.getOrCreateAvailability(offer, toDateOnly(now.date))
      : null;
    return toOwnerOfferDto(offer, availability, now);
  }

  /** Overnight windows (e.g. 22:00–02:00) aren't supported: every
   * comparison in this service treats HH:mm as same-day wall clock. */
  private assertValidWindow(startTime: string, endTime: string): void {
    if (endTime <= startTime) {
      throw new AppException(
        'INVALID_OFFER_WINDOW',
        'End time must be after start time.',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private resolveValidity(
    kind: OfferAvailabilityKind,
    dto: Pick<CreateOfferDto, 'startDate' | 'endDate' | 'daysOfWeek'> & {
      endTime?: string;
    },
    now: LocalDateTimeParts,
  ): Pick<Offer, 'validFrom' | 'validUntil' | 'daysOfWeek'> {
    if (kind === 'today') {
      if (dto.endTime && dto.endTime <= now.time) {
        throw new AppException(
          'OFFER_WINDOW_PASSED',
          'That time window has already ended today. Pick a later end time.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        validFrom: toDateOnly(now.date),
        validUntil: toDateOnly(now.date),
        daysOfWeek: ALL_DAYS,
      };
    }

    if (kind === 'dateRange') {
      const { startDate, endDate } = dto;
      if (!startDate || !endDate || endDate < startDate) {
        throw new AppException(
          'INVALID_DATE_RANGE',
          'End date must be on or after the start date.',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (endDate < now.date) {
        throw new AppException(
          'INVALID_DATE_RANGE',
          'That date range has already ended.',
          HttpStatus.BAD_REQUEST,
        );
      }
      return {
        validFrom: toDateOnly(startDate),
        validUntil: toDateOnly(endDate),
        daysOfWeek: ALL_DAYS,
      };
    }

    return {
      validFrom: null,
      validUntil: null,
      daysOfWeek: [...new Set(dto.daysOfWeek ?? ALL_DAYS)],
    };
  }

  /** Ownership check lives here (direct Prisma query) rather than calling
   * into RestaurantsService, to avoid a circular module dependency between
   * OffersModule and RestaurantsModule — see offers.module.ts. */
  private async getOwnedRestaurantOrThrow(
    ownerUserId: string,
  ): Promise<Restaurant> {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { ownerUserId },
    });
    if (!restaurant) {
      throw new AppException(
        'RESTAURANT_NOT_FOUND',
        'No restaurant is linked to this account.',
        HttpStatus.NOT_FOUND,
      );
    }
    return restaurant;
  }

  private async getOwnedOfferOrThrow(
    ownerUserId: string,
    offerId: string,
  ): Promise<{ offer: Offer; restaurant: Restaurant }> {
    const offer = await this.prisma.offer.findFirst({
      where: {
        id: offerId,
        status: { not: 'archived' },
        restaurant: { ownerUserId },
      },
      include: { restaurant: true },
    });
    if (!offer) {
      throw new AppException(
        'OFFER_NOT_FOUND',
        'Offer not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    const { restaurant, ...rest } = offer;
    return { offer: rest, restaurant };
  }
}
