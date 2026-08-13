import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * Migrations and seeding MUST run against the direct (session-mode) Supabase
 * connection (DIRECT_URL, port 5432) — the transaction pooler (DATABASE_URL,
 * port 6543) does not support the prepared statements drizzle-kit relies on.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL!,
  },
});
