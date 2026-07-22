// Site theme: the brand palette and the global text styles.
//
// The point of this module is that a manager can change "Section heading" once
// and every linked heading in the newsletter follows. Elements reference a
// style by id; the resolved values reach the page as CSS custom properties, so
// updating the theme restyles linked text without rewriting a single block.
//
// Overriding still works: a block keeps its style link while carrying its own
// marks, which win over the theme. Detaching bakes the resolved values into the
// block so later theme edits leave it alone.

import { parseColor, rgbToHex } from "./color";
import { FONT_STACKS } from "./richtext";

export type TextStyleId =
  | "mainTitle"
  | "pageTitle"
  | "sectionHeading"
  | "cardTitle"
  | "bodyLarge"
  | "body"
  | "smallText"
  | "eyebrow"
  | "deadline"
  | "buttonText"
  | "caption";

export interface TextStyleDef {
  label: string;
  /** Key into FONT_STACKS. */
  fontFamily: string;
  /** Desktop size in px. */
  fontSize: number;
  /** Mobile override; falls back to a proportional reduction when absent. */
  mobileFontSize?: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  /** Palette token id, or a raw CSS colour. */
  color: string;
  transform?: "uppercase" | "lowercase" | "capitalize";
  /** Semantic element used when a block links to this style. */
  tag: "h1" | "h2" | "h3" | "h4" | "p" | "span";
}

export interface ColorToken {
  id: string;
  label: string;
  value: string;
}

export interface SiteTheme {
  version: 1;
  palette: ColorToken[];
  textStyles: Record<TextStyleId, TextStyleDef>;
  /** Most-recently-used colours, newest first. Capped at 12. */
  recentColors: string[];
}

export const TEXT_STYLE_ORDER: TextStyleId[] = [
  "mainTitle", "pageTitle", "sectionHeading", "cardTitle",
  "bodyLarge", "body", "smallText", "eyebrow",
  "deadline", "buttonText", "caption",
];

/** Chick-fil-A West Bryan brand palette. Fully editable in Site Design. */
export const DEFAULT_PALETTE: ColorToken[] = [
  { id: "brand", label: "Chick-fil-A red", value: "#d80d37" },
  { id: "brandDark", label: "Dark red", value: "#ad0527" },
  { id: "ink", label: "Charcoal", value: "#0d2238" },
  { id: "inkSoft", label: "Slate", value: "#456077" },
  { id: "body", label: "Body grey", value: "#4a4a4a" },
  { id: "surface", label: "White", value: "#ffffff" },
  { id: "cream", label: "Cream", value: "#fbf7ef" },
  { id: "sand", label: "Sand", value: "#efe4d2" },
  { id: "success", label: "Success green", value: "#1f8a5a" },
  { id: "warning", label: "Warning orange", value: "#e07b18" },
];

export function defaultTextStyles(): Record<TextStyleId, TextStyleDef> {
  return {
    mainTitle: { label: "Main title", fontFamily: "brand", fontSize: 54, mobileFontSize: 40, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.3, color: "surface", tag: "h1" },
    pageTitle: { label: "Page title", fontFamily: "brand", fontSize: 38, mobileFontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.8, color: "ink", tag: "h1" },
    sectionHeading: { label: "Section heading", fontFamily: "brand", fontSize: 28, mobileFontSize: 24, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.4, color: "ink", tag: "h2" },
    cardTitle: { label: "Card title", fontFamily: "brand", fontSize: 20, mobileFontSize: 18, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.2, color: "ink", tag: "h3" },
    bodyLarge: { label: "Body large", fontFamily: "brand", fontSize: 18, mobileFontSize: 17, fontWeight: 400, lineHeight: 1.55, letterSpacing: 0, color: "body", tag: "p" },
    body: { label: "Body", fontFamily: "brand", fontSize: 16, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, color: "body", tag: "p" },
    smallText: { label: "Small text", fontFamily: "brand", fontSize: 14, fontWeight: 400, lineHeight: 1.5, letterSpacing: 0, color: "inkSoft", tag: "p" },
    eyebrow: { label: "Eyebrow label", fontFamily: "brand", fontSize: 12, fontWeight: 600, lineHeight: 1.3, letterSpacing: 2, color: "inkSoft", transform: "uppercase", tag: "p" },
    deadline: { label: "Deadline", fontFamily: "brand", fontSize: 16, fontWeight: 700, lineHeight: 1.4, letterSpacing: 0, color: "brand", tag: "span" },
    buttonText: { label: "Button text", fontFamily: "brand", fontSize: 16, fontWeight: 600, lineHeight: 1, letterSpacing: 0, color: "surface", tag: "span" },
    caption: { label: "Caption", fontFamily: "brand", fontSize: 13, fontWeight: 400, lineHeight: 1.45, letterSpacing: 0, color: "inkSoft", tag: "p" },
  };
}

export function defaultTheme(): SiteTheme {
  return { version: 1, palette: DEFAULT_PALETTE.map((token) => ({ ...token })), textStyles: defaultTextStyles(), recentColors: [] };
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a palette token id to a CSS colour. Values that are already colours
 * pass through, so a style may hold either a token or a one-off colour.
 */
export function resolveColor(theme: SiteTheme, value: string): string {
  const token = theme.palette.find((entry) => entry.id === value);
  if (token) return token.value;
  const parsed = parseColor(value);
  return parsed ? rgbToHex(parsed) : value;
}

/** CSS custom-property name for a palette token. */
export const tokenVar = (id: string) => `--brand-${id}`;
/** CSS custom-property prefix for a text style. */
export const styleVar = (id: TextStyleId, property: string) => `--text-${id}-${property}`;

/**
 * Builds a `clamp()` that eases a font size from its mobile value to its desktop
 * value across the 640px–1024px viewport band, so type scales smoothly instead
 * of snapping at one breakpoint. The slope/intercept are computed here as plain
 * numbers because pure CSS cannot interpolate between two runtime px variables
 * (multiplying two lengths is a math error). Below 640px the clamp floors at the
 * mobile size; above 1024px it caps at the desktop size — mobile authoring is
 * therefore never affected. Authors add no new inputs; this is derived.
 */
const FLUID_MIN_VW = 640;
const FLUID_MAX_VW = 1024;
export function fluidFontClamp(mobilePx: number, desktopPx: number): string {
  if (mobilePx === desktopPx) return `${desktopPx}px`;
  // preferred = slopeVw * 1vw + interceptPx, passing through
  // (640px -> mobile) and (1024px -> desktop).
  const slopeVw = (100 * (desktopPx - mobilePx)) / (FLUID_MAX_VW - FLUID_MIN_VW);
  const interceptPx = mobilePx - (slopeVw * FLUID_MIN_VW) / 100;
  const lo = Math.min(mobilePx, desktopPx);
  const hi = Math.max(mobilePx, desktopPx);
  const round = (n: number) => Math.round(n * 1000) / 1000;
  return `clamp(${lo}px, ${round(interceptPx)}px + ${round(slopeVw)}vw, ${hi}px)`;
}

/**
 * Flattens the theme into custom properties for the page root. Both the editor
 * canvas and the published page mount these, which is what keeps them matching.
 */
export function themeToCssVars(theme: SiteTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const token of theme.palette) vars[tokenVar(token.id)] = token.value;

  for (const id of TEXT_STYLE_ORDER) {
    const style = theme.textStyles[id];
    if (!style) continue;
    vars[styleVar(id, "family")] = FONT_STACKS[style.fontFamily] ?? FONT_STACKS.brand;
    vars[styleVar(id, "size")] = `${style.fontSize}px`;
    // Mobile falls back to a gentle reduction rather than jumping to desktop.
    const mobileSize = style.mobileFontSize ?? Math.max(12, Math.round(style.fontSize * 0.88));
    vars[styleVar(id, "size-mobile")] = `${mobileSize}px`;
    // A pre-computed clamp that eases mobile -> desktop across the viewport band.
    vars[styleVar(id, "size-fluid")] = fluidFontClamp(mobileSize, style.fontSize);
    vars[styleVar(id, "weight")] = String(style.fontWeight);
    vars[styleVar(id, "line")] = String(style.lineHeight);
    vars[styleVar(id, "tracking")] = `${style.letterSpacing}px`;
    vars[styleVar(id, "color")] = resolveColor(theme, style.color);
    vars[styleVar(id, "transform")] = style.transform ?? "none";
  }
  return vars;
}

/**
 * The concrete values behind a style — used when detaching a block from the
 * theme, so it keeps exactly the look it had at that moment.
 */
export function bakeTextStyle(theme: SiteTheme, id: TextStyleId) {
  const style = theme.textStyles[id];
  if (!style) return null;
  return {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    color: resolveColor(theme, style.color),
    transform: style.transform,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
  };
}

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

const number = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;

const text = (value: unknown, fallback: string, limit = 80) =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;

function normaliseStyle(raw: unknown, fallback: TextStyleDef): TextStyleDef {
  if (!raw || typeof raw !== "object") return fallback;
  const source = raw as Record<string, unknown>;
  const tags = ["h1", "h2", "h3", "h4", "p", "span"];
  const transform = source.transform;
  const style: TextStyleDef = {
    label: text(source.label, fallback.label, 40),
    fontFamily: typeof source.fontFamily === "string" && source.fontFamily in FONT_STACKS ? source.fontFamily : fallback.fontFamily,
    fontSize: number(source.fontSize, fallback.fontSize, 8, 200),
    fontWeight: number(source.fontWeight, fallback.fontWeight, 100, 900),
    lineHeight: number(source.lineHeight, fallback.lineHeight, 0.8, 4),
    letterSpacing: number(source.letterSpacing, fallback.letterSpacing, -5, 20),
    // A colour may be a palette token id or a literal; both are kept as-is and
    // resolved at render time.
    color: text(source.color, fallback.color, 64),
    tag: typeof source.tag === "string" && tags.includes(source.tag) ? source.tag as TextStyleDef["tag"] : fallback.tag,
  };
  // Optional fields are only set when present, so a serialised theme never
  // carries explicit `undefined` keys.
  const mobile = source.mobileFontSize === undefined ? fallback.mobileFontSize : number(source.mobileFontSize, fallback.fontSize, 8, 200);
  if (mobile !== undefined) style.mobileFontSize = mobile;
  const resolvedTransform = transform === "uppercase" || transform === "lowercase" || transform === "capitalize" ? transform : fallback.transform;
  if (resolvedTransform) style.transform = resolvedTransform;
  return style;
}

/** Accepts anything and returns a valid theme. */
export function parseTheme(raw: unknown): SiteTheme {
  const fallback = defaultTheme();
  if (!raw || typeof raw !== "object") return fallback;
  const source = raw as Record<string, unknown>;

  const palette = Array.isArray(source.palette)
    ? source.palette
        .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        .map((entry) => {
          const parsed = parseColor(String(entry.value ?? ""));
          return {
            id: text(entry.id, "", 40),
            label: text(entry.label, "Colour", 40),
            value: parsed ? rgbToHex(parsed) : "#000000",
          };
        })
        .filter((token) => token.id)
        .slice(0, 40)
    : fallback.palette;

  const textStyles = {} as Record<TextStyleId, TextStyleDef>;
  const incoming = (source.textStyles ?? {}) as Record<string, unknown>;
  for (const id of TEXT_STYLE_ORDER) textStyles[id] = normaliseStyle(incoming[id], fallback.textStyles[id]);

  const recentColors = Array.isArray(source.recentColors)
    ? source.recentColors
        .map((entry) => parseColor(String(entry)))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .map(rgbToHex)
        .slice(0, 12)
    : [];

  return { version: 1, palette: palette.length ? palette : fallback.palette, textStyles, recentColors };
}

/** Adds a colour to the recents list, newest first, without duplicates. */
export function withRecentColor(theme: SiteTheme, value: string): SiteTheme {
  const parsed = parseColor(value);
  if (!parsed) return theme;
  const hex = rgbToHex(parsed);
  const recentColors = [hex, ...theme.recentColors.filter((entry) => entry !== hex)].slice(0, 12);
  return { ...theme, recentColors };
}

/** Every colour actually used by the theme — the "document colours" swatch row. */
export function documentColors(theme: SiteTheme): string[] {
  const seen = new Set<string>();
  for (const token of theme.palette) seen.add(token.value);
  for (const id of TEXT_STYLE_ORDER) {
    const style = theme.textStyles[id];
    if (style) seen.add(resolveColor(theme, style.color));
  }
  return Array.from(seen);
}
