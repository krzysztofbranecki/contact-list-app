import { describe, expect, it } from 'vitest';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('Haslo123!');
    expect(await verifyPassword('Haslo123!', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('Haslo123!');
    expect(await verifyPassword('Haslo124!', hash)).toBe(false);
  });

  it('produces salted (non-deterministic) hashes', async () => {
    const [a, b] = await Promise.all([
      hashPassword('Haslo123!'),
      hashPassword('Haslo123!'),
    ]);
    expect(a).not.toBe(b);
  });

  it('exposes a bcrypt-shaped dummy hash for timing equalization', async () => {
    expect(DUMMY_HASH).toMatch(/^\$2[aby]\$/);
    // Comparing against the dummy must simply fail, never throw.
    expect(await verifyPassword('anything', DUMMY_HASH)).toBe(false);
  });
});