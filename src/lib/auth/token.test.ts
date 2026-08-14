import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signSessionToken, verifySessionToken } from './token';

/**
 * Session token tests exercise the pure JWT layer (token.ts) — the cookie
 * wrapper in session.ts is a thin adapter over Next.js APIs and is covered
 * by manual verification.
 */

const SECRET = 'test-secret-that-is-long-enough-123456';

beforeEach(() => {
  process.env.SESSION_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.SESSION_SECRET;
});

describe('session token', () => {
  it('round-trips: sign then verify returns the payload', async () => {
    const token = await signSessionToken(42, 'jan.kowalski@example.com');
    const payload = await verifySessionToken(token);
    expect(payload).toEqual({
      contactId: 42,
      email: 'jan.kowalski@example.com',
    });
  });

  it('rejects an expired token', async () => {
    const token = await signSessionToken(42, 'jan@example.com', -60);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it('rejects a tampered token', async () => {
    const token = await signSessionToken(42, 'jan@example.com');
    const tampered = token.slice(0, -2) + (token.endsWith('AA') ? 'BB' : 'AA');
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const token = await signSessionToken(42, 'jan@example.com');
    process.env.SESSION_SECRET = 'a-completely-different-secret-654321';
    expect(await verifySessionToken(token)).toBeNull();
  });

  it('rejects garbage input', async () => {
    expect(await verifySessionToken('not-a-jwt')).toBeNull();
  });
});