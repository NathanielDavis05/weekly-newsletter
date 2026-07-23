import { env } from "cloudflare:workers";

// Reader sign-ins let the team mark "I've read this" by entering their name. The
// roster is partitioned per issue so each week starts fresh — "issue" identity
// (issueKeyForContent) is shared with the archive in ./issues.ts, so both
// features agree on where one week ends and the next begins.
export { issueKeyForContent } from "./issues";

export interface Signin {
  name: string;
  createdAt: string;
}

function binding() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return env.DB;
}

/** Idempotent so the feature works in local dev before the migration is applied. */
async function ensureTable() {
  await binding().prepare(
    "CREATE TABLE IF NOT EXISTS reader_signins (id TEXT PRIMARY KEY NOT NULL, issue_key TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL)",
  ).run();
}

/** Trims, collapses whitespace, and caps length so the roster stays readable. */
export function cleanName(raw: unknown): string {
  return String(raw ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
}

/**
 * Records (or refreshes) one reader against an issue. The primary key folds in
 * the lowercased name so signing twice updates the timestamp instead of adding
 * a duplicate row.
 */
export async function recordSignin(issueKey: string, name: string): Promise<void> {
  const clean = cleanName(name);
  if (!clean) throw new Error("A name is required.");
  await ensureTable();
  const id = `${issueKey}:${clean.toLowerCase()}`;
  await binding().prepare(
    "INSERT INTO reader_signins (id, issue_key, name, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, created_at = excluded.created_at",
  ).bind(id, issueKey, clean, new Date().toISOString()).run();
}

/** Newest first. Returns an empty list if the table has never been created. */
export async function listSignins(issueKey: string): Promise<Signin[]> {
  try {
    const result = await binding().prepare(
      "SELECT name, created_at AS createdAt FROM reader_signins WHERE issue_key = ? ORDER BY created_at DESC LIMIT 500",
    ).bind(issueKey).all<Signin>();
    return result.results ?? [];
  } catch {
    return [];
  }
}
