import { useEffect, useMemo, useRef } from 'react';
import { def } from '../../model/registry';
import type { Breakpoint, ElementNode, SiteDoc } from '../../model/types';
import { parseValue } from '../../engine/styles';
import { deleteElements, duplicateElements, insertBlueprint, setStyle } from '../../store/actions/elements';
import { moveSection, saveSectionPreset } from '../../store/actions/components';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { startMoveDrag } from '../../dnd/useDragController';
import { Icon } from '../Icon';
import { useRects, invalidateRects, type Rect } from './useRects';
import { Tooltip } from '../controls/Tooltip';

const displayName = (node: ElementNode) => node.name || def(node.type).label;

/* ------------------------------------------------------------------ */
/* Hover outline                                                       */
/* ------------------------------------------------------------------ */

export function HoverOverlay() {
  const hoveredId = useEditor((s) => s.hoveredId);
  const selection = useEditor((s) => s.selection);
  const doc = useDoc((s) => s.doc);
  const ids = useMemo(() => (hoveredId && !selection.includes(hoveredId) ? [hoveredId] : []), [hoveredId, selection]);
  const rects = useRects(ids);

  if (!hoveredId || !ids.length) return null;
  const node = doc.elements[hoveredId];
  if (!node) return null;
  const list = rects[hoveredId] ?? [];

  return (
    <>
      {list.map((r, i) => (
        <div key={i}>
          <div className="ov-box hover" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
          {i === 0 && r.h > 12 ? (
            <div
              className="ov-label hover"
              style={{ left: r.x, top: Math.max(0, r.y - 17) }}
            >
              {displayName(node)}
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Selection outline, label, resize handles                            */
/* ------------------------------------------------------------------ */

const HANDLES = [
  { key: 'nw', x: 0, y: 0, cursor: 'nwse-resize' },
  { key: 'n', x: 0.5, y: 0, cursor: 'ns-resize' },
  { key: 'ne', x: 1, y: 0, cursor: 'nesw-resize' },
  { key: 'e', x: 1, y: 0.5, cursor: 'ew-resize' },
  { key: 'se', x: 1, y: 1, cursor: 'nwse-resize' },
  { key: 's', x: 0.5, y: 1, cursor: 'ns-resize' },
  { key: 'sw', x: 0, y: 1, cursor: 'nesw-resize' },
  { key: 'w', x: 0, y: 0.5, cursor: 'ew-resize' },
];

function handlesFor(resize: 'both' | 'width' | 'height' | 'none') {
  if (resize === 'none') return [];
  if (resize === 'width') return HANDLES.filter((h) => h.key === 'e' || h.key === 'w');
  if (resize === 'height') return HANDLES.filter((h) => h.key === 's' || h.key === 'n');
  return HANDLES;
}

function useResizeHandler(id: string, viewport: Breakpoint) {
  const setResize = useEditor((s) => s.setResize);

  return (e: React.PointerEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const host = document.querySelector<HTMLElement>(`[data-el-id="${CSS.escape(id)}"]`);
    if (!host) return;

    const startRect = host.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const node = useDoc.getState().doc.elements[id];
    const widthUnit = parseValue(node.styles[viewport].width ?? node.styles.base.width, 'px').unit || 'px';
    const heightUnit = parseValue(node.styles[viewport].height ?? node.styles.base.height, 'px').unit || 'px';
    const parentWidth = host.parentElement?.getBoundingClientRect().width ?? startRect.width;

    setResize({ id, handle });
    document.body.classList.add('is-resizing-global');

    const toUnit = (px: number, unit: string, basis: number) => {
      if (unit === '%') return `${Math.round((px / Math.max(1, basis)) * 1000) / 10}%`;
      if (unit === 'rem') return `${Math.round((px / 16) * 100) / 100}rem`;
      if (unit === 'vw') return `${Math.round((px / window.innerWidth) * 1000) / 10}vw`;
      if (unit === 'vh') return `${Math.round((px / window.innerHeight) * 1000) / 10}vh`;
      return `${Math.round(px)}px`;
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const patch: Record<string, string> = {};

      if (handle.includes('e')) patch.width = toUnit(Math.max(8, startRect.width + dx), widthUnit, parentWidth);
      if (handle.includes('w')) patch.width = toUnit(Math.max(8, startRect.width - dx), widthUnit, parentWidth);
      if (handle.includes('s')) patch.height = toUnit(Math.max(8, startRect.height + dy), heightUnit, startRect.height);
      if (handle.includes('n')) patch.height = toUnit(Math.max(8, startRect.height - dy), heightUnit, startRect.height);

      for (const [k, v] of Object.entries(patch)) {
        setStyle([id], k, v, viewport, { mergeKey: `resize:${id}:${k}`, label: 'Resize' });
      }
      invalidateRects();
    };

    const onUp = () => {
      setResize(null);
      document.body.classList.remove('is-resizing-global');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
}

export function SelectionOverlay() {
  const selection = useEditor((s) => s.selection);
  const viewport = useEditor((s) => s.viewport);
  const flash = useEditor((s) => s.flash);
  const dragging = useEditor((s) => !!s.drag?.active);
  const doc = useDoc((s) => s.doc);

  const ids = useMemo(() => [...new Set([...selection, ...flash])], [selection, flash]);
  const rects = useRects(ids);
  const primary = selection[selection.length - 1];
  const startResize = useResizeHandler(primary ?? '', viewport);

  if (!ids.length) return null;

  return (
    <>
      {ids.map((id) => {
        const node = doc.elements[id];
        if (!node) return null;
        const list = rects[id] ?? [];
        const isPrimary = id === primary && selection.length === 1;
        const isFlash = flash.includes(id) && !selection.includes(id);
        const inComponent = isInsideComponent(doc, id);
        const d = def(node.type);

        return list.map((r, i) => (
          <div key={`${id}-${i}`}>
            <div
              className={`ov-box ${isFlash ? 'flash' : node.locked ? 'locked' : selection.length > 1 ? 'multi' : 'selected'}`}
              style={{ left: r.x, top: r.y, width: r.w, height: r.h }}
            />
            {i === 0 && !dragging ? (
              <SelectionLabel node={node} rect={r} inComponent={inComponent} />
            ) : null}
            {isPrimary && i === 0 && !dragging && !node.locked
              ? handlesFor(d.resize).map((h) => (
                  <div
                    key={h.key}
                    className="ov-handle"
                    style={{
                      left: r.x + r.w * h.x - 4.5,
                      top: r.y + r.h * h.y - 4.5,
                      cursor: h.cursor,
                    }}
                    onPointerDown={(e) => startResize(e, h.key)}
                  />
                ))
              : null}
          </div>
        ));
      })}
    </>
  );
}

function isInsideComponent(doc: SiteDoc, id: string): string | null {
  let cur: string | null = id;
  while (cur) {
    for (const c of Object.values(doc.components)) {
      if (c.rootId === cur) return c.name;
    }
    cur = doc.elements[cur]?.parent ?? null;
  }
  return null;
}

function SelectionLabel({ node, rect, inComponent }: { node: ElementNode; rect: Rect; inComponent: string | null }) {
  const selection = useEditor((s) => s.selection);
  const above = rect.y > 18;

  return (
    <div
      className={`ov-label ${inComponent ? 'component' : ''}`}
      style={{ left: rect.x, top: above ? rect.y - 17 : rect.y + rect.h }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (node.locked) return;
        startMoveDrag(e, selection.includes(node.id) ? selection : [node.id], displayName(node));
      }}
      title="Drag to move"
    >
      {inComponent ? <Icon name="component" size={11} /> : null}
      {displayName(node)}
      {selection.length > 1 ? <span className="badge">+{selection.length - 1}</span> : null}
      {node.locked ? <Icon name="lock" size={11} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drop indicator                                                      */
/* ------------------------------------------------------------------ */

export function DropIndicator() {
  const drag = useEditor((s) => s.drag);
  if (!drag?.active || !drag.target) return null;
  const t = drag.target;

  if (t.mode === 'empty') {
    return <div className="drop-box" style={{ left: t.rect.x, top: t.rect.y, width: t.rect.w, height: t.rect.h }} />;
  }
  return (
    <div
      className={`drop-line ${t.axis === 'x' ? 'h' : 'v'}`}
      style={{ left: t.rect.x, top: t.rect.y, width: t.rect.w, height: t.rect.h }}
    />
  );
}

export function DragGhost() {
  const drag = useEditor((s) => s.drag);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drag?.active || !ref.current) return;
    ref.current.style.left = `${drag.pointer.x}px`;
    ref.current.style.top = `${drag.pointer.y}px`;
  }, [drag?.pointer.x, drag?.pointer.y, drag?.active]);

  if (!drag?.active) return null;
  return (
    <div ref={ref} className={`drag-ghost ${drag.target ? '' : 'invalid'}`}>
      <Icon name={drag.target ? 'add' : 'x'} size={12} />
      {drag.label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section quick actions                                               */
/* ------------------------------------------------------------------ */

/** Nearest ancestor (or self) that is a direct child of the page root. */
function topLevelSectionOf(doc: SiteDoc, id: string, pageRootId: string): string | null {
  let cur: string | null = id;
  while (cur) {
    const node: ElementNode | undefined = doc.elements[cur];
    if (!node) return null;
    if (node.parent === pageRootId) return cur;
    cur = node.parent;
  }
  return null;
}

export function SectionOverlay({ pageRootId }: { pageRootId: string }) {
  const doc = useDoc((s) => s.doc);
  const hoveredId = useEditor((s) => s.hoveredId);
  const selection = useEditor((s) => s.selection);
  const dragging = useEditor((s) => !!s.drag?.active);
  const select = useEditor((s) => s.select);

  const anchor = hoveredId ?? selection[selection.length - 1] ?? null;
  const sectionId = anchor ? topLevelSectionOf(doc, anchor, pageRootId) : null;
  const ids = useMemo(() => (sectionId ? [sectionId] : []), [sectionId]);
  const rects = useRects(ids);

  if (!sectionId || dragging) return null;
  const r = rects[sectionId]?.[0];
  if (!r) return null;
  const node = doc.elements[sectionId];
  if (!node) return null;

  const insertAt = (offset: number) => {
    const parent = doc.elements[pageRootId];
    const idx = parent.children.indexOf(sectionId) + offset;
    insertBlueprint(def('section').create(), { parentId: pageRootId, index: idx }, { label: 'Add section' });
  };

  return (
    <>
      <div className="sec-add" style={{ left: r.x, top: r.y - 11, width: r.w }}>
        <button type="button" onClick={() => insertAt(0)}>
          <Icon name="plus" size={11} /> Add section above
        </button>
      </div>
      <div className="sec-add" style={{ left: r.x, top: r.y + r.h - 11, width: r.w }}>
        <button type="button" onClick={() => insertAt(1)}>
          <Icon name="plus" size={11} /> Add section below
        </button>
      </div>

      <div className="sec-actions" style={{ left: Math.max(4, r.x + r.w - 174), top: r.y + 8 }}>
        <Tooltip label="Select section">
          <button type="button" onClick={() => select(sectionId)}>
            <Icon name="target" size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Move up">
          <button type="button" onClick={() => moveSection(sectionId, 'up')}>
            <Icon name="arrowUp" size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Move down">
          <button type="button" onClick={() => moveSection(sectionId, 'down')}>
            <Icon name="arrowDown" size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Duplicate">
          <button type="button" onClick={() => duplicateElements([sectionId])}>
            <Icon name="duplicate" size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Save as reusable section">
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('Name this section', displayName(node));
              if (name) saveSectionPreset(sectionId, name);
            }}
          >
            <Icon name="save" size={14} />
          </button>
        </Tooltip>
        <Tooltip label="Delete section">
          <button type="button" onClick={() => deleteElements([sectionId])}>
            <Icon name="trash" size={14} />
          </button>
        </Tooltip>
      </div>
    </>
  );
}
