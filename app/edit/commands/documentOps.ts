// Pure operations on the visual document.
//
// Every function takes a document and returns a new one, touching nothing else.
// Keeping the mutations here (rather than inline in the editor component) means
// they are unit-testable without React, and that the command history only ever
// deals with plain immutable snapshots.
//
// Row model note: a row holds at most two items — that ceiling is enforced by
// the normaliser in content/visual.ts, so the operations below respect it
// rather than producing documents that would be silently trimmed on read.

import type {
  Look,
  ResponsiveLayout,
  VisualBlock,
  VisualDocument,
  VisualPageId,
  VisualRow,
} from "../../content/types";

export type Device = "phone" | "desktop";
export type DropZone = "above" | "below" | "left" | "right";

export const MAX_ITEMS_PER_ROW = 2;

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const clone = <T,>(value: T): T => structuredClone(value);

function newRow(page: VisualPageId, itemIds: string[]): VisualRow {
  return { id: `${page}-row-${uid()}`, itemIds, gap: 16, align: "stretch", keepColumnsOnPhone: false };
}

/** Drops any row left without items. Called after every structural change. */
function pruneRows(rows: VisualRow[]): VisualRow[] {
  return rows.filter((row) => row.itemIds.length > 0);
}

function withPage(
  doc: VisualDocument,
  page: VisualPageId,
  mutate: (target: VisualDocument["pages"][VisualPageId]) => void,
): VisualDocument {
  const next = clone(doc);
  mutate(next.pages[page]);
  next.pages[page].rows = pruneRows(next.pages[page].rows);
  return next;
}

export function findItem(doc: VisualDocument, page: VisualPageId, id: string): VisualBlock | undefined {
  return doc.pages[page].items.find((item) => item.id === id);
}

export function rowOf(doc: VisualDocument, page: VisualPageId, itemId: string): VisualRow | undefined {
  return doc.pages[page].rows.find((row) => row.itemIds.includes(itemId));
}

/** Items in visual order — the order the canvas and layers panel both use. */
export function orderedItemIds(doc: VisualDocument, page: VisualPageId): string[] {
  return doc.pages[page].rows.flatMap((row) => row.itemIds);
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

/** Moves an item next to, or above/below, a target row. */
export function moveItem(
  doc: VisualDocument,
  page: VisualPageId,
  itemId: string,
  targetRowId: string,
  zone: DropZone,
): VisualDocument {
  return withPage(doc, page, (target) => {
    if (!target.rows.some((row) => row.id === targetRowId)) return;

    // Detach first so the item cannot end up in two rows at once.
    for (const row of target.rows) row.itemIds = row.itemIds.filter((id) => id !== itemId);
    target.rows = pruneRows(target.rows);

    const index = target.rows.findIndex((row) => row.id === targetRowId);
    if (index < 0) {
      // The target row held only the dragged item and was just pruned; put the
      // item back as its own row rather than dropping it on the floor.
      target.rows.push(newRow(page, [itemId]));
      return;
    }

    const destination = target.rows[index];
    if ((zone === "left" || zone === "right") && destination.itemIds.length < MAX_ITEMS_PER_ROW) {
      destination.itemIds.splice(zone === "left" ? 0 : destination.itemIds.length, 0, itemId);
      return;
    }
    target.rows.splice(index + (zone === "below" || zone === "right" ? 1 : 0), 0, newRow(page, [itemId]));
  });
}

/** Moves the row containing `itemId` up (-1) or down (+1). */
export function moveRow(doc: VisualDocument, page: VisualPageId, itemId: string, direction: number): VisualDocument {
  return withPage(doc, page, (target) => {
    const index = target.rows.findIndex((row) => row.itemIds.includes(itemId));
    if (index < 0) return;
    const next = index + direction;
    if (next < 0 || next >= target.rows.length) return;
    const [row] = target.rows.splice(index, 1);
    target.rows.splice(next, 0, row);
  });
}

/** Moves a row to an absolute index — used by layer drag-and-drop. */
export function reorderRow(doc: VisualDocument, page: VisualPageId, rowId: string, toIndex: number): VisualDocument {
  return withPage(doc, page, (target) => {
    const from = target.rows.findIndex((row) => row.id === rowId);
    if (from < 0) return;
    const bounded = Math.max(0, Math.min(target.rows.length - 1, toIndex));
    const [row] = target.rows.splice(from, 1);
    target.rows.splice(bounded, 0, row);
  });
}

export function duplicateItem(
  doc: VisualDocument,
  page: VisualPageId,
  id: string,
): { doc: VisualDocument; newId: string | null } {
  let newId: string | null = null;
  const next = withPage(doc, page, (target) => {
    const source = target.items.find((item) => item.id === id);
    const rowIndex = target.rows.findIndex((row) => row.itemIds.includes(id));
    if (!source || rowIndex < 0) return;
    const copy = clone(source);
    copy.id = uid();
    copy.label = `${copy.label} copy`;
    newId = copy.id;
    target.items.push(copy);
    target.rows.splice(rowIndex + 1, 0, newRow(page, [copy.id]));
  });
  return { doc: next, newId };
}

/**
 * Removes a freeform item. Native newsletter sections are hidden instead of
 * deleted — their copy lives in NewsletterContent and must survive.
 */
export function removeItem(doc: VisualDocument, page: VisualPageId, id: string): VisualDocument {
  const item = findItem(doc, page, id);
  if (item?.kind === "native") return setHidden(doc, page, id, true);
  return withPage(doc, page, (target) => {
    target.items = target.items.filter((candidate) => candidate.id !== id);
    for (const row of target.rows) row.itemIds = row.itemIds.filter((itemId) => itemId !== id);
  });
}

export function setHidden(doc: VisualDocument, page: VisualPageId, id: string, hidden: boolean): VisualDocument {
  return withPage(doc, page, (target) => {
    const item = target.items.find((candidate) => candidate.id === id);
    if (item) item.style = { ...(item.style ?? {}), hidden };
  });
}

export function insertItem(doc: VisualDocument, page: VisualPageId, item: VisualBlock, afterId?: string): VisualDocument {
  return withPage(doc, page, (target) => {
    target.items.push(clone(item));
    const index = afterId ? target.rows.findIndex((row) => row.itemIds.includes(afterId)) : -1;
    const row = newRow(page, [item.id]);
    if (index >= 0) target.rows.splice(index + 1, 0, row);
    else target.rows.push(row);
  });
}

// ---------------------------------------------------------------------------
// Design presets (Looks) and reusable blocks
// ---------------------------------------------------------------------------

/**
 * Swaps the whole site's look. The theme is replaced wholesale and the applied
 * Look is remembered so the design panel can show which one is active. Applied
 * through a single history entry, so one click is one undo step.
 */
export function applyLook(doc: VisualDocument, look: Look): VisualDocument {
  const next = clone(doc);
  next.theme = clone(look.theme);
  next.activeLookId = look.id;
  return next;
}

/**
 * A fresh, insertable instance of a saved block. The template's id is a stable
 * library id; every insertion gets a new id so copies stay independent.
 */
export function makeBlockInstance(block: VisualBlock): VisualBlock {
  const copy = clone(block);
  copy.id = uid();
  return copy;
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

/** Places two items side by side in one row — the row model's form of grouping. */
export function groupItems(doc: VisualDocument, page: VisualPageId, ids: string[]): VisualDocument {
  const pair = ids.slice(0, MAX_ITEMS_PER_ROW);
  if (pair.length < 2) return doc;
  return withPage(doc, page, (target) => {
    const anchorIndex = target.rows.findIndex((row) => row.itemIds.includes(pair[0]));
    if (anchorIndex < 0) return;
    for (const row of target.rows) row.itemIds = row.itemIds.filter((id) => !pair.includes(id));
    target.rows = pruneRows(target.rows);
    const insertAt = Math.min(anchorIndex, target.rows.length);
    target.rows.splice(insertAt, 0, newRow(page, pair));
  });
}

/** Splits a paired row so each item gets its own row. */
export function ungroupItems(doc: VisualDocument, page: VisualPageId, ids: string[]): VisualDocument {
  return withPage(doc, page, (target) => {
    for (let index = target.rows.length - 1; index >= 0; index -= 1) {
      const row = target.rows[index];
      if (row.itemIds.length < 2 || !row.itemIds.some((id) => ids.includes(id))) continue;
      const [first, ...rest] = row.itemIds;
      row.itemIds = [first];
      target.rows.splice(index + 1, 0, ...rest.map((id) => newRow(page, [id])));
    }
  });
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/** Applies a responsive layout patch, mirroring to the other device if linked. */
export function patchLayout(
  doc: VisualDocument,
  page: VisualPageId,
  id: string,
  device: Device,
  patch: Partial<ResponsiveLayout>,
): VisualDocument {
  return withPage(doc, page, (target) => {
    const item = target.items.find((candidate) => candidate.id === id);
    if (!item) return;
    const style = item.style ?? {};
    const other: Device = device === "phone" ? "desktop" : "phone";
    item.style = { ...style, [device]: { ...style[device], ...patch } };
    if (style.linkedDevices) item.style[other] = { ...style[other], ...patch };
  });
}

export const NUDGE_LIMIT = 48;

export function nudgeItem(
  doc: VisualDocument,
  page: VisualPageId,
  id: string,
  device: Device,
  dx: number,
  dy: number,
): VisualDocument {
  const layout = findItem(doc, page, id)?.style?.[device];
  const bound = (value: number) => Math.max(-NUDGE_LIMIT, Math.min(NUDGE_LIMIT, value));
  return patchLayout(doc, page, id, device, {
    nudgeX: bound((layout?.nudgeX ?? 0) + dx),
    nudgeY: bound((layout?.nudgeY ?? 0) + dy),
  });
}

export type AlignMode = "left" | "center" | "right" | "stretch";

/** Sets the same alignment on every selected item. */
export function alignItems(
  doc: VisualDocument,
  page: VisualPageId,
  ids: string[],
  align: AlignMode,
  device: Device,
): VisualDocument {
  return ids.reduce((next, id) => patchLayout(next, page, id, device, { align }), doc);
}

export type SizeDimension = "width" | "height" | "both";

/**
 * Matches every selected item to the first one's size. Width is a percentage of
 * the row and height is a pixel minimum, mirroring how the layout model stores
 * them.
 */
export function matchSize(
  doc: VisualDocument,
  page: VisualPageId,
  ids: string[],
  dimension: SizeDimension,
  device: Device,
): VisualDocument {
  if (ids.length < 2) return doc;
  const reference = findItem(doc, page, ids[0])?.style?.[device];
  if (!reference) return doc;
  const patch: Partial<ResponsiveLayout> = {};
  if (dimension === "width" || dimension === "both") patch.width = reference.width;
  if (dimension === "height" || dimension === "both") patch.minHeight = reference.minHeight;
  if (patch.width === undefined && patch.minHeight === undefined) return doc;
  return ids.slice(1).reduce((next, id) => patchLayout(next, page, id, device, patch), doc);
}

/** Gives every selected item an equal share of the width. */
export function distributeWidths(
  doc: VisualDocument,
  page: VisualPageId,
  ids: string[],
  device: Device,
): VisualDocument {
  if (ids.length < 2) return doc;
  const width = Math.round(100 / ids.length);
  return ids.reduce((next, id) => patchLayout(next, page, id, device, { width }), doc);
}
