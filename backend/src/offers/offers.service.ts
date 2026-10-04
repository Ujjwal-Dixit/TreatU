import { HttpStatus, Injectable } from '@nestjs/common';
import type { Offer, OfferAvailability } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import {
  getLocalDateTimeParts,
  formatTime12h,
} from '../common/time/timezone.util';
import { OfferConfigDto } from './dto/offer-config.dto';

export interface OccurrenceWithOffer {
  availability: OfferAvailability;
  offer: Offer;
}

const ANYTIME_TODAY_WINDOW_MINUTES = 5 * 60; // see buildConditionLabel doc comment

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Today's currently-valid offer occurrences (`active`) and today's
   * already-ended ones (`past`, powers "here's what you missed" in the
   * restaurant detail screen), evaluated in the restaurant's own timezone —
   * never server/device time. Availability rows are get-or-created lazily
   * here rather than by a standing cron. */
  async getTodayOccurrences(
    restaurantId: string,
    timezone: string,
    now: Date = new Date(),
  ): Promise<{ active: OccurrenceWithOffer[]; past: OccurrenceWithOffer[] }> {
    const { date, time, weekday } = getLocalDateTimeParts(timezone, now);
    const todayDate = new Date(`${date}T00:00:00.000Z`);

    const offers = await this.prisma.offer.findMany({
      where: { restaurantId, status: 'active', daysOfWeek: { has: weekday } },
    });

    const active: OccurrenceWithOffer[] = [];
    const past: OccurrenceWithOffer[] = [];

    for (const offer of offers) {
      const availability = await this.getOrCreateAvailability(offer, todayDate);
      const isWithinWindow = offer.startTime <= time && time <= offer.endTime;
      const hasCapacity =
        availability.capacityClaimed < availability.capacityTotal;

      if (isWithinWindow && hasCapacity) {
        active.push({ availability, offer });
      } else if (time > offer.endTime) {
        past.push({ availability, offer });
      }
    }

    return { active, past };
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
   * "Anytime today" / "4:00 PM – 9:00 PM"). The source screenshots use all
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

  async listForOwner(ownerUserId: string): Promise<Offer[]> {
    return this.prisma.offer.findMany({
      where: { restaurant: { ownerUserId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createForOwner(
    ownerUserId: string,
    dto: OfferConfigDto,
  ): Promise<Offer> {
    const restaurant = await this.getOwnedRestaurantOrThrow(ownerUserId);
    return this.prisma.offer.create({
      data: {
        restaurantId: restaurant.id,
        discountPercentage: dto.discountPercentage,
        daysOfWeek: dto.daysOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        minSpendPaise: dto.minSpendPaise ?? null,
        capacityPerDay: dto.capacityPerDay,
        status: dto.status ?? 'active',
      },
    });
  }

  async updateForOwner(
    ownerUserId: string,
    offerId: string,
    dto: Partial<OfferConfigDto>,
  ): Promise<Offer> {
    await this.getOwnedOfferOrThrow(ownerUserId, offerId);
    return this.prisma.offer.update({ where: { id: offerId }, data: dto });
  }

  /** Ownership check lives here (direct Prisma query) rather than calling
   * into RestaurantsService, to avoid a circular module dependency between
   * OffersModule and RestaurantsModule — see offers.module.ts. */
  private async getOwnedRestaurantOrThrow(ownerUserId: string) {
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
  ): Promise<Offer> {
    const offer = await this.prisma.offer.findFirst({
      where: { id: offerId, restaurant: { ownerUserId } },
    });
    if (!offer) {
      throw new AppException(
        'OFFER_NOT_FOUND',
        'Offer not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return offer;
  }
}
