import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { formatValue, parseValue } from '../../engine/styles';
import { Icon, type IconName } from '../Icon';
import { Tooltip } from './Tooltip';

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

interface TextFieldProps {
  value: string;
  onChange: (v: string) => void;
  onCommit?: (v: string) => void;
  placeholder?: string;
  icon?: IconName;
  mono?: boolean;
  disabled?: boolean;
  selectOnFocus?: boolean;
}

export function TextField({ value, onChange, onCommit, placeholder, icon, mono, disabled, selectOnFocus }: TextFieldProps) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  return (
    <div className="field">
      {icon ? (
        <span className="prefix" style={{ cursor: 'default' }}>
          <Icon name={icon} size={12} />
        </span>
      ) : null}
      <input
        value={local}
        disabled={disabled}
        placeholder={placeholder}
        style={mono ? { fontFamily: 'var(--font-mono)', fontSize: 11 } : undefined}
        onFocus={(e) => {
          focused.current = true;
          if (selectOnFocus) e.currentTarget.select();
        }}
        onChange={(e) => {
          setLocal(e.target.value);
          onChange(e.target.value);
        }}
        onBlur={() => {
          focused.current = false;
          onCommit?.(local);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            onCommit?.(local);
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Number with unit + scrub                                            */
/* ------------------------------------------------------------------ */

interface UnitFieldProps {
  value: string | undefined;
  onChange: (v: string | undefined, opts?: { mergeKey?: string }) => void;
  units?: string[];
  defaultUnit?: string;
  placeholder?: string;
  icon?: IconName;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  isOverride?: boolean;
  allowAuto?: boolean;
  disabled?: boolean;
}

const DEFAULT_UNITS = ['px', '%', 'rem', 'em', 'vw', 'vh'];

/**
 * The workhorse of the inspector. Typing accepts bare numbers or full CSS
 * values; the prefix is a scrub handle; arrow keys nudge (shift ×10).
 */
export function UnitField({
  value,
  onChange,
  units = DEFAULT_UNITS,
  defaultUnit = 'px',
  placeholder = '—',
  icon,
  label,
  min,
  max,
  step = 1,
  isOverride,
  allowAuto,
  disabled,
}: UnitFieldProps) {
  const parsed = parseValue(value, defaultUnit);
  const [draft, setDraft] = useState<string | null>(null);
  const scrubbing = useRef(false);

  const unitList = allowAuto ? [...units, 'auto'] : units;
  const display = draft ?? (parsed.num !== null ? String(parsed.num) : parsed.raw === 'auto' ? 'auto' : '');

  const commit = (raw: string) => {
    const text = raw.trim();
    setDraft(null);
    if (text === '') return onChange(undefined);
    if (text === 'auto' || text === 'none') return onChange(text);
    const p = parseValue(text, parsed.unit || defaultUnit);
    if (p.num === null) return onChange(text);
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, p.num));
    onChange(formatValue(clamped, p.unit || parsed.unit || defaultUnit));
  };

  const nudge = (delta: number) => {
    const base = parsed.num ?? 0;
    const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, base + delta));
    onChange(formatValue(next, parsed.unit || defaultUnit), { mergeKey: `nudge:${label ?? icon ?? 'v'}` });
  };

  const startScrub = (e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    scrubbing.current = true;
    const startX = e.clientX;
    const startVal = parsed.num ?? 0;
    const unit = parsed.unit || defaultUnit;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const mult = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
      const next = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, startVal + dx * step * mult));
      onChange(formatValue(Math.round(next * 100) / 100, unit), { mergeKey: `scrub:${label ?? icon ?? 'v'}` });
    };
    const onUp = () => {
      scrubbing.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.classList.remove('is-resizing-global');
    };
    document.body.classList.add('is-resizing-global');
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const prefix = icon ? <Icon name={icon} size={12} /> : label ? <span>{label}</span> : null;

  return (
    <div className={`field ${isOverride ? 'is-override' : ''}`}>
      {prefix ? (
        <Tooltip label="Drag to adjust">
          <span className="prefix" onPointerDown={startScrub}>
            {prefix}
          </span>
        </Tooltip>
      ) : null}
      <input
        value={display}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="decimal"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            commit((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nudge(e.shiftKey ? 10 : step);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(-(e.shiftKey ? 10 : step));
          } else if (e.key === 'Escape') {
            setDraft(null);
            (e.target as HTMLInputElement).blur();
          }
        }}
      />
      {unitList.length > 1 ? (
        <select
          className="unit"
          value={parsed.unit || defaultUnit}
          disabled={disabled}
          onChange={(e) => {
            const u = e.target.value;
            if (u === 'auto') return onChange('auto');
            onChange(formatValue(parsed.num ?? 0, u));
          }}
        >
          {unitList.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      ) : (
        <span className="unit" style={{ pointerEvents: 'none' }}>
          {unitList[0]}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Select                                                              */
/* ------------------------------------------------------------------ */

interface SelectFieldProps<T extends string> {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}

export function SelectField<T extends string>({ value, onChange, options, placeholder, disabled }: SelectFieldProps<T>) {
  return (
    <div className="select">
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={11} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented                                                           */
/* ------------------------------------------------------------------ */

interface SegmentedProps<T extends string> {
  value: T | undefined;
  onChange: (v: T) => void;
  options: { value: T; label?: string; icon?: IconName; tip?: string }[];
  stretch?: boolean;
}

export function Segmented<T extends string>({ value, onChange, options, stretch }: SegmentedProps<T>) {
  return (
    <div className={`segmented ${stretch ? 'stretch' : ''}`}>
      {options.map((o) => {
        const btn = (
          <button
            key={o.value}
            type="button"
            className={value === o.value ? 'is-active' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.icon ? <Icon name={o.icon} size={13} /> : null}
            {o.label ? <span>{o.label}</span> : null}
          </button>
        );
        return o.tip ? (
          <Tooltip key={o.value} label={o.tip}>
            {btn}
          </Tooltip>
        ) : (
          btn
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Checkbox                                                            */
/* ------------------------------------------------------------------ */

export function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
