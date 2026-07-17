import Link from "next/link";
import { SiteMenu } from "./components/SiteMenu";

const events = [
  { date: "Jul 12–16", name: "TAMU Tennis Camp" },
  { date: "Jul 12–17", name: "TEEX Industrial Fire School" },
  { date: "Jul 14–17", name: "New Student Conference (NSC)" },
  { date: "Jul 14", name: "Cow Appreciation Day", featured: true },
  {
    date: "Jul 15–20",
    name: "Prime: Alliance Fastpitch Southern Championship",
  },
  {
    date: "Jul 16–18",
    name: "NXTPro Puma National Championship — Basketball",
  },
  { date: "Jul 18", name: "State 4-H Horse Show" },
];

export default function Home() {
  return (
    <div className="site-shell">
      <header className="home-hero">
        <div className="hero-topline">
          <Link className="brand-lockup brand-lockup--light" href="/">
            <span>CFA West Bryan</span>
            <small>Team newsletter</small>
          </Link>
          <SiteMenu inverted />
        </div>

        <div className="hero-copy">
          <p className="hero-kicker">Team update · July 10, 2026</p>
          <h1>Your week, made simple.</h1>
        </div>
      </header>

      <main id="main-content">
        <section className="section section--overview" aria-labelledby="overview-title">
          <p className="eyebrow">Week of July 12</p>
          <h2 id="overview-title">This week, at a glance</h2>
          <p className="section-intro">
            Three quick things to know before your next shift.
          </p>

          <div className="priority-stack">
            <article className="card priority-card priority-card--action">
              <div className="card-icon card-icon--red" aria-hidden="true">
                CP
              </div>
              <div className="card-body">
                <p className="urgent-label">Action required</p>
                <h3>CommercePoint training</h3>
                <p>Front of House · Pathway due <strong>July 28</strong></p>
                <p className="micro-copy">New system launches August 4</p>
                <Link className="text-link text-link--arrow" href="/training">
                  View training steps <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <Link className="card priority-card priority-card--link" href="#events">
              <span className="card-icon card-icon--date" aria-hidden="true">
                14
              </span>
              <span className="card-body">
                <span className="card-kicker">Tuesday</span>
                <strong>Cow Appreciation Day</strong>
                <span className="deadline-copy">July 14</span>
              </span>
              <span className="card-arrow" aria-hidden="true">→</span>
            </Link>

            <Link
              className="card priority-card priority-card--link"
              href="#recognition"
            >
              <span className="card-icon card-icon--gold" aria-hidden="true">
                ★
              </span>
              <span className="card-body">
                <span className="card-kicker">Customer shout-out</span>
                <strong>Celebrate Catye &amp; Richie</strong>
                <span>Recognized in guest surveys</span>
              </span>
              <span className="card-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="section" aria-labelledby="results-teaser-title">
          <div className="score-teaser">
            <div>
              <p className="eyebrow eyebrow--green">June scorecard</p>
              <h2 id="results-teaser-title">Guest experience</h2>
              <p>Strong month, with one clear focus for the team.</p>
            </div>
            <div className="score-teaser__result" aria-label="5 of 6 goals met">
              <strong>5 <span>of 6</span></strong>
              <small>goals met</small>
            </div>
            <div className="score-teaser__focus">
              <span>Needs focus</span>
              <strong>Speed of service · 3:10</strong>
            </div>
            <Link className="button button--navy" href="/results">
              View June results
            </Link>
          </div>
        </section>

        <section
          className="section section--recognition"
          id="recognition"
          aria-labelledby="recognition-title"
        >
          <p className="eyebrow eyebrow--gold">People make the place</p>
          <h2 id="recognition-title">Worth celebrating</h2>

          <div className="recognition-feature">
            <span className="recognition-star" aria-hidden="true">★</span>
            <div>
              <h3>Way to go, Catye &amp; Richie!</h3>
              <p>
                Guests called out your great work in their surveys. Thank you for
                making people feel cared for.
              </p>
            </div>
          </div>

          <div className="recognition-grid">
            <article className="mini-card">
              <p className="card-kicker">Birthday</p>
              <h3>Aubri G.</h3>
              <p>July 14</p>
            </article>
            <article className="mini-card">
              <p className="card-kicker">Work anniversaries</p>
              <h3>Ava G. · July 9</h3>
              <p>1 year at CFA</p>
              <hr />
              <h3>Harper O. · July 17</h3>
              <p>1 year at CFA</p>
            </article>
          </div>
        </section>

        <section className="section" id="events" aria-labelledby="events-title">
          <p className="eyebrow">Plan ahead</p>
          <h2 id="events-title">What’s happening nearby</h2>
          <p className="section-intro">
            Local events may bring extra traffic. Arrive ready and take care of one
            another.
          </p>

          <div className="event-list">
            {events.map((event) => (
              <div
                className={`event-row${event.featured ? " event-row--featured" : ""}`}
                key={`${event.date}-${event.name}`}
              >
                <time>{event.date}</time>
                <span>{event.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section section--grow" id="grow" aria-labelledby="grow-title">
          <div className="grow-card">
            <p className="eyebrow eyebrow--light">Grow with us</p>
            <h2 id="grow-title">Interested in leadership?</h2>
            <p>
              Review the role and hour requirements, share your questions, and start
              a conversation with the leadership team.
            </p>
            <a
              className="button button--cream"
              href="https://docs.google.com/forms/d/e/1FAIpQLScDaXKd52Bv2AMbXEJlszaiRcpihAoWcsJ9ZKbgN7MfJUx2bw/viewform"
              target="_blank"
              rel="noreferrer"
            >
              View interest form
            </a>
          </div>
          <p className="referral-note">
            <strong>Referral bonus opportunity:</strong> Know someone who would be a
            great fit? Ask a leader for current details.
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <strong>CFA West Bryan</strong>
        <span>Team newsletter · July 10, 2026</span>
      </footer>
    </div>
  );
}
