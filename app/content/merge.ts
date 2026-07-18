import { defaultContent } from "./defaults";
import type { NewsletterContent } from "./types";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

// Deep-merges stored content over the defaults. Objects are merged key by key
// (following the default shape); arrays and primitives from the stored content
// replace the default wholesale. Anything missing falls back to the default, so
// partial or empty stored content still renders a complete, valid page.
function mergeValue(base: unknown, override: unknown): unknown {
  if (override === undefined || override === null) return base;
  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(base)) {
      result[key] = mergeValue(base[key], override[key]);
    }
    return result;
  }
  return override;
}

/** Merge parsed, possibly-partial stored content onto the canonical defaults. */
export function mergeContent(stored: unknown): NewsletterContent {
  return mergeValue(defaultContent, stored) as NewsletterContent;
}

/** Safely parse a JSON content string, falling back to defaults on any error. */
export function parseContent(raw: string | null | undefined): NewsletterContent {
  if (!raw) return defaultContent;
  try {
    return mergeContent(JSON.parse(raw));
  } catch {
    return defaultContent;
  }
}
