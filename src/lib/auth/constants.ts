/**
 * Auth constants shared between server modules and the proxy.
 *
 * Kept in a dependency-free module so `src/proxy.ts` (edge runtime) can
 * import the cookie name without pulling in `next/headers` or jose.
 */

/** Name of the httpOnly session cookie. */
export const SESSION_COOKIE = 'session';
