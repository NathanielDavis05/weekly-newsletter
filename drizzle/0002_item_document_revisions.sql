ALTER TABLE `newsletter_content` ADD `revision` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE `newsletter_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`content` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` text NOT NULL
);
