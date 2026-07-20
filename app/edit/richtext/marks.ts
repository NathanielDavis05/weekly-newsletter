"use client";

// Selection mapping and mark application.
//
// Formatting is applied to the *model*, never to the live DOM. The flow for any
// toolbar action is:
//
//   1. read the browser selection as (block index, character offset) pairs
//   2. split spans in the model at those offsets and patch the marks
//   3. re-render from the model, then restore the selection at the same offsets
//
// Doing it this way means the editor DOM is always something RichText.tsx could
// have produced, so "what you see while editing" and "what gets published" can
// never drift. It also sidesteps the usual contentEditable trap of toggling a
// mark off by layering CSS negations on top of an ancestor tag.

import { marksKey, type RichBlock, type RichMarks, type RichSpan, type RichText } from "../../content/richtext";

/** A caret position expressed against the model rather than the DOM. */
export interface RichPoint {
  block: number;
  offset: number;
}

export interface RichRange {
  from: RichPoint;
  to: RichPoint;
}

const BLOCK_SELECTOR = "p, h1, h2, h3, h4, li";

/**
 * The Nth block element in document order is doc.blocks[N] — the renderer's
 * list grouping preserves block order, so no extra bookkeeping is needed.
 *
 * Inline fields (a heading or label inside the newsletter markup) render spans
 * with no block wrapper at all, so there is nothing matching the selector. In
 * that case the editable host itself is the single block.
 */
export function blockElements(root: HTMLElement): HTMLElement[] {
  const found = Array.from(root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR));
  return found.length ? found : [root];
}

function blockAncestor(root: HTMLElement, node: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== root) {
    if (current.nodeType === 1 && (current as HTMLElement).matches?.(BLOCK_SELECTOR)) {
      return current as HTMLElement;
    }
    current = current.parentNode;
  }
  // Inline fields have no block wrapper; the host stands in for it.
  return root.querySelector(BLOCK_SELECTOR) ? null : root;
}

/** Character offset of a DOM point within its block element. */
function offsetWithinBlock(block: HTMLElement, node: Node, nodeOffset: number): number {
  if (node === block) {
    // The point is between children; sum everything before that child index.
    let total = 0;
    for (let index = 0; index < nodeOffset && index < block.childNodes.length; index += 1) {
      total += block.childNodes[index].textContent?.length ?? 0;
    }
    return total;
  }
  let total = 0;
  const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + nodeOffset;
    total += current.nodeValue?.length ?? 0;
    current = walker.nextNode();
  }
  return total;
}

/** Reads the live selection into model coordinates. Returns null if outside. */
export function readSelection(root: HTMLElement): RichRange | null {
  const selection = root.ownerDocument.defaultView?.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return null;

  const blocks = blockElements(root);
  const startBlock = blockAncestor(root, range.startContainer);
  const endBlock = blockAncestor(root, range.endContainer);
  if (!startBlock || !endBlock) return null;

  const from: RichPoint = {
    block: blocks.indexOf(startBlock),
    offset: offsetWithinBlock(startBlock, range.startContainer, range.startOffset),
  };
  const to: RichPoint = {
    block: blocks.indexOf(endBlock),
    offset: offsetWithinBlock(endBlock, range.endContainer, range.endOffset),
  };
  if (from.block < 0 || to.block < 0) return null;
  return comparePoints(from, to) <= 0 ? { from, to } : { from: to, to: from };
}

export function comparePoints(a: RichPoint, b: RichPoint): number {
  if (a.block !== b.block) return a.block - b.block;
  return a.offset - b.offset;
}

export function isCollapsed(range: RichRange | null): boolean {
  return !range || comparePoints(range.from, range.to) === 0;
}

/** Places the caret/selection back after a re-render. */
export function restoreSelection(root: HTMLElement, range: RichRange): void {
  const view = root.ownerDocument.defaultView;
  const selection = view?.getSelection();
  if (!selection) return;
  const blocks = blockElements(root);

  const locate = (point: RichPoint): { node: Node; offset: number } | null => {
    const block = blocks[Math.max(0, Math.min(blocks.length - 1, point.block))];
    if (!block) return null;
    let remaining = point.offset;
    const walker = block.ownerDocument.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    let last: Node | null = null;
    while (current) {
      const length = current.nodeValue?.length ?? 0;
      if (remaining <= length) return { node: current, offset: remaining };
      remaining -= length;
      last = current;
      current = walker.nextNode();
    }
    // Empty block (renders as <br>) or offset past the end.
    if (last) return { node: last, offset: last.nodeValue?.length ?? 0 };
    return { node: block, offset: 0 };
  };

  const start = locate(range.from);
  const end = locate(range.to);
  if (!start || !end) return;

  const domRange = root.ownerDocument.createRange();
  try {
    domRange.setStart(start.node, Math.min(start.offset, start.node.nodeValue?.length ?? 0));
    domRange.setEnd(end.node, Math.min(end.offset, end.node.nodeValue?.length ?? 0));
  } catch {
    return;
  }
  selection.removeAllRanges();
  selection.addRange(domRange);
}

// ---------------------------------------------------------------------------
// Model editing
// ---------------------------------------------------------------------------

/**
 * Splits a block's spans so that character `offset` falls on a span boundary,
 * returning the index of the span that starts there.
 */
function splitAt(spans: RichSpan[], offset: number): number {
  let consumed = 0;
  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index];
    if (consumed === offset) return index;
    const end = consumed + span.text.length;
    if (offset < end) {
      const head: RichSpan = { text: span.text.slice(0, offset - consumed), ...(span.marks ? { marks: span.marks } : {}) };
      const tail: RichSpan = { text: span.text.slice(offset - consumed), ...(span.marks ? { marks: span.marks } : {}) };
      spans.splice(index, 1, head, tail);
      return index + 1;
    }
    consumed = end;
  }
  return spans.length;
}

/** Collapses neighbours that ended up with identical formatting. */
function tidy(spans: RichSpan[]): RichSpan[] {
  const out: RichSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const last = out[out.length - 1];
    if (last && marksKey(last.marks) === marksKey(span.marks)) last.text += span.text;
    else out.push(span);
  }
  return out;
}

/** `undefined` in a patch value means "remove this mark". */
export type MarkPatch = { [K in keyof RichMarks]?: RichMarks[K] | null };

function applyPatch(marks: RichMarks | undefined, patch: MarkPatch): RichMarks | undefined {
  const next: RichMarks = { ...(marks ?? {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === false || value === undefined) delete next[key as keyof RichMarks];
    else (next as Record<string, unknown>)[key] = value;
  }
  // Stroke colour is meaningless without a width.
  if (!next.strokeWidth) delete next.strokeColor;
  return Object.keys(next).length ? next : undefined;
}

/** Applies a mark patch to every character in the range. */
export function patchMarks(doc: RichText, range: RichRange, patch: MarkPatch): RichText {
  const blocks = doc.blocks.map((block) => ({ ...block, spans: block.spans.map((span) => ({ ...span })) }));

  for (let index = range.from.block; index <= range.to.block && index < blocks.length; index += 1) {
    const block = blocks[index];
    const spans = block.spans;
    const total = spans.reduce((sum, span) => sum + span.text.length, 0);
    const start = index === range.from.block ? Math.min(range.from.offset, total) : 0;
    const end = index === range.to.block ? Math.min(range.to.offset, total) : total;
    if (start >= end) continue;

    // Split the tail boundary first so the head split cannot shift its index.
    splitAt(spans, end);
    splitAt(spans, start);

    let consumed = 0;
    for (const span of spans) {
      const spanEnd = consumed + span.text.length;
      if (consumed >= start && spanEnd <= end) span.marks = applyPatch(span.marks, patch);
      consumed = spanEnd;
    }
    block.spans = tidy(spans);
  }

  return { v: 1, blocks };
}

/** Applies block-level attributes (alignment, spacing, list type, tag). */
export function patchBlocks(doc: RichText, range: RichRange, patch: Partial<RichBlock>): RichText {
  const blocks = doc.blocks.map((block, index) => {
    if (index < range.from.block || index > range.to.block) return block;
    const next: RichBlock = { ...block, ...patch };
    // Keep type-specific fields coherent when switching a block's type.
    if (!next.styleId) delete next.styleId;
    if (next.type !== "listItem") delete next.list;
    if (next.type !== "heading") delete next.level;
    if (next.type === "heading" && !next.level) next.level = 2;
    if (next.type === "listItem" && !next.list) next.list = "bullet";
    return next;
  });
  return { v: 1, blocks };
}

/** Strips every inline mark and block styling in the range. */
export function clearFormatting(doc: RichText, range: RichRange): RichText {
  const blocks = doc.blocks.map((block, index) => {
    if (index < range.from.block || index > range.to.block) return block;
    return {
      type: "paragraph" as const,
      spans: tidy(block.spans.map((span) => ({ text: span.text }))),
    };
  });
  return { v: 1, blocks };
}

/**
 * Summarises the formatting under the current selection so the toolbar can show
 * accurate active states. A boolean is "on" only when every character has it;
 * a value (colour, size) is reported only when it is uniform.
 */
export interface ActiveFormat {
  marks: RichMarks;
  /** Marks that are set on some — but not all — of the selection. */
  mixed: Set<keyof RichMarks>;
  block?: RichBlock;
  blocksUniform: boolean;
}

export function activeFormat(doc: RichText, range: RichRange | null): ActiveFormat {
  const empty: ActiveFormat = { marks: {}, mixed: new Set(), blocksUniform: true };
  if (!range) return empty;

  const collected: Array<RichMarks | undefined> = [];
  for (let index = range.from.block; index <= range.to.block && index < doc.blocks.length; index += 1) {
    const block = doc.blocks[index];
    const total = block.spans.reduce((sum, span) => sum + span.text.length, 0);
    const start = index === range.from.block ? range.from.offset : 0;
    const end = index === range.to.block ? range.to.offset : total;

    let consumed = 0;
    for (const span of block.spans) {
      const spanEnd = consumed + span.text.length;
      const overlaps = start === end
        // A collapsed caret adopts the formatting of the run it sits inside.
        ? consumed <= start && start <= spanEnd
        : consumed < end && spanEnd > start;
      if (overlaps) collected.push(span.marks);
      consumed = spanEnd;
    }
    if (!block.spans.length) collected.push(undefined);
  }

  const marks: RichMarks = {};
  const mixed = new Set<keyof RichMarks>();
  const keys: Array<keyof RichMarks> = [
    "bold", "italic", "underline", "strike", "color", "highlight",
    "fontFamily", "fontSize", "href", "shadow", "strokeWidth", "strokeColor",
    "opacity", "transform",
  ];
  for (const key of keys) {
    const values = collected.map((entry) => entry?.[key]);
    const first = values[0];
    if (values.every((value) => value === first)) {
      if (first !== undefined) (marks as Record<string, unknown>)[key] = first;
    } else {
      mixed.add(key);
      // Still surface a representative value so pickers open somewhere sensible.
      const defined = values.find((value) => value !== undefined);
      if (defined !== undefined) (marks as Record<string, unknown>)[key] = defined;
    }
  }

  const blocksInRange = doc.blocks.slice(range.from.block, range.to.block + 1);
  const reference = blocksInRange[0];
  const blocksUniform = blocksInRange.every(
    (block) =>
      block.type === reference?.type &&
      block.align === reference?.align &&
      block.list === reference?.list &&
      block.level === reference?.level,
  );

  return { marks, mixed, block: reference, blocksUniform };
}
