"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, RefObject } from "react";
import type { ResizeHandle } from "../edit/canvas/useResize";
import { RESIZE_HANDLES } from "../edit/canvas/useResize";
import type { RichText } from "../content/richtext";
import { isRichTextEmpty } from "../content/richtext";
import type { NewsletterContent, ResponsiveLayout, TextFrameStyle, VisualBlock, VisualPageId } from "../content/types";
import { styleForBlock, styleForTextFrame, visualDocument } from "../content/visual";
import { RichTextView } from "./RichText";
import { ThemeStyles } from "./ThemeStyles";

/** Describes one editable rich-text field on a freeform block. */
export interface TextFieldRequest {
  itemId: string;
  field: "richTitle" | "richBody";
  doc: RichText | undefined;
  className: string;
  placeholder: string;
  singleLine?: boolean;
}

/** One formattable field of the fixed newsletter copy. */
export interface ContentFieldRequest {
  /** Dotted path into NewsletterContent. */
  path: string;
  /** The plain string currently stored there. */
  value: string;
  /** Existing formatting for this field, if any. */
  doc: RichText | undefined;
  /** Block fields get paragraphs and lists; inline fields get spans only. */
  block?: boolean;
  className?: string;
  placeholder?: string;
}

export interface CanvasEditorState {
  /** Primary selection — kept for callers that only care about one item. */
  selectedId?: string | null;
  /** Full selection, in click order. Shift-click extends it. */
  selectedIds?: string[];
  device?: "phone" | "desktop";
  /** `additive` is true for shift-click, which extends the selection. */
  onSelect?: (id: string, additive?: boolean) => void;
  /** Clicking empty canvas clears the selection. */
  onDeselect?: () => void;
  /** Pointer-driven drag; supersedes the old HTML5 drag-and-drop. */
  onStartDrag?: (event: PointerEvent<HTMLElement>, itemId: string) => void;
  onStartResize?: (event: PointerEvent<HTMLElement>, itemId: string, handle: ResizeHandle) => void;
  /** Overlay host for smart guides and the drop indicator. */
  overlay?: ReactNode;
  surfaceRef?: RefObject<HTMLElement | null>;
  onMoveItem?: (itemId: string, targetRowId: string, zone: "above" | "below" | "left" | "right") => void;
  onResizeItem?: (itemId: string, patch: Partial<ResponsiveLayout>) => void;
  onNudgeItem?: (itemId: string, dx: number, dy: number) => void;
  /** The currently focused piece of text inside the selected block. */
  selectedTextFrame?: string | null;
  textFrames?: Record<string, TextFrameStyle>;
  onSelectTextFrame?: (frameKey: string, itemId: string) => void;
  onStartTextFrameDrag?: (event: PointerEvent<HTMLElement>, frameKey: string, itemId: string) => void;
  onStartTextFrameResize?: (event: PointerEvent<HTMLElement>, frameKey: string, itemId: string) => void;
  onFreeTextChange?: (itemId: string, patch: Partial<VisualBlock>) => void;
  onHeroTextChange?: (field: "title" | "kicker", value: string) => void;
  /**
   * Supplied by the editor shell so the rich-text editor (and its toolbar) never
   * reach the public bundle. When absent the canvas renders read-only text with
   * exactly the same markup the published page uses.
   */
  renderText?: (request: TextFieldRequest) => ReactNode;
  /** The same, for formattable fields inside the native newsletter sections. */
  renderField?: (request: ContentFieldRequest) => ReactNode;
}

/** Shared by native and freeform text so every visible string gets the same frame controls. */
export function TextFrame({ frameKey, children, editor, style, block = false }: {
  frameKey: string;
  children: ReactNode;
  editor?: CanvasEditorState;
  style?: TextFrameStyle;
  block?: boolean;
}) {
  const selected = editor?.selectedTextFrame === frameKey;
  const select = (event: PointerEvent<HTMLElement>) => {
    if (!editor) return;
    event.stopPropagation();
    const itemId = event.currentTarget.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
    if (itemId) editor.onSelectTextFrame?.(frameKey, itemId);
  };
  return <span
    className={`text-frame${block ? " text-frame--block" : ""}${selected ? " text-frame--selected" : ""}`}
    data-text-frame-key={frameKey}
    style={styleForTextFrame(style)}
    onPointerDown={editor ? select : undefined}
  >
    {children}
    {editor && selected ? <>
      <span
        className="text-frame__grip"
        role="button"
        aria-label="Drag text to move it"
        title="Drag to move text"
        onPointerDown={(event) => {
          event.preventDefault(); event.stopPropagation();
          const itemId = event.currentTarget.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
          if (itemId) editor.onStartTextFrameDrag?.(event, frameKey, itemId);
        }}
      >⠿</span>
      <span
        className="text-frame__resize"
        role="button"
        aria-label="Resize text frame"
        onPointerDown={(event) => {
          event.preventDefault(); event.stopPropagation();
          const itemId = event.currentTarget.closest<HTMLElement>("[data-item-id]")?.dataset.itemId;
          if (itemId) editor.onStartTextFrameResize?.(event, frameKey, itemId);
        }}
      />
    </> : null}
  </span>;
}

function FreeItem({ item, editor, textFrames }: { item: VisualBlock; editor?: CanvasEditorState; textFrames: Record<string, TextFrameStyle> }) {
  const text = (
    field: "richTitle" | "richBody",
    className: string,
    placeholder: string,
    singleLine?: boolean,
  ) => {
    const doc = item[field];
    const frameKey = `${item.id}:${field}`;
    const inner = editor?.renderText
      ? editor.renderText({ itemId: item.id, field, doc, className, placeholder, singleLine })
      : isRichTextEmpty(doc) ? null : <RichTextView doc={doc} className={className} />;
    if (!inner) return null;
    return <TextFrame frameKey={frameKey} style={textFrames[frameKey]} editor={editor} block={!singleLine}>{inner}</TextFrame>;
  };

  if (item.kind === "text") return <section className="free-block free-block--text">{text("richTitle", "free-block__title", "Heading", true)}{text("richBody", "free-block__body", "Add your message here.")}</section>;
  if (item.kind === "subsection") return <section className="free-block free-block--subsection">{text("richTitle", "free-block__subsection-title", "Subsection title", true)}</section>;
  // Plain <img>, not next/image: sources are arbitrary author-supplied URLs
  // (uploads and pasted links) rendered inside newsletter markup that must stay
  // portable to email/static contexts, where the optimiser and its loader do not
  // apply. Lazy loading is the safe perf win available here.
  // eslint-disable-next-line @next/next/no-img-element
  if (item.kind === "image") return item.imageUrl ? <figure className="free-block free-block--image"><img src={item.imageUrl} alt={item.alt ?? ""} loading="lazy" /></figure> : <div className="free-block free-block--placeholder">Add an image</div>;
  if (item.kind === "button") {
    const frameKey = `${item.id}:button`;
    return <div className="free-block free-block--button"><TextFrame frameKey={frameKey} style={textFrames[frameKey]} editor={editor}><a className="button button--red" href={item.href || "#"} onClick={editor ? (event) => event.preventDefault() : undefined}>{item.title || "Button"}</a></TextFrame></div>;
  }
  if (item.kind === "divider") return <hr className="free-block free-block--divider" />;

  if (item.kind === "table") {
    // columns[0] headers the row-label column itself (e.g. "Measure"); the rest
    // head the data columns, aligned 1:1 with each row's `values`.
    const table = item.tableData ?? { columns: [], rows: [] };
    const [labelHeader, ...dataHeaders] = table.columns;
    return <section className="free-block free-block--table">
      {text("richTitle", "free-block__title", "Table heading", true)}
      <div className="metrics-table-wrap">
        <table className="metrics-table">
          <thead><tr><th>{labelHeader}</th>{dataHeaders.map((column, index) => <th key={index}>{column}</th>)}</tr></thead>
          <tbody>
            {table.rows.map((row, index) => <tr key={index}>
              <th>{row.label}</th>
              {dataHeaders.map((_, columnIndex) => <td key={columnIndex}>{row.values[columnIndex] ?? ""}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>;
  }

  if (item.kind === "status-list") {
    const rows = item.statusItems ?? [];
    return <section className="free-block free-block--status">
      {text("richTitle", "free-block__title", "Status list heading", true)}
      <div className="status-list">
        {rows.map((row, index) => <div className="status-row" key={index}>
          <span className={`status-token${row.tokenRed ? " status-token--red" : ""}`} aria-hidden="true">{row.token}</span>
          <div><small>{row.label}</small><strong>{row.strongPrefix}<em>{row.strongEmphasis}</em></strong></div>
        </div>)}
      </div>
    </section>;
  }

  if (item.kind === "highlight") {
    const highlight = item.highlight ?? { value: "0", unit: "", label: "", tone: "navy" as const };
    return <section className={`free-block free-block--highlight free-block--highlight-${highlight.tone}`}>
      <strong className="free-block__highlight-value">{highlight.value}{highlight.unit ? <span className="unit">{highlight.unit}</span> : null}</strong>
      <span className="free-block__highlight-label">{highlight.label}</span>
    </section>;
  }

  return <section className="free-block free-block--container">{text("richTitle", "free-block__title", "Card title", true)}{text("richBody", "free-block__body", "Add supporting details here.")}</section>;
}

export function ItemCanvas({ content, page, native, editor }: {
  content: NewsletterContent;
  page: VisualPageId;
  native: Record<string, ReactNode>;
  editor?: CanvasEditorState;
}) {
  const document = visualDocument(content); const pageDocument = document.pages[page]; const itemMap = new Map(pageDocument.items.map((item) => [item.id, item]));
  const pageVars = {
    "--page-background": pageDocument.background, "--page-content-width": `${pageDocument.contentWidth}px`, "--page-min-height": `${pageDocument.minHeight}px`,
    "--page-padding-top": `${pageDocument.paddingTop}px`, "--page-padding-right": `${pageDocument.paddingRight}px`, "--page-padding-bottom": `${pageDocument.paddingBottom}px`,
    "--page-padding-left": `${pageDocument.paddingLeft}px`, "--page-row-gap": `${pageDocument.rowGap}px`,
  } as CSSProperties;

  // Selection is an array so shift-click can extend it; `selectedId` stays the
  // primary (first) selection for callers that only handle one item.
  const selectedIds = editor?.selectedIds ?? (editor?.selectedId ? [editor.selectedId] : []);

  return <ThemeStyles theme={document.theme}><div
    ref={editor?.surfaceRef as RefObject<HTMLDivElement> | undefined}
    className={`item-page item-page--${page}${editor ? " item-page--editing" : ""}`}
    style={pageVars}
    // A click that reaches the page background means nothing was hit.
    onPointerDown={editor ? (event) => { if (event.target === event.currentTarget) editor.onDeselect?.(); } : undefined}
    // While editing, links are content to be edited rather than followed —
    // clicking the "Cow Appreciation Day" card should put a caret in it, not
    // jump the page down to the events section.
    //
    // Capture phase, not bubble: Next.js <Link> handles the click on the anchor
    // itself, which would already have navigated by the time a bubbled handler
    // here ran. Stopping it on the way down is the only reliable point.
    onClickCapture={editor ? (event) => {
      if ((event.target as HTMLElement).closest("a")) {
        event.preventDefault();
        event.stopPropagation();
      }
    } : undefined}
  >
    <div className="item-page__content">
      {pageDocument.rows.map((row) => {
        const items = row.itemIds.map((id) => itemMap.get(id)).filter((item): item is VisualBlock => {
          if (!item || item.style?.hidden) return false;
          const parent = item.attachedTo ? itemMap.get(item.attachedTo) : undefined;
          return !item.attachedTo || Boolean(parent && !parent.style?.hidden);
        });
        if (!items.length) return null;
        const attached = items.length === 1 && items[0].kind === "subsection" && Boolean(items[0].attachedTo);
        return <div className={`item-row-shell${attached ? " item-row-shell--attached-subsection" : ""}`} key={row.id} data-row-id={row.id}>
          <div className={`item-row${row.keepColumnsOnPhone ? " item-row--phone-columns" : ""}${items.length > 1 ? " item-row--paired" : ""}`} style={{ gap: `${row.gap}px`, alignItems: row.align }}>
            {items.map((item) => {
              const selectedIndex = selectedIds.indexOf(item.id);
              const selected = selectedIndex >= 0;
              const primary = selectedIndex === 0;
              const inner = item.kind === "native" ? native[item.nativeId ?? item.id] : <FreeItem item={item} editor={editor} textFrames={document.textFrames} />;
              if (!inner) return null;
              const keyboard = (event: KeyboardEvent<HTMLDivElement>) => {
                if (event.target !== event.currentTarget) return;
                const amount = event.shiftKey ? 10 : 1;
                if (event.key === "ArrowLeft") { event.preventDefault(); editor?.onNudgeItem?.(item.id, -amount, 0); }
                if (event.key === "ArrowRight") { event.preventDefault(); editor?.onNudgeItem?.(item.id, amount, 0); }
                if (event.key === "ArrowUp") { event.preventDefault(); editor?.onNudgeItem?.(item.id, 0, -amount); }
                if (event.key === "ArrowDown") { event.preventDefault(); editor?.onNudgeItem?.(item.id, 0, amount); }
              };
              return <div
                key={item.id} data-item-id={item.id} tabIndex={editor ? 0 : undefined}
                className={`newsletter-item newsletter-item--${item.kind}${selected ? " newsletter-item--selected" : ""}${primary ? " newsletter-item--primary" : ""}`}
                style={styleForBlock(item.style)}
                onPointerDown={editor ? (event) => {
                  // Text editing owns its own pointer handling; don't steal it.
                  if ((event.target as HTMLElement).closest(".rt-editable, .newsletter-item__resize, .text-frame")) return;
                  event.stopPropagation();
                  editor.onSelect?.(item.id, event.shiftKey);
                } : undefined}
                onKeyDown={editor ? keyboard : undefined}
              >
                {editor ? <>
                  <span
                    className="newsletter-item__grip"
                    role="button"
                    tabIndex={-1}
                    aria-label={`Drag ${item.label}`}
                    onPointerDown={(event) => { event.stopPropagation(); editor.onSelect?.(item.id, event.shiftKey); editor.onStartDrag?.(event, item.id); }}
                  >⋮⋮</span>
                  <span className="newsletter-item__label">{item.label}</span>
                </> : null}
                {inner}
                {editor && selected ? <>
                  <span className="newsletter-item__dims" aria-hidden="true" />
                  {RESIZE_HANDLES.map((handle) => <button
                    key={handle}
                    type="button"
                    className={`newsletter-item__resize newsletter-item__resize--${handle}`}
                    aria-label={`Resize ${item.label} from ${handle}`}
                    onPointerDown={(event) => { event.stopPropagation(); editor.onStartResize?.(event, item.id, handle); }}
                  />)}
                </> : null}
              </div>;
            })}
          </div>
        </div>;
      })}
    </div>
    {editor?.overlay ?? null}
  </div></ThemeStyles>;
}
