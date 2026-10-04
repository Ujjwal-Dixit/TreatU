import { apiRequest } from '../http-client';
import type { HomeFeedDto, RestaurantCardDto, RestaurantDetailDto, RestaurantListPageDto } from '../types';

export function getHomeFeed(): Promise<HomeFeedDto> {
  return apiRequest('/home-feed');
}

export interface ListRestaurantsParams {
  category?: string;
  search?: string;
  cursor?: string;
  [key: string]: string | undefined;
}

export function listRestaurants(params: ListRestaurantsParams = {}): Promise<RestaurantListPageDto> {
  return apiRequest('/restaurants', { query: params });
}

export function getRestaurant(id: string): Promise<RestaurantDetailDto> {
  return apiRequest(`/restaurants/${id}`);
}

export function addFavorite(restaurantId: string): Promise<void> {
  return apiRequest(`/restaurants/${restaurantId}/favorite`, { method: 'POST' });
}

export function removeFavorite(restaurantId: string): Promise<void> {
  return apiRequest(`/restaurants/${restaurantId}/favorite`, { method: 'DELETE' });
}

export function listFavorites(): Promise<RestaurantCardDto[]> {
  return apiRequest('/favorites');
}
