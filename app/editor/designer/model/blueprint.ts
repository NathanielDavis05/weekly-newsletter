import { nanoid } from 'nanoid';
import type {
  Breakpoint,
  ElementNode,
  ElementType,
  Interaction,
  LinkTarget,
  StyleLayer,
  StyleSet,
} from './types';

export const newId = (prefix = 'e') => `${prefix}_${nanoid(8)}`;

/**
 * Deep clone for document nodes.
 *
 * Uses a JSON round-trip rather than `structuredClone` on purpose: these
 * helpers are called both on plain state and on Immer drafts, and
 * `structuredClone` throws on a Proxy. The document is JSON-serializable by
 * definition — that is what persistence relies on — so this is lossless.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const emptyStyleSet = (): StyleSet => ({ base: {}, tablet: {}, mobile: {} });

export const styleSet = (
  base: StyleLayer = {},
  tablet: StyleLayer = {},
  mobile: StyleLayer = {},
): StyleSet => ({ base: { ...base }, tablet: { ...tablet }, mobile: { ...mobile } });

/**
 * A declarative description of a subtree. Used for element defaults,
 * prebuilt sections and templates. `instantiate` turns it into real,
 * id-bearing nodes.
 */
export interface Blueprint {
  type: ElementType;
  name?: string;
  content?: string;
  styles?: Partial<StyleSet>;
  settings?: Record<string, unknown>;
  textStyle?: string;
  link?: LinkTarget;
  hidden?: Partial<Record<Breakpoint, boolean>>;
  interactions?: Interaction[];
  componentId?: string;
  /** Stable page anchor for elements linked with an in-page section link. */
  customId?: string;
  children?: Blueprint[];
}

export interface Instantiated {
  /** All created nodes keyed by id. */
  nodes: Record<string, ElementNode>;
  rootId: string;
}

export function createNode(bp: Blueprint, parent: string | null): ElementNode {
  return {
    id: newId(),
    type: bp.type,
    name: bp.name,
    parent,
    children: [],
    content: bp.content,
    styles: {
      base: { ...(bp.styles?.base ?? {}) },
      tablet: { ...(bp.styles?.tablet ?? {}) },
      mobile: { ...(bp.styles?.mobile ?? {}) },
    },
    settings: { ...(bp.settings ?? {}) },
    textStyle: bp.textStyle,
    link: bp.link,
    hidden: bp.hidden ? { ...bp.hidden } : undefined,
    interactions: bp.interactions ? bp.interactions.map((i) => ({ ...i, id: newId('ix') })) : undefined,
    componentId: bp.componentId,
    customId: bp.customId,
  };
}

/** Materialize a blueprint tree into normalized nodes. */
export function instantiate(bp: Blueprint, parent: string | null = null): Instantiated {
  const nodes: Record<string, ElementNode> = {};

  const walk = (b: Blueprint, parentId: string | null): string => {
    const node = createNode(b, parentId);
    nodes[node.id] = node;
    for (const child of b.children ?? []) {
      node.children.push(walk(child, node.id));
    }
    return node.id;
  };

  const rootId = walk(bp, parent);
  return { nodes, rootId };
}

/**
 * Deep-copy an existing subtree, assigning fresh ids throughout.
 * Used by duplicate, copy/paste, component detach and saved sections.
 */
export function cloneSubtree(
  elements: Record<string, ElementNode>,
  rootId: string,
  parent: string | null = null,
): Instantiated {
  const nodes: Record<string, ElementNode> = {};

  const walk = (id: string, parentId: string | null): string => {
    const src = elements[id];
    if (!src) throw new Error(`cloneSubtree: missing element ${id}`);
    const copy: ElementNode = {
      ...deepClone({ ...src, children: [] }),
      id: newId(),
      parent: parentId,
      children: [],
    };
    nodes[copy.id] = copy;
    for (const childId of src.children) {
      copy.children.push(walk(childId, copy.id));
    }
    return copy.id;
  };

  const newRootId = walk(rootId, parent);
  return { nodes, rootId: newRootId };
}

/** Ids of a subtree including its root, in depth-first order. */
export function subtreeIds(elements: Record<string, ElementNode>, rootId: string): string[] {
  const out: string[] = [];
  const walk = (id: string) => {
    const node = elements[id];
    if (!node) return;
    out.push(id);
    node.children.forEach(walk);
  };
  walk(rootId);
  return out;
}

/** Walk up the parent chain (excluding `id` itself). */
export function ancestorsOf(elements: Record<string, ElementNode>, id: string): string[] {
  const out: string[] = [];
  let cur = elements[id]?.parent ?? null;
  while (cur) {
    out.push(cur);
    cur = elements[cur]?.parent ?? null;
  }
  return out;
}

export function isDescendantOf(
  elements: Record<string, ElementNode>,
  id: string,
  maybeAncestor: string,
): boolean {
  let cur = elements[id]?.parent ?? null;
  while (cur) {
    if (cur === maybeAncestor) return true;
    cur = elements[cur]?.parent ?? null;
  }
  return false;
}
