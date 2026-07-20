import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { mediaAssets } from "../../../db/schema";
import { getEditorUser } from "../../edit-auth";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  if (!(await getEditorUser())) return Response.json({ error: "Not authorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose an image file first." }, { status: 400 });
    if (!ACCEPTED_TYPES.has(file.type)) return Response.json({ error: "Use a JPG, PNG, WebP, or GIF image." }, { status: 400 });
    if (file.size > MAX_IMAGE_BYTES) return Response.json({ error: "Images must be 8 MB or smaller." }, { status: 400 });
    if (!env.MEDIA) return Response.json({ error: "Image storage is not available yet." }, { status: 503 });

    const id = crypto.randomUUID();
    const key = `media-${id}`;
    await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type }, customMetadata: { filename: file.name } });
    await getDb().insert(mediaAssets).values({ id, key, contentType: file.type, size: String(file.size), createdAt: new Date().toISOString(), filename: file.name, altText: null });
    return Response.json({ url: `/api/media/${key}`, key, filename: file.name });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not upload this image." }, { status: 500 });
  }
}

/** The media library listing. Newest first. */
export async function GET() {
  if (!(await getEditorUser())) return Response.json({ error: "Not authorized" }, { status: 401 });
  try {
    const rows = await getDb().select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(300);
    return Response.json({
      assets: rows.map((row) => ({ ...row, url: `/api/media/${row.key}` })),
    });
  } catch (error) {
    // No table yet means nothing has been uploaded; an empty library is the
    // honest answer rather than an error that blocks the panel from opening.
    const message = error instanceof Error ? error.message : "Unexpected error";
    if (message.includes("no such table")) return Response.json({ assets: [] });
    return Response.json({ error: message }, { status: 500 });
  }
}
