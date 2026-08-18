import { applyPatches, enablePatches, produceWithPatches } from 'immer';
import type { Patch } from 'immer';
import { create } from 'zustand';
import type { SiteDoc } from '../model/types';
import { createSite } from '../model/defaults';

enablePatches();

const HISTORY_LIMIT = 250;

export interface HistoryEntry {
  label: string;
  patches: Patch[];
  inverse: Patch[];
  at: number;
  /** Coalescing key — consecutive edits sharing one merge into a single undo step. */
  mergeKey?: string;
  /** Selection at the time the edit was made, restored on undo. */
  selection: string[];
  pageId: string | null;
}

export interface MutateOptions {
  /**
   * Edits with the same mergeKey made in quick succession collapse into one
   * history entry — dragging a slider is one undo, not two hundred.
   */
  mergeKey?: string;
  /** Do not record this change in history (e.g. transient drag preview). */
  silent?: boolean;
}

interface DocState {
  doc: SiteDoc;
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Increments whenever the doc changes in a way that needs persisting. */
  dirty: number;

  mutate: (label: string, recipe: (draft: SiteDoc) => void, opts?: MutateOptions) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  replaceDoc: (doc: SiteDoc, opts?: { resetHistory?: boolean; label?: string }) => void;
  clearHistory: () => void;
}

const MERGE_WINDOW_MS = 700;

/** Selection/page context is injected by the editor store to avoid a cycle. */
let contextProvider: () => { selection: string[]; pageId: string | null } = () => ({
  selection: [],
  pageId: null,
});

export function setHistoryContextProvider(fn: typeof contextProvider) {
  contextProvider = fn;
}

export const useDoc = create<DocState>((set, get) => ({
  // The live editor always opens with the CFA West Bryan issue structure on a
  // first visit. Once a browser has a saved document, persistence restores it
  // in App before the editor is displayed.
  doc: createSite({ kind: 'newsletter' }),
  past: [],
  future: [],
  dirty: 0,

  mutate: (label, recipe, opts = {}) => {
    const state = get();
    const [next, patches, inverse] = produceWithPatches(state.doc, (draft) => {
      recipe(draft);
      draft.rev++;
    });

    // `rev` always changes, so check for real work: a bare rev bump means the
    // recipe was a no-op and should not create an undo step.
    const meaningful = patches.some((p) => !(p.path.length === 1 && p.path[0] === 'rev'));
    if (!meaningful) return;

    if (opts.silent) {
      set({ doc: next, dirty: state.dirty + 1 });
      return;
    }

    const ctx = contextProvider();
    const now = Date.now();
    const last = state.past[state.past.length - 1];
    const canMerge =
      !!opts.mergeKey &&
      !!last &&
      last.mergeKey === opts.mergeKey &&
      now - last.at < MERGE_WINDOW_MS;

    let past: HistoryEntry[];
    if (canMerge) {
      const merged: HistoryEntry = {
        ...last,
        at: now,
        patches: [...last.patches, ...patches],
        // Undo runs newest-first, so the newer inverse leads.
        inverse: [...inverse, ...last.inverse],
      };
      past = [...state.past.slice(0, -1), merged];
    } else {
      const entry: HistoryEntry = {
        label,
        patches: [...patches],
        inverse: [...inverse],
        at: now,
        mergeKey: opts.mergeKey,
        selection: ctx.selection,
        pageId: ctx.pageId,
      };
      past = [...state.past, entry];
      if (past.length > HISTORY_LIMIT) past = past.slice(past.length - HISTORY_LIMIT);
    }

    set({ doc: next, past, future: [], dirty: state.dirty + 1 });
  },

  undo: () => {
    const { doc, past, future, dirty } = get();
    const entry = past[past.length - 1];
    if (!entry) return null;
    const next = applyPatches(doc, entry.inverse);
    set({ doc: next, past: past.slice(0, -1), future: [entry, ...future], dirty: dirty + 1 });
    return entry;
  },

  redo: () => {
    const { doc, past, future, dirty } = get();
    const entry = future[0];
    if (!entry) return null;
    const next = applyPatches(doc, entry.patches);
    set({ doc: next, past: [...past, entry], future: future.slice(1), dirty: dirty + 1 });
    return entry;
  },

  replaceDoc: (doc, opts = {}) => {
    if (opts.resetHistory === false) {
      get().mutate(opts.label ?? 'Replace site', (draft) => {
        Object.assign(draft, doc);
      });
      return;
    }
    set({ doc, past: [], future: [], dirty: get().dirty + 1 });
  },

  clearHistory: () => set({ past: [], future: [] }),
}));

/** Non-reactive read, for event handlers and imperative code. */
export const getDoc = () => useDoc.getState().doc;
export const mutate = (label: string, recipe: (d: SiteDoc) => void, opts?: MutateOptions) =>
  useDoc.getState().mutate(label, recipe, opts);
