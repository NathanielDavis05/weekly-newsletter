import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Editing is protected by a single shared password (env `EDITOR_PASSWORD`).
// A successful login sets a signed, HttpOnly session cookie; every editor page
// and content API checks it. Public pages stay anonymous.

export type EditorUser = { displayName: string; email: string; fullName: string | null };

export const SESSION_COOKIE = "editor_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const EDITOR_USER: EditorUser = { displayName: "Editor", email: "editor", fullName: null };

function secret(): string {
  return process.env.EDITOR_SESSION_SECRET || process.env.EDITOR_PASSWORD || "insecure-dev-secret";
}
function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export function createSessionToken(): string {
  const expires = String(Date.now() + SESSION_TTL_MS);
  return `${expires}.${sign(expires)}`;
}
export function sessionCookieMaxAge(): number {
  return Math.floor(SESSION_TTL_MS / 1000);
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [expires, mac] = token.split(".");
  if (!expires || !mac) return false;
  if (!Number.isFinite(Number(expires)) || Number(expires) < Date.now()) return false;
  const expected = sign(expires);
  const provided = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  return provided.length === wanted.length && timingSafeEqual(provided, wanted);
}

/** Constant-time check of a submitted password against `EDITOR_PASSWORD`. */
export function checkEditorPassword(candidate: string): boolean {
  const expected = process.env.EDITOR_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(candidate).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** For API route handlers. Returns the editor user if signed in, else null. */
export async function getEditorUser(): Promise<EditorUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value) ? EDITOR_USER : null;
}

/** For server components (editor + preview pages). Redirects to login if not signed in. */
export async function requireEditorUser(returnTo: string): Promise<EditorUser> {
  const user = await getEditorUser();
  if (user) return user;
  redirect(`/edit/login?return_to=${encodeURIComponent(returnTo)}`);
}
