import type { NewsletterContent } from "../../../content/types";
import type { ElementNode, SiteDoc } from "../model/types";

/**
 * The visual designer and the native newsletter editor have different layout
 * models by design. This bridge keeps the familiar visual canvas while sharing
 * the newsletter words, dates, links, and lists that readers see on the live
 * site. It deliberately leaves visual-designer-only layout choices alone.
 */

function clone<T>(value: T): T {
  return structuredClone(value);
}

function byName(doc: SiteDoc, name: string, within?: string): ElementNode | undefined {
  const allowed = within ? new Set(descendants(doc, within)) : null;
  return Object.values(doc.elements).find((node) => node.name === name && (!allowed || allowed.has(node.id)));
}

function descendants(doc: SiteDoc, rootId: string): string[] {
  const result: string[] = [];
  const visit = (id: string) => {
    const node = doc.elements[id];
    if (!node) return;
    result.push(id);
    node.children.forEach(visit);
  };
  visit(rootId);
  return result;
}

function leaves(doc: SiteDoc, name: string, within?: string): ElementNode[] {
  const root = byName(doc, name, within);
  if (!root) return [];
  return descendants(doc, root.id)
    .map((id) => doc.elements[id])
    .filter((node): node is ElementNode => Boolean(node) && node.content !== undefined);
}

function write(leavesToWrite: ElementNode[], values: Array<string | undefined>) {
  values.forEach((value, index) => {
    if (value !== undefined && leavesToWrite[index]) leavesToWrite[index].content = value;
  });
}

function read(leavesToRead: ElementNode[], index: number, fallback: string) {
  return leavesToRead[index]?.content?.trim() || fallback;
}

function setFirstLink(doc: SiteDoc, name: string, href: string, within?: string) {
  const root = byName(doc, name, within);
  if (!root) return;
  const button = descendants(doc, root.id).map((id) => doc.elements[id]).find((node) => node?.type === "button");
  if (button) button.link = { kind: "url", url: href };
}

function eventValues(content: NewsletterContent) {
  return content.home.events.items.map((event) => [event.date, event.name]);
}

/** Overlays the currently published newsletter values on the visual template. */
export function applyNewsletterContent(doc: SiteDoc, content: NewsletterContent): SiteDoc {
  const next = clone(doc);
  const { home, shared } = content;

  write(leaves(next, "Masthead copy"), [home.hero.kicker, home.hero.headline]);
  write(leaves(next, "Action copy"), [
    home.overview.actionCard.label,
    home.overview.actionCard.heading,
    `${home.overview.actionCard.bodyPrefix}${home.overview.actionCard.bodyEmphasis}`.trim(),
    home.overview.actionCard.micro,
    `${home.overview.actionCard.linkLabel}  →`,
  ]);
  setFirstLink(next, "Action required", home.overview.actionCard.linkHref);

  for (const [name, card] of [["Upcoming event", home.overview.eventCard], ["Customer shout-out", home.overview.recognitionCard]] as const) {
    const cardRoot = byName(next, name);
    if (!cardRoot) continue;
    write(leaves(next, "Priority copy", cardRoot.id), [card.kicker, card.title, card.detail]);
    setFirstLink(next, name, card.href);
  }

  write(leaves(next, "Scorecard"), [
    shared.scorecard.eyebrow,
    shared.scorecard.heading,
    shared.scorecard.intro,
    shared.scorecard.resultValue,
    `${shared.scorecard.resultUnit} ${shared.scorecard.resultLabel}`.trim(),
    shared.scorecard.focusLabel,
    shared.scorecard.focusValue,
    shared.scorecard.buttonLabel,
  ]);
  setFirstLink(next, "Scorecard", shared.scorecard.buttonHref);

  const birthdays = home.recognition.birthday.entries?.length
    ? home.recognition.birthday.entries
    : [{ name: home.recognition.birthday.name, date: home.recognition.birthday.date }];
  const birthdaySummary = birthdays.slice(1).map((entry) => `${entry.name} — ${entry.date}`).join(" · ");
  write(leaves(next, "Birthday"), [
    home.recognition.birthday.kicker,
    birthdays[0]?.name ?? "",
    birthdays[0]?.date ?? "",
    birthdaySummary,
    "",
  ]);
  const anniversaries = home.recognition.anniversaries.entries;
  const anniversarySummary = anniversaries.slice(1).map((entry) => `${entry.name} — ${entry.detail}`).join(" · ");
  write(leaves(next, "Work anniversaries"), [
    home.recognition.anniversaries.kicker,
    anniversaries[0]?.name ?? "",
    anniversaries[0]?.detail ?? "",
    anniversarySummary,
    "",
    "",
    "",
  ]);
  write(leaves(next, "Celebrations content"), [home.recognition.eyebrow, home.recognition.heading]);
  write(leaves(next, "Guest recognition"), [home.recognition.feature.heading, home.recognition.feature.body]);

  write(leaves(next, "Events content"), [home.events.eyebrow, home.events.heading, home.events.intro]);
  const eventList = byName(next, "Event list");
  if (eventList) {
    const rows = eventList.children.map((id) => next.elements[id]).filter((node): node is ElementNode => Boolean(node));
    eventValues(content).forEach(([date, event], index) => write(rows[index] ? descendants(next, rows[index].id).map((id) => next.elements[id]).filter((node): node is ElementNode => Boolean(node) && node.content !== undefined) : [], [date, event]));
    rows.forEach((row, index) => {
      row.hidden = { ...row.hidden, base: index >= content.home.events.items.length };
    });
  }

  write(leaves(next, "Leadership card"), [home.grow.eyebrow, home.grow.heading, home.grow.body, home.grow.buttonLabel]);
  setFirstLink(next, "Leadership card", home.grow.buttonHref);
  write(leaves(next, "Referral bonus opportunity"), [home.grow.referralStrong, home.grow.referralRest]);
  write(leaves(next, "Footer content"), [shared.brandName, home.footer.line]);

  next.name = `${shared.brandName} — ${home.hero.kicker}`;
  next.pages[next.homePageId].seo = {
    ...next.pages[next.homePageId].seo,
    title: `${shared.brandName} — Team newsletter`,
    description: home.hero.headline,
  };
  return next;
}

/**
 * Applies the visual canvas's editable copy to the draft used by /edit. The
 * native editor remains authoritative for its own freeform layout, while the
 * shared story copy moves cleanly between both editing experiences.
 */
export function applyDesignerCopyToNewsletter(content: NewsletterContent, doc: SiteDoc): NewsletterContent {
  const next = clone(content);
  const action = leaves(doc, "Action copy");
  const event = byName(doc, "Upcoming event");
  const recognition = byName(doc, "Customer shout-out");
  const scorecard = leaves(doc, "Scorecard");
  const events = byName(doc, "Event list");
  const growth = leaves(doc, "Leadership card");
  const referral = leaves(doc, "Referral bonus opportunity");

  const masthead = leaves(doc, "Masthead copy");
  next.home.hero.kicker = read(masthead, 0, next.home.hero.kicker);
  next.home.hero.headline = read(masthead, 1, next.home.hero.headline);
  next.home.overview.actionCard.label = read(action, 0, next.home.overview.actionCard.label);
  next.home.overview.actionCard.heading = read(action, 1, next.home.overview.actionCard.heading);
  next.home.overview.actionCard.bodyPrefix = read(action, 2, `${next.home.overview.actionCard.bodyPrefix}${next.home.overview.actionCard.bodyEmphasis}`);
  next.home.overview.actionCard.bodyEmphasis = "";
  next.home.overview.actionCard.micro = read(action, 3, next.home.overview.actionCard.micro);
  next.home.overview.actionCard.linkLabel = read(action, 4, next.home.overview.actionCard.linkLabel).replace(/\s*→\s*$/, "");

  if (event) {
    const copy = leaves(doc, "Priority copy", event.id);
    next.home.overview.eventCard.kicker = read(copy, 0, next.home.overview.eventCard.kicker);
    next.home.overview.eventCard.title = read(copy, 1, next.home.overview.eventCard.title);
    next.home.overview.eventCard.detail = read(copy, 2, next.home.overview.eventCard.detail);
  }
  if (recognition) {
    const copy = leaves(doc, "Priority copy", recognition.id);
    next.home.overview.recognitionCard.kicker = read(copy, 0, next.home.overview.recognitionCard.kicker);
    next.home.overview.recognitionCard.title = read(copy, 1, next.home.overview.recognitionCard.title);
    next.home.overview.recognitionCard.detail = read(copy, 2, next.home.overview.recognitionCard.detail);
  }

  next.shared.scorecard.eyebrow = read(scorecard, 0, next.shared.scorecard.eyebrow);
  next.shared.scorecard.heading = read(scorecard, 1, next.shared.scorecard.heading);
  next.shared.scorecard.intro = read(scorecard, 2, next.shared.scorecard.intro);
  next.shared.scorecard.resultValue = read(scorecard, 3, next.shared.scorecard.resultValue);
  next.shared.scorecard.resultLabel = read(scorecard, 4, next.shared.scorecard.resultLabel);
  next.shared.scorecard.focusLabel = read(scorecard, 5, next.shared.scorecard.focusLabel);
  next.shared.scorecard.focusValue = read(scorecard, 6, next.shared.scorecard.focusValue);
  next.shared.scorecard.buttonLabel = read(scorecard, 7, next.shared.scorecard.buttonLabel);

  if (events) {
    next.home.events.items = events.children.flatMap((id) => {
      const values = descendants(doc, id).map((childId) => doc.elements[childId]).filter((node): node is ElementNode => Boolean(node) && node.content !== undefined).map((node) => node.content?.trim() ?? "");
      return values[0] && values[1] ? [{ date: values[0], name: values[1] }] : [];
    });
  }

  next.home.grow.eyebrow = read(growth, 0, next.home.grow.eyebrow);
  next.home.grow.heading = read(growth, 1, next.home.grow.heading);
  next.home.grow.body = read(growth, 2, next.home.grow.body);
  next.home.grow.buttonLabel = read(growth, 3, next.home.grow.buttonLabel);
  next.home.grow.referralStrong = read(referral, 0, next.home.grow.referralStrong);
  next.home.grow.referralRest = read(referral, 1, next.home.grow.referralRest);

  return next;
}
