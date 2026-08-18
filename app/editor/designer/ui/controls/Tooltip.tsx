import { cloneElement, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  label: string;
  shortcut?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactElement;
}

/** Delayed, non-intrusive tooltip. Never appears while a drag is in flight. */
export function Tooltip({ label, shortcut, side = 'bottom', children }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const timer = useRef<number>(0);

  const show = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const el = anchor;
      if (!el || document.body.classList.contains('is-dragging-global')) return;
      const r = el.getBoundingClientRect();
      const map = {
        bottom: { x: r.left + r.width / 2, y: r.bottom + 7 },
        top: { x: r.left + r.width / 2, y: r.top - 27 },
        left: { x: r.left - 8, y: r.top + r.height / 2 - 11 },
        right: { x: r.right + 8, y: r.top + r.height / 2 - 11 },
      };
      setPos(map[side]);
    }, 420);
  };

  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };

  const child = children as ReactElement<Record<string, unknown>>;

  return (
    <>
      {/* cloneElement needs to attach the tooltip anchor ref to the caller's
          actual control; wrapping it would change flex and grid layouts. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {cloneElement(child, {
        ref: setAnchor,
        onPointerEnter: show,
        onPointerLeave: hide,
        onPointerDown: (e: React.PointerEvent) => {
          hide();
          (child.props.onPointerDown as ((e: React.PointerEvent) => void) | undefined)?.(e);
        },
      })}
      {pos
        ? createPortal(
            <div
              className="tip"
              style={{
                left: pos.x,
                top: pos.y,
                transform: side === 'left' ? 'translateX(-100%)' : side === 'right' ? 'none' : 'translateX(-50%)',
              }}
            >
              {label}
              {shortcut ? <span className="kbd">{shortcut}</span> : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
