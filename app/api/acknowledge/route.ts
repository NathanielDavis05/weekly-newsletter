import { getPublishedContent } from "../../content/store";
import { issueKeyForContent, listSignins, recordSignin, cleanName } from "../../content/signins";
import { getEditorUser } from "../../edit-auth";

// POST is public: any reader can mark the live issue as read by sending a name.
// The issue key is always derived server-side from the published content so a
// client cannot write into an arbitrary bucket.
export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const name = cleanName((payload as { name?: unknown }).name);
    if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });
    const issueKey = issueKeyForContent(await getPublishedContent());
    await recordSignin(issueKey, name);
    return Response.json({ ok: true, name });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET is editor-only: it returns the roster for the current live issue so the
// manager can see who has read it.
export async function GET() {
  const user = await getEditorUser();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });
  try {
    const issueKey = issueKeyForContent(await getPublishedContent());
    const signins = await listSignins(issueKey);
    return Response.json({ issueKey, count: signins.length, signins });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
