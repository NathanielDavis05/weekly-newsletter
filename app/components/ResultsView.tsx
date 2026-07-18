import type { NewsletterContent } from "../content/types";
import { DetailHeader } from "./DetailHeader";
import { PageBlocks } from "./PageBlocks";
import type { CanvasEditorState } from "./PageBlocks";
import { FreeformSurface } from "./FreeformSurface";

export function ResultsView({ content, editor }: { content: NewsletterContent; editor?: CanvasEditorState }) {
  const { results } = content;

  return (
    <FreeformSurface page="results" content={content} editor={editor}><div className="site-shell site-shell--detail">
      <DetailHeader content={content} page="results" title={results.heading} kicker={results.eyebrow} editor={editor} />
      <main className="detail-main" id="main-content">
        <PageBlocks content={content} page="results" native={{
          "results-intro": <section className="detail-intro detail-intro--center" aria-labelledby="results-title">
          <p className="eyebrow eyebrow--red-pill">{results.eyebrow}</p>
          <h1 id="results-title">{results.heading}</h1>
          <p className="detail-lead">{results.lead}</p>
          </section>,

          "results-summary": <section className="goal-summary" aria-label={results.summaryAria}>
          <span className="goal-summary__mark" aria-hidden="true">★</span>
          <div>
            <strong>
              {results.summaryValue} <span>{results.summaryUnit}</span>
            </strong>
            <p>{results.summaryLabel}</p>
          </div>
          </section>,

          "results-metrics": <section className="metric-list" aria-label="Headline June metrics">
          {results.headlineMetrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div>
                <h2>{metric.label}</h2>
                <p>{metric.goal}</p>
              </div>
              <div className="metric-card__score">
                <strong>{metric.value}</strong>
                <span className={metric.positive ? "status status--good" : "status status--focus"}>
                  {metric.status}
                </span>
              </div>
            </article>
          ))}
          </section>,

          "results-focus": <aside className="focus-callout">
          <p className="urgent-label">{results.focus.label}</p>
          <h2>{results.focus.heading}</h2>
          <p>{results.focus.body}</p>
          </aside>,

          "results-scorecard": <section className="detail-section" aria-labelledby="all-results-title">
          <p className="eyebrow">{results.scorecard.eyebrow}</p>
          <h2 id="all-results-title">{results.scorecard.heading}</h2>
          <div className="metrics-table-wrap">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th scope="col">{results.scorecard.headerMeasure}</th>
                  <th scope="col">{results.scorecard.headerGoal}</th>
                  <th scope="col">{results.scorecard.headerApr}</th>
                  <th scope="col">{results.scorecard.headerMay}</th>
                  <th scope="col">{results.scorecard.headerJun}</th>
                </tr>
              </thead>
              <tbody>
                {results.scorecard.rows.map((metric) => (
                  <tr key={metric.label}>
                    <th scope="row">{metric.label}</th>
                    <td>{metric.goal}</td>
                    <td>{metric.april}</td>
                    <td>{metric.may}</td>
                    <td><strong>{metric.june}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </section>,

          "results-momentum": <section className="momentum-note">
          <span aria-hidden="true">★</span>
          <div>
            <h2>{results.momentum.heading}</h2>
            <p>{results.momentum.body}</p>
          </div>
          </section>,
        }} />
      </main>
    </div></FreeformSurface>
  );
}
