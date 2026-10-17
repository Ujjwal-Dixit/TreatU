import type { Restaurant } from '@prisma/client';
import {
  haversineDistanceKm,
  type Coordinates,
} from '../../common/geo/haversine.util';
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
  /** From the customer's location when the app sent one, else the city
   * centre — see resolveDistanceOrigin. */
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
  origin: Coordinates,
): BaseRestaurantFields {
  const distanceKm = haversineDistanceKm(origin, {
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
  opts: {
    isFavorited: boolean;
    bestActiveOffer: OfferCardDto | null;
    origin: Coordinates;
  },
): RestaurantCardDto {
  return {
    ...toBaseFields(restaurant, opts.isFavorited, opts.origin),
    bestActiveOffer: opts.bestActiveOffer,
  };
}

export function toRestaurantDetailDto(
  restaurant: Restaurant,
  opts: {
    isFavorited: boolean;
    activeOffers: OfferCardDto[];
    pastOffersToday: OfferCardDto[];
    origin: Coordinates;
  },
): RestaurantDetailDto {
  const parsedHours = operatingHoursSchema.safeParse(restaurant.operatingHours);
  const openStatus = computeOpenStatus(
    parsedHours.success ? parsedHours.data : [],
    restaurant.timezone,
  );

  return {
    ...toBaseFields(restaurant, opts.isFavorited, opts.origin),
    description: restaurant.description,
    addressLine: restaurant.addressLine,
    isOpen: openStatus.isOpen,
    closesAtLabel: openStatus.closesAtLabel,
    galleryUrls: restaurant.galleryUrls,
    activeOffers: opts.activeOffers,
    pastOffersToday: opts.pastOffersToday,
  };
}
