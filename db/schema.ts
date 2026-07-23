import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single-row table holding the newsletter content as JSON. `draft` is what the
// editor edits and previews; `published` is what the public site renders.
export const newsletterContent = sqliteTable("newsletter_content", {
  id: text("id").primaryKey().default("singleton"),
  draft: text("draft"),
  published: text("published"),
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at"),
});

// One row per saved point in time: autosaves are not recorded, but manual
// saves, publishes and restores are, plus a pre-migration snapshot whenever the
// document schema moves forward.
export const newsletterVersions = sqliteTable("newsletter_versions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  content: text("content").notNull(),
  revision: integer("revision").notNull(),
  createdAt: text("created_at").notNull(),
  /** Human summary of what changed. Nullable for pre-existing rows. */
  label: text("label"),
  /** Email of whoever made the change. Nullable for pre-existing rows. */
  author: text("author"),
});

// One row per reader who signed the current issue. `issueKey` is derived from
// the published issue's dated hero line, so each week's newsletter keeps its own
// roster. The primary key folds in the lowercased name so re-signing updates the
// timestamp instead of creating a duplicate.
export const readerSignins = sqliteTable("reader_signins", {
  id: text("id").primaryKey(),
  issueKey: text("issue_key").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

// One row per published issue (one per week, keyed the same way as
// reader_signins). Content is denormalized here rather than referencing
// newsletter_versions so the archive keeps working even if version history is
// ever pruned. Re-publishing the same week overwrites its row in place.
export const newsletterIssues = sqliteTable("newsletter_issues", {
  issueKey: text("issue_key").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  publishedAt: text("published_at").notNull(),
});

// One row per uploaded file. The bytes live in R2 under `key`; this table is
// what makes the media library searchable and lets alt text travel with the
// image rather than being retyped at every use.
export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: text("size").notNull(),
  createdAt: text("created_at").notNull(),
  /** Original upload name, for display and search. */
  filename: text("filename"),
  /** Reused every time the image is placed, so it is written once. */
  altText: text("alt_text"),
});
