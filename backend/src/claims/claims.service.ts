import { HttpStatus, Injectable } from '@nestjs/common';
import type { ClaimStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { generateRedemptionCode } from '../common/crypto/code.util';
import { RealtimeService } from '../realtime/realtime.service';
import {
  getLocalDateTimeParts,
  formatDateOnly,
  zonedTimeToUtc,
} from '../common/time/timezone.util';

/** Enough of the restaurant for the Dining Pass screen (cuisine line,
 * distance, "Get directions") without a second request. */
const RESTAURANT_CARD_SELECT = {
  id: true,
  name: true,
  coverImageUrl: true,
  cuisines: true,
  addressLine: true,
  latitude: true,
  longitude: true,
} as const;

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeService,
  ) {}

  /** The one place a race condition directly costs the restaurant money —
   * see data-model.md's "Concurrency: claiming an offer" section. The
   * capacity check is a single atomic UPDATE...WHERE, not read-then-write,
   * so it's race-safe even without relying on transaction isolation level. */
  async claim(userId: string, offerAvailabilityId: string) {
    const claim = await this.prisma.$transaction(async (tx) => {
      const availability = await tx.offerAvailability.findUnique({
        where: { id: offerAvailabilityId },
        include: { offer: { include: { restaurant: true } } },
      });
      if (!availability) {
        throw new AppException(
          'OFFER_NOT_FOUND',
          'This offer no longer exists.',
          HttpStatus.NOT_FOUND,
        );
      }

      const { offer } = availability;
      const { restaurant } = offer;
      const { date, time } = getLocalDateTimeParts(restaurant.timezone);
      const isSameDay = date === formatDateOnly(availability.date);
      const isWithinWindow =
        isSameDay && offer.startTime <= time && time <= offer.endTime;
      if (!isWithinWindow) {
        throw new AppException(
          'OFFER_NOT_ACTIVE',
          'This offer is no longer active.',
          HttpStatus.CONFLICT,
        );
      }

      const updateResult = await tx.offerAvailability.updateMany({
        where: {
          id: offerAvailabilityId,
          capacityClaimed: { lt: availability.capacityTotal },
        },
        data: { capacityClaimed: { increment: 1 } },
      });
      if (updateResult.count === 0) {
        throw new AppException(
          'OFFER_SOLD_OUT',
          'This offer is sold out for today.',
          HttpStatus.CONFLICT,
        );
      }

      const expiresAt = zonedTimeToUtc(
        formatDateOnly(availability.date),
        offer.endTime,
        restaurant.timezone,
      );

      return tx.claim.create({
        data: {
          userId,
          offerAvailabilityId,
          restaurantId: restaurant.id,
          redemptionCode: generateRedemptionCode(),
          discountPercentageSnapshot: offer.discountPercentage,
          minSpendPaiseSnapshot: offer.minSpendPaise,
          status: 'claimed',
          expiresAt,
        },
        include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
      });
    });
    this.notifyClaimChanged(claim);
    return claim;
  }

  /**
   * Lazy expiry: there's no background job, so every path that reads claims
   * first flips any `claimed` claim whose window has ended to `expired`.
   * Correct-on-read is all the product needs — nothing acts on an expired
   * claim except someone looking at it — and it avoids running a scheduler
   * (which would need leader election once there are multiple instances).
   * Seats aren't released: the customer held that seat for the window.
   */
  private async expireStale(where: Prisma.ClaimWhereInput): Promise<void> {
    const stale = await this.prisma.claim.findMany({
      where: { ...where, status: 'claimed', expiresAt: { lt: new Date() } },
      select: { id: true, restaurantId: true, userId: true },
    });
    if (stale.length === 0) return;

    await this.prisma.claim.updateMany({
      // Re-checked here so a claim redeemed in the meantime is left alone.
      where: { id: { in: stale.map((c) => c.id) }, status: 'claimed' },
      data: { status: 'expired' },
    });
    for (const claim of stale) {
      this.realtime.publish({
        type: 'claim.changed',
        claimId: claim.id,
        restaurantId: claim.restaurantId,
        userId: claim.userId,
      });
    }
  }

  async listForUser(userId: string, status?: ClaimStatus) {
    await this.expireStale({ userId });
    return this.prisma.claim.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
      orderBy: { claimedAt: 'desc' },
    });
  }

  async getForUser(userId: string, claimId: string) {
    await this.expireStale({ id: claimId, userId });
    const claim = await this.prisma.claim.findFirst({
      where: { id: claimId, userId },
      include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
    });
    if (!claim) {
      throw new AppException(
        'CLAIM_NOT_FOUND',
        'Booking not found.',
        HttpStatus.NOT_FOUND,
      );
    }
    return claim;
  }

  async cancel(userId: string, claimId: string): Promise<void> {
    // An expired claim isn't cancellable; sweeping first turns it into the
    // CLAIM_NOT_CANCELLABLE branch below instead of releasing a seat for a
    // window that's already over.
    await this.expireStale({ id: claimId, userId });
    const claim = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({ where: { id: claimId } });
      if (!claim || claim.userId !== userId) {
        throw new AppException(
          'CLAIM_NOT_FOUND',
          'Booking not found.',
          HttpStatus.NOT_FOUND,
        );
      }
      if (claim.status !== 'claimed') {
        throw new AppException(
          'CLAIM_NOT_CANCELLABLE',
          'This booking can no longer be cancelled.',
          HttpStatus.CONFLICT,
        );
      }
      await tx.claim.update({
        where: { id: claimId },
        data: { status: 'cancelled' },
      });
      await tx.offerAvailability.update({
        where: { id: claim.offerAvailabilityId },
        data: { capacityClaimed: { decrement: 1 } },
      });
      return claim;
    });
    this.notifyClaimChanged(claim);
  }

  /** Published after the transaction commits, never inside it — a client
   * refetching on this event must see the new state. A claim change also
   * moves that offer's seat count, so the public offer event goes too. */
  private notifyClaimChanged(claim: {
    id: string;
    restaurantId: string;
    userId: string;
  }): void {
    this.realtime.publish({
      type: 'claim.changed',
      claimId: claim.id,
      restaurantId: claim.restaurantId,
      userId: claim.userId,
    });
    this.realtime.publish({
      type: 'offers.changed',
      restaurantId: claim.restaurantId,
    });
  }

  // --- restaurant-owner side -------------------------------------------

  async listForOwnerOffer(ownerUserId: string, offerId: string, date?: string) {
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

    await this.expireStale({ offerAvailability: { offerId } });
    return this.prisma.claim.findMany({
      where: {
        offerAvailability: {
          offerId,
          ...(date ? { date: new Date(`${date}T00:00:00.000Z`) } : {}),
        },
      },
      include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
      orderBy: { claimedAt: 'desc' },
    });
  }

  /** Partner app's "Customers Today" list: every claim against today's
   * occurrences of this owner's offers, in the restaurant's timezone. */
  async listForOwnerToday(ownerUserId: string) {
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
    const { date } = getLocalDateTimeParts(restaurant.timezone);
    await this.expireStale({ restaurantId: restaurant.id });
    return this.prisma.claim.findMany({
      where: {
        restaurantId: restaurant.id,
        offerAvailability: { date: new Date(`${date}T00:00:00.000Z`) },
      },
      include: {
        restaurant: { select: RESTAURANT_CARD_SELECT },
        user: { select: { name: true, phoneNumber: true } },
      },
      orderBy: { claimedAt: 'desc' },
    });
  }

  /** Staff only ever has the code the customer shows them — never a
   * claimId — so redemption is looked up by code, not by path parameter.
   * (An earlier draft of api-contracts.md had this the other way around;
   * corrected to match how the flow actually works in a restaurant.) */
  async redeemByCode(
    ownerUserId: string,
    code: string,
    billAmountPaise?: number,
  ) {
    const claim = await this.prisma.claim.findUnique({
      where: { redemptionCode: code.toUpperCase() },
      include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
    });
    if (
      !claim ||
      (await this.isOwnedByCaller(claim.restaurant.id, ownerUserId)) === false
    ) {
      throw new AppException(
        'CLAIM_NOT_FOUND',
        'No booking found for this code.',
        HttpStatus.NOT_FOUND,
      );
    }
    if (claim.status !== 'claimed') {
      throw new AppException(
        'CLAIM_ALREADY_PROCESSED',
        `This booking is already ${claim.status}.`,
        HttpStatus.CONFLICT,
      );
    }
    // Nothing transitions claims to `expired` in the background yet, so
    // the window is enforced here at the moment it matters — otherwise a
    // code from a finished window would still redeem at full discount.
    if (claim.expiresAt < new Date()) {
      await this.prisma.claim.update({
        where: { id: claim.id },
        data: { status: 'expired' },
      });
      this.notifyClaimChanged(claim);
      throw new AppException(
        'CLAIM_EXPIRED',
        "This booking's offer window has ended.",
        HttpStatus.CONFLICT,
      );
    }
    // Enforce the offer's minimum bill when staff tell us the bill — the
    // one point where the platform can, since payment happens off-app.
    // Not redeemed, so staff can correct a typo or the table can add to
    // the order and try again.
    const minSpend = claim.minSpendPaiseSnapshot;
    if (
      billAmountPaise !== undefined &&
      minSpend &&
      billAmountPaise < minSpend
    ) {
      throw new AppException(
        'BILL_BELOW_MINIMUM',
        `This offer needs a minimum bill of ₹${minSpend / 100}.`,
        HttpStatus.CONFLICT,
        { minSpendPaise: minSpend },
      );
    }
    // Conditional on still being `claimed`, so two staff phones redeeming
    // the same code at once can't both succeed (check-then-update above
    // alone leaves that window open).
    const { count } = await this.prisma.claim.updateMany({
      where: { id: claim.id, status: 'claimed' },
      data: {
        status: 'redeemed',
        redeemedAt: new Date(),
        billAmountPaise: billAmountPaise ?? null,
      },
    });
    if (count === 0) {
      throw new AppException(
        'CLAIM_ALREADY_PROCESSED',
        'This booking was just redeemed.',
        HttpStatus.CONFLICT,
      );
    }
    this.notifyClaimChanged(claim);
    return this.prisma.claim.findUniqueOrThrow({
      where: { id: claim.id },
      include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
    });
  }

  private async isOwnedByCaller(
    restaurantId: string,
    ownerUserId: string,
  ): Promise<boolean> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });
    return restaurant?.ownerUserId === ownerUserId;
  }
}
