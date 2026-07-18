CREATE TABLE `newsletter_content` (
	`id` text PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	`draft` text,
	`published` text,
	`updated_at` text
);
