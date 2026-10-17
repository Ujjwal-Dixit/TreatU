import { apiRequest } from '../http-client';
import type { UserDto } from '../types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export function requestOtp(phoneNumber: string): Promise<void> {
  return apiRequest('/auth/otp/request', { method: 'POST', body: { phoneNumber }, auth: false });
}

export function verifyOtp(phoneNumber: string, code: string): Promise<AuthTokens & { user: UserDto }> {
  return apiRequest('/auth/otp/verify', { method: 'POST', body: { phoneNumber, code }, auth: false });
}

export function logout(refreshToken: string): Promise<void> {
  return apiRequest('/auth/logout', { method: 'POST', body: { refreshToken }, auth: false });
}
