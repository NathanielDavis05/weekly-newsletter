// Portable rich-text document model.
//
// This is deliberately *not* tied to a specific editor library. The same model
// is rendered on the server (public newsletter), inside the editor canvas, and
// in the draft preview, so what a manager sees while editing is what visitors
// get. The editor writes this shape back out of contentEditable DOM; the
// renderer in `app/components/RichText.tsx` turns it into React.
//
// Every value that reaches CSS is sanitised here rather than at render time, so
// a hostile or corrupted draft cannot inject styles into the published page.

/** Inline formatting carried by a run of characters. */
export interface RichMarks {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  /** Foreground colour, already sanitised to a safe CSS colour. */
  color?: string;
  /** Highlight / background colour behind the text. */
  highlight?: string;
  fontFamily?: string;
  /** Absolute size in px. */
  fontSize?: number;
  /** Link target. Only http(s), mailto, tel and site-relative paths survive. */
  href?: string;
  /** Named shadow preset — see SHADOW_PRESETS. */
  shadow?: ShadowPreset;
  /** Outline width in px; paired with strokeColor. */
  strokeWidth?: number;
  strokeColor?: string;
  /** 10–100. Stored as a percentage so drafts stay human-readable. */
  opacity?: number;
  transform?: "uppercase" | "lowercase" | "capitalize";
}

/** A contiguous run of characters sharing identical marks. */
export interface RichSpan {
  text: string;
  marks?: RichMarks;
}

/** Block-level attributes. Lists are flat: consecutive items group at render. */
export interface RichBlock {
  type: "paragraph" | "heading" | "listItem";
  /**
   * Links this block to a global text style. Marks on the block still win, so a
   * linked block can override individual properties without detaching.
   */
  styleId?: string;
  /** Heading level, only meaningful when type is "heading". */
  level?: 1 | 2 | 3 | 4;
  /** List flavour, only meaningful when type is "listItem". */
  list?: "bullet" | "number";
  align?: "left" | "center" | "right" | "justify";
  /** Unitless multiplier, e.g. 1.5. */
  lineHeight?: number;
  /** px, may be negative for tightening. */
  letterSpacing?: number;
  /** Paragraph spacing after the block, in px. */
  spaceAfter?: number;
  spans: RichSpan[];
}

export interface RichText {
  v: 1;
  blocks: RichBlock[];
}

export type ShadowPreset = "none" | "soft" | "medium" | "strong" | "glow" | "lift";

export const SHADOW_PRESETS: Record<Exclude<ShadowPreset, "none">, string> = {
  soft: "0 1px 2px rgba(0,0,0,.28)",
  medium: "0 2px 5px rgba(0,0,0,.35)",
  strong: "0 3px 10px rgba(0,0,0,.5)",
  glow: "0 0 12px rgba(255,255,255,.85)",
  lift: "0 4px 0 rgba(0,0,0,.18)",
};

/** Font stacks offered in the toolbar. Keys are stored; values reach CSS. */
export const FONT_STACKS: Record<string, string> = {
  brand: "var(--font-brand, 'Apercu', system-ui, sans-serif)",
  display: "var(--font-display, 'Calibrate', Georgia, serif)",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

export const FONT_SIZE_PRESETS = [12, 14, 16, 18, 20, 24, 30, 36, 44, 54, 68] as const;

// ---------------------------------------------------------------------------
// Sanitising primitives
// ---------------------------------------------------------------------------

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/i;
const HSL = /^hsla?\(\s*[\d.]+(?:deg)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/i;
const NAMED = new Set([
  "transparent", "currentcolor", "black", "white", "red", "green", "blue",
  "orange", "yellow", "purple", "gray", "grey",
]);

/** Returns a CSS colour we are willing to emit, or undefined. */
export function safeColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim().slice(0, 64);
  if (!next) return undefined;
  if (HEX.test(next) || RGB.test(next) || HSL.test(next)) return next.toLowerCase();
  if (NAMED.has(next.toLowerCase())) return next.toLowerCase();
  return undefined;
}

/**
 * Links are the one place a draft can point at the outside world, so the scheme
 * allowlist is strict: anything with a colon that is not http/https/mailto/tel
 * is dropped (this is what stops `javascript:` and `data:` URLs).
 */
export function safeHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim().slice(0, 2000);
  if (!next) return undefined;
  if (next.startsWith("/") || next.startsWith("#")) return next;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(next)) return next;
  // A bare domain like "chick-fil-a.com" is a common paste; upgrade it.
  if (/^[\w.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(next)) return `https://${next}`;
  return undefined;
}

const clamp = (value: unknown, min: number, max: number): number | undefined =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.round(Math.max(min, Math.min(max, value)) * 100) / 100
    : undefined;

// ---------------------------------------------------------------------------
// Normalisation
// ---------------------------------------------------------------------------

function normaliseMarks(raw: unknown): RichMarks | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const source = raw as Record<string, unknown>;
  const marks: RichMarks = {};
  if (source.bold === true) marks.bold = true;
  if (source.italic === true) marks.italic = true;
  if (source.underline === true) marks.underline = true;
  if (source.strike === true) marks.strike = true;

  const color = safeColor(source.color);
  if (color) marks.color = color;
  const highlight = safeColor(source.highlight);
  if (highlight) marks.highlight = highlight;

  if (typeof source.fontFamily === "string" && source.fontFamily in FONT_STACKS) {
    marks.fontFamily = source.fontFamily;
  }
  const fontSize = clamp(source.fontSize, 8, 200);
  if (fontSize) marks.fontSize = fontSize;

  const href = safeHref(source.href);
  if (href) marks.href = href;

  if (typeof source.shadow === "string" && source.shadow !== "none" && source.shadow in SHADOW_PRESETS) {
    marks.shadow = source.shadow as ShadowPreset;
  }
  const strokeWidth = clamp(source.strokeWidth, 0, 8);
  if (strokeWidth) {
    marks.strokeWidth = strokeWidth;
    marks.strokeColor = safeColor(source.strokeColor) ?? "#000000";
  }
  const opacity = clamp(source.opacity, 10, 100);
  if (opacity !== undefined && opacity < 100) marks.opacity = opacity;

  if (source.transform === "uppercase" || source.transform === "lowercase" || source.transform === "capitalize") {
    marks.transform = source.transform;
  }
  return Object.keys(marks).length ? marks : undefined;
}

/** Stable key for "do these two runs format identically?" merge checks. */
export function marksKey(marks?: RichMarks): string {
  if (!marks) return "";
  return (Object.keys(marks) as Array<keyof RichMarks>)
    .sort()
    .map((key) => `${key}:${marks[key]}`)
    .join("|");
}

/** Collapses adjacent runs with identical marks and drops empty ones. */
function mergeSpans(spans: RichSpan[]): RichSpan[] {
  const out: RichSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const last = out[out.length - 1];
    if (last && marksKey(last.marks) === marksKey(span.marks)) last.text += span.text;
    else out.push({ text: span.text, ...(span.marks ? { marks: span.marks } : {}) });
  }
  return out;
}

function normaliseBlock(raw: unknown): RichBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;

  const rawSpans = Array.isArray(source.spans) ? source.spans : [];
  const spans = mergeSpans(
    rawSpans.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const text = (entry as Record<string, unknown>).text;
      if (typeof text !== "string" || !text) return [];
      const marks = normaliseMarks((entry as Record<string, unknown>).marks);
      // Hard cap keeps one pathological paste from bloating the D1 row.
      return [{ text: text.slice(0, 8000), ...(marks ? { marks } : {}) }];
    }),
  );

  const type = source.type === "heading" || source.type === "listItem" ? source.type : "paragraph";
  const block: RichBlock = { type, spans };
  if (typeof source.styleId === "string" && source.styleId) block.styleId = source.styleId.slice(0, 40);

  if (type === "heading") {
    const level = clamp(source.level, 1, 4);
    block.level = (level ? Math.round(level) : 2) as 1 | 2 | 3 | 4;
  }
  if (type === "listItem") {
    block.list = source.list === "number" ? "number" : "bullet";
  }
  if (source.align === "center" || source.align === "right" || source.align === "justify" || source.align === "left") {
    block.align = source.align;
  }
  const lineHeight = clamp(source.lineHeight, 0.8, 4);
  if (lineHeight) block.lineHeight = lineHeight;
  const letterSpacing = clamp(source.letterSpacing, -5, 20);
  if (letterSpacing) block.letterSpacing = letterSpacing;
  const spaceAfter = clamp(source.spaceAfter, 0, 160);
  if (spaceAfter) block.spaceAfter = spaceAfter;

  return block;
}

/** An empty-but-valid document, used whenever content is missing. */
export function emptyRichText(): RichText {
  return { v: 1, blocks: [{ type: "paragraph", spans: [] }] };
}

/** Builds a single-paragraph document from a plain string. */
export function richTextFromPlain(text: string, block?: Partial<RichBlock>): RichText {
  const lines = String(text ?? "").split(/\r?\n/);
  const blocks = lines.map<RichBlock>((line) => ({
    type: "paragraph",
    ...block,
    spans: line ? [{ text: line }] : [],
  }));
  return { v: 1, blocks: blocks.length ? blocks : emptyRichText().blocks };
}

/**
 * The migration entry point. Accepts a v1 document, a legacy plain string, or
 * anything unrecognised, and always returns a valid document. `fallback` is the
 * plain text to use when `value` carries nothing usable — this is how existing
 * newsletter copy stored as strings becomes rich text without a data backfill.
 */
export function parseRichText(value: unknown, fallback = ""): RichText {
  if (typeof value === "string") return richTextFromPlain(value);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (Array.isArray(source.blocks)) {
      const blocks = source.blocks
        .map(normaliseBlock)
        .filter((block): block is RichBlock => Boolean(block))
        .slice(0, 400);
      if (blocks.length) return { v: 1, blocks };
    }
  }
  return fallback ? richTextFromPlain(fallback) : emptyRichText();
}

// ---------------------------------------------------------------------------
// Derivations
// ---------------------------------------------------------------------------

/** Flattens to plain text — used for search, validation and legacy fields. */
export function richTextToPlain(doc: RichText | undefined): string {
  if (!doc) return "";
  return doc.blocks
    .map((block) => block.spans.map((span) => span.text).join(""))
    .join("\n")
    .trim();
}

/** True when the document has no visible characters. */
export function isRichTextEmpty(doc: RichText | undefined): boolean {
  return !richTextToPlain(doc);
}
