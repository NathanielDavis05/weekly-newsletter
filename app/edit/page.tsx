import type { Metadata } from "next";
import { getEditorContent } from "../content/store";
import { requireEditorUser } from "../edit-auth";
import { Editor } from "./Editor";
import "./editor.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Newsletter editor",
  robots: { index: false, follow: false },
};

export default async function EditPage() {
  const user = await requireEditorUser("/edit");
  const { draft, published, revision } = await getEditorContent();
  return (
    <Editor
      initialDraft={draft}
      initialPublished={published}
      initialRevision={revision}
      userEmail={user.email}
    />
  );
}
