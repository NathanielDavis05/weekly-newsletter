"use client";

// The media library.
//
// Files live in the R2 `MEDIA` bucket and their metadata in D1, which is what
// makes them searchable and lets alt text be written once and travel with the
// image every time it is placed. Uploading through the existing /api/media
// route means images added before this panel existed show up here too.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface MediaAsset {
  id: string;
  key: string;
  url: string;
  contentType: string;
  size: string;
  createdAt: string;
  filename: string | null;
  altText: string | null;
}

export interface MediaPanelProps {
  onClose: () => void;
  /** Places the image into the current selection, when one can take an image. */
  onUse: ((asset: MediaAsset) => void) | null;
}

const readableSize = (bytes: string) => {
  const value = Number(bytes);
  if (!Number.isFinite(value)) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export function MediaPanel({ onClose, onUse }: MediaPanelProps) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetch("/api/media").then((response) => response.json());
      if (data.error) throw new Error(data.error);
      setAssets(data.assets ?? []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the media library.");
      setAssets([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const upload = useCallback(async (files: FileList | File[]) => {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const data = await fetch("/api/media", { method: "POST", body: form }).then((response) => response.json());
        if (data.error) throw new Error(data.error);
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const patch = useCallback(async (key: string, body: { filename?: string; altText?: string }) => {
    // Update locally first so typing stays responsive; the request follows.
    setAssets((current) => current?.map((asset) => asset.key === key ? { ...asset, ...body } : asset) ?? current);
    try {
      await fetch(`/api/media/${key}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setError("Could not save that change.");
    }
  }, []);

  const remove = useCallback(async (key: string) => {
    setBusy(true);
    try {
      const data = await fetch(`/api/media/${key}`, { method: "DELETE" }).then((response) => response.json());
      if (data.error) throw new Error(data.error);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete that image.");
    } finally {
      setBusy(false);
    }
  }, [load]);

  const visible = useMemo(() => {
    if (!assets) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return assets;
    return assets.filter((asset) =>
      `${asset.filename ?? ""} ${asset.altText ?? ""} ${asset.key}`.toLowerCase().includes(needle),
    );
  }, [assets, query]);

  return (
    <>
      <div className="drawer-heading">
        <h2>Media</h2>
        <button type="button" onClick={onClose} aria-label="Close media library">×</button>
      </div>

      <div
        className={`media-drop${dragOver ? " is-over" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (event.dataTransfer.files.length) void upload(event.dataTransfer.files);
        }}
      >
        <p>{busy ? "Uploading…" : "Drop images here"}</p>
        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}>Choose files</button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => { if (event.target.files?.length) void upload(event.target.files); event.target.value = ""; }}
        />
      </div>

      {error ? <p className="history-error">{error}</p> : null}

      <input
        className="template-search"
        type="search"
        placeholder="Search by name or alt text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {assets === null ? <p className="inspector-note">Loading…</p> : null}
      {assets?.length === 0 ? (
        <p className="inspector-note">Nothing uploaded yet. Images you add here can be reused across every issue.</p>
      ) : null}
      {assets?.length && visible.length === 0 ? (
        <p className="inspector-note">No images match “{query}”.</p>
      ) : null}

      <div className="media-grid">
        {visible.map((asset) => (
          <figure key={asset.key} className="media-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.altText ?? ""} loading="lazy" />
            <figcaption>
              <strong title={asset.filename ?? asset.key}>{asset.filename ?? asset.key}</strong>
              <small>{readableSize(asset.size)}{asset.altText ? "" : " · no alt text"}</small>
            </figcaption>

            <div className="media-item__actions">
              {onUse ? <button type="button" onClick={() => onUse(asset)}>Use</button> : null}
              <button type="button" onClick={() => setEditing(editing === asset.key ? null : asset.key)}>Details</button>
            </div>

            {editing === asset.key ? (
              <div className="media-item__editor">
                <label className="visual-control">
                  <span>Name</span>
                  <input
                    value={asset.filename ?? ""}
                    onChange={(event) => void patch(asset.key, { filename: event.target.value })}
                  />
                </label>
                <label className="visual-control">
                  <span>Alt text</span>
                  <input
                    value={asset.altText ?? ""}
                    placeholder="Describe the image"
                    onChange={(event) => void patch(asset.key, { altText: event.target.value })}
                  />
                </label>
                <div className="rt-row">
                  <button
                    type="button"
                    className="rt-link-btn"
                    onClick={() => void navigator.clipboard?.writeText(`${globalThis.location.origin}${asset.url}`)}
                  >
                    Copy URL
                  </button>
                  <button type="button" className="rt-link-btn" onClick={() => void remove(asset.key)} disabled={busy}>
                    Delete
                  </button>
                </div>
              </div>
            ) : null}
          </figure>
        ))}
      </div>
    </>
  );
}
