import { sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single-row table holding the newsletter content as JSON. `draft` is what the
// editor edits and previews; `published` is what the public site renders.
export const newsletterContent = sqliteTable("newsletter_content", {
  id: text("id").primaryKey().default("singleton"),
  draft: text("draft"),
  published: text("published"),
  updatedAt: text("updated_at"),
});
