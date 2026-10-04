import type { Restaurant } from '@prisma/client';
import { haversineDistanceKm } from '../../common/geo/haversine.util';
import { LAUNCH_CITY } from '../../config/city.config';
import { computeOpenStatus } from '../../common/time/operating-hours.util';
import { operatingHoursSchema } from '../../common/schemas/operating-hours.schema';
import type { OfferCardDto } from '../../offers/mappers/offer.mapper';

interface BaseRestaurantFields {
  id: string;
  name: string;
  coverImageUrl: string;
  cuisines: string[];
  priceTier: number;
  ratingAvg: number;
  ratingCount: number;
  /** From the fixed city-center point, not the customer's own location —
   * MVP has no GPS input. See LAUNCH_CITY / haversine.util.ts. */
  distanceKm: number;
  isFavorited: boolean;
}

export interface RestaurantCardDto extends BaseRestaurantFields {
  bestActiveOffer: OfferCardDto | null;
}

export interface RestaurantDetailDto extends BaseRestaurantFields {
  description: string;
  addressLine: string;
  isOpen: boolean;
  closesAtLabel: string;
  galleryUrls: string[];
  activeOffers: OfferCardDto[];
  pastOffersToday: OfferCardDto[];
}

function toBaseFields(
  restaurant: Restaurant,
  isFavorited: boolean,
): BaseRestaurantFields {
  const distanceKm = haversineDistanceKm(LAUNCH_CITY.center, {
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  });

  return {
    id: restaurant.id,
    name: restaurant.name,
    coverImageUrl: restaurant.coverImageUrl,
    cuisines: restaurant.cuisines,
    priceTier: restaurant.priceTier,
    ratingAvg: Number(restaurant.ratingAvg),
    ratingCount: restaurant.ratingCount,
    distanceKm: Number(distanceKm.toFixed(1)),
    isFavorited,
  };
}

export function toRestaurantCardDto(
  restaurant: Restaurant,
  opts: { isFavorited: boolean; bestActiveOffer: OfferCardDto | null },
): RestaurantCardDto {
  return {
    ...toBaseFields(restaurant, opts.isFavorited),
    bestActiveOffer: opts.bestActiveOffer,
  };
}

export function toRestaurantDetailDto(
  restaurant: Restaurant,
  opts: {
    isFavorited: boolean;
    activeOffers: OfferCardDto[];
    pastOffersToday: OfferCardDto[];
  },
): RestaurantDetailDto {
  const parsedHours = operatingHoursSchema.safeParse(restaurant.operatingHours);
  const openStatus = computeOpenStatus(
    parsedHours.success ? parsedHours.data : [],
    restaurant.timezone,
  );

  return {
    ...toBaseFields(restaurant, opts.isFavorited),
    description: restaurant.description,
    addressLine: restaurant.addressLine,
    isOpen: openStatus.isOpen,
    closesAtLabel: openStatus.closesAtLabel,
    galleryUrls: restaurant.galleryUrls,
    activeOffers: opts.activeOffers,
    pastOffersToday: opts.pastOffersToday,
  };
}
