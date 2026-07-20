// Dotted-path access into NewsletterContent.
//
// The native newsletter sections render fixed fields (`training.heading`,
// `home.overview.actionCard.bodyEmphasis`, …). Rich-text overrides are keyed by
// those same paths, so the editor needs to read and write them generically
// rather than through a switch over every field.
//
// Array indices are plain numeric segments: `training.statusRows.0.label`.

export type ContentPath = string;

const segments = (path: ContentPath) => path.split(".").filter(Boolean);

/** Reads a value, or undefined if any segment is missing. */
export function getByPath(source: unknown, path: ContentPath): unknown {
  let current = source;
  for (const key of segments(path)) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** Reads a string field, falling back to "" for anything else. */
export function getStringByPath(source: unknown, path: ContentPath): string {
  const value = getByPath(source, path);
  return typeof value === "string" ? value : "";
}

/**
 * Writes a value in place. Missing intermediate objects are *not* created — the
 * paths always describe fields that already exist in the content model, so a
 * missing parent means the path is wrong and silently building one would hide
 * the mistake.
 */
export function setByPath(target: unknown, path: ContentPath, value: unknown): boolean {
  const keys = segments(path);
  if (!keys.length) return false;

  let current = target;
  for (const key of keys.slice(0, -1)) {
    if (current === null || current === undefined || typeof current !== "object") return false;
    current = (current as Record<string, unknown>)[key];
  }
  if (current === null || current === undefined || typeof current !== "object") return false;

  const last = keys[keys.length - 1];
  if (Array.isArray(current) && !/^\d+$/.test(last)) return false;
  (current as Record<string, unknown>)[last] = value;
  return true;
}
