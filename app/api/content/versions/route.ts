import { listVersions } from "../../../content/store";
import { getEditorUser } from "../../../edit-auth";

export async function GET(request: Request) {
  if (!(await getEditorUser())) return Response.json({ error: "Not authorized" }, { status: 401 });
  try {
    const limit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
    return Response.json({ versions: await listVersions(Number.isFinite(limit) ? limit : 50) });
  } catch (error) {
    // A missing table means history has never been migrated; an empty list is
    // the honest answer rather than a 500 that blocks the editor from loading.
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("no such table")) return Response.json({ versions: [] });
    return Response.json({ error: message }, { status: 500 });
  }
}
