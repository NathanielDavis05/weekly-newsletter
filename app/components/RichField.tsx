// One formattable field inside a native newsletter section.
//
// The newsletter's fixed copy lives in NewsletterContent as plain strings. This
// component lets any of those fields carry rich formatting without changing the
// content model: a RichText override is stored against the field's dotted path,
// and the plain string is kept in sync so anything reading it still works.
//
// Server-safe. In the editor, `editor.renderField` swaps in the live editor;
// everywhere else this renders exactly what the published page renders.

import { isRichTextEmpty, type RichText } from "../content/richtext";
import type { TextFrameStyle } from "../content/types";
import type { ContentPath } from "../content/paths";
import { RichTextInline, RichTextView } from "./RichText";
import { TextFrame, type CanvasEditorState } from "./ItemCanvas";

export interface RichFieldProps {
  /** Dotted path into NewsletterContent, e.g. "training.heading". */
  path: ContentPath;
  /** The plain string currently stored at that path. */
  value: string;
  overrides?: Record<string, RichText>;
  frames?: Record<string, TextFrameStyle>;
  editor?: CanvasEditorState;
  /**
   * Inline fields render spans only, keeping the surrounding heading/label
   * markup intact. Block fields get full paragraph structure and lists.
   */
  block?: boolean;
  className?: string;
  placeholder?: string;
}

export function RichField({ path, value, overrides, frames, editor, block, className, placeholder }: RichFieldProps) {
  const doc = overrides?.[path];

  if (editor?.renderField) {
    return <TextFrame frameKey={path} style={frames?.[path]} editor={editor} block={block}>
      {editor.renderField({ path, value, doc, block, className, placeholder: placeholder ?? value })}
    </TextFrame>;
  }
  // No override yet — render the plain string exactly as before, so a field
  // that has never been formatted produces byte-identical markup.
  const rendered = !doc || isRichTextEmpty(doc)
    ? value
    : block ? <RichTextView doc={doc} className={className} /> : <RichTextInline doc={doc} />;
  return <TextFrame frameKey={path} style={frames?.[path]} block={block}>{rendered}</TextFrame>;
}
