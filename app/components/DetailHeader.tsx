import type { NewsletterContent, VisualPageId } from "../content/types";
import { SiteHero } from "./SiteHero";
import type { CanvasEditorState } from "./ItemCanvas";

export function DetailHeader({ content, page, title, kicker, editor }: {
  content: NewsletterContent; page: Exclude<VisualPageId, "home">; title: string; kicker: string; editor?: CanvasEditorState;
}) {
  return <SiteHero page={page} content={content} title={title} kicker={kicker} editor={editor} detail />;
}
