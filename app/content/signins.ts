import { env } from "cloudflare:workers";
import type { NewsletterContent } from "./types";

// Reader sign-ins let the team mark "I've read this" by entering their name. The
// roster is partitioned per issue so each week starts fresh: the issue key is
// derived from the published hero's dated line (e.g. "Team update · July 10,
// 2026"), which the editor already updates for every new issue.

export interface Signin {
  name: string;
  createdAt: string;
}

function binding() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return env.DB;
}

/** FNV-1a: small, dependency-free, stable across server restarts. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * A stable identifier for "this week's issue". Built from the dated hero line so
 * a normal weekly update gets its own roster, while a typo-fix republish that
 * leaves the date untouched keeps the same roster. Falls back to a hash of the
 * whole document when the hero is somehow empty.
 */
export function issueKeyForContent(content: NewsletterContent): string {
  const hero = content.home?.hero;
  const identity = `${hero?.kicker ?? ""}\n${hero?.headline ?? ""}`.trim();
  return `i_${hash(identity || JSON.stringify(content))}`;
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
