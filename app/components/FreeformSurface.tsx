"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { NewsletterContent, VisualPageId, FreeformItemStyle, FreeformLayout } from "../content/types";
import { visualDocument } from "../content/visual";
import type { CanvasEditorState } from "./PageBlocks";

const targetSelector = "h1,h2,h3,p,a,button,article,aside,li,img,figure,table,.card-body,.card-icon,.action-block,.priority-stack,.score-teaser,.score-teaser__result,.score-teaser__focus,.recognition-feature,.recognition-grid,.mini-card,.event-list,.event-row,.grow-card,.status-list,.status-row,.deadline-alert,.goal-summary,.metric-list,.metric-card,.focus-callout,.metrics-table-wrap,.momentum-note,.leader-help,.free-block,.site-footer,.site-hero__topline,.site-hero__brand,.site-hero__back,.site-menu,.site-hero__copy";

function elementPath(element: Element, root: Element) {
  const parts: number[] = [];
  let current: Element | null = element;
  while (current && current !== root) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    parts.unshift(Array.from(parent.children).indexOf(current));
    current = parent;
  }
  return parts.join(".");
}

function defaultItem(): FreeformItemStyle {
  return { linked: true, phone: { x: 0, y: 0 }, desktop: { x: 0, y: 0 }, zIndex: 1, opacity: 100, locked: false, hidden: false };
}

function applyItem(element: HTMLElement, item: FreeformItemStyle) {
  const setLayout = (prefix: string, value: FreeformLayout) => {
    element.style.setProperty(`--ff-${prefix}-x`, `${value.x}px`);
    element.style.setProperty(`--ff-${prefix}-y`, `${value.y}px`);
    element.style.setProperty(`--ff-${prefix}-width`, value.width ? `${value.width}%` : "auto");
    element.style.setProperty(`--ff-${prefix}-height`, value.minHeight ? `${value.minHeight}px` : "auto");
    element.style.setProperty(`--ff-${prefix}-rotation`, `${value.rotation ?? 0}deg`);
  };
  setLayout("phone", item.phone); setLayout("desktop", item.desktop);
  element.style.setProperty("--ff-z", String(item.zIndex));
  element.style.setProperty("--ff-opacity", String(item.opacity / 100));
  const optional = (property: string, value: string | undefined) => value == null ? element.style.removeProperty(property) : element.style.setProperty(property, value);
  optional("font-size", item.fontSize ? `${item.fontSize}px` : undefined);
  optional("font-weight", item.fontWeight ? String(item.fontWeight) : undefined);
  optional("text-align", item.textAlign);
  optional("color", item.color);
  optional("background", item.background);
  optional("border-radius", item.borderRadius != null ? `${item.borderRadius}px` : undefined);
  optional("padding", item.padding != null ? `${item.padding}px` : undefined);
  element.classList.toggle("freeform-hidden", item.hidden);
  element.classList.toggle("freeform-locked", item.locked);
}

export function FreeformSurface({ page, content, editor, children }: { page: VisualPageId; content: NewsletterContent; editor?: CanvasEditorState; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [guide, setGuide] = useState(false);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const styles = useMemo(() => visualDocument(content).freeform[page], [content, page]);
  const selectedKey = editor?.selectedId?.startsWith("freeform:") ? editor.selectedId.slice(9) : null;

  useLayoutEffect(() => {
    const root = rootRef.current; if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(targetSelector)).filter((element) => !element.closest(".freeform-controls") && !element.classList.contains("canvas-sortable__handle") && !element.classList.contains("hero-item__handle"));
    const discovered: Array<{ id: string; label: string; tag: string; textEditable: boolean; text?: string; href?: string }> = [];
    for (const element of elements) {
      const id = `${page}:${elementPath(element, root)}`;
      element.dataset.freeformId = id;
      element.dataset.freeformLabel = (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 54);
      const textEditable = !element.children.length && /^(H1|H2|H3|P|A|BUTTON|SMALL|STRONG|SPAN)$/.test(element.tagName);
      if (textEditable && element.dataset.freeformOriginalText == null) element.dataset.freeformOriginalText = element.textContent ?? "";
      if (element instanceof HTMLAnchorElement && element.dataset.freeformOriginalHref == null) element.dataset.freeformOriginalHref = element.getAttribute("href") ?? "";
      element.classList.add("freeform-item");
      if (editor) element.tabIndex = 0; else element.removeAttribute("tabindex");
      element.classList.toggle("freeform-item--selected", selectedKey === id);
      const item = styles[id] ?? defaultItem();
      applyItem(element, item);
      if (textEditable) element.textContent = item.text ?? element.dataset.freeformOriginalText ?? "";
      if (element instanceof HTMLAnchorElement) element.setAttribute("href", item.href ?? element.dataset.freeformOriginalHref ?? "#");
      discovered.push({ id, label: element.dataset.freeformLabel || element.tagName, tag: element.tagName.toLowerCase(), textEditable, text: textEditable ? element.dataset.freeformOriginalText : undefined, href: element instanceof HTMLAnchorElement ? element.getAttribute("href") ?? undefined : undefined });
    }
    editor?.onFreeformDiscover?.(discovered);
    const selected = selectedKey ? root.querySelector<HTMLElement>(`[data-freeform-id="${CSS.escape(selectedKey)}"]`) : null;
    const nextRect = selected?.getBoundingClientRect() ?? null;
    setSelectionRect((previous) => previous && nextRect && previous.left === nextRect.left && previous.top === nextRect.top && previous.width === nextRect.width && previous.height === nextRect.height ? previous : nextRect);
  }, [editor?.onFreeformDiscover, selectedKey, styles]);

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editor || (event.target as HTMLElement).closest(".freeform-controls")) return;
    const root = rootRef.current; const target = (event.target as HTMLElement).closest<HTMLElement>("[data-freeform-id]");
    if (!root || !target || !root.contains(target)) return;
    const id = target.dataset.freeformId!; editor.onSelect?.(`freeform:${id}`);
    const item = styles[id] ?? defaultItem(); if (item.locked) return;
    event.preventDefault(); event.stopPropagation();
    const device = editor.device ?? "phone"; const startLayout = item[device];
    const startX = event.clientX; const startY = event.clientY; const targetRect = target.getBoundingClientRect(); const rootRect = root.getBoundingClientRect();
    const move = (next: globalThis.PointerEvent) => {
      let x = startLayout.x + next.clientX - startX; const y = startLayout.y + next.clientY - startY;
      const center = targetRect.left + targetRect.width / 2 + next.clientX - startX;
      const canvasCenter = rootRect.left + rootRect.width / 2;
      const snapped = Math.abs(center - canvasCenter) <= 10;
      if (snapped) x += canvasCenter - center;
      setGuide(snapped); editor.onFreeformChange?.(id, device, { x: Math.round(x), y: Math.round(y) });
    };
    const end = () => { setGuide(false); globalThis.removeEventListener("pointermove", move); globalThis.removeEventListener("pointerup", end); };
    globalThis.addEventListener("pointermove", move); globalThis.addEventListener("pointerup", end);
  };

  const resize = (event: ReactPointerEvent<HTMLButtonElement>, axis: "width" | "height") => {
    event.preventDefault(); event.stopPropagation();
    if (!editor || !selectedKey || !rootRef.current) return;
    const target = rootRef.current.querySelector<HTMLElement>(`[data-freeform-id="${CSS.escape(selectedKey)}"]`); if (!target) return;
    const item = styles[selectedKey] ?? defaultItem(); if (item.locked) return;
    const rect = target.getBoundingClientRect(); const rootRect = rootRef.current.getBoundingClientRect(); const start = axis === "width" ? event.clientX : event.clientY;
    const move = (next: globalThis.PointerEvent) => {
      const delta = (axis === "width" ? next.clientX : next.clientY) - start;
      if (axis === "width") editor.onFreeformChange?.(selectedKey, editor.device ?? "phone", { width: Math.max(5, Math.min(200, Math.round(((rect.width + delta) / rootRect.width) * 100))) });
      else editor.onFreeformChange?.(selectedKey, editor.device ?? "phone", { minHeight: Math.max(0, Math.min(2000, Math.round(rect.height + delta))) });
    };
    const end = () => { globalThis.removeEventListener("pointermove", move); globalThis.removeEventListener("pointerup", end); };
    globalThis.addEventListener("pointermove", move); globalThis.addEventListener("pointerup", end);
  };

  const keyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!editor || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-freeform-id]"); if (!target) return;
    const id = target.dataset.freeformId!; const item = styles[id] ?? defaultItem(); if (item.locked) return;
    event.preventDefault(); const device = editor.device ?? "phone"; const layout = item[device]; const step = event.shiftKey ? 10 : 1;
    editor.onSelect?.(`freeform:${id}`);
    editor.onFreeformChange?.(id, device, { x: layout.x + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0), y: layout.y + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0) });
  };

  const rootRect = rootRef.current?.getBoundingClientRect();
  const overlay = selectionRect && rootRect ? { left: selectionRect.left - rootRect.left, top: selectionRect.top - rootRect.top, width: selectionRect.width, height: selectionRect.height } : null;
  return <div ref={rootRef} className={`freeform-surface${editor ? " freeform-surface--editing" : ""}`} onPointerDown={pointerDown} onKeyDown={keyDown}>
    {children}
    {guide ? <span className="freeform-center-guide" aria-hidden="true" /> : null}
    {editor && overlay ? <div className="freeform-controls" style={overlay}><button type="button" className="freeform-resize freeform-resize--width" aria-label="Resize selected item width" onPointerDown={(event) => resize(event, "width")} /><button type="button" className="freeform-resize freeform-resize--height" aria-label="Resize selected item height" onPointerDown={(event) => resize(event, "height")} /></div> : null}
  </div>;
}
