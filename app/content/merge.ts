import { defaultContent } from "./defaults";
import type { NewsletterContent } from "./types";
import { withVisualDocument } from "./visual";

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
  const merged = mergeValue(defaultContent, stored) as NewsletterContent;
  // Older saved issues kept the compact home scorecard and detailed results
  // table separately. Fold them into the shared source on first read so every
  // existing issue keeps its current content while future edits stay linked.
  if (isPlainObject(stored) && (!isPlainObject(stored.shared) || stored.shared.scorecard === undefined)) {
    const home = isPlainObject(stored) && isPlainObject(stored.home) && isPlainObject(stored.home.scorecard) ? stored.home.scorecard : {};
    const results = isPlainObject(stored) && isPlainObject(stored.results) ? stored.results : {};
    const table = isPlainObject(results) && isPlainObject(results.scorecard) ? results.scorecard : {};
    merged.shared.scorecard = {
      ...merged.shared.scorecard,
      ...home,
      table: { ...merged.shared.scorecard.table, ...table },
    };
  }
  // `visual` is intentionally not part of the authored newsletter defaults.
  // Keep it explicitly when a saved draft is read back, otherwise the generic
  // default merge would drop every freeform position, size, and style setting.
  if (isPlainObject(stored) && stored.visual !== undefined) {
    merged.visual = stored.visual as NewsletterContent["visual"];
  }
  return withVisualDocument(merged);
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
