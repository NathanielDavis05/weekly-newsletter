// "Create next issue" — rolls the current newsletter forward a week.
//
// The design is preserved wholesale; only the time-sensitive copy is advanced
// or cleared. Everything is pure so the result can be previewed and tested, and
// so the caller decides when it becomes the draft — this never touches the
// published issue.
//
// The fiddly part is array pruning. Formatting overrides are keyed by index
// ("home.events.items.3.name"), so dropping event 1 would silently move event
// 3's formatting onto a different event. Overrides are remapped alongside every
// removal rather than left to rot.

import { formatDate, isExpired, parseNewsletterDate, shiftDateInText } from "../../content/dates";
import type { RichText } from "../../content/richtext";
import type { NewsletterContent, VisualDocument } from "../../content/types";

export interface NextIssueOptions {
  today?: Date;
  /** How far the issue advances. A week by default. */
  intervalDays?: number;
  /** Keep action-required items that have not yet passed their deadline. */
  carryIncompleteActions?: boolean;
}

export interface NextIssueResult {
  content: NewsletterContent;
  document: VisualDocument;
  /** Plain-language record of what changed, shown before it is applied. */
  summary: string[];
}

/** Fields whose date should move forward with the issue. */
const SHIFTED_DATE_PATHS = [
  "home.hero.kicker",
  "home.overview.eyebrow",
  "home.footer.line",
] as const;

/**
 * Rebuilds override keys after items are removed from an array.
 * `survivors` maps old index -> new index; anything absent was removed.
 */
function remapOverrides(
  overrides: Record<string, RichText>,
  arrayPath: string,
  survivors: Map<number, number>,
): Record<string, RichText> {
  const prefix = `${arrayPath}.`;
  const next: Record<string, RichText> = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (!key.startsWith(prefix)) {
      next[key] = value;
      continue;
    }
    const rest = key.slice(prefix.length);
    const [indexPart, ...tail] = rest.split(".");
    const oldIndex = Number(indexPart);
    if (!Number.isInteger(oldIndex)) {
      next[key] = value;
      continue;
    }
    const newIndex = survivors.get(oldIndex);
    // Dropped item: its formatting goes with it.
    if (newIndex === undefined) continue;
    next[`${prefix}${newIndex}${tail.length ? `.${tail.join(".")}` : ""}`] = value;
  }
  return next;
}

/** Removes overrides for a field (and anything nested under it). */
function dropOverrides(overrides: Record<string, RichText>, ...paths: string[]): Record<string, RichText> {
  const next: Record<string, RichText> = {};
  for (const [key, value] of Object.entries(overrides)) {
    if (paths.some((path) => key === path || key.startsWith(`${path}.`))) continue;
    next[key] = value;
  }
  return next;
}

export function createNextIssue(
  content: NewsletterContent,
  document: VisualDocument,
  options: NextIssueOptions = {},
): NextIssueResult {
  const today = options.today ?? new Date();
  const interval = options.intervalDays ?? 7;
  const next = structuredClone(content);
  let overrides = { ...document.richOverrides };
  const summary: string[] = [];

  // --- 1. advance the issue date ------------------------------------------
  const currentIssue = parseNewsletterDate(next.home.hero.kicker);
  for (const path of SHIFTED_DATE_PATHS) {
    const [a, b, c] = path.split(".") as [string, string, string];
    const holder = (next as unknown as Record<string, Record<string, Record<string, string>>>)[a][b];
    const before = holder[c];
    const after = shiftDateInText(before, interval);
    if (after !== before) holder[c] = after;
  }
  const nextIssueDate = currentIssue
    ? new Date(currentIssue.start.getTime() + interval * 86_400_000)
    : new Date(today.getTime() + interval * 86_400_000);
  summary.push(`Issue date moved to ${formatDate(nextIssueDate)}.`);

  // Everything below is judged against the new issue date, not today: an event
  // that has passed by the time the next issue goes out should already be gone.
  const cutoff = nextIssueDate;
  const year = nextIssueDate.getFullYear();

  // --- 2. drop events that will have passed --------------------------------
  const events = next.home.events.items;
  const keptEvents: typeof events = [];
  const eventSurvivors = new Map<number, number>();
  events.forEach((event, index) => {
    if (isExpired(event.date, cutoff, year)) return;
    eventSurvivors.set(index, keptEvents.length);
    keptEvents.push(event);
  });
  if (keptEvents.length !== events.length) {
    summary.push(`Removed ${events.length - keptEvents.length} past event${events.length - keptEvents.length === 1 ? "" : "s"}.`);
  }
  next.home.events.items = keptEvents;
  overrides = remapOverrides(overrides, "home.events.items", eventSurvivors);

  // --- 3. drop anniversaries that will have passed --------------------------
  const anniversaries = next.home.recognition.anniversaries.entries;
  const keptAnniversaries: typeof anniversaries = [];
  const anniversarySurvivors = new Map<number, number>();
  anniversaries.forEach((entry, index) => {
    if (isExpired(entry.name, cutoff, year)) return;
    anniversarySurvivors.set(index, keptAnniversaries.length);
    keptAnniversaries.push(entry);
  });
  if (keptAnniversaries.length !== anniversaries.length) {
    summary.push(`Removed ${anniversaries.length - keptAnniversaries.length} past anniversar${anniversaries.length - keptAnniversaries.length === 1 ? "y" : "ies"}.`);
  }
  next.home.recognition.anniversaries.entries = keptAnniversaries;
  overrides = remapOverrides(overrides, "home.recognition.anniversaries.entries", anniversarySurvivors);

  // --- 4. clear a birthday that has passed ----------------------------------
  if (next.home.recognition.birthday.date && isExpired(next.home.recognition.birthday.date, cutoff, year)) {
    next.home.recognition.birthday.name = "";
    next.home.recognition.birthday.date = "";
    overrides = dropOverrides(overrides, "home.recognition.birthday.name", "home.recognition.birthday.date");
    summary.push("Cleared last issue's birthday.");
  }

  // --- 5. clear last issue's recognition ------------------------------------
  if (next.home.recognition.feature.heading || next.home.recognition.feature.body) {
    next.home.recognition.feature.heading = "";
    next.home.recognition.feature.body = "";
    overrides = dropOverrides(overrides, "home.recognition.feature.heading", "home.recognition.feature.body");
    summary.push("Cleared last issue's recognition — add this week's.");
  }
  if (next.home.overview.recognitionCard.title || next.home.overview.recognitionCard.detail) {
    next.home.overview.recognitionCard.title = "";
    next.home.overview.recognitionCard.detail = "";
    overrides = dropOverrides(overrides, "home.overview.recognitionCard.title", "home.overview.recognitionCard.detail");
  }

  // --- 6. action items ------------------------------------------------------
  const actionDeadline = next.home.overview.actionCard.bodyEmphasis;
  const actionPassed = actionDeadline ? isExpired(actionDeadline, cutoff, year) : false;
  if (actionPassed && !options.carryIncompleteActions) {
    next.home.overview.actionCard.heading = "";
    next.home.overview.actionCard.bodyPrefix = "";
    next.home.overview.actionCard.bodyEmphasis = "";
    next.home.overview.actionCard.micro = "";
    overrides = dropOverrides(
      overrides,
      "home.overview.actionCard.heading",
      "home.overview.actionCard.bodyPrefix",
      "home.overview.actionCard.bodyEmphasis",
      "home.overview.actionCard.micro",
    );
    summary.push("Cleared the completed action item.");
  } else if (actionPassed) {
    summary.push(`Kept the action item — its ${actionDeadline.trim()} deadline has passed and needs a new date.`);
  } else if (actionDeadline) {
    summary.push(`Carried forward the action item, still due ${actionDeadline.trim()}.`);
  }

  // --- 7. featured event card ----------------------------------------------
  if (next.home.overview.eventCard.detail && isExpired(next.home.overview.eventCard.detail, cutoff, year)) {
    const upcoming = keptEvents.find((event) => event.featured) ?? keptEvents[0];
    if (upcoming) {
      next.home.overview.eventCard.title = upcoming.name;
      next.home.overview.eventCard.detail = upcoming.date;
      summary.push(`Featured event updated to "${upcoming.name}".`);
    } else {
      next.home.overview.eventCard.title = "";
      next.home.overview.eventCard.detail = "";
      summary.push("Cleared the featured event — no upcoming events remain.");
    }
    overrides = dropOverrides(overrides, "home.overview.eventCard.title", "home.overview.eventCard.detail");
  }

  if (summary.length === 1) summary.push("Nothing had expired — the copy carried over unchanged.");

  return {
    content: { ...next, visual: { ...document, richOverrides: overrides } },
    document: { ...document, richOverrides: overrides },
    summary,
  };
}
