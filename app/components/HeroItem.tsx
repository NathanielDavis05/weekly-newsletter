"use client";

import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CanvasEditorState } from "./PageBlocks";

export function HeroItem({ id, label, editor, children }: { id: string; label: string; editor?: CanvasEditorState; children: ReactNode }) {
  const sortable = useSortable({ id });
  if (!editor) return <>{children}</>;
  return <span ref={sortable.setNodeRef} className={`hero-item${editor.selectedId === id ? " hero-item--selected" : ""}`} style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }} onClick={(event) => { event.stopPropagation(); editor.onSelect?.(id); }}>
    <button type="button" className="hero-item__handle" aria-label={`Move ${label}`} {...sortable.attributes} {...sortable.listeners}>⠿</button>
    {children}
  </span>;
}
