-- Replace CommercePoint support with the Fall Promotion training for every
-- FOH and BOH team member, while retaining the existing Pathway destination.

INSERT OR IGNORE INTO `newsletter_versions`
  (`id`, `kind`, `content`, `revision`, `created_at`, `label`, `author`)
SELECT
  'migration-fall-promotion-training-' || `revision`,
  'save',
  COALESCE(`published`, `draft`),
  `revision`,
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
  'Before Fall Promotion training update',
  'Codex'
FROM `newsletter_content`
WHERE `id` = 'singleton' AND COALESCE(`published`, `draft`) IS NOT NULL;

--> statement-breakpoint

WITH `training_patch` (`payload`) AS (VALUES (json('{
  "home": {"overview": {"actionCard": {
    "icon": "AUG",
    "label": "Action required",
    "heading": "Fall seasonal items training",
    "bodyPrefix": "All Front of House and Back of House team members: ",
    "bodyEmphasis": "starts Monday, August 24.",
    "micro": "Complete the Fall Promotion assignment in Pathway.",
    "linkLabel": "Open Pathway training",
    "linkHref": "/training"
  }}},
  "training": {
    "badge": "Required training",
    "heading": "Fall seasonal items training",
    "lead": "All Front of House and Back of House team members: complete the Fall Promotion training in Pathway as the rollout begins Monday, August 24.",
    "statusRows": [
      {"token": "ALL", "tokenRed": true, "label": "Who", "strongPrefix": "Front of House and Back of House team members", "strongEmphasis": ""},
      {"token": "AUG 24", "tokenRed": true, "label": "Starts", "strongPrefix": "Monday, August 24", "strongEmphasis": "Fall rollout"},
      {"token": "PATH", "tokenRed": false, "label": "Training", "strongPrefix": "Fall Promotion Pathway assignment", "strongEmphasis": "Complete it in Pathway"}
    ],
    "primaryButton": {"label": "Open Fall Promotion training", "href": "https://www.cfawestbryan.com/promotion"},
    "helpLink": {"label": "Need help? Ask a leader", "href": "#leader-help"},
    "alert": {
      "kicker": "Starts Monday, August 24",
      "body": "The Fall Promotion Pathway assignment covers the seasonal menu and the role-specific procedures FOH and BOH need for a smooth launch."
    },
    "covers": {
      "eyebrow": "Fall Promotion 2026",
      "heading": "What the training covers",
      "items": [
        "Cold coffee platform: Iced Coffee flavors and Cream Cold Brew",
        "Chicken & Waffles Sandwich",
        "S’mores Milkshake and S’mores Frosted Coffee",
        "FOH beverage builds, guest ordering, and availability",
        "BOH waffle heating, holding, and sandwich execution"
      ]
    },
    "why": {
      "eyebrow": "One seasonal launch",
      "heading": "Every role plays a part",
      "paragraphs": [
        "FOH helps guests understand the seasonal options and keeps orders accurate. BOH delivers the right builds, heating, holding, and sandwich execution every time.",
        "Use the Pathway assignment to review the procedures for your role before the Monday rollout, and ask a leader for help with an assignment or login."
      ]
    },
    "help": {
      "mark": "?",
      "heading": "Need a hand?",
      "body": "Ask the leader on duty for help finding your Fall Promotion assignment or accessing your Pathway login credentials."
    }
  },
  "visual": {"richOverrides": {
    "home.overview.actionCard.label": null,
    "home.overview.actionCard.heading": null,
    "home.overview.actionCard.bodyPrefix": null,
    "home.overview.actionCard.bodyEmphasis": null,
    "home.overview.actionCard.micro": null,
    "home.overview.actionCard.linkLabel": null,
    "training.badge": null,
    "training.heading": null,
    "training.lead": null,
    "training.statusRows.0.label": null,
    "training.statusRows.0.strongPrefix": null,
    "training.statusRows.0.strongEmphasis": null,
    "training.statusRows.1.label": null,
    "training.statusRows.1.strongPrefix": null,
    "training.statusRows.1.strongEmphasis": null,
    "training.statusRows.2.label": null,
    "training.statusRows.2.strongPrefix": null,
    "training.statusRows.2.strongEmphasis": null,
    "training.primaryButton.label": null,
    "training.helpLink.label": null,
    "training.alert.kicker": null,
    "training.alert.body": null,
    "training.covers.eyebrow": null,
    "training.covers.heading": null,
    "training.covers.items.0": null,
    "training.covers.items.1": null,
    "training.covers.items.2": null,
    "training.covers.items.3": null,
    "training.covers.items.4": null,
    "training.why.eyebrow": null,
    "training.why.heading": null,
    "training.why.paragraphs.0": null,
    "training.why.paragraphs.1": null,
    "training.help.heading": null,
    "training.help.body": null
  }}
}')))
UPDATE `newsletter_content`
SET
  `draft` = CASE WHEN json_valid(`draft`) THEN json_patch(`draft`, (SELECT `payload` FROM `training_patch`)) ELSE `draft` END,
  `published` = CASE WHEN json_valid(`published`) THEN json_patch(`published`, (SELECT `payload` FROM `training_patch`)) ELSE `published` END,
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
