"use client";

// A deterministic ⌘K command palette. No AI, no network — just a fuzzy search
// over a list of commands the editor hands in (jump to a section, add a
// template, apply a Look, insert a saved block, open a panel). Keyboard-first:
// type to filter, arrow keys to move, Enter to run, Escape to close.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

/**
 * What a command does, as plain data. The palette stays free of any function
 * that reads a ref during render — the editor runs the action from an event
 * handler (`onRun`) where ref access is safe.
 */
export type CommandAction =
  | { kind: "page"; page: "home" | "training" | "results" }
  | { kind: "drawer"; drawer: "add" | "design" | "blocks" | "media" | "history" }
  | { kind: "template"; templateId: string }
  | { kind: "look"; lookId: string }
  | { kind: "block"; blockId: string }
  | { kind: "jump"; itemId: string };

export interface Command {
  id: string;
  label: string;
  /** Secondary text shown on the right (e.g. a colour swatch source or page). */
  hint?: string;
  /** Group heading the command is listed under. */
  group: string;
  action: CommandAction;
}

/**
 * Subsequence fuzzy match. Returns a score (higher is better) or -1 when the
 * query's characters do not all appear in order. Contiguous runs score higher so
 * "sco" ranks "Scorecard" above a scattered match.
 */
function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 0;
  let ti = 0;
  let score = 0;
  let streak = 0;
  for (const ch of q) {
    const idx = t.indexOf(ch, ti);
    if (idx === -1) return -1;
    streak = idx === ti ? streak + 2 : 0;
    score += 1 + streak;
    ti = idx + 1;
  }
  // Prefer shorter targets when scores tie, so exact-ish labels win.
  return score - text.length * 0.01;
}

export function CommandPalette({ commands, onRun, onClose }: { commands: Command[]; onRun: (action: CommandAction) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    const needle = query.trim();
    const scored = commands
      .map((command) => ({ command, score: fuzzyScore(needle, `${command.label} ${command.group}`) }))
      .filter((entry) => entry.score >= 0);
    // Stable order within equal scores keeps groups readable when unfiltered.
    if (needle) scored.sort((a, b) => b.score - a.score);
    const ranked = scored.map((entry) => entry.command).slice(0, 40);
    // Tag the first command of each group so headings print without a mutable
    // cursor during render.
    return ranked.map((command, index) => ({ command, heading: index === 0 || ranked[index - 1].group !== command.group ? command.group : null }));
  }, [commands, query]);

  const run = useCallback((command: Command | undefined) => {
    if (!command) return;
    onClose();
    onRun(command.action);
  }, [onClose, onRun]);

  const onKeyDown = (event: ReactKeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(results.length - 1, index + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
    else if (event.key === "Enter") { event.preventDefault(); run(results[active]?.command); }
    else if (event.key === "Escape") { event.preventDefault(); onClose(); }
  };

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(".cmdk-item.is-active")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div className="cmdk-backdrop" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmdk-input"
          type="text"
          placeholder="Jump to a section, add a block, switch a Look…"
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onKeyDown={onKeyDown}
          aria-label="Search commands"
        />
        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? <p className="cmdk-empty">No matches.</p> : null}
          {results.map(({ command, heading }, index) => (
            <div key={command.id}>
              {heading ? <p className="cmdk-group">{heading}</p> : null}
              <button
                type="button"
                className={`cmdk-item${index === active ? " is-active" : ""}`}
                onMouseMove={() => setActive(index)}
                onClick={() => run(command)}
              >
                <span className="cmdk-item__label">{command.label}</span>
                {command.hint ? <span className="cmdk-item__hint">{command.hint}</span> : null}
              </button>
            </div>
          ))}
        </div>
        <div className="cmdk-foot"><kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>↵</kbd> to run · <kbd>esc</kbd> to close</div>
      </div>
    </div>
  );
}
