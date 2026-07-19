import { ensureSchema, sql } from "./db";
import { defaultContent } from "./defaults";
import { parseContent } from "./merge";
import type { NewsletterContent } from "./types";

const SINGLETON_ID = "singleton";
export class RevisionConflictError extends Error {
  constructor(public currentRevision: number) {
    super("This draft changed in another tab. Reload before saving so newer work is not overwritten.");
  }
}

interface ContentRow { draft: string | null; published: string | null; revision: number; }

async function readRow(): Promise<ContentRow | null> {
  await ensureSchema();
  const rows = (await sql()`SELECT draft, published, revision FROM newsletter_content WHERE id = ${SINGLETON_ID} LIMIT 1`) as ContentRow[];
  return rows[0] ?? null;
}

export async function getPublishedContent(): Promise<NewsletterContent> { try { return parseContent((await readRow())?.published); } catch { return defaultContent; } }
export async function getDraftContent(): Promise<NewsletterContent> { try { const row = await readRow(); return parseContent(row?.draft ?? row?.published); } catch { return defaultContent; } }
export async function getEditorContent(): Promise<{ draft: NewsletterContent; published: NewsletterContent; revision: number }> {
  try { const row = await readRow(); return { draft: parseContent(row?.draft ?? row?.published), published: parseContent(row?.published), revision: row?.revision ?? 0 }; }
  catch { return { draft: defaultContent, published: defaultContent, revision: 0 }; }
}

export async function saveDraft(content: NewsletterContent, expectedRevision: number): Promise<{ draft: NewsletterContent; revision: number }> {
  const row = await readRow(); const current = row?.revision ?? 0;
  if (current !== expectedRevision) throw new RevisionConflictError(current);
  const json = JSON.stringify(content); const updatedAt = new Date().toISOString();
  if (!row) {
    const inserted = (await sql()`INSERT INTO newsletter_content (id, draft, revision, updated_at) VALUES (${SINGLETON_ID}, ${json}, 1, ${updatedAt}) ON CONFLICT (id) DO NOTHING RETURNING revision`) as { revision: number }[];
    if (!inserted.length) throw new RevisionConflictError((await readRow())?.revision ?? current);
    return { draft: parseContent(json), revision: 1 };
  }
  const updated = (await sql()`UPDATE newsletter_content SET draft = ${json}, revision = ${current + 1}, updated_at = ${updatedAt} WHERE id = ${SINGLETON_ID} AND revision = ${current} RETURNING revision`) as { revision: number }[];
  if (!updated.length) throw new RevisionConflictError((await readRow())?.revision ?? current);
  return { draft: parseContent(json), revision: current + 1 };
}

export async function publishDraft(expectedRevision: number): Promise<{ published: NewsletterContent; revision: number }> {
  const row = await readRow(); const current = row?.revision ?? 0;
  if (current !== expectedRevision) throw new RevisionConflictError(current);
  const json = row?.draft ?? row?.published ?? JSON.stringify(defaultContent); const updatedAt = new Date().toISOString();
  if (!row) {
    const inserted = (await sql()`INSERT INTO newsletter_content (id, draft, published, revision, updated_at) VALUES (${SINGLETON_ID}, ${json}, ${json}, 1, ${updatedAt}) ON CONFLICT (id) DO NOTHING RETURNING revision`) as { revision: number }[];
    if (!inserted.length) throw new RevisionConflictError((await readRow())?.revision ?? current);
    return { published: parseContent(json), revision: 1 };
  }
  const updated = (await sql()`UPDATE newsletter_content SET published = ${json}, draft = ${json}, revision = ${current + 1}, updated_at = ${updatedAt} WHERE id = ${SINGLETON_ID} AND revision = ${current} RETURNING revision`) as { revision: number }[];
  if (!updated.length) throw new RevisionConflictError((await readRow())?.revision ?? current);
  return { published: parseContent(json), revision: current + 1 };
}

async function replaceDraft(json: string, revision: number) {
  const updatedAt = new Date().toISOString();
  await sql()`INSERT INTO newsletter_content (id, draft, revision, updated_at) VALUES (${SINGLETON_ID}, ${json}, ${revision}, ${updatedAt}) ON CONFLICT (id) DO UPDATE SET draft = excluded.draft, revision = excluded.revision, updated_at = excluded.updated_at`;
}

export async function resetDraftToPublished(): Promise<NewsletterContent> { const row = await readRow(); const json = row?.published ?? JSON.stringify(defaultContent); await replaceDraft(json, (row?.revision ?? 0) + 1); return parseContent(json); }
export async function resetDraftToDefaults(): Promise<NewsletterContent> { const json = JSON.stringify(defaultContent); const row = await readRow(); await replaceDraft(json, (row?.revision ?? 0) + 1); return parseContent(json); }
