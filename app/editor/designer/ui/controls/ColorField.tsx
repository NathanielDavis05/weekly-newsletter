import { useRef, useState } from 'react';
import type { ColorToken } from '../../model/types';
import { useDoc } from '../../store/docStore';
import { Icon } from '../Icon';
import { Popover } from './Popover';
import { TextField } from './Fields';

const SWATCHES = [
  '#ffffff', '#f6f7f9', '#e3e6ea', '#98a2b3', '#667085', '#344054', '#16181d', '#000000',
  '#fef3f2', '#fee4e2', '#f97066', '#e2453d', '#b42318', '#7a271a', '#fff6ed', '#fdead7',
  '#f79009', '#dc6803', '#93370d', '#ecfdf3', '#d1fadf', '#32d583', '#12b76a', '#05603a',
  '#eff8ff', '#d1e9ff', '#53b1fd', '#2e90fa', '#175cd3', '#f4f3ff', '#e4e0ff', '#9b8afb',
];

/** Turn a stored value into something displayable. */
function resolveColor(value: string | undefined, tokens: ColorToken[]): { css: string; label: string; token?: ColorToken } {
  if (!value) return { css: 'transparent', label: 'None' };
  const m = /^var\(--([\w-]+)\)$/.exec(value.trim());
  if (m) {
    const token = tokens.find((t) => t.varName === m[1]);
    return token ? { css: token.value, label: token.name, token } : { css: 'transparent', label: value };
  }
  if (value === 'transparent') return { css: 'transparent', label: 'Transparent' };
  if (value === 'inherit' || value === 'currentColor') return { css: 'currentColor', label: value };
  return { css: value, label: value.toLowerCase() };
}

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined, opts?: { mergeKey?: string }) => void;
  allowNone?: boolean;
  compact?: boolean;
}

export function ColorField({ value, onChange, allowNone = true, compact }: Props) {
  const tokens = useDoc((s) => s.doc.theme.colors);
  const [open, setOpen] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const info = resolveColor(value, tokens);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="swatch"
        onClick={() => setOpen(btnRef.current!.getBoundingClientRect())}
      >
        <span className="swatch-chip">
          <i style={{ background: info.css }} />
        </span>
        {!compact ? <span className="swatch-label">{info.label}</span> : null}
        {!compact ? <Icon name="chevronDown" size={10} style={{ opacity: 0.5, flex: 'none' }} /> : null}
      </button>

      {open ? (
        <Popover anchor={open} onClose={() => setOpen(null)} className="pad" width={228}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div className="menu-label" style={{ padding: '0 0 5px' }}>
                Brand colors
              </div>
              <div className="color-grid">
                {tokens.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="color-cell"
                    title={`${t.name} — ${t.value}`}
                    style={{ background: t.value }}
                    onClick={() => {
                      onChange(`var(--${t.varName})`);
                      setOpen(null);
                    }}
                  />
                ))}
              </div>
              <div className="hint" style={{ marginTop: 5 }}>
                Brand colors update everywhere when you change them in Site styles.
              </div>
            </div>

            <div>
              <div className="menu-label" style={{ padding: '0 0 5px' }}>
                Custom
              </div>
              <div className="color-grid">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className="color-cell"
                    title={c}
                    style={{ background: c }}
                    onClick={() => onChange(c)}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(info.css) ? info.css : '#666666'}
                onChange={(e) => onChange(e.target.value, { mergeKey: 'colorpick' })}
                style={{
                  width: 26,
                  height: 26,
                  padding: 0,
                  border: '1px solid var(--ui-border)',
                  borderRadius: 4,
                  background: 'none',
                  cursor: 'pointer',
                  flex: 'none',
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextField
                  value={value ?? ''}
                  onChange={() => {}}
                  onCommit={(v) => onChange(v.trim() || undefined)}
                  placeholder="#000000 or var(--c-primary)"
                  mono
                />
              </div>
            </div>

            {allowNone ? (
              <button
                type="button"
                className="btn block outline sm"
                onClick={() => {
                  onChange(undefined);
                  setOpen(null);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </Popover>
      ) : null}
    </>
  );
}
