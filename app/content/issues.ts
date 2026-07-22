import { env } from "cloudflare:workers";
import { parseContent } from "./merge";
import type { NewsletterContent } from "./types";

// A published newsletter is a sequence of weekly "issues". This module defines
// what an issue *is* (issueKeyForContent) and keeps a public, browsable snapshot
// of each one (the archive). Reader sign-ins (signins.ts) use the same issue key
// so both features agree on where one week ends and the next begins.

export interface IssueSummary {
  issueKey: string;
  title: string;
  publishedAt: string;
}

export interface Issue extends IssueSummary {
  content: NewsletterContent;
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
 * a normal weekly update gets its own identity, while a typo-fix republish that
 * leaves the date untouched refers to the same issue. Falls back to a hash of
 * the whole document when the hero is somehow empty.
 */
export function issueKeyForContent(content: NewsletterContent): string {
  const hero = content.home?.hero;
  const identity = `${hero?.kicker ?? ""}\n${hero?.headline ?? ""}`.trim();
  return `i_${hash(identity || JSON.stringify(content))}`;
}

/** The hero's dated kicker line doubles as a short, human label for an issue. */
export function titleForContent(content: NewsletterContent): string {
  return content.home?.hero?.kicker?.trim() || "Untitled issue";
}

/** Idempotent so the feature works in local dev before the migration is applied. */
async function ensureTable() {
  await binding().prepare(
    "CREATE TABLE IF NOT EXISTS newsletter_issues (issue_key TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, published_at TEXT NOT NULL)",
  ).run();
}

/**
 * Snapshots the just-published content as an issue. Called after every
 * successful publish; re-publishing the same week (e.g. a typo fix) overwrites
 * that week's snapshot in place rather than adding a duplicate, since the issue
 * key is stable for the week.
 */
export async function recordIssue(content: NewsletterContent, publishedAt: string): Promise<void> {
  await ensureTable();
  const issueKey = issueKeyForContent(content);
  const title = titleForContent(content);
  await binding().prepare(
    "INSERT INTO newsletter_issues (issue_key, title, content, published_at) VALUES (?, ?, ?, ?) ON CONFLICT(issue_key) DO UPDATE SET title = excluded.title, content = excluded.content, published_at = excluded.published_at",
  ).bind(issueKey, title, JSON.stringify(content), publishedAt).run();
}

/** Newest first. Returns an empty list if the table has never been created. */
export async function listIssues(limit = 200): Promise<IssueSummary[]> {
  try {
    const result = await binding().prepare(
      "SELECT issue_key AS issueKey, title, published_at AS publishedAt FROM newsletter_issues ORDER BY published_at DESC LIMIT ?",
    ).bind(Math.max(1, Math.min(500, limit))).all<IssueSummary>();
    return result.results ?? [];
  } catch {
    return [];
  }
}

/** A single archived issue with its fully-parsed content, or null if missing. */
export async function getIssue(issueKey: string): Promise<Issue | null> {
  try {
    const row = await binding().prepare(
      "SELECT issue_key AS issueKey, title, content, published_at AS publishedAt FROM newsletter_issues WHERE issue_key = ? LIMIT 1",
    ).bind(issueKey).first<{ issueKey: string; title: string; content: string; publishedAt: string }>();
    if (!row) return null;
    return { issueKey: row.issueKey, title: row.title, publishedAt: row.publishedAt, content: parseContent(row.content) };
  } catch {
    return null;
  }
}
