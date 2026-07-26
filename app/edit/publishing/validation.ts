// Pre-publication validation.
//
// Errors block publishing; warnings ask for confirmation. The split matters:
// a button that links nowhere is broken and a manager cannot see that from the
// canvas, whereas a date that has passed might be deliberate.
//
// Scope note — every check here is one that can actually be decided from the
// document. Checks the original brief listed that need real layout measurement
// (text overflow, overlapping elements, elements off-canvas) are deliberately
// absent rather than stubbed: reporting "no overflow found" without measuring
// anything would be worse than not claiming it at all.

import { contrastRatio } from "../../content/color";
import { daysUntil } from "../../content/dates";
import { richTextToPlain, type RichText } from "../../content/richtext";
import { resolveColor, TEXT_STYLE_ORDER, type SiteTheme } from "../../content/theme";
import type { NewsletterContent, VisualDocument, VisualPageId } from "../../content/types";

export type Severity = "error" | "warning";

export interface ValidationIssue {
  /** Stable id so the UI can key rows and de-duplicate. */
  id: string;
  severity: Severity;
  /** Short, human sentence — shown directly to the manager. */
  message: string;
  detail?: string;
  page?: VisualPageId;
  /** Content path or item id, so the UI can jump to the problem. */
  path?: string;
  itemId?: string;
}

export interface ValidationResult {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** True when nothing blocks publishing. */
  canPublish: boolean;
}

export interface ValidateOptions {
  /** Injected so tests are not tied to the real clock. */
  today?: Date;
  /** Unsaved editor changes are reported as a warning. */
  dirty?: boolean;
}

/** Copy the templates ship with — a sign the field was never filled in. */
const PLACEHOLDER_TEXT = [
  "add your message here",
  "add supporting details here",
  "new heading",
  "container content",
  "important update",
  "lorem ipsum",
  "team shout-out",
  "card title",
];

/** Hrefs that look filled in but go nowhere. */
const PLACEHOLDER_HREFS = ["", "#", "https://", "http://", "/#", "about:blank"];

/** Trailing punctuation varies between templates, so it is ignored. */
const isPlaceholderText = (value: string) =>
  PLACEHOLDER_TEXT.includes(value.trim().toLowerCase().replace(/[.!…]+$/, ""));

const isPlaceholderHref = (value: string | undefined) =>
  PLACEHOLDER_HREFS.includes((value ?? "").trim().toLowerCase());

/** Every link in the fixed newsletter copy, with a human label. */
function fixedLinks(content: NewsletterContent): Array<{ path: string; label: string; href: string; text: string }> {
  const { home, training, shared } = content;
  const links = [
    { path: "home.overview.actionCard.linkHref", label: "Action card link", href: home.overview.actionCard.linkHref, text: home.overview.actionCard.linkLabel },
    { path: "home.overview.eventCard.href", label: "Event card", href: home.overview.eventCard.href, text: home.overview.eventCard.title },
    { path: "home.overview.recognitionCard.href", label: "Recognition card", href: home.overview.recognitionCard.href, text: home.overview.recognitionCard.title },
    { path: "shared.scorecard.buttonHref", label: "Scorecard button", href: shared.scorecard.buttonHref, text: shared.scorecard.buttonLabel },
    { path: "home.grow.buttonHref", label: "Grow button", href: home.grow.buttonHref, text: home.grow.buttonLabel },
    { path: "training.primaryButton.href", label: "Training button", href: training.primaryButton.href, text: training.primaryButton.label },
    { path: "training.helpLink.href", label: "Training help link", href: training.helpLink.href, text: training.helpLink.label },
  ];
  shared.navLinks.forEach((link, index) => {
    links.push({ path: `shared.navLinks.${index}.href`, label: `Menu link "${link.label}"`, href: link.href, text: link.label });
  });
  return links;
}

/** Dated fields worth warning about once they are in the past. */
function datedFields(content: NewsletterContent): Array<{ path: string; label: string; value: string; page: VisualPageId }> {
  const fields: Array<{ path: string; label: string; value: string; page: VisualPageId }> = [
    { path: "home.overview.actionCard.bodyEmphasis", label: "Action deadline", value: content.home.overview.actionCard.bodyEmphasis, page: "home" },
    { path: "home.overview.eventCard.detail", label: "Featured event", value: content.home.overview.eventCard.detail, page: "home" },
  ];
  const birthdayEntries = content.home.recognition.birthday.entries;
  if (birthdayEntries) birthdayEntries.forEach((entry, index) => fields.push({ path: `home.recognition.birthday.entries.${index}.date`, label: `Birthday "${entry.name}"`, value: entry.date, page: "home" }));
  else fields.push({ path: "home.recognition.birthday.date", label: "Birthday", value: content.home.recognition.birthday.date, page: "home" });
  content.home.events.items.forEach((event, index) => {
    fields.push({ path: `home.events.items.${index}.date`, label: `Event "${event.name}"`, value: event.date, page: "home" });
  });
  content.home.recognition.anniversaries.entries.forEach((entry, index) => {
    fields.push({ path: `home.recognition.anniversaries.entries.${index}.name`, label: `Anniversary "${entry.name}"`, value: entry.name, page: "home" });
  });
  content.training.statusRows.forEach((row, index) => {
    fields.push({ path: `training.statusRows.${index}.strongPrefix`, label: `Training ${row.label}`, value: `${row.strongPrefix}${row.strongEmphasis}`, page: "training" });
  });
  return fields;
}

/**
 * The smallest font size any run of text should reach on a phone. Below this
 * body copy stops being comfortably readable.
 */
const MIN_MOBILE_FONT_PX = 12;

function collectRichText(document: VisualDocument): Array<{ doc: RichText; label: string; page?: VisualPageId; path?: string; itemId?: string }> {
  const out: Array<{ doc: RichText; label: string; page?: VisualPageId; path?: string; itemId?: string }> = [];
  for (const page of Object.keys(document.pages)) {
    for (const item of document.pages[page].items) {
      if (item.richTitle) out.push({ doc: item.richTitle, label: `${item.label} heading`, page, itemId: item.id });
      if (item.richBody) out.push({ doc: item.richBody, label: `${item.label} text`, page, itemId: item.id });
    }
  }
  for (const [path, doc] of Object.entries(document.richOverrides)) {
    out.push({ doc, label: path, path });
  }
  return out;
}

export function validateNewsletter(
  content: NewsletterContent,
  document: VisualDocument,
  options: ValidateOptions = {},
): ValidationResult {
  const today = options.today ?? new Date();
  const issues: ValidationIssue[] = [];
  const add = (issue: ValidationIssue) => issues.push(issue);

  // --- links ---------------------------------------------------------------
  for (const link of fixedLinks(content)) {
    if (isPlaceholderHref(link.href)) {
      add({
        id: `link-empty-${link.path}`,
        severity: "error",
        message: `${link.label} does not go anywhere.`,
        detail: link.href ? `Its address is "${link.href}".` : "Its address is empty.",
        path: link.path,
      });
    }
    if (!link.text.trim()) {
      add({
        id: `link-untitled-${link.path}`,
        severity: "error",
        message: `${link.label} has no visible text.`,
        detail: "Readers will see an empty button or link.",
        path: link.path,
      });
    }
  }

  // --- freeform elements ---------------------------------------------------
  for (const page of Object.keys(document.pages)) {
    for (const item of document.pages[page].items) {
      if (item.kind === "button") {
        if (isPlaceholderHref(item.href)) {
          add({ id: `button-href-${item.id}`, severity: "error", message: `Button "${item.label}" links nowhere.`, page, itemId: item.id });
        }
        if (!richTextToPlain(item.richTitle).trim() && !(item.title ?? "").trim()) {
          add({ id: `button-text-${item.id}`, severity: "error", message: `Button "${item.label}" has no text on it.`, page, itemId: item.id });
        }
      }
      if (item.kind === "image") {
        if (!(item.imageUrl ?? "").trim()) {
          add({ id: `image-missing-${item.id}`, severity: "error", message: `Image "${item.label}" has no picture selected.`, page, itemId: item.id });
        } else if (!(item.alt ?? "").trim()) {
          add({
            id: `image-alt-${item.id}`,
            severity: "warning",
            message: `Image "${item.label}" has no alt text.`,
            detail: "Screen readers and slow connections will show nothing in its place.",
            page,
            itemId: item.id,
          });
        }
      }
    }
  }

  // --- placeholder copy left behind ---------------------------------------
  for (const entry of collectRichText(document)) {
    const plain = richTextToPlain(entry.doc);
    if (plain && isPlaceholderText(plain)) {
      add({
        id: `placeholder-${entry.itemId ?? entry.path}-${entry.label}`,
        severity: "warning",
        message: `"${plain}" still has its starter text.`,
        detail: "This is the wording a new block ships with.",
        page: entry.page,
        path: entry.path,
        itemId: entry.itemId,
      });
    }
    // Text below the readable minimum on a phone.
    for (const block of entry.doc.blocks) {
      for (const span of block.spans) {
        if (span.marks?.fontSize && span.marks.fontSize < MIN_MOBILE_FONT_PX) {
          add({
            id: `tiny-${entry.itemId ?? entry.path}-${span.marks.fontSize}`,
            severity: "warning",
            message: `Some text is set to ${span.marks.fontSize}px.`,
            detail: `Below ${MIN_MOBILE_FONT_PX}px it is hard to read on a phone.`,
            page: entry.page,
            path: entry.path,
            itemId: entry.itemId,
          });
          break;
        }
      }
    }
  }

  // --- dates ---------------------------------------------------------------
  const year = new Date(today).getFullYear();
  for (const field of datedFields(content)) {
    const days = daysUntil(field.value, today, year);
    if (days !== null && days < 0) {
      add({
        id: `past-${field.path}`,
        severity: "warning",
        message: `${field.label} is in the past.`,
        detail: `"${field.value.trim()}" was ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago.`,
        page: field.page,
        path: field.path,
      });
    }
  }

  // --- theme legibility -----------------------------------------------------
  issues.push(...validateTheme(document.theme, document.pages.home.background));

  // --- hidden sections ------------------------------------------------------
  for (const page of Object.keys(document.pages)) {
    for (const item of document.pages[page].items) {
      if (item.kind === "native" && item.style?.hidden) {
        add({
          id: `hidden-${item.id}`,
          severity: "warning",
          message: `"${item.label}" is hidden on the ${page} page.`,
          detail: "Readers will not see this section.",
          page,
          itemId: item.id,
        });
      }
    }
  }

  if (options.dirty) {
    add({
      id: "unsaved",
      severity: "warning",
      message: "There are changes that have not been saved yet.",
      detail: "Publishing will save them first.",
    });
  }

  return {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
    canPublish: !issues.some((issue) => issue.severity === "error"),
  };
}

/** Contrast and mobile-size checks over the global text styles. */
export function validateTheme(theme: SiteTheme, background: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const id of TEXT_STYLE_ORDER) {
    const style = theme.textStyles[id];
    if (!style) continue;

    const mobileSize = style.mobileFontSize ?? Math.max(12, Math.round(style.fontSize * 0.88));
    if (mobileSize < MIN_MOBILE_FONT_PX) {
      issues.push({
        id: `style-tiny-${id}`,
        severity: "warning",
        message: `"${style.label}" is ${mobileSize}px on phones.`,
        detail: `Below ${MIN_MOBILE_FONT_PX}px it is hard to read.`,
      });
    }

    // Styles meant for light surfaces are checked against the page background.
    // White-on-dark styles (hero copy, button text) legitimately fail this test
    // against a cream page, so they are excluded rather than reported wrongly.
    if (id === "mainTitle" || id === "buttonText") continue;
    const ratio = contrastRatio(resolveColor(theme, style.color), background);
    if (ratio !== null && ratio < 4.5) {
      issues.push({
        id: `style-contrast-${id}`,
        severity: "warning",
        message: `"${style.label}" is low contrast on the page background.`,
        detail: `${ratio}:1 — below the 4.5:1 needed for comfortable reading.`,
      });
    }
  }
  return issues;
}
