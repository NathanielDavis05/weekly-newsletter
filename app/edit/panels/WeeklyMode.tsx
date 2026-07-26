"use client";

// Weekly Content Mode — the default view for a routine update.
//
// Advanced Design Mode shows the newsletter as a canvas of elements. This shows
// it as the handful of sections a manager actually thinks in: what's here, is
// it finished, is anything out of date. No layout properties, no element tree.
//
// Section status is derived, not stored: emptiness comes from the content
// itself and problems come from the same validation service the publish
// checklist uses, so the two can never disagree.

import { richTextToPlain } from "../../content/richtext";
import type { NewsletterContent, VisualDocument, VisualPageId } from "../../content/types";
import type { ValidationIssue } from "../publishing/validation";

export type SectionState = "ready" | "empty" | "attention" | "hidden";

export interface WeeklySection {
  itemId: string;
  label: string;
  page: VisualPageId;
  state: SectionState;
  /** Short human note under the title. */
  note: string;
  issues: ValidationIssue[];
  hidden: boolean;
  isNative: boolean;
}

/** Human names for the fixed sections, in place of their internal ids. */
const SECTION_NAMES: Record<string, string> = {
  "home-overview-intro": "This week at a glance",
  "home-action": "Action required",
  "home-event": "Featured event",
  "home-recognition-link": "Recognition teaser",
  "home-scorecard": "Scorecard",
  "home-recognition-heading": "Recognition heading",
  "home-recognition-feature": "Team recognition",
  "home-birthday": "Birthdays",
  "home-anniversaries": "Work anniversaries",
  "home-events": "Upcoming events",
  "home-grow": "Leadership opportunity",
  "home-referral": "Referral bonus",
  "home-footer": "Footer",
  "home-signin": "Reader sign-in",
  "training-intro": "Training introduction",
  "training-status": "Training deadlines",
  "training-action": "Training button",
  "training-alert": "Scheduling alert",
  "training-covers": "What training covers",
  "training-why": "Why it matters",
  "training-help": "Need a hand?",
  "results-intro": "Results introduction",
  "results-summary": "Goals met",
  "results-metric-0": "Metric — overall satisfaction",
  "results-metric-1": "Metric — taste of food",
  "results-metric-2": "Metric — speed of service",
  "results-focus": "This month's focus",
  "results-scorecard": "Three-month scorecard",
  "results-momentum": "Momentum note",
};

/**
 * Text that belongs to each fixed section, so "is it filled in?" can be
 * answered without the section having to describe itself.
 */
function nativeSectionText(content: NewsletterContent, nativeId: string): string {
  const { home, training, results, shared } = content;
  const map: Record<string, string[]> = {
    "home-overview-intro": [home.overview.heading, home.overview.intro],
    "home-action": [home.overview.actionCard.heading, home.overview.actionCard.bodyPrefix, home.overview.actionCard.bodyEmphasis],
    "home-event": [home.overview.eventCard.title, home.overview.eventCard.detail],
    "home-recognition-link": [home.overview.recognitionCard.title, home.overview.recognitionCard.detail],
    "home-scorecard": [shared.scorecard.heading, shared.scorecard.resultValue],
    "home-recognition-heading": [home.recognition.heading],
    "home-recognition-feature": [home.recognition.feature.heading, home.recognition.feature.body],
    "home-birthday": (home.recognition.birthday.entries ?? [{ name: home.recognition.birthday.name, date: home.recognition.birthday.date }]).flatMap((entry) => [entry.name, entry.date]),
    "home-anniversaries": home.recognition.anniversaries.entries.map((entry) => entry.name),
    "home-events": home.events.items.map((event) => event.name),
    "home-grow": [home.grow.heading, home.grow.body],
    "home-referral": [home.grow.referralStrong, home.grow.referralRest],
    "home-footer": [home.footer.brand, home.footer.line],
    "home-signin": [home.signin.heading, home.signin.lead, home.signin.doneHeading, home.signin.doneBody],
    "training-intro": [training.heading, training.lead],
    "training-status": training.statusRows.map((row) => row.strongPrefix),
    "training-action": [training.primaryButton.label],
    "training-alert": [training.alert.body],
    "training-covers": training.covers.items,
    "training-why": training.why.paragraphs,
    "training-help": [training.help.heading, training.help.body],
    "results-intro": [results.heading, results.lead],
    "results-summary": [results.summaryValue, results.summaryLabel],
    "results-metric-0": [results.headlineMetrics[0]?.label ?? "", results.headlineMetrics[0]?.value ?? ""],
    "results-metric-1": [results.headlineMetrics[1]?.label ?? "", results.headlineMetrics[1]?.value ?? ""],
    "results-metric-2": [results.headlineMetrics[2]?.label ?? "", results.headlineMetrics[2]?.value ?? ""],
    "results-focus": [results.focus.heading, results.focus.body],
    "results-scorecard": [shared.scorecard.heading, ...shared.scorecard.table.rows.map((row) => row.label)],
    "results-momentum": [results.momentum.heading, results.momentum.body],
  };
  return (map[nativeId] ?? []).join(" ").trim();
}

/** Builds the section list for one page, newest state derived from content. */
export function buildSections(
  content: NewsletterContent,
  document: VisualDocument,
  page: VisualPageId,
  issues: ValidationIssue[],
): WeeklySection[] {
  const target = document.pages[page];
  const order = target.rows.flatMap((row) => row.itemIds);

  return order.flatMap((itemId) => {
    const item = target.items.find((candidate) => candidate.id === itemId);
    if (!item) return [];

    const nativeId = item.nativeId ?? item.id;
    const text = item.kind === "native"
      ? nativeSectionText(content, nativeId)
      : `${richTextToPlain(item.richTitle)} ${richTextToPlain(item.richBody)} ${item.imageUrl ?? ""}`.trim();

    const own = issues.filter((issue) => issue.itemId === item.id && issue.page === page);
    const hidden = Boolean(item.style?.hidden);
    const empty = text.length === 0;

    const state: SectionState = hidden ? "hidden" : empty ? "empty" : own.length ? "attention" : "ready";
    const note = hidden
      ? "Hidden — readers will not see this"
      : empty
        ? "Nothing filled in yet"
        : own.length
          ? own[0].message
          : text.length > 70 ? `${text.slice(0, 70)}…` : text;

    return [{
      itemId: item.id,
      label: SECTION_NAMES[nativeId] ?? item.label,
      page,
      state,
      note,
      issues: own,
      hidden,
      isNative: item.kind === "native",
    }];
  });
}

const STATE_LABEL: Record<SectionState, string> = {
  ready: "Ready",
  empty: "Needs content",
  attention: "Needs a look",
  hidden: "Hidden",
};

export interface WeeklyModeProps {
  sections: WeeklySection[];
  selectedId: string | null;
  onEdit: (itemId: string) => void;
  onToggleHidden: (itemId: string, hidden: boolean) => void;
  onMove: (itemId: string, direction: number) => void;
  onCreateNextIssue: () => void;
  onOpenChecklist: () => void;
}

export function WeeklyMode({
  sections,
  selectedId,
  onEdit,
  onToggleHidden,
  onMove,
  onCreateNextIssue,
  onOpenChecklist,
}: WeeklyModeProps) {
  const needsWork = sections.filter((section) => section.state === "empty" || section.state === "attention").length;

  return (
    <div className="weekly">
      <div className="weekly__head">
        <div>
          <h2>This week&rsquo;s issue</h2>
          <p>{needsWork ? `${needsWork} section${needsWork === 1 ? "" : "s"} need attention` : "Every section is filled in"}</p>
        </div>
        <button type="button" className="weekly__next" onClick={onCreateNextIssue}>Create next issue</button>
      </div>

      <ol className="weekly__list">
        {sections.map((section, index) => (
          <li
            key={section.itemId}
            className={`weekly-section weekly-section--${section.state}${selectedId === section.itemId ? " is-selected" : ""}`}
          >
            <button type="button" className="weekly-section__main" onClick={() => onEdit(section.itemId)}>
              <span className="weekly-section__state" aria-hidden="true" />
              <span className="weekly-section__text">
                <strong>{section.label}</strong>
                <small>{section.note}</small>
              </span>
              <span className="weekly-section__badge">{STATE_LABEL[section.state]}</span>
            </button>
            <div className="weekly-section__tools">
              <button type="button" onClick={() => onMove(section.itemId, -1)} disabled={index === 0} aria-label={`Move ${section.label} up`}>↑</button>
              <button type="button" onClick={() => onMove(section.itemId, 1)} disabled={index === sections.length - 1} aria-label={`Move ${section.label} down`}>↓</button>
              <button
                type="button"
                onClick={() => onToggleHidden(section.itemId, !section.hidden)}
                aria-label={section.hidden ? `Show ${section.label}` : `Hide ${section.label}`}
                title={section.hidden ? "Show" : "Hide"}
              >
                {section.hidden ? "◌" : "◉"}
              </button>
            </div>
          </li>
        ))}
      </ol>

      <button type="button" className="weekly__check" onClick={onOpenChecklist}>Check before publishing</button>
    </div>
  );
}
