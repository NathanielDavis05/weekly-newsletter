// Undo/redo history with transactions and coalescing.
//
// The editor previously pushed a snapshot on every mutation, which meant one
// drag of a resize handle produced a few hundred undo steps — pressing undo
// after a resize moved the handle one pixel back. This module fixes that with
// two mechanisms:
//
//   * transactions — `begin()` / `commit()` wrap a continuous interaction so the
//     whole drag collapses into a single entry, using the state captured at
//     `begin()` as the "before" snapshot.
//   * coalescing — successive edits sharing a `coalesceKey` inside a short time
//     window merge into the preceding entry (typing in a field, nudging with
//     the arrow keys), so a burst of small edits is one undo.
//
// It is deliberately framework-free and works on immutable snapshots, which
// makes it directly unit-testable.

export interface HistoryEntry<T> {
  label: string;
  before: T;
  after: T;
  coalesceKey?: string;
  at: number;
}

export interface RecordOptions {
  label: string;
  /** Edits sharing this key inside `window` ms merge into the previous entry. */
  coalesceKey?: string;
  /** Coalescing window in milliseconds. Defaults to 600. */
  window?: number;
}

export interface HistorySnapshot {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  depth: number;
}

const DEFAULT_LIMIT = 100;
const DEFAULT_COALESCE_WINDOW = 600;

export class History<T> {
  private past: Array<HistoryEntry<T>> = [];
  private future: Array<HistoryEntry<T>> = [];
  /** Non-null while a transaction is open; holds the pre-interaction state. */
  private pending: { before: T; label: string } | null = null;
  private listeners = new Set<() => void>();

  private readonly limit: number;
  /** Injectable clock — the tests drive coalescing without real timers. */
  private readonly now: () => number;

  constructor(limit = DEFAULT_LIMIT, now: () => number = () => Date.now()) {
    this.limit = limit;
    this.now = now;
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    for (const listener of this.listeners) listener();
  }

  /**
   * Opens a transaction. Every `record()` until `commit()` is absorbed, so the
   * interaction lands as one entry. Nested calls are ignored — the outermost
   * transaction wins, which keeps callers from having to coordinate.
   */
  begin(before: T, label: string): void {
    if (this.pending) return;
    this.pending = { before, label };
  }

  get inTransaction(): boolean {
    return this.pending !== null;
  }

  /** Closes the transaction, recording a single entry if anything changed. */
  commit(after: T): void {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    if (Object.is(pending.before, after)) return;
    this.append({ label: pending.label, before: pending.before, after, at: this.now() });
  }

  /** Closes the transaction without recording anything. */
  abort(): void {
    this.pending = null;
  }

  /**
   * Records an edit. Inside a transaction this is a no-op (the transaction will
   * record the whole span on commit); outside one it appends or coalesces.
   */
  record(before: T, after: T, options: RecordOptions): void {
    if (this.pending) return;
    if (Object.is(before, after)) return;

    const at = this.now();
    const previous = this.past[this.past.length - 1];
    const window = options.window ?? DEFAULT_COALESCE_WINDOW;

    if (
      options.coalesceKey &&
      previous &&
      previous.coalesceKey === options.coalesceKey &&
      at - previous.at <= window
    ) {
      // Extend the previous entry rather than adding a new one: its `before`
      // still describes the state the user would expect undo to return to.
      previous.after = after;
      previous.at = at;
      this.future = [];
      this.emit();
      return;
    }

    this.append({ label: options.label, before, after, coalesceKey: options.coalesceKey, at });
  }

  private append(entry: HistoryEntry<T>) {
    this.past.push(entry);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    this.emit();
  }

  /** Returns the state to restore, or null when there is nothing to undo. */
  undo(): T | null {
    const entry = this.past.pop();
    if (!entry) return null;
    this.future.unshift(entry);
    this.emit();
    return entry.before;
  }

  redo(): T | null {
    const entry = this.future.shift();
    if (!entry) return null;
    this.past.push(entry);
    this.emit();
    return entry.after;
  }

  /** Drops all history — used when the document is replaced wholesale. */
  reset(): void {
    this.past = [];
    this.future = [];
    this.pending = null;
    this.emit();
  }

  snapshot(): HistorySnapshot {
    return {
      canUndo: this.past.length > 0,
      canRedo: this.future.length > 0,
      undoLabel: this.past[this.past.length - 1]?.label ?? null,
      redoLabel: this.future[0]?.label ?? null,
      depth: this.past.length,
    };
  }
}
