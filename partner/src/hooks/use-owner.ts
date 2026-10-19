import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createOffer,
  getDashboard,
  getOffer,
  getRestaurant,
  listOffers,
  listTodayClaims,
  redeemClaim,
  updateOffer,
  updateRestaurant,
} from '@/api/endpoints/owner';
import type { OfferUpdateInput, OwnerOfferDto } from '@/api/types';

export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: getDashboard });
}

export function useRestaurant() {
  return useQuery({ queryKey: ['restaurant'], queryFn: getRestaurant });
}

/** Name and cuisines also appear on the Home dashboard, so refresh it too. */
export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateRestaurant,
    onSuccess: (restaurant) => {
      queryClient.setQueryData(['restaurant'], restaurant);
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useOffers() {
  return useQuery({ queryKey: ['offers'], queryFn: listOffers });
}

export function useOffer(id: string | undefined) {
  return useQuery({ queryKey: ['offer', id], queryFn: () => getOffer(id as string), enabled: Boolean(id) });
}

export function useTodayClaims() {
  return useQuery({ queryKey: ['claims', 'today'], queryFn: listTodayClaims });
}

/** Offer changes show up on Home (active list + counts), the Offers tab and
 * the offer's own detail cache — refresh all of them. */
function useInvalidateOffers() {
  const queryClient = useQueryClient();
  return (offer: OwnerOfferDto) => {
    queryClient.setQueryData(['offer', offer.id], offer);
    void queryClient.invalidateQueries({ queryKey: ['offers'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };
}

export function useCreateOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({ mutationFn: createOffer, onSuccess: invalidate });
}

export function useUpdateOffer() {
  const invalidate = useInvalidateOffers();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: OfferUpdateInput }) => updateOffer(id, input),
    onSuccess: invalidate,
  });
}

export function useRedeemClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: redeemClaim,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claims'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
