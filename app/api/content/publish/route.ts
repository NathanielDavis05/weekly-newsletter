import { publishDraft } from "../../../content/store";
import { getEditorUser } from "../../../edit-auth";

export async function POST() {
  if (!(await getEditorUser())) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const published = await publishDraft();
    return Response.json({ published });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
