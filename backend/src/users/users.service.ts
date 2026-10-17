import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

export interface UserStats {
  totalSavedPaise: number;
  offersRedeemed: number;
  restaurantsVisited: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    return user;
  }

  update(id: string, dto: UpdateMeDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  /** Computed on read from Claim, not denormalized — see data-model.md:
   * these three counters are the only "analytics" MVP needs, and they're
   * cheap enough as a live aggregate query at this scale. */
  async getStats(userId: string): Promise<UserStats> {
    const redeemedClaims = await this.prisma.claim.findMany({
      where: { userId, status: 'redeemed' },
      select: {
        discountPercentageSnapshot: true,
        minSpendPaiseSnapshot: true,
        billAmountPaise: true,
        restaurantId: true,
      },
    });

    // Real savings when staff entered the bill at redemption. Otherwise the
    // minimum spend is used as a floor — the customer spent at least that
    // much to qualify — so the figure is never overstated; claims with
    // neither contribute 0. The more restaurants record bills, the closer
    // this gets to exact.
    const totalSavedPaise = redeemedClaims.reduce((sum, claim) => {
      const base = claim.billAmountPaise ?? claim.minSpendPaiseSnapshot ?? 0;
      return sum + Math.round((base * claim.discountPercentageSnapshot) / 100);
    }, 0);

    const restaurantsVisited = new Set(
      redeemedClaims.map((c) => c.restaurantId),
    ).size;

    return {
      totalSavedPaise,
      offersRedeemed: redeemedClaims.length,
      restaurantsVisited,
    };
  }
}
