import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/** Used for both OTP codes and refresh tokens — same "hash a short-lived
 * server-issued secret" shape, so one KDF utility covers both instead of
 * pulling in bcrypt for one and rolling something else for the other. */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifySecret(
  secret: string,
  stored: string,
): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derivedKey = (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
  const hashBuffer = Buffer.from(hash, 'hex');
  if (hashBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(derivedKey, hashBuffer);
}
