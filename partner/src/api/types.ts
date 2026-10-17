// Mirrors the restaurant-owner section of docs/architecture/api-contracts.md.
// Hand-kept in sync, same as the customer app's src/api/types.ts.

export interface UserDto {
  id: string;
  phoneNumber: string;
  name: string;
  avatarUrl: string | null;
  role: 'customer' | 'restaurant_owner' | 'admin';
  createdAt: string;
}

export type OfferAvailabilityKind = 'today' | 'dateRange' | 'weekly';
export type OfferStatus = 'active' | 'paused' | 'archived';
export type OwnerOfferDisplayStatus = 'active' | 'scheduled' | 'paused' | 'ended';

export interface OwnerOfferDto {
  id: string;
  discountPercentage: number;
  startTime: string;
  endTime: string;
  timeLabel: string;
  minSpendPaise: number | null;
  capacityPerDay: number;
  description: string;
  availability: OfferAvailabilityKind;
  availabilityLabel: string;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number[];
  status: OfferStatus;
  displayStatus: OwnerOfferDisplayStatus;
  today: { claimed: number; total: number } | null;
}

export interface OwnerDashboardDto {
  restaurant: { id: string; name: string; cuisines: string[]; coverImageUrl: string };
  customersToday: number;
  activeOffers: OwnerOfferDto[];
}

export interface OfferInput {
  discountPercentage: number;
  startTime: string;
  endTime: string;
  minSpendPaise: number | null;
  capacityPerDay: number;
  description: string;
  availability: OfferAvailabilityKind;
  startDate?: string;
  endDate?: string;
  daysOfWeek?: number[];
}

export type OfferUpdateInput = Partial<OfferInput> & { status?: OfferStatus };

export type ClaimStatus = 'claimed' | 'redeemed' | 'expired' | 'cancelled';

export interface OwnerClaimDto {
  id: string;
  restaurant: { id: string; name: string; coverImageUrl: string };
  redemptionCode: string;
  discountPercentage: number;
  minSpendPaise: number | null;
  billAmountPaise: number | null;
  savedPaise: number | null;
  status: ClaimStatus;
  claimedAt: string;
  expiresAt: string;
  /** Only present on owner list endpoints, not on the redeem response. */
  customer?: { name: string; phoneLast4: string };
}

export interface RestaurantDto {
  id: string;
  name: string;
  description: string;
  cuisines: string[];
  addressLine: string;
  coverImageUrl: string;
  status: string;
}
