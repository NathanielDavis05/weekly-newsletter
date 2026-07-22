-- Revision history metadata. Both columns are nullable so existing rows
-- (migration snapshots written before history had a UI) remain valid.
ALTER TABLE `newsletter_versions` ADD `label` text;
--> statement-breakpoint
ALTER TABLE `newsletter_versions` ADD `author` text;
