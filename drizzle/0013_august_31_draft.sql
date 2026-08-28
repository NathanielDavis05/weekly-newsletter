-- Prepare the August 31 newsletter as a draft. The live August 24 issue stays
-- published until the manager adds the remaining events and publishes from the
-- editor. Scores remain visible, while all goal evaluation is temporarily
-- paused and shown with neutral treatment.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-aug-31-draft-' || `revision`,
  'save',
  COALESCE(`draft`, `published`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before August 31 draft update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`draft`, `published`) IS NOT NULL;

--> statement-breakpoint

WITH `issue_patch` (`payload`) AS (VALUES (json('{
  "home": {
    "hero": {
      "kicker": "Team update · Aug 31, 2026",
      "headline": "A busy week. A temporary reset."
    },
    "overview": {
      "eyebrow": "Week of August 31",
      "heading": "This week, at a glance",
      "intro": "With students back in town and seasonal items in full swing, this has been a stressful week for everyone. Thank you for staying flexible and supporting one another.",
      "actionCard": {
        "icon": "TEAM",
        "label": "Team focus",
        "heading": "Support one another through the rush",
        "bodyPrefix": "Students are back and seasonal items are in full swing. ",
        "bodyEmphasis": "Ask for help early, communicate clearly, and step in when you can.",
        "micro": "Use the Fall Promotion training as a quick refresher when you need it.",
        "linkLabel": "Review seasonal training",
        "linkHref": "/training"
      },
      "eventCard": {
        "icon": "TBD",
        "kicker": "Events",
        "title": "Details coming soon",
        "detail": "We’ll add this week’s events later"
      },
      "recognitionCard": {
        "title": "Catye Williams",
        "detail": "Mentioned in a guest comment this week"
      }
    },
    "scorecard": {
      "eyebrow": "August scorecard",
      "heading": "Guest experience",
      "intro": "Goal scoring is temporarily paused. We’re still sharing every current score for visibility, and no result will count against the team during the pause.",
      "resultAria": "Goal scoring is temporarily paused",
      "resultValue": "Paused",
      "resultUnit": "",
      "resultLabel": "goal scoring",
      "focusLabel": "Current SOS",
      "focusValue": "3:57",
      "buttonLabel": "View August results"
    },
    "recognition": {
      "feature": {
        "heading": "Shoutout from a Guest",
        "body": "Catye Williams received a customer shout-out this week. Thank you, Catye, for making a positive impression."
      },
      "birthday": {
        "name": "",
        "date": "",
        "entries": []
      },
      "anniversaries": {"entries": []}
    },
    "events": {
      "eyebrow": "Plan ahead",
      "heading": "What’s happening nearby",
      "intro": "This week’s events will be added here soon.",
      "items": []
    },
    "footer": {"line": "Team newsletter · August 31, 2026"}
  },
  "shared": {
    "scorecard": {
      "homeTone": "yellow",
      "eyebrow": "August scorecard",
      "heading": "Guest experience",
      "intro": "Goal scoring is temporarily paused. We’re still sharing every current score for visibility, and no result will count against the team during the pause.",
      "resultAria": "Goal scoring is temporarily paused",
      "resultValue": "Paused",
      "resultUnit": "",
      "resultLabel": "goal scoring",
      "focusLabel": "Current SOS",
      "focusValue": "3:57",
      "buttonLabel": "View August results",
      "table": {
        "eyebrow": "August snapshot",
        "heading": "Guest experience scorecard",
        "headerMeasure": "Measure",
        "headerGoal": "Goal status",
        "headerApr": "vs 3 mo",
        "headerMay": "vs region",
        "headerJun": "Current",
        "rows": [
          {"label": "Overall satisfaction", "april": "-2%", "may": "+1%", "june": "81%", "goal": "Paused", "tone": "white"},
          {"label": "Taste of food", "april": "-4%", "may": "+0%", "june": "81%", "goal": "Paused", "tone": "white"},
          {"label": "Fast service", "april": "-6%", "may": "-2%", "june": "72%", "goal": "Paused", "tone": "white"},
          {"label": "Attentive / friendly", "april": "-5%", "may": "-1%", "june": "80%", "goal": "Paused", "tone": "white"},
          {"label": "Cleanliness", "april": "-1%", "may": "+4%", "june": "82%", "goal": "Paused", "tone": "white"},
          {"label": "Ease of placing order", "april": "-2%", "may": "+2%", "june": "85%", "goal": "Paused", "tone": "white"},
          {"label": "Ease of receiving order", "april": "-2%", "may": "+2%", "june": "82%", "goal": "Paused", "tone": "white"},
          {"label": "Portion size", "april": "+4%", "may": "+6%", "june": "78%", "goal": "Paused", "tone": "white"},
          {"label": "Order accuracy", "april": "-0%", "may": "+0%", "june": "96%", "goal": "Paused", "tone": "white"},
          {"label": "Likelihood to eat again", "april": "-5%", "may": "-10%", "june": "73%", "goal": "Paused", "tone": "white"},
          {"label": "SOS (Total Time)", "april": "—", "may": "—", "june": "3:57", "goal": "Paused", "tone": "white"}
        ]
      }
    }
  },
  "results": {
    "eyebrow": "August scorecard",
    "heading": "Guest experience",
    "lead": "Goal scoring is temporarily paused. Every current score is still shown for visibility, and no result will count against the team during the pause.",
    "summaryAria": "Goal scoring is temporarily paused",
    "summaryValue": "Paused",
    "summaryUnit": "",
    "summaryLabel": "goal scoring",
    "summaryTone": "yellow",
    "headlineMetrics": [
      {"label": "Overall satisfaction", "value": "81%", "goal": "Goal scoring paused", "status": "Score shown", "positive": false, "tone": "white"},
      {"label": "Order accuracy", "value": "96%", "goal": "Goal scoring paused", "status": "Score shown", "positive": false, "tone": "white"},
      {"label": "SOS (Total Time)", "value": "3:57", "goal": "Goal scoring paused", "status": "Score shown", "positive": false, "tone": "white"}
    ],
    "focus": {
      "label": "This week’s focus",
      "heading": "Give each other some grace",
      "body": "With students back in town and seasonal items in full swing, this has been a stressful week. Communicate early, ask for help, and support the person next to you."
    },
    "scorecard": {
      "eyebrow": "The full picture",
      "heading": "Guest experience scorecard",
      "headerMeasure": "Measure",
      "headerGoal": "Goal status",
      "headerApr": "vs 3 mo",
      "headerMay": "vs region",
      "headerJun": "Current",
      "rows": [
        {"label": "Overall satisfaction", "april": "-2%", "may": "+1%", "june": "81%", "goal": "Paused", "tone": "white"},
        {"label": "Taste of food", "april": "-4%", "may": "+0%", "june": "81%", "goal": "Paused", "tone": "white"},
        {"label": "Fast service", "april": "-6%", "may": "-2%", "june": "72%", "goal": "Paused", "tone": "white"},
        {"label": "Attentive / friendly", "april": "-5%", "may": "-1%", "june": "80%", "goal": "Paused", "tone": "white"},
        {"label": "Cleanliness", "april": "-1%", "may": "+4%", "june": "82%", "goal": "Paused", "tone": "white"},
        {"label": "Ease of placing order", "april": "-2%", "may": "+2%", "june": "85%", "goal": "Paused", "tone": "white"},
        {"label": "Ease of receiving order", "april": "-2%", "may": "+2%", "june": "82%", "goal": "Paused", "tone": "white"},
        {"label": "Portion size", "april": "+4%", "may": "+6%", "june": "78%", "goal": "Paused", "tone": "white"},
        {"label": "Order accuracy", "april": "-0%", "may": "+0%", "june": "96%", "goal": "Paused", "tone": "white"},
        {"label": "Likelihood to eat again", "april": "-5%", "may": "-10%", "june": "73%", "goal": "Paused", "tone": "white"},
        {"label": "SOS (Total Time)", "april": "—", "may": "—", "june": "3:57", "goal": "Paused", "tone": "white"}
      ]
    },
    "momentum": {
      "heading": "Goals are on a temporary pause.",
      "body": "We’re still sharing every score for visibility, but no result is being counted against the team while goal scoring is paused.",
      "tone": "celebrate"
    }
  },
  "visual": {"richOverrides": {
    "home.hero.kicker": null,
    "home.hero.headline": null,
    "home.overview.eyebrow": null,
    "home.overview.heading": null,
    "home.overview.intro": null,
    "home.overview.actionCard.label": null,
    "home.overview.actionCard.heading": null,
    "home.overview.actionCard.bodyPrefix": null,
    "home.overview.actionCard.bodyEmphasis": null,
    "home.overview.actionCard.micro": null,
    "home.overview.actionCard.linkLabel": null,
    "home.overview.eventCard.kicker": null,
    "home.overview.eventCard.title": null,
    "home.overview.eventCard.detail": null,
    "home.overview.recognitionCard.title": null,
    "home.overview.recognitionCard.detail": null,
    "home.scorecard.intro": null,
    "home.scorecard.resultValue": null,
    "home.scorecard.resultUnit": null,
    "home.scorecard.resultLabel": null,
    "home.scorecard.focusLabel": null,
    "home.scorecard.focusValue": null,
    "home.recognition.feature.heading": null,
    "home.recognition.feature.body": null,
    "home.events.intro": null,
    "home.footer.line": null,
    "shared.scorecard.intro": null,
    "shared.scorecard.resultValue": null,
    "shared.scorecard.resultUnit": null,
    "shared.scorecard.resultLabel": null,
    "shared.scorecard.focusLabel": null,
    "shared.scorecard.focusValue": null,
    "shared.scorecard.table.headerGoal": null,
    "results.lead": null,
    "results.summaryValue": null,
    "results.summaryUnit": null,
    "results.summaryLabel": null,
    "results.headlineMetrics.0.label": null,
    "results.headlineMetrics.0.value": null,
    "results.headlineMetrics.0.goal": null,
    "results.headlineMetrics.0.status": null,
    "results.headlineMetrics.1.label": null,
    "results.headlineMetrics.1.value": null,
    "results.headlineMetrics.1.goal": null,
    "results.headlineMetrics.1.status": null,
    "results.headlineMetrics.2.label": null,
    "results.headlineMetrics.2.value": null,
    "results.headlineMetrics.2.goal": null,
    "results.headlineMetrics.2.status": null,
    "results.focus.label": null,
    "results.focus.heading": null,
    "results.focus.body": null,
    "results.momentum.heading": null,
    "results.momentum.body": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE
    WHEN json_valid(COALESCE(`draft`, `published`))
      THEN json_patch(COALESCE(`draft`, `published`), (SELECT `payload` FROM `issue_patch`))
    ELSE `draft`
  END,
  `revision` = `revision` + 1,
  `updated_at` = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE `id` = 'singleton';
