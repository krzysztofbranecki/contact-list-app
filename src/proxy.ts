import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/auth/constants';

/**
 * Route proxy (Next.js 16 successor of middleware.ts).
 *
 * UX-only guard: redirects visitors without a session cookie away from the
 * contact form pages. It deliberately checks only cookie PRESENCE — full JWT
 * verification happens in requireAuth() inside every mutating Server Action,
 * which is the actual security boundary. A forged cookie gets past this
 * redirect but fails there.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(SESSION_COOKIE)) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/contacts/new', '/contacts/:id/edit'],
};