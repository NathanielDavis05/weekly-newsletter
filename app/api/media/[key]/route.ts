import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { mediaAssets } from "../../../../db/schema";
import { getEditorUser } from "../../../edit-auth";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!env.MEDIA) return new Response("Not found", { status: 404 });
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await getEditorUser())) return Response.json({ error: "Not authorized" }, { status: 401 });
  const { key } = await params;
  if (!env.MEDIA) return Response.json({ error: "Image storage is not available yet." }, { status: 503 });
  await env.MEDIA.delete(key);
  await getDb().delete(mediaAssets).where(eq(mediaAssets.key, key));
  return Response.json({ deleted: true });
}

/** Renames an asset or updates its alt text. */
export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!(await getEditorUser())) return Response.json({ error: "Not authorized" }, { status: 401 });
  const { key } = await params;
  try {
    const payload = (await request.json().catch(() => ({}))) as { filename?: string; altText?: string };
    const patch: { filename?: string; altText?: string } = {};
    if (typeof payload.filename === "string") patch.filename = payload.filename.trim().slice(0, 200);
    if (typeof payload.altText === "string") patch.altText = payload.altText.trim().slice(0, 400);
    if (!Object.keys(patch).length) return Response.json({ error: "Nothing to change." }, { status: 400 });

    await getDb().update(mediaAssets).set(patch).where(eq(mediaAssets.key, key));
    return Response.json({ updated: true, ...patch });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unexpected error" }, { status: 500 });
  }
}
