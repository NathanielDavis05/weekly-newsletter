-- Remove the closed engagement survey and add the August 21 New Fall
-- promotion tasting while preserving the rest of the published issue.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-close-survey-add-tasting-' || `revision`,
  'save',
  COALESCE(`published`, `draft`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before survey removal and August 21 tasting update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`published`, `draft`) IS NOT NULL;

--> statement-breakpoint

WITH `content_patch` (`payload`) AS (VALUES (json('{
  "home": {"events": {"items": [
    {"date": "Aug 18–19", "name": "New Student Conference (NSC)", "featured": true},
    {"date": "Aug 20", "name": "Signature Member Tasting Event"},
    {"date": "Aug 18–22", "name": "BCS Classic @ Brazos County Expo"},
    {"date": "Aug 21", "name": "Maroon & White Night · 6 PM"},
    {"date": "Aug 21", "name": "Signature Member Tasting Event — New Fall Promotion · 5–6 PM"},
    {"date": "Aug 22", "name": "TAMU Soccer v. Sam Houston · 8 PM"},
    {"date": "Aug 22", "name": "Sip & Shop Indoor Market 2026 · 10 AM–3 PM"}
  ]}},
  "visual": {"richOverrides": {
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
    "home.events.items.5.name": null,
    "home.events.items.6.date": null,
    "home.events.items.6.name": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_patch(`draft`, (SELECT `payload` FROM `content_patch`)) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_patch(`published`, (SELECT `payload` FROM `content_patch`)) ELSE `published` END
WHERE `id` = 'singleton';

--> statement-breakpoint

UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN
    json_remove(
      json_set(
        `draft`,
        '$.visual.pages.home.items', json(COALESCE((
          SELECT json_group_array(`value`)
          FROM json_each(`draft`, '$.visual.pages.home.items')
          WHERE json_extract(`value`, '$.id') <> '7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb'
        ), '[]')),
        '$.visual.pages.home.rows', json(COALESCE((
          SELECT json_group_array(`value`)
          FROM json_each(`draft`, '$.visual.pages.home.rows')
          WHERE json_extract(`value`, '$.id') <> 'home-row-a0991758-c100-42ab-be56-9e5b90769727'
        ), '[]')),
        '$.visual.customPages', json(COALESCE((
          SELECT json_group_array(`value`)
          FROM json_each(`draft`, '$.visual.customPages')
          WHERE json_extract(`value`, '$.id') <> 'page-b458b8b9-3ad1-4822-86b3-5dbe33783334'
        ), '[]'))
      ),
      '$.visual.pages."page-b458b8b9-3ad1-4822-86b3-5dbe33783334"',
      '$.visual.headers."page-b458b8b9-3ad1-4822-86b3-5dbe33783334"',
      '$.visual.richOverrides."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richTitle"',
      '$.visual.richOverrides."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richBody"',
      '$.visual.richOverrides."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:button"',
      '$.visual.textFrames."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richTitle"',
      '$.visual.textFrames."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richBody"',
      '$.visual.textFrames."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:button"'
    )
  ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN
    json_remove(
      json_set(
        `published`,
        '$.visual.pages.home.items', json(COALESCE((
          SELECT json_group_array(`value`)
          FROM json_each(`published`, '$.visual.pages.home.items')
          WHERE json_extract(`value`, '$.id') <> '7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb'
        ), '[]')),
        '$.visual.pages.home.rows', json(COALESCE((
          SELECT json_group_array(`value`)
          FROM json_each(`published`, '$.visual.pages.home.rows')
          WHERE json_extract(`value`, '$.id') <> 'home-row-a0991758-c100-42ab-be56-9e5b90769727'
        ), '[]')),
        '$.visual.customPages', json(COALESCE((
          SELECT json_group_array(`value`)
          FROM json_each(`published`, '$.visual.customPages')
          WHERE json_extract(`value`, '$.id') <> 'page-b458b8b9-3ad1-4822-86b3-5dbe33783334'
        ), '[]'))
      ),
      '$.visual.pages."page-b458b8b9-3ad1-4822-86b3-5dbe33783334"',
      '$.visual.headers."page-b458b8b9-3ad1-4822-86b3-5dbe33783334"',
      '$.visual.richOverrides."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richTitle"',
      '$.visual.richOverrides."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richBody"',
      '$.visual.richOverrides."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:button"',
      '$.visual.textFrames."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richTitle"',
      '$.visual.textFrames."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:richBody"',
      '$.visual.textFrames."7ccf90a2-d094-4c0e-a9c0-e7dc671c61fb:button"'
    )
  ELSE `published` END,
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
