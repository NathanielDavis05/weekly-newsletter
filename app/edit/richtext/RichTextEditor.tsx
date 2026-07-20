"use client";

// Editable rich text on the canvas.
//
// The browser owns the DOM while the user types: React renders the initial tree
// from the model and then deliberately stays out of the way, because a React
// re-render mid-keystroke would fight the caret. We re-derive the model from the
// DOM on every input, and only force a fresh render (via `revision`, which
// remounts the subtree) when something *outside* typing changes the document —
// a toolbar action, undo, or a new value arriving from the store.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RichTextInline, RichTextView } from "../../components/RichText";
import { parseRichText, type RichBlock, type RichText } from "../../content/richtext";
import type { SiteTheme, TextStyleId } from "../../content/theme";
import { FloatingToolbar } from "./FloatingToolbar";
import {
  activeFormat,
  clearFormatting,
  isCollapsed,
  patchBlocks,
  patchMarks,
  readSelection,
  restoreSelection,
  type MarkPatch,
  type RichRange,
} from "./marks";
import { domToRichText } from "./serialize";

export interface RichTextEditorProps {
  value: RichText | undefined;
  onChange: (next: RichText) => void;
  /** Drives the global text-style picker and the colour palettes. */
  theme: SiteTheme;
  /** Rendered when the document is empty and unfocused. */
  placeholder?: string;
  className?: string;
  /** Single-line fields (a card title) suppress Enter and list controls. */
  singleLine?: boolean;
  /**
   * Inline fields sit inside existing newsletter markup (a heading, a label),
   * so they render spans only — no paragraph wrapper that would break the
   * surrounding element's styling or produce invalid nesting.
   */
  inline?: boolean;
  ariaLabel?: string;
  /** Content path, so validation can locate this field on the canvas. */
  fieldPath?: string;
}

type Rect = { top: number; left: number; bottom: number; width: number } | null;

export function RichTextEditor({
  value,
  onChange,
  theme,
  placeholder,
  className,
  singleLine,
  inline,
  ariaLabel,
  fieldPath,
}: RichTextEditorProps) {
  const hostRef = useRef<HTMLElement>(null);
  const [doc, setDoc] = useState<RichText>(() => parseRichText(value));
  const [revision, setRevision] = useState(0);
  const [focused, setFocused] = useState(false);
  const [range, setRange] = useState<RichRange | null>(null);
  const [rect, setRect] = useState<Rect>(null);
  const [compact, setCompact] = useState(false);

  // Mirrors `doc` for callbacks that need the latest model without being
  // re-created on every keystroke. Synced in an effect rather than during
  // render so React's concurrent rendering never sees a torn value.
  const docRef = useRef(doc);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);
  // Selection to reinstate after the next model-driven remount.
  const pendingSelection = useRef<RichRange | null>(null);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 780px)");
    const sync = () => setCompact(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Adopt an externally-changed document (undo, autosave reload, page switch)
  // without clobbering in-progress typing.
  useEffect(() => {
    const incoming = parseRichText(value);
    if (JSON.stringify(incoming) === JSON.stringify(docRef.current)) return;
    setDoc(incoming);
    setRevision((current) => current + 1);
  }, [value]);

  const commit = useCallback(
    (next: RichText, selection: RichRange | null) => {
      pendingSelection.current = selection;
      setDoc(next);
      setRevision((current) => current + 1);
      onChange(next);
    },
    [onChange],
  );

  // Restore the caret after a model-driven remount.
  useLayoutEffect(() => {
    const host = hostRef.current;
    const selection = pendingSelection.current;
    if (!host || !selection) return;
    pendingSelection.current = null;
    restoreSelection(host, selection);
    setRange(selection);
  }, [revision]);

  const syncSelection = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const next = readSelection(host);
    setRange(next);

    const view = host.ownerDocument.defaultView;
    const domSelection = view?.getSelection();
    if (!next || !domSelection || domSelection.rangeCount === 0 || domSelection.isCollapsed) {
      setRect(null);
      return;
    }
    const box = domSelection.getRangeAt(0).getBoundingClientRect();
    setRect(box.width || box.height ? { top: box.top, left: box.left, bottom: box.bottom, width: box.width } : null);
  }, []);

  useEffect(() => {
    if (!focused) return;
    const handler = () => syncSelection();
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, [focused, syncSelection]);

  const handleInput = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const next = domToRichText(host);
    // No revision bump: the DOM already shows this, and remounting would move
    // the caret to the wrong place mid-word.
    setDoc(next);
    onChange(next);
  }, [onChange]);

  /**
   * A collapsed caret has no characters to format, so shortcuts and toolbar
   * actions fall back to the whole block the caret sits in — predictable, and
   * matches what "make this line bold" is usually meant to do.
   */
  const effectiveRange = useCallback((): RichRange | null => {
    const current = range ?? (hostRef.current ? readSelection(hostRef.current) : null);
    if (!current) return null;
    if (!isCollapsed(current)) return current;
    const block = docRef.current.blocks[current.from.block];
    if (!block) return current;
    const length = block.spans.reduce((sum, span) => sum + span.text.length, 0);
    return { from: { block: current.from.block, offset: 0 }, to: { block: current.from.block, offset: length } };
  }, [range]);

  const applyMarks = useCallback(
    (patch: MarkPatch) => {
      const target = effectiveRange();
      if (!target) return;
      commit(patchMarks(docRef.current, target, patch), target);
    },
    [commit, effectiveRange],
  );

  const applyBlocks = useCallback(
    (patch: Partial<RichBlock>) => {
      const target = effectiveRange();
      if (!target) return;
      commit(patchBlocks(docRef.current, target, patch), target);
    },
    [commit, effectiveRange],
  );

  const applyClear = useCallback(() => {
    const target = effectiveRange();
    if (!target) return;
    commit(clearFormatting(docRef.current, target), target);
  }, [commit, effectiveRange]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLElement>) => {
      if ((singleLine || inline) && event.key === "Enter") {
        event.preventDefault();
        return;
      }
      // Let the canvas keep its own shortcuts (delete element, nudge) away from
      // text editing — while the caret is here, these keys belong to the text.
      if (event.key === "Escape") {
        event.currentTarget.blur();
        return;
      }
      if (!(event.metaKey || event.ctrlKey)) {
        event.stopPropagation();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "b" || key === "i" || key === "u") {
        event.preventDefault();
        event.stopPropagation();
        applyMarks({ [key === "b" ? "bold" : key === "i" ? "italic" : "underline"]: true } as MarkPatch);
      }
    },
    [applyMarks, inline, singleLine],
  );

  // Paste as plain text: pasted markup would otherwise smuggle in styles the
  // model has no way to represent (and the serialiser would silently drop).
  const handlePaste = useCallback((event: React.ClipboardEvent<HTMLElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (text) event.currentTarget.ownerDocument.execCommand("insertText", false, text);
  }, []);

  /**
   * Linking to a global style also adopts its semantic tag, so the stored
   * document stays correct HTML without the renderer needing the theme.
   */
  const applyTextStyle = useCallback((id: TextStyleId) => {
    const definition = theme.textStyles[id];
    if (!definition) return;
    const tag = definition.tag;
    const patch: Partial<RichBlock> = tag.startsWith("h")
      ? { styleId: id, type: "heading", level: Number(tag.slice(1)) as 1 | 2 | 3 | 4 }
      : { styleId: id, type: "paragraph" };
    applyBlocks(patch);
  }, [applyBlocks, theme]);

  // Detach keeps the current appearance but stops following the theme.
  const detachTextStyle = useCallback(() => applyBlocks({ styleId: undefined }), [applyBlocks]);
  // Reset drops local overrides so the global style shows through again.
  const resetToTextStyle = useCallback(() => {
    const target = effectiveRange();
    if (!target) return;
    const styleId = docRef.current.blocks[target.from.block]?.styleId;
    if (!styleId) return;
    const cleared = clearFormatting(docRef.current, target);
    const relinked = patchBlocks(cleared, target, { styleId });
    commit(relinked, target);
  }, [commit, effectiveRange]);

  const format = useMemo(() => activeFormat(doc, range), [doc, range]);
  const showToolbar = focused && Boolean(range) && (compact || Boolean(rect));
  const isEmpty = doc.blocks.every((block) => block.spans.every((span) => !span.text));

  // Inline fields live inside <p>, <h1>, <strong> and friends, where a <div> is
  // invalid HTML — the browser would restructure it and hydration would then
  // disagree with the server. A <span> is valid in every one of those places.
  const Host = inline ? "span" : "div";

  return (
    <>
      <Host
        ref={hostRef as React.RefObject<HTMLDivElement & HTMLSpanElement>}
        className={`rt-editable${inline ? " rt-editable--inline" : ""}${className ? ` ${className}` : ""}${isEmpty ? " is-empty" : ""}`}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline={!singleLine}
        aria-label={ariaLabel ?? placeholder ?? "Rich text"}
        data-placeholder={placeholder}
        data-field-path={fieldPath}
        tabIndex={0}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setFocused(true)}
        onBlur={(event) => {
          // Clicking a toolbar control must not count as leaving the field.
          if (event.relatedTarget instanceof Node && event.relatedTarget.closest?.(".rt-toolbar")) return;
          setFocused(false);
          setRect(null);
        }}
        onMouseUp={syncSelection}
        onKeyUp={syncSelection}
        // Stop the canvas from starting a drag or changing selection while the
        // pointer is being used to select text.
        onPointerDown={(event) => event.stopPropagation()}
      >
        {inline ? <RichTextInline key={revision} doc={doc} /> : <RichTextView key={revision} doc={doc} />}
      </Host>

      {showToolbar && typeof document !== "undefined"
        ? createPortal(
            <FloatingToolbar
              format={format}
              theme={theme}
              onPatchMarks={applyMarks}
              onApplyTextStyle={applyTextStyle}
              onDetachTextStyle={detachTextStyle}
              onResetToTextStyle={resetToTextStyle}
              onPatchBlocks={applyBlocks}
              onClearFormatting={applyClear}
              rect={rect}
              compact={compact}
            />,
            document.body,
          )
        : null}
    </>
  );
}
