'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  deleteContact,
  insertContact,
  listCategories,
  listSubcategories,
  updateContact,
  type ContactWriteValues,
} from '@/db/queries';
import { requireAuth } from '@/lib/auth/guard';
import { hashPassword } from '@/lib/auth/password';
import { destroySession } from '@/lib/auth/session';
import {
  contactCreateSchema,
  contactUpdateSchema,
} from '@/lib/validation/contact';

/**
 * Contact CRUD Server Actions.
 *
 * Every action starts with requireAuth() — this is the security boundary for
 * mutations (the route proxy only handles UX redirects). Validation runs
 * server-side against the category dictionary loaded from the database.
 */

/**
 * Form state consumed by useActionState: per-field errors plus the submitted
 * values (minus the password), echoed back so the form can re-populate its
 * fields — React 19 resets uncontrolled inputs after every action.
 */
export interface ContactFormState {
  errors: Record<string, string[]>;
  values?: Record<string, string>;
  /**
   * Changes on every failed submit — the form uses it as a React key to
   * remount its fields, so the echoed values reliably replace the DOM state
   * left behind by React's automatic post-action form reset.
   */
  serial?: number;
}

/** Postgres error codes surfaced as form errors instead of a crash. */
const UNIQUE_VIOLATION = '23505';
const FK_VIOLATION = '23503';
const CHECK_VIOLATION = '23514';

/**
 * Maps a thrown DB error to a form error. Constraint violations get a
 * targeted message; anything else is logged server-side and surfaced as a
 * generic Polish error — a mutation must never end in an unhandled 500.
 */
function mapDbError(err: unknown, formData: FormData): ContactFormState {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code?: string }).code
      : undefined;

  const errors: Record<string, string[]> =
    code === UNIQUE_VIOLATION
      ? { email: ['Kontakt z tym adresem e-mail już istnieje'] }
      : code === FK_VIOLATION || code === CHECK_VIOLATION
        ? { form: ['Niespójne dane formularza — odśwież stronę i spróbuj ponownie'] }
        : { form: ['Wystąpił nieoczekiwany błąd. Spróbuj ponownie.'] };

  if (code !== UNIQUE_VIOLATION) {
    console.error('Contact mutation failed:', err);
  }

  return { errors, values: echoValues(formData), serial: Date.now() };
}

/** Loads the dictionaries the validation schema factories need. */
async function loadDictionaries() {
  const categories = await listCategories();
  const business = categories.find((c) => c.code === 'business');
  const businessSubcategories = business
    ? await listSubcategories(business.id)
    : [];
  return {
    categories,
    businessSubcategoryIds: businessSubcategories.map((s) => s.id),
  };
}

/** Extracts the contact fields from FormData in schema-input shape. */
function formValues(formData: FormData) {
  return {
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    password: formData.get('password'),
    categoryId: formData.get('categoryId'),
    subcategoryId: formData.get('subcategoryId'),
    subcategoryOther: formData.get('subcategoryOther'),
    phone: formData.get('phone'),
    birthDate: formData.get('birthDate'),
  };
}

/** Groups Zod issues into a field → messages map. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'form');
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

/**
 * Echo of the submitted fields (password deliberately excluded — it must
 * never round-trip back into HTML).
 */
function echoValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(formValues(formData))) {
    if (key !== 'password' && typeof value === 'string') {
      values[key] = value;
    }
  }
  return values;
}

/** Creates a contact — which is also a new login account. */
export async function createContact(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  await requireAuth();

  const { categories, businessSubcategoryIds } = await loadDictionaries();
  const parsed = contactCreateSchema(categories, businessSubcategoryIds)
    .safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      errors: fieldErrors(parsed.error.issues),
      values: echoValues(formData),
      serial: Date.now(),
    };
  }

  const { password, ...fields } = parsed.data;
  const values: ContactWriteValues & { passwordHash: string } = {
    ...fields,
    subcategoryId: fields.subcategoryId ?? null,
    subcategoryOther: fields.subcategoryOther ?? null,
    passwordHash: await hashPassword(password),
  };

  try {
    await insertContact(values);
  } catch (err) {
    return mapDbError(err, formData);
  }

  revalidatePath('/contacts');
  redirect('/contacts');
}

/**
 * Updates a contact. An empty password field keeps the current credentials;
 * a filled one rotates them (the contact signs in with the new password).
 *
 * Password changes are restricted to the account owner: only the signed-in
 * contact editing their own record may set a new password. The edit form
 * hides the field for other records, but this server-side check is the
 * actual boundary.
 */
export async function editContact(
  id: number,
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const session = await requireAuth();

  const { categories, businessSubcategoryIds } = await loadDictionaries();
  const parsed = contactUpdateSchema(categories, businessSubcategoryIds)
    .safeParse(formValues(formData));
  if (!parsed.success) {
    return {
      errors: fieldErrors(parsed.error.issues),
      values: echoValues(formData),
      serial: Date.now(),
    };
  }

  const { password, ...fields } = parsed.data;

  if (password !== undefined && session.contactId !== id) {
    return {
      errors: { password: ['Hasło może zmienić tylko właściciel konta'] },
      values: echoValues(formData),
      serial: Date.now(),
    };
  }
  const values: ContactWriteValues = {
    ...fields,
    subcategoryId: fields.subcategoryId ?? null,
    subcategoryOther: fields.subcategoryOther ?? null,
    ...(password !== undefined
      ? { passwordHash: await hashPassword(password) }
      : {}),
  };

  try {
    await updateContact(id, values);
  } catch (err) {
    return mapDbError(err, formData);
  }

  revalidatePath('/contacts');
  revalidatePath(`/contacts/${id}`);
  redirect(`/contacts/${id}`);
}

/** Deletes a contact — and with it, its login account. */
export async function removeContact(id: number): Promise<void> {
  const session = await requireAuth();
  await deleteContact(id);
  // Self-delete: clear the now-dead session cookie immediately instead of
  // letting the ghost-session guard reject it on every subsequent request.
  if (session.contactId === id) {
    await destroySession();
  }
  revalidatePath('/contacts');
  redirect('/contacts');
}