import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getRestaurant } from '@/api/endpoints/restaurants';
import { useDistanceOrigin } from '@/location/distance-origin';

export function useRestaurantDetail(id: string) {
  const origin = useDistanceOrigin();
  return useQuery({
    queryKey: ['restaurant', id, origin],
    queryFn: () => getRestaurant(id, origin),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });
}
