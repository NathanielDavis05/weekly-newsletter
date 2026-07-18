import { mergeContent } from "../../content/merge";
import { getEditorContent, RevisionConflictError, saveDraft } from "../../content/store";
import { getEditorUser } from "../../edit-auth";

function unauthorized() {
  return Response.json({ error: "Not authorized" }, { status: 401 });
}

function toErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("no such table") || message.includes("D1 binding")) {
    return "Content storage is unavailable. Enable the D1 binding (set `d1` to `DB` in .openai/hosting.json), run `npm run db:generate`, and deploy so the platform applies the migration.";
  }
  return message;
}

export async function GET() {
  if (!(await getEditorUser())) return unauthorized();
  try {
    const { draft, published, revision } = await getEditorContent();
    return Response.json({ draft, published, revision });
  } catch (error) {
    return Response.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await getEditorUser())) return unauthorized();
  try {
    const payload = await request.json();
    const draft = mergeContent(payload.content ?? payload);
    const expectedRevision = Number(payload.expectedRevision ?? 0);
    return Response.json(await saveDraft(draft, expectedRevision));
  } catch (error) {
    if (error instanceof RevisionConflictError) return Response.json({ error: error.message, revision: error.currentRevision }, { status: 409 });
    return Response.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
