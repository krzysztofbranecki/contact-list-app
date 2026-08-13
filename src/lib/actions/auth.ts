'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getContactWithHashByEmail } from '@/db/queries';
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';

/**
 * Authentication Server Actions: login and logout.
 *
 * Anti-enumeration policy: a single generic error message for every failure
 * (unknown email, wrong password, malformed input) and a dummy bcrypt
 * comparison when the email does not exist, so response timing does not leak
 * which emails have accounts.
 */

/** Generic failure message — intentionally identical for all causes. */
const LOGIN_ERROR = 'Nieprawidłowy adres e-mail lub hasło.';

/** Result shape consumed by useActionState on the login form. */
export interface LoginState {
  error: string | null;
}

const loginSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

/**
 * Verifies credentials against the contacts table and starts a session.
 * Redirects to the contact list on success.
 */
export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: LOGIN_ERROR };
  }

  const contact = await getContactWithHashByEmail(parsed.data.email);

  // Always run exactly one bcrypt comparison (timing equalization).
  const valid = await verifyPassword(
    parsed.data.password,
    contact?.passwordHash ?? DUMMY_HASH,
  );

  if (!contact || !valid) {
    return { error: LOGIN_ERROR };
  }

  await createSession(contact.id, contact.email);
  redirect('/contacts');
}

/** Ends the session and returns to the public contact list. */
export async function logout(): Promise<void> {
  await destroySession();
  redirect('/contacts');
}