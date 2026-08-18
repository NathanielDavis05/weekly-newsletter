import { useCallback, useEffect, useState } from 'react';
import { useDoc } from '../../store/docStore';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

let rootEl: HTMLElement | null = null;
export const setOverlayRoot = (el: HTMLElement | null) => {
  rootEl = el;
};

const subscribers = new Set<() => void>();
let frame = 0;

/** Ask every overlay to re-measure on the next frame. */
export function invalidateRects() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    subscribers.forEach((fn) => fn());
  });
}

/**
 * Measures live DOM rects for the given element ids, in coordinates local to
 * the canvas frame. An id can resolve to several rects when it belongs to a
 * component master rendered by multiple instances — all occurrences are
 * highlighted, which is how you can tell a global component apart at a glance.
 */
export function useRects(ids: string[]): Record<string, Rect[]> {
  const [rects, setRects] = useState<Record<string, Rect[]>>({});
  const rev = useDoc((s) => s.doc.rev);
  const key = ids.join(',');

  const measure = useCallback(() => {
    if (!rootEl || !ids.length) {
      setRects((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }
    const rootRect = rootEl.getBoundingClientRect();
    const next: Record<string, Rect[]> = {};
    for (const id of ids) {
      const nodes = rootEl.querySelectorAll<HTMLElement>(`[data-el-id="${CSS.escape(id)}"]`);
      const list: Rect[] = [];
      nodes.forEach((el) => {
        // `display: contents` wrappers have no box of their own.
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) {
          const child = el.firstElementChild as HTMLElement | null;
          if (child) {
            const cr = child.getBoundingClientRect();
            list.push({ x: cr.left - rootRect.left, y: cr.top - rootRect.top, w: cr.width, h: cr.height });
            return;
          }
        }
        list.push({ x: r.left - rootRect.left, y: r.top - rootRect.top, w: r.width, h: r.height });
      });
      if (list.length) next[id] = list;
    }
    setRects(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    const initialMeasure = requestAnimationFrame(measure);
    subscribers.add(measure);
    const ro = new ResizeObserver(() => measure());
    if (rootEl) ro.observe(rootEl);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(initialMeasure);
      subscribers.delete(measure);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  // Re-measure after the document changes and React has painted.
  useEffect(() => {
    const t = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(t);
  }, [rev, measure]);

  return rects;
}
