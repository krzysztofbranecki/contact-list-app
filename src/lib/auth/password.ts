import bcrypt from 'bcryptjs';

/**
 * Password hashing utilities (bcrypt).
 *
 * The contact's password doubles as login credentials (contact = account, see
 * context/changes/contact-list-app/frame.md), so hashes are the only form in
 * which passwords ever touch the database.
 */

/** bcrypt cost factor — keep in sync with src/db/seed.ts. */
const BCRYPT_COST = 12;

/**
 * Pre-computed hash used to equalize login timing when the email does not
 * exist: we still run one bcrypt comparison so attackers cannot distinguish
 * "unknown email" from "wrong password" by response time.
 */
export const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-dummy', BCRYPT_COST);

/** Hashes a plaintext password for storage. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/** Verifies a plaintext password against a stored bcrypt hash. */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
