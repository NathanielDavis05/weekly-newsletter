-- The public archive: one row per published issue. Hand-written (matching
-- 0001-0005) and idempotent so it is safe to apply on a database that already
-- has the table from the runtime ensure-create in app/content/issues.ts.
CREATE TABLE IF NOT EXISTS `newsletter_issues` (
	`issue_key` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`published_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `newsletter_issues_published_idx` ON `newsletter_issues` (`published_at`);
