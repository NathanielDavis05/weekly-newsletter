-- Replace the prior week's local events while preserving the rest of the
-- published August 17 issue and its editor-owned visual settings.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-aug-17-events-' || `revision`,
  'save',
  COALESCE(`published`, `draft`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before August 17 events update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`published`, `draft`) IS NOT NULL;

--> statement-breakpoint

WITH `event_patch` (`payload`) AS (VALUES (json('{
  "home": {
    "overview": {"eventCard": {
      "icon": "18",
      "kicker": "Tuesday–Wednesday",
      "title": "New Student Conference (NSC)",
      "detail": "August 18–19"
    }},
    "events": {"items": [
      {"date": "Aug 18–19", "name": "New Student Conference (NSC)", "featured": true},
      {"date": "Aug 20", "name": "Signature Member Tasting Event"},
      {"date": "Aug 18–22", "name": "BCS Classic @ Brazos County Expo"},
      {"date": "Aug 21", "name": "Maroon & White Night · 6 PM"},
      {"date": "Aug 22", "name": "TAMU Soccer v. Sam Houston · 8 PM"},
      {"date": "Aug 22", "name": "Sip & Shop Indoor Market 2026 · 10 AM–3 PM"}
    ]}
  },
  "visual": {"richOverrides": {
    "home.overview.eventCard.icon": null,
    "home.overview.eventCard.kicker": null,
    "home.overview.eventCard.title": null,
    "home.overview.eventCard.detail": null,
    "home.events.items.0.date": null,
    "home.events.items.0.name": null,
    "home.events.items.1.date": null,
    "home.events.items.1.name": null,
    "home.events.items.2.date": null,
    "home.events.items.2.name": null,
    "home.events.items.3.date": null,
    "home.events.items.3.name": null,
    "home.events.items.4.date": null,
    "home.events.items.4.name": null,
    "home.events.items.5.date": null,
    "home.events.items.5.name": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_patch(`draft`, (SELECT `payload` FROM `event_patch`)) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_patch(`published`, (SELECT `payload` FROM `event_patch`)) ELSE `published` END,
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
