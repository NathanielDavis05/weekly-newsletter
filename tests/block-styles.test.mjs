import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

register("./ts-resolve-loader.mjs", import.meta.url);

// Section styling: the preset algebra, palette-token linkage, and the colour
// sanitiser that stands between a stored draft and an inline style attribute.

const bs = await import("../app/edit/panels/blockStyles.ts");
const { visualDocument, defaultVisualDocument, styleForBlock } = await import("../app/content/visual.ts");

// ---------------------------------------------------------------------------
// Colour safety
// ---------------------------------------------------------------------------

test("real colours are accepted", () => {
  assert.equal(bs.safeStyleColor("#d80d37"), "#d80d37");
  assert.equal(bs.safeStyleColor("#fff"), "#fff");
  assert.equal(bs.safeStyleColor("rgb(216, 13, 55)"), "rgb(216, 13, 55)");
  assert.equal(bs.safeStyleColor("hsl(348, 89%, 45%)"), "hsl(348, 89%, 45%)");
  assert.equal(bs.safeStyleColor("transparent"), "transparent");
});

test("brand tokens are accepted so styling can follow the theme", () => {
  assert.equal(bs.safeStyleColor("var(--brand-brand)"), "var(--brand-brand)");
  assert.equal(bs.safeStyleColor("var(--brand-inkSoft)"), "var(--brand-inkSoft)");
});

test("arbitrary CSS variables and injection attempts are rejected", () => {
  // Only our own theme namespace — not any variable the page happens to define.
  assert.equal(bs.safeStyleColor("var(--anything-else)"), undefined);
  assert.equal(bs.safeStyleColor("url(https://evil.example/x.png)"), undefined);
  assert.equal(bs.safeStyleColor("red; background: url(x)"), undefined);
  assert.equal(bs.safeStyleColor("expression(alert(1))"), undefined);
  assert.equal(bs.safeStyleColor(""), undefined);
  assert.equal(bs.safeStyleColor(42), undefined);
});

test("token ids round-trip", () => {
  assert.equal(bs.tokenColor("brand"), "var(--brand-brand)");
  assert.equal(bs.tokenIdOf("var(--brand-brand)"), "brand");
  assert.equal(bs.tokenIdOf("#d80d37"), null, "a fixed colour is not a token");
  assert.equal(bs.tokenIdOf(undefined), null);
});

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

test("every preset has a label and a description", () => {
  assert.ok(bs.STYLE_PRESETS.length >= 5);
  for (const preset of bs.STYLE_PRESETS) {
    assert.ok(preset.label, `${preset.id} needs a label`);
    assert.ok(preset.description, `${preset.id} needs a description`);
  }
});

test("presets reference brand tokens rather than hard-coded brand colours", () => {
  const card = bs.STYLE_PRESETS.find((p) => p.id === "card");
  assert.equal(bs.tokenIdOf(card.style.background), "surface");
  const urgent = bs.STYLE_PRESETS.find((p) => p.id === "urgent");
  assert.equal(bs.tokenIdOf(urgent.style.borderColor), "brand", "urgent follows the brand red");
});

test("applying a preset replaces the previous look rather than layering on it", () => {
  const urgent = bs.STYLE_PRESETS.find((p) => p.id === "urgent");
  const quiet = bs.STYLE_PRESETS.find((p) => p.id === "quiet");

  const styled = bs.applyPreset({}, urgent);
  assert.equal(styled.borderWidth, 2);

  const requiet = bs.applyPreset(styled, quiet);
  assert.equal(requiet.borderWidth, undefined, "the red border does not survive the switch");
  assert.equal(requiet.borderColor, undefined);
  assert.equal(requiet.background, quiet.style.background);
});

test("switching to Plain strips decoration entirely", () => {
  const spotlight = bs.STYLE_PRESETS.find((p) => p.id === "spotlight");
  const plain = bs.STYLE_PRESETS.find((p) => p.id === "plain");
  const cleared = bs.applyPreset(bs.applyPreset({}, spotlight), plain);

  for (const key of ["background", "color", "borderWidth", "borderRadius", "shadow", "paddingTop"]) {
    assert.equal(cleared[key], undefined, `${key} should be cleared`);
  }
});

test("a preset changes how a section looks, not where it sits", () => {
  const layout = {
    phone: { width: 50, nudgeX: 4 },
    desktop: { width: 70 },
    marginTop: 24,
    hidden: true,
    linkedDevices: true,
  };
  const styled = bs.applyPreset(layout, bs.STYLE_PRESETS.find((p) => p.id === "card"));

  assert.deepEqual(styled.phone, layout.phone, "per-device layout survives");
  assert.deepEqual(styled.desktop, layout.desktop);
  assert.equal(styled.marginTop, 24, "spacing the author set survives");
  assert.equal(styled.hidden, true, "visibility survives");
});

test("the active preset is recognised, and hand-tuned styles report none", () => {
  assert.equal(bs.matchPreset(undefined), "plain");
  assert.equal(bs.matchPreset({}), "plain");

  const card = bs.STYLE_PRESETS.find((p) => p.id === "card");
  assert.equal(bs.matchPreset(bs.applyPreset({}, card)), "card");

  const tweaked = { ...bs.applyPreset({}, card), borderRadius: 99 };
  assert.equal(bs.matchPreset(tweaked), null, "a hand-tuned style matches no preset");
});

test("copy style carries the look and leaves layout behind", () => {
  const source = {
    background: "var(--brand-cream)", borderRadius: 16, shadow: "soft", fontSize: 18,
    phone: { width: 40 }, marginTop: 30, hidden: true,
  };
  const copied = bs.copyableStyle(source);

  assert.equal(copied.background, "var(--brand-cream)");
  assert.equal(copied.shadow, "soft");
  assert.equal(copied.fontSize, 18);
  assert.equal(copied.phone, undefined, "layout is not carried");
  assert.equal(copied.marginTop, undefined);
  assert.equal(copied.hidden, undefined, "pasting a style cannot hide a section");
  assert.deepEqual(bs.copyableStyle(undefined), {});
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

test("a styled block renders its colours, shadow and radius", () => {
  const css = styleForBlock({
    background: "var(--brand-cream)", color: "#0d2238", borderColor: "var(--brand-brand)",
    borderWidth: 2, borderRadius: 16, shadow: "soft",
  });
  assert.equal(css.backgroundColor, "var(--brand-cream)");
  assert.equal(css.borderColor, "var(--brand-brand)");
  assert.equal(css.borderStyle, "solid");
  assert.equal(css.borderRadius, "16px");
  assert.equal(css.boxShadow, bs.BOX_SHADOWS.soft);
});

test("an unrecognised shadow name renders nothing rather than raw text", () => {
  assert.equal(styleForBlock({ shadow: "nonsense" }).boxShadow, undefined);
});

test("hostile colours never reach the rendered style", () => {
  const css = styleForBlock({ background: "url(https://evil.example)", color: "red; x: y" });
  assert.equal(css.backgroundColor, undefined);
  assert.equal(css.color, undefined);
});

test("a stored draft carrying a bad colour is cleaned on read", () => {
  const doc = defaultVisualDocument();
  doc.pages.home.items.push({
    id: "tainted", kind: "text", label: "Tainted",
    style: { background: "url(https://evil.example)", shadow: "nonsense", borderColor: "var(--brand-brand)" },
  });
  doc.pages.home.rows.push({ id: "row-x", itemIds: ["tainted"], gap: 16, align: "stretch", keepColumnsOnPhone: false });

  const item = visualDocument({ visual: doc }).pages.home.items.find((i) => i.id === "tainted");
  assert.equal(item.style.background, undefined, "the bad colour is dropped");
  assert.equal(item.style.shadow, undefined, "the bad shadow name is dropped");
  assert.equal(item.style.borderColor, "var(--brand-brand)", "the good value survives");
});
