// Colour conversion and parsing.
//
// The picker lets a manager type a hex code, drag HSL sliders, or nudge RGB
// numbers and expects all three to stay in agreement, so every representation
// round-trips through this module. Pure functions, no DOM — the maths is
// unit-tested rather than eyeballed against a gradient.

export interface RGB {
  r: number;
  g: number;
  b: number;
  /** 0–1. Kept separate from the channels so opacity survives conversions. */
  a: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
  a: number;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const round = (value: number) => Math.round(value * 1000) / 1000;

/** Parses hex (3/4/6/8 digit), rgb(), rgba(), hsl() and hsla(). */
export function parseColor(input: string): RGB | null {
  if (typeof input !== "string") return null;
  const value = input.trim().toLowerCase();
  if (!value) return null;

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    const expand = (chunk: string) => Number.parseInt(chunk.length === 1 ? chunk + chunk : chunk, 16);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: expand(hex[0]),
        g: expand(hex[1]),
        b: expand(hex[2]),
        a: hex.length === 4 ? round(expand(hex[3]) / 255) : 1,
      };
    }
    if (hex.length === 6 || hex.length === 8) {
      if (!/^[0-9a-f]+$/.test(hex)) return null;
      return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? round(Number.parseInt(hex.slice(6, 8), 16) / 255) : 1,
      };
    }
    return null;
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number.parseFloat);
    if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
    return {
      r: clamp(Math.round(parts[0]), 0, 255),
      g: clamp(Math.round(parts[1]), 0, 255),
      b: clamp(Math.round(parts[2]), 0, 255),
      a: parts.length > 3 && !Number.isNaN(parts[3]) ? clamp(parts[3], 0, 1) : 1,
    };
  }

  const hsl = value.match(/^hsla?\(([^)]+)\)$/);
  if (hsl) {
    const parts = hsl[1].split(/[\s,/]+/).filter(Boolean);
    const h = Number.parseFloat(parts[0]);
    const s = Number.parseFloat(parts[1]);
    const l = Number.parseFloat(parts[2]);
    if ([h, s, l].some(Number.isNaN)) return null;
    const a = parts.length > 3 ? clamp(Number.parseFloat(parts[3]), 0, 1) : 1;
    return hslToRgb({ h, s, l, a: Number.isNaN(a) ? 1 : a });
  }

  return null;
}

export function rgbToHex({ r, g, b, a }: RGB): string {
  const pair = (value: number) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0");
  const base = `#${pair(r)}${pair(g)}${pair(b)}`;
  if (a >= 1) return base;
  return `${base}${pair(a * 255)}`;
}

export function rgbToHsl({ r, g, b, a }: RGB): HSL {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;
  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  // Kept at two decimals rather than whole numbers: rounding here loses enough
  // precision that repeated hex -> HSL -> hex trips visibly drift a saturated
  // colour. The picker rounds for display instead.
  return { h: round(h), s: round(s * 100), l: round(l * 100), a };
}

export function hslToRgb({ h, s, l, a }: HSL): RGB {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let rgb: [number, number, number];
  if (hue < 60) rgb = [c, x, 0];
  else if (hue < 120) rgb = [x, c, 0];
  else if (hue < 180) rgb = [0, c, x];
  else if (hue < 240) rgb = [0, x, c];
  else if (hue < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
    a: clamp(a, 0, 1),
  };
}

/** Relative luminance per WCAG 2.1. */
export function luminance({ r, g, b }: RGB): number {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1–21. Used by the picker's readability hint. */
export function contrastRatio(foreground: string, background: string): number | null {
  const a = parseColor(foreground);
  const b = parseColor(background);
  if (!a || !b) return null;
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export type ContrastGrade = "AAA" | "AA" | "AA Large" | "Fail";

export function contrastGrade(ratio: number): ContrastGrade {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA Large";
  return "Fail";
}

/** Picks black or white text for legibility on a given background. */
export function readableTextOn(background: string): "#000000" | "#ffffff" {
  const rgb = parseColor(background);
  if (!rgb) return "#000000";
  return luminance(rgb) > 0.45 ? "#000000" : "#ffffff";
}
