import crypto from 'node:crypto';
import { promisify } from 'util';

const scryptAsync = promisify(crypto.scrypt);

/**
 * Verify a submitted plaintext password against a stored scrypt hash.
 * Stored format: scrypt:<saltHex>:<hashHex>
 * Returns false on any malformed input or mismatch.
 */
export async function verifyPassword(submitted: string, stored: string): Promise<boolean> {
  try {
    if (!stored || !submitted) return false;
    const parts = stored.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
    const [, saltHex, hashHex] = parts;
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    if (salt.length === 0 || expectedHash.length === 0) return false;

    const actualHash = (await scryptAsync(submitted, salt, expectedHash.length)) as Buffer;
    return crypto.timingSafeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
