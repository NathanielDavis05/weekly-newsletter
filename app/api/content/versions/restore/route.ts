import { restoreVersion } from "../../../../content/store";
import { getEditorUser } from "../../../../edit-auth";

export async function POST(request: Request) {
  const user = await getEditorUser();
  if (!user) return Response.json({ error: "Not authorized" }, { status: 401 });
  try {
    const payload = (await request.json().catch(() => ({}))) as { id?: string };
    if (!payload.id) return Response.json({ error: "Which version to restore?" }, { status: 400 });
    // Restores land in the draft only — the live newsletter is unchanged until
    // the editor publishes.
    return Response.json(await restoreVersion(payload.id, user.email));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
