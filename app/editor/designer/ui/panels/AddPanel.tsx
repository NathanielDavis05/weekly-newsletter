import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, CATEGORY_ORDER, addPanelItems, type ElementDef } from '../../model/registry';
import type { ElementType } from '../../model/types';
import { addElement } from '../../store/actions/elements';
import { startCreateDrag } from '../../dnd/useDragController';
import { Icon, type IconName } from '../Icon';

export function AddPanel() {
  const [query, setQuery] = useState('');
  const groups = useMemo(() => addPanelItems(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const all: ElementDef[] = [];
    for (const c of CATEGORY_ORDER) all.push(...groups[c]);
    return all.filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.keywords?.some((k) => k.includes(q)),
    );
  }, [query, groups]);

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Add element</span>
      </div>
      <div className="search">
        <Icon name="search" size={13} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search elements"
          onKeyDown={(e) => e.stopPropagation()}
        />
        {query ? (
          <button type="button" onClick={() => setQuery('')} style={{ color: 'var(--ui-text-faint)' }}>
            <Icon name="x" size={12} />
          </button>
        ) : null}
      </div>

      <div className="panel-body">
        {filtered ? (
          filtered.length ? (
            <div className="add-grid">
              {filtered.map((d) => (
                <AddItem key={d.type} def={d} />
              ))}
            </div>
          ) : (
            <div className="empty-note">No elements match “{query}”.</div>
          )
        ) : (
          CATEGORY_ORDER.map((c) =>
            groups[c].length ? (
              <div key={c}>
                <div className="cat-head">{CATEGORY_LABEL[c]}</div>
                <div className="add-grid">
                  {groups[c].map((d) => (
                    <AddItem key={d.type} def={d} />
                  ))}
                </div>
              </div>
            ) : null,
          )
        )}
        <div className="hint" style={{ padding: '0 10px 16px' }}>
          Drag an element onto the canvas to place it precisely, or click to add it next to your
          current selection.
        </div>
      </div>
    </>
  );
}

function AddItem({ def }: { def: ElementDef }) {
  return (
    <button
      type="button"
      className="add-item"
      title={def.label}
      onPointerDown={(e) =>
        startCreateDrag(e, { source: 'element', elementType: def.type as ElementType }, def.label)
      }
      onClick={() => addElement(def.type)}
    >
      <Icon name={def.icon as IconName} size={17} />
      <span>{def.label}</span>
    </button>
  );
}
