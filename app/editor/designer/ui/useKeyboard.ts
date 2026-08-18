import { useEffect } from 'react';
import {
  copyElements,
  cutElements,
  deleteElements,
  duplicateElements,
  groupElements,
  pasteClipboard,
  reorderWithinParent,
  setHidden,
  setLocked,
  setStyle,
  ungroupElement,
} from '../store/actions/elements';
import { parseValue, formatValue } from '../engine/styles';
import { saveNow } from '../io/persistence';
import { useDoc } from '../store/docStore';
import { useEditor } from '../store/editorStore';

/**
 * True when the user is typing somewhere that owns the keystroke.
 *
 * The target is not always an element — key events can be dispatched at the
 * window or document — so this must never assume DOM methods exist.
 */
function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    // Nothing focused: fall back to whatever actually has focus.
    const active = document.activeElement;
    return active instanceof Element && active !== document.body ? isTyping(active) : false;
  }
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    (target as HTMLElement).isContentEditable ||
    !!target.closest('[contenteditable="true"]')
  );
}

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ed = useEditor.getState();
      const mod = e.metaKey || e.ctrlKey;

      // Never hijack typing.
      if (isTyping(e.target)) {
        if (e.key === 'Escape' && ed.editingTextId) ed.setEditingText(null);
        return;
      }

      const selection = ed.selection;

      /* ---- history ---- */
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const doc = useDoc.getState();
        const entry = e.shiftKey ? doc.redo() : doc.undo();
        if (entry) {
          if (entry.pageId && entry.pageId !== ed.activePageId) ed.setActivePage(entry.pageId);
          if (!e.shiftKey) {
            const live = useDoc.getState().doc.elements;
            ed.setSelection(entry.selection.filter((id) => live[id]));
          }
        }
        return;
      }

      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveNow();
        useEditor.getState().toast('Saved', 'success');
        return;
      }

      /* ---- clipboard ---- */
      if (mod && e.key.toLowerCase() === 'c' && selection.length) {
        e.preventDefault();
        copyElements(selection);
        return;
      }
      if (mod && e.key.toLowerCase() === 'x' && selection.length) {
        e.preventDefault();
        cutElements(selection);
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd' && selection.length) {
        e.preventDefault();
        duplicateElements(selection);
        return;
      }

      /* ---- structure ---- */
      if (mod && e.key.toLowerCase() === 'g' && selection.length) {
        e.preventDefault();
        if (e.shiftKey) selection.forEach((id) => ungroupElement(id));
        else groupElements(selection);
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const doc = useDoc.getState().doc;
        const page = ed.activePageId ? doc.pages[ed.activePageId] : null;
        if (page) ed.setSelection([...doc.elements[page.rootId].children]);
        return;
      }
      if (mod && e.key.toLowerCase() === 'l' && selection.length) {
        e.preventDefault();
        const doc = useDoc.getState().doc;
        setLocked(selection, !doc.elements[selection[0]]?.locked);
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'h' && selection.length) {
        e.preventDefault();
        const doc = useDoc.getState().doc;
        const cur = doc.elements[selection[0]]?.hidden?.[ed.viewport];
        setHidden(selection, ed.viewport, cur ? undefined : true);
        return;
      }

      /* ---- z-order ---- */
      if (mod && e.key === ']' && selection.length === 1) {
        e.preventDefault();
        reorderWithinParent(selection[0], e.shiftKey ? 'front' : 'forward');
        return;
      }
      if (mod && e.key === '[' && selection.length === 1) {
        e.preventDefault();
        reorderWithinParent(selection[0], e.shiftKey ? 'back' : 'backward');
        return;
      }

      /* ---- delete ---- */
      if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
        e.preventDefault();
        deleteElements(selection);
        return;
      }

      /* ---- selection navigation ---- */
      if (e.key === 'Escape') {
        e.preventDefault();
        if (ed.editingTextId) return ed.setEditingText(null);
        if (ed.contextMenu) return ed.closeContextMenu();
        if (ed.modal) return ed.setModal(null);
        // Step out to the parent — the fast way to grab a container.
        const doc = useDoc.getState().doc;
        const id = selection[selection.length - 1];
        const parent = id ? doc.elements[id]?.parent : null;
        const page = ed.activePageId ? doc.pages[ed.activePageId] : null;
        if (parent && parent !== page?.rootId) ed.select(parent);
        else ed.clearSelection();
        return;
      }

      if (e.key === 'Enter' && selection.length === 1) {
        const doc = useDoc.getState().doc;
        const node = doc.elements[selection[0]];
        if (node?.content !== undefined) {
          e.preventDefault();
          ed.setEditingText(selection[0]);
        }
        return;
      }

      /* ---- arrow nudging ---- */
      if (e.key.startsWith('Arrow') && selection.length) {
        const doc = useDoc.getState().doc;
        const node = doc.elements[selection[0]];
        if (!node) return;
        const positioned = ['absolute', 'relative', 'fixed', 'sticky'].includes(
          node.styles[ed.viewport].position ?? node.styles.base.position ?? '',
        );
        if (!positioned) return;

        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const axis = e.key === 'ArrowLeft' || e.key === 'ArrowRight' ? 'left' : 'top';
        const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;
        for (const id of selection) {
          const n = doc.elements[id];
          if (!n) continue;
          const cur = parseValue(n.styles[ed.viewport][axis] ?? n.styles.base[axis] ?? '0px', 'px');
          setStyle([id], axis, formatValue((cur.num ?? 0) + dir * step, cur.unit || 'px'), ed.viewport, {
            mergeKey: `nudge:${axis}`,
            label: 'Move',
          });
        }
        return;
      }

      /* ---- view ---- */
      if (e.key.toLowerCase() === 'p' && !mod) {
        e.preventDefault();
        ed.setPreview(!ed.preview);
        return;
      }
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        ed.setModal('shortcuts');
        return;
      }
      if (e.key === '1' && !mod) ed.setViewport('base');
      if (e.key === '2' && !mod) ed.setViewport('tablet');
      if (e.key === '3' && !mod) ed.setViewport('mobile');
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
