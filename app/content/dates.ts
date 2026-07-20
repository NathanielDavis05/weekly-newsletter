// Lenient date handling for newsletter copy.
//
// Dates in this newsletter are written by hand, for people to read, in whatever
// shape reads best: "July 10, 2026", "Week of July 12", "Jul 12–16",
// "Complete Pathway training by July 28", "Ava G. · July 9". Nothing is stored
// as an ISO timestamp, and changing that would mean rewriting every field.
//
// So instead of imposing a format, this module reads the formats already in
// use. It powers the past-deadline warnings, the chronological sort, and the
// "Create next issue" clear-out. Everything is pure and unit-tested, because
// getting a date wrong here means telling a manager their live newsletter is
// stale when it isn't.

export interface ParsedDate {
  /** First day the text refers to. */
  start: Date;
  /** Last day — same as `start` unless the text is a range. */
  end: Date;
  /** True when the year was inferred rather than written. */
  yearInferred: boolean;
  /** The matched substring, so callers can rewrite just that part. */
  match: string;
}

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Both hyphen and en-dash are used for ranges in the existing copy. */
const DASH = "[–—-]";

// "July 10, 2026" / "Jul 12–16" / "July 14" / "Jul 15–20, 2026"
const DATE_PATTERN = new RegExp(
  String.raw`\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:\s*${DASH}\s*(\d{1,2}))?(?:,?\s*(\d{4}))?\b`,
);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/**
 * Finds the first date in a string. `referenceYear` supplies the year when the
 * text omits it — which is the common case in this newsletter.
 */
export function parseNewsletterDate(text: string, referenceYear?: number): ParsedDate | null {
  if (typeof text !== "string" || !text) return null;
  const match = DATE_PATTERN.exec(text);
  if (!match) return null;

  const month = MONTHS[match[1].toLowerCase()];
  if (month === undefined) return null;

  const day = Number(match[2]);
  if (day < 1 || day > 31) return null;

  const endDay = match[3] ? Number(match[3]) : day;
  const writtenYear = match[4] ? Number(match[4]) : undefined;
  const year = writtenYear ?? referenceYear ?? new Date().getFullYear();

  const start = new Date(year, month, day);
  // A range that appears to run backwards ("Dec 28–3") crosses a month; treat
  // the end as falling in the following month rather than producing nonsense.
  const end = endDay >= day ? new Date(year, month, endDay) : new Date(year, month + 1, endDay);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  return { start, end, yearInferred: writtenYear === undefined, match: match[0] };
}

/** True when every day the text refers to is already behind `today`. */
export function isExpired(text: string, today: Date, referenceYear?: number): boolean {
  const parsed = parseNewsletterDate(text, referenceYear);
  if (!parsed) return false;
  return parsed.end.getTime() < startOfDay(today).getTime();
}

/** Days until the date; negative once it has passed. Null if unparseable. */
export function daysUntil(text: string, today: Date, referenceYear?: number): number | null {
  const parsed = parseNewsletterDate(text, referenceYear);
  if (!parsed) return null;
  const diff = startOfDay(parsed.end).getTime() - startOfDay(today).getTime();
  return Math.round(diff / 86_400_000);
}

/** Sort comparator for anything carrying a date string. */
export function compareByDate(a: string, b: string, referenceYear?: number): number {
  const first = parseNewsletterDate(a, referenceYear);
  const second = parseNewsletterDate(b, referenceYear);
  // Undated entries sort last rather than jumping to the top.
  if (!first && !second) return 0;
  if (!first) return 1;
  if (!second) return -1;
  return first.start.getTime() - second.start.getTime();
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export type DateStyle = "long" | "short";

/** "July 10, 2026" or "Jul 10" — matching the two styles already in use. */
export function formatDate(date: Date, style: DateStyle = "long", withYear = style === "long"): string {
  const month = MONTH_NAMES[date.getMonth()];
  const name = style === "short" ? month.slice(0, 3) : month;
  return withYear ? `${name} ${date.getDate()}, ${date.getFullYear()}` : `${name} ${date.getDate()}`;
}

/**
 * Rewrites the date inside a string, preserving the surrounding words and the
 * original style. "Team update · July 10, 2026" shifted by 7 days becomes
 * "Team update · July 17, 2026" — the prefix is untouched.
 */
export function shiftDateInText(text: string, days: number, referenceYear?: number): string {
  const parsed = parseNewsletterDate(text, referenceYear);
  if (!parsed) return text;

  const shift = (date: Date) => new Date(date.getTime() + days * 86_400_000);
  const nextStart = shift(parsed.start);
  const nextEnd = shift(parsed.end);

  // Mirror the source: abbreviated or full month, year written or omitted.
  const abbreviated = /^[A-Za-z]{3}\.?\s/.test(parsed.match) && !/^May\s/i.test(parsed.match);
  const style: DateStyle = abbreviated ? "short" : "long";
  const withYear = !parsed.yearInferred;

  const isRange = nextEnd.getTime() !== nextStart.getTime();
  const replacement = isRange
    ? nextStart.getMonth() === nextEnd.getMonth()
      // Same month: keep the compact "Jul 12–16" shape.
      ? `${formatDate(nextStart, style, false)}–${nextEnd.getDate()}${withYear ? `, ${nextEnd.getFullYear()}` : ""}`
      : `${formatDate(nextStart, style, false)}–${formatDate(nextEnd, style, false)}${withYear ? `, ${nextEnd.getFullYear()}` : ""}`
    : formatDate(nextStart, style, withYear);

  return text.replace(parsed.match, replacement);
}

/** The issue date drives every other date's inferred year. */
export function issueYear(issueDateText: string): number {
  return parseNewsletterDate(issueDateText)?.start.getFullYear() ?? new Date().getFullYear();
}
