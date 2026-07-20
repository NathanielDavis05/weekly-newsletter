"use client";

// Eight-handle resizing.
//
// While the pointer is down we write straight to the element's inline style so
// the drag stays smooth — no React render per pointer move. The document is
// only updated once, on pointer up, and the whole gesture is wrapped in a
// history transaction so it collapses to a single undo step.

import { useCallback, useRef } from "react";
import type { ResponsiveLayout } from "../../content/types";
import type { GuideLayerHandle } from "./GuideLayer";
import { snapHeight, snapWidth, type Guide } from "./geometry";

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export const RESIZE_HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

/** Below this the element becomes impossible to grab again. */
const MIN_WIDTH_PERCENT = 10;
const MIN_HEIGHT_PX = 0;

export interface ResizeCallbacks {
  /** Opens the history transaction. */
  onBegin: () => void;
  /** Applies the final size once the gesture ends. */
  onCommit: (itemId: string, patch: Partial<ResponsiveLayout>) => void;
  /** Closes the transaction (committed or aborted). */
  onEnd: (changed: boolean) => void;
  guides: React.RefObject<GuideLayerHandle | null>;
  /** Canvas element the guide coordinates are relative to. */
  surface: React.RefObject<HTMLElement | null>;
}

export function useResize({ onBegin, onCommit, onEnd, guides, surface }: ResizeCallbacks) {
  const active = useRef(false);

  return useCallback(
    (event: React.PointerEvent, itemId: string, handle: ResizeHandle) => {
      if (active.current || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const host = (event.currentTarget as HTMLElement).closest<HTMLElement>(".newsletter-item");
      const row = host?.parentElement;
      if (!host || !row) return;

      active.current = true;
      onBegin();

      const startX = event.clientX;
      const startY = event.clientY;
      const startRect = host.getBoundingClientRect();
      const rowWidth = row.getBoundingClientRect().width || 1;
      const aspect = startRect.height / Math.max(1, startRect.width);

      // Sibling geometry drives the "match sibling" snap.
      const siblings = Array.from(row.children).filter(
        (node): node is HTMLElement => node !== host && node instanceof HTMLElement && node.classList.contains("newsletter-item"),
      );
      const siblingWidths = siblings.map((node) => (node.getBoundingClientRect().width / rowWidth) * 100);
      const siblingHeights = siblings.map((node) => node.getBoundingClientRect().height);

      const horizontal = handle.includes("e") || handle.includes("w");
      const vertical = handle.includes("n") || handle.includes("s");
      const widthSign = handle.includes("w") ? -1 : 1;
      const heightSign = handle.includes("n") ? -1 : 1;

      host.classList.add("newsletter-item--resizing");

      let widthPercent = (startRect.width / rowWidth) * 100;
      let heightPx = startRect.height;
      let changed = false;

      const move = (next: PointerEvent) => {
        // Alt resizes symmetrically, so the pointer delta counts twice.
        const scale = next.altKey ? 2 : 1;
        const dx = (next.clientX - startX) * widthSign * scale;
        const dy = (next.clientY - startY) * heightSign * scale;

        let nextWidth = widthPercent;
        let nextHeight = heightPx;
        const labels: string[] = [];

        if (horizontal) {
          const raw = ((startRect.width + dx) / rowWidth) * 100;
          const snapped = snapWidth(Math.max(MIN_WIDTH_PERCENT, raw), next.altKey ? [] : siblingWidths);
          nextWidth = snapped.value;
          if (snapped.label) labels.push(snapped.label);
        }
        if (vertical) {
          const raw = Math.max(MIN_HEIGHT_PX, startRect.height + dy);
          const snapped = snapHeight(raw, next.altKey ? [] : siblingHeights);
          nextHeight = snapped.value;
          if (snapped.label) labels.push(snapped.label);
        }
        // Shift locks the aspect ratio to the size at gesture start.
        if (next.shiftKey && horizontal) {
          nextHeight = Math.round((nextWidth / 100) * rowWidth * aspect);
        }

        widthPercent = nextWidth;
        heightPx = nextHeight;
        changed = true;

        if (horizontal) host.style.setProperty("--item-live-width", `${nextWidth}%`);
        if (vertical || (next.shiftKey && horizontal)) {
          host.style.setProperty("--item-live-min-height", `${nextHeight}px`);
        }

        const surfaceRect = surface.current?.getBoundingClientRect();
        const liveRect = host.getBoundingClientRect();
        if (surfaceRect) {
          const lines: Guide[] = [];
          // Show which edge the snap latched onto.
          if (horizontal) {
            lines.push({
              orientation: "vertical",
              position: (handle.includes("w") ? liveRect.left : liveRect.right) - surfaceRect.left,
              start: liveRect.top - surfaceRect.top,
              end: liveRect.bottom - surfaceRect.top,
              kind: labels.length ? "center" : "edge",
            });
          }
          if (vertical) {
            lines.push({
              orientation: "horizontal",
              position: (handle.includes("n") ? liveRect.top : liveRect.bottom) - surfaceRect.top,
              start: liveRect.left - surfaceRect.left,
              end: liveRect.right - surfaceRect.left,
              kind: labels.length ? "center" : "edge",
            });
          }
          guides.current?.setGuides(lines);
          guides.current?.setReadout({
            left: liveRect.right - surfaceRect.left + 8,
            top: liveRect.top - surfaceRect.top,
            text: [
              horizontal ? `${Math.round(nextWidth)}%` : null,
              vertical || next.shiftKey ? `${Math.round(nextHeight)}px` : null,
              labels[0] ?? null,
            ]
              .filter(Boolean)
              .join(" · "),
          });
        }
      };

      const end = () => {
        globalThis.removeEventListener("pointermove", move);
        globalThis.removeEventListener("pointerup", end);
        globalThis.removeEventListener("pointercancel", end);
        host.classList.remove("newsletter-item--resizing");
        host.style.removeProperty("--item-live-width");
        host.style.removeProperty("--item-live-min-height");
        guides.current?.clear();
        active.current = false;

        if (changed) {
          const patch: Partial<ResponsiveLayout> = {};
          if (horizontal) patch.width = Math.round(widthPercent);
          if (vertical) patch.minHeight = Math.round(heightPx);
          if (Object.keys(patch).length) onCommit(itemId, patch);
        }
        onEnd(changed);
      };

      globalThis.addEventListener("pointermove", move);
      globalThis.addEventListener("pointerup", end);
      globalThis.addEventListener("pointercancel", end);
    },
    [guides, onBegin, onCommit, onEnd, surface],
  );
}
