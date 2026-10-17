import { apiRequest } from '../http-client';
import type { ClaimDto, ClaimStatus } from '../types';
import type { DistanceOrigin } from '@/location/distance-origin';
import { originQuery } from './restaurants';

export function claimOffer(offerAvailabilityId: string): Promise<ClaimDto> {
  return apiRequest(`/offer-availabilities/${offerAvailabilityId}/claim`, { method: 'POST' });
}

export function listClaims(status?: ClaimStatus): Promise<ClaimDto[]> {
  return apiRequest('/claims', { query: { status } });
}

export function getClaim(id: string, origin?: DistanceOrigin | null): Promise<ClaimDto> {
  return apiRequest(`/claims/${id}`, { query: originQuery(origin) });
}

export function cancelClaim(id: string): Promise<void> {
  return apiRequest(`/claims/${id}/cancel`, { method: 'POST' });
}
