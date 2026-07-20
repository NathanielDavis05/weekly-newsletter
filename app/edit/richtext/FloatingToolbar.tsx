"use client";

// The formatting toolbar that appears directly above the selected text.
//
// Every control here writes through `onPatchMarks` / `onPatchBlocks`, which
// operate on the document model rather than the DOM — see marks.ts for why.
// Controls reflect the real state of the selection: a button is "on" only when
// the whole selection carries the mark, and shows a mixed state when it doesn't.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  FONT_SIZE_PRESETS,
  FONT_STACKS,
  type RichBlock,
  type RichMarks,
} from "../../content/richtext";
import { TEXT_STYLE_ORDER, type SiteTheme, type TextStyleId } from "../../content/theme";
import { ColorPicker } from "../panels/ColorPicker";
import type { ActiveFormat, MarkPatch } from "./marks";

const HIGHLIGHT_SWATCHES: Array<[label: string, value: string]> = [
  ["None", "transparent"],
  ["Butter", "#ffe9a8"],
  ["Mint", "#c9f0dc"],
  ["Sky", "#cfe4ff"],
  ["Blush", "#ffd6de"],
  ["Sand", "#efe4d2"],
];

export interface ToolbarProps {
  format: ActiveFormat;
  theme: SiteTheme;
  onPatchMarks: (patch: MarkPatch) => void;
  onPatchBlocks: (patch: Partial<RichBlock>) => void;
  onClearFormatting: () => void;
  /** Links the selection to a global style (and adopts its semantic tag). */
  onApplyTextStyle: (id: TextStyleId) => void;
  /** Keeps the current look but stops following the global style. */
  onDetachTextStyle: () => void;
  /** Drops local overrides so the global style shows through again. */
  onResetToTextStyle: () => void;
  /** Viewport-space anchor rect of the current selection. */
  rect: { top: number; left: number; bottom: number; width: number } | null;
  compact: boolean;
}

function Swatches({
  swatches,
  current,
  onPick,
}: {
  swatches: Array<[string, string]>;
  current?: string;
  onPick: (value: string | null) => void;
}) {
  return (
    <div className="rt-swatches" role="group">
      {swatches.map(([label, value]) => (
        <button
          key={value}
          type="button"
          className={`rt-swatch${current === value ? " is-active" : ""}${value === "transparent" ? " rt-swatch--none" : ""}`}
          style={value === "transparent" ? undefined : { background: value }}
          title={label}
          aria-label={label}
          aria-pressed={current === value}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(value === "transparent" ? null : value)}
        />
      ))}
    </div>
  );
}

function Popover({
  label,
  icon,
  children,
  wide,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  return (
    <div className="rt-popover-host" ref={hostRef}>
      <button
        type="button"
        className={`rt-btn${open ? " is-open" : ""}`}
        title={label}
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
        <span className="rt-caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className={`rt-popover${wide ? " rt-popover--wide" : ""}`} id={id} role="group" aria-label={label}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="rt-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function FloatingToolbar({
  format,
  theme,
  onPatchMarks,
  onPatchBlocks,
  onClearFormatting,
  onApplyTextStyle,
  onDetachTextStyle,
  onResetToTextStyle,
  rect,
  compact,
}: ToolbarProps) {
  const { marks, mixed, block } = format;
  const toolbarRef = useRef<HTMLDivElement>(null);

  // The link field is a draft the user types into, but it has to reset whenever
  // the selection moves to text with a different link. This is React's
  // "adjust state during render" pattern — cheaper and flicker-free compared to
  // resetting from an effect.
  const [linkDraft, setLinkDraft] = useState(marks.href ?? "");
  const [lastHref, setLastHref] = useState(marks.href);
  if (lastHref !== marks.href) {
    setLastHref(marks.href);
    setLinkDraft(marks.href ?? "");
  }

  // Measured on mount via a ref callback so the anchoring maths below never
  // reads a ref during render. 520 is a sane first-paint estimate.
  const [toolbarWidth, setToolbarWidth] = useState(520);
  const measureToolbar = useCallback((node: HTMLDivElement | null) => {
    toolbarRef.current = node;
    if (node?.offsetWidth) setToolbarWidth(node.offsetWidth);
  }, []);

  const toggle = (key: keyof RichMarks) => () =>
    onPatchMarks({ [key]: marks[key] ? null : true } as MarkPatch);

  const markButton = (key: "bold" | "italic" | "underline" | "strike", label: string, glyph: React.ReactNode, shortcut?: string) => (
    <button
      type="button"
      className={`rt-btn rt-btn--icon${marks[key] ? " is-active" : ""}${mixed.has(key) ? " is-mixed" : ""}`}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={Boolean(marks[key])}
      onMouseDown={(event) => event.preventDefault()}
      onClick={toggle(key)}
    >
      {glyph}
    </button>
  );

  const alignButton = (value: NonNullable<RichBlock["align"]>, label: string, glyph: string) => (
    <button
      type="button"
      className={`rt-btn rt-btn--icon${(block?.align ?? "left") === value ? " is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={(block?.align ?? "left") === value}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPatchBlocks({ align: value })}
    >
      {glyph}
    </button>
  );

  const listButton = (value: "bullet" | "number", label: string, glyph: string) => {
    const active = block?.type === "listItem" && block.list === value;
    return (
      <button
        type="button"
        className={`rt-btn rt-btn--icon${active ? " is-active" : ""}`}
        title={label}
        aria-label={label}
        aria-pressed={active}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() =>
          onPatchBlocks(active ? { type: "paragraph" } : { type: "listItem", list: value })
        }
      >
        {glyph}
      </button>
    );
  };

  // Anchored above the selection, flipped below when there is no room, and
  // clamped horizontally so it never leaves the viewport.
  const style: React.CSSProperties = compact
    ? {}
    : (() => {
        if (!rect) return { display: "none" };
        const width = toolbarWidth;
        const above = rect.top > 96;
        return {
          top: above ? Math.max(8, rect.top - 12) : rect.bottom + 12,
          left: Math.min(
            Math.max(8 + width / 2, rect.left + rect.width / 2),
            (typeof window !== "undefined" ? window.innerWidth : 1200) - width / 2 - 8,
          ),
          transform: above ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        };
      })();

  return (
    <div
      ref={measureToolbar}
      className={`rt-toolbar${compact ? " rt-toolbar--compact" : ""}`}
      style={style}
      role="toolbar"
      aria-label="Text formatting"
      // Keeps the text selection alive while the toolbar is used.
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest("input, select, textarea")) return;
        event.preventDefault();
      }}
    >
      <div className="rt-group">
        <select
          className="rt-style-select"
          aria-label="Global text style"
          value={block?.styleId ?? ""}
          onChange={(event) => (event.target.value ? onApplyTextStyle(event.target.value as TextStyleId) : onDetachTextStyle())}
        >
          <option value="">Custom</option>
          {TEXT_STYLE_ORDER.map((id) => (
            <option key={id} value={id}>{theme.textStyles[id].label}</option>
          ))}
        </select>

        <Popover label="Text style" icon={<span className="rt-btn__text">Aa</span>} wide>
          {block?.styleId ? (
            <div className="rt-linked">
              <span>Linked to <strong>{theme.textStyles[block.styleId as TextStyleId]?.label ?? block.styleId}</strong></span>
              <div className="rt-row">
                <button type="button" className="rt-link-btn" onClick={onResetToTextStyle}>Reset to style</button>
                <button type="button" className="rt-link-btn" onClick={onDetachTextStyle}>Detach</button>
              </div>
            </div>
          ) : null}
          <Field label="Font">
            <select
              value={marks.fontFamily ?? ""}
              onChange={(event) => onPatchMarks({ fontFamily: event.target.value || null })}
            >
              <option value="">Inherit from theme</option>
              {Object.keys(FONT_STACKS).map((key) => (
                <option key={key} value={key} style={{ fontFamily: FONT_STACKS[key] }}>
                  {key[0].toUpperCase() + key.slice(1)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Paragraph tag">
            <select
              value={block?.type === "heading" ? `h${block.level ?? 2}` : "p"}
              onChange={(event) =>
                onPatchBlocks(
                  event.target.value === "p"
                    ? { type: "paragraph" }
                    : { type: "heading", level: Number(event.target.value.slice(1)) as 1 | 2 | 3 | 4 },
                )
              }
            >
              <option value="p">Body text</option>
              <option value="h1">Heading 1</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>
          </Field>

          <Field label="Line spacing">
            <input
              type="number"
              min={0.8}
              max={4}
              step={0.05}
              value={block?.lineHeight ?? ""}
              placeholder="auto"
              onChange={(event) =>
                onPatchBlocks({ lineHeight: event.target.value ? Number(event.target.value) : undefined })
              }
            />
          </Field>

          <Field label="Letter spacing (px)">
            <input
              type="number"
              min={-5}
              max={20}
              step={0.1}
              value={block?.letterSpacing ?? ""}
              placeholder="0"
              onChange={(event) =>
                onPatchBlocks({ letterSpacing: event.target.value ? Number(event.target.value) : undefined })
              }
            />
          </Field>

          <Field label="Paragraph spacing (px)">
            <input
              type="number"
              min={0}
              max={160}
              step={1}
              value={block?.spaceAfter ?? ""}
              placeholder="default"
              onChange={(event) =>
                onPatchBlocks({ spaceAfter: event.target.value ? Number(event.target.value) : undefined })
              }
            />
          </Field>

          <Field label="Capitalisation">
            <select
              value={marks.transform ?? ""}
              onChange={(event) => onPatchMarks({ transform: (event.target.value || null) as RichMarks["transform"] })}
            >
              <option value="">As typed</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Title Case</option>
            </select>
          </Field>
        </Popover>

        <div className="rt-size">
          <select
            aria-label="Font size preset"
            value={marks.fontSize && FONT_SIZE_PRESETS.includes(marks.fontSize as never) ? String(marks.fontSize) : ""}
            onChange={(event) => onPatchMarks({ fontSize: event.target.value ? Number(event.target.value) : null })}
          >
            <option value="">{mixed.has("fontSize") ? "Mixed" : "Size"}</option>
            {FONT_SIZE_PRESETS.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
          <input
            type="number"
            aria-label="Custom font size in pixels"
            min={8}
            max={200}
            step={1}
            value={marks.fontSize ?? ""}
            placeholder="—"
            onChange={(event) => onPatchMarks({ fontSize: event.target.value ? Number(event.target.value) : null })}
          />
        </div>
      </div>

      <div className="rt-group">
        {markButton("bold", "Bold", <strong>B</strong>, "⌘B")}
        {markButton("italic", "Italic", <em>I</em>, "⌘I")}
        {markButton("underline", "Underline", <u>U</u>, "⌘U")}
        {markButton("strike", "Strikethrough", <s>S</s>)}
      </div>

      <div className="rt-group">
        <Popover
          label="Text colour"
          icon={
            <span className="rt-btn__text rt-btn__swatch" style={{ borderBottomColor: marks.color ?? "currentColor" }}>
              A
            </span>
          }
        >
          <ColorPicker
            theme={theme}
            value={marks.color}
            onChange={(value) => onPatchMarks({ color: value })}
            onClear={() => onPatchMarks({ color: null })}
            clearLabel="Reset to theme colour"
          />
        </Popover>

        <Popover
          label="Highlight colour"
          icon={<span className="rt-btn__text rt-btn__swatch" style={{ borderBottomColor: marks.highlight ?? "transparent" }}>▤</span>}
        >
          <Swatches
            swatches={HIGHLIGHT_SWATCHES}
            current={marks.highlight}
            onPick={(value) => onPatchMarks({ highlight: value })}
          />
          <ColorPicker
            theme={theme}
            value={marks.highlight}
            onChange={(value) => onPatchMarks({ highlight: value })}
            onClear={() => onPatchMarks({ highlight: null })}
            clearLabel="Remove highlight"
          />
        </Popover>
      </div>

      <div className="rt-group">
        {alignButton("left", "Align left", "◧")}
        {alignButton("center", "Align centre", "▣")}
        {alignButton("right", "Align right", "◨")}
        {alignButton("justify", "Justify", "▤")}
      </div>

      <div className="rt-group">
        {listButton("bullet", "Bulleted list", "•—")}
        {listButton("number", "Numbered list", "1—")}
      </div>

      <div className="rt-group">
        <Popover label="Link" icon={<span className="rt-btn__text">🔗</span>} wide>
          <Field label="Link address">
            <input
              type="url"
              value={linkDraft}
              placeholder="https://…"
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onPatchMarks({ href: linkDraft || null });
                }
              }}
            />
          </Field>
          <div className="rt-row">
            <button type="button" className="rt-primary" onClick={() => onPatchMarks({ href: linkDraft || null })}>
              Apply link
            </button>
            {marks.href ? (
              <>
                <a className="rt-link-btn" href={marks.href} target="_blank" rel="noopener noreferrer">
                  Test link
                </a>
                <button type="button" className="rt-link-btn" onClick={() => onPatchMarks({ href: null })}>
                  Remove
                </button>
              </>
            ) : null}
          </div>
        </Popover>

        <Popover label="Text effects" icon={<span className="rt-btn__text">✦</span>} wide>
          <Field label="Shadow">
            <select
              value={marks.shadow ?? ""}
              onChange={(event) => onPatchMarks({ shadow: (event.target.value || null) as RichMarks["shadow"] })}
            >
              <option value="">None</option>
              <option value="soft">Soft</option>
              <option value="medium">Medium</option>
              <option value="strong">Strong</option>
              <option value="glow">Glow</option>
              <option value="lift">Lift</option>
            </select>
          </Field>

          <Field label="Outline width (px)">
            <input
              type="number"
              min={0}
              max={8}
              step={0.5}
              value={marks.strokeWidth ?? ""}
              placeholder="0"
              onChange={(event) =>
                onPatchMarks({
                  strokeWidth: event.target.value ? Number(event.target.value) : null,
                  strokeColor: event.target.value ? marks.strokeColor ?? "#0d2238" : null,
                })
              }
            />
          </Field>

          <Field label="Outline colour">
            <input
              type="color"
              value={marks.strokeColor ?? "#0d2238"}
              disabled={!marks.strokeWidth}
              onChange={(event) => onPatchMarks({ strokeColor: event.target.value })}
            />
          </Field>

          <Field label={`Opacity (${marks.opacity ?? 100}%)`}>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={marks.opacity ?? 100}
              onChange={(event) => {
                const value = Number(event.target.value);
                onPatchMarks({ opacity: value >= 100 ? null : value });
              }}
            />
          </Field>
        </Popover>

        <button
          type="button"
          className="rt-btn rt-btn--icon"
          title="Clear formatting"
          aria-label="Clear formatting"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClearFormatting}
        >
          ⌫
        </button>
      </div>
    </div>
  );
}
