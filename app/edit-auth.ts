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

// ---------------------------------------------------------------------------
// LOCAL-DEV-ONLY BYPASS — remove this block once you're done testing locally.
// `import.meta.env.DEV` is a Vite build-time constant: it is `true` only under
// `vinext dev` and is statically replaced with `false` (then dead-code-eliminated)
// by `vinext build`/`vinext deploy`. This code cannot exist in the deployed
// bundle, so it can never bypass auth on the live site — but it does mean
// `/edit` skips ChatGPT sign-in entirely whenever you run `npm run dev`.
const LOCAL_DEV_USER: ChatGPTUser = { displayName: "Local dev", email: DEFAULT_ALLOWLIST.split(",")[0].trim(), fullName: null };
function localDevBypass(): ChatGPTUser | null {
  return import.meta.env.DEV ? LOCAL_DEV_USER : null;
}
// ---------------------------------------------------------------------------

/**
 * For server components (editor + preview pages). Redirects anonymous users to
 * sign in, and signed-in-but-not-allowlisted users back to the public site.
 */
export async function requireEditorUser(returnTo: string): Promise<ChatGPTUser> {
  const devUser = localDevBypass();
  if (devUser) return devUser;
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
  const devUser = localDevBypass();
  if (devUser) return devUser;
  const user = await getChatGPTUser();
  if (!user || !isAllowedEditor(user.email)) return null;
  return user;
}
