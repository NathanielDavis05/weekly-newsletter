import { cookies } from "next/headers";
import { checkEditorPassword, createSessionToken, SESSION_COOKIE, sessionCookieMaxAge } from "../../edit-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { password?: unknown };
  const password = typeof body.password === "string" ? body.password : "";
  if (!checkEditorPassword(password)) {
    return Response.json({ error: "Incorrect password." }, { status: 401 });
  }
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge(),
  });
  return Response.json({ ok: true });
}
