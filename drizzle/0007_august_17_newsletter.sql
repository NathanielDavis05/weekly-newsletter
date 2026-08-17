-- Publish the August 17 issue by changing only the guest-experience measures
-- already present in the newsletter. The live content is editor-owned D1 data,
-- so this migration updates both its structured fields and any plain-text rich
-- overrides that would otherwise keep showing last week's copy.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-aug-17-2026-' || `revision`,
  'save',
  COALESCE(`published`, `draft`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before August 17 newsletter update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`published`, `draft`) IS NOT NULL;

--> statement-breakpoint

WITH `issue_patch` (`payload`) AS (VALUES (json('{
  "home": {
    "hero": {"kicker": "Team update · Aug 17, 2026"},
    "footer": {"line": "Team newsletter · August 17, 2026"},
    "overview": {"recognitionCard": {"title": "Ashley", "detail": "Mentioned in a guest comment this week"}},
    "recognition": {
      "feature": {"heading": "Shoutout from a Guest", "body": "Ashley was mentioned in a comment by a guest this week."},
      "birthday": {
        "name": "Fabian Canchola",
        "date": "August 17",
        "entries": [
          {"name": "Fabian Canchola", "date": "August 17"},
          {"name": "Aidan Plut", "date": "August 17"}
        ]
      },
      "anniversaries": {"entries": [
        {"name": "Ariana Aguilar — August 17", "detail": "1 year with CFA"},
        {"name": "Esteban Duarte — August 19", "detail": "1 year with CFA"},
        {"name": "Michelle van Rinsum — August 19", "detail": "1 year with CFA"}
      ]}
    },
    "scorecard": {
      "intro": "Guest feedback highlights clear opportunities in taste, fast service, order accuracy, and speed of service.",
      "resultAria": "2 of 6 goals met",
      "resultValue": "2"
    }
  },
  "shared": {"scorecard": {
    "homeTone": "red",
    "intro": "Guest feedback highlights clear opportunities in taste, fast service, order accuracy, and speed of service.",
    "resultAria": "2 of 6 goals met",
    "resultValue": "2",
    "table": {"rows": [
      {"label": "Overall satisfaction", "april": "+2%", "may": "+5%", "june": "85%", "goal": "83%", "tone": "green"},
      {"label": "Taste of food", "april": "-5%", "may": "-2%", "june": "79%", "goal": "83%", "tone": "red"},
      {"label": "Fast service", "april": "-4%", "may": "+1%", "june": "75%", "goal": "78%", "tone": "red"},
      {"label": "Attentive / friendly", "april": "+0%", "may": "+4%", "june": "85%", "goal": "84%", "tone": "green"},
      {"label": "Order accuracy", "april": "-0%", "may": "+0%", "june": "95%", "goal": "96%", "tone": "red"},
      {"label": "SOS (Total Time)", "april": "—", "may": "—", "june": "3:33", "goal": "3:30", "tone": "red"}
    ]}
  }},
  "results": {
    "lead": "Guest feedback shows strengths in overall satisfaction and attentiveness, with clear opportunities across several measures.",
    "summaryAria": "Two of six goals met",
    "summaryValue": "2",
    "summaryTone": "red",
    "headlineMetrics": [
      {"label": "Overall satisfaction", "value": "85%", "goal": "Goal 83%", "status": "On track", "positive": true, "tone": "green"},
      {"label": "Taste of food", "value": "79%", "goal": "Goal 83%", "status": "Needs focus", "positive": false, "tone": "red"},
      {"label": "SOS (Total Time)", "value": "3:33", "goal": "Goal 3:30", "status": "Needs focus", "positive": false, "tone": "red"}
    ],
    "scorecard": {"rows": [
      {"label": "Overall satisfaction", "april": "+2%", "may": "+5%", "june": "85%", "goal": "83%", "tone": "green"},
      {"label": "Taste of food", "april": "-5%", "may": "-2%", "june": "79%", "goal": "83%", "tone": "red"},
      {"label": "Fast service", "april": "-4%", "may": "+1%", "june": "75%", "goal": "78%", "tone": "red"},
      {"label": "Attentive / friendly", "april": "+0%", "may": "+4%", "june": "85%", "goal": "84%", "tone": "green"},
      {"label": "Order accuracy", "april": "-0%", "may": "+0%", "june": "95%", "goal": "96%", "tone": "red"},
      {"label": "SOS (Total Time)", "april": "—", "may": "—", "june": "3:33", "goal": "3:30", "tone": "red"}
    ]},
    "momentum": {
      "heading": "Let’s refocus, team.",
      "body": "Two of six measured goals are met. Let’s focus on taste of food, fast service, order accuracy, and SOS.",
      "tone": "needs-work"
    }
  },
  "visual": {"richOverrides": {
    "home.footer.line": null,
    "home.overview.recognitionCard.title": null,
    "home.overview.recognitionCard.detail": null,
    "home.recognition.feature.heading": null,
    "home.recognition.feature.body": null,
    "home.recognition.birthday.name": null,
    "home.recognition.birthday.date": null,
    "home.recognition.birthday.entries.0.name": null,
    "home.recognition.birthday.entries.0.date": null,
    "home.recognition.birthday.entries.1.name": null,
    "home.recognition.birthday.entries.1.date": null,
    "home.recognition.anniversaries.entries.0.name": null,
    "home.recognition.anniversaries.entries.0.detail": null,
    "home.recognition.anniversaries.entries.1.name": null,
    "home.recognition.anniversaries.entries.1.detail": null,
    "home.recognition.anniversaries.entries.2.name": null,
    "home.recognition.anniversaries.entries.2.detail": null,
    "shared.scorecard.intro": null,
    "shared.scorecard.resultValue": null,
    "shared.scorecard.table.rows.0.april": null,
    "shared.scorecard.table.rows.0.may": null,
    "shared.scorecard.table.rows.0.june": null,
    "shared.scorecard.table.rows.1.april": null,
    "shared.scorecard.table.rows.1.may": null,
    "shared.scorecard.table.rows.1.june": null,
    "shared.scorecard.table.rows.2.april": null,
    "shared.scorecard.table.rows.2.may": null,
    "shared.scorecard.table.rows.2.june": null,
    "shared.scorecard.table.rows.3.april": null,
    "shared.scorecard.table.rows.3.may": null,
    "shared.scorecard.table.rows.3.june": null,
    "shared.scorecard.table.rows.4.april": null,
    "shared.scorecard.table.rows.4.may": null,
    "shared.scorecard.table.rows.4.june": null,
    "shared.scorecard.table.rows.5.goal": null,
    "results.lead": null,
    "results.summaryValue": null,
    "results.headlineMetrics.0.value": null,
    "results.headlineMetrics.1.value": null,
    "results.headlineMetrics.1.status": null,
    "results.headlineMetrics.2.goal": null,
    "results.momentum.heading": null,
    "results.momentum.body": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_patch(`draft`, (SELECT `payload` FROM `issue_patch`)) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_patch(`published`, (SELECT `payload` FROM `issue_patch`)) ELSE `published` END
WHERE `id` = 'singleton';

--> statement-breakpoint

UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_set(
    `draft`,
    '$.visual.pages.home.items[' || COALESCE((
      SELECT `key` FROM json_each(`draft`, '$.visual.pages.home.items')
      WHERE json_extract(`value`, '$.id') = 'home-birthday' LIMIT 1
    ), 7) || '].style.hidden', json('false'),
    '$.visual.pages.home.items[' || COALESCE((
      SELECT `key` FROM json_each(`draft`, '$.visual.pages.home.items')
      WHERE json_extract(`value`, '$.id') = 'home-anniversaries' LIMIT 1
    ), 8) || '].style.hidden', json('false')
  ) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_set(
    `published`,
    '$.visual.pages.home.items[' || COALESCE((
      SELECT `key` FROM json_each(`published`, '$.visual.pages.home.items')
      WHERE json_extract(`value`, '$.id') = 'home-birthday' LIMIT 1
    ), 7) || '].style.hidden', json('false'),
    '$.visual.pages.home.items[' || COALESCE((
      SELECT `key` FROM json_each(`published`, '$.visual.pages.home.items')
      WHERE json_extract(`value`, '$.id') = 'home-anniversaries' LIMIT 1
    ), 8) || '].style.hidden', json('false')
  ) ELSE `published` END,
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
