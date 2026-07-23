// Presets and helpers for styling a section or card.
//
// Two ideas hold this together:
//
// 1. Colours may be stored as `var(--brand-<token>)` rather than a literal hex.
//    ThemeStyles mounts those custom properties around every surface — editor,
//    preview and published page — so a section styled with a brand token keeps
//    following the palette when someone edits it in Site Design. A literal hex
//    is still allowed for one-offs; it just stops tracking the theme.
//
// 2. A preset is a complete look, not a starting point. Applying one clears the
//    properties it does not set, so switching from "Urgent" to "Quiet" cannot
//    leave a red border behind.

import type { BlockStyle } from "../../content/types";

/** Box shadows, distinct from the text shadows in content/richtext.ts. */
export const BOX_SHADOWS: Record<string, string> = {
  soft: "0 1px 3px rgba(13, 34, 56, .08)",
  medium: "0 6px 18px rgba(13, 34, 56, .12)",
  strong: "0 14px 34px rgba(13, 34, 56, .18)",
  inset: "inset 0 2px 6px rgba(13, 34, 56, .10)",
};

export type ShadowName = keyof typeof BOX_SHADOWS;

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)$/i;
const HSL = /^hsla?\(\s*[\d.]+(?:deg)?\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)$/i;
/** Only our own theme variables — never an arbitrary var() reference. */
const TOKEN = /^var\(--brand-[a-zA-Z0-9_-]{1,40}\)$/;
const NAMED = new Set(["transparent", "inherit", "currentcolor", "white", "black"]);

/**
 * Colours from the inspector land in an inline `style` attribute, so they are
 * checked before they get there rather than trusted.
 */
export function safeStyleColor(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const next = value.trim().slice(0, 64);
  if (!next) return undefined;
  if (HEX.test(next) || RGB.test(next) || HSL.test(next) || TOKEN.test(next)) return next;
  if (NAMED.has(next.toLowerCase())) return next.toLowerCase();
  return undefined;
}

/** Builds the CSS reference for a palette token. */
export const tokenColor = (id: string) => `var(--brand-${id})`;

/** Reads the token id back out, so the picker can show which swatch is active. */
export function tokenIdOf(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^var\(--brand-([a-zA-Z0-9_-]+)\)$/.exec(value.trim());
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/** The properties a preset owns. Anything here is reset when one is applied. */
const PRESET_KEYS = [
  "background", "color", "borderColor", "borderWidth", "borderRadius",
  "shadow", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
] as const;

export interface StylePreset {
  id: string;
  label: string;
  description: string;
  style: Partial<BlockStyle>;
}

const pad = (value: number) => ({
  paddingTop: value, paddingRight: value, paddingBottom: value, paddingLeft: value,
});

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "plain",
    label: "Plain",
    description: "No box — sits directly on the page",
    style: {},
  },
  {
    id: "card",
    label: "Card",
    description: "White panel with a soft edge",
    style: {
      background: tokenColor("surface"),
      borderColor: tokenColor("sand"),
      borderWidth: 1,
      borderRadius: 16,
      shadow: "soft",
      ...pad(20),
    },
  },
  {
    id: "highlight",
    label: "Highlight",
    description: "Cream panel for something worth noticing",
    style: {
      background: tokenColor("cream"),
      borderColor: tokenColor("sand"),
      borderWidth: 1,
      borderRadius: 16,
      ...pad(20),
    },
  },
  {
    id: "urgent",
    label: "Urgent",
    description: "Red-edged panel for deadlines and action items",
    style: {
      background: tokenColor("surface"),
      borderColor: tokenColor("brand"),
      borderWidth: 2,
      borderRadius: 16,
      shadow: "soft",
      ...pad(20),
    },
  },
  {
    id: "spotlight",
    label: "Spotlight",
    description: "Dark panel with light text",
    style: {
      background: tokenColor("ink"),
      color: tokenColor("surface"),
      borderRadius: 18,
      shadow: "medium",
      ...pad(22),
    },
  },
  {
    id: "success",
    label: "Good news",
    description: "Green panel for results and wins",
    style: {
      background: "#edf8f0",
      color: "#08733d",
      borderRadius: 16,
      ...pad(20),
    },
  },
  {
    id: "quiet",
    label: "Quiet",
    description: "Muted panel for supporting detail",
    style: {
      background: tokenColor("cream"),
      borderRadius: 12,
      ...pad(16),
    },
  },
];

/**
 * Applies a preset over an existing style. Layout the author set by hand
 * (widths, margins, per-device overrides, visibility) is deliberately kept —
 * a preset changes how a section *looks*, not where it sits.
 */
export function applyPreset(current: BlockStyle | undefined, preset: StylePreset): BlockStyle {
  const next: BlockStyle = { ...(current ?? {}) };
  for (const key of PRESET_KEYS) delete next[key];
  return { ...next, ...preset.style };
}

/** Best-effort match of a style back to a preset, for showing the active one. */
export function matchPreset(style: BlockStyle | undefined): string | null {
  if (!style) return "plain";
  for (const preset of STYLE_PRESETS) {
    const keys = Object.keys(preset.style) as Array<keyof BlockStyle>;
    if (!keys.length) continue;
    if (keys.every((key) => style[key] === preset.style[key])) return preset.id;
  }
  const decorated = PRESET_KEYS.some((key) => style[key] !== undefined);
  return decorated ? null : "plain";
}

/** The subset of a style that "Copy style" carries between sections. */
export function copyableStyle(style: BlockStyle | undefined): Partial<BlockStyle> {
  if (!style) return {};
  const out: Partial<BlockStyle> = {};
  for (const key of [...PRESET_KEYS, "fontSize", "fontWeight", "textAlign", "maxWidth"] as const) {
    const value = style[key];
    if (value !== undefined) (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
