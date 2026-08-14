import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Application database client (runtime).
 *
 * Connects through the Supabase transaction pooler (DATABASE_URL, port 6543).
 * `prepare: false` is required in transaction-pooling mode — prepared
 * statements are not supported there. Migrations/seed use DIRECT_URL instead
 * (see drizzle.config.ts).
 *
 * The client is cached on globalThis in development: Next.js re-evaluates
 * server modules on HMR, and without the cache every edit would open a fresh
 * pool and slowly exhaust the pooler's connection limit.
 */
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, { prepare: false, max: 5 });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });
