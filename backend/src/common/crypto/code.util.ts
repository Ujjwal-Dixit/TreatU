import { randomInt } from 'node:crypto';

// Excludes 0/O and 1/I — characters a restaurant staff member could
// misread off a phone screen.
const REDEMPTION_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRedemptionCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code +=
      REDEMPTION_CODE_ALPHABET[randomInt(REDEMPTION_CODE_ALPHABET.length)];
  }
  return code;
}

export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}
