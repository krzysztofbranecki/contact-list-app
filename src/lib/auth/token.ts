import { SignJWT, jwtVerify } from 'jose';

/**
 * Pure JWT session-token logic (jose, HS256) — no Next.js APIs, so it is
 * unit-testable without a request context. Cookie handling lives in
 * session.ts, which delegates here.
 */

/** Session lifetime: 24 hours, both for the JWT and the cookie. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24;

/** Verified session data carried by the token. */
export interface SessionPayload {
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

/**
 * Signs a session JWT. The payload intentionally carries only the contact id
 * and email — it is signed (tamper-proof) but NOT encrypted, so nothing
 * sensitive beyond identifiers may ever be added here.
 */
export async function signSessionToken(
  contactId: number,
  email: string,
  ttlSeconds: number = SESSION_TTL_SECONDS,
): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(contactId))
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(secretKey());
}

/**
 * Verifies a session JWT. Returns null for expired, tampered, or malformed
 * tokens — callers treat all three identically (anonymous request).
 */
export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
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