import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildCss } from '../../engine/css';
import { runtimeCss } from '../../engine/runtimeCss';
import { def } from '../../model/registry';
import { BREAKPOINT_MAX } from '../../model/types';
import type { Breakpoint } from '../../model/types';
import { setCanvasRoot } from '../../dnd/useDragController';
import { startMoveDrag } from '../../dnd/useDragController';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { ElementView } from './ElementView';
import { RenderContext } from './RenderContext';
import { DropIndicator, HoverOverlay, SectionOverlay, SelectionOverlay } from './Overlays';
import { invalidateRects, setOverlayRoot } from './useRects';
import { Breadcrumbs } from './Breadcrumbs';

/** Which breakpoint a given canvas width lands in. */
export function breakpointForWidth(w: number): Breakpoint {
  if (w <= (BREAKPOINT_MAX.mobile ?? 599)) return 'mobile';
  if (w <= (BREAKPOINT_MAX.tablet ?? 991)) return 'tablet';
  return 'base';
}

export function Canvas() {
  const doc = useDoc((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const preview = useEditor((s) => s.preview);
  const canvasWidth = useEditor((s) => s.canvasWidth);
  const canvasFit = useEditor((s) => s.canvasFit);
  const viewport = useEditor((s) => s.viewport);
  const editingTextId = useEditor((s) => s.editingTextId);

  const frameRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const page = activePageId ? doc.pages[activePageId] : null;

  /* CSS is rebuilt only when the document changes — never when a panel does. */
  const css = useMemo(() => {
    const site = buildCss(doc, { scope: '.cv-root', mode: 'container' });
    return `${runtimeCss('.cv-root', 'container')}\n\n${site}`;
  }, [doc]);

  useEffect(() => {
    setCanvasRoot(rootRef.current);
    setOverlayRoot(frameRef.current);
    return () => {
      setCanvasRoot(null);
      setOverlayRoot(null);
    };
  }, [page?.id]);

  useEffect(() => {
    invalidateRects();
  }, [canvasWidth, canvasFit, css]);

  /* ---------------- interaction ---------------- */

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (preview) return;
      if (e.button === 2) return; // context menu handles right-click
      const target = e.target as HTMLElement;
      if (target.closest('[data-editing="true"]')) return;

      const host = target.closest<HTMLElement>('[data-el-id]');
      const ed = useEditor.getState();

      if (!host) {
        ed.clearSelection();
        return;
      }
      const id = host.dataset.elId!;
      const node = doc.elements[id];
      if (!node) return;

      if (editingTextId && editingTextId !== id) ed.setEditingText(null);

      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const already = ed.selection.includes(id);

      if (additive) {
        ed.select(id, { additive: true });
        return;
      }
      if (!already) ed.select(id);

      if (!node.locked && !editingTextId) {
        const ids = already && ed.selection.length > 1 ? ed.selection : [id];
        startMoveDrag(e, ids, node.name || def(node.type).label);
      }
    },
    [preview, doc.elements, editingTextId],
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (preview) return;
      const host = (e.target as HTMLElement).closest<HTMLElement>('[data-el-id]');
      if (!host) return;
      const id = host.dataset.elId!;
      const node = doc.elements[id];
      if (!node || node.locked) return;
      if (def(node.type).textual) {
        e.preventDefault();
        useEditor.getState().setEditingText(id);
      }
    },
    [preview, doc.elements],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (preview) return;
      if (useEditor.getState().drag?.active) return;
      const host = (e.target as HTMLElement).closest<HTMLElement>('[data-el-id]');
      useEditor.getState().setHovered(host?.dataset.elId ?? null);
    },
    [preview],
  );

  const onContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (preview) return;
      e.preventDefault();
      const host = (e.target as HTMLElement).closest<HTMLElement>('[data-el-id]');
      const id = host?.dataset.elId ?? null;
      const ed = useEditor.getState();
      if (id && !ed.selection.includes(id)) ed.select(id);
      ed.openContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
    },
    [preview],
  );

  /* ---------------- canvas width dragging ---------------- */

  const startWidthDrag = (e: React.PointerEvent, side: 'left' | 'right') => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = frameRef.current?.getBoundingClientRect().width ?? canvasWidth;
    const grip = e.currentTarget as HTMLElement;
    grip.classList.add('is-dragging');
    document.body.classList.add('is-resizing-global');

    const onMove = (ev: PointerEvent) => {
      const delta = (ev.clientX - startX) * (side === 'right' ? 2 : -2);
      const next = Math.max(280, Math.min(2400, startW + delta));
      const ed = useEditor.getState();
      ed.setCanvasWidth(next);
      // The editing breakpoint follows the canvas, so what you see is what
      // you're editing — no separate mental model to maintain.
      const bp = breakpointForWidth(next);
      if (bp !== ed.viewport) useEditor.setState({ viewport: bp });
      invalidateRects();
    };
    const onUp = () => {
      grip.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing-global');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => invalidateRects();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Stable across document edits on purpose — see RenderContext.
  const ctx = useMemo(
    () => ({
      mode: (preview ? 'preview' : 'edit') as 'preview' | 'edit',
      navigate: (pageId: string) => useEditor.getState().setActivePage(pageId),
      instanceDepth: 0,
    }),
    [preview],
  );

  if (!page) {
    return (
      <div className="stage">
        <div className="canvas-empty">
          <h3>No page selected</h3>
        </div>
      </div>
    );
  }

  const root = doc.elements[page.rootId];
  const isEmpty = !root?.children.length;
  const fillWidth = preview ? viewport === 'base' : canvasFit;

  return (
    <div className="stage">
      {!preview ? <CanvasBar /> : null}

      {/* In preview, desktop fills the window; tablet and mobile stay at their
          device widths so responsive behaviour is what you actually see. */}
      <div ref={scrollRef} className={`stage-scroll ${fillWidth ? 'is-fit' : ''}`}>
        <div className="canvas-shell" style={{ width: fillWidth ? '100%' : canvasWidth }}>
          {!canvasFit && !preview ? (
            <>
              <div className="canvas-grip left" onPointerDown={(e) => startWidthDrag(e, 'left')}>
                <i />
              </div>
              <div className="canvas-grip right" onPointerDown={(e) => startWidthDrag(e, 'right')}>
                <i />
              </div>
            </>
          ) : null}

          <div
            ref={frameRef}
            className="canvas-frame"
            onPointerDown={onPointerDown}
            onDoubleClick={onDoubleClick}
            onPointerMove={onPointerMove}
            onPointerLeave={() => useEditor.getState().setHovered(null)}
            onContextMenu={onContextMenu}
          >
            <style dangerouslySetInnerHTML={{ __html: css }} />

            {/* The page root is rendered as a real element, not just its
                children: drop targeting, selection and background styling all
                need it to exist in the DOM. */}
            <div ref={rootRef} className="cv-root">
              <RenderContext.Provider value={ctx}>
                <ElementView id={page.rootId} />
              </RenderContext.Provider>
              {isEmpty && !preview ? <EmptyPage /> : null}
            </div>

            {!preview ? (
              <div className="overlay-layer">
                <SectionOverlay pageRootId={page.rootId} />
                <HoverOverlay />
                <SelectionOverlay />
                <DropIndicator />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {!preview ? <Breadcrumbs /> : null}
    </div>
  );
}

function EmptyPage() {
  const setLeftTab = useEditor((s) => s.setLeftTab);
  return (
    <div className="canvas-empty">
      <Icon name="frame" size={30} style={{ opacity: 0.35 }} />
      <h3>This page is empty</h3>
      <p>Drag an element or a prebuilt section onto the canvas to get started.</p>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className="btn outline" onClick={() => setLeftTab('sections')}>
          <Icon name="sectionsIcon" size={13} /> Browse sections
        </button>
        <button type="button" className="btn outline" onClick={() => setLeftTab('add')}>
          <Icon name="add" size={13} /> Add element
        </button>
      </div>
    </div>
  );
}

/**
 * Live pixel width of the canvas. In fit mode this tracks the real element,
 * which is what lets the editing breakpoint follow a freely resized canvas.
 */
function useCanvasMeasure(enabled: boolean): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const frame = document.querySelector<HTMLElement>('.canvas-frame');
    if (!frame) return;

    const ro = new ResizeObserver(() => {
      const w = frame.getBoundingClientRect().width;
      // A transient zero/near-zero measurement during layout must not be
      // mistaken for the user resizing down to a phone.
      if (w < 200) return;
      setWidth((prev) => (Math.abs(w - prev) < 1 ? prev : w));
      const ed = useEditor.getState();
      // In preview the viewport is the user's explicit choice, not a
      // consequence of how wide the window happens to be.
      if (ed.preview) return;
      const bp = breakpointForWidth(w);
      if (bp !== ed.viewport) useEditor.setState({ viewport: bp });
      invalidateRects();
    });
    ro.observe(frame);
    return () => ro.disconnect();
  }, [enabled]);

  return width;
}

/** Width / breakpoint readout above the canvas. */
function CanvasBar() {
  const canvasWidth = useEditor((s) => s.canvasWidth);
  const canvasFit = useEditor((s) => s.canvasFit);
  const viewport = useEditor((s) => s.viewport);
  const setCanvasFit = useEditor((s) => s.setCanvasFit);
  const pageId = useEditor((s) => s.activePageId);
  const pageName = useDoc((s) => (pageId ? s.doc.pages[pageId]?.name : ''));
  const fitWidth = useCanvasMeasure(canvasFit);

  const shown = canvasFit ? fitWidth : canvasWidth;
  const label = viewport === 'base' ? 'Desktop' : viewport === 'tablet' ? 'Tablet' : 'Mobile';

  return (
    <div className="stage-bar">
      <span style={{ color: 'var(--ui-text-dim)' }}>{pageName}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>
        {Math.round(shown)}px · editing <strong style={{ color: 'var(--ui-text)' }}>{label}</strong>
      </span>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        className={`btn sm ${canvasFit ? 'is-active' : ''}`}
        onClick={() => setCanvasFit(!canvasFit)}
        title="Fit the canvas to the available space, or use a fixed draggable width"
      >
        <Icon name="frame" size={12} />
        {canvasFit ? 'Fit width' : 'Fixed width'}
      </button>
    </div>
  );
}
