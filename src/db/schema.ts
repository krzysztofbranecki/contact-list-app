import { sql } from 'drizzle-orm';
import {
  check,
  date,
  foreignKey,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Database schema for the contact list application.
 *
 * Domain model (see context/changes/contact-list-app/frame.md):
 * - A contact IS a login account: its unique email + hashed password are the
 *   credentials used to sign in. Creating/deleting a contact creates/deletes
 *   an account.
 * - Dictionary data (categories, subcategories) lives in the database, as
 *   required by the task specification.
 */

/**
 * Contact categories dictionary.
 *
 * `code` is the stable machine key ('business' | 'private' | 'other') that
 * application logic branches on; `name` is the Polish display label. Never
 * branch on `id` (seed order is not guaranteed) or `name` (display text may
 * change).
 */
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
});

/**
 * Subcategories dictionary — curated entries only.
 *
 * Only the 'business' category has dictionary subcategories (boss, client,
 * ...). Free-text subcategories for the 'other' category are stored on the
 * contact itself (`contacts.subcategory_other`), NOT here, so the dictionary
 * stays clean of user-generated entries.
 */
export const subcategories = pgTable(
  'subcategories',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    name: text('name').notNull(),
  },
  (t) => [
    // Target for the composite FK from contacts: guarantees a chosen
    // subcategory belongs to the chosen category at the database level.
    uniqueIndex('subcategories_category_id_id_idx').on(t.categoryId, t.id),
    // Makes the seed idempotent (upsert by category + name).
    unique('subcategories_category_id_name_unique').on(t.categoryId, t.name),
  ],
);

/**
 * Contacts — each row doubles as a login account.
 *
 * Subcategory rules (enforced in the validation layer, backed by DB
 * constraints below):
 * - business → `subcategoryId` required (dictionary pick), `subcategoryOther` empty
 * - other    → `subcategoryOther` required (free text), `subcategoryId` empty
 * - private  → both empty
 */
export const contacts = pgTable(
  'contacts',
  {
    id: serial('id').primaryKey(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    /** Unique — doubles as the login identifier. */
    email: text('email').notNull().unique(),
    /** bcrypt hash; never selected in public-facing queries. */
    passwordHash: text('password_hash').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    subcategoryId: integer('subcategory_id'),
    subcategoryOther: text('subcategory_other'),
    phone: text('phone').notNull(),
    birthDate: date('birth_date', { mode: 'string' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Composite FK: (category_id, subcategory_id) must match an existing
    // subcategory row of that same category. With subcategory_id NULL the
    // constraint is not enforced (MATCH SIMPLE), which is exactly what the
    // 'private' and 'other' categories need.
    foreignKey({
      columns: [t.categoryId, t.subcategoryId],
      foreignColumns: [subcategories.categoryId, subcategories.id],
      name: 'contacts_subcategory_fk',
    }),
    // A contact never carries both a dictionary subcategory and a free-text
    // one; which one is required per category is the validation layer's job.
    check(
      'contacts_subcategory_exclusive',
      sql`NOT (${t.subcategoryId} IS NOT NULL AND ${t.subcategoryOther} IS NOT NULL)`,
    ),
  ],
);
