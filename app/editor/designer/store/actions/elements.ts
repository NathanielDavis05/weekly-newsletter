import type { Blueprint } from '../../model/blueprint';
import { cloneSubtree, deepClone, instantiate, subtreeIds } from '../../model/blueprint';
import { canContain, def } from '../../model/registry';
import type { Breakpoint, ElementNode, ElementType, LinkTarget, SiteDoc } from '../../model/types';
import { getDoc, mutate } from '../docStore';
import { getEditor, useEditor } from '../editorStore';

/* ------------------------------------------------------------------ */
/* Structural helpers (operate on an immer draft)                      */
/* ------------------------------------------------------------------ */

export function detach(draft: SiteDoc, id: string) {
  const node = draft.elements[id];
  if (!node?.parent) return;
  const parent = draft.elements[node.parent];
  if (!parent) return;
  const i = parent.children.indexOf(id);
  if (i >= 0) parent.children.splice(i, 1);
  node.parent = null;
}

export function attach(draft: SiteDoc, id: string, parentId: string, index: number) {
  const parent = draft.elements[parentId];
  const node = draft.elements[id];
  if (!parent || !node) return;
  const clamped = Math.max(0, Math.min(index, parent.children.length));
  parent.children.splice(clamped, 0, id);
  node.parent = parentId;
}

/** Remove a subtree from the document entirely. */
export function removeSubtree(draft: SiteDoc, id: string) {
  const ids = subtreeIds(draft.elements, id);
  detach(draft, id);
  for (const eid of ids) delete draft.elements[eid];
}

/**
 * Walk up from `parentId` until a parent that accepts `type` is found.
 * Keeps drops forgiving without letting invalid structures through.
 */
export function resolveParent(
  elements: Record<string, ElementNode>,
  parentId: string,
  type: ElementType,
): { parentId: string; index: number } | null {
  let cur: string | null = parentId;
  let childOfCur: string | null = null;
  while (cur) {
    const node: ElementNode | undefined = elements[cur];
    if (!node) return null;
    if (canContain(node.type, type)) {
      const index = childOfCur ? node.children.indexOf(childOfCur) + 1 : node.children.length;
      return { parentId: cur, index };
    }
    childOfCur = cur;
    cur = node.parent;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Insertion                                                           */
/* ------------------------------------------------------------------ */

export interface InsertTarget {
  parentId: string;
  index: number;
}

/** Where a new element should go given the current selection. */
export function defaultInsertTarget(type: ElementType): InsertTarget | null {
  const doc = getDoc();
  const ed = getEditor();
  const page = ed.activePageId ? doc.pages[ed.activePageId] : null;
  if (!page) return null;

  const selId = ed.selection[ed.selection.length - 1];
  if (selId && doc.elements[selId]) {
    const sel = doc.elements[selId];
    // Dropping into the selected container feels right; otherwise land next to it.
    if (canContain(sel.type, type)) {
      return { parentId: selId, index: sel.children.length };
    }
    if (sel.parent) {
      const resolved = resolveParent(doc.elements, sel.parent, type);
      if (resolved) {
        const parent = doc.elements[resolved.parentId];
        const idx = parent.children.indexOf(selId);
        return { parentId: resolved.parentId, index: idx >= 0 ? idx + 1 : parent.children.length };
      }
    }
  }

  const resolved = resolveParent(doc.elements, page.rootId, type);
  return resolved ?? { parentId: page.rootId, index: doc.elements[page.rootId].children.length };
}

export function insertBlueprint(
  bp: Blueprint,
  target?: InsertTarget | null,
  opts: { label?: string; select?: boolean } = {},
): string | null {
  const t = target ?? defaultInsertTarget(bp.type);
  if (!t) return null;

  const { nodes, rootId } = instantiate(bp, t.parentId);
  mutate(opts.label ?? `Add ${def(bp.type).label}`, (draft) => {
    if (!draft.elements[t.parentId]) return;
    Object.assign(draft.elements, nodes);
    attach(draft, rootId, t.parentId, t.index);
  });

  if (opts.select !== false) {
    useEditor.getState().setSelection([rootId]);
    useEditor.getState().setFlash([rootId]);
  }
  return rootId;
}

export function addElement(type: ElementType, target?: InsertTarget | null): string | null {
  const doc = getDoc();
  const pages = doc.pageOrder.map((id) => ({ id, name: doc.pages[id].name }));
  return insertBlueprint(def(type).create({ pages }), target);
}

/* ------------------------------------------------------------------ */
/* Delete / duplicate / move                                           */
/* ------------------------------------------------------------------ */

/** Drop ids that are descendants of other ids in the set. */
export function topLevelOnly(elements: Record<string, ElementNode>, ids: string[]): string[] {
  const set = new Set(ids);
  return ids.filter((id) => {
    let p = elements[id]?.parent ?? null;
    while (p) {
      if (set.has(p)) return false;
      p = elements[p]?.parent ?? null;
    }
    return true;
  });
}

export function deleteElements(ids: string[]) {
  const doc = getDoc();
  const roots = topLevelOnly(doc.elements, ids).filter((id) => {
    const n = doc.elements[id];
    return n && n.type !== 'page' && !n.locked;
  });
  if (!roots.length) return;

  // Select the nearest surviving sibling so focus doesn't vanish.
  const first = doc.elements[roots[0]];
  const parent = first?.parent ? doc.elements[first.parent] : null;
  let nextSel: string | null = null;
  if (parent) {
    const remaining = parent.children.filter((c) => !roots.includes(c));
    const idx = parent.children.indexOf(roots[0]);
    nextSel = remaining[Math.min(idx, remaining.length - 1)] ?? parent.id;
  }

  mutate(roots.length > 1 ? `Delete ${roots.length} elements` : `Delete ${def(first.type).label}`, (draft) => {
    for (const id of roots) removeSubtree(draft, id);
  });
  useEditor.getState().setSelection(nextSel && nextSel !== doc.pages[useEditor.getState().activePageId ?? '']?.rootId ? [nextSel] : []);
}

export function duplicateElements(ids: string[]): string[] {
  const doc = getDoc();
  const roots = topLevelOnly(doc.elements, ids).filter((id) => doc.elements[id]?.parent);
  if (!roots.length) return [];

  // Build the copies from plain state first: cloning inside the draft would
  // mean cloning Immer proxies.
  const copies = roots.map((id) => ({ id, ...cloneSubtree(doc.elements, id, doc.elements[id].parent) }));
  const created: string[] = [];

  mutate(roots.length > 1 ? `Duplicate ${roots.length} elements` : 'Duplicate', (draft) => {
    for (const { id, nodes, rootId } of copies) {
      const node = draft.elements[id];
      if (!node?.parent) continue;
      const parent = draft.elements[node.parent];
      Object.assign(draft.elements, nodes);
      attach(draft, rootId, parent.id, parent.children.indexOf(id) + 1);
      created.push(rootId);
    }
  });
  if (created.length) {
    useEditor.getState().setSelection(created);
    useEditor.getState().setFlash(created);
  }
  return created;
}

/** Move existing elements to a new parent/index. Guards against cycles. */
export function moveElements(ids: string[], parentId: string, index: number) {
  const doc = getDoc();
  const roots = topLevelOnly(doc.elements, ids).filter((id) => !doc.elements[id]?.locked);
  if (!roots.length) return;

  // Never move something into itself or its own subtree.
  for (const id of roots) {
    let cur: string | null = parentId;
    while (cur) {
      if (cur === id) return;
      cur = doc.elements[cur]?.parent ?? null;
    }
  }

  const parent = doc.elements[parentId];
  if (!parent) return;
  for (const id of roots) {
    if (!canContain(parent.type, doc.elements[id].type)) return;
  }

  mutate('Move', (draft) => {
    let target = index;
    for (const id of roots) {
      const node = draft.elements[id];
      if (!node) continue;
      const oldParent = node.parent ? draft.elements[node.parent] : null;
      if (oldParent?.id === parentId) {
        const oldIndex = oldParent.children.indexOf(id);
        if (oldIndex >= 0 && oldIndex < target) target--;
      }
      detach(draft, id);
      attach(draft, id, parentId, target);
      target++;
    }
  });
}

/** Reorder within the current parent — used by bring forward / send back. */
export function reorderWithinParent(id: string, direction: 'forward' | 'backward' | 'front' | 'back') {
  const doc = getDoc();
  const node = doc.elements[id];
  if (!node?.parent) return;
  const parent = doc.elements[node.parent];
  const i = parent.children.indexOf(id);
  if (i < 0) return;

  let target = i;
  if (direction === 'forward') target = Math.min(parent.children.length - 1, i + 1);
  else if (direction === 'backward') target = Math.max(0, i - 1);
  else if (direction === 'front') target = parent.children.length - 1;
  else target = 0;
  if (target === i) return;

  const labels = { forward: 'Bring forward', backward: 'Send backward', front: 'Bring to front', back: 'Send to back' };
  mutate(labels[direction], (draft) => {
    const p = draft.elements[node.parent!];
    p.children.splice(i, 1);
    p.children.splice(target, 0, id);
  });
}

/* ------------------------------------------------------------------ */
/* Clipboard                                                           */
/* ------------------------------------------------------------------ */

export function copyElements(ids: string[]) {
  const doc = getDoc();
  const roots = topLevelOnly(doc.elements, ids).filter((id) => doc.elements[id]?.parent);
  if (!roots.length) return;
  const nodes: Record<string, ElementNode> = {};
  for (const id of roots) {
    for (const sid of subtreeIds(doc.elements, id)) {
      nodes[sid] = deepClone(doc.elements[sid]);
    }
  }
  useEditor.getState().setClipboard({ nodes, rootIds: roots });
}

export function cutElements(ids: string[]) {
  copyElements(ids);
  deleteElements(ids);
}

export function pasteClipboard(target?: InsertTarget | null): string[] {
  const clip = getEditor().clipboard;
  if (!clip) return [];
  const doc = getDoc();
  const created: string[] = [];

  const firstType = clip.nodes[clip.rootIds[0]]?.type;
  if (!firstType) return [];
  const t = target ?? defaultInsertTarget(firstType);
  if (!t || !doc.elements[t.parentId]) return [];

  mutate(clip.rootIds.length > 1 ? `Paste ${clip.rootIds.length} elements` : 'Paste', (draft) => {
    let index = t.index;
    for (const rootId of clip.rootIds) {
      const parent = draft.elements[t.parentId];
      if (!parent || !canContain(parent.type, clip.nodes[rootId].type)) continue;
      const { nodes, rootId: newRoot } = cloneSubtree(clip.nodes, rootId, t.parentId);
      Object.assign(draft.elements, nodes);
      attach(draft, newRoot, t.parentId, index);
      created.push(newRoot);
      index++;
    }
  });

  if (created.length) {
    useEditor.getState().setSelection(created);
    useEditor.getState().setFlash(created);
  }
  return created;
}

/* ------------------------------------------------------------------ */
/* Grouping                                                            */
/* ------------------------------------------------------------------ */

export function groupElements(ids: string[]): string | null {
  const doc = getDoc();
  const roots = topLevelOnly(doc.elements, ids).filter((id) => doc.elements[id]?.parent);
  if (roots.length < 1) return null;

  const parentId = doc.elements[roots[0]].parent!;
  if (!roots.every((id) => doc.elements[id].parent === parentId)) return null;
  if (!canContain(doc.elements[parentId].type, 'container')) return null;

  const parent = doc.elements[parentId];
  const ordered = parent.children.filter((c) => roots.includes(c));
  const insertAt = parent.children.indexOf(ordered[0]);

  const { nodes, rootId } = instantiate(
    { type: 'container', name: 'Group', styles: { base: { display: 'flex', flexDirection: 'column', gap: '12px' } } },
    parentId,
  );

  mutate('Group elements', (draft) => {
    Object.assign(draft.elements, nodes);
    attach(draft, rootId, parentId, insertAt);
    let i = 0;
    for (const id of ordered) {
      detach(draft, id);
      attach(draft, id, rootId, i++);
    }
  });

  useEditor.getState().setSelection([rootId]);
  return rootId;
}

export function ungroupElement(id: string) {
  const doc = getDoc();
  const node = doc.elements[id];
  if (!node?.parent || !node.children.length) return;
  const children = [...node.children];

  mutate('Ungroup', (draft) => {
    const n = draft.elements[id];
    const parentId = n.parent!;
    const parent = draft.elements[parentId];
    let at = parent.children.indexOf(id);
    for (const childId of children) {
      detach(draft, childId);
      attach(draft, childId, parentId, at++);
    }
    removeSubtree(draft, id);
  });

  useEditor.getState().setSelection(children);
}

/* ------------------------------------------------------------------ */
/* Property edits                                                      */
/* ------------------------------------------------------------------ */

export interface StyleEditOptions {
  mergeKey?: string;
  label?: string;
}

export function setStyle(
  ids: string[],
  prop: string,
  value: string | undefined,
  bp: Breakpoint,
  opts: StyleEditOptions = {},
) {
  if (!ids.length) return;
  mutate(
    opts.label ?? `Change ${prop.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}`,
    (draft) => {
      for (const id of ids) {
        const node = draft.elements[id];
        if (!node) continue;
        if (value === undefined || value === '') delete node.styles[bp][prop];
        else node.styles[bp][prop] = value;
      }
    },
    { mergeKey: opts.mergeKey },
  );
}

export function setStyles(
  ids: string[],
  patch: Record<string, string | undefined>,
  bp: Breakpoint,
  opts: StyleEditOptions = {},
) {
  if (!ids.length) return;
  mutate(
    opts.label ?? 'Change style',
    (draft) => {
      for (const id of ids) {
        const node = draft.elements[id];
        if (!node) continue;
        for (const [prop, value] of Object.entries(patch)) {
          if (value === undefined || value === '') delete node.styles[bp][prop];
          else node.styles[bp][prop] = value;
        }
      }
    },
    { mergeKey: opts.mergeKey },
  );
}

/** Remove a breakpoint override so the property falls back to what it inherits. */
export function clearStyle(ids: string[], props: string[], bp: Breakpoint) {
  mutate('Reset override', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (!node) continue;
      for (const p of props) delete node.styles[bp][p];
    }
  });
}

/** Remove every override at a breakpoint for these elements. */
export function clearBreakpoint(ids: string[], bp: Breakpoint) {
  if (bp === 'base') return;
  mutate('Reset breakpoint', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (!node) continue;
      node.styles[bp] = {};
      if (node.hidden) delete node.hidden[bp];
    }
  });
}

export function setContent(id: string, content: string) {
  mutate('Edit text', (draft) => {
    const node = draft.elements[id];
    if (node) node.content = content;
  }, { mergeKey: `content:${id}` });
}

export function setSetting(ids: string[], key: string, value: unknown, opts: StyleEditOptions = {}) {
  mutate(opts.label ?? 'Change setting', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (node) node.settings[key] = value;
    }
  }, { mergeKey: opts.mergeKey });
}

export function setHidden(ids: string[], bp: Breakpoint, hidden: boolean | undefined) {
  mutate(hidden ? 'Hide element' : 'Show element', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (!node) continue;
      if (hidden === undefined) {
        if (node.hidden) delete node.hidden[bp];
      } else {
        node.hidden = { ...(node.hidden ?? {}), [bp]: hidden };
      }
    }
  });
}

export function setLocked(ids: string[], locked: boolean) {
  mutate(locked ? 'Lock' : 'Unlock', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (node) node.locked = locked || undefined;
    }
  });
}

export function renameElement(id: string, name: string) {
  mutate('Rename layer', (draft) => {
    const node = draft.elements[id];
    if (node) node.name = name.trim() || undefined;
  });
}

export function setLink(ids: string[], link: LinkTarget) {
  mutate('Change link', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (node) node.link = link;
    }
  });
}

export function setTextStyle(ids: string[], styleId: string | undefined) {
  mutate('Change text style', (draft) => {
    for (const id of ids) {
      const node = draft.elements[id];
      if (node) node.textStyle = styleId;
    }
  });
}

export function setAdvanced(
  id: string,
  patch: Partial<Pick<ElementNode, 'customId' | 'classes' | 'customCss' | 'attributes'>>,
) {
  mutate('Edit advanced', (draft) => {
    const node = draft.elements[id];
    if (node) Object.assign(node, patch);
  }, { mergeKey: `adv:${id}` });
}
