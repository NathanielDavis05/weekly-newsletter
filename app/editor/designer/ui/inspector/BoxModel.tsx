import { useState } from 'react';
import { formatValue, parseValue } from '../../engine/styles';
import { setStyles } from '../../store/actions/elements';
import { Icon } from '../Icon';
import { Tooltip } from '../controls/Tooltip';
import { useStyleProp } from './useStyleProp';

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
type Side = (typeof SIDES)[number];

/** One editable number inside the box-model diagram. */
function BoxField({
  prop,
  style,
  linked,
  group,
}: {
  prop: string;
  style: React.CSSProperties;
  linked: boolean;
  group: string[];
}) {
  const sp = useStyleProp(prop);
  const [editing, setEditing] = useState(false);
  const parsed = parseValue(sp.value, 'px');
  const shown = parsed.num !== null ? String(Math.round(parsed.num * 100) / 100) : parsed.raw === 'auto' ? 'auto' : '–';

  const write = (value: string | undefined, mergeKey?: string) => {
    const targets = linked ? group : [prop];
    const patch: Record<string, string | undefined> = {};
    for (const p of targets) patch[p] = value;
    // One call for all linked sides keeps a linked drag as a single undo step.
    setStyles(sp.ids, patch, sp.viewport, { mergeKey: mergeKey ?? `box:${prop}`, label: 'Change spacing' });
  };

  const startScrub = (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startVal = parsed.num ?? 0;
    const unit = parsed.unit || 'px';
    let moved = false;

    const onMove = (ev: PointerEvent) => {
      const dy = startY - ev.clientY;
      if (!moved && Math.abs(dy) < 3) return;
      moved = true;
      const next = Math.max(0, startVal + dy * (ev.shiftKey ? 10 : 1));
      write(formatValue(next, unit), `box:${prop}`);
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-resizing-global');
      if (!moved) setEditing(true);
    };
    document.body.classList.add('is-resizing-global');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const cls = [
    'bm-field',
    sp.origin === 'local' && sp.viewport !== 'base' ? 'is-override' : sp.origin === 'local' ? 'is-set' : '',
  ].join(' ');

  if (editing) {
    return (
      <div className="bm-field" style={style}>
        <input
          autoFocus
          defaultValue={parsed.num !== null ? String(parsed.num) : parsed.raw}
          onBlur={(e) => {
            const v = e.target.value.trim();
            write(v === '' || v === '-' ? undefined : parseValue(v, parsed.unit || 'px').raw.match(/[a-z%]/) ? v : `${parseFloat(v) || 0}${parsed.unit || 'px'}`);
            setEditing(false);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
        />
      </div>
    );
  }

  return (
    <Tooltip label={`${prop} — drag to change, click to type`}>
      <div className={cls} style={style} onPointerDown={startScrub}>
        {shown}
      </div>
    </Tooltip>
  );
}

export function BoxModel() {
  const [linkMargin, setLinkMargin] = useState(false);
  const [linkPadding, setLinkPadding] = useState(false);

  const marginProps = SIDES.map((s) => `margin${s}`);
  const paddingProps = SIDES.map((s) => `padding${s}`);

  const pos = (side: Side, outer: boolean): React.CSSProperties => {
    const inset = outer ? 1 : 18;
    switch (side) {
      case 'Top':
        return { top: inset, left: '50%', transform: 'translateX(-50%)' };
      case 'Bottom':
        return { bottom: inset, left: '50%', transform: 'translateX(-50%)' };
      case 'Left':
        return { left: outer ? 2 : 19, top: '50%', transform: 'translateY(-50%)' };
      case 'Right':
        return { right: outer ? 2 : 19, top: '50%', transform: 'translateY(-50%)' };
    }
  };

  return (
    <div className="boxmodel">
      <div className="boxmodel-outer">
        <span className="bm-label" style={{ top: 2, left: 4 }}>
          Margin
        </span>
        {SIDES.map((s) => (
          <BoxField
            key={`m${s}`}
            prop={`margin${s}`}
            style={pos(s, true)}
            linked={linkMargin}
            group={marginProps}
          />
        ))}

        <div className="boxmodel-inner">
          <span className="bm-label" style={{ top: 2, left: 4 }}>
            Padding
          </span>
          {SIDES.map((s) => (
            <BoxField
              key={`p${s}`}
              prop={`padding${s}`}
              style={pos(s, false)}
              linked={linkPadding}
              group={paddingProps}
            />
          ))}
          <div className="boxmodel-center">content</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <button
          type="button"
          className={`btn sm ${linkMargin ? 'is-active' : ''}`}
          onClick={() => setLinkMargin(!linkMargin)}
          style={{ flex: 1 }}
        >
          <Icon name={linkMargin ? 'link' : 'unlink'} size={11} /> Margin
        </button>
        <button
          type="button"
          className={`btn sm ${linkPadding ? 'is-active' : ''}`}
          onClick={() => setLinkPadding(!linkPadding)}
          style={{ flex: 1 }}
        >
          <Icon name={linkPadding ? 'link' : 'unlink'} size={11} /> Padding
        </button>
      </div>
    </div>
  );
}
