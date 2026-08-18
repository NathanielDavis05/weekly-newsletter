import { useState } from 'react';
import type { ReactNode } from 'react';
import { BREAKPOINT_LABEL } from '../../model/types';
import type { StyleOrigin } from '../../engine/styles';
import { Icon } from '../Icon';
import { Tooltip } from '../controls/Tooltip';
import type { StyleProp } from './useStyleProp';

const ORIGIN_TEXT: Record<StyleOrigin, string> = {
  local: 'Set on this breakpoint',
  inherited: 'Inherited',
  global: 'From a global style',
  default: 'Not set',
};

/**
 * A labelled control row that always tells you *where the value came from*.
 *
 *   • blue dot   — set at the current breakpoint (an override)
 *   • hollow dot — inherited from a wider breakpoint
 *   • purple dot — coming from a global typography / button style
 *
 * When a value is overridden the label doubles as a reset affordance, so
 * getting back to the inherited value is always one click.
 */
export function PropRow({
  label,
  prop,
  children,
  wide,
  hint,
}: {
  label: string;
  prop?: StyleProp;
  children: ReactNode;
  wide?: boolean;
  hint?: string;
}) {
  const [hover, setHover] = useState(false);
  const origin = prop?.origin ?? 'default';
  const canReset = prop && origin === 'local' && prop.viewport !== 'base';

  const tip =
    origin === 'inherited' && prop?.from
      ? `Inherited from ${BREAKPOINT_LABEL[prop.from]}`
      : canReset
        ? `Overridden on ${BREAKPOINT_LABEL[prop.viewport]} — click to reset`
        : ORIGIN_TEXT[origin];

  return (
    <div className={`row ${wide ? 'wide' : ''}`}>
      <Tooltip label={tip}>
        <div
          className={`row-label origin-${origin}`}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          onClick={() => canReset && prop.clear()}
          style={{ cursor: canReset ? 'pointer' : 'default' }}
        >
          <span className="dot" />
          {canReset && hover ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              <Icon name="reset" size={10} />
              Reset
            </span>
          ) : (
            label
          )}
        </div>
      </Tooltip>
      <div className="row-fields">{children}</div>
      {hint ? <div className="hint" style={{ gridColumn: '2' }}>{hint}</div> : null}
    </div>
  );
}

/** Collapsible group inside a property panel. */
export function Section({
  title,
  children,
  defaultOpen = true,
  actions,
  id,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  actions?: ReactNode;
  id?: string;
}) {
  const key = `dw:sec:${id ?? title}`;
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem(key);
    return saved === null ? defaultOpen : saved === '1';
  });

  const toggle = () => {
    setOpen((o) => {
      localStorage.setItem(key, o ? '0' : '1');
      return !o;
    });
  };

  return (
    <div className="sec">
      {/* The header row is a container, not a button: action buttons live
          alongside the toggle rather than nested inside it. */}
      <div className={`sec-head ${open ? 'is-open' : ''}`}>
        <button type="button" className="sec-head-toggle" onClick={toggle} aria-expanded={open}>
          <Icon name="chevronRight" size={11} className="chev" />
          {title}
        </button>
        {actions ? <span className="sec-head-actions">{actions}</span> : null}
      </div>
      {open ? <div className="sec-body">{children}</div> : null}
    </div>
  );
}
