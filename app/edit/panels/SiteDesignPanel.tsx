"use client";

// Site Design: the brand palette and global text styles.
//
// Editing here changes every linked element at once. Because the theme reaches
// the page as custom properties, a change repaints linked text immediately in
// the canvas — and the published page picks up the same values, since both
// render through ThemeStyles.

import { useState } from "react";
import { FONT_STACKS } from "../../content/richtext";
import {
  TEXT_STYLE_ORDER,
  resolveColor,
  type ColorToken,
  type SiteTheme,
  type TextStyleDef,
  type TextStyleId,
} from "../../content/theme";
import type { Look } from "../../content/types";
import { ColorPicker } from "./ColorPicker";

export interface SiteDesignPanelProps {
  theme: SiteTheme;
  onPatchStyle: (id: TextStyleId, patch: Partial<TextStyleDef>) => void;
  onPatchToken: (id: string, patch: Partial<ColorToken>) => void;
  onResetStyle: (id: TextStyleId) => void;
  onResetTheme: () => void;
  onClose: () => void;
  /** How many blocks currently link to each style. */
  usage: Record<string, number>;
  /** Saved design presets and the operations on them. */
  looks: Look[];
  activeLookId?: string;
  onApplyLook: (look: Look) => void;
  onSaveLook: (name: string) => void;
  onRenameLook: (id: string, name: string) => void;
  onDuplicateLook: (id: string) => void;
  onDeleteLook: (id: string) => void;
}

/** A small swatch row previewing a Look's key palette colours. */
function LookSwatches({ look }: { look: Look }) {
  const ids = ["brand", "ink", "success", "warning", "cream"];
  return (
    <span className="look-swatches" aria-hidden="true">
      {ids.map((id) => {
        const token = look.theme.palette.find((entry) => entry.id === id);
        return <span key={id} className="look-swatch" style={{ background: token?.value ?? "#ccc" }} />;
      })}
    </span>
  );
}

function LooksTab({ looks, activeLookId, onApply, onSave, onRename, onDuplicate, onDelete }: {
  looks: Look[];
  activeLookId?: string;
  onApply: (look: Look) => void;
  onSave: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="design-list">
      <p className="inspector-note">A Look is a saved snapshot of the whole design. Apply one to restyle every page in one step — then fine-tune anything.</p>
      <button type="button" className="list-add" onClick={() => onSave("New look")}>+ Save current design as a Look</button>
      <div className="look-list">
        {looks.map((look) => (
          <div className={`look-row${look.id === activeLookId ? " is-active" : ""}`} key={look.id}>
            <button type="button" className="look-row__apply" onClick={() => onApply(look)}>
              <LookSwatches look={look} />
              {editing === look.id ? (
                <input
                  autoFocus
                  className="look-row__name-input"
                  value={look.name}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onRename(look.id, event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") setEditing(null); }}
                />
              ) : (
                <span className="look-row__name">{look.name}{look.id === activeLookId ? " · active" : ""}</span>
              )}
            </button>
            <span className="look-row__tools">
              <button type="button" onClick={() => setEditing(editing === look.id ? null : look.id)} aria-label={`Rename ${look.name}`} title="Rename">✎</button>
              <button type="button" onClick={() => onDuplicate(look.id)} aria-label={`Duplicate ${look.name}`} title="Duplicate">⧉</button>
              <button type="button" className="danger" onClick={() => onDelete(look.id)} aria-label={`Delete ${look.name}`} title="Delete">✕</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StyleRow({
  style,
  theme,
  usage,
  onPatch,
  onReset,
}: {
  style: TextStyleDef;
  theme: SiteTheme;
  usage: number;
  onPatch: (patch: Partial<TextStyleDef>) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  return (
    <div className={`style-row${open ? " is-open" : ""}`}>
      <button type="button" className="style-row__head" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span
          className="style-row__preview"
          style={{
            fontFamily: FONT_STACKS[style.fontFamily],
            // Preview sizes are capped so a 54px title still fits the row.
            fontSize: `${Math.min(24, style.fontSize)}px`,
            fontWeight: style.fontWeight,
            letterSpacing: `${style.letterSpacing}px`,
            color: resolveColor(theme, style.color),
            textTransform: style.transform ?? "none",
          }}
        >
          {style.label}
        </span>
        <small>{style.fontSize}px{usage ? ` · ${usage} in use` : ""}</small>
      </button>

      {open ? (
        <div className="style-row__body">
          <label className="visual-control">
            <span>Font</span>
            <select value={style.fontFamily} onChange={(event) => onPatch({ fontFamily: event.target.value })}>
              {Object.keys(FONT_STACKS).map((key) => (
                <option key={key} value={key}>{key[0].toUpperCase() + key.slice(1)}</option>
              ))}
            </select>
          </label>

          <div className="style-row__grid">
            <label className="visual-control">
              <span>Size (desktop)</span>
              <input type="number" min={8} max={200} value={style.fontSize} onChange={(event) => onPatch({ fontSize: Number(event.target.value) })} />
            </label>
            <label className="visual-control">
              <span>Size (mobile)</span>
              <input
                type="number"
                min={8}
                max={200}
                value={style.mobileFontSize ?? ""}
                placeholder="auto"
                onChange={(event) => onPatch({ mobileFontSize: event.target.value ? Number(event.target.value) : undefined })}
              />
            </label>
            <label className="visual-control">
              <span>Weight</span>
              <select value={style.fontWeight} onChange={(event) => onPatch({ fontWeight: Number(event.target.value) })}>
                {[300, 400, 500, 600, 700, 800].map((weight) => <option key={weight} value={weight}>{weight}</option>)}
              </select>
            </label>
            <label className="visual-control">
              <span>Line height</span>
              <input type="number" min={0.8} max={4} step={0.05} value={style.lineHeight} onChange={(event) => onPatch({ lineHeight: Number(event.target.value) })} />
            </label>
            <label className="visual-control">
              <span>Letter spacing</span>
              <input type="number" min={-5} max={20} step={0.1} value={style.letterSpacing} onChange={(event) => onPatch({ letterSpacing: Number(event.target.value) })} />
            </label>
            <label className="visual-control">
              <span>Capitalisation</span>
              <select
                value={style.transform ?? ""}
                onChange={(event) => onPatch({ transform: (event.target.value || undefined) as TextStyleDef["transform"] })}
              >
                <option value="">As typed</option>
                <option value="uppercase">UPPERCASE</option>
                <option value="lowercase">lowercase</option>
                <option value="capitalize">Title Case</option>
              </select>
            </label>
          </div>

          <label className="visual-control">
            <span>Semantic tag</span>
            <select value={style.tag} onChange={(event) => onPatch({ tag: event.target.value as TextStyleDef["tag"] })}>
              <option value="h1">h1 — page title</option>
              <option value="h2">h2 — section</option>
              <option value="h3">h3 — subsection</option>
              <option value="h4">h4 — minor</option>
              <option value="p">p — paragraph</option>
              <option value="span">span — inline</option>
            </select>
          </label>

          <div className="style-row__color">
            <button type="button" className="style-row__color-btn" onClick={() => setColorOpen((value) => !value)} aria-expanded={colorOpen}>
              <span style={{ background: resolveColor(theme, style.color) }} aria-hidden="true" />
              Colour: {theme.palette.find((token) => token.id === style.color)?.label ?? style.color}
            </button>
            {colorOpen ? (
              <ColorPicker
                theme={theme}
                value={resolveColor(theme, style.color)}
                onChange={(next) => {
                  // Prefer a palette token so the style follows brand changes.
                  const token = theme.palette.find((entry) => entry.value.toLowerCase() === next.toLowerCase());
                  onPatch({ color: token ? token.id : next });
                }}
              />
            ) : null}
          </div>

          <button type="button" className="rt-link-btn" onClick={onReset}>Reset {style.label} to default</button>
        </div>
      ) : null}
    </div>
  );
}

export function SiteDesignPanel({
  theme,
  onPatchStyle,
  onPatchToken,
  onResetStyle,
  onResetTheme,
  onClose,
  usage,
  looks,
  activeLookId,
  onApplyLook,
  onSaveLook,
  onRenameLook,
  onDuplicateLook,
  onDeleteLook,
}: SiteDesignPanelProps) {
  const [tab, setTab] = useState<"looks" | "text" | "colour">("looks");
  const [editingToken, setEditingToken] = useState<string | null>(null);

  return (
    <>
      <div className="drawer-heading">
        <h2>Site design</h2>
        <button type="button" onClick={onClose} aria-label="Close site design">×</button>
      </div>

      <div className="design-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "looks"} className={tab === "looks" ? "is-active" : ""} onClick={() => setTab("looks")}>Looks</button>
        <button type="button" role="tab" aria-selected={tab === "text"} className={tab === "text" ? "is-active" : ""} onClick={() => setTab("text")}>Text styles</button>
        <button type="button" role="tab" aria-selected={tab === "colour"} className={tab === "colour" ? "is-active" : ""} onClick={() => setTab("colour")}>Colour theme</button>
      </div>

      {tab === "looks" ? (
        <LooksTab
          looks={looks}
          activeLookId={activeLookId}
          onApply={onApplyLook}
          onSave={onSaveLook}
          onRename={onRenameLook}
          onDuplicate={onDuplicateLook}
          onDelete={onDeleteLook}
        />
      ) : tab === "text" ? (
        <div className="design-list">
          <p className="inspector-note">Changing a style updates every linked element across the newsletter. Elements that override a property keep their override.</p>
          {TEXT_STYLE_ORDER.map((id) => (
            <StyleRow
              key={id}
              style={theme.textStyles[id]}
              theme={theme}
              usage={usage[id] ?? 0}
              onPatch={(patch) => onPatchStyle(id, patch)}
              onReset={() => onResetStyle(id)}
            />
          ))}
        </div>
      ) : (
        <div className="design-list">
          <p className="inspector-note">Text styles reference these by name, so editing a brand colour flows through to everything using it.</p>
          {theme.palette.map((token) => (
            <div className="token-row" key={token.id}>
              <button
                type="button"
                className="token-row__head"
                onClick={() => setEditingToken(editingToken === token.id ? null : token.id)}
                aria-expanded={editingToken === token.id}
              >
                <span className="token-row__chip" style={{ background: token.value }} aria-hidden="true" />
                <strong>{token.label}</strong>
                <small>{token.value}</small>
              </button>
              {editingToken === token.id ? (
                <div className="token-row__body">
                  <label className="visual-control">
                    <span>Name</span>
                    <input value={token.label} onChange={(event) => onPatchToken(token.id, { label: event.target.value })} />
                  </label>
                  <ColorPicker
                    theme={theme}
                    value={token.value}
                    contrastAgainst={theme.palette.find((entry) => entry.id === "cream")?.value ?? "#ffffff"}
                    onChange={(value) => onPatchToken(token.id, { value })}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <button type="button" className="rt-link-btn design-reset" onClick={onResetTheme}>Reset the whole theme to brand defaults</button>
    </>
  );
}
