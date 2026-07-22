"use client";

// Pointer-driven drag and drop for canvas items.
//
// This replaces the previous HTML5 drag-and-drop with visible "Place above /
// Place below" buttons. Pointer events give us a ghost that tracks the finger
// or cursor exactly, a live insertion indicator, edge auto-scroll, and — unlike
// HTML5 DnD — the same code path works on touch.
//
// Like resizing, the gesture writes to the DOM directly and only touches the
// document once, on drop, inside a history transaction.

import { useCallback, useRef } from "react";
import type { DropZone } from "../commands/documentOps";
import { autoScrollSpeed } from "./geometry";
import type { GuideLayerHandle } from "./GuideLayer";

/** Pointer travel before a press becomes a drag rather than a click. */
const DRAG_THRESHOLD = 5;
/** Fraction of a row's width that counts as its side zone. */
const SIDE_ZONE = 0.3;

export interface DragCallbacks {
  onBegin: () => void;
  onDrop: (itemId: string, targetRowId: string, zone: DropZone) => void;
  onEnd: (dropped: boolean) => void;
  guides: React.RefObject<GuideLayerHandle | null>;
  surface: React.RefObject<HTMLElement | null>;
  /** The scrolling ancestor; auto-scroll runs against it. */
  scroller: React.RefObject<HTMLElement | null>;
  /** True when the row already holds the maximum number of items. */
  canPair: (targetRowId: string, itemId: string) => boolean;
}

interface Target {
  rowId: string;
  zone: DropZone;
  rect: DOMRect;
}

export function useDragReorder({ onBegin, onDrop, onEnd, guides, surface, scroller, canPair }: DragCallbacks) {
  const dragging = useRef(false);

  return useCallback(
    (event: React.PointerEvent, itemId: string) => {
      if (dragging.current || event.button !== 0) return;
      const host = (event.currentTarget as HTMLElement).closest<HTMLElement>(".newsletter-item");
      if (!host) return;

      const startX = event.clientX;
      const startY = event.clientY;
      let started = false;
      let target: Target | null = null;
      let frame = 0;

      const findTarget = (clientX: number, clientY: number): Target | null => {
        const rows = Array.from(
          surface.current?.querySelectorAll<HTMLElement>("[data-row-id]") ?? [],
        );
        let closest: Target | null = null;
        let closestDistance = Infinity;

        for (const row of rows) {
          const rowId = row.dataset.rowId;
          if (!rowId) continue;
          const rect = row.getBoundingClientRect();
          // Distance to the row's vertical span; zero while inside it.
          const distance =
            clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
          if (distance >= closestDistance) continue;

          const offsetX = (clientX - rect.left) / Math.max(1, rect.width);
          let zone: DropZone;
          if (offsetX < SIDE_ZONE && canPair(rowId, itemId)) zone = "left";
          else if (offsetX > 1 - SIDE_ZONE && canPair(rowId, itemId)) zone = "right";
          else zone = clientY < rect.top + rect.height / 2 ? "above" : "below";

          closest = { rowId, zone, rect };
          closestDistance = distance;
        }
        return closest;
      };

      const paint = (clientX: number, clientY: number) => {
        host.style.setProperty("--item-drag-x", `${clientX - startX}px`);
        host.style.setProperty("--item-drag-y", `${clientY - startY}px`);

        target = findTarget(clientX, clientY);
        const surfaceRect = surface.current?.getBoundingClientRect();
        if (!target || !surfaceRect) {
          guides.current?.setDrop(null);
          return;
        }

        const { rect, zone } = target;
        const left = rect.left - surfaceRect.left;
        const top = rect.top - surfaceRect.top;
        if (zone === "left" || zone === "right") {
          guides.current?.setDrop({
            left: zone === "left" ? left - 2 : left + rect.width - 2,
            top,
            width: 4,
            height: rect.height,
            orientation: "vertical",
            label: zone === "left" ? "Place left" : "Place right",
          });
        } else {
          guides.current?.setDrop({
            left,
            top: zone === "above" ? top - 2 : top + rect.height - 2,
            width: rect.width,
            height: 4,
            orientation: "horizontal",
            label: zone === "above" ? "Place above" : "Place below",
          });
        }
      };

      const tick = (clientY: number) => {
        const container = scroller.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const speed = autoScrollSpeed(clientY, rect.top, rect.bottom);
        if (!speed) {
          if (frame) {
            cancelAnimationFrame(frame);
            frame = 0;
          }
          return;
        }
        if (frame) return;
        const step = () => {
          container.scrollTop += speed;
          frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      };

      const move = (next: PointerEvent) => {
        if (!started) {
          if (Math.hypot(next.clientX - startX, next.clientY - startY) < DRAG_THRESHOLD) return;
          started = true;
          dragging.current = true;
          onBegin();
          host.classList.add("newsletter-item--dragging");
          surface.current?.classList.add("item-page--drag-active");
        }
        next.preventDefault();
        paint(next.clientX, next.clientY);
        tick(next.clientY);
      };

      const end = () => {
        globalThis.removeEventListener("pointermove", move);
        globalThis.removeEventListener("pointerup", end);
        globalThis.removeEventListener("pointercancel", end);
        if (frame) cancelAnimationFrame(frame);

        host.classList.remove("newsletter-item--dragging");
        host.style.removeProperty("--item-drag-x");
        host.style.removeProperty("--item-drag-y");
        surface.current?.classList.remove("item-page--drag-active");
        guides.current?.clear();

        const dropped = Boolean(started && target);
        if (started && target) onDrop(itemId, target.rowId, target.zone);
        if (started) onEnd(dropped);
        dragging.current = false;
      };

      globalThis.addEventListener("pointermove", move, { passive: false });
      globalThis.addEventListener("pointerup", end);
      globalThis.addEventListener("pointercancel", end);
    },
    [canPair, guides, onBegin, onDrop, onEnd, scroller, surface],
  );
}
