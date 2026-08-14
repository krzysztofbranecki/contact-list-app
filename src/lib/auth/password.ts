import bcrypt from 'bcryptjs';

/**
 * Password hashing utilities (bcrypt).
 *
 * The contact's password doubles as login credentials (contact = account, see
 * context/changes/contact-list-app/frame.md), so hashes are the only form in
 * which passwords ever touch the database.
 */

/** bcrypt cost factor — single source of truth, imported by the seed. */
export const BCRYPT_COST = 12;

/**
 * Pre-computed constant hash (bcrypt, cost 12, of a throwaway string) used to
 * equalize login timing when the email does not exist: we still run one
 * bcrypt comparison so attackers cannot distinguish "unknown email" from
 * "wrong password" by response time. A constant instead of hashSync at module
 * load — computing it here would block the event loop ~230 ms on cold start.
 */
export const DUMMY_HASH =
  '$2b$12$/BrXiJDeugxl760NsKVQNujuKDxRRaUH65v5C9f/2GHE0YOYl1sHm';

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
