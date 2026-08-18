import { computeDropTarget, type HitContext } from './dropTarget';
import { def } from '../model/registry';
import { SECTION_PRESETS } from '../model/sections';
import { subtreeIds } from '../model/blueprint';
import type { ElementType } from '../model/types';
import { insertBlueprint, moveElements } from '../store/actions/elements';
import { insertComponentInstance, insertSavedSection } from '../store/actions/components';
import { getDoc } from '../store/docStore';
import { getEditor, useEditor, type DragState } from '../store/editorStore';

/** Canvas root element, registered by the Canvas so DnD can hit-test it. */
let canvasRoot: HTMLElement | null = null;
export const setCanvasRoot = (el: HTMLElement | null) => {
  canvasRoot = el;
};
export const getCanvasRoot = () => canvasRoot;

const DRAG_THRESHOLD = 4;

/** What element type will this payload produce? Drives drop validation. */
function payloadType(drag: DragState): ElementType {
  if (drag.kind === 'move') {
    const doc = getDoc();
    const first = drag.ids?.[0];
    return (first && doc.elements[first]?.type) || 'container';
  }
  const p = drag.payload;
  if (!p) return 'container';
  if (p.source === 'element') return p.elementType as ElementType;
  if (p.source === 'component') return 'instance';
  if (p.source === 'savedSection') {
    const doc = getDoc();
    const saved = doc.savedSections.find((s) => s.id === p.sectionId);
    return saved ? saved.elements[saved.rootId].type : 'section';
  }
  return 'section';
}

/**
 * One pointer session for both kinds of drag: creating a new element from a
 * panel, and moving existing elements on the canvas.
 *
 * Listeners are attached synchronously when the drag starts rather than from
 * a React effect. A pointerdown/pointerup pair can arrive before React has a
 * chance to re-render, and a missed pointerup would leave a drag stuck in
 * flight — which then hijacks the next click.
 */
function beginDrag(startX: number, startY: number, initial: DragState) {
  const editor = useEditor.getState();
  editor.setDrag(initial);
  document.body.classList.add('is-dragging-global');

  let active = false;

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    window.removeEventListener('keydown', onKey, true);
    document.body.classList.remove('is-dragging-global');
  };

  function onMove(e: PointerEvent) {
    const cur = useEditor.getState().drag;
    if (!cur) return cleanup();

    if (!active && Math.hypot(e.clientX - startX, e.clientY - startY) <= DRAG_THRESHOLD) return;
    active = true;

    let target = null;
    if (canvasRoot) {
      const doc = getDoc();
      const excluded = new Set<string>();
      if (cur.kind === 'move') {
        for (const id of cur.ids ?? []) {
          for (const sid of subtreeIds(doc.elements, id)) excluded.add(sid);
        }
      }
      const ctx: HitContext = {
        elements: doc.elements,
        excluded,
        type: payloadType(cur),
        root: canvasRoot,
      };
      target = computeDropTarget(ctx, e.clientX, e.clientY);
    }

    useEditor.getState().setDrag({ ...cur, active: true, pointer: { x: e.clientX, y: e.clientY }, target });
    useEditor.getState().setHovered(null);
  }

  function onUp() {
    const cur = useEditor.getState().drag;
    cleanup();
    useEditor.getState().setDrag(null);

    // A press that never moved is just a click — leave the selection alone.
    if (!cur || !active) return;

    const target = cur.target;
    if (!target) return;
    const insertAt = { parentId: target.parentId, index: target.index };

    if (cur.kind === 'move') {
      moveElements(cur.ids ?? [], insertAt.parentId, insertAt.index);
      return;
    }

    const p = cur.payload;
    if (!p) return;
    const doc = getDoc();
    if (p.source === 'element') {
      const pages = doc.pageOrder.map((id) => ({ id, name: doc.pages[id].name }));
      insertBlueprint(def(p.elementType as ElementType).create({ pages }), insertAt);
    } else if (p.source === 'section') {
      const preset = SECTION_PRESETS.find((s) => s.id === p.presetId);
      if (preset) insertBlueprint(preset.create(), insertAt, { label: `Add ${preset.name} section` });
    } else if (p.source === 'component') {
      insertComponentInstance(p.componentId, insertAt);
    } else if (p.source === 'savedSection') {
      insertSavedSection(p.sectionId, insertAt);
    }
  }

  function onCancel() {
    cleanup();
    useEditor.getState().setDrag(null);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
  window.addEventListener('keydown', onKey, true);
}

/** Begin dragging a brand-new element out of a panel. */
export function startCreateDrag(
  e: React.PointerEvent,
  payload: NonNullable<DragState['payload']>,
  label: string,
) {
  e.preventDefault();
  beginDrag(e.clientX, e.clientY, {
    kind: 'new',
    payload,
    label,
    pointer: { x: e.clientX, y: e.clientY },
    target: null,
    active: false,
  });
}

/** Begin moving elements that already exist on the canvas. */
export function startMoveDrag(e: React.PointerEvent, ids: string[], label: string) {
  beginDrag(e.clientX, e.clientY, {
    kind: 'move',
    ids,
    label,
    pointer: { x: e.clientX, y: e.clientY },
    target: null,
    active: false,
  });
}

/**
 * Safety net: if a pointer session is somehow lost (window blur, a devtools
 * pause, an unexpected event order), clear any drag left in flight so it can
 * never capture the next click.
 */
export function useDragController() {
  if (typeof window !== 'undefined' && !window.__dwDragGuard) {
    window.__dwDragGuard = true;
    window.addEventListener('blur', () => {
      if (getEditor().drag) {
        getEditor().setDrag(null);
        document.body.classList.remove('is-dragging-global');
      }
    });
  }
}

declare global {
  interface Window {
    __dwDragGuard?: boolean;
  }
}
