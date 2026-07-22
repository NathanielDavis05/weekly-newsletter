// The shared rich-text renderer.
//
// This module is deliberately framework-plain: no "use client", no hooks, no
// browser APIs. It runs inside the Cloudflare Worker for the public newsletter,
// inside the draft preview, and inside the editor canvas, which is what keeps
// the three surfaces pixel-identical.
//
// The editor's DOM serialiser (app/edit/richtext/serialize.ts) is the mirror of
// this file: whatever element/attribute shape is produced here must be readable
// back there. Change one, change the other.

import type { CSSProperties, ReactNode } from "react";
import {
  FONT_STACKS,
  SHADOW_PRESETS,
  type RichBlock,
  type RichMarks,
  type RichSpan,
  type RichText,
} from "../content/richtext";

/** Inline CSS for a run of characters. Pure function — shared with the editor. */
export function styleForMarks(marks?: RichMarks): CSSProperties | undefined {
  if (!marks) return undefined;
  const style: CSSProperties = {};
  if (marks.color) style.color = marks.color;
  if (marks.highlight) style.backgroundColor = marks.highlight;
  if (marks.fontFamily) style.fontFamily = FONT_STACKS[marks.fontFamily];
  if (marks.fontSize) style.fontSize = `${marks.fontSize}px`;
  if (marks.shadow && marks.shadow !== "none") style.textShadow = SHADOW_PRESETS[marks.shadow];
  if (marks.strokeWidth) {
    style.WebkitTextStrokeWidth = `${marks.strokeWidth}px`;
    style.WebkitTextStrokeColor = marks.strokeColor ?? "#000000";
  }
  if (marks.opacity !== undefined && marks.opacity < 100) style.opacity = marks.opacity / 100;
  if (marks.transform) style.textTransform = marks.transform;
  return Object.keys(style).length ? style : undefined;
}

/** Block-level CSS: alignment, spacing and rhythm. Named to avoid colliding
 *  with the layout-level `styleForBlock` in content/visual.ts. */
export function styleForRichBlock(block: RichBlock): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (block.align) style.textAlign = block.align;
  if (block.lineHeight) style.lineHeight = block.lineHeight;
  if (block.letterSpacing) style.letterSpacing = `${block.letterSpacing}px`;
  if (block.spaceAfter !== undefined) style.marginBottom = `${block.spaceAfter}px`;
  return Object.keys(style).length ? style : undefined;
}

/**
 * Wraps text in semantic tags for the boolean marks. Nesting order is fixed so
 * the serialiser sees a predictable shape, and so that underline + strikethrough
 * combine into both decorations rather than one overriding the other.
 */
function withSemantics(marks: RichMarks | undefined, text: string): ReactNode {
  let node: ReactNode = text;
  if (marks?.strike) node = <s>{node}</s>;
  if (marks?.underline) node = <u>{node}</u>;
  if (marks?.italic) node = <em>{node}</em>;
  if (marks?.bold) node = <strong>{node}</strong>;
  return node;
}

/**
 * Font family and shadow are stored as preset *keys* but reach CSS as full
 * stacks, which browsers then rewrite when reading `style.fontFamily` back.
 * Emitting the key as a data attribute makes the round-trip exact instead of
 * relying on string-matching a normalised CSS value.
 */
function dataForMarks(marks?: RichMarks) {
  return {
    ...(marks?.fontFamily ? { "data-rt-ff": marks.fontFamily } : {}),
    ...(marks?.shadow ? { "data-rt-shadow": marks.shadow } : {}),
  };
}

function Span({ span, index }: { span: RichSpan; index: number }) {
  const { marks } = span;
  const inner = withSemantics(marks, span.text);
  const style = styleForMarks(marks);
  const data = dataForMarks(marks);

  if (marks?.href) {
    const external = /^https?:\/\//i.test(marks.href);
    return (
      <a
        key={index}
        className="rt-link"
        href={marks.href}
        style={style}
        {...data}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {inner}
      </a>
    );
  }
  // A span with no styling at all renders as a bare fragment so the published
  // markup stays as clean as the hand-written original.
  if (!style && !marks?.bold && !marks?.italic && !marks?.underline && !marks?.strike) {
    return <span key={index}>{span.text}</span>;
  }
  return <span key={index} style={style} {...data}>{inner}</span>;
}

function Spans({ spans }: { spans: RichSpan[] }) {
  // An empty block still needs a line box, otherwise the caret has nowhere to
  // sit in the editor and the paragraph collapses on the public page.
  if (!spans.length) return <br />;
  return <>{spans.map((span, index) => <Span key={index} span={span} index={index} />)}</>;
}

/**
 * A block linked to a global text style carries `rt-style--<id>`, which pulls
 * its typography from the theme's custom properties. Marks and block styles are
 * still emitted inline and therefore win — that is how an element overrides one
 * property without detaching from the style.
 *
 * The semantic tag comes from the block's own type: linking a style also sets
 * the type, so the stored document stays semantically correct on its own and
 * this renderer never needs the theme.
 */
function BlockBody({ block }: { block: RichBlock }) {
  const style = styleForRichBlock(block);
  const linked = block.styleId ? ` rt-style--${block.styleId}` : "";
  if (block.type === "heading") {
    const Tag = (`h${block.level ?? 2}`) as "h1" | "h2" | "h3" | "h4";
    return <Tag className={`rt-heading${linked}`} style={style}><Spans spans={block.spans} /></Tag>;
  }
  if (block.type === "listItem") {
    return <li className={`rt-item${linked}`} style={style}><Spans spans={block.spans} /></li>;
  }
  return <p className={`rt-paragraph${linked}`} style={style}><Spans spans={block.spans} /></p>;
}

/**
 * Lists are stored flat (each item is its own block) so that reordering and
 * per-item alignment stay simple. Rendering re-groups consecutive items of the
 * same flavour into a single <ul>/<ol>.
 */
function groupBlocks(blocks: RichBlock[]): Array<RichBlock | { list: "bullet" | "number"; items: RichBlock[] }> {
  const out: Array<RichBlock | { list: "bullet" | "number"; items: RichBlock[] }> = [];
  for (const block of blocks) {
    if (block.type !== "listItem") {
      out.push(block);
      continue;
    }
    const list = block.list ?? "bullet";
    const previous = out[out.length - 1];
    if (previous && "items" in previous && previous.list === list) previous.items.push(block);
    else out.push({ list, items: [block] });
  }
  return out;
}

/**
 * Renders formatting *without* block wrappers, for fields that already sit
 * inside a heading, label or paragraph in the newsletter markup. Wrapping those
 * in <p> would produce invalid nesting and change their styling, so inline
 * fields emit only their spans; multiple blocks are joined with line breaks.
 */
export function RichTextInline({ doc }: { doc: RichText | undefined }) {
  if (!doc?.blocks?.length) return null;
  return (
    <>
      {doc.blocks.map((block, index) => (
        <span key={index} className="rt-inline-block">
          {index > 0 ? <br /> : null}
          <Spans spans={block.spans} />
        </span>
      ))}
    </>
  );
}

export function RichTextView({
  doc,
  className,
  as: Wrapper = "div",
}: {
  doc: RichText | undefined;
  className?: string;
  as?: "div" | "section" | "figcaption";
}) {
  if (!doc?.blocks?.length) return null;
  const groups = groupBlocks(doc.blocks);
  return (
    <Wrapper className={className ? `rt ${className}` : "rt"}>
      {groups.map((group, index) => {
        if ("items" in group) {
          const ListTag = group.list === "number" ? "ol" : "ul";
          return (
            <ListTag key={index} className={`rt-list rt-list--${group.list}`}>
              {group.items.map((item, itemIndex) => <BlockBody key={itemIndex} block={item} />)}
            </ListTag>
          );
        }
        return <BlockBody key={index} block={group} />;
      })}
    </Wrapper>
  );
}
