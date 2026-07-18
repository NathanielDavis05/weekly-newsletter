"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import type { NewsletterContent, ResponsiveLayout, VisualBlock, VisualPageId } from "../content/types";
import { styleForBlock, visualDocument } from "../content/visual";

export interface CanvasEditorState {
  selectedId?: string | null;
  device?: "phone" | "desktop";
  onSelect?: (id: string) => void;
  onMoveItem?: (itemId: string, targetRowId: string, zone: "above" | "below" | "left" | "right") => void;
  onResizeItem?: (itemId: string, patch: Partial<ResponsiveLayout>) => void;
  onNudgeItem?: (itemId: string, dx: number, dy: number) => void;
  onFreeTextChange?: (itemId: string, patch: Partial<VisualBlock>) => void;
}

function FreeItem({ item, editor }: { item: VisualBlock; editor?: CanvasEditorState }) {
  const inline = (field: "title" | "body", value: string, className?: string) => editor ? (
    <div
      className={className}
      contentEditable
      suppressContentEditableWarning
      onPointerDown={(event) => event.stopPropagation()}
      onBlur={(event) => editor.onFreeTextChange?.(item.id, { [field]: event.currentTarget.textContent ?? "" })}
    >{value}</div>
  ) : <div className={className}>{value}</div>;
  if (item.kind === "text") return <section className="free-block free-block--text">{item.title ? inline("title", item.title, "free-block__title") : null}{item.body ? inline("body", item.body, "free-block__body") : null}</section>;
  if (item.kind === "image") return item.imageUrl ? <figure className="free-block free-block--image"><img src={item.imageUrl} alt={item.alt ?? ""} /></figure> : <div className="free-block free-block--placeholder">Add an image</div>;
  if (item.kind === "button") return <div className="free-block free-block--button"><a className="button button--red" href={item.href || "#"} onClick={editor ? (event) => event.preventDefault() : undefined}>{item.title || "Button"}</a></div>;
  if (item.kind === "divider") return <hr className="free-block free-block--divider" />;
  return <section className="free-block free-block--container">{item.title ? inline("title", item.title, "free-block__title") : null}{inline("body", item.body || "Container content", "free-block__body")}</section>;
}

function startResize(event: PointerEvent<HTMLButtonElement>, item: VisualBlock, device: "phone" | "desktop", onResize?: CanvasEditorState["onResizeItem"]) {
  event.preventDefault(); event.stopPropagation();
  const host = event.currentTarget.closest<HTMLElement>(".newsletter-item"); if (!host) return;
  const row = host.parentElement; if (!row) return;
  const startX = event.clientX; const startY = event.clientY; const rect = host.getBoundingClientRect(); const startWidth = rect.width; const startHeight = rect.height; const rowWidth = row.getBoundingClientRect().width;
  const move = (next: globalThis.PointerEvent) => {
    let width = Math.max(10, Math.min(100, ((startWidth + next.clientX - startX) / rowWidth) * 100));
    if (!next.altKey) {
      if (Math.abs(width - 50) <= 2.5) width = 50;
      if (Math.abs(width - 100) <= 2.5) width = 100;
      const sibling = Array.from(row.children).find((node) => node !== host && (node as HTMLElement).classList.contains("newsletter-item")) as HTMLElement | undefined;
      if (sibling) { const siblingWidth = sibling.getBoundingClientRect().width / rowWidth * 100; if (Math.abs(width - siblingWidth) <= 2.5) width = siblingWidth; }
    }
    const minHeight = Math.max(0, Math.round(startHeight + next.clientY - startY));
    onResize?.(item.id, { width: Math.round(width), minHeight });
  };
  const end = () => { globalThis.removeEventListener("pointermove", move); globalThis.removeEventListener("pointerup", end); };
  globalThis.addEventListener("pointermove", move); globalThis.addEventListener("pointerup", end);
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

  const drop = (event: React.DragEvent, rowId: string, zone: "above" | "below" | "left" | "right") => {
    const itemId = event.dataTransfer.getData("application/x-newsletter-item"); if (!itemId) return;
    event.preventDefault(); event.stopPropagation(); editor?.onMoveItem?.(itemId, rowId, zone);
  };
  const allowDrop = (event: React.DragEvent) => { if (event.dataTransfer.types.includes("application/x-newsletter-item")) event.preventDefault(); };

  return <div className={`item-page item-page--${page}${editor ? " item-page--editing" : ""}`} style={pageVars}>
    <div className="item-page__content">
      {pageDocument.rows.map((row) => {
        const items = row.itemIds.map((id) => itemMap.get(id)).filter((item): item is VisualBlock => Boolean(item));
        if (!items.length) return null;
        return <div className="item-row-shell" key={row.id} data-row-id={row.id}>
          {editor ? <button className="item-drop item-drop--above" type="button" onDragOver={allowDrop} onDrop={(event) => drop(event, row.id, "above")}>Place above</button> : null}
          <div className={`item-row${row.keepColumnsOnPhone ? " item-row--phone-columns" : ""}`} style={{ gap: `${row.gap}px`, alignItems: row.align }}>
            {editor ? <button className="item-drop item-drop--side item-drop--left" type="button" onDragOver={allowDrop} onDrop={(event) => drop(event, row.id, "left")}>Left</button> : null}
            {items.map((item) => {
              const selected = editor?.selectedId === item.id; const inner = item.kind === "native" ? native[item.nativeId ?? item.id] : <FreeItem item={item} editor={editor} />;
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
                key={item.id} data-item-id={item.id} draggable={Boolean(editor)} tabIndex={editor ? 0 : undefined}
                className={`newsletter-item newsletter-item--${item.kind}${selected ? " newsletter-item--selected" : ""}`}
                style={styleForBlock(item.style)}
                onDragStart={editor ? (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-newsletter-item", item.id); } : undefined}
                onClick={editor ? (event) => { event.preventDefault(); event.stopPropagation(); editor.onSelect?.(item.id); } : undefined}
                onKeyDown={editor ? keyboard : undefined}
              >
                {editor ? <><span className="newsletter-item__grip" aria-label={`Drag ${item.label}`}>⋮⋮</span><span className="newsletter-item__label">{item.label}</span></> : null}
                {inner}
                {editor && selected ? <button type="button" className="newsletter-item__resize" aria-label={`Resize ${item.label}`} onPointerDown={(event) => startResize(event, item, editor.device ?? "phone", editor.onResizeItem)} /> : null}
              </div>;
            })}
            {editor ? <button className="item-drop item-drop--side item-drop--right" type="button" onDragOver={allowDrop} onDrop={(event) => drop(event, row.id, "right")}>Right</button> : null}
          </div>
          {editor ? <button className="item-drop item-drop--below" type="button" onDragOver={allowDrop} onDrop={(event) => drop(event, row.id, "below")}>Place below</button> : null}
        </div>;
      })}
    </div>
  </div>;
}
