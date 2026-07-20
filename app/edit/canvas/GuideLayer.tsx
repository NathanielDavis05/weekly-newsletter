"use client";

// Smart-guide and measurement overlay.
//
// Exposed imperatively on purpose: during a drag or resize the guides change on
// every pointer move, and routing that through the editor's state would
// re-render the whole canvas sixty times a second. Only this component
// re-renders instead.

import { forwardRef, useImperativeHandle, useState } from "react";
import type { Guide } from "./geometry";

/** Where a dragged item would land, in surface-relative coordinates. */
export interface DropIndicator {
  left: number;
  top: number;
  width: number;
  height: number;
  orientation: "horizontal" | "vertical";
  label: string;
}

export interface GuideLayerHandle {
  setGuides: (guides: Guide[]) => void;
  setReadout: (readout: { left: number; top: number; text: string } | null) => void;
  setDrop: (drop: DropIndicator | null) => void;
  clear: () => void;
}

export const GuideLayer = forwardRef<GuideLayerHandle>(function GuideLayer(_props, ref) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [readout, setReadout] = useState<{ left: number; top: number; text: string } | null>(null);
  const [drop, setDrop] = useState<DropIndicator | null>(null);

  useImperativeHandle(ref, () => ({
    setGuides,
    setReadout,
    setDrop,
    clear: () => {
      setGuides([]);
      setReadout(null);
      setDrop(null);
    },
  }), []);

  if (!guides.length && !readout && !drop) return null;

  return (
    <div className="guide-layer" aria-hidden="true">
      {guides.map((guide, index) => (
        <div
          key={index}
          className={`guide guide--${guide.orientation} guide--${guide.kind}`}
          style={
            guide.orientation === "vertical"
              ? { left: guide.position, top: guide.start, height: Math.max(0, guide.end - guide.start) }
              : { top: guide.position, left: guide.start, width: Math.max(0, guide.end - guide.start) }
          }
        >
          {guide.label ? <span className="guide__label">{guide.label}</span> : null}
        </div>
      ))}
      {drop ? (
        <div
          className={`drop-indicator drop-indicator--${drop.orientation}`}
          style={{ left: drop.left, top: drop.top, width: drop.width, height: drop.height }}
        >
          <span className="drop-indicator__label">{drop.label}</span>
        </div>
      ) : null}
      {readout ? (
        <span className="guide-readout" style={{ left: readout.left, top: readout.top }}>
          {readout.text}
        </span>
      ) : null}
    </div>
  );
});
