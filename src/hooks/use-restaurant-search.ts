import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { listRestaurants, type ListRestaurantsParams } from '@/api/endpoints/restaurants';
import { useDistanceOrigin } from '@/location/distance-origin';

export function useRestaurantSearch(params: Omit<ListRestaurantsParams, 'cursor'>) {
  const origin = useDistanceOrigin();
  return useInfiniteQuery({
    queryKey: ['restaurants', params, origin],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      listRestaurants({ ...params, cursor: pageParam }, origin),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}
