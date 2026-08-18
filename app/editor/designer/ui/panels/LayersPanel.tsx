import { useEffect, useRef, useState } from 'react';
import { canContain, def } from '../../model/registry';
import { isVisibleAt } from '../../engine/styles';
import { moveElements, renameElement, setHidden, setLocked } from '../../store/actions/elements';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon, type IconName } from '../Icon';
import { Tooltip } from '../controls/Tooltip';

type DropMode = 'before' | 'after' | 'inside';

interface DragInfo {
  ids: string[];
  overId: string | null;
  mode: DropMode;
}

export function LayersPanel() {
  const doc = useDoc((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const selection = useEditor((s) => s.selection);
  const page = activePageId ? doc.pages[activePageId] : null;
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Reveal the selection when it changes from the canvas.
  useEffect(() => {
    const id = selection[selection.length - 1];
    if (!id) return;
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selection]);

  if (!page) return null;
  const root = doc.elements[page.rootId];

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Layers</span>
        <span className="lrow-sub">{page.name}</span>
      </div>
      <div className="panel-body" ref={bodyRef}>
        <div className="list">
          {root?.children.length ? (
            root.children.map((id) => (
              <LayerRow key={id} id={id} depth={0} drag={drag} setDrag={setDrag} />
            ))
          ) : (
            <div className="empty-note">
              Nothing on this page yet.
              <br />
              Add a section to get started.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function LayerRow({
  id,
  depth,
  drag,
  setDrag,
}: {
  id: string;
  depth: number;
  drag: DragInfo | null;
  setDrag: (d: DragInfo | null) => void;
}) {
  const node = useDoc((s) => s.doc.elements[id]);
  const components = useDoc((s) => s.doc.components);
  const selection = useEditor((s) => s.selection);
  const collapsed = useEditor((s) => s.collapsed[id]);
  const viewport = useEditor((s) => s.viewport);
  const hoveredId = useEditor((s) => s.hoveredId);
  const [renaming, setRenaming] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

  if (!node) return null;

  const d = def(node.type);
  const isSelected = selection.includes(id);
  const isInstance = node.type === 'instance';
  const comp = isInstance && node.componentId ? components[node.componentId] : null;
  const visible = isVisibleAt(node, viewport);
  const hiddenHere = node.hidden?.[viewport];

  // Instances show the component's contents, read-only in the tree.
  const children = isInstance && comp ? [comp.rootId] : node.children;
  const hasChildren = children.length > 0;
  const open = !collapsed;

  const isDropTarget = drag?.overId === id;

  const startRowDrag = (e: React.PointerEvent) => {
    if (renaming || node.locked) return;
    const ids = selection.includes(id) && selection.length > 1 ? selection : [id];
    const startY = e.clientY;
    let started = false;
    // The authoritative target lives in the closure. React state is only used
    // to paint the indicator, and a gesture must not depend on having
    // re-rendered before the pointer comes back up.
    let current: DragInfo | null = null;

    const onMove = (ev: PointerEvent) => {
      if (!started && Math.abs(ev.clientY - startY) < 4) return;
      started = true;
      const row = document
        .elementFromPoint(ev.clientX, ev.clientY)
        ?.closest<HTMLElement>('[data-layer-id]');
      if (!row) {
        current = null;
        setDrag({ ids, overId: null, mode: 'before' });
        return;
      }

      const overId = row.dataset.layerId!;
      const r = row.getBoundingClientRect();
      const rel = (ev.clientY - r.top) / r.height;
      const overNode = useDoc.getState().doc.elements[overId];
      const canNest = overNode && def(overNode.type).container;
      const mode: DropMode = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : canNest ? 'inside' : 'after';
      current = { ids, overId, mode };
      setDrag(current);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-dragging-global');

      const cur = current;
      setDrag(null);
      if (!started || !cur?.overId) return;

      const doc = useDoc.getState().doc;
      const over = doc.elements[cur.overId];
      if (!over || cur.ids.includes(cur.overId)) return;

      if (cur.mode === 'inside') {
        moveElements(cur.ids, cur.overId, over.children.length);
      } else if (over.parent) {
        const parent = doc.elements[over.parent];
        const idx = parent.children.indexOf(cur.overId) + (cur.mode === 'after' ? 1 : 0);
        moveElements(cur.ids, over.parent, idx);
      }
    };

    document.body.classList.add('is-dragging-global');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const dropClass = isDropTarget
    ? drag!.mode === 'inside'
      ? 'drop-inside'
      : drag!.mode === 'before'
        ? 'drop-before'
        : 'drop-after'
    : '';

  const invalidDrop =
    isDropTarget &&
    drag!.mode === 'inside' &&
    drag!.ids.some((dragId) => {
      const dragNode = useDoc.getState().doc.elements[dragId];
      return dragNode && !canContain(node.type, dragNode.type);
    });

  return (
    <>
      <div
        ref={rowRef}
        data-layer-id={id}
        className={`lrow ${isSelected ? 'is-selected' : ''} ${!visible ? 'is-hidden' : ''} ${
          hoveredId === id && !isSelected ? 'is-active' : ''
        } ${invalidDrop ? '' : dropClass}`}
        style={{ paddingLeft: 6 + depth * 13 }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const ed = useEditor.getState();
          if (e.shiftKey || e.metaKey || e.ctrlKey) ed.select(id, { additive: true });
          else if (!isSelected) ed.select(id);
          startRowDrag(e);
        }}
        onDoubleClick={() => setRenaming(true)}
        onMouseEnter={() => useEditor.getState().setHovered(id)}
        onMouseLeave={() => useEditor.getState().setHovered(null)}
        onContextMenu={(e) => {
          e.preventDefault();
          const ed = useEditor.getState();
          if (!isSelected) ed.select(id);
          ed.openContextMenu({ x: e.clientX, y: e.clientY, targetId: id });
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={`layer-twisty ${open ? 'is-open' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              useEditor.getState().toggleCollapsed(id);
            }}
          >
            <Icon name="chevronRight" size={10} />
          </button>
        ) : (
          <span style={{ width: 14, flex: 'none' }} />
        )}

        <Icon
          name={(comp ? 'component' : d.icon) as IconName}
          size={13}
          className="layer-icon"
          style={comp ? { color: 'var(--ui-global)' } : undefined}
        />

        {renaming ? (
          <input
            className="rename"
            autoFocus
            onFocus={(e) => e.target.select()}
            defaultValue={node.name ?? d.label}
            onPointerDown={(e) => e.stopPropagation()}
            onBlur={(e) => {
              renameElement(id, e.target.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <span className="lrow-name">{node.name || d.label}</span>
        )}

        <span className="lrow-actions">
          <Tooltip label={node.locked ? 'Unlock' : 'Lock'}>
            <button
              type="button"
              className={node.locked ? 'is-on' : ''}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setLocked([id], !node.locked);
              }}
              style={{ opacity: node.locked ? 1 : undefined }}
            >
              <Icon name={node.locked ? 'lock' : 'unlock'} size={12} />
            </button>
          </Tooltip>
          <Tooltip label={hiddenHere ? 'Show here' : `Hide on ${viewport === 'base' ? 'desktop' : viewport}`}>
            <button
              type="button"
              className={hiddenHere ? 'is-on' : ''}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setHidden([id], viewport, hiddenHere ? undefined : true);
              }}
              style={{ opacity: !visible ? 1 : undefined }}
            >
              <Icon name={visible ? 'eye' : 'eyeOff'} size={12} />
            </button>
          </Tooltip>
        </span>
      </div>

      {open && hasChildren
        ? children.map((cid) => (
            <LayerRow key={cid} id={cid} depth={depth + 1} drag={drag} setDrag={setDrag} />
          ))
        : null}
    </>
  );
}
