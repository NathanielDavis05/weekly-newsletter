-- Publish the August 24 issue from the supplied weekly events, guest shoutout,
-- CEM scorecard, and SOS total time. Preserve editor-owned layout and styling,
-- while clearing rich-text overrides that could keep last week's copy visible.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-aug-24-2026-' || `revision`,
  'save',
  COALESCE(`published`, `draft`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before August 24 newsletter update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`published`, `draft`) IS NOT NULL;

--> statement-breakpoint

WITH `issue_patch` (`payload`) AS (VALUES (json('{
  "home": {
    "hero": {"kicker": "Team update · Aug 24, 2026"},
    "overview": {
      "eyebrow": "Week of August 24",
      "eventCard": {
        "icon": "24",
        "kicker": "Monday",
        "title": "TAMU First Day of Classes — Fall 2026",
        "detail": "August 24"
      },
      "recognitionCard": {
        "title": "Katie Davis",
        "detail": "Mentioned in a guest comment this week"
      }
    },
    "scorecard": {
      "intro": "Guest feedback shows strengths in overall satisfaction and order accuracy, with opportunities in taste, fast service, attentiveness, and SOS.",
      "resultAria": "2 of 6 goals met",
      "resultValue": "2",
      "focusValue": "SOS (Total Time) · 3:45"
    },
    "recognition": {
      "feature": {
        "heading": "Shoutout from a Guest",
        "body": "Katie Davis was mentioned in a comment by a guest this week."
      },
      "birthday": {
        "name": "Jeremiel Fernandez",
        "date": "August 25",
        "entries": [
          {"name": "Jeremiel Fernandez", "date": "August 25"},
          {"name": "Katriel Oyler", "date": "August 25"},
          {"name": "Cynthia Vargas", "date": "August 26"}
        ]
      },
      "anniversaries": {"entries": [
        {"name": "Benedict Cruz — August 27", "detail": "1 year with CFA"},
        {"name": "Katriel Oyler — August 27", "detail": "1 year with CFA"}
      ]}
    },
    "events": {"items": [
      {"date": "Aug 24", "name": "TAMU First Day of Classes — Fall 2026", "featured": true},
      {"date": "Aug 24", "name": "New LTOs"},
      {"date": "Aug 27", "name": "TAMU Soccer vs. Air Force"},
      {"date": "Aug 27–29", "name": "Legends Invitational"},
      {"date": "Aug 28–30", "name": "Aggie Mom Fall Federation Weekend"},
      {"date": "Aug 28–30", "name": "TAMU Volleyball Invitational"},
      {"date": "Aug 29", "name": "HERPS Exotic Reptile & Pet Expo"}
    ]},
    "footer": {"line": "Team newsletter · August 24, 2026"}
  },
  "shared": {"scorecard": {
    "homeTone": "red",
    "intro": "Guest feedback shows strengths in overall satisfaction and order accuracy, with opportunities in taste, fast service, attentiveness, and SOS.",
    "resultAria": "2 of 6 goals met",
    "resultValue": "2",
    "focusValue": "SOS (Total Time) · 3:45",
    "table": {"rows": [
      {"label": "Overall satisfaction", "april": "-0%", "may": "+3%", "june": "83%", "goal": "83%", "tone": "green"},
      {"label": "Taste of food", "april": "-4%", "may": "+0%", "june": "81%", "goal": "83%", "tone": "red"},
      {"label": "Fast service", "april": "-4%", "may": "+0%", "june": "75%", "goal": "78%", "tone": "red"},
      {"label": "Attentive / friendly", "april": "-4%", "may": "+0%", "june": "81%", "goal": "84%", "tone": "red"},
      {"label": "Order accuracy", "april": "+1%", "may": "+1%", "june": "96%", "goal": "96%", "tone": "green"},
      {"label": "SOS (Total Time)", "april": "—", "may": "—", "june": "3:45", "goal": "3:30", "tone": "red"}
    ]}
  }},
  "results": {
    "lead": "Guest feedback shows strengths in overall satisfaction and order accuracy, with opportunities in taste, fast service, attentiveness, and SOS.",
    "summaryAria": "Two of six goals met",
    "summaryValue": "2",
    "summaryTone": "red",
    "headlineMetrics": [
      {"label": "Overall satisfaction", "value": "83%", "goal": "Goal 83%", "status": "On track", "positive": true, "tone": "green"},
      {"label": "Taste of food", "value": "81%", "goal": "Goal 83%", "status": "Needs focus", "positive": false, "tone": "red"},
      {"label": "SOS (Total Time)", "value": "3:45", "goal": "Goal 3:30", "status": "Needs focus", "positive": false, "tone": "red"}
    ],
    "scorecard": {"rows": [
      {"label": "Overall satisfaction", "april": "-0%", "may": "+3%", "june": "83%", "goal": "83%", "tone": "green"},
      {"label": "Taste of food", "april": "-4%", "may": "+0%", "june": "81%", "goal": "83%", "tone": "red"},
      {"label": "Fast service", "april": "-4%", "may": "+0%", "june": "75%", "goal": "78%", "tone": "red"},
      {"label": "Attentive / friendly", "april": "-4%", "may": "+0%", "june": "81%", "goal": "84%", "tone": "red"},
      {"label": "Order accuracy", "april": "+1%", "may": "+1%", "june": "96%", "goal": "96%", "tone": "green"},
      {"label": "SOS (Total Time)", "april": "—", "may": "—", "june": "3:45", "goal": "3:30", "tone": "red"}
    ]},
    "momentum": {
      "heading": "Let’s refocus, team.",
      "body": "Two of six measured goals are met. Let’s focus on taste of food, fast service, attentiveness, and SOS.",
      "tone": "needs-work"
    }
  },
  "visual": {"richOverrides": {
    "home.overview.eyebrow": null,
    "home.overview.eventCard.icon": null,
    "home.overview.eventCard.kicker": null,
    "home.overview.eventCard.title": null,
    "home.overview.eventCard.detail": null,
    "home.overview.recognitionCard.title": null,
    "home.overview.recognitionCard.detail": null,
    "home.scorecard.intro": null,
    "home.scorecard.resultValue": null,
    "home.scorecard.focusValue": null,
    "home.recognition.feature.heading": null,
    "home.recognition.feature.body": null,
    "home.recognition.birthday.name": null,
    "home.recognition.birthday.date": null,
    "home.recognition.birthday.entries.0.name": null,
    "home.recognition.birthday.entries.0.date": null,
    "home.recognition.birthday.entries.1.name": null,
    "home.recognition.birthday.entries.1.date": null,
    "home.recognition.birthday.entries.2.name": null,
    "home.recognition.birthday.entries.2.date": null,
    "home.recognition.anniversaries.entries.0.name": null,
    "home.recognition.anniversaries.entries.0.detail": null,
    "home.recognition.anniversaries.entries.1.name": null,
    "home.recognition.anniversaries.entries.1.detail": null,
    "home.recognition.anniversaries.entries.2.name": null,
    "home.recognition.anniversaries.entries.2.detail": null,
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
    "home.events.items.6.name": null,
    "home.footer.line": null,
    "shared.scorecard.intro": null,
    "shared.scorecard.resultValue": null,
    "shared.scorecard.focusValue": null,
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
    "shared.scorecard.table.rows.5.april": null,
    "shared.scorecard.table.rows.5.may": null,
    "shared.scorecard.table.rows.5.june": null,
    "results.lead": null,
    "results.summaryValue": null,
    "results.headlineMetrics.0.value": null,
    "results.headlineMetrics.0.status": null,
    "results.headlineMetrics.1.value": null,
    "results.headlineMetrics.1.status": null,
    "results.headlineMetrics.2.value": null,
    "results.headlineMetrics.2.status": null,
    "results.scorecard.rows.0.april": null,
    "results.scorecard.rows.0.may": null,
    "results.scorecard.rows.0.june": null,
    "results.scorecard.rows.1.april": null,
    "results.scorecard.rows.1.may": null,
    "results.scorecard.rows.1.june": null,
    "results.scorecard.rows.2.april": null,
    "results.scorecard.rows.2.may": null,
    "results.scorecard.rows.2.june": null,
    "results.scorecard.rows.3.april": null,
    "results.scorecard.rows.3.may": null,
    "results.scorecard.rows.3.june": null,
    "results.scorecard.rows.4.april": null,
    "results.scorecard.rows.4.may": null,
    "results.scorecard.rows.4.june": null,
    "results.scorecard.rows.5.april": null,
    "results.scorecard.rows.5.may": null,
    "results.scorecard.rows.5.june": null,
    "results.momentum.heading": null,
    "results.momentum.body": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_patch(`draft`, (SELECT `payload` FROM `issue_patch`)) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_patch(`published`, (SELECT `payload` FROM `issue_patch`)) ELSE `published` END,
  `revision` = `revision` + 1,
  `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `id` = 'singleton';

--> statement-breakpoint

INSERT OR REPLACE INTO `newsletter_issues`
  (`issue_key`, `title`, `content`, `published_at`)
SELECT
  'i_koly8k',
  json_extract(`published`, '$.home.hero.kicker'),
  `published`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `newsletter_content`
WHERE `id` = 'singleton' AND json_valid(`published`);
