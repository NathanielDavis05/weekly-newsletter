import { parseValue } from '../../engine/styles';
import type { Breakpoint, ElementNode } from '../../model/types';
import { setHidden, setTextStyle } from '../../store/actions/elements';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { ColorField } from '../controls/ColorField';
import { Check, SelectField, Segmented, TextField, UnitField } from '../controls/Fields';
import { Tooltip } from '../controls/Tooltip';
import { BoxModel } from './BoxModel';
import { PropRow, Section } from './PropRow';
import { useStyleProp } from './useStyleProp';

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function LayoutSection() {
  const display = useStyleProp('display');
  const direction = useStyleProp('flexDirection');
  const justify = useStyleProp('justifyContent');
  const align = useStyleProp('alignItems');
  const wrap = useStyleProp('flexWrap');
  const gap = useStyleProp('gap');
  const cols = useStyleProp('gridTemplateColumns');
  const rows = useStyleProp('gridTemplateRows');

  const mode = display.value?.includes('grid') ? 'grid' : display.value?.includes('flex') ? 'flex' : display.value ?? 'block';
  const isRow = (direction.value ?? 'row').startsWith('row');

  const colCount = (() => {
    const m = /repeat\((\d+)/.exec(cols.value ?? '');
    if (m) return Number(m[1]);
    return cols.value ? cols.value.trim().split(/\s+/).length : 1;
  })();

  return (
    <Section title="Layout" id="i-layout">
      <PropRow label="Display" prop={display}>
        <Segmented
          value={mode}
          onChange={(v) => {
            if (v === 'flex') display.set('flex');
            else if (v === 'grid') display.set('grid');
            else display.set('block');
          }}
          options={[
            { value: 'block', icon: 'section', tip: 'Block' },
            { value: 'flex', icon: 'flex', tip: 'Flex — arrange children in a row or column' },
            { value: 'grid', icon: 'grid', tip: 'Grid — arrange children in columns and rows' },
          ]}
          stretch
        />
      </PropRow>

      {mode === 'flex' ? (
        <>
          <PropRow label="Direction" prop={direction}>
            <Segmented
              value={isRow ? 'row' : 'column'}
              onChange={(v) => direction.set(v)}
              options={[
                { value: 'row', icon: 'row', tip: 'Horizontal' },
                { value: 'column', icon: 'stack', tip: 'Vertical' },
              ]}
              stretch
            />
          </PropRow>

          <PropRow label={isRow ? 'Horizontal' : 'Vertical'} prop={justify}>
            <Segmented
              value={justify.value ?? 'flex-start'}
              onChange={(v) => justify.set(v)}
              options={[
                { value: 'flex-start', icon: isRow ? 'alignLeft' : 'alignTop', tip: 'Start' },
                { value: 'center', icon: isRow ? 'alignCenterH' : 'alignMiddle', tip: 'Center' },
                { value: 'flex-end', icon: isRow ? 'alignRight' : 'alignBottom', tip: 'End' },
                { value: 'space-between', icon: 'spaceBetween', tip: 'Space between' },
                { value: 'space-around', icon: 'spaceAround', tip: 'Space around' },
              ]}
              stretch
            />
          </PropRow>

          <PropRow label={isRow ? 'Vertical' : 'Horizontal'} prop={align}>
            <Segmented
              value={align.value ?? 'stretch'}
              onChange={(v) => align.set(v)}
              options={[
                { value: 'flex-start', icon: isRow ? 'alignTop' : 'alignLeft', tip: 'Start' },
                { value: 'center', icon: isRow ? 'alignMiddle' : 'alignCenterH', tip: 'Center' },
                { value: 'flex-end', icon: isRow ? 'alignBottom' : 'alignRight', tip: 'End' },
                { value: 'stretch', icon: 'alignStretch', tip: 'Stretch' },
              ]}
              stretch
            />
          </PropRow>

          <PropRow label="Wrap" prop={wrap}>
            <Segmented
              value={wrap.value ?? 'nowrap'}
              onChange={(v) => wrap.set(v)}
              options={[
                { value: 'nowrap', label: 'No wrap' },
                { value: 'wrap', label: 'Wrap' },
              ]}
              stretch
            />
          </PropRow>
        </>
      ) : null}

      {mode === 'grid' ? (
        <>
          <PropRow label="Columns" prop={cols}>
            <div className="row-fields" style={{ width: '100%' }}>
              <UnitField
                value={String(colCount)}
                onChange={(v) => {
                  const n = Math.max(1, Math.min(12, Math.round(parseValue(v, '').num ?? 1)));
                  cols.set(`repeat(${n}, minmax(0, 1fr))`);
                }}
                units={['']}
                defaultUnit=""
                icon="columns"
                min={1}
                max={12}
              />
            </div>
          </PropRow>
          <PropRow label="Custom" prop={cols}>
            <TextField
              value={cols.value ?? ''}
              onChange={() => {}}
              onCommit={(v) => cols.set(v || undefined)}
              placeholder="repeat(3, minmax(0, 1fr))"
              mono
            />
          </PropRow>
          <PropRow label="Rows" prop={rows}>
            <TextField
              value={rows.value ?? ''}
              onChange={() => {}}
              onCommit={(v) => rows.set(v || undefined)}
              placeholder="auto"
              mono
            />
          </PropRow>
          <PropRow label="Align" prop={align}>
            <Segmented
              value={align.value ?? 'stretch'}
              onChange={(v) => align.set(v)}
              options={[
                { value: 'start', icon: 'alignTop', tip: 'Start' },
                { value: 'center', icon: 'alignMiddle', tip: 'Center' },
                { value: 'end', icon: 'alignBottom', tip: 'End' },
                { value: 'stretch', icon: 'alignStretch', tip: 'Stretch' },
              ]}
              stretch
            />
          </PropRow>
        </>
      ) : null}

      {mode === 'flex' || mode === 'grid' ? (
        <PropRow label="Gap" prop={gap}>
          <UnitField value={gap.value} onChange={(v, o) => gap.set(v, { mergeKey: o?.mergeKey ?? 'gap' })} icon="gap" min={0} />
        </PropRow>
      ) : null}
    </Section>
  );
}

/** Shown when the selected element sits inside a grid. */
export function GridChildSection() {
  const colSpan = useStyleProp('gridColumn');
  const rowSpan = useStyleProp('gridRow');

  return (
    <Section title="Grid position" id="i-gridchild" defaultOpen={false}>
      <PropRow label="Column" prop={colSpan}>
        <TextField
          value={colSpan.value ?? ''}
          onChange={() => {}}
          onCommit={(v) => colSpan.set(v || undefined)}
          placeholder="span 1"
          mono
        />
      </PropRow>
      <PropRow label="Row" prop={rowSpan}>
        <TextField
          value={rowSpan.value ?? ''}
          onChange={() => {}}
          onCommit={(v) => rowSpan.set(v || undefined)}
          placeholder="span 1"
          mono
        />
      </PropRow>
      <div className="hint">Use “span 2” to make this element cover two tracks.</div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Size                                                                */
/* ------------------------------------------------------------------ */

export function SizeSection({ node }: { node: ElementNode }) {
  const width = useStyleProp('width');
  const height = useStyleProp('height');
  const minW = useStyleProp('minWidth');
  const maxW = useStyleProp('maxWidth');
  const minH = useStyleProp('minHeight');
  const maxH = useStyleProp('maxHeight');
  const flexGrow = useStyleProp('flexGrow');
  const overflow = useStyleProp('overflow');
  const aspect = useStyleProp('aspectRatio');

  const presets = [
    { label: 'Auto', apply: () => width.set(undefined) },
    { label: 'Fill', apply: () => width.set('100%') },
    { label: 'Fit', apply: () => width.set('fit-content') },
  ];

  return (
    <Section title="Size" id="i-size">
      <PropRow label="Width" prop={width}>
        <UnitField
          value={width.value}
          onChange={(v, o) => width.set(v, { mergeKey: o?.mergeKey ?? 'w' })}
          icon="arrowRight"
          allowAuto
          min={0}
        />
      </PropRow>
      <div className="row">
        <span className="row-label" />
        <div className="row-fields">
          {presets.map((p) => (
            <button key={p.label} type="button" className="btn sm outline" style={{ flex: 1 }} onClick={p.apply}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <PropRow label="Height" prop={height}>
        <UnitField
          value={height.value}
          onChange={(v, o) => height.set(v, { mergeKey: o?.mergeKey ?? 'h' })}
          icon="arrowDown"
          allowAuto
          min={0}
        />
      </PropRow>

      <div className="row split">
        <span className="row-label">Min</span>
        <UnitField value={minW.value} onChange={(v, o) => minW.set(v, { mergeKey: o?.mergeKey ?? 'minw' })} label="W" min={0} isOverride={minW.origin === 'local' && minW.viewport !== 'base'} />
        <UnitField value={minH.value} onChange={(v, o) => minH.set(v, { mergeKey: o?.mergeKey ?? 'minh' })} label="H" min={0} isOverride={minH.origin === 'local' && minH.viewport !== 'base'} />
      </div>
      <div className="row split">
        <span className="row-label">Max</span>
        <UnitField value={maxW.value} onChange={(v, o) => maxW.set(v, { mergeKey: o?.mergeKey ?? 'maxw' })} label="W" min={0} isOverride={maxW.origin === 'local' && maxW.viewport !== 'base'} />
        <UnitField value={maxH.value} onChange={(v, o) => maxH.set(v, { mergeKey: o?.mergeKey ?? 'maxh' })} label="H" min={0} isOverride={maxH.origin === 'local' && maxH.viewport !== 'base'} />
      </div>

      <PropRow label="Aspect" prop={aspect}>
        <TextField value={aspect.value ?? ''} onChange={() => {}} onCommit={(v) => aspect.set(v || undefined)} placeholder="16 / 9" mono />
      </PropRow>

      <PropRow label="Grow" prop={flexGrow}>
        <Segmented
          value={flexGrow.value ?? '0'}
          onChange={(v) => flexGrow.set(v === '0' ? undefined : v)}
          options={[
            { value: '0', label: 'Fixed' },
            { value: '1', label: 'Fill space' },
          ]}
          stretch
        />
      </PropRow>

      {node.children.length || node.type === 'image' ? (
        <PropRow label="Overflow" prop={overflow}>
          <SelectField
            value={overflow.value ?? 'visible'}
            onChange={(v) => overflow.set(v === 'visible' ? undefined : v)}
            options={[
              { value: 'visible', label: 'Visible' },
              { value: 'hidden', label: 'Hidden' },
              { value: 'auto', label: 'Auto' },
              { value: 'scroll', label: 'Scroll' },
            ]}
          />
        </PropRow>
      ) : null}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Spacing                                                             */
/* ------------------------------------------------------------------ */

export function SpacingSection() {
  return (
    <Section title="Spacing" id="i-spacing">
      <BoxModel />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

export function TypographySection({ node }: { node: ElementNode }) {
  const typography = useDoc((s) => s.doc.theme.typography);
  const selection = useEditor((s) => s.selection);

  const size = useStyleProp('fontSize');
  const weight = useStyleProp('fontWeight');
  const lineHeight = useStyleProp('lineHeight');
  const tracking = useStyleProp('letterSpacing');
  const color = useStyleProp('color');
  const align = useStyleProp('textAlign');
  const transform = useStyleProp('textTransform');
  const decoration = useStyleProp('textDecoration');
  const fontStyle = useStyleProp('fontStyle');
  const maxWidth = useStyleProp('maxWidth');
  const family = useStyleProp('fontFamily');

  const italic = fontStyle.value === 'italic';
  const underline = (decoration.value ?? '').includes('underline');
  const strike = (decoration.value ?? '').includes('line-through');

  const toggleDecoration = (which: 'underline' | 'line-through') => {
    const cur = new Set((decoration.value ?? '').split(/\s+/).filter(Boolean).filter((x) => x !== 'none'));
    if (cur.has(which)) cur.delete(which);
    else cur.add(which);
    decoration.set(cur.size ? [...cur].join(' ') : 'none');
  };

  return (
    <Section title="Typography" id="i-type">
      <div className="row">
        <span className="row-label">
          Style
          {node.textStyle ? <span className="badge-pill global">Global</span> : null}
        </span>
        <SelectField
          value={node.textStyle ?? ''}
          onChange={(v) => setTextStyle(selection, v || undefined)}
          options={[{ value: '', label: 'None (custom)' }, ...typography.map((t) => ({ value: t.id, label: t.name }))]}
        />
      </div>
      {node.textStyle ? (
        <div className="hint">
          Following <strong>{typography.find((t) => t.id === node.textStyle)?.name}</strong>. Anything you
          change below overrides it for this element only.
        </div>
      ) : null}

      <PropRow label="Font" prop={family}>
        <SelectField
          value={family.value ?? ''}
          onChange={(v) => family.set(v || undefined)}
          options={[
            { value: '', label: 'Inherit' },
            { value: 'var(--font-heading)', label: 'Heading font' },
            { value: 'var(--font-body)', label: 'Body font' },
            { value: 'var(--font-mono)', label: 'Mono font' },
          ]}
        />
      </PropRow>

      <PropRow label="Size" prop={size}>
        <UnitField value={size.value} onChange={(v, o) => size.set(v, { mergeKey: o?.mergeKey ?? 'fs' })} icon="heading" min={1} isOverride={size.origin === 'local' && size.viewport !== 'base'} />
      </PropRow>

      <PropRow label="Weight" prop={weight}>
        <SelectField
          value={weight.value ?? ''}
          onChange={(v) => weight.set(v || undefined)}
          options={[
            { value: '', label: 'Inherit' },
            ...['300', '400', '500', '550', '600', '650', '700', '800'].map((w) => ({ value: w, label: w })),
          ]}
        />
      </PropRow>

      <div className="row split">
        <span className="row-label">Spacing</span>
        <UnitField
          value={lineHeight.value}
          onChange={(v, o) => lineHeight.set(v, { mergeKey: o?.mergeKey ?? 'lh' })}
          icon="lineHeight"
          units={['', 'px', 'em', '%']}
          defaultUnit=""
          step={0.05}
        />
        <UnitField
          value={tracking.value}
          onChange={(v, o) => tracking.set(v, { mergeKey: o?.mergeKey ?? 'ls' })}
          icon="letterSpacing"
          units={['em', 'px', 'rem']}
          defaultUnit="em"
          step={0.005}
        />
      </div>

      <PropRow label="Color" prop={color}>
        <ColorField value={color.value} onChange={(v) => color.set(v)} />
      </PropRow>

      <PropRow label="Align" prop={align}>
        <Segmented
          value={align.value ?? 'left'}
          onChange={(v) => align.set(v === 'left' ? undefined : v)}
          options={[
            { value: 'left', icon: 'alignLeft', tip: 'Left' },
            { value: 'center', icon: 'alignCenterH', tip: 'Center' },
            { value: 'right', icon: 'alignRight', tip: 'Right' },
            { value: 'justify', icon: 'text', tip: 'Justify' },
          ]}
          stretch
        />
      </PropRow>

      <div className="row">
        <span className="row-label">Format</span>
        <div className="row-fields">
          <div className="segmented stretch">
            <Tooltip label="Italic">
              <button type="button" className={italic ? 'is-active' : ''} onClick={() => fontStyle.set(italic ? undefined : 'italic')}>
                <Icon name="italic" size={12} />
              </button>
            </Tooltip>
            <Tooltip label="Underline">
              <button type="button" className={underline ? 'is-active' : ''} onClick={() => toggleDecoration('underline')}>
                <Icon name="underline" size={12} />
              </button>
            </Tooltip>
            <Tooltip label="Strikethrough">
              <button type="button" className={strike ? 'is-active' : ''} onClick={() => toggleDecoration('line-through')}>
                <Icon name="strike" size={12} />
              </button>
            </Tooltip>
            <Tooltip label="Uppercase">
              <button
                type="button"
                className={transform.value === 'uppercase' ? 'is-active' : ''}
                onClick={() => transform.set(transform.value === 'uppercase' ? undefined : 'uppercase')}
              >
                <Icon name="caseUpper" size={12} />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>

      <PropRow label="Max width" prop={maxWidth}>
        <UnitField
          value={maxWidth.value}
          onChange={(v, o) => maxWidth.set(v, { mergeKey: o?.mergeKey ?? 'mw' })}
          icon="maxWidth"
          units={['px', 'ch', '%', 'rem']}
          min={0}
        />
      </PropRow>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Background                                                          */
/* ------------------------------------------------------------------ */

export function BackgroundSection() {
  const bg = useStyleProp('backgroundColor');
  const image = useStyleProp('backgroundImage');
  const size = useStyleProp('backgroundSize');
  const position = useStyleProp('backgroundPosition');
  const repeat = useStyleProp('backgroundRepeat');
  const opacity = useStyleProp('opacity');

  const isGradient = (image.value ?? '').includes('gradient');
  const urlValue = (() => {
    const m = /url\(["']?(.*?)["']?\)/.exec(image.value ?? '');
    return m ? m[1] : '';
  })();

  return (
    <Section title="Background" id="i-bg">
      <PropRow label="Color" prop={bg}>
        <ColorField value={bg.value} onChange={(v) => bg.set(v)} />
      </PropRow>

      <PropRow label="Image" prop={image}>
        <TextField
          value={urlValue}
          onChange={() => {}}
          onCommit={(v) => image.set(v ? `url("${v}")` : undefined)}
          placeholder="Image URL"
        />
      </PropRow>

      <div className="row">
        <span className="row-label">Gradient</span>
        <div className="row-fields">
          <button
            type="button"
            className={`btn sm outline ${isGradient ? 'is-active' : ''}`}
            style={{ flex: 1 }}
            onClick={() =>
              image.set(
                isGradient ? undefined : 'linear-gradient(135deg, var(--c-primary), var(--c-accent))',
              )
            }
          >
            {isGradient ? 'Remove gradient' : 'Add gradient'}
          </button>
        </div>
      </div>
      {isGradient ? (
        <div className="row wide">
          <TextField value={image.value ?? ''} onChange={() => {}} onCommit={(v) => image.set(v || undefined)} mono />
        </div>
      ) : null}

      {image.value ? (
        <>
          <PropRow label="Fit" prop={size}>
            <SelectField
              value={size.value ?? 'cover'}
              onChange={(v) => size.set(v)}
              options={[
                { value: 'cover', label: 'Cover' },
                { value: 'contain', label: 'Contain' },
                { value: 'auto', label: 'Original' },
                { value: '100% 100%', label: 'Stretch' },
              ]}
            />
          </PropRow>
          <PropRow label="Position" prop={position}>
            <SelectField
              value={position.value ?? 'center'}
              onChange={(v) => position.set(v)}
              options={['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].map(
                (p) => ({ value: p, label: p }),
              )}
            />
          </PropRow>
          <PropRow label="Repeat" prop={repeat}>
            <SelectField
              value={repeat.value ?? 'no-repeat'}
              onChange={(v) => repeat.set(v)}
              options={[
                { value: 'no-repeat', label: 'No repeat' },
                { value: 'repeat', label: 'Tile' },
                { value: 'repeat-x', label: 'Tile X' },
                { value: 'repeat-y', label: 'Tile Y' },
              ]}
            />
          </PropRow>
        </>
      ) : null}

      <PropRow label="Opacity" prop={opacity}>
        <UnitField
          value={opacity.value}
          onChange={(v, o) => opacity.set(v, { mergeKey: o?.mergeKey ?? 'op' })}
          units={['']}
          defaultUnit=""
          icon="opacity"
          min={0}
          max={1}
          step={0.02}
        />
      </PropRow>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Border                                                              */
/* ------------------------------------------------------------------ */

export function BorderSection() {
  const radius = useStyleProp('borderRadius');
  const width = useStyleProp('borderWidth');
  const style = useStyleProp('borderStyle');
  const color = useStyleProp('borderColor');
  const shorthand = useStyleProp('border');

  // Elements created with the `border` shorthand are normalised on first edit
  // so the individual controls stay authoritative.
  const splitShorthand = () => {
    const v = shorthand.value;
    if (!v || v === 'none') return;
    const m = /^(\S+)\s+(\S+)\s+(.+)$/.exec(v.trim());
    if (m) {
      width.set(m[1]);
      style.set(m[2]);
      color.set(m[3]);
    }
    shorthand.set(undefined);
  };

  return (
    <Section title="Border" id="i-border">
      <PropRow label="Radius" prop={radius}>
        <UnitField value={radius.value} onChange={(v, o) => radius.set(v, { mergeKey: o?.mergeKey ?? 'br' })} icon="corner" min={0} />
      </PropRow>

      {shorthand.value && shorthand.value !== 'none' ? (
        <div className="row wide">
          <button type="button" className="btn sm outline block" onClick={splitShorthand}>
            <Icon name="settings" size={11} /> Edit border ({shorthand.value})
          </button>
        </div>
      ) : (
        <>
          <PropRow label="Width" prop={width}>
            <UnitField value={width.value} onChange={(v, o) => width.set(v, { mergeKey: o?.mergeKey ?? 'bw' })} icon="frame" min={0} />
          </PropRow>
          <PropRow label="Style" prop={style}>
            <SelectField
              value={style.value ?? 'solid'}
              onChange={(v) => style.set(v)}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
                { value: 'none', label: 'None' },
              ]}
            />
          </PropRow>
          <PropRow label="Color" prop={color}>
            <ColorField value={color.value} onChange={(v) => color.set(v)} />
          </PropRow>
        </>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Effects                                                             */
/* ------------------------------------------------------------------ */

const SHADOW_PRESETS = [
  { label: 'None', value: 'none' },
  { label: 'Subtle', value: 'var(--shadow-sm)' },
  { label: 'Medium', value: 'var(--shadow-md)' },
  { label: 'Large', value: 'var(--shadow-lg)' },
];

export function EffectsSection() {
  const shadow = useStyleProp('boxShadow');
  const textShadow = useStyleProp('textShadow');
  const filter = useStyleProp('filter');
  const backdrop = useStyleProp('backdropFilter');

  const blurValue = (() => {
    const m = /blur\(([\d.]+)px\)/.exec(filter.value ?? '');
    return m ? m[1] : '';
  })();

  return (
    <Section title="Effects" id="i-effects" defaultOpen={false}>
      <PropRow label="Shadow" prop={shadow}>
        <SelectField
          value={SHADOW_PRESETS.some((p) => p.value === shadow.value) ? shadow.value ?? 'none' : 'custom'}
          onChange={(v) => shadow.set(v === 'none' ? undefined : v)}
          options={[...SHADOW_PRESETS, { value: 'custom', label: 'Custom…' }]}
        />
      </PropRow>
      {shadow.value && !SHADOW_PRESETS.some((p) => p.value === shadow.value) ? (
        <div className="row wide">
          <TextField value={shadow.value ?? ''} onChange={() => {}} onCommit={(v) => shadow.set(v || undefined)} mono />
        </div>
      ) : null}

      <PropRow label="Text shadow" prop={textShadow}>
        <TextField
          value={textShadow.value ?? ''}
          onChange={() => {}}
          onCommit={(v) => textShadow.set(v || undefined)}
          placeholder="0 1px 2px rgba(0,0,0,.2)"
          mono
        />
      </PropRow>

      <PropRow label="Blur" prop={filter}>
        <UnitField
          value={blurValue ? `${blurValue}px` : undefined}
          onChange={(v, o) => filter.set(v ? `blur(${v})` : undefined, { mergeKey: o?.mergeKey ?? 'blur' })}
          icon="blur"
          min={0}
          max={40}
        />
      </PropRow>

      <PropRow label="Backdrop" prop={backdrop}>
        <TextField
          value={backdrop.value ?? ''}
          onChange={() => {}}
          onCommit={(v) => backdrop.set(v || undefined)}
          placeholder="blur(12px)"
          mono
        />
      </PropRow>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Position                                                            */
/* ------------------------------------------------------------------ */

export function PositionSection() {
  const position = useStyleProp('position');
  const top = useStyleProp('top');
  const right = useStyleProp('right');
  const bottom = useStyleProp('bottom');
  const left = useStyleProp('left');
  const z = useStyleProp('zIndex');

  const mode = position.value ?? 'static';
  const showOffsets = mode !== 'static';

  return (
    <Section title="Position" id="i-position" defaultOpen={false}>
      <PropRow label="Type" prop={position}>
        <SelectField
          value={mode}
          onChange={(v) => position.set(v === 'static' ? undefined : v)}
          options={[
            { value: 'static', label: 'In flow (default)' },
            { value: 'relative', label: 'Relative' },
            { value: 'absolute', label: 'Absolute' },
            { value: 'sticky', label: 'Sticky' },
            { value: 'fixed', label: 'Fixed' },
          ]}
        />
      </PropRow>

      {showOffsets ? (
        <>
          <div className="row split">
            <span className="row-label">Offset</span>
            <UnitField value={top.value} onChange={(v, o) => top.set(v, { mergeKey: o?.mergeKey ?? 'top' })} label="T" allowAuto />
            <UnitField value={right.value} onChange={(v, o) => right.set(v, { mergeKey: o?.mergeKey ?? 'right' })} label="R" allowAuto />
          </div>
          <div className="row split">
            <span className="row-label" />
            <UnitField value={bottom.value} onChange={(v, o) => bottom.set(v, { mergeKey: o?.mergeKey ?? 'bottom' })} label="B" allowAuto />
            <UnitField value={left.value} onChange={(v, o) => left.set(v, { mergeKey: o?.mergeKey ?? 'left' })} label="L" allowAuto />
          </div>
        </>
      ) : null}

      <PropRow label="Z-index" prop={z}>
        <UnitField value={z.value} onChange={(v) => z.set(v)} units={['']} defaultUnit="" icon="zIndex" />
      </PropRow>

      {mode === 'absolute' ? (
        <div className="hint">
          Absolute elements position against their nearest relative ancestor. Set the parent to Relative
          for predictable placement.
        </div>
      ) : null}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Responsive visibility                                               */
/* ------------------------------------------------------------------ */

export function VisibilitySection({ node }: { node: ElementNode }) {
  const selection = useEditor((s) => s.selection);
  const setHiddenAt = (bp: Breakpoint, value: boolean | undefined) => setHidden(selection, bp, value);

  const rows: { bp: 'base' | 'tablet' | 'mobile'; label: string; icon: 'desktop' | 'tablet' | 'mobile' }[] = [
    { bp: 'base', label: 'Desktop', icon: 'desktop' },
    { bp: 'tablet', label: 'Tablet', icon: 'tablet' },
    { bp: 'mobile', label: 'Mobile', icon: 'mobile' },
  ];

  return (
    <Section title="Visibility" id="i-visible">
      {rows.map((r) => {
        const explicit = node.hidden?.[r.bp];
        return (
          <div key={r.bp} className="row" style={{ gridTemplateColumns: '1fr auto' }}>
            <span className="row-label" style={{ gap: 6 }}>
              <Icon name={r.icon} size={13} />
              {r.label}
            </span>
            <div className="row-fields">
              <Segmented
                value={explicit === undefined ? 'inherit' : explicit ? 'hide' : 'show'}
                onChange={(v) => setHiddenAt(r.bp, v === 'inherit' ? undefined : v === 'hide')}
                options={
                  r.bp === 'base'
                    ? [
                        { value: 'show', icon: 'eye', tip: 'Visible' },
                        { value: 'hide', icon: 'eyeOff', tip: 'Hidden' },
                      ]
                    : [
                        { value: 'inherit', label: 'Auto', tip: 'Follow the wider breakpoint' },
                        { value: 'show', icon: 'eye', tip: 'Show here' },
                        { value: 'hide', icon: 'eyeOff', tip: 'Hide here' },
                      ]
                }
              />
            </div>
          </div>
        );
      })}
      <div className="hint">
        Set Desktop to hidden and Mobile to shown to build mobile-only content.
      </div>
    </Section>
  );
}

export { Check };
