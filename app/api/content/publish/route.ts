import { publishDraft, recordVersion, RevisionConflictError } from "../../../content/store";
import { getEditorUser } from "../../../edit-auth";

export async function POST(request: Request) {
  const user = await getEditorUser();
  if (!user) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const payload = await request.json().catch(() => ({}));
    const result = await publishDraft(Number(payload.expectedRevision ?? 0));
    // Recorded after the fact: a failed publish should not leave a history
    // entry claiming it happened. A history failure must not fail the publish.
    try {
      await recordVersion("publish", JSON.stringify(result.published), result.revision, "Published to the live site", user.email);
    } catch {
      // History is best-effort; the publish itself already succeeded.
    }
    return Response.json(result);
  } catch (error) {
    if (error instanceof RevisionConflictError) return Response.json({ error: error.message, revision: error.currentRevision }, { status: 409 });
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
