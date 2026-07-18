import type { NewsletterContent } from "../content/types";
import { DetailHeader } from "./DetailHeader";
import { ItemCanvas, type CanvasEditorState } from "./ItemCanvas";

export function TrainingView({ content, editor }: { content: NewsletterContent; editor?: CanvasEditorState }) {
  const { training } = content;
  const native = {
    "training-intro": <section className="detail-intro"><p className="urgent-label urgent-label--pill">{training.badge}</p><h1>{training.heading}</h1><p className="detail-lead">{training.lead}</p></section>,
    "training-status": <section className="status-list" aria-label="Training deadlines">{training.statusRows.map((row, index) => <div className="status-row" key={`${row.label}-${index}`}><span className={`status-token${row.tokenRed ? " status-token--red" : ""}`} aria-hidden="true">{row.token}</span><div><small>{row.label}</small><strong>{row.strongPrefix}{row.strongEmphasis ? <em>{row.strongEmphasis}</em> : null}</strong></div></div>)}</section>,
    "training-action": <div className="action-block"><a className="button button--red button--full" href={training.primaryButton.href} target="_blank" rel="noreferrer">{training.primaryButton.label}</a><a className="help-link" href={training.helpLink.href}>{training.helpLink.label}</a></div>,
    "training-alert": <aside className="deadline-alert"><p className="card-kicker">{training.alert.kicker}</p><p>{training.alert.body}</p></aside>,
    "training-covers": <section className="detail-section"><p className="eyebrow">{training.covers.eyebrow}</p><h2>{training.covers.heading}</h2><ul className="check-list">{training.covers.items.map((item) => <li key={item}><span aria-hidden="true">✓</span>{item}</li>)}</ul></section>,
    "training-why": <section className="detail-section detail-section--soft"><p className="eyebrow">{training.why.eyebrow}</p><h2>{training.why.heading}</h2>{training.why.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</section>,
    "training-help": <section className="leader-help" id="leader-help"><div className="help-mark" aria-hidden="true">{training.help.mark}</div><div><h2>{training.help.heading}</h2><p>{training.help.body}</p></div></section>,
  };
  return <div className="site-shell site-shell--detail"><DetailHeader content={content} page="training" title={training.heading} kicker={training.badge} editor={editor} /><main id="main-content"><ItemCanvas content={content} page="training" native={native} editor={editor} /></main></div>;
}
