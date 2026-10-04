import { useQuery } from '@tanstack/react-query';
import { getRestaurant } from '@/api/endpoints/restaurants';

export function useRestaurantDetail(id: string) {
  return useQuery({ queryKey: ['restaurant', id], queryFn: () => getRestaurant(id), enabled: Boolean(id) });
}
