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

export const newsletterVersions = sqliteTable("newsletter_versions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  content: text("content").notNull(),
  revision: integer("revision").notNull(),
  createdAt: text("created_at").notNull(),
});

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: text("size").notNull(),
  createdAt: text("created_at").notNull(),
});
