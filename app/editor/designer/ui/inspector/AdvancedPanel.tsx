import { newId } from '../../model/blueprint';
import { elClass } from '../../engine/css';
import type { ElementNode } from '../../model/types';
import { setAdvanced } from '../../store/actions/elements';
import { Icon } from '../Icon';
import { TextField } from '../controls/Fields';
import { Section } from './PropRow';

/**
 * The escape hatch. Everything here is optional — a normal user never opens
 * this tab — but an experienced developer can reach the underlying HTML and
 * CSS without leaving the editor.
 */
export function AdvancedPanel({ node }: { node: ElementNode }) {
  const attrs = node.attributes ?? [];

  return (
    <>
      <Section title="Identity" id="a-id">
        <div className="row wide">
          <span className="row-label">Element ID</span>
          <TextField
            value={node.customId ?? ''}
            onChange={() => {}}
            onCommit={(v) => setAdvanced(node.id, { customId: v.trim() || undefined })}
            placeholder={node.id}
            mono
          />
          <div className="hint">Used for anchor links (#your-id) and custom CSS.</div>
        </div>

        <div className="row wide">
          <span className="row-label">CSS classes</span>
          <TextField
            value={(node.classes ?? []).join(' ')}
            onChange={() => {}}
            onCommit={(v) =>
              setAdvanced(node.id, { classes: v.split(/\s+/).map((c) => c.trim()).filter(Boolean) })
            }
            placeholder="hero-card featured"
            mono
          />
          <div className="hint">
            Space separated. Target them from Site styles → Custom CSS.
          </div>
        </div>

        <div className="row wide">
          <span className="row-label">Generated class</span>
          <div className="field">
            <input readOnly value={`.${elClass(node.id)}`} style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }} />
          </div>
        </div>
      </Section>

      <Section title="Custom CSS" id="a-css">
        <textarea
          className="textarea code"
          defaultValue={node.customCss ?? ''}
          placeholder={'transition: transform .3s;\nwill-change: transform;'}
          style={{ minHeight: 100 }}
          onBlur={(e) => setAdvanced(node.id, { customCss: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
        />
        <div className="hint">
          Declarations only — they are wrapped in this element’s own selector and applied last.
        </div>
      </Section>

      <Section title="HTML attributes" id="a-attrs" defaultOpen={false}>
        {attrs.map((a) => (
          <div key={a.id} className="row" style={{ gridTemplateColumns: '1fr 1fr 22px' }}>
            <TextField
              value={a.name}
              onChange={() => {}}
              onCommit={(v) =>
                setAdvanced(node.id, { attributes: attrs.map((x) => (x.id === a.id ? { ...x, name: v } : x)) })
              }
              placeholder="data-track"
              mono
            />
            <TextField
              value={a.value}
              onChange={() => {}}
              onCommit={(v) =>
                setAdvanced(node.id, { attributes: attrs.map((x) => (x.id === a.id ? { ...x, value: v } : x)) })
              }
              placeholder="value"
              mono
            />
            <button
              type="button"
              className="btn icon sm"
              onClick={() => setAdvanced(node.id, { attributes: attrs.filter((x) => x.id !== a.id) })}
            >
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn sm outline block"
          onClick={() =>
            setAdvanced(node.id, { attributes: [...attrs, { id: newId('at'), name: '', value: '' }] })
          }
        >
          <Icon name="plus" size={11} /> Add attribute
        </button>
        <div className="hint">Event handler attributes (onclick and friends) are ignored for safety.</div>
      </Section>
    </>
  );
}
