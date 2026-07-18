import { env } from "cloudflare:workers";
import { defaultContent } from "./defaults";
import { parseContent } from "./merge";
import type { NewsletterContent } from "./types";

const SINGLETON_ID = "singleton";
export class RevisionConflictError extends Error { constructor(public currentRevision: number) { super("This draft changed in another tab. Reload before saving so newer work is not overwritten."); } }

interface ContentRow { id: string; draft: string | null; published: string | null; revision: number; updatedAt: string | null; }
function binding() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  return env.DB;
}

async function readRow(): Promise<ContentRow | null> {
  return await binding().prepare(
    "SELECT id, draft, published, revision, updated_at AS updatedAt FROM newsletter_content WHERE id = ? LIMIT 1",
  ).bind(SINGLETON_ID).first<ContentRow>() ?? null;
}

async function snapshotLegacy(row: ContentRow) {
  const versionOf = (json: string | null) => { try { return (JSON.parse(json || "{}")?.visual?.version as number | undefined) ?? 0; } catch { return 0; } };
  if (Math.max(versionOf(row.draft), versionOf(row.published)) >= 6) return;
  const now = new Date().toISOString(); const db = binding();
  const statements = [];
  for (const [kind, content] of [["migration-draft", row.draft], ["migration-published", row.published]] as const) {
    if (!content) continue;
    statements.push(db.prepare(
      "INSERT OR IGNORE INTO newsletter_versions (id, kind, content, revision, created_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(`${kind}-${row.revision}`, kind, content, row.revision, now));
  }
  if (statements.length) await db.batch(statements);
}

export async function getPublishedContent(): Promise<NewsletterContent> { try { return parseContent((await readRow())?.published); } catch { return defaultContent; } }
export async function getDraftContent(): Promise<NewsletterContent> { try { const row = await readRow(); return parseContent(row?.draft ?? row?.published); } catch { return defaultContent; } }
export async function getEditorContent(): Promise<{ draft: NewsletterContent; published: NewsletterContent; revision: number }> {
  try { const row = await readRow(); return { draft: parseContent(row?.draft ?? row?.published), published: parseContent(row?.published), revision: row?.revision ?? 0 }; }
  catch { return { draft: defaultContent, published: defaultContent, revision: 0 }; }
}

export async function saveDraft(content: NewsletterContent, expectedRevision: number): Promise<{ draft: NewsletterContent; revision: number }> {
  const db = binding(); const row = await readRow(); const current = row?.revision ?? 0;
  if (current !== expectedRevision) throw new RevisionConflictError(current);
  if (row) await snapshotLegacy(row);
  const revision = current + 1; const json = JSON.stringify(content); const updatedAt = new Date().toISOString();
  if (!row) {
    await db.prepare(
      "INSERT INTO newsletter_content (id, draft, revision, updated_at) VALUES (?, ?, ?, ?)",
    ).bind(SINGLETON_ID, json, revision, updatedAt).run();
  } else {
    const updated = await db.prepare(
      "UPDATE newsletter_content SET draft = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?",
    ).bind(json, revision, updatedAt, SINGLETON_ID, current).run();
    if ((updated.meta.changes ?? 0) < 1) throw new RevisionConflictError((await readRow())?.revision ?? current);
  }
  return { draft: parseContent(json), revision };
}

export async function publishDraft(expectedRevision: number): Promise<{ published: NewsletterContent; revision: number }> {
  const row = await readRow(); const current = row?.revision ?? 0; if (current !== expectedRevision) throw new RevisionConflictError(current);
  const json = row?.draft ?? row?.published ?? JSON.stringify(defaultContent); const revision = current + 1; const updatedAt = new Date().toISOString();
  const db = binding();
  if (!row) await db.prepare(
    "INSERT INTO newsletter_content (id, draft, published, revision, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).bind(SINGLETON_ID, json, json, revision, updatedAt).run();
  else {
    const updated = await db.prepare(
      "UPDATE newsletter_content SET published = ?, draft = ?, revision = ?, updated_at = ? WHERE id = ? AND revision = ?",
    ).bind(json, json, revision, updatedAt, SINGLETON_ID, current).run();
    if ((updated.meta.changes ?? 0) < 1) throw new RevisionConflictError((await readRow())?.revision ?? current);
  }
  return { published: parseContent(json), revision };
}

async function replaceDraft(json: string, revision: number) {
  await binding().prepare(
    "INSERT INTO newsletter_content (id, draft, revision, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET draft = excluded.draft, revision = excluded.revision, updated_at = excluded.updated_at",
  ).bind(SINGLETON_ID, json, revision, new Date().toISOString()).run();
}

export async function resetDraftToPublished(): Promise<NewsletterContent> { const row = await readRow(); const json = row?.published ?? JSON.stringify(defaultContent); await replaceDraft(json, (row?.revision ?? 0) + 1); return parseContent(json); }
export async function resetDraftToDefaults(): Promise<NewsletterContent> { const json = JSON.stringify(defaultContent); const row = await readRow(); await replaceDraft(json, (row?.revision ?? 0) + 1); return parseContent(json); }
