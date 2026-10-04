import type { Claim } from '@prisma/client';

export interface ClaimDto {
  id: string;
  restaurant: { id: string; name: string; coverImageUrl: string };
  redemptionCode: string;
  discountPercentage: number;
  minSpendPaise: number | null;
  status: string;
  claimedAt: string;
  expiresAt: string;
}

type ClaimWithRestaurant = Claim & {
  restaurant: { id: string; name: string; coverImageUrl: string };
};

export function toClaimDto(claim: ClaimWithRestaurant): ClaimDto {
  return {
    id: claim.id,
    restaurant: claim.restaurant,
    redemptionCode: claim.redemptionCode,
    discountPercentage: claim.discountPercentageSnapshot,
    minSpendPaise: claim.minSpendPaiseSnapshot,
    status: claim.status,
    claimedAt: claim.claimedAt.toISOString(),
    expiresAt: claim.expiresAt.toISOString(),
  };
}
