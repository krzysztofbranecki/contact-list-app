'use client';

import { useActionState } from 'react';
import { login, type LoginState } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Field, FieldErrors, Input } from '@/components/ui/field';

/**
 * Login form (client component) — wires the form to the `login` Server
 * Action via useActionState so validation errors render without a full page
 * reload.
 */

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-sm flex-col gap-4">
      <Field label="Adres e-mail">
        <Input type="email" name="email" required autoComplete="email" />
      </Field>
      <Field label="Hasło">
        <Input
          type="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </Field>
      <FieldErrors messages={state.error ? [state.error] : undefined} />
      <Button type="submit" disabled={pending}>
        {pending ? 'Logowanie…' : 'Zaloguj się'}
      </Button>
    </form>
  );
}