import { env } from "cloudflare:workers";
import { mergeContent } from "../../../content/merge";
import { getEditorContent } from "../../../content/store";
import { getEditorUser } from "../../../edit-auth";
import { createNextIssue } from "../../../edit/publishing/nextIssue";
import { visualDocument } from "../../../content/visual";

function jsonFromResponse(body: Record<string, unknown>): string {
  if (typeof body.output_text === "string") return body.output_text;
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) for (const part of Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : []) {
    const text = (part as Record<string, unknown>).text;
    if (typeof text === "string") return text;
  }
  return "";
}

export async function POST(request: Request) {
  if (!(await getEditorUser())) return Response.json({ error: "Not authorized" }, { status: 401 });
  const notes = String((await request.json().catch(() => ({})) as { notes?: string }).notes ?? "").trim();
  if (!notes) return Response.json({ error: "Add your weekly notes first." }, { status: 400 });
  const apiKey = (env as Record<string, unknown>).OPENAI_API_KEY;
  if (typeof apiKey !== "string" || !apiKey) return Response.json({ error: "AI is not configured yet. Add the OPENAI_API_KEY secret to this site, then try again." }, { status: 503 });
  const { draft } = await getEditorContent();
  const rolled = createNextIssue(draft, visualDocument(draft));
  const instructions = "You are the careful editorial assistant for a Chick-fil-A team newsletter. Return ONLY valid JSON with exactly {content, summary}. content must be the supplied draft updated from the manager notes. Preserve its structure, page layout, links unless notes change them, and all unknown fields. Write concise, warm, practical copy. Update the shared scorecard when scores are supplied. Never invent dates, people, scores, links, or policy details; leave unclear fields unchanged. summary is an array of 3-8 short plain-English bullets describing only changes you made.";
  const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5-mini", reasoning: { effort: "low" }, input: [{ role: "system", content: instructions }, { role: "user", content: `Manager notes:\n${notes}\n\nDraft to update:\n${JSON.stringify(rolled.content)}` }] }) });
  if (!response.ok) return Response.json({ error: "The AI service could not prepare this issue. Please try again." }, { status: 502 });
  try {
    const payload = JSON.parse(jsonFromResponse(await response.json() as Record<string, unknown>)) as { content?: unknown; summary?: unknown };
    if (!payload.content || !Array.isArray(payload.summary)) throw new Error("invalid response");
    return Response.json({ content: mergeContent(payload.content), summary: payload.summary.filter((x): x is string => typeof x === "string").slice(0, 8), rollover: rolled.summary });
  } catch { return Response.json({ error: "The AI returned an unusable draft. Please try again." }, { status: 502 }); }
}
