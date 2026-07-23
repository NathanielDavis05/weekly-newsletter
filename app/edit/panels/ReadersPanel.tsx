"use client";

// Readers panel: who has marked the *live* issue as read.
//
// Rows come from the `reader_signins` table via GET /api/acknowledge, which
// resolves the current issue from the published content. The roster is per
// issue, so publishing a new week starts a fresh list.

import { useCallback, useEffect, useState } from "react";

interface Signin {
  name: string;
  createdAt: string;
}

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

export function ReadersPanel({ onClose }: { onClose: () => void }) {
  const [signins, setSignins] = useState<Signin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetch("/api/acknowledge").then((response) => response.json());
      if (data.error) throw new Error(data.error);
      setSignins(data.signins ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load readers.");
      setSignins([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Subscribing to the readers API. Every setState happens after an await, so
    // this is not a synchronous render cascade despite what the lint rule sees.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const count = signins?.length ?? 0;

  return (
    <>
      <div className="drawer-heading">
        <h2>Readers</h2>
        <button type="button" onClick={onClose} aria-label="Close readers">×</button>
      </div>

      <p className="inspector-note">
        Everyone who entered their name on the live newsletter to mark it as read. Each published issue keeps its own list.
      </p>

      <div className="readers-summary">
        <strong>{count}</strong>
        <span>{count === 1 ? "person has" : "people have"} read this issue</span>
        <button type="button" className="rt-link-btn" onClick={() => void load()} disabled={refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="history-error">{error}</p> : null}
      {signins === null ? <p className="inspector-note">Loading…</p> : null}
      {signins?.length === 0 && !error ? (
        <p className="inspector-note">No one has signed in yet. Names appear here as readers mark the newsletter as read.</p>
      ) : null}

      <ol className="readers-list">
        {signins?.map((signin) => (
          <li key={signin.name} className="readers-row">
            <span className="readers-row__name">{signin.name}</span>
            <small>{when(signin.createdAt)}</small>
          </li>
        ))}
      </ol>
    </>
  );
}
