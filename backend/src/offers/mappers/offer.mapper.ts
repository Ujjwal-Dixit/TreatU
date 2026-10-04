import type { Offer, OfferAvailability } from '@prisma/client';
import { OffersService } from '../offers.service';

export interface OfferCardDto {
  offerAvailabilityId: string;
  discountPercentage: number;
  conditionLabel: string;
  minSpendPaise: number | null;
  seatsLeft: number;
  status: 'active' | 'exhausted' | 'expired';
}

export function toOfferCardDto(
  offersService: OffersService,
  offer: Offer,
  availability: OfferAvailability,
  currentTime: string,
  overrideStatus?: OfferCardDto['status'],
): OfferCardDto {
  const seatsLeft = Math.max(
    availability.capacityTotal - availability.capacityClaimed,
    0,
  );
  const status = overrideStatus ?? (seatsLeft === 0 ? 'exhausted' : 'active');

  return {
    offerAvailabilityId: availability.id,
    discountPercentage: offer.discountPercentage,
    conditionLabel: offersService.buildConditionLabel(offer, currentTime),
    minSpendPaise: offer.minSpendPaise,
    seatsLeft,
    status,
  };
}
