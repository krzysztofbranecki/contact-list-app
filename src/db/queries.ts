import { eq } from 'drizzle-orm';
import { db } from './index';
import { contacts } from './schema';

/**
 * Single data-access point for the application.
 *
 * Security invariant: public-facing queries select an explicit column list
 * that NEVER includes `password_hash`. The only function allowed to read the
 * hash is `getContactWithHashByEmail`, consumed exclusively by the login
 * action.
 */

/**
 * Fetches a contact's credentials by email — FOR AUTHENTICATION ONLY.
 *
 * Never call this from list/detail rendering paths; the returned object
 * contains the bcrypt hash and must not leave the auth layer.
 */
export async function getContactWithHashByEmail(email: string) {
  const rows = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      passwordHash: contacts.passwordHash,
    })
    .from(contacts)
    .where(eq(contacts.email, email))
    .limit(1);
  return rows[0] ?? null;
}