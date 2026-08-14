import { cache } from 'react';
import { cookies } from 'next/headers';
import { contactExists } from '@/db/queries';
import { SESSION_COOKIE } from './constants';
import {
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './token';

/**
 * Session management: a signed JWT (see token.ts) stored in an httpOnly
 * cookie. No session table — but a token is only honored while its contact
 * still exists in the database, so deleting a contact (= deleting the
 * account) invalidates its live sessions on the next request.
 */

/** Authenticated session data exposed to the app. */
export type Session = SessionPayload;

/** Signs a new session JWT and sets the session cookie. */
export async function createSession(
  contactId: number,
  email: string,
): Promise<void> {
  const token = await signSessionToken(contactId, email);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Secure cookies require HTTPS; local dev runs on plain http.
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Reads and verifies the session cookie. Returns null for missing, expired,
 * or tampered tokens AND for tokens of contacts that no longer exist — all
 * of these mean "anonymous request". Wrapped in React cache() so layout and
 * page sharing a request pay for the existence check once.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  // Ghost-session guard: the account may have been deleted after sign-in.
  if (!(await contactExists(payload.contactId))) return null;

  return payload;
});

/** Clears the session cookie (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}