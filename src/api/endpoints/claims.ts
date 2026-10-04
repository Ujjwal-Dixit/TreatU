import { apiRequest } from '../http-client';
import type { ClaimDto, ClaimStatus } from '../types';

export function claimOffer(offerAvailabilityId: string): Promise<ClaimDto> {
  return apiRequest(`/offer-availabilities/${offerAvailabilityId}/claim`, { method: 'POST' });
}

export function listClaims(status?: ClaimStatus): Promise<ClaimDto[]> {
  return apiRequest('/claims', { query: { status } });
}

export function getClaim(id: string): Promise<ClaimDto> {
  return apiRequest(`/claims/${id}`);
}

export function cancelClaim(id: string): Promise<void> {
  return apiRequest(`/claims/${id}/cancel`, { method: 'POST' });
}
