import { apiRequest } from '../http-client';
import type { MeDto } from '../types';

export function getMe(): Promise<MeDto> {
  return apiRequest('/me');
}

export function updateMe(input: { name?: string; avatarUrl?: string }): Promise<MeDto> {
  return apiRequest('/me', { method: 'PATCH', body: input });
}
