import "server-only";
import { Pool, type PoolClient } from "pg";
import { requireDatabaseUrl } from "@/lib/env";

// Reuse a single pool across hot reloads in dev.
const globalForDb = globalThis as unknown as { __pgPool?: Pool };

export const pool: Pool =
  globalForDb.__pgPool ??
  new Pool({ connectionString: requireDatabaseUrl(), max: 10 });

if (process.env.NODE_ENV !== "production") globalForDb.__pgPool = pool;

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query(text, params as never);
  return res.rows as T[];
}

/** Run `fn` inside a transaction, committing on success and rolling back on throw. */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** pgvector wants a bracketed, comma-separated literal: [0.1,0.2,...] */
export function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}
