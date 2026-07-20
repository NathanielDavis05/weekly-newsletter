// Snapping and smart-guide maths.
//
// Pure geometry, no DOM: the interaction hooks measure rectangles and hand them
// here, then render whatever guides come back. Keeping it separate means the
// snapping rules can be unit-tested rather than eyeballed on a canvas.

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const right = (rect: Rect) => rect.left + rect.width;
export const bottom = (rect: Rect) => rect.top + rect.height;
export const centerX = (rect: Rect) => rect.left + rect.width / 2;
export const centerY = (rect: Rect) => rect.top + rect.height / 2;

export type GuideKind = "edge" | "center" | "spacing";

export interface Guide {
  orientation: "vertical" | "horizontal";
  /** Coordinate of the line, in the same space as the rects passed in. */
  position: number;
  /** Extent of the drawn line, so it spans the elements it relates. */
  start: number;
  end: number;
  kind: GuideKind;
  label?: string;
}

export interface SnapResult {
  /** Offset to add to the moving rect so it lands on the snap. */
  dx: number;
  dy: number;
  guides: Guide[];
}

/** Default snap tolerance in CSS pixels. */
export const SNAP_TOLERANCE = 6;

interface Candidate {
  delta: number;
  position: number;
  kind: GuideKind;
  label?: string;
}

/** Picks the candidate needing the smallest movement, within tolerance. */
function best(candidates: Candidate[], tolerance: number): Candidate | null {
  let winner: Candidate | null = null;
  for (const candidate of candidates) {
    if (Math.abs(candidate.delta) > tolerance) continue;
    if (!winner || Math.abs(candidate.delta) < Math.abs(winner.delta)) winner = candidate;
  }
  return winner;
}

/**
 * Computes alignment snapping for a rect being moved against its siblings and
 * container. Checks left/centre/right and top/middle/bottom edges, so an
 * element can line up with another element's edge or with the page centre.
 */
export function alignmentSnap(
  moving: Rect,
  others: Rect[],
  container: Rect | null,
  tolerance = SNAP_TOLERANCE,
): SnapResult {
  const verticalTargets: Array<{ position: number; kind: GuideKind; label?: string }> = [];
  const horizontalTargets: Array<{ position: number; kind: GuideKind; label?: string }> = [];

  if (container) {
    verticalTargets.push(
      { position: container.left, kind: "edge", label: "Page left" },
      { position: centerX(container), kind: "center", label: "Page centre" },
      { position: right(container), kind: "edge", label: "Page right" },
    );
    horizontalTargets.push(
      { position: container.top, kind: "edge", label: "Page top" },
      { position: bottom(container), kind: "edge", label: "Page bottom" },
    );
  }
  for (const other of others) {
    verticalTargets.push(
      { position: other.left, kind: "edge" },
      { position: centerX(other), kind: "center" },
      { position: right(other), kind: "edge" },
    );
    horizontalTargets.push(
      { position: other.top, kind: "edge" },
      { position: centerY(other), kind: "center" },
      { position: bottom(other), kind: "edge" },
    );
  }

  // Each edge of the moving rect can meet each target.
  const movingVertical = [
    { at: moving.left, name: "left" },
    { at: centerX(moving), name: "center" },
    { at: right(moving), name: "right" },
  ];
  const movingHorizontal = [
    { at: moving.top, name: "top" },
    { at: centerY(moving), name: "middle" },
    { at: bottom(moving), name: "bottom" },
  ];

  const verticalCandidates: Candidate[] = [];
  for (const edge of movingVertical) {
    for (const target of verticalTargets) {
      verticalCandidates.push({
        delta: target.position - edge.at,
        position: target.position,
        kind: target.kind,
        label: target.label,
      });
    }
  }
  const horizontalCandidates: Candidate[] = [];
  for (const edge of movingHorizontal) {
    for (const target of horizontalTargets) {
      horizontalCandidates.push({
        delta: target.position - edge.at,
        position: target.position,
        kind: target.kind,
        label: target.label,
      });
    }
  }

  const vertical = best(verticalCandidates, tolerance);
  const horizontal = best(horizontalCandidates, tolerance);

  const guides: Guide[] = [];
  const span = [moving, ...others];
  if (vertical) {
    guides.push({
      orientation: "vertical",
      position: vertical.position,
      start: Math.min(...span.map((rect) => rect.top)),
      end: Math.max(...span.map(bottom)),
      kind: vertical.kind,
      label: vertical.label,
    });
  }
  if (horizontal) {
    guides.push({
      orientation: "horizontal",
      position: horizontal.position,
      start: Math.min(...span.map((rect) => rect.left)),
      end: Math.max(...span.map(right)),
      kind: horizontal.kind,
      label: horizontal.label,
    });
  }

  return { dx: vertical?.delta ?? 0, dy: horizontal?.delta ?? 0, guides };
}

/** Percentage widths worth snapping to while dragging a width handle. */
export const WIDTH_STOPS = [25, 33, 50, 66, 75, 100] as const;

export interface WidthSnap {
  value: number;
  label: string | null;
}

/**
 * Snaps a width percentage to a common fraction or to a sibling's width.
 * `siblings` are percentages, so a two-up row can be levelled exactly.
 */
export function snapWidth(
  percent: number,
  siblings: number[] = [],
  tolerance = 2.5,
): WidthSnap {
  const clamped = Math.max(5, Math.min(100, percent));
  let winner: WidthSnap | null = null;
  let winnerDelta = Infinity;

  const consider = (value: number, label: string) => {
    const delta = Math.abs(clamped - value);
    if (delta <= tolerance && delta < winnerDelta) {
      winner = { value, label };
      winnerDelta = delta;
    }
  };

  for (const stop of WIDTH_STOPS) consider(stop, `${stop}%`);
  for (const sibling of siblings) consider(sibling, "Match sibling");

  return winner ?? { value: Math.round(clamped), label: null };
}

/** Snaps a pixel height to an 8px rhythm, and to sibling heights. */
export function snapHeight(pixels: number, siblings: number[] = [], tolerance = 5): WidthSnap {
  const clamped = Math.max(0, pixels);
  let winner: WidthSnap | null = null;
  let winnerDelta = Infinity;

  const consider = (value: number, label: string) => {
    const delta = Math.abs(clamped - value);
    if (delta <= tolerance && delta < winnerDelta) {
      winner = { value, label };
      winnerDelta = delta;
    }
  };

  for (const sibling of siblings) consider(sibling, "Match sibling");
  const grid = Math.round(clamped / 8) * 8;
  consider(grid, `${grid}px`);

  return winner ?? { value: Math.round(clamped), label: null };
}

/**
 * Auto-scroll speed for a pointer near the edge of a scrolling container.
 * Returns pixels-per-frame; zero when the pointer is comfortably inside.
 */
export function autoScrollSpeed(pointer: number, start: number, end: number, threshold = 60, max = 18): number {
  if (pointer < start + threshold) {
    const depth = Math.max(0, start + threshold - pointer);
    return -Math.min(max, (depth / threshold) * max);
  }
  if (pointer > end - threshold) {
    const depth = Math.max(0, pointer - (end - threshold));
    return Math.min(max, (depth / threshold) * max);
  }
  return 0;
}
