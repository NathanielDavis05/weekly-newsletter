import type { Metadata } from "next";
import { DetailHeader } from "../components/DetailHeader";

export const metadata: Metadata = {
  title: "CommercePoint training | CFA West Bryan",
  description:
    "Front of House CommercePoint Pathway training details and July 28 deadline.",
};

const trainingItems = [
  "An overview of CommercePoint and why Chick-fil-A is making the change",
  "Official training videos",
  "Time to explore the new system",
  "A guided Time Trial to practice the new workflow",
];

export default function TrainingPage() {
  return (
    <div className="site-shell site-shell--detail">
      <DetailHeader />
      <main className="detail-main" id="main-content">
        <section className="detail-intro" aria-labelledby="training-title">
          <p className="urgent-label urgent-label--pill">Action required</p>
          <h1 id="training-title">CommercePoint training</h1>
          <p className="detail-lead">
            Front of House team members: complete your assigned Pathway training
            before the new system arrives.
          </p>
        </section>

        <section className="status-list" aria-label="Training deadlines">
          <div className="status-row">
            <span className="status-token" aria-hidden="true">FOH</span>
            <div>
              <small>Who</small>
              <strong>Front of House team members</strong>
            </div>
          </div>
          <div className="status-row">
            <span className="status-token status-token--red" aria-hidden="true">28</span>
            <div>
              <small>Deadline</small>
              <strong>Complete Pathway training by <em>July 28</em></strong>
            </div>
          </div>
          <div className="status-row">
            <span className="status-token" aria-hidden="true">04</span>
            <div>
              <small>Launch</small>
              <strong>New system launches <em>August 4</em></strong>
            </div>
          </div>
        </section>

        <div className="action-block">
          <a
            className="button button--red button--full"
            href="https://www.cfahome.com/"
            target="_blank"
            rel="noreferrer"
          >
            Complete training
          </a>
          <a className="help-link" href="#leader-help">
            Need help? Ask a leader
          </a>
        </div>

        <aside className="deadline-alert">
          <p className="card-kicker">Important scheduling note</p>
          <p>
            Team members who have not completed training by July 28 will not be
            scheduled until it is complete. This helps everyone arrive prepared for
            launch day.
          </p>
        </aside>

        <section className="detail-section" aria-labelledby="training-covers-title">
          <p className="eyebrow">Inside Pathway</p>
          <h2 id="training-covers-title">What the training covers</h2>
          <ul className="check-list">
            {trainingItems.map((item) => (
              <li key={item}>
                <span aria-hidden="true">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="detail-section detail-section--soft" aria-labelledby="why-title">
          <p className="eyebrow">Why it matters</p>
          <h2 id="why-title">Same purpose, new tools</h2>
          <p>
            CommercePoint will handle orders, payments, rewards, and kitchen routing.
            The job stays familiar, but the screens, tablets, and registers will be
            different.
          </p>
          <p>
            It’s one of our biggest technology updates in recent years. Practicing
            ahead of time will help us create a smooth transition for teammates and
            guests.
          </p>
        </section>

        <section className="leader-help" id="leader-help" aria-labelledby="help-title">
          <div className="help-mark" aria-hidden="true">?</div>
          <div>
            <h2 id="help-title">Need a hand?</h2>
            <p>
              Ask the leader on duty for help finding the assignment or accessing
              your Pathway login credentials.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
