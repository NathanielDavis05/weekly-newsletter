import type { ReactNode } from "react";
import type { NewsletterContent, VisualBlock, VisualPageId, FreeformLayout, FreeformItemStyle } from "../content/types";
import { styleForBlock, visualDocument } from "../content/visual";

export interface CanvasEditorState {
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  renderBlock?: (block: VisualBlock, inner: ReactNode) => ReactNode;
  device?: "phone" | "desktop";
  onFreeformChange?: (id: string, device: "phone" | "desktop", patch: Partial<FreeformLayout>) => void;
  onFreeformStyleChange?: (id: string, patch: Partial<FreeformItemStyle>) => void;
  onFreeformDiscover?: (items: Array<{ id: string; label: string; tag: string; textEditable: boolean; text?: string; href?: string }>) => void;
  onCanvasHeightChange?: (device: "phone" | "desktop", height: number) => void;
}

export function PageBlocks({
  content,
  page,
  native,
  editable = false,
  selectedId,
  onSelect,
  renderBlock,
}: {
  content: NewsletterContent;
  page: VisualPageId;
  native: Record<string, ReactNode>;
  editable?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const document = visualDocument(content);
  return (
    <>
      {document.pages[page].blocks.map((block) => {
        const inner = block.kind === "native" ? native[block.nativeId ?? ""] : <FreeBlock block={block} />;
        if (!inner) return null;
        const wrapped = (
          <div
            key={block.id}
            data-block-id={block.id}
            className={`page-block${block.kind === "native" ? "" : " page-block--free"}${editable ? " page-block--editable" : ""}${selectedId === block.id ? " page-block--selected" : ""}`}
            style={styleForBlock(block.style)}
            onClick={editable ? (event) => { event.stopPropagation(); onSelect?.(block.id); } : undefined}
          >
            {editable ? <span className="page-block__badge">{block.label}</span> : null}
            {inner}
          </div>
        );
        return renderBlock ? renderBlock(block, wrapped) : wrapped;
      })}
    </>
  );
}

function FreeBlock({ block }: { block: VisualBlock }) {
  if (block.kind === "text") {
    return <section className="free-block free-block--text">{block.title ? <h2>{block.title}</h2> : null}{block.body ? <p>{block.body}</p> : null}</section>;
  }
  if (block.kind === "image") {
    return block.imageUrl ? <figure className="free-block free-block--image"><img src={block.imageUrl} alt={block.alt ?? ""} /></figure> : <div className="free-block free-block--placeholder">Add an image</div>;
  }
  if (block.kind === "button") {
    return <div className="free-block free-block--button"><a className="button button--red" href={block.href || "#"}>{block.title || "Button"}</a></div>;
  }
  if (block.kind === "divider") return <hr className="free-block free-block--divider" />;
  return <section className="free-block free-block--container">{block.title ? <h2>{block.title}</h2> : null}{block.body ? <p>{block.body}</p> : <p>Container content</p>}</section>;
}
