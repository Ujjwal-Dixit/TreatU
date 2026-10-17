import { apiRequest } from '../http-client';
import type { DistanceOrigin } from '@/location/distance-origin';
import type { HomeFeedDto, RestaurantCardDto, RestaurantDetailDto, RestaurantListPageDto } from '../types';

/** `?lat=&lng=` when we know roughly where the customer is; omitted
 * otherwise, and the server measures from the city centre. */
export function originQuery(origin: DistanceOrigin | null | undefined): { lat?: number; lng?: number } {
  return origin ? { lat: origin.lat, lng: origin.lng } : {};
}

export function getHomeFeed(origin?: DistanceOrigin | null): Promise<HomeFeedDto> {
  return apiRequest('/home-feed', { query: originQuery(origin) });
}

export interface ListRestaurantsParams {
  category?: string;
  search?: string;
  cursor?: string;
  [key: string]: string | undefined;
}

export function listRestaurants(
  params: ListRestaurantsParams = {},
  origin?: DistanceOrigin | null,
): Promise<RestaurantListPageDto> {
  return apiRequest('/restaurants', { query: { ...params, ...originQuery(origin) } });
}

export function getRestaurant(id: string, origin?: DistanceOrigin | null): Promise<RestaurantDetailDto> {
  return apiRequest(`/restaurants/${id}`, { query: originQuery(origin) });
}

export function addFavorite(restaurantId: string): Promise<void> {
  return apiRequest(`/restaurants/${restaurantId}/favorite`, { method: 'POST' });
}

export function removeFavorite(restaurantId: string): Promise<void> {
  return apiRequest(`/restaurants/${restaurantId}/favorite`, { method: 'DELETE' });
}

export function listFavorites(origin?: DistanceOrigin | null): Promise<RestaurantCardDto[]> {
  return apiRequest('/favorites', { query: originQuery(origin) });
}
