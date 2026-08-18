/**
 * Responsive cascade.
 *
 * Every element carries three style layers: base (desktop), tablet, mobile.
 * A narrower breakpoint inherits everything from the wider ones and may
 * override individual properties. Editing at `mobile` writes only into the
 * mobile layer, so desktop is never touched.
 *
 * Global (typography / button) styles sit *underneath* an element's own
 * styles at every breakpoint: an explicit desktop override on the element
 * still wins over the global style's mobile value. That ordering is
 * mirrored exactly by the emission order in css.ts, so what the inspector
 * reports and what the browser paints cannot drift apart.
 */

import type {
  Breakpoint,
  ElementNode,
  StyleLayer,
  Theme,
} from '../model/types';

/** Layers that contribute to a breakpoint, widest first. */
export const CASCADE: Record<Breakpoint, Breakpoint[]> = {
  base: ['base'],
  tablet: ['base', 'tablet'],
  mobile: ['base', 'tablet', 'mobile'],
};

/** Breakpoints narrower-or-equal, used when clearing overrides. */
export const NARROWER: Record<Breakpoint, Breakpoint[]> = {
  base: ['tablet', 'mobile'],
  tablet: ['mobile'],
  mobile: [],
};

/** Merge an element's own layers up to and including `bp`. */
export function ownStylesAt(node: ElementNode, bp: Breakpoint): StyleLayer {
  const out: StyleLayer = {};
  for (const layer of CASCADE[bp]) Object.assign(out, node.styles[layer]);
  return out;
}

function mergeLayers(set: { base: StyleLayer; tablet: StyleLayer; mobile: StyleLayer }, bp: Breakpoint): StyleLayer {
  const out: StyleLayer = {};
  for (const layer of CASCADE[bp]) Object.assign(out, set[layer]);
  return out;
}

/** Global styles (typography + button preset) that apply beneath an element. */
export function globalStylesAt(node: ElementNode, bp: Breakpoint, theme: Theme): StyleLayer {
  const out: StyleLayer = {};

  const buttonStyleId = node.settings?.buttonStyle as string | undefined;
  if (buttonStyleId) {
    const btn = theme.buttons.find((b) => b.id === buttonStyleId);
    if (btn) Object.assign(out, mergeLayers(btn.styles, bp));
  }

  if (node.textStyle) {
    const t = theme.typography.find((x) => x.id === node.textStyle);
    if (t) Object.assign(out, mergeLayers(t.styles, bp));
  }

  return out;
}

/** The final computed style layer for an element at a breakpoint. */
export function resolveStyles(node: ElementNode, bp: Breakpoint, theme: Theme): StyleLayer {
  return { ...globalStylesAt(node, bp, theme), ...ownStylesAt(node, bp) };
}

export type StyleOrigin =
  /** Set directly on this element at the current breakpoint. */
  | 'local'
  /** Inherited from a wider breakpoint on this element. */
  | 'inherited'
  /** Comes from a global typography / button style. */
  | 'global'
  /** Not set anywhere; browser default. */
  | 'default';

export interface StyleValueInfo {
  value: string | undefined;
  origin: StyleOrigin;
  /** For `inherited`, the breakpoint the value actually came from. */
  from?: Breakpoint;
}

/**
 * Where a single property's value comes from — drives the inherited /
 * overridden / global indicators and the "reset override" affordance.
 */
export function styleInfo(
  node: ElementNode,
  prop: string,
  bp: Breakpoint,
  theme: Theme,
): StyleValueInfo {
  const own = node.styles[bp][prop];
  if (own !== undefined) return { value: own, origin: 'local', from: bp };

  // Widest-first walk, so the nearest wider layer wins.
  const chain = CASCADE[bp].slice(0, -1).reverse() as Breakpoint[];
  for (const layer of chain) {
    const v = node.styles[layer][prop];
    if (v !== undefined) return { value: v, origin: 'inherited', from: layer };
  }

  const g = globalStylesAt(node, bp, theme)[prop];
  if (g !== undefined) return { value: g, origin: 'global' };

  return { value: undefined, origin: 'default' };
}

/** True when this element overrides `prop` at `bp` relative to wider breakpoints. */
export function isOverride(node: ElementNode, prop: string, bp: Breakpoint): boolean {
  if (bp === 'base') return false;
  return node.styles[bp][prop] !== undefined;
}

/** Breakpoints (other than base) where this element overrides anything. */
export function overriddenBreakpoints(node: ElementNode): Breakpoint[] {
  const out: Breakpoint[] = [];
  if (Object.keys(node.styles.tablet).length) out.push('tablet');
  if (Object.keys(node.styles.mobile).length) out.push('mobile');
  return out;
}

/**
 * Is the element visible at this breakpoint? Visibility cascades the same
 * way styles do — the narrowest explicitly-set layer wins, so an element
 * hidden on desktop can be shown again on mobile (mobile-only content).
 */
export function isVisibleAt(node: ElementNode, bp: Breakpoint): boolean {
  if (!node.hidden) return true;
  let hidden = false;
  for (const layer of CASCADE[bp]) {
    const v = node.hidden[layer];
    if (v !== undefined) hidden = v;
  }
  return !hidden;
}

/** Same lookup as isVisibleAt, but reports where the value came from. */
export function hiddenInfo(node: ElementNode, bp: Breakpoint): { hidden: boolean; from: Breakpoint | null } {
  let hidden = false;
  let from: Breakpoint | null = null;
  for (const layer of CASCADE[bp]) {
    const v = node.hidden?.[layer];
    if (v !== undefined) {
      hidden = v;
      from = layer;
    }
  }
  return { hidden, from };
}

/* ------------------------------------------------------------------ */
/* Value parsing helpers used by the numeric inspector controls         */
/* ------------------------------------------------------------------ */

export const UNITS = ['px', '%', 'rem', 'em', 'vw', 'vh', 'auto', 'fr'] as const;
export type Unit = (typeof UNITS)[number];

export interface ParsedValue {
  num: number | null;
  unit: string;
  raw: string;
}

const NUM_UNIT = /^(-?[\d.]+)\s*(px|%|rem|em|vw|vh|fr|ch|s|ms|deg)?$/;

export function parseValue(raw: string | undefined, fallbackUnit = 'px'): ParsedValue {
  if (raw === undefined || raw === '') return { num: null, unit: fallbackUnit, raw: '' };
  const trimmed = raw.trim();
  if (trimmed === 'auto' || trimmed === 'none' || trimmed === 'inherit') {
    return { num: null, unit: trimmed, raw: trimmed };
  }
  const m = NUM_UNIT.exec(trimmed);
  if (!m) return { num: null, unit: '', raw: trimmed };
  return { num: parseFloat(m[1]), unit: m[2] ?? (m[1] === '0' ? fallbackUnit : ''), raw: trimmed };
}

export function formatValue(num: number | null, unit: string): string {
  if (unit === 'auto' || unit === 'none') return unit;
  if (num === null || Number.isNaN(num)) return '';
  const rounded = Math.round(num * 1000) / 1000;
  return `${rounded}${unit === '' ? '' : unit}`;
}
