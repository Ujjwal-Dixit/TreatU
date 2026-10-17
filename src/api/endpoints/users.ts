import { apiRequest } from '../http-client';
import type { MeDto, UserDto } from '../types';

export function getMe(): Promise<MeDto> {
  return apiRequest('/me');
}

/** Returns the plain user — PATCH /me doesn't recompute stats; refetch
 * `['me']` (useMe) afterwards if the screen shows them. */
export function updateMe(input: { name?: string; avatarUrl?: string }): Promise<UserDto> {
  return apiRequest('/me', { method: 'PATCH', body: input });
}
