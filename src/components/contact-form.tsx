'use client';

import { useActionState, useState } from 'react';
import type { ContactFormState } from '@/lib/actions/contacts';
import { Button } from '@/components/ui/button';
import { Field, FieldErrors, Input, Select } from '@/components/ui/field';

/**
 * Shared create/edit contact form (client component).
 *
 * The subcategory field is conditional on the selected category's CODE:
 * business → dictionary <select>, other → free-text input, private → hidden.
 * Server-side Zod validation is the source of truth; errors come back per
 * field through useActionState.
 */

interface CategoryOption {
  id: number;
  code: string;
  name: string;
}

interface SubcategoryOption {
  id: number;
  name: string;
}

interface ContactFormProps {
  action: (
    prev: ContactFormState,
    formData: FormData,
  ) => Promise<ContactFormState>;
  categories: CategoryOption[];
  /** Dictionary subcategories of the 'business' category. */
  businessSubcategories: SubcategoryOption[];
  mode: 'create' | 'edit';
  defaults?: {
    firstName: string;
    lastName: string;
    email: string;
    categoryId: number;
    subcategoryId: number | null;
    subcategoryOther: string | null;
    phone: string;
    birthDate: string;
  };
}

const initialState: ContactFormState = { errors: {} };

export function ContactForm({
  action,
  categories,
  businessSubcategories,
  mode,
  defaults,
}: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [categoryId, setCategoryId] = useState<number | ''>(
    defaults?.categoryId ?? '',
  );

  const selectedCode = categories.find((c) => c.id === categoryId)?.code;

  /**
   * React 19 resets uncontrolled inputs after every action, so on a failed
   * submit we re-populate fields from the values the action echoed back
   * (they become the new defaultValue in the same render as the reset).
   */
  const value = (field: string, fallback?: string | null) =>
    state.values?.[field] ?? fallback ?? undefined;

  return (
    <form
      key={state.serial ?? 0}
      action={formAction}
      className="flex w-full max-w-md flex-col gap-4"
    >
      {/* Safety net for errors not tied to any rendered field. */}
      <FieldErrors messages={state.errors.form} />

      <Field label="Imię" errors={state.errors.firstName}>
        <Input
          name="firstName"
          defaultValue={value('firstName', defaults?.firstName)}
          required
        />
      </Field>

      <Field label="Nazwisko" errors={state.errors.lastName}>
        <Input
          name="lastName"
          defaultValue={value('lastName', defaults?.lastName)}
          required
        />
      </Field>

      <Field label="Adres e-mail" errors={state.errors.email}>
        <Input
          type="email"
          name="email"
          defaultValue={value('email', defaults?.email)}
          required
        />
      </Field>

      <Field
        label={mode === 'create' ? 'Hasło' : 'Nowe hasło (puste = bez zmiany)'}
        errors={state.errors.password}
      >
        {/* Never prefilled — the current password hash never reaches the client. */}
        <Input
          type="password"
          name="password"
          required={mode === 'create'}
          autoComplete="new-password"
        />
      </Field>

      <Field label="Kategoria" errors={state.errors.categoryId}>
        <Select
          name="categoryId"
          value={categoryId}
          onChange={(e) =>
            setCategoryId(e.target.value === '' ? '' : Number(e.target.value))
          }
          required
        >
          <option value="">— wybierz —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {selectedCode === 'business' && (
        <Field
          label="Podkategoria (słownik)"
          errors={state.errors.subcategoryId}
        >
          <Select
            name="subcategoryId"
            defaultValue={
              value('subcategoryId', defaults?.subcategoryId?.toString()) ?? ''
            }
            required
          >
            <option value="">— wybierz —</option>
            {businessSubcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {selectedCode === 'other' && (
        <Field
          label="Podkategoria (dowolna)"
          errors={state.errors.subcategoryOther}
        >
          <Input
            name="subcategoryOther"
            defaultValue={
              value('subcategoryOther', defaults?.subcategoryOther) ?? ''
            }
            required
          />
        </Field>
      )}

      <Field label="Telefon" errors={state.errors.phone}>
        <Input
          type="tel"
          name="phone"
          defaultValue={value('phone', defaults?.phone)}
          required
        />
      </Field>

      <Field label="Data urodzenia" errors={state.errors.birthDate}>
        <Input
          type="date"
          name="birthDate"
          defaultValue={value('birthDate', defaults?.birthDate)}
          required
        />
      </Field>

      <Button type="submit" disabled={pending}>
        {pending
          ? 'Zapisywanie…'
          : mode === 'create'
            ? 'Dodaj kontakt'
            : 'Zapisz zmiany'}
      </Button>
    </form>
  );
}