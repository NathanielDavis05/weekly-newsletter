import { neon } from "@neondatabase/serverless";

// Neon serverless HTTP client. Works from both Vercel functions and localhost.
// Constructed lazily so public pages can still fall back to default content
// when no database is configured yet (read paths catch the thrown error).
const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

let client: ReturnType<typeof neon> | null = null;
export function sql() {
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  if (!client) client = neon(connectionString);
  return client;
}

// One table, created on first use so there is no separate migration step.
let ensured: Promise<void> | null = null;
export function ensureSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await sql()`CREATE TABLE IF NOT EXISTS newsletter_content (
        id text PRIMARY KEY DEFAULT 'singleton',
        draft text,
        published text,
        revision integer NOT NULL DEFAULT 0,
        updated_at text
      )`;
    })().catch((error) => {
      ensured = null;
      throw error;
    });
  }
  return ensured;
}
