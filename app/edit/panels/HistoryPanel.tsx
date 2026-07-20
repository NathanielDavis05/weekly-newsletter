"use client";

// Revision history.
//
// Rows come from the `newsletter_versions` table, which now gets an entry on
// every manual save, publish and restore. Restoring copies that version into
// the draft — the live newsletter does not change until you publish, so
// restoring is always safe to try.

import { useCallback, useEffect, useState } from "react";

export interface VersionSummary {
  id: string;
  kind: string;
  revision: number;
  createdAt: string;
  label: string | null;
  author: string | null;
}

const KIND_LABELS: Record<string, string> = {
  publish: "Published",
  save: "Saved",
  restore: "Restored",
  "migration-draft": "Before an upgrade (draft)",
  "migration-published": "Before an upgrade (live)",
};

function when(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function HistoryPanel({
  onClose,
  onRestored,
}: {
  onClose: () => void;
  onRestored: (revision: number) => void;
}) {
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  /**
   * Fetches the list. Nothing is set synchronously — every state update happens
   * after the await, so mounting this panel does not cascade a render.
   */
  const load = useCallback(async () => {
    try {
      const data = await fetch("/api/content/versions").then((response) => response.json());
      if (data.error) throw new Error(data.error);
      setVersions(data.versions ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load history.");
      setVersions([]);
    }
  }, []);

  useEffect(() => {
    // Subscribing to an external system (the history API) is the sanctioned use
    // of an effect. The rule cannot see that every setState here happens after
    // an await, so it reads this as a synchronous cascade; it isn't one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const restore = async (id: string) => {
    setRestoring(id);
    setError(null);
    try {
      const data = await fetch("/api/content/versions/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).then((response) => response.json());
      if (data.error) throw new Error(data.error);
      onRestored(data.revision);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restore that version.");
    } finally {
      setRestoring(null);
      setConfirming(null);
    }
  };

  return (
    <>
      <div className="drawer-heading">
        <h2>History</h2>
        <button type="button" onClick={onClose} aria-label="Close history">×</button>
      </div>

      <p className="inspector-note">
        Restoring copies an earlier version into your draft. The live newsletter only changes when you publish.
      </p>

      {error ? <p className="history-error">{error}</p> : null}
      {versions === null ? <p className="inspector-note">Loading…</p> : null}
      {versions?.length === 0 ? (
        <p className="inspector-note">No history yet. Saving or publishing will start recording versions here.</p>
      ) : null}

      <ol className="history-list">
        {versions?.map((version) => (
          <li key={version.id} className={`history-row history-row--${version.kind}`}>
            <div className="history-row__main">
              <strong>{KIND_LABELS[version.kind] ?? version.kind}</strong>
              <small>{when(version.createdAt)}{version.author ? ` · ${version.author}` : ""}</small>
              {version.label ? <em>{version.label}</em> : null}
            </div>
            {confirming === version.id ? (
              <div className="history-row__confirm">
                <span>Replace your draft?</span>
                <button type="button" className="rt-primary" disabled={restoring === version.id} onClick={() => void restore(version.id)}>
                  {restoring === version.id ? "Restoring…" : "Yes, restore"}
                </button>
                <button type="button" className="rt-link-btn" onClick={() => setConfirming(null)}>Cancel</button>
              </div>
            ) : (
              <button type="button" className="rt-link-btn" onClick={() => setConfirming(version.id)}>Restore</button>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
