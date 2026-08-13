import { redirect } from 'next/navigation';
import { getSession, type Session } from './session';

/**
 * Authorization guard for mutations and protected pages.
 *
 * This is the PRIMARY line of defense: every mutating Server Action calls it
 * first. The route proxy (src/proxy.ts) only improves UX by redirecting
 * anonymous visitors early — it is not relied upon for security.
 */

/**
 * Returns the current session or redirects to the login page.
 *
 * Calling this at the top of a Server Action aborts the action for anonymous
 * requests (redirect throws), so code below it can assume an authenticated
 * contact.
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}