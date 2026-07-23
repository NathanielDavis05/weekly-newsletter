"use client";

// The reusable block library.
//
// Blocks saved here live in the visual document (so they persist with the site
// and travel with every issue). Save any freeform card/section from the canvas,
// then drop it into any page — the structure and styling come with it; a fresh
// id is generated on insert so copies stay independent.

import { useState } from "react";
import type { SavedBlock } from "../../content/types";

export interface SavedBlocksPanelProps {
  blocks: SavedBlock[];
  /** Whether a saveable (non-native) item is currently selected. */
  canSaveSelection: boolean;
  onSaveSelection: (name: string) => void;
  onInsert: (block: SavedBlock) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function SavedBlocksPanel({ blocks, canSaveSelection, onSaveSelection, onInsert, onRename, onDelete, onClose }: SavedBlocksPanelProps) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <>
      <div className="drawer-heading">
        <h2>Saved blocks</h2>
        <button type="button" onClick={onClose} aria-label="Close saved blocks">×</button>
      </div>

      <p className="inspector-note">
        Reuse cards and sections across issues. Select any item on the canvas, then save it here.
      </p>

      <button
        type="button"
        className="list-add"
        disabled={!canSaveSelection}
        onClick={() => onSaveSelection("Saved block")}
      >
        {canSaveSelection ? "+ Save current selection" : "Select an item to save"}
      </button>

      {blocks.length === 0 ? (
        <p className="inspector-note">Nothing saved yet.</p>
      ) : (
        <div className="inspector-list">
          {blocks.map((entry) => (
            <div className="list-item" key={entry.id}>
              <div className="list-item__head">
                <span>{entry.block.kind}</span>
                <span className="list-item__buttons">
                  <button type="button" onClick={() => setEditing(editing === entry.id ? null : entry.id)} aria-label="Rename">✎</button>
                  <button type="button" className="danger" onClick={() => onDelete(entry.id)} aria-label="Delete">✕</button>
                </span>
              </div>
              {editing === entry.id ? (
                <label className="visual-control">
                  <span>Name</span>
                  <input autoFocus value={entry.name} onChange={(event) => onRename(entry.id, event.target.value)} />
                </label>
              ) : (
                <strong className="saved-block__name">{entry.name}</strong>
              )}
              <button type="button" className="list-add" onClick={() => onInsert(entry)}>Insert into this page</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
