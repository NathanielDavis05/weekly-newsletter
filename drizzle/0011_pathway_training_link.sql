-- Direct the Fall Promotion training button to the Pathway plans page.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-pathway-training-link-' || `revision`,
  'save',
  COALESCE(`published`, `draft`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before Pathway training link update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`published`, `draft`) IS NOT NULL;

--> statement-breakpoint

WITH `link_patch` (`payload`) AS (VALUES (json('{
  "training": {
    "primaryButton": {
      "label": "Open Pathway training",
      "href": "https://www.pathway.cfahome.com/plans/my-plans"
    }
  },
  "visual": {"richOverrides": {
    "training.primaryButton.label": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_patch(`draft`, (SELECT `payload` FROM `link_patch`)) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_patch(`published`, (SELECT `payload` FROM `link_patch`)) ELSE `published` END,
  `revision` = `revision` + 1,
  `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `id` = 'singleton';

--> statement-breakpoint

INSERT OR REPLACE INTO `newsletter_issues`
  (`issue_key`, `title`, `content`, `published_at`)
SELECT
  'i_1pwydyy',
  json_extract(`published`, '$.home.hero.kicker'),
  `published`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `newsletter_content`
WHERE `id` = 'singleton' AND json_valid(`published`);
