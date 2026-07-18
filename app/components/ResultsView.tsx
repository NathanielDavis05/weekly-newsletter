import type { NewsletterContent } from "../content/types";
import { DetailHeader } from "./DetailHeader";
import { ItemCanvas, type CanvasEditorState } from "./ItemCanvas";

export function ResultsView({ content, editor }: { content: NewsletterContent; editor?: CanvasEditorState }) {
  const { results } = content;
  const metric = (index: number) => { const value = results.headlineMetrics[index]; return value ? <article className="metric-card"><div><h2>{value.label}</h2><p>{value.goal}</p></div><div className="metric-card__score"><strong>{value.value}</strong><span className={value.positive ? "status status--good" : "status status--focus"}>{value.status}</span></div></article> : null; };
  const native = {
    "results-intro": <section className="detail-intro detail-intro--center"><p className="eyebrow eyebrow--red-pill">{results.eyebrow}</p><h1>{results.heading}</h1><p className="detail-lead">{results.lead}</p></section>,
    "results-summary": <section className="goal-summary" aria-label={results.summaryAria}><span className="goal-summary__mark" aria-hidden="true">★</span><div><strong>{results.summaryValue} <span>{results.summaryUnit}</span></strong><p>{results.summaryLabel}</p></div></section>,
    "results-metric-0": metric(0), "results-metric-1": metric(1), "results-metric-2": metric(2),
    "results-focus": <aside className="focus-callout"><p className="urgent-label">{results.focus.label}</p><h2>{results.focus.heading}</h2><p>{results.focus.body}</p></aside>,
    "results-scorecard": <section className="detail-section"><p className="eyebrow">{results.scorecard.eyebrow}</p><h2>{results.scorecard.heading}</h2><div className="metrics-table-wrap"><table className="metrics-table"><thead><tr><th>{results.scorecard.headerMeasure}</th><th>{results.scorecard.headerGoal}</th><th>{results.scorecard.headerApr}</th><th>{results.scorecard.headerMay}</th><th>{results.scorecard.headerJun}</th></tr></thead><tbody>{results.scorecard.rows.map((row) => <tr key={row.label}><th>{row.label}</th><td>{row.goal}</td><td>{row.april}</td><td>{row.may}</td><td><strong>{row.june}</strong></td></tr>)}</tbody></table></div></section>,
    "results-momentum": <section className="momentum-note"><span aria-hidden="true">★</span><div><h2>{results.momentum.heading}</h2><p>{results.momentum.body}</p></div></section>,
  };
  return <div className="site-shell site-shell--detail"><DetailHeader content={content} page="results" title={results.heading} kicker={results.eyebrow} editor={editor} /><main id="main-content"><ItemCanvas content={content} page="results" native={native} editor={editor} /></main></div>;
}
