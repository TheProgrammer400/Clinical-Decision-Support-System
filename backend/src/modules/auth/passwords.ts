import * as argon2 from 'argon2';
import * as bcrypt from 'bcryptjs';

/**
 * argon2id with the library defaults (m=64MiB, t=3, p=4), which meet the OWASP
 * recommended minimums. Hashes created by the previous bcrypt implementation are still
 * verified and reported as needing a rehash, so users migrate transparently on login.
 */
const ARGON2_OPTIONS = { type: argon2.argon2id } as const;

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

export interface PasswordCheck {
  valid: boolean;
  needsRehash: boolean;
}

export async function verifyPassword(storedHash: string, plain: string): Promise<PasswordCheck> {
  if (isBcryptHash(storedHash)) {
    const valid = await bcrypt.compare(plain, storedHash);
    return { valid, needsRehash: valid };
  }
  try {
    const valid = await argon2.verify(storedHash, plain);
    return { valid, needsRehash: valid && argon2.needsRehash(storedHash) };
  } catch {
    return { valid: false, needsRehash: false };
  }
}

function isBcryptHash(hash: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(hash);
}

let dummyHash: Promise<string> | null = null;

/**
 * Burns roughly the same time as a real verification when the account does not exist, so
 * response timing does not reveal which email addresses are registered.
 */
export async function verifyAgainstDummy(plain: string): Promise<void> {
  dummyHash ??= hashPassword('dummy-password-for-timing-equalisation');
  await argon2.verify(await dummyHash, plain).catch(() => false);
}
