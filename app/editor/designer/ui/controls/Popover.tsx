import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  anchor: { x: number; y: number } | DOMRect;
  onClose: () => void;
  children: ReactNode;
  align?: 'start' | 'end' | 'center';
  className?: string;
  width?: number;
}

/** Portal popover that flips to stay on screen and closes on outside click. */
export function Popover({ anchor, onClose, children, align = 'start', className = '', width }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const isRect = 'width' in anchor;
    const ax = isRect ? (anchor as DOMRect).left : (anchor as { x: number }).x;
    const ay = isRect ? (anchor as DOMRect).bottom + 4 : (anchor as { y: number }).y;
    const aw = isRect ? (anchor as DOMRect).width : 0;

    let left = align === 'end' ? ax + aw - r.width : align === 'center' ? ax + aw / 2 - r.width / 2 : ax;
    let top = ay;

    const pad = 8;
    left = Math.max(pad, Math.min(left, window.innerWidth - r.width - pad));
    if (top + r.height > window.innerHeight - pad) {
      const above = isRect ? (anchor as DOMRect).top - r.height - 4 : ay - r.height;
      top = above > pad ? above : Math.max(pad, window.innerHeight - r.height - pad);
    }
    setPos({ left, top });
  }, [anchor, align]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Defer so the click that opened it doesn't immediately close it.
    const t = window.setTimeout(() => window.addEventListener('pointerdown', onDown), 0);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      className={`pop ${className}`}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, width, visibility: pos ? 'visible' : 'hidden' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}
