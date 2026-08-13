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
 */
const client = postgres(process.env.DATABASE_URL!, { prepare: false });

export const db = drizzle(client, { schema });
