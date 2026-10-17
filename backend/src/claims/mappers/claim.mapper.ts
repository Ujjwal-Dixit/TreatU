import type { Claim } from '@prisma/client';
import {
  haversineDistanceKm,
  type Coordinates,
} from '../../common/geo/haversine.util';
import { LAUNCH_CITY } from '../../config/city.config';

export interface ClaimRestaurantDto {
  id: string;
  name: string;
  coverImageUrl: string;
  cuisines: string[];
  addressLine: string;
  latitude: number;
  longitude: number;
  /** Same basis as RestaurantCardDto.distanceKm — see resolveDistanceOrigin. */
  distanceKm: number;
}

export interface ClaimDto {
  id: string;
  restaurant: ClaimRestaurantDto;
  redemptionCode: string;
  discountPercentage: number;
  minSpendPaise: number | null;
  /** Entered by staff at redemption; null if not recorded. */
  billAmountPaise: number | null;
  /** Discount actually received — only known when the bill was recorded. */
  savedPaise: number | null;
  status: string;
  claimedAt: string;
  expiresAt: string;
}

/** Restaurant-side view of a claim: adds who claimed it. The phone number
 * is reduced to its last 4 digits — enough for staff to match a walk-in,
 * without handing every customer's full number to every restaurant. */
export interface OwnerClaimDto extends ClaimDto {
  customer: { name: string; phoneLast4: string };
}

type ClaimWithRestaurant = Claim & {
  restaurant: Omit<ClaimRestaurantDto, 'distanceKm'>;
};

export function toClaimDto(
  claim: ClaimWithRestaurant,
  origin: Coordinates = LAUNCH_CITY.center,
): ClaimDto {
  const { restaurant } = claim;
  return {
    id: claim.id,
    restaurant: {
      ...restaurant,
      distanceKm: Number(haversineDistanceKm(origin, restaurant).toFixed(1)),
    },
    redemptionCode: claim.redemptionCode,
    discountPercentage: claim.discountPercentageSnapshot,
    minSpendPaise: claim.minSpendPaiseSnapshot,
    billAmountPaise: claim.billAmountPaise,
    savedPaise:
      claim.billAmountPaise === null
        ? null
        : Math.round(
            (claim.billAmountPaise * claim.discountPercentageSnapshot) / 100,
          ),
    status: claim.status,
    claimedAt: claim.claimedAt.toISOString(),
    expiresAt: claim.expiresAt.toISOString(),
  };
}

export function toOwnerClaimDto(
  claim: ClaimWithRestaurant & {
    user: { name: string; phoneNumber: string };
  },
): OwnerClaimDto {
  return {
    ...toClaimDto(claim),
    customer: {
      name: claim.user.name,
      phoneLast4: claim.user.phoneNumber.slice(-4),
    },
  };
}
