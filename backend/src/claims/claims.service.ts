import { HttpStatus, Injectable } from '@nestjs/common';
import type { ClaimStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { generateRedemptionCode } from '../common/crypto/code.util';
import {
  getLocalDateTimeParts,
  formatDateOnly,
  zonedTimeToUtc,
} from '../common/time/timezone.util';

const RESTAURANT_CARD_SELECT = {
  id: true,
  name: true,
  coverImageUrl: true,
} as const;

@Injectable()
export class ClaimsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The one place a race condition directly costs the restaurant money —
   * see data-model.md's "Concurrency: claiming an offer" section. The
   * capacity check is a single atomic UPDATE...WHERE, not read-then-write,
   * so it's race-safe even without relying on transaction isolation level. */
  async claim(userId: string, offerAvailabilityId: string) {
    return this.prisma.$transaction(async (tx) => {
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
  }

  listForUser(userId: string, status?: ClaimStatus) {
    return this.prisma.claim.findMany({
      where: { userId, ...(status ? { status } : {}) },
      include: { restaurant: { select: RESTAURANT_CARD_SELECT } },
      orderBy: { claimedAt: 'desc' },
    });
  }

  async getForUser(userId: string, claimId: string) {
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
    await this.prisma.$transaction(async (tx) => {
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

  /** Staff only ever has the code the customer shows them — never a
   * claimId — so redemption is looked up by code, not by path parameter.
   * (An earlier draft of api-contracts.md had this the other way around;
   * corrected to match how the flow actually works in a restaurant.) */
  async redeemByCode(ownerUserId: string, code: string) {
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
    return this.prisma.claim.update({
      where: { id: claim.id },
      data: { status: 'redeemed', redeemedAt: new Date() },
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
