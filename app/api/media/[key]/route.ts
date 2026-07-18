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
