import type { NewsletterContent } from "../content/types";
import { visualDocument } from "../content/visual";
import { DetailHeader } from "./DetailHeader";
import { ItemCanvas, type CanvasEditorState } from "./ItemCanvas";
import { RichField } from "./RichField";

export function ResultsView({ content, editor }: { content: NewsletterContent; editor?: CanvasEditorState }) {
  const { results } = content;
  // Formatting overrides for the fixed copy, keyed by content path.
  const overrides = visualDocument(content).richOverrides;
  /** A formattable field. Inline by default so surrounding markup is untouched. */
  const f = (path: string, value: string, block?: boolean) => (
    <RichField path={path} value={value} overrides={overrides} editor={editor} block={block} />
  );

  const metric = (index: number) => {
    const value = results.headlineMetrics[index];
    if (!value) return null;
    return <article className="metric-card">
      <div>
        <h2>{f(`results.headlineMetrics.${index}.label`, value.label)}</h2>
        <p>{f(`results.headlineMetrics.${index}.goal`, value.goal)}</p>
      </div>
      <div className="metric-card__score">
        <strong>{f(`results.headlineMetrics.${index}.value`, value.value)}</strong>
        <span className={value.positive ? "status status--good" : "status status--focus"}>
          {f(`results.headlineMetrics.${index}.status`, value.status)}
        </span>
      </div>
    </article>;
  };

  const native = {
    "results-intro": <section className="detail-intro detail-intro--center">
      <p className="eyebrow eyebrow--red-pill">{f("results.eyebrow", results.eyebrow)}</p>
      <h1>{f("results.heading", results.heading)}</h1>
      <p className="detail-lead">{f("results.lead", results.lead)}</p>
    </section>,

    "results-summary": <section className="goal-summary" aria-label={results.summaryAria}>
      <span className="goal-summary__mark" aria-hidden="true">★</span>
      <div>
        <strong>{f("results.summaryValue", results.summaryValue)} <span>{f("results.summaryUnit", results.summaryUnit)}</span></strong>
        <p>{f("results.summaryLabel", results.summaryLabel)}</p>
      </div>
    </section>,

    "results-metric-0": metric(0), "results-metric-1": metric(1), "results-metric-2": metric(2),

    "results-focus": <aside className="focus-callout">
      <p className="urgent-label">{f("results.focus.label", results.focus.label)}</p>
      <h2>{f("results.focus.heading", results.focus.heading)}</h2>
      <p>{f("results.focus.body", results.focus.body)}</p>
    </aside>,

    "results-scorecard": <section className="detail-section">
      <p className="eyebrow">{f("results.scorecard.eyebrow", results.scorecard.eyebrow)}</p>
      <h2>{f("results.scorecard.heading", results.scorecard.heading)}</h2>
      <div className="metrics-table-wrap">
        <table className="metrics-table">
          <thead><tr>
            <th>{f("results.scorecard.headerMeasure", results.scorecard.headerMeasure)}</th>
            <th>{f("results.scorecard.headerGoal", results.scorecard.headerGoal)}</th>
            <th>{f("results.scorecard.headerApr", results.scorecard.headerApr)}</th>
            <th>{f("results.scorecard.headerMay", results.scorecard.headerMay)}</th>
            <th>{f("results.scorecard.headerJun", results.scorecard.headerJun)}</th>
          </tr></thead>
          <tbody>
            {results.scorecard.rows.map((row, index) => <tr key={row.label}>
              <th>{f(`results.scorecard.rows.${index}.label`, row.label)}</th>
              <td>{f(`results.scorecard.rows.${index}.goal`, row.goal)}</td>
              <td>{f(`results.scorecard.rows.${index}.april`, row.april)}</td>
              <td>{f(`results.scorecard.rows.${index}.may`, row.may)}</td>
              <td><strong>{f(`results.scorecard.rows.${index}.june`, row.june)}</strong></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </section>,

    "results-momentum": <section className="momentum-note">
      <span aria-hidden="true">★</span>
      <div>
        <h2>{f("results.momentum.heading", results.momentum.heading)}</h2>
        <p>{f("results.momentum.body", results.momentum.body)}</p>
      </div>
    </section>,
  };

  return <div className="site-shell site-shell--detail">
    <DetailHeader content={content} page="results" title={results.heading} kicker={results.eyebrow} editor={editor} />
    <main id="main-content"><ItemCanvas content={content} page="results" native={native} editor={editor} /></main>
  </div>;
}
