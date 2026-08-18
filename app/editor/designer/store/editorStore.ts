import { create } from 'zustand';
import type { Breakpoint, ElementNode } from '../model/types';
import { BREAKPOINT_CANVAS_WIDTH } from '../model/types';
import { setHistoryContextProvider } from './docStore';

export type LeftTab = 'add' | 'pages' | 'sections' | 'layers' | 'components' | 'assets' | 'styles';
export type InspectorTab = 'design' | 'settings' | 'interactions' | 'advanced';
export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

export interface ContextMenuState {
  x: number;
  y: number;
  targetId: string | null;
}

/** Where a dragged element will land. Owned by the DnD controller. */
export interface DropTarget {
  parentId: string;
  index: number;
  /** Rect of the indicator line/box in canvas-viewport coordinates. */
  rect: { x: number; y: number; w: number; h: number };
  mode: 'before' | 'after' | 'inside' | 'empty';
  axis: 'x' | 'y';
}

export interface DragState {
  kind: 'new' | 'move';
  /** For 'new': element type or preset id being created. */
  payload?: { source: 'element'; elementType: string } | { source: 'section'; presetId: string } | { source: 'component'; componentId: string } | { source: 'savedSection'; sectionId: string };
  /** For 'move': ids being moved. */
  ids?: string[];
  label: string;
  pointer: { x: number; y: number };
  target: DropTarget | null;
  /** Set once the pointer has moved far enough to count as a drag. */
  active: boolean;
}

export interface ResizeState {
  id: string;
  handle: string;
}

interface EditorState {
  activePageId: string | null;
  selection: string[];
  hoveredId: string | null;
  viewport: Breakpoint;
  canvasWidth: number;
  /** Canvas fills the available space instead of using a fixed width. */
  canvasFit: boolean;
  zoom: number;

  leftTab: LeftTab | null;
  inspectorTab: InspectorTab;
  rightPanelOpen: boolean;

  preview: boolean;
  editingTextId: string | null;
  collapsed: Record<string, boolean>;

  clipboard: { nodes: Record<string, ElementNode>; rootIds: string[] } | null;

  drag: DragState | null;
  resize: ResizeState | null;

  saveStatus: SaveStatus;
  lastSavedAt: number | null;

  toasts: Toast[];
  contextMenu: ContextMenuState | null;
  /** Modal dialog key, e.g. 'export' | 'publish' | 'history' | 'shortcuts'. */
  modal: string | null;
  /** Ids briefly highlighted after an operation (e.g. paste). */
  flash: string[];

  /* actions */
  setActivePage: (id: string) => void;
  select: (id: string | null, opts?: { additive?: boolean; range?: boolean }) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  setHovered: (id: string | null) => void;
  setViewport: (bp: Breakpoint) => void;
  setCanvasWidth: (w: number, opts?: { fit?: boolean }) => void;
  setCanvasFit: (fit: boolean) => void;
  setZoom: (z: number) => void;
  setLeftTab: (t: LeftTab | null) => void;
  setInspectorTab: (t: InspectorTab) => void;
  toggleRightPanel: () => void;
  setPreview: (p: boolean) => void;
  setEditingText: (id: string | null) => void;
  toggleCollapsed: (id: string) => void;
  setCollapsed: (id: string, v: boolean) => void;
  setClipboard: (c: EditorState['clipboard']) => void;
  setDrag: (d: DragState | null) => void;
  updateDrag: (patch: Partial<DragState>) => void;
  setResize: (r: ResizeState | null) => void;
  setSaveStatus: (s: SaveStatus, at?: number) => void;
  toast: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void;
  dismissToast: (id: string) => void;
  openContextMenu: (m: ContextMenuState) => void;
  closeContextMenu: () => void;
  setModal: (m: string | null) => void;
  setFlash: (ids: string[]) => void;
}

let toastSeq = 0;

export const useEditor = create<EditorState>((set, get) => ({
  activePageId: null,
  selection: [],
  hoveredId: null,
  viewport: 'base',
  canvasWidth: BREAKPOINT_CANVAS_WIDTH.base,
  canvasFit: true,
  zoom: 1,

  leftTab: 'add',
  inspectorTab: 'design',
  rightPanelOpen: true,

  preview: false,
  editingTextId: null,
  collapsed: {},

  clipboard: null,
  drag: null,
  resize: null,

  saveStatus: 'saved',
  lastSavedAt: null,

  toasts: [],
  contextMenu: null,
  modal: null,
  flash: [],

  setActivePage: (id) => set({ activePageId: id, selection: [], hoveredId: null, editingTextId: null }),

  select: (id, opts = {}) => {
    if (!id) return set({ selection: [], editingTextId: null });
    const { selection } = get();
    if (opts.additive) {
      const next = selection.includes(id) ? selection.filter((s) => s !== id) : [...selection, id];
      return set({ selection: next, editingTextId: null });
    }
    if (selection.length === 1 && selection[0] === id) return;
    set({ selection: [id], editingTextId: null });
  },

  setSelection: (ids) => set({ selection: ids, editingTextId: null }),
  clearSelection: () => set({ selection: [], editingTextId: null }),
  setHovered: (id) => {
    if (get().hoveredId === id) return;
    set({ hoveredId: id });
  },

  setViewport: (bp) =>
    set({ viewport: bp, canvasWidth: BREAKPOINT_CANVAS_WIDTH[bp], canvasFit: bp === 'base' }),

  setCanvasWidth: (w, opts = {}) => set({ canvasWidth: Math.max(280, Math.round(w)), canvasFit: opts.fit ?? false }),
  setCanvasFit: (fit) => set({ canvasFit: fit }),
  setZoom: (z) => set({ zoom: Math.min(2, Math.max(0.25, z)) }),

  setLeftTab: (t) => set({ leftTab: t }),
  setInspectorTab: (t) => set({ inspectorTab: t }),
  toggleRightPanel: () => set({ rightPanelOpen: !get().rightPanelOpen }),

  setPreview: (p) => set({ preview: p, selection: p ? [] : get().selection, editingTextId: null, contextMenu: null }),
  setEditingText: (id) => set({ editingTextId: id }),

  toggleCollapsed: (id) => set({ collapsed: { ...get().collapsed, [id]: !get().collapsed[id] } }),
  setCollapsed: (id, v) => set({ collapsed: { ...get().collapsed, [id]: v } }),

  setClipboard: (c) => set({ clipboard: c }),

  setDrag: (d) => set({ drag: d }),
  updateDrag: (patch) => {
    const cur = get().drag;
    if (!cur) return;
    set({ drag: { ...cur, ...patch } });
  },
  setResize: (r) => set({ resize: r }),

  setSaveStatus: (s, at) => set({ saveStatus: s, lastSavedAt: at ?? get().lastSavedAt }),

  toast: (message, tone = 'info', action) => {
    const id = `t${++toastSeq}`;
    set({ toasts: [...get().toasts, { id, message, tone, action }] });
    setTimeout(() => get().dismissToast(id), action ? 7000 : 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  openContextMenu: (m) => set({ contextMenu: m }),
  closeContextMenu: () => set({ contextMenu: null }),
  setModal: (m) => set({ modal: m }),
  setFlash: (ids) => {
    set({ flash: ids });
    if (ids.length) setTimeout(() => set({ flash: [] }), 900);
  },
}));

// History entries capture the selection so undo can restore it.
setHistoryContextProvider(() => ({
  selection: useEditor.getState().selection,
  pageId: useEditor.getState().activePageId,
}));

export const getEditor = () => useEditor.getState();

/** The element the inspector targets — the last one selected. */
export const primarySelection = (): string | null => {
  const s = useEditor.getState().selection;
  return s.length ? s[s.length - 1] : null;
};
