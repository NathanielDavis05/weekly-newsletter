/**
 * Turns the document model into a real stylesheet.
 *
 * Emission order encodes the cascade documented in styles.ts:
 *
 *   reset → tokens → typography(base,tablet,mobile) → buttons(...)
 *         → elements(base) → elements(tablet) → elements(mobile)
 *         → visibility → interactions → custom CSS
 *
 * Because everything uses single-class selectors, source order alone decides
 * the winner — so an element's desktop override still beats a global style's
 * mobile value, which is what `resolveStyles` reports in the inspector.
 *
 * In the editor the breakpoint blocks are container queries against the
 * canvas, which makes dragging the canvas width genuinely responsive.
 * On export they become ordinary media queries.
 */

import { BREAKPOINT_MAX } from '../model/types';
import type { Breakpoint, ElementNode, SiteDoc, StyleLayer, Theme } from '../model/types';

export const CANVAS_CONTAINER = 'cvroot';

export type QueryMode = 'container' | 'media';

export const elClass = (id: string) => `e-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
export const tyClass = (id: string) => `ty-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
export const btnClass = (id: string) => `bt-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

const hyphenate = (prop: string) =>
  prop.startsWith('--') ? prop : prop.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function declarations(layer: StyleLayer, indent = '  '): string {
  const keys = Object.keys(layer);
  if (!keys.length) return '';
  return keys
    .filter((k) => layer[k] !== undefined && layer[k] !== '')
    .map((k) => `${indent}${hyphenate(k)}: ${layer[k]};`)
    .join('\n');
}

export function rule(selector: string, layer: StyleLayer, indent = ''): string {
  const body = declarations(layer, `${indent}  `);
  if (!body) return '';
  return `${indent}${selector} {\n${body}\n${indent}}`;
}

function wrapQuery(bp: Breakpoint, css: string, mode: QueryMode): string {
  if (!css.trim()) return '';
  const max = BREAKPOINT_MAX[bp];
  if (max === null) return css;
  const q =
    mode === 'container'
      ? `@container ${CANVAS_CONTAINER} (max-width: ${max}px)`
      : `@media (max-width: ${max}px)`;
  return `${q} {\n${css}\n}`;
}

const indentBlock = (s: string) =>
  s
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

export function themeTokens(theme: Theme): StyleLayer {
  const out: StyleLayer = {};
  for (const c of theme.colors) out[`--${c.varName}`] = c.value;
  out['--font-heading'] = theme.fontFamilies.heading;
  out['--font-body'] = theme.fontFamilies.body;
  out['--font-mono'] = theme.fontFamilies.mono;
  for (const r of theme.radii) out[`--radius-${r.id.replace(/^r_/, '')}`] = r.value;
  for (const s of theme.shadows) out[`--shadow-${s.id.replace(/^s_/, '')}`] = s.value;
  for (const s of theme.spacing) out[`--space-${s.id.replace(/^sp_/, '')}`] = s.value;
  out['--width-narrow'] = theme.containerWidths.narrow;
  out['--width-normal'] = theme.containerWidths.normal;
  out['--width-wide'] = theme.containerWidths.wide;
  out['--width-full'] = theme.containerWidths.full;
  return out;
}

/* ------------------------------------------------------------------ */
/* Base reset — deliberately small; no framework, no bloat.            */
/* ------------------------------------------------------------------ */

export function siteReset(scope: string): string {
  // On export the page root *is* <body>, so the document needs a height for
  // its `min-height: 100%` to mean anything.
  const htmlRule = scope === 'body' ? 'html { min-height: 100%; }\n' : '';
  return `${htmlRule}${scope} *, ${scope} *::before, ${scope} *::after { box-sizing: border-box; }
${scope} { -webkit-font-smoothing: antialiased; color: var(--c-text); background: var(--c-background); font-family: var(--font-body); }
${scope} h1, ${scope} h2, ${scope} h3, ${scope} h4, ${scope} h5, ${scope} h6, ${scope} p, ${scope} figure, ${scope} ul, ${scope} ol { margin: 0; padding: 0; }
${scope} ul, ${scope} ol { list-style: none; }
${scope} img { display: block; max-width: 100%; }
${scope} a { color: inherit; text-decoration: none; }
${scope} button { font: inherit; }`;
}

/* ------------------------------------------------------------------ */
/* Global styles                                                       */
/* ------------------------------------------------------------------ */

function globalStylesCss(theme: Theme, bp: Breakpoint, prefix: string): string {
  const parts: string[] = [];
  for (const t of theme.typography) {
    parts.push(rule(`${prefix}.${tyClass(t.id)}`, t.styles[bp]));
  }
  for (const b of theme.buttons) {
    parts.push(rule(`${prefix}.${btnClass(b.id)}`, b.styles[bp]));
  }
  return parts.filter(Boolean).join('\n');
}

function buttonHoverCss(theme: Theme, prefix: string): string {
  return theme.buttons
    .map((b) => rule(`${prefix}.${btnClass(b.id)}:hover`, b.hover))
    .filter(Boolean)
    .join('\n');
}

/* ------------------------------------------------------------------ */
/* Elements                                                            */
/* ------------------------------------------------------------------ */

function elementSelector(node: ElementNode, prefix: string): string {
  return `${prefix}.${elClass(node.id)}`;
}

function elementsCss(nodes: ElementNode[], bp: Breakpoint, prefix: string): string {
  return nodes
    .map((n) => rule(elementSelector(n, prefix), n.styles[bp]))
    .filter(Boolean)
    .join('\n');
}

/**
 * Visibility is emitted last and marked important: hiding an element for a
 * breakpoint is an intent that should beat any display value the element or
 * its global style set.
 */
function visibilityCss(nodes: ElementNode[], bp: Breakpoint, prefix: string): string {
  const out: string[] = [];
  for (const n of nodes) {
    const v = n.hidden?.[bp];
    if (v === true) out.push(`${prefix}.${elClass(n.id)} { display: none !important; }`);
    else if (v === false && bp !== 'base') out.push(`${prefix}.${elClass(n.id)} { display: revert !important; }`);
  }
  return out.join('\n');
}

/* ------------------------------------------------------------------ */
/* Interactions                                                        */
/* ------------------------------------------------------------------ */

function transformFrom(e: { scale?: number; x?: number; y?: number; rotate?: number }): string | null {
  const parts: string[] = [];
  if (e.x !== undefined || e.y !== undefined) parts.push(`translate(${e.x ?? 0}px, ${e.y ?? 0}px)`);
  if (e.rotate !== undefined) parts.push(`rotate(${e.rotate}deg)`);
  if (e.scale !== undefined) parts.push(`scale(${e.scale})`);
  return parts.length ? parts.join(' ') : null;
}

export function interactionsCss(nodes: ElementNode[], prefix: string): string {
  const out: string[] = [];
  const keyframes = new Set<string>();

  for (const n of nodes) {
    for (const ix of n.interactions ?? []) {
      if (!ix.enabled) continue;
      const sel = `${prefix}.${elClass(n.id)}`;
      const layer: StyleLayer = {};
      if (ix.effect.opacity !== undefined) layer.opacity = String(ix.effect.opacity);
      if (ix.effect.color) layer.color = ix.effect.color;
      if (ix.effect.backgroundColor) layer.backgroundColor = ix.effect.backgroundColor;
      const tf = transformFrom(ix.effect);
      if (tf) layer.transform = tf;

      const transition = `all ${ix.duration}ms ${ix.easing} ${ix.delay}ms`;

      if (ix.trigger === 'hover') {
        out.push(rule(sel, { transition }));
        out.push(rule(`${sel}:hover`, layer));
      } else if (ix.trigger === 'click') {
        out.push(rule(sel, { transition }));
        out.push(rule(`${sel}:active`, layer));
      } else if (ix.trigger === 'load' || ix.trigger === 'scrollIntoView') {
        const name = `ix-${n.id}-${ix.id}`.replace(/[^a-zA-Z0-9_-]/g, '');
        const fromLayer: StyleLayer = {};
        if (ix.effect.opacity !== undefined) fromLayer.opacity = String(ix.effect.opacity);
        const ftf = transformFrom(ix.effect);
        if (ftf) fromLayer.transform = ftf;
        if (ix.effect.color) fromLayer.color = ix.effect.color;
        if (ix.effect.backgroundColor) fromLayer.backgroundColor = ix.effect.backgroundColor;

        keyframes.add(
          `@keyframes ${name} {\n  from {\n${declarations(fromLayer, '    ')}\n  }\n  to {\n    opacity: 1;\n    transform: none;\n  }\n}`,
        );
        if (ix.trigger === 'load') {
          out.push(rule(sel, { animation: `${name} ${ix.duration}ms ${ix.easing} ${ix.delay}ms both` }));
        } else {
          // Progressive enhancement: scroll-driven where supported, otherwise
          // the element is simply visible.
          out.push(
            `@supports (animation-timeline: view()) {\n${indentBlock(
              rule(sel, {
                animation: `${name} ${ix.duration}ms ${ix.easing} both`,
                animationTimeline: 'view()',
                animationRange: 'entry 0% cover 32%',
              }),
            )}\n}`,
          );
        }
      }
    }
  }

  return [...keyframes, ...out].filter(Boolean).join('\n');
}

/* ------------------------------------------------------------------ */
/* Public entry points                                                 */
/* ------------------------------------------------------------------ */

export interface BuildCssOptions {
  /** Selector everything is scoped under (`.cv-root` in the editor, `body` on export). */
  scope: string;
  mode: QueryMode;
  /** Only emit rules for these elements; defaults to the whole doc. */
  elements?: ElementNode[];
  /** Overrides the prefix applied to element/global class selectors. */
  selectorPrefix?: string;
  includeReset?: boolean;
  includeTokens?: boolean;
  includeInteractions?: boolean;
}

export function buildCss(doc: SiteDoc, opts: BuildCssOptions): string {
  const { scope, mode } = opts;
  const nodes = opts.elements ?? Object.values(doc.elements);
  // On export the page root becomes <body>, so element rules must not be
  // descendant-scoped or `body.e-root` could never match.
  const prefix = opts.selectorPrefix ?? (scope ? `${scope} ` : '');
  const parts: string[] = [];

  if (opts.includeTokens !== false) {
    parts.push(rule(mode === 'media' ? ':root' : scope, themeTokens(doc.theme)));
  }
  if (opts.includeReset !== false) {
    parts.push(siteReset(scope));
  }

  // Global styles, widest to narrowest.
  parts.push(globalStylesCss(doc.theme, 'base', prefix));
  parts.push(wrapQuery('tablet', indentBlock(globalStylesCss(doc.theme, 'tablet', prefix)), mode));
  parts.push(wrapQuery('mobile', indentBlock(globalStylesCss(doc.theme, 'mobile', prefix)), mode));
  parts.push(buttonHoverCss(doc.theme, prefix));

  // Element styles, widest to narrowest.
  parts.push(elementsCss(nodes, 'base', prefix));
  parts.push(wrapQuery('tablet', indentBlock(elementsCss(nodes, 'tablet', prefix)), mode));
  parts.push(wrapQuery('mobile', indentBlock(elementsCss(nodes, 'mobile', prefix)), mode));

  // Visibility.
  parts.push(visibilityCss(nodes, 'base', prefix));
  parts.push(wrapQuery('tablet', indentBlock(visibilityCss(nodes, 'tablet', prefix)), mode));
  parts.push(wrapQuery('mobile', indentBlock(visibilityCss(nodes, 'mobile', prefix)), mode));

  if (opts.includeInteractions !== false) {
    parts.push(interactionsCss(nodes, prefix));
  }

  // Per-element custom CSS, then site-wide custom CSS, always last.
  const custom = nodes
    .filter((n) => n.customCss?.trim())
    .map((n) => `${prefix}.${elClass(n.id)} {\n${n.customCss!.trim()}\n}`)
    .join('\n');
  parts.push(custom);
  if (doc.theme.customCss?.trim()) parts.push(doc.theme.customCss.trim());

  return parts.filter((p) => p && p.trim()).join('\n\n');
}
