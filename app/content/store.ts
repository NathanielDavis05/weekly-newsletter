import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { newsletterContent } from "../../db/schema";
import { defaultContent } from "./defaults";
import { parseContent } from "./merge";
import type { NewsletterContent } from "./types";

const SINGLETON_ID = "singleton";

interface ContentRow {
  id: string;
  draft: string | null;
  published: string | null;
  updatedAt: string | null;
}

async function readRow(): Promise<ContentRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(newsletterContent)
    .where(eq(newsletterContent.id, SINGLETON_ID))
    .limit(1);
  return rows[0] ?? null;
}

async function writeRow(values: {
  draft?: string;
  published?: string;
}): Promise<void> {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  await db
    .insert(newsletterContent)
    .values({ id: SINGLETON_ID, ...values, updatedAt })
    .onConflictDoUpdate({
      target: newsletterContent.id,
      set: { ...values, updatedAt },
    });
}

/**
 * Content shown to the public. Reads the published JSON and merges it over the
 * defaults. Any failure (no D1 binding, missing table, empty row) falls back to
 * the defaults so the public site always renders — identical to the original.
 */
export async function getPublishedContent(): Promise<NewsletterContent> {
  try {
    const row = await readRow();
    return parseContent(row?.published);
  } catch {
    return defaultContent;
  }
}

/**
 * Content the editor works on. Prefers the saved draft, then the published
 * version, then defaults. Safe fallback on any failure.
 */
export async function getDraftContent(): Promise<NewsletterContent> {
  try {
    const row = await readRow();
    return parseContent(row?.draft ?? row?.published);
  } catch {
    return defaultContent;
  }
}

/** Both versions, for the editor's initial load. */
export async function getEditorContent(): Promise<{
  draft: NewsletterContent;
  published: NewsletterContent;
}> {
  try {
    const row = await readRow();
    return {
      draft: parseContent(row?.draft ?? row?.published),
      published: parseContent(row?.published),
    };
  } catch {
    return { draft: defaultContent, published: defaultContent };
  }
}

/** Persist a new draft (does not affect what the public sees). */
export async function saveDraft(content: NewsletterContent): Promise<void> {
  await writeRow({ draft: JSON.stringify(content) });
}

/** Promote the current draft to published so the public site shows it. */
export async function publishDraft(): Promise<NewsletterContent> {
  const row = await readRow();
  const json =
    row?.draft ?? row?.published ?? JSON.stringify(defaultContent);
  await writeRow({ published: json, draft: json });
  return parseContent(json);
}

/** Discard draft edits, reverting the draft to the published version. */
export async function resetDraftToPublished(): Promise<NewsletterContent> {
  const row = await readRow();
  const json = row?.published ?? JSON.stringify(defaultContent);
  await writeRow({ draft: json });
  return parseContent(json);
}

/** Revert the draft all the way back to the original built-in content. */
export async function resetDraftToDefaults(): Promise<NewsletterContent> {
  const json = JSON.stringify(defaultContent);
  await writeRow({ draft: json });
  return parseContent(json);
}
