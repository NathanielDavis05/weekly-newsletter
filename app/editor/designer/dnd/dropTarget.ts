import { canContain, def } from '../model/registry';
import type { ElementNode, ElementType } from '../model/types';
import type { DropTarget } from '../store/editorStore';

/**
 * Geometric drop resolution.
 *
 * The rules, in order:
 *   1. Find the deepest rendered element under the pointer that is not part
 *      of what's being dragged.
 *   2. If it's a container that accepts the payload and the pointer is in its
 *      interior, drop *inside* at the index nearest the pointer.
 *   3. Otherwise drop as a *sibling*, before or after depending on which side
 *      of the element's midpoint the pointer is on, along the parent's axis.
 *   4. If the resulting parent can't hold the payload, walk up until one can.
 */

export interface HitContext {
  elements: Record<string, ElementNode>;
  /** Ids being dragged (their subtrees are ignored as drop targets). */
  excluded: Set<string>;
  /** Element type being placed. */
  type: ElementType;
  root: HTMLElement;
}

const EDGE = 10;

function isExcluded(elements: Record<string, ElementNode>, id: string, excluded: Set<string>): boolean {
  let cur: string | null = id;
  while (cur) {
    if (excluded.has(cur)) return true;
    cur = elements[cur]?.parent ?? null;
  }
  return false;
}

/** Deepest non-excluded element under the pointer. */
function elementUnder(ctx: HitContext, x: number, y: number): { id: string; el: HTMLElement } | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (!ctx.root.contains(el)) continue;
    const host = (el as HTMLElement).closest<HTMLElement>('[data-el-id]');
    if (!host) continue;
    const id = host.dataset.elId!;
    if (!ctx.elements[id]) continue;
    if (isExcluded(ctx.elements, id, ctx.excluded)) continue;
    return { id, el: host };
  }
  return null;
}

function domChildren(ctx: HitContext, parentId: string): { id: string; el: HTMLElement }[] {
  const parent = ctx.elements[parentId];
  if (!parent) return [];
  const out: { id: string; el: HTMLElement }[] = [];
  for (const childId of parent.children) {
    if (ctx.excluded.has(childId)) continue;
    const el = ctx.root.querySelector<HTMLElement>(`[data-el-id="${CSS.escape(childId)}"]`);
    if (el && el.offsetParent !== null) out.push({ id: childId, el });
  }
  return out;
}

/** Do these children flow horizontally? Derived from actual geometry. */
function isHorizontal(children: { el: HTMLElement }[], containerEl: HTMLElement): boolean {
  if (children.length >= 2) {
    const a = children[0].el.getBoundingClientRect();
    const b = children[1].el.getBoundingClientRect();
    if (b.left >= a.right - 2) return true;
    if (b.top >= a.bottom - 2) return false;
  }
  const cs = getComputedStyle(containerEl);
  if (cs.display.includes('grid')) {
    return cs.gridTemplateColumns.split(' ').filter(Boolean).length > 1;
  }
  return cs.display.includes('flex') && cs.flexDirection.startsWith('row');
}

function toLocal(rect: DOMRect, root: DOMRect) {
  return { x: rect.left - root.left, y: rect.top - root.top, w: rect.width, h: rect.height };
}

/** Where inside `parentId` should the payload land, given the pointer? */
function insideTarget(ctx: HitContext, parentId: string, x: number, y: number): DropTarget | null {
  const parentEl = ctx.root.querySelector<HTMLElement>(`[data-el-id="${CSS.escape(parentId)}"]`);
  if (!parentEl) return null;
  const rootRect = ctx.root.getBoundingClientRect();
  const children = domChildren(ctx, parentId);

  if (!children.length) {
    const r = parentEl.getBoundingClientRect();
    const inner = toLocal(r, rootRect);
    return {
      parentId,
      index: 0,
      mode: 'empty',
      axis: 'y',
      rect: { x: inner.x + 6, y: inner.y + 6, w: Math.max(20, inner.w - 12), h: Math.max(20, inner.h - 12) },
    };
  }

  const horizontal = isHorizontal(children, parentEl);
  let index = children.length;
  for (let i = 0; i < children.length; i++) {
    const r = children[i].el.getBoundingClientRect();
    const mid = horizontal ? r.left + r.width / 2 : r.top + r.height / 2;
    const p = horizontal ? x : y;
    if (p < mid) {
      index = i;
      break;
    }
  }

  // Indicator sits on the boundary between the two children it separates.
  const before = children[index - 1];
  const after = children[index];
  const anchor = after ?? before;
  const ar = anchor.el.getBoundingClientRect();
  const local = toLocal(ar, rootRect);
  const atEnd = !after;

  const rect = horizontal
    ? { x: atEnd ? local.x + local.w + 1 : local.x - 3, y: local.y, w: 2.5, h: local.h }
    : { x: local.x, y: atEnd ? local.y + local.h + 1 : local.y - 3, w: local.w, h: 2.5 };

  // The real child index in the model, accounting for hidden/excluded siblings.
  const parent = ctx.elements[parentId];
  const modelIndex = after ? parent.children.indexOf(after.id) : before ? parent.children.indexOf(before.id) + 1 : 0;

  return {
    parentId,
    index: modelIndex < 0 ? parent.children.length : modelIndex,
    mode: atEnd ? 'after' : 'before',
    axis: horizontal ? 'x' : 'y',
    rect,
  };
}

/** Walk up from `id` to the first ancestor that accepts `type`. */
function acceptableAncestor(ctx: HitContext, id: string): string | null {
  let cur: string | null = id;
  while (cur) {
    const node: ElementNode | undefined = ctx.elements[cur];
    if (!node) return null;
    if (canContain(node.type, ctx.type) && !ctx.excluded.has(cur)) return cur;
    cur = node.parent;
  }
  return null;
}

export function computeDropTarget(ctx: HitContext, x: number, y: number): DropTarget | null {
  const hit = elementUnder(ctx, x, y);
  if (!hit) return null;

  const node = ctx.elements[hit.id];
  if (!node) return null;

  const rect = hit.el.getBoundingClientRect();
  const nearEdge =
    y - rect.top < EDGE || rect.bottom - y < EDGE || x - rect.left < EDGE || rect.right - x < EDGE;

  // Drop *into* the hovered element when it's a container with room.
  if (def(node.type).container && canContain(node.type, ctx.type)) {
    const isEmpty = domChildren(ctx, hit.id).length === 0;
    if (isEmpty || !nearEdge) {
      const t = insideTarget(ctx, hit.id, x, y);
      if (t) return t;
    }
  }

  // Otherwise place next to it inside an ancestor that will take it.
  const parentId = acceptableAncestor(ctx, node.parent ?? '');
  if (parentId) {
    const t = insideTarget(ctx, parentId, x, y);
    if (t) return t;
  }

  const fallback = acceptableAncestor(ctx, hit.id);
  return fallback ? insideTarget(ctx, fallback, x, y) : null;
}
