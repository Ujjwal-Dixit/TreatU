import { apiRequest } from '../http-client';
import type {
  OfferInput,
  OfferUpdateInput,
  OwnerClaimDto,
  OwnerDashboardDto,
  OwnerOfferDto,
  RestaurantDto,
  RestaurantUpdateInput,
} from '../types';

const BASE = '/restaurant-owner';

export function getDashboard(): Promise<OwnerDashboardDto> {
  return apiRequest(`${BASE}/dashboard`);
}

export function getRestaurant(): Promise<RestaurantDto> {
  return apiRequest(`${BASE}/restaurant`);
}

export function updateRestaurant(input: RestaurantUpdateInput): Promise<RestaurantDto> {
  return apiRequest(`${BASE}/restaurant`, { method: 'PATCH', body: input });
}

export function listOffers(): Promise<OwnerOfferDto[]> {
  return apiRequest(`${BASE}/offers`);
}

export function getOffer(id: string): Promise<OwnerOfferDto> {
  return apiRequest(`${BASE}/offers/${id}`);
}

export function createOffer(input: OfferInput): Promise<OwnerOfferDto> {
  return apiRequest(`${BASE}/offers`, { method: 'POST', body: input });
}

export function updateOffer(id: string, input: OfferUpdateInput): Promise<OwnerOfferDto> {
  return apiRequest(`${BASE}/offers/${id}`, { method: 'PATCH', body: input });
}

export function listTodayClaims(): Promise<OwnerClaimDto[]> {
  return apiRequest(`${BASE}/claims/today`);
}

export interface RedeemInput {
  code: string;
  /** Optional — records the customer's real savings and lets the server
   * enforce the offer's minimum bill. */
  billAmountPaise?: number;
}

export function redeemClaim(input: RedeemInput): Promise<OwnerClaimDto> {
  return apiRequest(`${BASE}/claims/redeem`, { method: 'POST', body: input });
}
