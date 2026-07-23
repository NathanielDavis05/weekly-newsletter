"use client";

import { useState, type ReactNode } from "react";

interface ReaderSigninProps {
  /** True inside the editor canvas: disables the real network submit and adds
   *  a preview toggle, since a real reader only ever sees one state at a time
   *  but both need to stay editable. */
  editing: boolean;
  eyebrow: ReactNode;
  heading: ReactNode;
  lead: ReactNode;
  buttonLabel: ReactNode;
  doneHeading: ReactNode;
  /** The lowercase tail of the confirmation sentence — the "Thanks, {name} —"
   *  lead-in is generated below since a submitted name isn't authorable copy. */
  doneBody: ReactNode;
}

// Public "I've read this" widget. A reader types their name and it is saved
// against the live issue so the manager can see who has read the update. The
// component owns only its own submit state; the issue it belongs to is resolved
// server-side from the published content in /api/acknowledge.
export function ReaderSignin({ editing, eyebrow, heading, lead, buttonLabel, doneHeading, doneBody }: ReaderSigninProps) {
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");
  // Editor-only: lets the author flip between the two card states to edit both
  // sets of copy, since a real reader only ever sees one at a time.
  const [previewDone, setPreviewDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (editing) return;
    const trimmed = name.trim();
    if (!trimmed || state === "saving") return;
    setState("saving");
    setError(null);
    try {
      const response = await fetch("/api/acknowledge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await response.json().catch(() => ({}))) as { name?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
      setSavedName(data.name || trimmed);
      setState("done");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
      setState("error");
    }
  }

  const showDone = editing ? previewDone : state === "done";

  return (
    <section className="section reader-signin" aria-label="Mark this newsletter as read">
      {editing ? (
        <div className="reader-signin__preview-toggle" role="group" aria-label="Preview state">
          <button type="button" className={previewDone ? "" : "is-active"} onClick={(event) => { event.stopPropagation(); setPreviewDone(false); }}>Form</button>
          <button type="button" className={previewDone ? "is-active" : ""} onClick={(event) => { event.stopPropagation(); setPreviewDone(true); }}>Confirmation</button>
        </div>
      ) : null}
      <div className="reader-signin__card">
        {showDone ? (
          <div className="reader-signin__done">
            <span className="reader-signin__check" aria-hidden="true">✓</span>
            <div>
              <h2>{doneHeading}</h2>
              <p>Thanks, {editing ? "Jamie" : savedName} — {doneBody}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{heading}</h2>
            <p className="reader-signin__lead">{lead}</p>
            <form className="reader-signin__form" onSubmit={submit}>
              <input
                className="reader-signin__input"
                type="text"
                name="name"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                maxLength={60}
                onChange={(event) => setName(event.target.value)}
                aria-label="Your name"
                aria-invalid={state === "error"}
                readOnly={editing}
              />
              <button className="button button--red" type="submit" disabled={editing ? false : !name.trim() || state === "saving"}>
                {state === "saving" ? "Saving…" : buttonLabel}
              </button>
            </form>
            {!editing && state === "error" && error ? <p className="reader-signin__error" role="alert">{error}</p> : null}
          </>
        )}
      </div>
    </section>
  );
}
