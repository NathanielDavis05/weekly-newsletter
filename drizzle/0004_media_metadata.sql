-- Media library metadata. Nullable so rows uploaded before the library existed
-- remain valid; the UI falls back to the storage key for a name.
ALTER TABLE `media_assets` ADD `filename` text;
--> statement-breakpoint
ALTER TABLE `media_assets` ADD `alt_text` text;
