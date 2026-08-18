import { useState } from 'react';
import {
  countInstances,
  deleteComponent,
  insertComponentInstance,
  renameComponent,
} from '../../store/actions/components';
import { startCreateDrag } from '../../dnd/useDragController';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { Tooltip } from '../controls/Tooltip';

export function ComponentsPanel() {
  const doc = useDoc((s) => s.doc);
  const select = useEditor((s) => s.select);
  const [renaming, setRenaming] = useState<string | null>(null);
  const list = Object.values(doc.components).sort((a, b) => a.createdAt - b.createdAt);

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Components</span>
      </div>
      <div className="panel-body">
        {list.length ? (
          <div className="list">
            {list.map((c) => {
              const uses = countInstances(doc, c.id);
              return (
                <div
                  key={c.id}
                  className="lrow"
                  title="Drag onto the canvas to place an instance"
                  onPointerDown={(e) => startCreateDrag(e, { source: 'component', componentId: c.id }, c.name)}
                  onClick={() => insertComponentInstance(c.id)}
                >
                  <Icon name="component" size={13} className="layer-icon" style={{ color: 'var(--ui-global)' }} />
                  {renaming === c.id ? (
                    <input
                      className="rename"
                      autoFocus
                      onFocus={(e) => e.target.select()}
                      defaultValue={c.name}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        renameComponent(c.id, e.target.value.trim() || c.name);
                        setRenaming(null);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                    />
                  ) : (
                    <>
                      <span className="lrow-name">{c.name}</span>
                      <span className="lrow-sub">{uses === 1 ? '1 use' : `${uses} uses`}</span>
                    </>
                  )}
                  <span className="lrow-actions">
                    <Tooltip label="Edit the master">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          select(c.rootId);
                        }}
                      >
                        <Icon name="target" size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Rename">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenaming(c.id);
                        }}
                      >
                        <Icon name="text" size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip label="Delete component">
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Delete “${c.name}”? Its ${uses} instance${uses === 1 ? '' : 's'} will be kept as ordinary elements.`,
                            )
                          ) {
                            deleteComponent(c.id);
                          }
                        }}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </Tooltip>
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-note">
            No components yet.
            <br />
            <br />
            Select anything on the canvas and choose <strong>Create component</strong> to reuse it across
            pages. Editing the master updates every instance.
          </div>
        )}

        <div className="hint" style={{ padding: '10px 12px 18px' }}>
          Editing a component master changes every instance. To customise one copy on its own, select the
          instance and detach it.
        </div>
      </div>
    </>
  );
}
