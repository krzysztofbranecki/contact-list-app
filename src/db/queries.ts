import { asc, eq } from 'drizzle-orm';
import { db } from './index';
import { categories, contacts, subcategories } from './schema';

/**
 * Single data-access point for the application.
 *
 * Security invariant: public-facing queries select an explicit column list
 * that NEVER includes `password_hash`. The only function allowed to read the
 * hash is `getContactWithHashByEmail`, consumed exclusively by the login
 * action.
 */

/** Basic data shown on the public contact list. */
export async function listContacts() {
  return db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      categoryName: categories.name,
    })
    .from(contacts)
    .innerJoin(categories, eq(contacts.categoryId, categories.id))
    .orderBy(asc(contacts.lastName), asc(contacts.firstName));
}

/**
 * Full contact details for the public detail page and the edit form —
 * everything EXCEPT the password hash.
 */
export async function getContact(id: number) {
  const rows = await db
    .select({
      id: contacts.id,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      email: contacts.email,
      categoryId: contacts.categoryId,
      subcategoryId: contacts.subcategoryId,
      subcategoryOther: contacts.subcategoryOther,
      phone: contacts.phone,
      birthDate: contacts.birthDate,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
      categoryCode: categories.code,
      categoryName: categories.name,
      subcategoryName: subcategories.name,
    })
    .from(contacts)
    .innerJoin(categories, eq(contacts.categoryId, categories.id))
    .leftJoin(subcategories, eq(contacts.subcategoryId, subcategories.id))
    .where(eq(contacts.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Fetches a contact's credentials by email — FOR AUTHENTICATION ONLY.
 *
 * Never call this from list/detail rendering paths; the returned object
 * contains the bcrypt hash and must not leave the auth layer.
 */
export async function getContactWithHashByEmail(email: string) {
  const rows = await db
    .select({
      id: contacts.id,
      email: contacts.email,
      passwordHash: contacts.passwordHash,
    })
    .from(contacts)
    .where(eq(contacts.email, email))
    .limit(1);
  return rows[0] ?? null;
}

/** Category dictionary, in seed order. */
export async function listCategories() {
  return db.select().from(categories).orderBy(asc(categories.id));
}

/** Dictionary subcategories of one category (only 'business' has any). */
export async function listSubcategories(categoryId: number) {
  return db
    .select({ id: subcategories.id, name: subcategories.name })
    .from(subcategories)
    .where(eq(subcategories.categoryId, categoryId))
    .orderBy(asc(subcategories.name));
}

/** Values accepted by the mutation helpers (hash, never plaintext). */
export interface ContactWriteValues {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string;
  categoryId: number;
  subcategoryId: number | null;
  subcategoryOther: string | null;
  phone: string;
  birthDate: string;
}

/** Inserts a contact (= creates a login account). Returns the new id. */
export async function insertContact(
  values: ContactWriteValues & { passwordHash: string },
) {
  const rows = await db
    .insert(contacts)
    .values(values)
    .returning({ id: contacts.id });
  return rows[0].id;
}

/**
 * Updates a contact. When `passwordHash` is absent the stored credentials
 * stay untouched (empty password field on the edit form = no change).
 */
export async function updateContact(id: number, values: ContactWriteValues) {
  await db
    .update(contacts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(contacts.id, id));
}

/** Deletes a contact (= deletes its login account). */
export async function deleteContact(id: number) {
  await db.delete(contacts).where(eq(contacts.id, id));
}
