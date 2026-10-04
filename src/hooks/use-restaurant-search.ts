import { useInfiniteQuery } from '@tanstack/react-query';
import { listRestaurants, type ListRestaurantsParams } from '@/api/endpoints/restaurants';

export function useRestaurantSearch(params: Omit<ListRestaurantsParams, 'cursor'>) {
  return useInfiniteQuery({
    queryKey: ['restaurants', params],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) => listRestaurants({ ...params, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}
