import { SECTION_PRESETS, type SectionPreset } from '../../model/sections';
import { deleteSavedSection, insertSavedSection } from '../../store/actions/components';
import { insertBlueprint } from '../../store/actions/elements';
import { startCreateDrag } from '../../dnd/useDragController';
import { useDoc } from '../../store/docStore';
import { Icon } from '../Icon';
import { Tooltip } from '../controls/Tooltip';

/** Abstract wireframe thumbnails — readable at 54px, no fake screenshots. */
function Thumb({ kind }: { kind: string }) {
  const bar = (h: number, w: string, o = 1) => (
    <div className="b" style={{ height: h, width: w, opacity: o }} />
  );

  const content = () => {
    switch (kind) {
      case 'hero':
        return (
          <>
            {bar(4, '58%')}
            {bar(3, '76%', 0.6)}
            <div className="row" style={{ marginTop: 3 }}>
              {bar(6, '22%')}
              {bar(6, '22%', 0.5)}
            </div>
          </>
        );
      case 'cols3':
        return (
          <>
            {bar(3, '44%')}
            <div className="row" style={{ marginTop: 3, height: 22 }}>
              {bar(22, '32%', 0.7)}
              {bar(22, '32%', 0.7)}
              {bar(22, '32%', 0.7)}
            </div>
          </>
        );
      case 'split':
        return (
          <div className="row" style={{ height: 34 }}>
            <div style={{ width: '48%', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {bar(3, '80%')}
              {bar(3, '60%', 0.55)}
              {bar(3, '70%', 0.55)}
            </div>
            {bar(34, '48%', 0.75)}
          </div>
        );
      case 'grid':
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, height: 34 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="b" style={{ opacity: 0.7 }} />
            ))}
          </div>
        );
      case 'list':
        return (
          <>
            {bar(3, '50%')}
            {bar(5, '100%', 0.55)}
            {bar(5, '100%', 0.55)}
            {bar(5, '100%', 0.55)}
          </>
        );
      case 'center':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {bar(4, '62%')}
            {bar(3, '44%', 0.55)}
            {bar(6, '26%')}
          </div>
        );
      case 'footer':
        return (
          <>
            <div style={{ flex: 1 }} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              {bar(4, '22%')}
              {bar(4, '34%', 0.5)}
            </div>
            {bar(2, '30%', 0.35)}
          </>
        );
      default:
        return bar(20, '100%', 0.6);
    }
  };

  return <div className="preset-thumb">{content()}</div>;
}

export function SectionsPanel() {
  const saved = useDoc((s) => s.doc.savedSections);
  const groups = SECTION_PRESETS.reduce<Record<string, SectionPreset[]>>((acc, p) => {
    (acc[p.group] ??= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Sections</span>
      </div>
      <div className="panel-body">
        {saved.length ? (
          <>
            <div className="cat-head">Your saved sections</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
              {saved.map((s) => (
                <div
                  key={s.id}
                  className="preset"
                  onPointerDown={(e) => startCreateDrag(e, { source: 'savedSection', sectionId: s.id }, s.name)}
                  onClick={() => insertSavedSection(s.id)}
                >
                  <div className="preset-name">
                    <Icon name="save" size={12} style={{ color: 'var(--ui-global)' }} />
                    {s.name}
                    <span className="lrow-actions always">
                      <Tooltip label="Delete saved section">
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedSection(s.id);
                          }}
                        >
                          <Icon name="trash" size={11} />
                        </button>
                      </Tooltip>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {Object.entries(groups).map(([group, presets]) => (
          <div key={group}>
            <div className="cat-head">{group}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 8px' }}>
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="preset"
                  title={`Drag ${p.name} onto the canvas`}
                  onPointerDown={(e) => startCreateDrag(e, { source: 'section', presetId: p.id }, p.name)}
                  onClick={() => insertBlueprint(p.create(), null, { label: `Add ${p.name} section` })}
                >
                  <Thumb kind={p.preview} />
                  <div className="preset-name">{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="hint" style={{ padding: '14px 10px 18px' }}>
          Sections are starting points, not templates. Everything inside stays fully editable — and you
          can save any section you build back into this list.
        </div>
      </div>
    </>
  );
}
