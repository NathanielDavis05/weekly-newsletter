import { useState } from 'react';
import { FONT_OPTIONS } from '../../model/theme';
import { BREAKPOINT_LABEL } from '../../model/types';
import type { Breakpoint } from '../../model/types';
import { styleInfo } from '../../engine/styles';
import {
  addColorToken,
  clearTypographyOverride,
  deleteColorToken,
  setButtonHover,
  setButtonStyle,
  setColorToken,
  setContainerWidth,
  setFontFamily,
  setSiteCustomCss,
  setToken,
  setTypographyStyle,
} from '../../store/actions/theme';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { Section } from '../inspector/PropRow';
import { SelectField, Segmented, TextField, UnitField } from '../controls/Fields';
import { ColorField } from '../controls/ColorField';
import { Tooltip } from '../controls/Tooltip';

export function SiteStylesPanel() {
  const theme = useDoc((s) => s.doc.theme);
  const viewport = useEditor((s) => s.viewport);
  const [styleId, setStyleId] = useState('h1');
  const current = theme.typography.find((t) => t.id === styleId) ?? theme.typography[0];

  const tyProp = (prop: string) => {
    const fake = {
      styles: current.styles,
      settings: {},
      textStyle: undefined,
    } as never;
    return styleInfo(fake, prop, viewport, theme);
  };

  const setTy = (prop: string, value: string | undefined, mergeKey?: string) =>
    setTypographyStyle(current.id, { [prop]: value }, viewport, { mergeKey });

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Site styles</span>
        <span className="lrow-sub">{BREAKPOINT_LABEL[viewport]}</span>
      </div>

      <div className="panel-body">
        {/* ---------------- brand colors ---------------- */}
        <Section
          title="Brand colors"
          id="ss-colors"
          actions={
            <Tooltip label="Add a color">
              <button type="button" className="btn icon sm" onClick={() => addColorToken()}>
                <Icon name="plus" size={12} />
              </button>
            </Tooltip>
          }
        >
          {theme.colors.map((c) => (
            <div key={c.id} className="token-row">
              <input
                type="color"
                className="token-swatch"
                value={/^#[0-9a-f]{6}$/i.test(c.value) ? c.value : '#666666'}
                onChange={(e) => setColorToken(c.id, { value: e.target.value })}
                style={{ padding: 0, background: 'none' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <TextField value={c.name} onChange={() => {}} onCommit={(v) => setColorToken(c.id, { name: v })} />
              </div>
              <div style={{ width: 74 }}>
                <TextField value={c.value} onChange={() => {}} onCommit={(v) => setColorToken(c.id, { value: v })} mono />
              </div>
              <button
                type="button"
                className="btn icon sm"
                onClick={() => deleteColorToken(c.id)}
                title="Remove"
                style={{ color: 'var(--ui-text-faint)' }}
              >
                <Icon name="x" size={11} />
              </button>
            </div>
          ))}
          <div className="hint">
            Anything using a brand color updates instantly when you change it here.
          </div>
        </Section>

        {/* ---------------- fonts ---------------- */}
        <Section title="Fonts" id="ss-fonts">
          <div className="row">
            <span className="row-label">Headings</span>
            <SelectField
              value={theme.fontFamilies.heading}
              onChange={(v) => setFontFamily('heading', v)}
              options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </div>
          <div className="row">
            <span className="row-label">Body</span>
            <SelectField
              value={theme.fontFamilies.body}
              onChange={(v) => setFontFamily('body', v)}
              options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            />
          </div>
        </Section>

        {/* ---------------- typography ---------------- */}
        <Section title="Text styles" id="ss-type">
          <div className="row wide">
            <SelectField
              value={styleId}
              onChange={setStyleId}
              options={theme.typography.map((t) => ({ value: t.id, label: t.name }))}
            />
          </div>

          {viewport !== 'base' ? (
            <div className="hint" style={{ color: 'var(--ui-override)' }}>
              Editing the {BREAKPOINT_LABEL[viewport].toLowerCase()} version of {current.name}. Desktop
              stays as it is.
            </div>
          ) : null}

          <TyRow label="Size" prop="fontSize" info={tyProp('fontSize')} styleId={current.id} viewport={viewport}>
            <UnitField
              value={tyProp('fontSize').value}
              onChange={(v, o) => setTy('fontSize', v, o?.mergeKey ?? 'ty-size')}
              icon="heading"
              min={1}
            />
          </TyRow>
          <TyRow label="Weight" prop="fontWeight" info={tyProp('fontWeight')} styleId={current.id} viewport={viewport}>
            <SelectField
              value={tyProp('fontWeight').value}
              onChange={(v) => setTy('fontWeight', v)}
              options={['300', '400', '500', '550', '600', '650', '700', '800'].map((w) => ({ value: w, label: w }))}
              placeholder="—"
            />
          </TyRow>
          <TyRow label="Line height" prop="lineHeight" info={tyProp('lineHeight')} styleId={current.id} viewport={viewport}>
            <UnitField
              value={tyProp('lineHeight').value}
              onChange={(v, o) => setTy('lineHeight', v, o?.mergeKey ?? 'ty-lh')}
              icon="lineHeight"
              units={['', 'px', 'em', '%']}
              defaultUnit=""
              step={0.05}
            />
          </TyRow>
          <TyRow label="Tracking" prop="letterSpacing" info={tyProp('letterSpacing')} styleId={current.id} viewport={viewport}>
            <UnitField
              value={tyProp('letterSpacing').value}
              onChange={(v, o) => setTy('letterSpacing', v, o?.mergeKey ?? 'ty-ls')}
              icon="letterSpacing"
              units={['em', 'px', 'rem']}
              defaultUnit="em"
              step={0.005}
            />
          </TyRow>
          <TyRow label="Color" prop="color" info={tyProp('color')} styleId={current.id} viewport={viewport}>
            <ColorField value={tyProp('color').value} onChange={(v) => setTy('color', v)} />
          </TyRow>
          <TyRow label="Transform" prop="textTransform" info={tyProp('textTransform')} styleId={current.id} viewport={viewport}>
            <SelectField
              value={tyProp('textTransform').value ?? 'none'}
              onChange={(v) => setTy('textTransform', v === 'none' ? undefined : v)}
              options={[
                { value: 'none', label: 'None' },
                { value: 'uppercase', label: 'UPPERCASE' },
                { value: 'lowercase', label: 'lowercase' },
                { value: 'capitalize', label: 'Capitalize' },
              ]}
            />
          </TyRow>
        </Section>

        {/* ---------------- buttons ---------------- */}
        <Section title="Button styles" id="ss-buttons" defaultOpen={false}>
          {theme.buttons.map((b) => (
            <ButtonStyleEditor key={b.id} id={b.id} />
          ))}
        </Section>

        {/* ---------------- tokens ---------------- */}
        <Section title="Corner radius" id="ss-radii" defaultOpen={false}>
          {theme.radii.map((r) => (
            <div key={r.id} className="row">
              <span className="row-label">{r.name}</span>
              <UnitField value={r.value} onChange={(v) => setToken('radii', r.id, { value: v ?? '0px' })} icon="corner" min={0} />
            </div>
          ))}
        </Section>

        <Section title="Shadows" id="ss-shadows" defaultOpen={false}>
          {theme.shadows.map((s) => (
            <div key={s.id} className="row wide">
              <span className="row-label">{s.name}</span>
              <TextField value={s.value} onChange={() => {}} onCommit={(v) => setToken('shadows', s.id, { value: v })} mono />
            </div>
          ))}
        </Section>

        <Section title="Spacing scale" id="ss-spacing" defaultOpen={false}>
          {theme.spacing.map((s) => (
            <div key={s.id} className="row">
              <span className="row-label">{s.name}</span>
              <UnitField value={s.value} onChange={(v) => setToken('spacing', s.id, { value: v ?? '0px' })} icon="gap" min={0} />
            </div>
          ))}
        </Section>

        <Section title="Container widths" id="ss-widths" defaultOpen={false}>
          {(['narrow', 'normal', 'wide'] as const).map((k) => (
            <div key={k} className="row">
              <span className="row-label" style={{ textTransform: 'capitalize' }}>
                {k}
              </span>
              <UnitField
                value={theme.containerWidths[k]}
                onChange={(v) => setContainerWidth(k, v ?? '1120px')}
                icon="maxWidth"
                min={200}
              />
            </div>
          ))}
        </Section>

        <Section title="Custom CSS" id="ss-css" defaultOpen={false}>
          <textarea
            className="textarea code"
            defaultValue={theme.customCss ?? ''}
            placeholder={'.my-class {\n  letter-spacing: -0.01em;\n}'}
            style={{ minHeight: 120 }}
            onBlur={(e) => setSiteCustomCss(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <div className="hint">Applied site-wide, after all generated styles.</div>
        </Section>
      </div>
    </>
  );
}

function TyRow({
  label,
  prop,
  info,
  styleId,
  viewport,
  children,
}: {
  label: string;
  prop: string;
  info: { origin: string };
  styleId: string;
  viewport: Breakpoint;
  children: React.ReactNode;
}) {
  const canReset = info.origin === 'local' && viewport !== 'base';
  return (
    <div className="row">
      <Tooltip label={canReset ? `Overridden on ${BREAKPOINT_LABEL[viewport]} — click to reset` : 'Inherited'}>
        <div
          className={`row-label origin-${info.origin}`}
          style={{ cursor: canReset ? 'pointer' : 'default' }}
          onClick={() => canReset && clearTypographyOverride(styleId, [prop], viewport)}
        >
          <span className="dot" />
          {label}
        </div>
      </Tooltip>
      <div className="row-fields">{children}</div>
    </div>
  );
}

function ButtonStyleEditor({ id }: { id: string }) {
  const btn = useDoc((s) => s.doc.theme.buttons.find((b) => b.id === id));
  const viewport = useEditor((s) => s.viewport);
  const [open, setOpen] = useState(false);
  if (!btn) return null;

  const base = { ...btn.styles.base, ...(viewport !== 'base' ? btn.styles[viewport] : {}) };
  const set = (patch: Record<string, string | undefined>, mergeKey?: string) =>
    setButtonStyle(btn.id, patch, viewport, { mergeKey });

  return (
    <div style={{ border: '1px solid var(--ui-border)', borderRadius: 5, padding: 6, marginBottom: 5 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 22,
            padding: '0 10px',
            borderRadius: base.borderRadius ?? '6px',
            background: base.backgroundColor ?? 'transparent',
            color: base.color ?? 'var(--ui-text)',
            border: base.border && base.border !== 'none' ? '1px solid var(--ui-border-strong)' : 'none',
            fontSize: 10.5,
            fontWeight: 600,
          }}
        >
          {btn.name}
        </span>
        <span style={{ flex: 1 }} />
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={11} style={{ color: 'var(--ui-text-faint)' }} />
      </button>

      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
          <div className="row">
            <span className="row-label">Background</span>
            <ColorField value={base.backgroundColor} onChange={(v) => set({ backgroundColor: v })} />
          </div>
          <div className="row">
            <span className="row-label">Text</span>
            <ColorField value={base.color} onChange={(v) => set({ color: v })} />
          </div>
          <div className="row">
            <span className="row-label">Radius</span>
            <UnitField value={base.borderRadius} onChange={(v, o) => set({ borderRadius: v }, o?.mergeKey ?? 'btnr')} icon="corner" min={0} />
          </div>
          <div className="row split">
            <span className="row-label">Padding</span>
            <UnitField
              value={base.paddingTop}
              onChange={(v, o) => set({ paddingTop: v, paddingBottom: v }, o?.mergeKey ?? 'btnpv')}
              label="Y"
              min={0}
            />
            <UnitField
              value={base.paddingLeft}
              onChange={(v, o) => set({ paddingLeft: v, paddingRight: v }, o?.mergeKey ?? 'btnph')}
              label="X"
              min={0}
            />
          </div>
          <div className="row">
            <span className="row-label">Size</span>
            <UnitField value={base.fontSize} onChange={(v, o) => set({ fontSize: v }, o?.mergeKey ?? 'btnfs')} icon="heading" min={8} />
          </div>
          <div className="row">
            <span className="row-label">Weight</span>
            <Segmented
              value={base.fontWeight ?? '550'}
              onChange={(v) => set({ fontWeight: v })}
              options={[
                { value: '400', label: 'R' },
                { value: '550', label: 'M' },
                { value: '700', label: 'B' },
              ]}
            />
          </div>
          <div className="row">
            <span className="row-label">Hover bg</span>
            <ColorField value={btn.hover.backgroundColor} onChange={(v) => setButtonHover(btn.id, { backgroundColor: v })} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
