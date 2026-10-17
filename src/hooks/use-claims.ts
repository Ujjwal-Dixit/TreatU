import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelClaim, claimOffer, getClaim, listClaims } from '@/api/endpoints/claims';
import { useDistanceOrigin } from '@/location/distance-origin';

export function useClaims() {
  return useQuery({ queryKey: ['claims'], queryFn: () => listClaims() });
}

export function useClaim(id: string) {
  const origin = useDistanceOrigin();
  return useQuery({ queryKey: ['claim', id, origin], queryFn: () => getClaim(id, origin), enabled: Boolean(id) });
}

export function useClaimOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: claimOffer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claims'] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant'] });
      void queryClient.invalidateQueries({ queryKey: ['home-feed'] });
    },
  });
}

export function useCancelClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelClaim,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['claims'] });
      void queryClient.invalidateQueries({ queryKey: ['restaurant'] });
    },
  });
}
