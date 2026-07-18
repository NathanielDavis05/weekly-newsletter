import { publishDraft, RevisionConflictError } from "../../../content/store";
import { getEditorUser } from "../../../edit-auth";

export async function POST(request: Request) {
  if (!(await getEditorUser())) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const payload = await request.json().catch(() => ({}));
    return Response.json(await publishDraft(Number(payload.expectedRevision ?? 0)));
  } catch (error) {
    if (error instanceof RevisionConflictError) return Response.json({ error: error.message, revision: error.currentRevision }, { status: 409 });
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
