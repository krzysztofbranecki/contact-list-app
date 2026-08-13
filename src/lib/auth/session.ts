import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SESSION_COOKIE } from './constants';

/**
 * Session management: a signed JWT (HS256, jose) stored in an httpOnly
 * cookie. Stateless by design — no session table; the signature plus a 24h
 * expiry are the source of truth.
 *
 * The payload intentionally carries only the contact id and email. It is
 * signed (tamper-proof) but NOT encrypted, so nothing sensitive beyond
 * identifiers may ever be added here.
 */

/** Session lifetime: 24 hours, both for the JWT and the cookie. */
const SESSION_TTL_SECONDS = 60 * 60 * 24;

/** Authenticated session data exposed to the app. */
export interface Session {
  /** The signed-in contact's id (JWT `sub`). */
  contactId: number;
  email: string;
}

/** HMAC key derived from the SESSION_SECRET env var. */
function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET env var is not set');
  }
  return new TextEncoder().encode(secret);
}

/** Signs a new session JWT and sets the session cookie. */
export async function createSession(
  contactId: number,
  email: string,
): Promise<void> {
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(contactId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

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
 * Reads and verifies the session cookie.
 *
 * Returns null for missing, expired, or tampered tokens — callers treat all
 * three identically (anonymous request).
 */
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
    });
    if (!payload.sub || typeof payload.email !== 'string') return null;
    return { contactId: Number(payload.sub), email: payload.email };
  } catch {
    // Invalid signature or expired token — treat as signed out.
    return null;
  }
}

/** Clears the session cookie (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
