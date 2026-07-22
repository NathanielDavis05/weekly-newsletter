import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

// The app sources use extensionless relative imports; teach Node to resolve them.
register("./ts-resolve-loader.mjs", import.meta.url);

// Unit tests for the pure layers of the rich-text system: the document model,
// its migration from legacy plain strings, and the mark/block editing algebra.
// These import the TypeScript sources directly via Node's type stripping, so
// they exercise the same code the worker bundles.

const {
  parseRichText,
  richTextFromPlain,
  richTextToPlain,
  isRichTextEmpty,
  safeColor,
  safeHref,
  emptyRichText,
} = await import("../app/content/richtext.ts");

const { patchMarks, patchBlocks, clearFormatting, activeFormat } = await import(
  "../app/edit/richtext/marks.ts"
);

const { visualDocument, defaultVisualDocument } = await import("../app/content/visual.ts");

const range = (block, from, to) => ({ from: { block, offset: from }, to: { block, offset: to } });
const doc = (text) => richTextFromPlain(text);

// ---------------------------------------------------------------------------
// Model + migration
// ---------------------------------------------------------------------------

test("plain strings migrate into a valid document", () => {
  const migrated = parseRichText("Deadline is Friday");
  assert.equal(migrated.v, 1);
  assert.equal(migrated.blocks.length, 1);
  assert.equal(richTextToPlain(migrated), "Deadline is Friday");
});

test("multi-line strings become separate paragraphs", () => {
  const migrated = parseRichText("Line one\nLine two");
  assert.equal(migrated.blocks.length, 2);
  assert.equal(richTextToPlain(migrated), "Line one\nLine two");
});

test("an existing rich document is preserved, not re-derived from the fallback", () => {
  const source = {
    v: 1,
    blocks: [{ type: "paragraph", spans: [{ text: "Kept", marks: { bold: true } }] }],
  };
  const parsed = parseRichText(source, "ignored fallback");
  assert.equal(richTextToPlain(parsed), "Kept");
  assert.equal(parsed.blocks[0].spans[0].marks.bold, true);
});

test("unrecognised input falls back to the supplied plain text", () => {
  assert.equal(richTextToPlain(parseRichText(undefined, "Fallback copy")), "Fallback copy");
  assert.equal(richTextToPlain(parseRichText(null, "Fallback copy")), "Fallback copy");
  assert.ok(isRichTextEmpty(parseRichText(undefined, "")));
  assert.ok(isRichTextEmpty(emptyRichText()));
});

test("hostile marks are stripped during parsing", () => {
  const parsed = parseRichText({
    v: 1,
    blocks: [
      {
        type: "paragraph",
        spans: [
          {
            text: "Click",
            marks: {
              href: "javascript:alert(1)",
              color: "url(https://evil.example)",
              fontSize: 100000,
              fontFamily: "'; background: url(x)",
            },
          },
        ],
      },
    ],
  });
  const marks = parsed.blocks[0].spans[0].marks ?? {};
  assert.equal(marks.href, undefined, "javascript: URLs must not survive");
  assert.equal(marks.color, undefined, "non-colour values must not survive");
  assert.equal(marks.fontFamily, undefined, "unknown font keys must not survive");
  assert.equal(marks.fontSize, 200, "font size is clamped to the allowed range");
});

test("link sanitising accepts real links and upgrades bare domains", () => {
  assert.equal(safeHref("https://chick-fil-a.com"), "https://chick-fil-a.com");
  assert.equal(safeHref("/training"), "/training");
  assert.equal(safeHref("mailto:team@example.com"), "mailto:team@example.com");
  assert.equal(safeHref("chick-fil-a.com/menu"), "https://chick-fil-a.com/menu");
  assert.equal(safeHref("data:text/html,<script>"), undefined);
  assert.equal(safeHref("  "), undefined);
});

test("colour sanitising accepts hex, rgb and hsl only", () => {
  assert.equal(safeColor("#D80D37"), "#d80d37");
  assert.equal(safeColor("rgb(216, 13, 55)"), "rgb(216, 13, 55)");
  assert.equal(safeColor("hsl(348, 89%, 45%)"), "hsl(348, 89%, 45%)");
  assert.equal(safeColor("expression(alert(1))"), undefined);
});

// ---------------------------------------------------------------------------
// Mixed formatting — the headline requirement
// ---------------------------------------------------------------------------

test("a mark applied to part of a paragraph splits it into mixed runs", () => {
  const before = doc("Submit training by Friday");
  // "Friday" occupies characters 19..25.
  const after = patchMarks(before, range(0, 19, 25), { bold: true, color: "#d80d37" });

  const spans = after.blocks[0].spans;
  assert.equal(spans.length, 2);
  assert.equal(spans[0].text, "Submit training by ");
  assert.equal(spans[0].marks, undefined, "the untouched run keeps no marks");
  assert.equal(spans[1].text, "Friday");
  assert.equal(spans[1].marks.bold, true);
  assert.equal(spans[1].marks.color, "#d80d37");

  // The visible text is unchanged by formatting.
  assert.equal(richTextToPlain(after), "Submit training by Friday");
});

test("formatting the middle of a run produces three runs", () => {
  const after = patchMarks(doc("abcdef"), range(0, 2, 4), { italic: true });
  const spans = after.blocks[0].spans;
  assert.deepEqual(spans.map((span) => span.text), ["ab", "cd", "ef"]);
  assert.equal(spans[1].marks.italic, true);
  assert.equal(spans[0].marks, undefined);
  assert.equal(spans[2].marks, undefined);
});

test("marks layer rather than replace, and null removes just one of them", () => {
  let after = patchMarks(doc("Deadline"), range(0, 0, 8), { bold: true });
  after = patchMarks(after, range(0, 0, 8), { color: "#d80d37" });
  assert.deepEqual(after.blocks[0].spans[0].marks, { bold: true, color: "#d80d37" });

  after = patchMarks(after, range(0, 0, 8), { bold: null });
  assert.deepEqual(after.blocks[0].spans[0].marks, { color: "#d80d37" });
});

test("identically formatted neighbours merge back together", () => {
  let after = patchMarks(doc("abcdef"), range(0, 0, 3), { bold: true });
  after = patchMarks(after, range(0, 3, 6), { bold: true });
  assert.equal(after.blocks[0].spans.length, 1, "runs with equal marks collapse");
  assert.equal(after.blocks[0].spans[0].text, "abcdef");
});

test("a mark spanning several paragraphs applies to each of them", () => {
  const before = parseRichText("First\nSecond\nThird");
  const after = patchMarks(
    before,
    { from: { block: 0, offset: 2 }, to: { block: 2, offset: 3 } },
    { underline: true },
  );
  assert.equal(after.blocks[0].spans.at(-1).marks.underline, true);
  assert.equal(after.blocks[1].spans[0].marks.underline, true, "middle block fully covered");
  assert.equal(after.blocks[1].spans.length, 1);
  assert.equal(after.blocks[2].spans[0].marks.underline, true);
  assert.equal(after.blocks[2].spans[1].marks, undefined, "tail beyond the range is untouched");
  assert.equal(richTextToPlain(after), "First\nSecond\nThird");
});

test("stroke colour is dropped when the outline width is removed", () => {
  let after = patchMarks(doc("Bold"), range(0, 0, 4), { strokeWidth: 2, strokeColor: "#0d2238" });
  assert.equal(after.blocks[0].spans[0].marks.strokeColor, "#0d2238");
  after = patchMarks(after, range(0, 0, 4), { strokeWidth: null });
  assert.equal(after.blocks[0].spans[0].marks, undefined);
});

// ---------------------------------------------------------------------------
// Block-level edits
// ---------------------------------------------------------------------------

test("block patches change type and keep type-specific fields coherent", () => {
  const listed = patchBlocks(doc("An item"), range(0, 0, 0), { type: "listItem", list: "number" });
  assert.equal(listed.blocks[0].type, "listItem");
  assert.equal(listed.blocks[0].list, "number");

  const back = patchBlocks(listed, range(0, 0, 0), { type: "paragraph" });
  assert.equal(back.blocks[0].type, "paragraph");
  assert.equal(back.blocks[0].list, undefined, "list flavour is dropped with the type");

  const heading = patchBlocks(back, range(0, 0, 0), { type: "heading" });
  assert.equal(heading.blocks[0].level, 2, "headings get a default level");
});

test("alignment and spacing apply to every block in the range", () => {
  const before = parseRichText("One\nTwo");
  const after = patchBlocks(
    before,
    { from: { block: 0, offset: 0 }, to: { block: 1, offset: 3 } },
    { align: "center", lineHeight: 1.6, letterSpacing: 0.5, spaceAfter: 24 },
  );
  for (const block of after.blocks) {
    assert.equal(block.align, "center");
    assert.equal(block.lineHeight, 1.6);
    assert.equal(block.letterSpacing, 0.5);
    assert.equal(block.spaceAfter, 24);
  }
});

test("clear formatting strips marks and block styling but keeps the words", () => {
  let after = patchMarks(doc("Keep the words"), range(0, 0, 4), { bold: true, color: "#d80d37" });
  after = patchBlocks(after, range(0, 0, 0), { type: "heading", align: "center" });
  const cleared = clearFormatting(after, range(0, 0, 14));

  assert.equal(richTextToPlain(cleared), "Keep the words");
  assert.equal(cleared.blocks[0].type, "paragraph");
  assert.equal(cleared.blocks[0].align, undefined);
  assert.equal(cleared.blocks[0].spans.length, 1);
  assert.equal(cleared.blocks[0].spans[0].marks, undefined);
});

// ---------------------------------------------------------------------------
// Toolbar state
// ---------------------------------------------------------------------------

test("active format reports uniform marks and flags mixed ones", () => {
  const mixedDoc = patchMarks(doc("boldplain"), range(0, 0, 4), { bold: true, color: "#d80d37" });

  const whole = activeFormat(mixedDoc, range(0, 0, 9));
  assert.equal(whole.marks.bold, true, "a representative value is still surfaced");
  assert.ok(whole.mixed.has("bold"), "bold is mixed across the selection");
  assert.ok(whole.mixed.has("color"));

  const boldOnly = activeFormat(mixedDoc, range(0, 0, 4));
  assert.equal(boldOnly.marks.bold, true);
  assert.equal(boldOnly.mixed.has("bold"), false, "uniform selections are not mixed");
  assert.equal(boldOnly.marks.color, "#d80d37");

  const plainOnly = activeFormat(mixedDoc, range(0, 4, 9));
  assert.equal(plainOnly.marks.bold, undefined);
  assert.equal(plainOnly.mixed.has("bold"), false);
});

test("active format with no selection is inert", () => {
  const format = activeFormat(doc("text"), null);
  assert.deepEqual(format.marks, {});
  assert.equal(format.mixed.size, 0);
});

// ---------------------------------------------------------------------------
// Visual document migration (v6 -> v7)
// ---------------------------------------------------------------------------

test("the default visual document is at the current schema version", () => {
  // Bumped to 8 when the site theme was added; the migration tests below prove
  // documents saved at earlier versions still upgrade cleanly.
  assert.equal(defaultVisualDocument().version, 9);
});

test("v6 freeform blocks gain rich text without losing their copy", () => {
  const legacy = {
    visual: {
      version: 6,
      pages: {
        home: {
          items: [
            { id: "legacy-card", kind: "container", label: "Info card", title: "Heads up", body: "Training closes Friday." },
          ],
          rows: [{ id: "row-1", itemIds: ["legacy-card"], gap: 16, align: "stretch", keepColumnsOnPhone: false }],
          background: "#fbf7ef",
          contentWidth: 760,
          minHeight: 0,
          paddingTop: 30, paddingRight: 22, paddingBottom: 46, paddingLeft: 22, rowGap: 22,
        },
      },
    },
  };

  const migrated = visualDocument(legacy);
  assert.equal(migrated.version, 9);

  const card = migrated.pages.home.items.find((item) => item.id === "legacy-card");
  assert.ok(card, "the existing block survives the migration");
  assert.equal(richTextToPlain(card.richTitle), "Heads up");
  assert.equal(richTextToPlain(card.richBody), "Training closes Friday.");
  // The plain mirrors stay populated for anything not yet rich-text aware.
  assert.equal(card.title, "Heads up");
  assert.equal(card.body, "Training closes Friday.");
});

test("migration is idempotent — re-reading a v7 document changes nothing", () => {
  const legacy = {
    visual: {
      version: 6,
      pages: {
        home: {
          items: [{ id: "card", kind: "text", label: "Text", title: "Hello", body: "World" }],
          rows: [{ id: "row-1", itemIds: ["card"], gap: 16, align: "stretch", keepColumnsOnPhone: false }],
          background: "#fbf7ef", contentWidth: 760, minHeight: 0,
          paddingTop: 30, paddingRight: 22, paddingBottom: 46, paddingLeft: 22, rowGap: 22,
        },
      },
    },
  };
  const once = visualDocument(legacy);
  const twice = visualDocument({ visual: once });
  assert.deepEqual(twice, once);
});

test("native newsletter sections are left untouched by the rich-text migration", () => {
  const migrated = visualDocument({ visual: defaultVisualDocument() });
  const natives = migrated.pages.home.items.filter((item) => item.kind === "native");
  assert.ok(natives.length > 0);
  for (const item of natives) {
    assert.equal(item.richTitle, undefined, "native sections keep rendering from NewsletterContent");
    assert.equal(item.richBody, undefined);
  }
});

test("a document with no visual data falls back to the defaults", () => {
  const migrated = visualDocument({});
  assert.equal(migrated.version, 9);
  assert.ok(migrated.pages.home.items.length > 0);
  assert.ok(migrated.pages.training.items.length > 0);
  assert.ok(migrated.pages.results.items.length > 0);
});
