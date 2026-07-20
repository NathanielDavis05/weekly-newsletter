"use client";

// Reads a contentEditable subtree back into the portable RichText model.
//
// This is the exact inverse of app/components/RichText.tsx. The editor lets the
// browser handle the hard parts of text editing (caret movement, IME, splitting
// nodes on typing) and then re-derives the model from the resulting DOM, which
// means we never have to keep a parallel selection model in sync.
//
// Anything the browser invents that we don't understand — a pasted <font> tag,
// a stray <div> — degrades to plain text rather than being dropped.

import {
  FONT_STACKS,
  SHADOW_PRESETS,
  marksKey,
  safeColor,
  safeHref,
  type RichBlock,
  type RichMarks,
  type RichSpan,
  type RichText,
  type ShadowPreset,
} from "../../content/richtext";

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "LI", "DIV"]);

function numberFromPx(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) / 100 : undefined;
}

/** Reverse-maps a browser-normalised font stack onto our preset key. */
function fontKeyFromStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  const needle = stack.replace(/["']/g, "").toLowerCase();
  for (const [key, value] of Object.entries(FONT_STACKS)) {
    const candidate = value.replace(/["']/g, "").toLowerCase();
    if (candidate === needle || candidate.startsWith(needle) || needle.startsWith(candidate.split(",")[0])) {
      return key;
    }
  }
  return undefined;
}

function shadowKeyFromCss(value: string | undefined): ShadowPreset | undefined {
  if (!value || value === "none") return undefined;
  const needle = value.replace(/\s+/g, "");
  for (const [key, preset] of Object.entries(SHADOW_PRESETS)) {
    if (preset.replace(/\s+/g, "") === needle) return key as ShadowPreset;
  }
  return undefined;
}

/**
 * Collects formatting by walking from a text node up to its block ancestor.
 * Marks set on the *closest* element win, which matches how CSS cascades and
 * means re-applying a colour to part of a coloured run behaves as expected.
 */
function marksForNode(node: Node, stopAt: Element): RichMarks | undefined {
  const marks: RichMarks = {};
  let current: Node | null = node.parentNode;

  while (current && current !== stopAt && current.nodeType === 1) {
    const element = current as HTMLElement;
    const tag = element.tagName;

    if (tag === "STRONG" || tag === "B") marks.bold = true;
    if (tag === "EM" || tag === "I") marks.italic = true;
    if (tag === "U") marks.underline = true;
    if (tag === "S" || tag === "STRIKE" || tag === "DEL") marks.strike = true;
    if (tag === "A" && marks.href === undefined) {
      const href = safeHref(element.getAttribute("href"));
      if (href) marks.href = href;
    }

    const style = element.style;

    if (marks.color === undefined) {
      const color = safeColor(style.color);
      if (color) marks.color = color;
    }
    if (marks.highlight === undefined) {
      const highlight = safeColor(style.backgroundColor);
      // `transparent` is what the browser reports for un-highlighted text.
      if (highlight && highlight !== "transparent" && highlight !== "rgba(0, 0, 0, 0)") {
        marks.highlight = highlight;
      }
    }
    if (marks.fontFamily === undefined) {
      const key = element.dataset.rtFf ?? fontKeyFromStack(style.fontFamily);
      if (key && key in FONT_STACKS) marks.fontFamily = key;
    }
    if (marks.fontSize === undefined) {
      const size = numberFromPx(style.fontSize);
      if (size) marks.fontSize = size;
    }
    if (marks.shadow === undefined) {
      const key = (element.dataset.rtShadow as ShadowPreset | undefined) ?? shadowKeyFromCss(style.textShadow);
      if (key && key !== "none" && key in SHADOW_PRESETS) marks.shadow = key;
    }
    if (marks.strokeWidth === undefined) {
      const width = numberFromPx(style.webkitTextStrokeWidth || style.getPropertyValue("-webkit-text-stroke-width"));
      if (width) {
        marks.strokeWidth = width;
        marks.strokeColor = safeColor(style.webkitTextStrokeColor || style.getPropertyValue("-webkit-text-stroke-color")) ?? "#000000";
      }
    }
    if (marks.opacity === undefined && style.opacity) {
      const opacity = Number.parseFloat(style.opacity);
      if (Number.isFinite(opacity) && opacity < 1) marks.opacity = Math.round(opacity * 100);
    }
    if (marks.transform === undefined) {
      const transform = style.textTransform;
      if (transform === "uppercase" || transform === "lowercase" || transform === "capitalize") {
        marks.transform = transform;
      }
    }
    // Text decorations can also arrive as CSS (common in pasted content).
    const decoration = style.textDecorationLine || style.textDecoration;
    if (decoration?.includes("underline")) marks.underline = true;
    if (decoration?.includes("line-through")) marks.strike = true;
    if (style.fontWeight && Number.parseInt(style.fontWeight, 10) >= 600) marks.bold = true;
    if (style.fontStyle === "italic") marks.italic = true;

    current = current.parentNode;
  }

  return Object.keys(marks).length ? marks : undefined;
}

function spansFromBlock(element: Element): RichSpan[] {
  const spans: RichSpan[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.nodeValue ?? "";
    if (text) spans.push({ text, marks: marksForNode(node, element) });
    node = walker.nextNode();
  }

  // Merge runs that ended up formatted identically (the browser splits text
  // nodes far more eagerly than the model needs to).
  const merged: RichSpan[] = [];
  for (const span of spans) {
    if (!span.text) continue;
    const last = merged[merged.length - 1];
    if (last && marksKey(last.marks) === marksKey(span.marks)) last.text += span.text;
    else merged.push(span.marks ? { text: span.text, marks: span.marks } : { text: span.text });
  }
  return merged;
}

function blockFromElement(element: Element, list?: "bullet" | "number"): RichBlock {
  const tag = element.tagName;
  const style = (element as HTMLElement).style;

  const block: RichBlock = { type: "paragraph", spans: spansFromBlock(element) };

  if (tag === "LI") {
    block.type = "listItem";
    block.list = list ?? "bullet";
  } else if (/^H[1-4]$/.test(tag)) {
    block.type = "heading";
    block.level = Number(tag[1]) as 1 | 2 | 3 | 4;
  }

  const align = style.textAlign;
  if (align === "center" || align === "right" || align === "justify" || align === "left") block.align = align;

  const lineHeight = Number.parseFloat(style.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    // Browsers report line-height in px once it has been computed; convert back
    // to the unitless multiplier the model stores.
    const fontSize = Number.parseFloat(style.fontSize) || 16;
    block.lineHeight = style.lineHeight.endsWith("px")
      ? Math.round((lineHeight / fontSize) * 100) / 100
      : Math.round(lineHeight * 100) / 100;
  }

  const letterSpacing = numberFromPx(style.letterSpacing);
  if (letterSpacing) block.letterSpacing = letterSpacing;

  const spaceAfter = numberFromPx(style.marginBottom);
  if (spaceAfter !== undefined) block.spaceAfter = spaceAfter;

  return block;
}

/** Serialises an editable root element into the portable model. */
export function domToRichText(root: HTMLElement): RichText {
  const blocks: RichBlock[] = [];
  // The editable host wraps the rendered document in RichTextView's `.rt`
  // element; blocks live one level down. If the user managed to delete it
  // (select-all + type), fall back to reading the host directly.
  const container = root.querySelector<HTMLElement>(":scope > .rt") ?? root;

  // Inline fields render bare spans with no block wrapper. Walking them as
  // "unrecognised block-level children" would flatten them to plain text and
  // lose every mark, so treat the whole container as one block instead.
  const hasBlockChildren = Array.from(container.children).some(
    (child) => BLOCK_TAGS.has(child.tagName) || child.tagName === "UL" || child.tagName === "OL",
  );
  if (!hasBlockChildren) return { v: 1, blocks: [blockFromElement(container)] };

  for (const child of Array.from(container.children)) {
    const tag = child.tagName;
    if (tag === "UL" || tag === "OL") {
      const list = tag === "OL" ? "number" : "bullet";
      for (const item of Array.from(child.children)) {
        if (item.tagName === "LI") blocks.push(blockFromElement(item, list));
      }
      continue;
    }
    if (BLOCK_TAGS.has(tag)) {
      blocks.push(blockFromElement(child));
      continue;
    }
    // Anything unexpected at block level still contributes its text.
    const text = child.textContent ?? "";
    if (text.trim()) blocks.push({ type: "paragraph", spans: [{ text }] });
  }

  // Either an inline field (spans with no block wrapper) or a container holding
  // only loose text nodes after "select all, delete, type". Both are a single
  // block; reading the container itself preserves the inline marks.
  if (!blocks.length) blocks.push(blockFromElement(container));

  return { v: 1, blocks };
}
