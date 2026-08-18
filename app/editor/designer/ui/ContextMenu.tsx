import { def } from '../model/registry';
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
  ungroupElement,
} from '../store/actions/elements';
import { createComponentFrom, detachInstance, saveSectionPreset } from '../store/actions/components';
import { useDoc } from '../store/docStore';
import { useEditor } from '../store/editorStore';
import { Icon } from './Icon';
import { Popover } from './controls/Popover';

const MOD = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl';

export function ContextMenu() {
  const menu = useEditor((s) => s.contextMenu);
  const close = useEditor((s) => s.closeContextMenu);
  const selection = useEditor((s) => s.selection);
  const viewport = useEditor((s) => s.viewport);
  const clipboard = useEditor((s) => s.clipboard);
  const doc = useDoc((s) => s.doc);

  if (!menu) return null;
  const id = menu.targetId;
  const node = id ? doc.elements[id] : null;
  const multi = selection.length > 1;

  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  return (
    <Popover anchor={{ x: menu.x, y: menu.y }} onClose={close} width={218}>
      {node ? (
        <>
          <div className="menu-label">{multi ? `${selection.length} elements` : node.name || def(node.type).label}</div>

          <button type="button" className="menu-item" onClick={run(() => copyElements(selection))}>
            <Icon name="copy" size={13} /> Copy <span className="kbd">{MOD}C</span>
          </button>
          <button type="button" className="menu-item" onClick={run(() => cutElements(selection))}>
            <Icon name="duplicate" size={13} /> Cut <span className="kbd">{MOD}X</span>
          </button>
          <button type="button" className="menu-item" disabled={!clipboard} onClick={run(() => pasteClipboard())}>
            <Icon name="add" size={13} /> Paste <span className="kbd">{MOD}V</span>
          </button>
          <button type="button" className="menu-item" onClick={run(() => duplicateElements(selection))}>
            <Icon name="duplicate" size={13} /> Duplicate <span className="kbd">{MOD}D</span>
          </button>

          <div className="menu-sep" />

          <button type="button" className="menu-item" onClick={run(() => groupElements(selection))}>
            <Icon name="container" size={13} /> Group <span className="kbd">{MOD}G</span>
          </button>
          <button
            type="button"
            className="menu-item"
            disabled={!node.children.length}
            onClick={run(() => ungroupElement(node.id))}
          >
            <Icon name="frame" size={13} /> Ungroup <span className="kbd">{MOD}⇧G</span>
          </button>

          <div className="menu-sep" />

          <button type="button" className="menu-item" onClick={run(() => reorderWithinParent(node.id, 'forward'))}>
            <Icon name="arrowUp" size={13} /> Bring forward <span className="kbd">{MOD}]</span>
          </button>
          <button type="button" className="menu-item" onClick={run(() => reorderWithinParent(node.id, 'backward'))}>
            <Icon name="arrowDown" size={13} /> Send backward <span className="kbd">{MOD}[</span>
          </button>

          <div className="menu-sep" />

          <button
            type="button"
            className="menu-item"
            onClick={run(() => setHidden(selection, viewport, node.hidden?.[viewport] ? undefined : true))}
          >
            <Icon name={node.hidden?.[viewport] ? 'eye' : 'eyeOff'} size={13} />
            {node.hidden?.[viewport] ? 'Show here' : `Hide on ${viewport === 'base' ? 'desktop' : viewport}`}
            <span className="kbd">{MOD}⇧H</span>
          </button>
          <button type="button" className="menu-item" onClick={run(() => setLocked(selection, !node.locked))}>
            <Icon name={node.locked ? 'unlock' : 'lock'} size={13} /> {node.locked ? 'Unlock' : 'Lock'}
            <span className="kbd">{MOD}L</span>
          </button>

          <div className="menu-sep" />

          {node.type === 'instance' ? (
            <button type="button" className="menu-item" onClick={run(() => detachInstance(node.id))}>
              <Icon name="unlink" size={13} /> Detach from component
            </button>
          ) : (
            <button
              type="button"
              className="menu-item"
              onClick={run(() => {
                const name = window.prompt('Name this component', node.name || def(node.type).label);
                if (name) createComponentFrom(node.id, name);
              })}
            >
              <Icon name="component" size={13} /> Create component
            </button>
          )}

          {node.type === 'section' ? (
            <button
              type="button"
              className="menu-item"
              onClick={run(() => {
                const name = window.prompt('Name this section', node.name || 'Section');
                if (name) saveSectionPreset(node.id, name);
              })}
            >
              <Icon name="save" size={13} /> Save as reusable section
            </button>
          ) : null}

          <div className="menu-sep" />

          <button type="button" className="menu-item danger" onClick={run(() => deleteElements(selection))}>
            <Icon name="trash" size={13} /> Delete <span className="kbd">⌫</span>
          </button>
        </>
      ) : (
        <button type="button" className="menu-item" disabled={!clipboard} onClick={run(() => pasteClipboard())}>
          <Icon name="add" size={13} /> Paste here <span className="kbd">{MOD}V</span>
        </button>
      )}
    </Popover>
  );
}
