import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-resolve-loader.mjs", import.meta.url);

// Colour conversion, the site theme, and the v7 -> v8 migration.

const color = await import("../app/content/color.ts");
const theme = await import("../app/content/theme.ts");
const { visualDocument, defaultVisualDocument } = await import("../app/content/visual.ts");
const { parseRichText } = await import("../app/content/richtext.ts");

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

test("hex parsing handles 3, 4, 6 and 8 digit forms", () => {
  assert.deepEqual(color.parseColor("#fff"), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(color.parseColor("#d80d37"), { r: 216, g: 13, b: 55, a: 1 });
  assert.equal(color.parseColor("#d80d3780").a, 0.502);
  assert.equal(color.parseColor("#f00f").a, 1);
});

test("rgb and hsl strings parse", () => {
  assert.deepEqual(color.parseColor("rgb(216, 13, 55)"), { r: 216, g: 13, b: 55, a: 1 });
  assert.equal(color.parseColor("rgba(216, 13, 55, 0.5)").a, 0.5);
  const fromHsl = color.parseColor("hsl(0, 100%, 50%)");
  assert.deepEqual({ r: fromHsl.r, g: fromHsl.g, b: fromHsl.b }, { r: 255, g: 0, b: 0 });
});

test("garbage input is rejected rather than guessed at", () => {
  assert.equal(color.parseColor("not-a-colour"), null);
  assert.equal(color.parseColor("#12345"), null);
  assert.equal(color.parseColor("#gggggg"), null);
  assert.equal(color.parseColor(""), null);
});

test("rgb and hsl round-trip without drifting", () => {
  for (const hex of ["#d80d37", "#0d2238", "#1f8a5a", "#efe4d2", "#ffffff", "#000000"]) {
    const rgb = color.parseColor(hex);
    const back = color.hslToRgb(color.rgbToHsl(rgb));
    // Allow one unit of rounding slack per channel.
    assert.ok(Math.abs(back.r - rgb.r) <= 1, `${hex} red`);
    assert.ok(Math.abs(back.g - rgb.g) <= 1, `${hex} green`);
    assert.ok(Math.abs(back.b - rgb.b) <= 1, `${hex} blue`);
  }
});

test("opacity survives a conversion round-trip", () => {
  const rgb = { r: 216, g: 13, b: 55, a: 0.5 };
  assert.equal(color.rgbToHsl(rgb).a, 0.5);
  assert.equal(color.hslToRgb(color.rgbToHsl(rgb)).a, 0.5);
  assert.match(color.rgbToHex(rgb), /^#d80d37[0-9a-f]{2}$/);
});

test("contrast ratios match the WCAG reference values", () => {
  assert.equal(color.contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(color.contrastRatio("#ffffff", "#ffffff"), 1);
  assert.equal(color.contrastGrade(21), "AAA");
  assert.equal(color.contrastGrade(4.6), "AA");
  assert.equal(color.contrastGrade(3.2), "AA Large");
  assert.equal(color.contrastGrade(1.5), "Fail");
});

test("brand red on cream is checked, not assumed", () => {
  const ratio = color.contrastRatio("#d80d37", "#fbf7ef");
  assert.ok(ratio > 4.5, `brand red on cream should pass AA for body text (got ${ratio})`);
});

test("readable text picks the legible option for a background", () => {
  assert.equal(color.readableTextOn("#ffffff"), "#000000");
  assert.equal(color.readableTextOn("#0d2238"), "#ffffff");
  assert.equal(color.readableTextOn("#d80d37"), "#ffffff");
});

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

test("the default theme has every documented text style", () => {
  const base = theme.defaultTheme();
  for (const id of theme.TEXT_STYLE_ORDER) {
    assert.ok(base.textStyles[id], `${id} is missing`);
    assert.ok(base.textStyles[id].label.length > 0);
  }
  assert.equal(theme.TEXT_STYLE_ORDER.length, 11);
});

test("styles reference palette tokens, which resolve to real colours", () => {
  const base = theme.defaultTheme();
  assert.equal(base.textStyles.deadline.color, "brand");
  assert.equal(theme.resolveColor(base, "brand"), "#d80d37");
  // A literal colour passes straight through.
  assert.equal(theme.resolveColor(base, "#123456"), "#123456");
  // An unknown token is returned as-is rather than throwing.
  assert.equal(theme.resolveColor(base, "nonexistent"), "nonexistent");
});

test("editing a palette token flows through to every style using it", () => {
  const base = theme.defaultTheme();
  const edited = { ...base, palette: base.palette.map((t) => t.id === "brand" ? { ...t, value: "#00aa88" } : t) };

  assert.equal(theme.resolveColor(edited, edited.textStyles.deadline.color), "#00aa88");
  const vars = theme.themeToCssVars(edited);
  assert.equal(vars["--brand-brand"], "#00aa88");
  assert.equal(vars["--text-deadline-color"], "#00aa88");
});

test("css variables cover every style property the stylesheet consumes", () => {
  const vars = theme.themeToCssVars(theme.defaultTheme());
  for (const property of ["family", "size", "size-mobile", "weight", "line", "tracking", "color", "transform"]) {
    assert.ok(vars[`--text-body-${property}`], `--text-body-${property} missing`);
  }
  for (const token of theme.DEFAULT_PALETTE) {
    assert.ok(vars[`--brand-${token.id}`], `--brand-${token.id} missing`);
  }
});

test("mobile size falls back to a reduction rather than the desktop size", () => {
  const vars = theme.themeToCssVars(theme.defaultTheme());
  // `body` has no explicit mobile size.
  assert.equal(vars["--text-body-size"], "16px");
  assert.equal(vars["--text-body-size-mobile"], "14px");
  // `mainTitle` declares one.
  assert.equal(vars["--text-mainTitle-size-mobile"], "40px");
});

test("baking a style captures the resolved values for detaching", () => {
  const base = theme.defaultTheme();
  const baked = theme.bakeTextStyle(base, "sectionHeading");
  assert.equal(baked.color, "#0d2238", "the token is resolved, not left as a name");
  assert.equal(baked.fontSize, 28);
  assert.equal(theme.bakeTextStyle(base, "notAStyle"), null);
});

test("parseTheme repairs damaged input instead of throwing", () => {
  const repaired = theme.parseTheme({
    palette: [{ id: "brand", label: "Brand", value: "not-a-colour" }, { label: "no id" }],
    textStyles: { body: { fontSize: 100000, fontFamily: "'; attack", tag: "script" } },
    recentColors: ["#fff", "garbage", "#0d2238"],
  });

  assert.equal(repaired.palette[0].value, "#000000", "invalid colours fall back");
  assert.equal(repaired.palette.length, 1, "tokens without an id are dropped");
  assert.equal(repaired.textStyles.body.fontSize, 200, "sizes are clamped");
  assert.equal(repaired.textStyles.body.fontFamily, "brand", "unknown fonts fall back");
  assert.equal(repaired.textStyles.body.tag, "p", "unknown tags fall back");
  assert.deepEqual(repaired.recentColors, ["#ffffff", "#0d2238"], "unparseable recents are dropped");
});

test("recent colours are newest-first, deduplicated and capped", () => {
  let base = theme.defaultTheme();
  base = theme.withRecentColor(base, "#111111");
  base = theme.withRecentColor(base, "#222222");
  base = theme.withRecentColor(base, "#111111");
  assert.deepEqual(base.recentColors.slice(0, 2), ["#111111", "#222222"]);

  for (let i = 0; i < 30; i += 1) base = theme.withRecentColor(base, `#0000${i.toString(16).padStart(2, "0")}`);
  assert.equal(base.recentColors.length, 12);
  assert.equal(theme.withRecentColor(base, "nonsense").recentColors.length, 12, "invalid colours are ignored");
});

test("document colours include the palette and every style colour", () => {
  const colours = theme.documentColors(theme.defaultTheme());
  assert.ok(colours.includes("#d80d37"));
  assert.ok(colours.includes("#0d2238"));
  assert.equal(new Set(colours).size, colours.length, "no duplicates");
});

// ---------------------------------------------------------------------------
// Migration v7 -> v8
// ---------------------------------------------------------------------------

test("the default document is at v8 and carries a theme", () => {
  const doc = defaultVisualDocument();
  assert.equal(doc.version, 9);
  assert.ok(doc.theme);
  assert.equal(doc.theme.palette.length, theme.DEFAULT_PALETTE.length);
});

test("a v7 document gains the brand theme without losing its content", () => {
  const legacy = {
    visual: {
      version: 7,
      pages: {
        home: {
          items: [{ id: "card", kind: "container", label: "Card", richTitle: parseRichText("Kept heading"), richBody: parseRichText("Kept body") }],
          rows: [{ id: "row-1", itemIds: ["card"], gap: 16, align: "stretch", keepColumnsOnPhone: false }],
          background: "#fbf7ef", contentWidth: 760, minHeight: 0,
          paddingTop: 30, paddingRight: 22, paddingBottom: 46, paddingLeft: 22, rowGap: 22,
        },
      },
    },
  };

  const migrated = visualDocument(legacy);
  assert.equal(migrated.version, 9);
  assert.equal(migrated.theme.textStyles.body.fontSize, 16, "brand defaults are adopted");

  const card = migrated.pages.home.items.find((item) => item.id === "card");
  assert.ok(card, "existing content survives the theme migration");
  assert.equal(card.title, "Kept heading");
  assert.equal(card.body, "Kept body");
});

test("a customised theme survives a re-read unchanged", () => {
  const doc = defaultVisualDocument();
  doc.theme.palette = doc.theme.palette.map((t) => t.id === "brand" ? { ...t, value: "#00aa88" } : t);
  doc.theme.textStyles.sectionHeading.fontSize = 42;

  const reread = visualDocument({ visual: doc });
  assert.equal(theme.resolveColor(reread.theme, "brand"), "#00aa88");
  assert.equal(reread.theme.textStyles.sectionHeading.fontSize, 42);
  assert.deepEqual(reread.theme, doc.theme, "the theme round-trips exactly");
});

test("blocks may link to a global style and the link survives parsing", () => {
  const doc = parseRichText({
    v: 1,
    blocks: [{ type: "heading", level: 2, styleId: "sectionHeading", spans: [{ text: "Linked" }] }],
  });
  assert.equal(doc.blocks[0].styleId, "sectionHeading");

  const stripped = parseRichText({ v: 1, blocks: [{ type: "paragraph", styleId: 42, spans: [{ text: "x" }] }] });
  assert.equal(stripped.blocks[0].styleId, undefined, "non-string style ids are dropped");
});
