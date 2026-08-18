import { ancestorsOf } from '../../model/blueprint';
import { def } from '../../model/registry';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';

/**
 * Ancestor trail for the current selection. Clicking on a nested element
 * selects it precisely; this is how you climb back out to its containers
 * without hunting in the Layers tree.
 */
export function Breadcrumbs() {
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const setHovered = useEditor((s) => s.setHovered);
  const doc = useDoc((s) => s.doc);
  const pageId = useEditor((s) => s.activePageId);

  const id = selection[selection.length - 1];
  if (!id || !doc.elements[id]) return null;

  const pageRootId = pageId ? doc.pages[pageId]?.rootId : null;
  const chain = [...ancestorsOf(doc.elements, id).filter((a) => a !== pageRootId).reverse(), id];

  return (
    <div
      style={{
        position: 'absolute',
        left: 10,
        bottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '3px 6px',
        background: 'var(--ui-panel-2)',
        border: '1px solid var(--ui-border-strong)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        maxWidth: 'calc(100% - 20px)',
        overflow: 'hidden',
        zIndex: 45,
      }}
    >
      {chain.map((cid, i) => {
        const node = doc.elements[cid];
        if (!node) return null;
        const isLast = i === chain.length - 1;
        return (
          <span key={cid} style={{ display: 'inline-flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            {i > 0 ? <Icon name="chevronRight" size={10} style={{ opacity: 0.35, flex: 'none' }} /> : null}
            <button
              type="button"
              className={`btn sm ${isLast ? 'is-active' : ''}`}
              style={{ maxWidth: 130, overflow: 'hidden' }}
              onClick={() => select(cid)}
              onMouseEnter={() => setHovered(cid)}
              onMouseLeave={() => setHovered(null)}
            >
              <Icon name={def(node.type).icon as never} size={11} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {node.name || def(node.type).label}
              </span>
            </button>
          </span>
        );
      })}
    </div>
  );
}
