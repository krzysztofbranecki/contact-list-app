import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './constants';
import {
  SESSION_TTL_SECONDS,
  signSessionToken,
  verifySessionToken,
  type SessionPayload,
} from './token';

/**
 * Session management: a signed JWT (see token.ts) stored in an httpOnly
 * cookie. Stateless by design — no session table; the signature plus a 24h
 * expiry are the source of truth.
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
 * or tampered tokens — all three mean "anonymous request".
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Clears the session cookie (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}