-- Reader sign-ins: one row per person who marks an issue as read. Hand-written
-- (matching 0001-0004) and idempotent so it is safe to apply on a database that
-- already has the table from the runtime ensure-create in app/content/signins.ts.
CREATE TABLE IF NOT EXISTS `reader_signins` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_key` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `reader_signins_issue_idx` ON `reader_signins` (`issue_key`);
