"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, RefObject } from "react";
import type { ResizeHandle } from "../edit/canvas/useResize";
import { RESIZE_HANDLES } from "../edit/canvas/useResize";
import type { RichText } from "../content/richtext";
import { isRichTextEmpty } from "../content/richtext";
import type { NewsletterContent, ResponsiveLayout, VisualBlock, VisualPageId } from "../content/types";
import { styleForBlock, visualDocument } from "../content/visual";
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

function FreeItem({ item, editor }: { item: VisualBlock; editor?: CanvasEditorState }) {
  const text = (
    field: "richTitle" | "richBody",
    className: string,
    placeholder: string,
    singleLine?: boolean,
  ) => {
    const doc = item[field];
    if (editor?.renderText) {
      return editor.renderText({ itemId: item.id, field, doc, className, placeholder, singleLine });
    }
    return isRichTextEmpty(doc) ? null : <RichTextView doc={doc} className={className} />;
  };

  if (item.kind === "text") return <section className="free-block free-block--text">{text("richTitle", "free-block__title", "Heading", true)}{text("richBody", "free-block__body", "Add your message here.")}</section>;
  if (item.kind === "image") return item.imageUrl ? <figure className="free-block free-block--image"><img src={item.imageUrl} alt={item.alt ?? ""} /></figure> : <div className="free-block free-block--placeholder">Add an image</div>;
  if (item.kind === "button") return <div className="free-block free-block--button"><a className="button button--red" href={item.href || "#"} onClick={editor ? (event) => event.preventDefault() : undefined}>{item.title || "Button"}</a></div>;
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
        const items = row.itemIds.map((id) => itemMap.get(id)).filter((item): item is VisualBlock => item !== undefined && !item.style?.hidden);
        if (!items.length) return null;
        return <div className="item-row-shell" key={row.id} data-row-id={row.id}>
          <div className={`item-row${row.keepColumnsOnPhone ? " item-row--phone-columns" : ""}${items.length > 1 ? " item-row--paired" : ""}`} style={{ gap: `${row.gap}px`, alignItems: row.align }}>
            {items.map((item) => {
              const selectedIndex = selectedIds.indexOf(item.id);
              const selected = selectedIndex >= 0;
              const primary = selectedIndex === 0;
              const inner = item.kind === "native" ? native[item.nativeId ?? item.id] : <FreeItem item={item} editor={editor} />;
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
                  if ((event.target as HTMLElement).closest(".rt-editable, .newsletter-item__resize")) return;
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
