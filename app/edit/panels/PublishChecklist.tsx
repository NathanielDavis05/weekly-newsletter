"use client";

// Pre-publication checklist.
//
// Errors block publishing outright — a button that links nowhere is broken and
// no confirmation makes it not broken. Warnings need an explicit acknowledgement
// so nothing goes out unnoticed, but they never stand in the way of a manager
// who knows what they are doing.

import { useState } from "react";
import type { ValidationIssue, ValidationResult } from "../publishing/validation";

export interface PublishChecklistProps {
  result: ValidationResult;
  busy: boolean;
  onPublish: () => void;
  onClose: () => void;
  /** Selects the offending element/field on the canvas. */
  onJump: (issue: ValidationIssue) => void;
}

function IssueRow({ issue, onJump }: { issue: ValidationIssue; onJump: (issue: ValidationIssue) => void }) {
  const locatable = Boolean(issue.itemId || issue.path);
  return (
    <li className={`checklist-issue checklist-issue--${issue.severity}`}>
      <span className="checklist-issue__mark" aria-hidden="true">{issue.severity === "error" ? "!" : "?"}</span>
      <div>
        <strong>{issue.message}</strong>
        {issue.detail ? <small>{issue.detail}</small> : null}
        {issue.page ? <em>on the {issue.page} page</em> : null}
      </div>
      {locatable ? (
        <button type="button" className="rt-link-btn" onClick={() => onJump(issue)}>Show me</button>
      ) : null}
    </li>
  );
}

export function PublishChecklist({ result, busy, onPublish, onClose, onJump }: PublishChecklistProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { errors, warnings, canPublish } = result;
  const needsAcknowledgement = warnings.length > 0 && !acknowledged;
  const clean = errors.length === 0 && warnings.length === 0;

  return (
    <div className="checklist-backdrop" role="dialog" aria-modal="true" aria-label="Publish checklist">
      <div className="checklist">
        <div className="checklist__head">
          <h2>Ready to publish?</h2>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {clean ? (
          <p className="checklist__clean">Everything checks out. This will replace the live newsletter.</p>
        ) : (
          <>
            {errors.length ? (
              <section>
                <h3>{errors.length} thing{errors.length === 1 ? "" : "s"} to fix first</h3>
                <ul className="checklist-list">
                  {errors.map((issue) => <IssueRow key={issue.id} issue={issue} onJump={onJump} />)}
                </ul>
              </section>
            ) : null}

            {warnings.length ? (
              <section>
                <h3>{warnings.length} thing{warnings.length === 1 ? "" : "s"} worth a look</h3>
                <ul className="checklist-list">
                  {warnings.map((issue) => <IssueRow key={issue.id} issue={issue} onJump={onJump} />)}
                </ul>
                <label className="checklist__ack">
                  <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
                  <span>I have checked these and want to publish anyway.</span>
                </label>
              </section>
            ) : null}
          </>
        )}

        <div className="checklist__actions">
          <button type="button" onClick={onClose}>Keep editing</button>
          <button
            type="button"
            className="publish-button"
            disabled={!canPublish || needsAcknowledgement || busy}
            onClick={onPublish}
          >
            {busy ? "Publishing…" : "Publish now"}
          </button>
        </div>
        {!canPublish ? (
          <p className="checklist__blocked">Publishing is blocked until the errors above are fixed.</p>
        ) : null}
      </div>
    </div>
  );
}
