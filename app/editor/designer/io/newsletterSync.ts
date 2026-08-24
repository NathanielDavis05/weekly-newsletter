import type { NewsletterContent } from "../../../content/types";
import { useDoc } from "../store/docStore";
import { useEditor } from "../store/editorStore";
import { applyDesignerCopyToNewsletter, applyNewsletterContent } from "./newsletterBridge";

type ContentResponse = { draft: NewsletterContent; published: NewsletterContent; revision: number; error?: string };

async function request(url: string, init?: RequestInit): Promise<ContentResponse> {
  const response = await fetch(url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  const data = await response.json().catch(() => ({})) as ContentResponse;
  if (!response.ok) throw new Error(data.error || "Could not sync the newsletter.");
  return data;
}

/** Pull what readers currently see into the visual designer without touching its layout. */
export async function refreshLiveNewsletter() {
  const data = await request("/api/content");
  useDoc.getState().replaceDoc(applyNewsletterContent(useDoc.getState().doc, data.published));
  useEditor.getState().toast("Loaded the current live newsletter", "success");
  return data;
}

/** Send shared visual-designer copy to the regular editor's private draft. */
export async function sendDesignerCopyToDraft() {
  const current = await request("/api/content");
  const content = applyDesignerCopyToNewsletter(current.draft, useDoc.getState().doc);
  await request("/api/content", {
    method: "PUT",
    body: JSON.stringify({ content, target: "draft", expectedRevision: current.revision, label: "Updated from visual designer" }),
  });
  useEditor.getState().toast("Updated the /edit draft — publish there when ready", "success");
}
