// Mirrors backend/docs/architecture/api-contracts.md. Hand-kept in sync
// rather than shared from a workspace package — mobile and backend are
// separate npm projects with no shared-types tooling set up yet. Worth
// promoting to a shared package if the two start drifting.

export interface UserDto {
  id: string;
  phoneNumber: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  createdAt: string;
}

export interface UserStatsDto {
  totalSavedPaise: number;
  offersRedeemed: number;
  restaurantsVisited: number;
}

export interface MeDto extends UserDto {
  stats: UserStatsDto;
}

export type OfferStatus = 'active' | 'exhausted' | 'expired';

export interface OfferCardDto {
  offerAvailabilityId: string;
  discountPercentage: number;
  conditionLabel: string;
  /** Owner-written copy from the partner app; may be empty. */
  description: string;
  minSpendPaise: number | null;
  seatsLeft: number;
  status: OfferStatus;
}

export interface RestaurantCardDto {
  id: string;
  name: string;
  coverImageUrl: string;
  cuisines: string[];
  priceTier: 1 | 2 | 3 | 4;
  ratingAvg: number;
  ratingCount: number;
  distanceKm: number;
  isFavorited: boolean;
  bestActiveOffer: OfferCardDto | null;
}

export interface RestaurantDetailDto extends Omit<RestaurantCardDto, 'bestActiveOffer'> {
  description: string;
  addressLine: string;
  isOpen: boolean;
  closesAtLabel: string;
  galleryUrls: string[];
  activeOffers: OfferCardDto[];
  pastOffersToday: OfferCardDto[];
}

export interface CategoryDto {
  key: string;
  label: string;
  iconEmoji: string;
}

export interface HomeFeedSectionDto {
  key: string;
  title: string;
  restaurants: RestaurantCardDto[];
}

export interface HomeFeedDto {
  categories: CategoryDto[];
  sections: HomeFeedSectionDto[];
}

export interface RestaurantListPageDto {
  items: RestaurantCardDto[];
  nextCursor: string | null;
}

export type ClaimStatus = 'claimed' | 'redeemed' | 'expired' | 'cancelled';

export interface ClaimRestaurantDto {
  id: string;
  name: string;
  coverImageUrl: string;
  cuisines: string[];
  addressLine: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
}

export interface ClaimDto {
  id: string;
  restaurant: ClaimRestaurantDto;
  redemptionCode: string;
  discountPercentage: number;
  minSpendPaise: number | null;
  /** Recorded by restaurant staff at redemption; null if they skipped it. */
  billAmountPaise: number | null;
  /** Actual discount received — known only when the bill was recorded. */
  savedPaise: number | null;
  status: ClaimStatus;
  claimedAt: string;
  expiresAt: string;
}
