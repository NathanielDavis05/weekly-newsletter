import {
  resetDraftToDefaults,
  resetDraftToPublished,
} from "../../../content/store";
import { getEditorUser } from "../../../edit-auth";

export async function POST(request: Request) {
  if (!(await getEditorUser())) {
    return Response.json({ error: "Not authorized" }, { status: 401 });
  }
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      target?: string;
    };
    const draft =
      payload.target === "defaults"
        ? await resetDraftToDefaults()
        : await resetDraftToPublished();
    return Response.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
