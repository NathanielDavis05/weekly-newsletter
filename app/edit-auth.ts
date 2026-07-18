import { env } from "cloudflare:workers";
import { redirect } from "next/navigation";
import {
  type ChatGPTUser,
  getChatGPTUser,
  requireChatGPTUser,
} from "./chatgpt-auth";

// Sign-in with ChatGPT proves *who* someone is, not that they are the owner of
// this newsletter. Editing is therefore restricted to an allowlist of emails
// kept in the EDITOR_ALLOWLIST env var (comma-separated). The value lives only
// on the server and is never sent to the client.
const DEFAULT_ALLOWLIST = "nathaniel@thedavisspot.com";

function allowedEmails(): string[] {
  const raw = (env as Record<string, unknown>).EDITOR_ALLOWLIST;
  const source = typeof raw === "string" && raw.trim() ? raw : DEFAULT_ALLOWLIST;
  return source
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEditor(email: string): boolean {
  return allowedEmails().includes(email.trim().toLowerCase());
}

/**
 * For server components (editor + preview pages). Redirects anonymous users to
 * sign in, and signed-in-but-not-allowlisted users back to the public site.
 */
export async function requireEditorUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await requireChatGPTUser(returnTo);
  if (!isAllowedEditor(user.email)) {
    redirect("/");
  }
  return user;
}

/**
 * For API route handlers. Returns the user only if signed in AND allowlisted,
 * otherwise null so the caller can respond 401/403 without redirecting.
 */
export async function getEditorUser(): Promise<ChatGPTUser | null> {
  const user = await getChatGPTUser();
  if (!user || !isAllowedEditor(user.email)) return null;
  return user;
}
