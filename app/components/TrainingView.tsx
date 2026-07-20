import type { NewsletterContent } from "../content/types";
import { visualDocument } from "../content/visual";
import { DetailHeader } from "./DetailHeader";
import { ItemCanvas, type CanvasEditorState } from "./ItemCanvas";
import { RichField } from "./RichField";

export function TrainingView({ content, editor }: { content: NewsletterContent; editor?: CanvasEditorState }) {
  const { training } = content;
  // Formatting overrides for the fixed copy, keyed by content path. Resolved
  // once per render rather than once per field.
  const overrides = visualDocument(content).richOverrides;
  /** A formattable field. Inline by default so surrounding markup is untouched. */
  const f = (path: string, value: string, block?: boolean) => (
    <RichField path={path} value={value} overrides={overrides} editor={editor} block={block} />
  );

  const native = {
    "training-intro": <section className="detail-intro">
      <p className="urgent-label urgent-label--pill">{f("training.badge", training.badge)}</p>
      <h1>{f("training.heading", training.heading)}</h1>
      <p className="detail-lead">{f("training.lead", training.lead)}</p>
    </section>,

    "training-status": <section className="status-list" aria-label="Training deadlines">
      {training.statusRows.map((row, index) => <div className="status-row" key={`${row.label}-${index}`}>
        <span className={`status-token${row.tokenRed ? " status-token--red" : ""}`} aria-hidden="true">{row.token}</span>
        <div>
          <small>{f(`training.statusRows.${index}.label`, row.label)}</small>
          <strong>
            {f(`training.statusRows.${index}.strongPrefix`, row.strongPrefix)}
            {row.strongEmphasis ? <em>{f(`training.statusRows.${index}.strongEmphasis`, row.strongEmphasis)}</em> : null}
          </strong>
        </div>
      </div>)}
    </section>,

    "training-action": <div className="action-block">
      <a className="button button--red button--full" href={training.primaryButton.href} target="_blank" rel="noreferrer">
        {f("training.primaryButton.label", training.primaryButton.label)}
      </a>
      <a className="help-link" href={training.helpLink.href}>{f("training.helpLink.label", training.helpLink.label)}</a>
    </div>,

    "training-alert": <aside className="deadline-alert">
      <p className="card-kicker">{f("training.alert.kicker", training.alert.kicker)}</p>
      <p>{f("training.alert.body", training.alert.body)}</p>
    </aside>,

    "training-covers": <section className="detail-section">
      <p className="eyebrow">{f("training.covers.eyebrow", training.covers.eyebrow)}</p>
      <h2>{f("training.covers.heading", training.covers.heading)}</h2>
      <ul className="check-list">
        {training.covers.items.map((item, index) => <li key={`${item}-${index}`}>
          <span aria-hidden="true">✓</span>{f(`training.covers.items.${index}`, item)}
        </li>)}
      </ul>
    </section>,

    "training-why": <section className="detail-section detail-section--soft">
      <p className="eyebrow">{f("training.why.eyebrow", training.why.eyebrow)}</p>
      <h2>{f("training.why.heading", training.why.heading)}</h2>
      {training.why.paragraphs.map((paragraph, index) => <p key={index}>{f(`training.why.paragraphs.${index}`, paragraph)}</p>)}
    </section>,

    "training-help": <section className="leader-help" id="leader-help">
      <div className="help-mark" aria-hidden="true">{training.help.mark}</div>
      <div>
        <h2>{f("training.help.heading", training.help.heading)}</h2>
        <p>{f("training.help.body", training.help.body)}</p>
      </div>
    </section>,
  };

  return <div className="site-shell site-shell--detail">
    <DetailHeader content={content} page="training" title={training.heading} kicker={training.badge} editor={editor} />
    <main id="main-content"><ItemCanvas content={content} page="training" native={native} editor={editor} /></main>
  </div>;
}
