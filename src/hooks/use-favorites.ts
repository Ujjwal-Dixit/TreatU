import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addFavorite, listFavorites, removeFavorite } from '@/api/endpoints/restaurants';

export function useFavorites() {
  return useQuery({ queryKey: ['favorites'], queryFn: listFavorites });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ restaurantId, isFavorited }: { restaurantId: string; isFavorited: boolean }) =>
      isFavorited ? removeFavorite(restaurantId) : addFavorite(restaurantId),
    onSuccess: () => {
      // isFavorited is embedded in restaurant cards across several caches
      // (home feed, search results, detail, the favorites list itself) —
      // invalidating all of them is simpler and still correct at this
      // scale, versus hand-patching each cache entry.
      void queryClient.invalidateQueries({ queryKey: ['home-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      void queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });
}
