"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import type { NewsletterContent, VisualPageId, FreeformItemStyle, FreeformLayout } from "../content/types";
import { visualDocument } from "../content/visual";
import type { CanvasEditorState } from "./PageBlocks";

const targetSelector = "h1,h2,h3,p,a,button,article,aside,li,img,figure,table,span,strong,small,time,em,.card-body,.card-icon,.action-block,.priority-stack,.score-teaser,.score-teaser__result,.score-teaser__focus,.recognition-feature,.recognition-grid,.mini-card,.event-list,.event-row,.grow-card,.status-list,.status-row,.deadline-alert,.goal-summary,.metric-list,.metric-card,.focus-callout,.metrics-table-wrap,.momentum-note,.leader-help,.page-block--free,.site-footer,.site-hero__topline,.site-hero__brand,.site-hero__back,.site-menu,.site-hero__copy";
type ResizeDirection = "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw";
type CanvasAlignment = "left" | "center-x" | "right" | "top" | "center-y" | "bottom";
const SNAP_DISTANCE = 6;
const RESIZE_MIN = 1;
const RESIZE_MAX = 12000;

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
    element.style.setProperty(`--ff-${prefix}-width`, value.widthPx ? `${value.widthPx}px` : value.width ? `${value.width}%` : "auto");
    element.style.setProperty(`--ff-${prefix}-height`, value.height ? `${value.height}px` : "auto");
    element.style.setProperty(`--ff-${prefix}-min-height`, value.minHeight ? `${value.minHeight}px` : "0px");
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
  element.style.setProperty("--ff-overflow", item.overflow ?? (item.phone.height || item.desktop.height ? "hidden" : "visible"));
  element.classList.toggle("freeform-hidden", item.hidden);
  element.classList.toggle("freeform-locked", item.locked);
  element.classList.toggle("freeform-absolute", item.position === "absolute");
}

export function FreeformSurface({ page, content, editor, children }: { page: VisualPageId; content: NewsletterContent; editor?: CanvasEditorState; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const styles = useMemo(() => visualDocument(content).freeform[page], [content, page]);
  const canvas = useMemo(() => visualDocument(content).canvas[page], [content, page]);
  const selectedKey = editor?.selectedId?.startsWith("freeform:") ? editor.selectedId.slice(9) : null;

  useLayoutEffect(() => {
    const root = rootRef.current; if (!root) return;
    const elements = Array.from(root.querySelectorAll<HTMLElement>(targetSelector)).filter((element) => {
      if (element.closest(".freeform-controls") || element.classList.contains("canvas-sortable__handle") || element.classList.contains("hero-item__handle")) return false;
      if (/^(SPAN|STRONG|SMALL|TIME|EM)$/.test(element.tagName) && !(element.textContent || "").trim() && !element.getAttribute("aria-label")) return false;
      return true;
    });
    const discovered: Array<{ id: string; label: string; tag: string; textEditable: boolean; text?: string; href?: string }> = [];
    for (const element of elements) {
      const id = element.dataset.blockId ? `block:${element.dataset.blockId}` : `${page}:${elementPath(element, root)}`;
      element.dataset.freeformId = id;
      element.dataset.freeformLabel = (element.getAttribute("aria-label") || element.textContent || element.tagName).trim().replace(/\s+/g, " ").slice(0, 54);
      const textEditable = !element.children.length && /^(H1|H2|H3|P|A|BUTTON|SMALL|STRONG|SPAN|TIME|EM)$/.test(element.tagName);
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
      const dx = next.clientX - startX; const dy = next.clientY - startY;
      let adjustX = 0; let adjustY = 0; let guideX: number | undefined; let guideY: number | undefined;
      if (!next.altKey) {
        const others = Array.from(root.querySelectorAll<HTMLElement>("[data-freeform-id]")).filter((element) => element !== target && !element.contains(target) && !target.contains(element) && !element.classList.contains("freeform-hidden"));
        const xTargets = [rootRect.left + rootRect.width / 2]; const yTargets = [rootRect.top + rootRect.height / 2];
        for (const element of others) { const rect = element.getBoundingClientRect(); xTargets.push(rect.left, rect.left + rect.width / 2, rect.right); yTargets.push(rect.top, rect.top + rect.height / 2, rect.bottom); }
        const movingX = [targetRect.left + dx, targetRect.left + targetRect.width / 2 + dx, targetRect.right + dx];
        const movingY = [targetRect.top + dy, targetRect.top + targetRect.height / 2 + dy, targetRect.bottom + dy];
        let bestX = 7; let bestY = 7;
        for (const moving of movingX) for (const candidate of xTargets) { const difference = candidate - moving; if (Math.abs(difference) < Math.abs(bestX)) { bestX = difference; guideX = candidate - rootRect.left; } }
        for (const moving of movingY) for (const candidate of yTargets) { const difference = candidate - moving; if (Math.abs(difference) < Math.abs(bestY)) { bestY = difference; guideY = candidate - rootRect.top; } }
        if (Math.abs(bestX) <= 6) adjustX = bestX; else guideX = undefined;
        if (Math.abs(bestY) <= 6) adjustY = bestY; else guideY = undefined;
      }
      const x = startLayout.x + dx + adjustX; const y = startLayout.y + dy + adjustY;
      setGuides({ x: guideX, y: guideY }); editor.onFreeformChange?.(id, device, { x: Math.round(x), y: Math.round(y) });
      const projectedBottom = targetRect.bottom + dy + adjustY - rootRect.top;
      if (projectedBottom > canvas[device] - 60) editor.onCanvasHeightChange?.(device, Math.min(12000, Math.ceil(projectedBottom + 120)));
    };
    const end = () => { setGuides({}); globalThis.removeEventListener("pointermove", move); globalThis.removeEventListener("pointerup", end); };
    globalThis.addEventListener("pointermove", move); globalThis.addEventListener("pointerup", end);
  };

  const resize = (event: ReactPointerEvent<HTMLButtonElement>, direction: ResizeDirection) => {
    event.preventDefault(); event.stopPropagation();
    if (!editor || !selectedKey || !rootRef.current) return;
    const target = rootRef.current.querySelector<HTMLElement>(`[data-freeform-id="${CSS.escape(selectedKey)}"]`); if (!target) return;
    const item = styles[selectedKey] ?? defaultItem(); if (item.locked) return;
    const rect = target.getBoundingClientRect(); const startX = event.clientX; const startY = event.clientY;
    const device = editor.device ?? "phone"; const layout = item[device];
    const move = (next: globalThis.PointerEvent) => {
      const dx = next.clientX - startX; const dy = next.clientY - startY;
      const west = direction.includes("w"); const east = direction.includes("e"); const north = direction.includes("n"); const south = direction.includes("s");
      let snappedDx = dx; let snappedDy = dy; let guideX: number | undefined; let guideY: number | undefined;
      if (!next.altKey) {
        const others = Array.from(rootRef.current!.querySelectorAll<HTMLElement>("[data-freeform-id]")).filter((element) => element !== target && !element.contains(target) && !target.contains(element) && !element.classList.contains("freeform-hidden"));
        const rootRect = rootRef.current!.getBoundingClientRect();
        const xTargets = [rootRect.left, rootRect.left + rootRect.width / 2, rootRect.right];
        const yTargets = [rootRect.top, rootRect.top + rootRect.height / 2, rootRect.bottom];
        const widths = [rootRect.width]; const heights = [rootRect.height];
        for (const element of others) {
          const other = element.getBoundingClientRect();
          xTargets.push(other.left, other.left + other.width / 2, other.right);
          yTargets.push(other.top, other.top + other.height / 2, other.bottom);
          widths.push(other.width); heights.push(other.height);
        }
        if (west || east) {
          const activeEdge = east ? rect.right + snappedDx : rect.left + snappedDx;
          let edgeDelta = SNAP_DISTANCE + 1; let edgeTarget: number | undefined;
          for (const candidate of xTargets) {
            const difference = candidate - activeEdge;
            if (Math.abs(difference) < Math.abs(edgeDelta)) { edgeDelta = difference; edgeTarget = candidate; }
          }
          if (Math.abs(edgeDelta) <= SNAP_DISTANCE) { snappedDx += edgeDelta; guideX = edgeTarget! - rootRect.left; }
          const currentWidth = rect.width + (east ? snappedDx : -snappedDx);
          let sizeDelta = SNAP_DISTANCE + 1; let matchingWidth: number | undefined;
          for (const width of widths) {
            const difference = width - currentWidth;
            if (Math.abs(difference) < Math.abs(sizeDelta)) { sizeDelta = difference; matchingWidth = width; }
          }
          if (Math.abs(sizeDelta) <= SNAP_DISTANCE) {
            snappedDx += east ? sizeDelta : -sizeDelta;
            const matchingEdge = east ? rect.right + snappedDx : rect.left + snappedDx;
            guideX = matchingEdge - rootRect.left;
            void matchingWidth;
          }
        }
        if (north || south) {
          const activeEdge = south ? rect.bottom + snappedDy : rect.top + snappedDy;
          let edgeDelta = SNAP_DISTANCE + 1; let edgeTarget: number | undefined;
          for (const candidate of yTargets) {
            const difference = candidate - activeEdge;
            if (Math.abs(difference) < Math.abs(edgeDelta)) { edgeDelta = difference; edgeTarget = candidate; }
          }
          if (Math.abs(edgeDelta) <= SNAP_DISTANCE) { snappedDy += edgeDelta; guideY = edgeTarget! - rootRect.top; }
          const currentHeight = rect.height + (south ? snappedDy : -snappedDy);
          let sizeDelta = SNAP_DISTANCE + 1; let matchingHeight: number | undefined;
          for (const height of heights) {
            const difference = height - currentHeight;
            if (Math.abs(difference) < Math.abs(sizeDelta)) { sizeDelta = difference; matchingHeight = height; }
          }
          if (Math.abs(sizeDelta) <= SNAP_DISTANCE) {
            snappedDy += south ? sizeDelta : -sizeDelta;
            const matchingEdge = south ? rect.bottom + snappedDy : rect.top + snappedDy;
            guideY = matchingEdge - rootRect.top;
            void matchingHeight;
          }
        }
      }
      setGuides({ x: guideX, y: guideY });
      const widthPx = west || east ? Math.max(RESIZE_MIN, Math.min(RESIZE_MAX, Math.round(rect.width + (east ? snappedDx : -snappedDx)))) : layout.widthPx;
      const height = north || south ? Math.max(RESIZE_MIN, Math.min(RESIZE_MAX, Math.round(rect.height + (south ? snappedDy : -snappedDy)))) : layout.height;
      editor.onFreeformChange?.(selectedKey, device, {
        ...(west || east ? { width: undefined, widthPx } : {}),
        ...(north || south ? { height, minHeight: undefined } : {}),
        ...(west ? { x: Math.round(layout.x + snappedDx) } : {}),
        ...(north ? { y: Math.round(layout.y + snappedDy) } : {}),
      });
    };
    const end = () => { setGuides({}); globalThis.removeEventListener("pointermove", move); globalThis.removeEventListener("pointerup", end); };
    globalThis.addEventListener("pointermove", move); globalThis.addEventListener("pointerup", end);
  };

  const alignSelected = (alignment: CanvasAlignment) => {
    if (!editor || !selectedKey || !rootRef.current) return;
    const target = rootRef.current.querySelector<HTMLElement>(`[data-freeform-id="${CSS.escape(selectedKey)}"]`); if (!target) return;
    const item = styles[selectedKey] ?? defaultItem(); if (item.locked) return;
    const rootRect = rootRef.current.getBoundingClientRect(); const targetRect = target.getBoundingClientRect();
    const device = editor.device ?? "phone"; const layout = item[device];
    if (alignment === "left") editor.onFreeformChange?.(selectedKey, device, { x: Math.round(layout.x + rootRect.left - targetRect.left) });
    if (alignment === "center-x") editor.onFreeformChange?.(selectedKey, device, { x: Math.round(layout.x + (rootRect.left + rootRect.width / 2) - (targetRect.left + targetRect.width / 2)) });
    if (alignment === "right") editor.onFreeformChange?.(selectedKey, device, { x: Math.round(layout.x + rootRect.right - targetRect.right) });
    if (alignment === "top") editor.onFreeformChange?.(selectedKey, device, { y: Math.round(layout.y + rootRect.top - targetRect.top) });
    if (alignment === "center-y") editor.onFreeformChange?.(selectedKey, device, { y: Math.round(layout.y + (rootRect.top + rootRect.height / 2) - (targetRect.top + targetRect.height / 2)) });
    if (alignment === "bottom") editor.onFreeformChange?.(selectedKey, device, { y: Math.round(layout.y + rootRect.bottom - targetRect.bottom) });
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
  const canvasStyle = { "--canvas-phone-height": `${canvas.phone}px`, "--canvas-desktop-height": `${canvas.desktop}px` } as CSSProperties;
  const preventEditorNavigation = (event: ReactMouseEvent<HTMLDivElement>) => { if (editor && !(event.target as HTMLElement).closest(".freeform-controls")) { const action = (event.target as HTMLElement).closest("a,button,summary"); if (action) { event.preventDefault(); event.stopPropagation(); } } };
  return <div ref={rootRef} style={canvasStyle} className={`freeform-surface${editor ? " freeform-surface--editing" : ""}`} onPointerDown={pointerDown} onClickCapture={preventEditorNavigation} onKeyDown={keyDown}>
    {children}
    {guides.x != null ? <span className="freeform-smart-guide freeform-smart-guide--vertical" style={{ left: guides.x }} aria-hidden="true" /> : null}
    {guides.y != null ? <span className="freeform-smart-guide freeform-smart-guide--horizontal" style={{ top: guides.y }} aria-hidden="true" /> : null}
    {editor && overlay ? <div className="freeform-controls" style={overlay}>
      <div className="freeform-align-toolbar" role="group" aria-label="Align on canvas">
        <button type="button" aria-label="Align left" onClick={() => alignSelected("left")}>⇤</button>
        <button type="button" aria-label="Align horizontal middle" onClick={() => alignSelected("center-x")}>↔</button>
        <button type="button" aria-label="Align right" onClick={() => alignSelected("right")}>⇥</button>
        <button type="button" aria-label="Align top" onClick={() => alignSelected("top")}>⇡</button>
        <button type="button" aria-label="Align vertical middle" onClick={() => alignSelected("center-y")}>↕</button>
        <button type="button" aria-label="Align bottom" onClick={() => alignSelected("bottom")}>⇣</button>
      </div>
      {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as ResizeDirection[]).map((direction) => <button key={direction} type="button" className={`freeform-resize freeform-resize--${direction}`} aria-label={`Resize selected item ${direction}`} onPointerDown={(event) => resize(event, direction)} />)}
    </div> : null}
  </div>;
}
