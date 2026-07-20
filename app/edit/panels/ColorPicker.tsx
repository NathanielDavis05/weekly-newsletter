"use client";

// The shared colour picker.
//
// Used by the text toolbar and the Site Design panel, so a colour chosen in one
// place looks and behaves the same in the other. Every representation (hex,
// RGB, HSL, opacity, spectrum) edits the same underlying value and stays in
// sync through the pure conversions in content/color.ts.

import { useId, useMemo, useState } from "react";
import {
  contrastGrade,
  contrastRatio,
  hslToRgb,
  parseColor,
  rgbToHex,
  rgbToHsl,
  type RGB,
} from "../../content/color";
import type { SiteTheme } from "../../content/theme";
import { documentColors } from "../../content/theme";

export interface ColorPickerProps {
  value: string | undefined;
  onChange: (value: string) => void;
  /** Offered as a "clear" action when provided. */
  onClear?: () => void;
  clearLabel?: string;
  theme: SiteTheme;
  /** Background the colour will sit on, for the contrast readout. */
  contrastAgainst?: string;
}

/**
 * Feature-detected: only Chromium exposes the native eyedropper today.
 * Read once via a lazy initialiser rather than an effect — the answer cannot
 * change during the session, and the initialiser never runs on the server.
 */
function useEyeDropper() {
  const [supported] = useState(() => typeof window !== "undefined" && "EyeDropper" in window);
  return supported;
}

type Mode = "hex" | "rgb" | "hsl";

export function ColorPicker({
  value,
  onChange,
  onClear,
  clearLabel = "Clear",
  theme,
  contrastAgainst,
}: ColorPickerProps) {
  const [mode, setMode] = useState<Mode>("hex");
  const eyedropper = useEyeDropper();
  const id = useId();

  // The hex field is a draft the user types into, so it has to resync whenever
  // the colour changes from elsewhere (a swatch, the spectrum, another slider).
  // Adjusting during render avoids the extra pass an effect would cost.
  const [draft, setDraft] = useState(value ?? "");
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value ?? "");
  }

  const rgb: RGB = useMemo(() => parseColor(value ?? "") ?? { r: 13, g: 34, b: 56, a: 1 }, [value]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);

  const emit = (next: RGB) => onChange(rgbToHex(next));
  const setChannel = (channel: "r" | "g" | "b", next: number) => emit({ ...rgb, [channel]: next });
  const setHsl = (channel: "h" | "s" | "l", next: number) => emit(hslToRgb({ ...hsl, [channel]: next }));

  const ratio = contrastAgainst ? contrastRatio(rgbToHex({ ...rgb, a: 1 }), contrastAgainst) : null;
  const docColors = useMemo(() => documentColors(theme), [theme]);

  return (
    <div className="color-picker">
      <div className="color-picker__preview">
        <span className="color-picker__chip" style={{ background: rgbToHex(rgb) }} aria-hidden="true" />
        <div>
          <strong>{rgbToHex(rgb)}</strong>
          {ratio !== null ? (
            <small className={`color-picker__contrast color-picker__contrast--${contrastGrade(ratio).replace(/\s/g, "").toLowerCase()}`}>
              Contrast {ratio}:1 · {contrastGrade(ratio)}
            </small>
          ) : null}
        </div>
      </div>

      <section className="color-picker__section">
        <h4>Brand palette</h4>
        <div className="color-picker__swatches">
          {theme.palette.map((token) => (
            <button
              key={token.id}
              type="button"
              className={`color-picker__swatch${rgbToHex(rgb) === token.value ? " is-active" : ""}`}
              style={{ background: token.value }}
              title={`${token.label} (${token.value})`}
              aria-label={token.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(token.value)}
            />
          ))}
        </div>
      </section>

      {theme.recentColors.length ? (
        <section className="color-picker__section">
          <h4>Recently used</h4>
          <div className="color-picker__swatches">
            {theme.recentColors.map((colour) => (
              <button
                key={colour}
                type="button"
                className="color-picker__swatch"
                style={{ background: colour }}
                title={colour}
                aria-label={`Recent colour ${colour}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange(colour)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="color-picker__section">
        <h4>Document colours</h4>
        <div className="color-picker__swatches">
          {docColors.map((colour) => (
            <button
              key={colour}
              type="button"
              className="color-picker__swatch"
              style={{ background: colour }}
              title={colour}
              aria-label={`Document colour ${colour}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onChange(colour)}
            />
          ))}
        </div>
      </section>

      <section className="color-picker__section">
        <div className="color-picker__modes" role="tablist" aria-label="Colour format">
          {(["hex", "rgb", "hsl"] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              className={mode === option ? "is-active" : ""}
              onClick={() => setMode(option)}
            >
              {option.toUpperCase()}
            </button>
          ))}
        </div>

        {mode === "hex" ? (
          <label className="color-picker__field">
            <span>Hex</span>
            <input
              value={draft}
              placeholder="#d80d37"
              onChange={(event) => {
                setDraft(event.target.value);
                const parsed = parseColor(event.target.value);
                if (parsed) onChange(rgbToHex(parsed));
              }}
            />
          </label>
        ) : null}

        {mode === "rgb" ? (
          <div className="color-picker__triple">
            {(["r", "g", "b"] as const).map((channel) => (
              <label key={channel} className="color-picker__field">
                <span>{channel.toUpperCase()}</span>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={rgb[channel]}
                  onChange={(event) => setChannel(channel, Number(event.target.value))}
                />
              </label>
            ))}
          </div>
        ) : null}

        {mode === "hsl" ? (
          <div className="color-picker__triple">
            <label className="color-picker__field">
              <span>H</span>
              <input type="number" min={0} max={360} value={Math.round(hsl.h)} onChange={(event) => setHsl("h", Number(event.target.value))} />
            </label>
            <label className="color-picker__field">
              <span>S %</span>
              <input type="number" min={0} max={100} value={Math.round(hsl.s)} onChange={(event) => setHsl("s", Number(event.target.value))} />
            </label>
            <label className="color-picker__field">
              <span>L %</span>
              <input type="number" min={0} max={100} value={Math.round(hsl.l)} onChange={(event) => setHsl("l", Number(event.target.value))} />
            </label>
          </div>
        ) : null}

        <label className="color-picker__field">
          <span>Spectrum</span>
          <input
            id={id}
            type="color"
            value={rgbToHex({ ...rgb, a: 1 })}
            onChange={(event) => onChange(event.target.value)}
          />
        </label>

        <label className="color-picker__field">
          <span>Opacity {Math.round(rgb.a * 100)}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(rgb.a * 100)}
            onChange={(event) => emit({ ...rgb, a: Number(event.target.value) / 100 })}
          />
        </label>
      </section>

      <div className="color-picker__actions">
        {eyedropper ? (
          <button
            type="button"
            className="rt-link-btn"
            onClick={async () => {
              try {
                const dropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
                const result = await dropper.open();
                if (result?.sRGBHex) onChange(result.sRGBHex);
              } catch {
                // The user dismissed the eyedropper; nothing to do.
              }
            }}
          >
            Pick from screen
          </button>
        ) : null}
        {onClear ? (
          <button type="button" className="rt-link-btn" onClick={onClear}>{clearLabel}</button>
        ) : null}
      </div>
    </div>
  );
}
