import type { Metadata } from "next";
import { DetailHeader } from "../components/DetailHeader";

export const metadata: Metadata = {
  title: "June results | CFA West Bryan",
  description: "CFA West Bryan June guest experience scorecard.",
};

const headlineMetrics = [
  {
    label: "Overall satisfaction",
    value: "84%",
    goal: "Goal 83%",
    status: "On track",
    positive: true,
  },
  {
    label: "Taste of food",
    value: "86%",
    goal: "Goal 83%",
    status: "On track",
    positive: true,
  },
  {
    label: "Speed of service",
    value: "3:10",
    goal: "Goal 3:08",
    status: "Needs focus",
    positive: false,
  },
];

const allMetrics = [
  { label: "Overall satisfaction", april: "85%", may: "84%", june: "84%", goal: "83%" },
  { label: "Taste of food", april: "84%", may: "84%", june: "86%", goal: "83%" },
  { label: "Speed of service CEM", april: "78%", may: "77%", june: "79%", goal: "78%" },
  { label: "Speed of service time", april: "3:12", may: "3:10", june: "3:10", goal: "3:08" },
  { label: "Attentive / friendly", april: "83%", may: "86%", june: "84%", goal: "84%" },
  { label: "Order accuracy", april: "97%", may: "96%", june: "97%", goal: "96%" },
];

export default function ResultsPage() {
  return (
    <div className="site-shell site-shell--detail">
      <DetailHeader />
      <main className="detail-main" id="main-content">
        <section className="detail-intro detail-intro--center" aria-labelledby="results-title">
          <p className="eyebrow eyebrow--red-pill">June scorecard</p>
          <h1 id="results-title">Guest experience</h1>
          <p className="detail-lead">
            The team hit nearly every target. Now let’s turn one focus area into our
            next win.
          </p>
        </section>

        <section className="goal-summary" aria-label="Five of six goals met">
          <span className="goal-summary__mark" aria-hidden="true">★</span>
          <div>
            <strong>5 <span>of 6</span></strong>
            <p>goals met</p>
          </div>
        </section>

        <section className="metric-list" aria-label="Headline June metrics">
          {headlineMetrics.map((metric) => (
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
        </section>

        <aside className="focus-callout">
          <p className="urgent-label">This month’s focus</p>
          <h2>Win back two seconds</h2>
          <p>
            Keep handoffs clear, stay ready for the next order, and ask for support
            before a rush becomes a bottleneck.
          </p>
        </aside>

        <section className="detail-section" aria-labelledby="all-results-title">
          <p className="eyebrow">The full picture</p>
          <h2 id="all-results-title">Three-month scorecard</h2>
          <div className="metrics-table-wrap">
            <table className="metrics-table">
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Goal</th>
                  <th scope="col">Apr</th>
                  <th scope="col">May</th>
                  <th scope="col">Jun</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics.map((metric) => (
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
        </section>

        <section className="momentum-note">
          <span aria-hidden="true">★</span>
          <div>
            <h2>Great work, team.</h2>
            <p>Five goals met is worth celebrating. Let’s keep the momentum going.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
