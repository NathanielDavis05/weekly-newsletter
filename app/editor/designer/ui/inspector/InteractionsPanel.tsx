import { newId } from '../../model/blueprint';
import type { ElementNode, Interaction, InteractionTrigger } from '../../model/types';
import { mutate } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { Check, SelectField, UnitField } from '../controls/Fields';
import { ColorField } from '../controls/ColorField';
import { Section } from './PropRow';

const TRIGGERS: { value: InteractionTrigger; label: string; hint: string }[] = [
  { value: 'hover', label: 'On hover', hint: 'Applies while the pointer is over the element' },
  { value: 'click', label: 'On click', hint: 'Applies while the element is being pressed' },
  { value: 'load', label: 'On page load', hint: 'Animates in once when the page opens' },
  { value: 'scrollIntoView', label: 'On scroll into view', hint: 'Animates in as it enters the viewport' },
];

const EASINGS = [
  { value: 'cubic-bezier(.4,0,.2,1)', label: 'Smooth' },
  { value: 'ease-out', label: 'Ease out' },
  { value: 'ease-in-out', label: 'Ease in-out' },
  { value: 'linear', label: 'Linear' },
  { value: 'cubic-bezier(.34,1.56,.64,1)', label: 'Overshoot' },
];

function updateInteractions(id: string, fn: (list: Interaction[]) => Interaction[], label: string) {
  mutate(label, (draft) => {
    const node = draft.elements[id];
    if (!node) return;
    node.interactions = fn(node.interactions ?? []);
  });
}

export function InteractionsPanel({ node }: { node: ElementNode }) {
  const list = node.interactions ?? [];
  const setViewport = useEditor((s) => s.setPreview);

  const add = () => {
    const ix: Interaction = {
      id: newId('ix'),
      trigger: 'hover',
      effect: { opacity: 1, scale: 1.03 },
      duration: 240,
      delay: 0,
      easing: 'cubic-bezier(.4,0,.2,1)',
      enabled: true,
    };
    updateInteractions(node.id, (l) => [...l, ix], 'Add interaction');
  };

  return (
    <>
      {list.length === 0 ? (
        <div className="empty-note">
          No interactions on this element.
          <br />
          <br />
          Add one to animate it on hover, click, page load or as it scrolls into view.
        </div>
      ) : null}

      {list.map((ix, i) => (
        <Section key={ix.id} title={`${TRIGGERS.find((t) => t.value === ix.trigger)?.label ?? 'Interaction'} ${i + 1}`} id={`ix-${ix.id}`}>
          <div className="row">
            <span className="row-label">Trigger</span>
            <SelectField
              value={ix.trigger}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, trigger: v as InteractionTrigger } : x)), 'Change trigger')
              }
              options={TRIGGERS.map((t) => ({ value: t.value, label: t.label }))}
            />
          </div>
          <div className="hint">{TRIGGERS.find((t) => t.value === ix.trigger)?.hint}</div>

          <div className="row">
            <span className="row-label">Opacity</span>
            <UnitField
              value={ix.effect.opacity !== undefined ? String(ix.effect.opacity) : undefined}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, opacity: v === undefined ? undefined : Number(parseFloat(v)) } } : x)), 'Change interaction')
              }
              units={['']}
              defaultUnit=""
              min={0}
              max={1}
              step={0.05}
              icon="opacity"
            />
          </div>

          <div className="row split">
            <span className="row-label">Move</span>
            <UnitField
              value={ix.effect.x !== undefined ? `${ix.effect.x}px` : undefined}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, x: v === undefined ? undefined : parseFloat(v) } } : x)), 'Change interaction')
              }
              label="X"
            />
            <UnitField
              value={ix.effect.y !== undefined ? `${ix.effect.y}px` : undefined}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, y: v === undefined ? undefined : parseFloat(v) } } : x)), 'Change interaction')
              }
              label="Y"
            />
          </div>

          <div className="row split">
            <span className="row-label">Transform</span>
            <UnitField
              value={ix.effect.scale !== undefined ? String(ix.effect.scale) : undefined}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, scale: v === undefined ? undefined : parseFloat(v) } } : x)), 'Change interaction')
              }
              units={['']}
              defaultUnit=""
              label="S"
              step={0.01}
            />
            <UnitField
              value={ix.effect.rotate !== undefined ? `${ix.effect.rotate}deg` : undefined}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, rotate: v === undefined ? undefined : parseFloat(v) } } : x)), 'Change interaction')
              }
              units={['deg']}
              defaultUnit="deg"
              label="R"
            />
          </div>

          <div className="row">
            <span className="row-label">Color</span>
            <ColorField
              value={ix.effect.color}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, color: v } } : x)), 'Change interaction')
              }
            />
          </div>
          <div className="row">
            <span className="row-label">Background</span>
            <ColorField
              value={ix.effect.backgroundColor}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, effect: { ...x.effect, backgroundColor: v } } : x)), 'Change interaction')
              }
            />
          </div>

          <div className="row split">
            <span className="row-label">Timing</span>
            <UnitField
              value={`${ix.duration}ms`}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, duration: parseInt(v ?? '240', 10) || 240 } : x)), 'Change interaction')
              }
              units={['ms']}
              defaultUnit="ms"
              label="D"
              min={0}
              step={10}
            />
            <UnitField
              value={`${ix.delay}ms`}
              onChange={(v) =>
                updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, delay: parseInt(v ?? '0', 10) || 0 } : x)), 'Change interaction')
              }
              units={['ms']}
              defaultUnit="ms"
              label="W"
              min={0}
              step={10}
            />
          </div>

          <div className="row">
            <span className="row-label">Easing</span>
            <SelectField
              value={ix.easing}
              onChange={(v) => updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, easing: v } : x)), 'Change easing')}
              options={EASINGS}
            />
          </div>

          <Check
            checked={ix.enabled}
            onChange={(v) => updateInteractions(node.id, (l) => l.map((x) => (x.id === ix.id ? { ...x, enabled: v } : x)), 'Toggle interaction')}
            label="Enabled"
          />

          <button
            type="button"
            className="btn sm danger block"
            onClick={() => updateInteractions(node.id, (l) => l.filter((x) => x.id !== ix.id), 'Remove interaction')}
          >
            <Icon name="trash" size={11} /> Remove
          </button>
        </Section>
      ))}

      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button type="button" className="btn outline block" onClick={add}>
          <Icon name="plus" size={12} /> Add interaction
        </button>
        <button type="button" className="btn sm block" onClick={() => setViewport(true)}>
          <Icon name="play" size={11} /> Test in preview
        </button>
      </div>
    </>
  );
}
