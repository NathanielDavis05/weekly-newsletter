import type { NewsletterContent, VisualPageId } from "../content/types";
import { DetailHeader } from "./DetailHeader";
import { ItemCanvas, type CanvasEditorState } from "./ItemCanvas";

/**
 * Generic renderer for pages created from the editor. Unlike Home/Training/
 * Results — which pair the block canvas with bespoke, typed content — a custom
 * page is *only* the block canvas: every section on it is a freeform block
 * (text, image, table, status list, ...), so there is no `native` map to supply.
 */
export function CustomPageView({ content, page, title, editor }: {
  content: NewsletterContent;
  page: VisualPageId;
  title: string;
  editor?: CanvasEditorState;
}) {
  return <div className="site-shell site-shell--detail">
    <DetailHeader content={content} page={page} title={title} kicker="" editor={editor} />
    <main id="main-content"><ItemCanvas content={content} page={page} native={{}} editor={editor} /></main>
  </div>;
}
