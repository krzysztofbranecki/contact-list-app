import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { BCRYPT_COST } from '@/lib/auth/password';
import { categories, contacts, subcategories } from './schema';

/**
 * Idempotent database seed: dictionaries + starter accounts.
 *
 * Run with `npm run db:seed` (uses DIRECT_URL — see drizzle.config.ts for
 * why the pooler is not used here). Safe to run repeatedly: every insert is
 * an upsert-or-skip keyed on a unique constraint.
 *
 * Starter login (documented in README): any seeded contact's email with the
 * password `Haslo123!`.
 */

/** Shared demo password for all seeded accounts. */
const DEMO_PASSWORD = 'Haslo123!';

const CATEGORY_SEED = [
  { code: 'business', name: 'Służbowy' },
  { code: 'private', name: 'Prywatny' },
  { code: 'other', name: 'Inny' },
] as const;

/** Curated dictionary subcategories — business category only. */
const BUSINESS_SUBCATEGORIES = ['Szef', 'Klient', 'Współpracownik', 'Dostawca'];

async function main() {
  const client = postgres(process.env.DIRECT_URL!, { max: 1 });
  const db = drizzle(client);

  // 1. Categories — upsert by unique `code`.
  await db.insert(categories).values([...CATEGORY_SEED]).onConflictDoNothing();

  const categoryRows = await db.select().from(categories);
  const byCode = Object.fromEntries(categoryRows.map((c) => [c.code, c.id]));

  // 2. Business subcategories — upsert by unique (category_id, name).
  await db
    .insert(subcategories)
    .values(
      BUSINESS_SUBCATEGORIES.map((name) => ({
        categoryId: byCode.business,
        name,
      })),
    )
    .onConflictDoNothing();

  const bossId = (
    await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.name, 'Szef'))
  )[0].id;

  // 3. Starter contacts (= login accounts) — upsert by unique email.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  await db
    .insert(contacts)
    .values([
      {
        firstName: 'Jan',
        lastName: 'Kowalski',
        email: 'jan.kowalski@example.com',
        passwordHash,
        categoryId: byCode.business,
        subcategoryId: bossId,
        phone: '+48 600 100 200',
        birthDate: '1985-04-12',
      },
      {
        firstName: 'Anna',
        lastName: 'Nowak',
        email: 'anna.nowak@example.com',
        passwordHash,
        categoryId: byCode.private,
        phone: '+48 601 202 303',
        birthDate: '1990-09-23',
      },
      {
        firstName: 'Piotr',
        lastName: 'Zieliński',
        email: 'piotr.zielinski@example.com',
        passwordHash,
        categoryId: byCode.other,
        subcategoryOther: 'Sąsiad',
        phone: '+48 602 303 404',
        birthDate: '1978-01-30',
      },
    ])
    .onConflictDoNothing();

  await client.end();
  console.log('Seed completed.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
