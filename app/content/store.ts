import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { newsletterContent, newsletterVersions } from "../../db/schema";
import { defaultContent } from "./defaults";
import { parseContent } from "./merge";
import type { NewsletterContent } from "./types";

const SINGLETON_ID = "singleton";
export class RevisionConflictError extends Error { constructor(public currentRevision: number) { super("This draft changed in another tab. Reload before saving so newer work is not overwritten."); } }

interface ContentRow { id: string; draft: string | null; published: string | null; revision: number; updatedAt: string | null; }
async function readRow(): Promise<ContentRow | null> { const rows = await getDb().select().from(newsletterContent).where(eq(newsletterContent.id, SINGLETON_ID)).limit(1); return rows[0] ?? null; }

async function snapshotLegacy(row: ContentRow) {
  const versionOf = (json: string | null) => { try { return (JSON.parse(json || "{}")?.visual?.version as number | undefined) ?? 0; } catch { return 0; } };
  if (Math.max(versionOf(row.draft), versionOf(row.published)) >= 6) return;
  const now = new Date().toISOString(); const db = getDb();
  for (const [kind, content] of [["migration-draft", row.draft], ["migration-published", row.published]] as const) {
    if (!content) continue;
    await db.insert(newsletterVersions).values({ id: `${kind}-${row.revision}`, kind, content, revision: row.revision, createdAt: now }).onConflictDoNothing();
  }
}

export async function getPublishedContent(): Promise<NewsletterContent> { try { return parseContent((await readRow())?.published); } catch { return defaultContent; } }
export async function getDraftContent(): Promise<NewsletterContent> { try { const row = await readRow(); return parseContent(row?.draft ?? row?.published); } catch { return defaultContent; } }
export async function getEditorContent(): Promise<{ draft: NewsletterContent; published: NewsletterContent; revision: number }> {
  try { const row = await readRow(); return { draft: parseContent(row?.draft ?? row?.published), published: parseContent(row?.published), revision: row?.revision ?? 0 }; }
  catch { return { draft: defaultContent, published: defaultContent, revision: 0 }; }
}

export async function saveDraft(content: NewsletterContent, expectedRevision: number): Promise<{ draft: NewsletterContent; revision: number }> {
  const db = getDb(); const row = await readRow(); const current = row?.revision ?? 0;
  if (current !== expectedRevision) throw new RevisionConflictError(current);
  if (row) await snapshotLegacy(row);
  const revision = current + 1; const json = JSON.stringify(content); const updatedAt = new Date().toISOString();
  if (!row) {
    await db.insert(newsletterContent).values({ id: SINGLETON_ID, draft: json, revision, updatedAt });
  } else {
    const updated = await db.update(newsletterContent).set({ draft: json, revision, updatedAt }).where(and(eq(newsletterContent.id, SINGLETON_ID), eq(newsletterContent.revision, current))).returning({ revision: newsletterContent.revision });
    if (!updated.length) throw new RevisionConflictError((await readRow())?.revision ?? current);
  }
  return { draft: parseContent(json), revision };
}

export async function publishDraft(expectedRevision: number): Promise<{ published: NewsletterContent; revision: number }> {
  const row = await readRow(); const current = row?.revision ?? 0; if (current !== expectedRevision) throw new RevisionConflictError(current);
  const json = row?.draft ?? row?.published ?? JSON.stringify(defaultContent); const revision = current + 1; const updatedAt = new Date().toISOString();
  if (!row) await getDb().insert(newsletterContent).values({ id: SINGLETON_ID, draft: json, published: json, revision, updatedAt });
  else {
    const updated = await getDb().update(newsletterContent).set({ published: json, draft: json, revision, updatedAt }).where(and(eq(newsletterContent.id, SINGLETON_ID), eq(newsletterContent.revision, current))).returning({ revision: newsletterContent.revision });
    if (!updated.length) throw new RevisionConflictError((await readRow())?.revision ?? current);
  }
  return { published: parseContent(json), revision };
}

export async function resetDraftToPublished(): Promise<NewsletterContent> { const row = await readRow(); const json = row?.published ?? JSON.stringify(defaultContent); await getDb().insert(newsletterContent).values({ id: SINGLETON_ID, draft: json, revision: (row?.revision ?? 0) + 1, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: newsletterContent.id, set: { draft: json, revision: (row?.revision ?? 0) + 1, updatedAt: new Date().toISOString() } }); return parseContent(json); }
export async function resetDraftToDefaults(): Promise<NewsletterContent> { const json = JSON.stringify(defaultContent); const row = await readRow(); await getDb().insert(newsletterContent).values({ id: SINGLETON_ID, draft: json, revision: (row?.revision ?? 0) + 1, updatedAt: new Date().toISOString() }).onConflictDoUpdate({ target: newsletterContent.id, set: { draft: json, revision: (row?.revision ?? 0) + 1, updatedAt: new Date().toISOString() } }); return parseContent(json); }
