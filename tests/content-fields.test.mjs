import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-resolve-loader.mjs", import.meta.url);

// Formatting overrides for the fixed newsletter copy: path access, the v8 -> v9
// migration, and the rule that the plain string stays authoritative for words
// while the override carries only formatting.

const { getByPath, getStringByPath, setByPath } = await import("../app/content/paths.ts");
const { visualDocument, defaultVisualDocument } = await import("../app/content/visual.ts");
const { parseRichText, richTextToPlain, richTextFromPlain } = await import("../app/content/richtext.ts");
const { defaultContent } = await import("../app/content/defaults.ts");
const { mergeContent } = await import("../app/content/merge.ts");

// ---------------------------------------------------------------------------
// Path access
// ---------------------------------------------------------------------------

test("paths read nested newsletter fields", () => {
  assert.equal(typeof getStringByPath(defaultContent, "training.heading"), "string");
  assert.ok(getStringByPath(defaultContent, "training.heading").length > 0);
  assert.equal(typeof getByPath(defaultContent, "training.statusRows"), "object");
});

test("array indices are addressable", () => {
  const first = getByPath(defaultContent, "training.statusRows.0");
  assert.ok(first, "the first status row is reachable");
  assert.equal(getStringByPath(defaultContent, "training.statusRows.0.label"), first.label);
});

test("missing paths read as undefined rather than throwing", () => {
  assert.equal(getByPath(defaultContent, "training.nope.deeper"), undefined);
  assert.equal(getByPath(defaultContent, "nonsense"), undefined);
  assert.equal(getStringByPath(defaultContent, "training.statusRows"), "", "non-strings read as empty");
  assert.equal(getByPath(null, "a.b"), undefined);
});

test("writing a path updates exactly that field", () => {
  const draft = structuredClone(defaultContent);
  const before = draft.training.lead;
  assert.equal(setByPath(draft, "training.heading", "Changed"), true);
  assert.equal(draft.training.heading, "Changed");
  assert.equal(draft.training.lead, before, "siblings are untouched");
});

test("writing into an array element works", () => {
  const draft = structuredClone(defaultContent);
  assert.equal(setByPath(draft, "training.statusRows.0.label", "New label"), true);
  assert.equal(draft.training.statusRows[0].label, "New label");
});

test("legacy scorecards migrate into one shared CMS source", () => {
  const legacy = structuredClone(defaultContent);
  delete legacy.shared.scorecard;
  legacy.home.scorecard.heading = "Shared guest experience";
  legacy.results.scorecard.rows[0].june = "91%";

  const migrated = mergeContent(legacy);
  assert.equal(migrated.shared.scorecard.heading, "Shared guest experience");
  assert.equal(migrated.shared.scorecard.table.rows[0].june, "91%");
});

test("writing a path that does not exist fails loudly rather than inventing one", () => {
  const draft = structuredClone(defaultContent);
  assert.equal(setByPath(draft, "training.missing.deeper", "x"), false);
  assert.equal(draft.training.missing, undefined, "no phantom objects are created");
  assert.equal(setByPath(draft, "", "x"), false);
});

test("an array cannot be given a non-numeric key", () => {
  const draft = structuredClone(defaultContent);
  assert.equal(setByPath(draft, "training.statusRows.label", "x"), false);
  assert.ok(Array.isArray(draft.training.statusRows));
});

// ---------------------------------------------------------------------------
// Overrides in the document
// ---------------------------------------------------------------------------

test("the default document carries an empty override map at v9", () => {
  const doc = defaultVisualDocument();
  assert.equal(doc.version, 9);
  assert.deepEqual(doc.richOverrides, {});
});

test("a v8 document gains an empty override map without losing anything", () => {
  const legacy = {
    visual: {
      version: 8,
      pages: {
        home: {
          items: [{ id: "card", kind: "container", label: "Card", richTitle: parseRichText("Kept") }],
          rows: [{ id: "row-1", itemIds: ["card"], gap: 16, align: "stretch", keepColumnsOnPhone: false }],
          background: "#fbf7ef", contentWidth: 760, minHeight: 0,
          paddingTop: 30, paddingRight: 22, paddingBottom: 46, paddingLeft: 22, rowGap: 22,
        },
      },
    },
  };
  const migrated = visualDocument(legacy);
  assert.equal(migrated.version, 9);
  assert.deepEqual(migrated.richOverrides, {});
  assert.equal(richTextToPlain(migrated.pages.home.items.find((i) => i.id === "card").richTitle), "Kept");
});

test("stored overrides survive a re-read", () => {
  const doc = defaultVisualDocument();
  doc.richOverrides = { "training.heading": richTextFromPlain("CommercePoint training") };
  const reread = visualDocument({ visual: doc });
  assert.equal(richTextToPlain(reread.richOverrides["training.heading"]), "CommercePoint training");
});

test("override keys are restricted to plausible content paths", () => {
  const doc = defaultVisualDocument();
  doc.richOverrides = {
    "training.heading": richTextFromPlain("fine"),
    "training.statusRows.0.label": richTextFromPlain("also fine"),
    "<script>alert(1)</script>": richTextFromPlain("dropped"),
    "path with spaces": richTextFromPlain("dropped"),
    "a/../../etc": richTextFromPlain("dropped"),
  };
  const keys = Object.keys(visualDocument({ visual: doc }).richOverrides);
  assert.deepEqual(keys.sort(), ["training.heading", "training.statusRows.0.label"]);
});

test("empty overrides are discarded so untouched fields stay plain", () => {
  const doc = defaultVisualDocument();
  doc.richOverrides = { "training.heading": richTextFromPlain("") };
  assert.deepEqual(visualDocument({ visual: doc }).richOverrides, {});
});

test("a corrupted override map degrades to no overrides", () => {
  for (const bad of [null, "string", 42, []]) {
    const doc = defaultVisualDocument();
    doc.richOverrides = bad;
    assert.deepEqual(visualDocument({ visual: doc }).richOverrides, {}, `for ${JSON.stringify(bad)}`);
  }
});

// ---------------------------------------------------------------------------
// The plain string stays authoritative for the words
// ---------------------------------------------------------------------------

test("formatting a field keeps the plain string in sync with the words", () => {
  // Mirrors what the editor does on every keystroke: write the override and the
  // derived plain text together.
  const draft = structuredClone(defaultContent);
  const formatted = parseRichText({
    v: 1,
    blocks: [{ type: "paragraph", spans: [
      { text: "Submit by " },
      { text: "July 28", marks: { bold: true, color: "#d80d37" } },
    ] }],
  });

  const doc = defaultVisualDocument();
  doc.richOverrides = { "training.heading": formatted };
  setByPath(draft, "training.heading", richTextToPlain(formatted));
  draft.visual = doc;

  assert.equal(draft.training.heading, "Submit by July 28", "words readable without a rich-text renderer");
  const spans = visualDocument(draft).richOverrides["training.heading"].blocks[0].spans;
  assert.equal(spans.length, 2, "mixed formatting is preserved");
  assert.equal(spans[1].marks.bold, true);
  assert.equal(spans[1].marks.color, "#d80d37");
});

test("hostile formatting in an override is sanitised like any other rich text", () => {
  const doc = defaultVisualDocument();
  doc.richOverrides = {
    "training.heading": {
      v: 1,
      blocks: [{ type: "paragraph", spans: [{ text: "Click", marks: { href: "javascript:alert(1)", color: "url(evil)" } }] }],
    },
  };
  const marks = visualDocument({ visual: doc }).richOverrides["training.heading"].blocks[0].spans[0].marks ?? {};
  assert.equal(marks.href, undefined);
  assert.equal(marks.color, undefined);
});
