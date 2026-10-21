/**
 * Neon PostgreSQL connection for Mission Control's own social data.
 * Reads DATABASE_URL from .env — this should be your Neon connection string.
 *
 * Usage:
 *   import { sql } from "@/lib/neon";
 *   const accounts = await sql`SELECT * FROM social_accounts`;
 */

import postgres from "postgres";

let neonSql: ReturnType<typeof postgres> | null = null;

function getNeon() {
  if (!neonSql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL not set in .env. Add your Neon connection string: DATABASE_URL=postgresql://user:***@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require");
    }
    neonSql = postgres(url, { max: 3, idle_timeout: 20, max_lifetime: 60 * 30 });
  }
  return neonSql;
}

/** Execute a raw SQL query (tagged template) */
export async function sql(strings: TemplateStringsArray, ...values: any[]) {
  const db = getNeon();
  return db(strings, ...values);
}

/** Test connection — returns true if reachable */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 AS ok`;
    return result?.[0]?.ok === 1;
  } catch {
    return false;
  }
}

export default getNeon;
