import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-resolve-loader.mjs", import.meta.url);

// Date parsing, publish validation, and the "create next issue" roll-forward.

const dates = await import("../app/content/dates.ts");
const { validateNewsletter } = await import("../app/edit/publishing/validation.ts");
const { createNextIssue } = await import("../app/edit/publishing/nextIssue.ts");
const { defaultContent } = await import("../app/content/defaults.ts");
const { visualDocument } = await import("../app/content/visual.ts");
const { richTextFromPlain, richTextToPlain } = await import("../app/content/richtext.ts");

const baseDoc = () => visualDocument(defaultContent);
const clone = (value) => structuredClone(value);

// ---------------------------------------------------------------------------
// Dates — the formats this newsletter actually uses
// ---------------------------------------------------------------------------

test("full dates with a year parse", () => {
  const parsed = dates.parseNewsletterDate("Team update · July 10, 2026");
  assert.equal(parsed.start.getFullYear(), 2026);
  assert.equal(parsed.start.getMonth(), 6);
  assert.equal(parsed.start.getDate(), 10);
  assert.equal(parsed.yearInferred, false);
});

test("dates without a year infer one from the issue", () => {
  const parsed = dates.parseNewsletterDate("Week of July 12", 2026);
  assert.equal(parsed.start.getFullYear(), 2026);
  assert.equal(parsed.yearInferred, true);
});

test("en-dash and hyphen ranges both parse, end-inclusive", () => {
  for (const text of ["Jul 12–16", "Jul 12-16", "Jul 12 – 16"]) {
    const parsed = dates.parseNewsletterDate(text, 2026);
    assert.equal(parsed.start.getDate(), 12, text);
    assert.equal(parsed.end.getDate(), 16, text);
  }
});

test("a date embedded in a sentence is found", () => {
  const parsed = dates.parseNewsletterDate("Complete Pathway training by July 28", 2026);
  assert.equal(parsed.start.getDate(), 28);
  assert.equal(parsed.match, "July 28");
});

test("abbreviated months and a trailing period parse", () => {
  assert.equal(dates.parseNewsletterDate("Sept. 3", 2026).start.getMonth(), 8);
  assert.equal(dates.parseNewsletterDate("Aug 1", 2026).start.getMonth(), 7);
});

test("text with no date returns null rather than guessing", () => {
  assert.equal(dates.parseNewsletterDate("Front of House team members"), null);
  assert.equal(dates.parseNewsletterDate(""), null);
  assert.equal(dates.parseNewsletterDate("Speed of service · 3:10"), null);
});

test("a range crossing a month end does not run backwards", () => {
  const parsed = dates.parseNewsletterDate("Dec 28–3", 2026);
  assert.ok(parsed.end.getTime() > parsed.start.getTime(), "the end follows the start");
  assert.equal(parsed.end.getMonth(), 0, "it rolls into January");
});

test("expiry is judged on the last day of a range", () => {
  const during = new Date(2026, 6, 14);
  assert.equal(dates.isExpired("Jul 12–16", during, 2026), false, "mid-range is not expired");
  assert.equal(dates.isExpired("Jul 12–16", new Date(2026, 6, 17), 2026), true);
  // The final day itself still counts as current.
  assert.equal(dates.isExpired("Jul 16", new Date(2026, 6, 16), 2026), false);
});

test("daysUntil counts forwards and backwards", () => {
  const today = new Date(2026, 6, 10);
  assert.equal(dates.daysUntil("July 17", today, 2026), 7);
  assert.equal(dates.daysUntil("July 3", today, 2026), -7);
  assert.equal(dates.daysUntil("no date here", today, 2026), null);
});

test("sorting puts dates in order and undated entries last", () => {
  const sorted = ["Jul 18", "no date", "Jul 12", "Jul 14"].sort((a, b) => dates.compareByDate(a, b, 2026));
  assert.deepEqual(sorted, ["Jul 12", "Jul 14", "Jul 18", "no date"]);
});

test("shifting a date keeps the surrounding words and the original style", () => {
  assert.equal(dates.shiftDateInText("Team update · July 10, 2026", 7), "Team update · July 17, 2026");
  assert.equal(dates.shiftDateInText("Week of July 12", 7, 2026), "Week of July 19");
  assert.equal(dates.shiftDateInText("Jul 12–16", 7, 2026), "Jul 19–23");
});

test("shifting across a month boundary produces a real date", () => {
  assert.equal(dates.shiftDateInText("July 28, 2026", 7), "August 4, 2026");
});

test("text without a date is returned untouched by a shift", () => {
  assert.equal(dates.shiftDateInText("Front of House", 7), "Front of House");
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const JULY_2026 = new Date(2026, 6, 10);

test("the shipped newsletter has no publish-blocking errors", () => {
  const result = validateNewsletter(defaultContent, baseDoc(), { today: JULY_2026 });
  assert.deepEqual(result.errors, [], `unexpected errors: ${JSON.stringify(result.errors)}`);
  assert.equal(result.canPublish, true);
});

test("an empty link is an error that blocks publishing", () => {
  const content = clone(defaultContent);
  content.home.scorecard.buttonHref = "";
  const result = validateNewsletter(content, baseDoc(), { today: JULY_2026 });

  assert.equal(result.canPublish, false);
  assert.ok(result.errors.some((issue) => issue.path === "home.scorecard.buttonHref"));
});

test("a placeholder href counts as going nowhere", () => {
  const content = clone(defaultContent);
  content.training.primaryButton.href = "https://";
  const result = validateNewsletter(content, baseDoc(), { today: JULY_2026 });
  assert.ok(result.errors.some((issue) => issue.path === "training.primaryButton.href"));
});

test("a link with no visible text is an error", () => {
  const content = clone(defaultContent);
  content.home.grow.buttonLabel = "   ";
  const result = validateNewsletter(content, baseDoc(), { today: JULY_2026 });
  assert.ok(result.errors.some((issue) => issue.id.startsWith("link-untitled")));
});

test("a button element without a link or text is an error", () => {
  const doc = baseDoc();
  doc.pages.home.items.push({ id: "b1", kind: "button", label: "CTA", href: "", title: "" });
  const result = validateNewsletter(defaultContent, doc, { today: JULY_2026 });

  assert.ok(result.errors.some((issue) => issue.id === "button-href-b1"));
  assert.ok(result.errors.some((issue) => issue.id === "button-text-b1"));
  assert.equal(result.canPublish, false);
});

test("an image with no picture is an error; missing alt is only a warning", () => {
  const missing = baseDoc();
  missing.pages.home.items.push({ id: "i1", kind: "image", label: "Photo", imageUrl: "" });
  assert.ok(validateNewsletter(defaultContent, missing, { today: JULY_2026 }).errors.some((i) => i.id === "image-missing-i1"));

  const noAlt = baseDoc();
  noAlt.pages.home.items.push({ id: "i2", kind: "image", label: "Photo", imageUrl: "/x.png", alt: "" });
  const result = validateNewsletter(defaultContent, noAlt, { today: JULY_2026 });
  assert.ok(result.warnings.some((i) => i.id === "image-alt-i2"));
  assert.equal(result.canPublish, true, "missing alt should not block publishing");
});

test("starter text left in a block is flagged as a warning", () => {
  const doc = baseDoc();
  doc.pages.home.items.push({ id: "t1", kind: "text", label: "Note", richBody: richTextFromPlain("Add your message here.") });
  const result = validateNewsletter(defaultContent, doc, { today: JULY_2026 });
  assert.ok(result.warnings.some((issue) => issue.id.startsWith("placeholder-t1")));
});

test("past dates are warnings, and they name the field and the gap", () => {
  const later = new Date(2026, 7, 20);
  const result = validateNewsletter(defaultContent, baseDoc(), { today: later });
  const past = result.warnings.filter((issue) => issue.id.startsWith("past-"));

  assert.ok(past.length > 0, "July events should be flagged from late August");
  assert.ok(past.some((issue) => issue.path === "home.overview.actionCard.bodyEmphasis"), "the July 28 deadline is flagged");
  assert.match(past[0].detail, /day/);
  assert.equal(result.canPublish, true, "past dates warn but do not block");
});

test("dates in the future are not flagged", () => {
  const early = new Date(2026, 5, 1);
  const result = validateNewsletter(defaultContent, baseDoc(), { today: early });
  assert.equal(result.warnings.filter((issue) => issue.id.startsWith("past-")).length, 0);
});

test("hidden native sections are surfaced", () => {
  const doc = baseDoc();
  const section = doc.pages.home.items.find((item) => item.kind === "native");
  section.style = { hidden: true };
  const result = validateNewsletter(defaultContent, doc, { today: JULY_2026 });
  assert.ok(result.warnings.some((issue) => issue.id === `hidden-${section.id}`));
});

test("text set below the phone-readable minimum is flagged", () => {
  const doc = baseDoc();
  doc.pages.home.items.push({
    id: "tiny",
    kind: "text",
    label: "Fine print",
    richBody: { v: 1, blocks: [{ type: "paragraph", spans: [{ text: "Legal", marks: { fontSize: 8 } }] }] },
  });
  const result = validateNewsletter(defaultContent, doc, { today: JULY_2026 });
  assert.ok(result.warnings.some((issue) => issue.id.startsWith("tiny-")));
});

test("a low-contrast text style is flagged against the page background", () => {
  const doc = baseDoc();
  doc.theme.textStyles.body.color = "#efe4d2"; // sand on cream
  const result = validateNewsletter(defaultContent, doc, { today: JULY_2026 });
  assert.ok(result.warnings.some((issue) => issue.id === "style-contrast-body"));
});

test("unsaved changes are reported when the editor says so", () => {
  const result = validateNewsletter(defaultContent, baseDoc(), { today: JULY_2026, dirty: true });
  assert.ok(result.warnings.some((issue) => issue.id === "unsaved"));
  assert.equal(result.canPublish, true);
});

// ---------------------------------------------------------------------------
// Create next issue
// ---------------------------------------------------------------------------

test("the issue date moves forward a week by default", () => {
  const result = createNextIssue(defaultContent, baseDoc(), { today: JULY_2026 });
  assert.match(result.content.home.hero.kicker, /July 17, 2026/);
  assert.match(result.content.home.footer.line, /July 17, 2026/);
  assert.match(result.content.home.overview.eyebrow, /July 19/);
  assert.ok(result.summary.some((line) => /July 17, 2026/.test(line)));
});

test("the published issue and the original content are left untouched", () => {
  const before = JSON.stringify(defaultContent);
  createNextIssue(defaultContent, baseDoc(), { today: JULY_2026 });
  assert.equal(JSON.stringify(defaultContent), before, "input is treated as immutable");
});

test("events that will have passed are removed, upcoming ones kept", () => {
  const result = createNextIssue(defaultContent, baseDoc(), { today: JULY_2026 });
  const names = result.content.home.events.items.map((event) => event.name);

  // Next issue is July 17, so the 12–16 events are gone and the 18th remains.
  assert.ok(!names.includes("TAMU Tennis Camp"), "Jul 12–16 has passed");
  assert.ok(names.includes("State 4-H Horse Show"), "Jul 18 is still upcoming");
  assert.ok(result.summary.some((line) => /Removed \d+ past event/.test(line)));
});

test("the design and recurring links carry over unchanged", () => {
  const doc = baseDoc();
  const result = createNextIssue(defaultContent, doc, { today: JULY_2026 });

  assert.equal(result.content.home.grow.buttonHref, defaultContent.home.grow.buttonHref, "recurring links survive");
  assert.deepEqual(result.document.pages, doc.pages, "layout is untouched");
  assert.deepEqual(result.document.theme, doc.theme, "theme is untouched");
});

test("last issue's recognition is cleared so it cannot go out twice", () => {
  const result = createNextIssue(defaultContent, baseDoc(), { today: JULY_2026 });
  assert.equal(result.content.home.recognition.feature.heading, "");
  assert.equal(result.content.home.recognition.feature.body, "");
  assert.ok(result.summary.some((line) => /recognition/i.test(line)));
});

test("a passed birthday is cleared but an upcoming one is kept", () => {
  const passed = createNextIssue(defaultContent, baseDoc(), { today: JULY_2026 });
  assert.equal(passed.content.home.recognition.birthday.date, "", "July 14 has passed by July 17");

  const upcoming = clone(defaultContent);
  upcoming.home.recognition.birthday.date = "July 30";
  const kept = createNextIssue(upcoming, baseDoc(), { today: JULY_2026 });
  assert.equal(kept.content.home.recognition.birthday.date, "July 30");
});

test("an unfinished action item can be carried forward", () => {
  const content = clone(defaultContent);
  content.home.overview.actionCard.bodyEmphasis = "July 12"; // already passed

  const cleared = createNextIssue(content, baseDoc(), { today: JULY_2026 });
  assert.equal(cleared.content.home.overview.actionCard.heading, "", "cleared by default");

  const carried = createNextIssue(content, baseDoc(), { today: JULY_2026, carryIncompleteActions: true });
  assert.equal(carried.content.home.overview.actionCard.heading, defaultContent.home.overview.actionCard.heading);
  assert.ok(carried.summary.some((line) => /deadline has passed/.test(line)), "it is flagged for a new date");
});

test("an action item still in the future is kept and reported", () => {
  const content = clone(defaultContent);
  content.home.overview.actionCard.bodyEmphasis = "August 28";
  const result = createNextIssue(content, baseDoc(), { today: JULY_2026 });
  assert.equal(result.content.home.overview.actionCard.heading, defaultContent.home.overview.actionCard.heading);
  assert.ok(result.summary.some((line) => /Carried forward/.test(line)));
});

test("formatting follows its item when earlier events are removed", () => {
  const doc = baseDoc();
  // Format the last event, which survives the roll-forward, plus the first,
  // which does not.
  doc.richOverrides = {
    "home.events.items.0.name": richTextFromPlain("TAMU Tennis Camp"),
    "home.events.items.6.name": richTextFromPlain("State 4-H Horse Show"),
  };

  const result = createNextIssue(defaultContent, doc, { today: JULY_2026 });
  const survivors = result.content.home.events.items;
  const keptIndex = survivors.findIndex((event) => event.name === "State 4-H Horse Show");

  assert.ok(keptIndex >= 0);
  assert.equal(
    richTextToPlain(result.document.richOverrides[`home.events.items.${keptIndex}.name`]),
    "State 4-H Horse Show",
    "formatting moved with the surviving event",
  );
  assert.equal(
    result.document.richOverrides["home.events.items.0.name"] === undefined ||
      richTextToPlain(result.document.richOverrides["home.events.items.0.name"]) !== "TAMU Tennis Camp",
    true,
    "the removed event's formatting did not land on someone else",
  );
});

test("formatting for cleared fields is discarded", () => {
  const doc = baseDoc();
  doc.richOverrides = { "home.recognition.feature.heading": richTextFromPlain("Way to go!") };
  const result = createNextIssue(defaultContent, doc, { today: JULY_2026 });
  assert.equal(result.document.richOverrides["home.recognition.feature.heading"], undefined);
});

test("the featured event is replaced once its date has passed", () => {
  const result = createNextIssue(defaultContent, baseDoc(), { today: JULY_2026 });
  const card = result.content.home.overview.eventCard;
  // "Jul 14" has passed by the July 17 issue, so it should advance.
  assert.notEqual(card.detail, "July 14");
  if (card.title) {
    assert.ok(result.content.home.events.items.some((event) => event.name === card.title), "it points at a surviving event");
  }
});

test("a nothing-expired issue says so rather than reporting silence", () => {
  const early = new Date(2026, 0, 1);
  const content = clone(defaultContent);
  content.home.hero.kicker = "Team update · January 1, 2026";
  const result = createNextIssue(content, baseDoc(), { today: early });
  assert.ok(result.summary.length >= 2);
});
