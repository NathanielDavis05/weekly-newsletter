import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LINKS, isLive, type Destination } from "./links";
import "./landing.css";

// Static by design: the landing page holds no dates, counts, or issue content,
// so there is nothing to fetch and nothing to revalidate. Declared explicitly
// because every other route here sets `dynamic`, and without it this page is
// the only one the build cannot classify.
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Everything the Chick-fil-A West Bryan team needs in one place — training, uniform orders, promotions, and the store scorecard.",
};

/**
 * Renders a destination as a link when it has somewhere to go, and as inert
 * markup when it does not. A tile that visibly does nothing is better than one
 * that navigates to the top of the page and looks broken.
 */
function Destination({
  to,
  className,
  children,
}: {
  to: Destination;
  className?: string;
  children: ReactNode;
}) {
  if (!isLive(to)) return <span className={className} aria-disabled="true">{children}</span>;
  if (to.external) {
    return (
      <a className={className} href={to.href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return <Link className={className} href={to.href}>{children}</Link>;
}

const icons = {
  shirt: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3 12 5.6 15 3l5 2.6-1.8 4.2-2 -.8V21H7.8V9l-2 .8L4 5.6Z" />
    </svg>
  ),
  route: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="18" r="2.6" /><circle cx="18" cy="6" r="2.6" /><path d="M8.6 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h2.4" />
    </svg>
  ),
  meal: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v7a2 2 0 0 0 4 0V3" /><path d="M8 10v11" />
      <path d="M17.5 3c-1.4 1.6-2 3.4-2 5.5 0 1.6.7 2.6 2 3V21" />
    </svg>
  ),
  paper: (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h11a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2Z" /><path d="M17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2" /><path d="M7.5 8.5h6M7.5 12h6M7.5 15.5h4" />
    </svg>
  ),
  chart: (
    <svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" /><path d="M6 20v-6M12 20V5M18 20v-9" />
    </svg>
  ),
};

export default function TeamLanding() {
  return (
    <div className="lp">
      <header className="lp-wrap">
        <div className="lp-nav">
          <span className="lp-brand">
            {/* Decorative: the wordmark beside it already names the store, so an
                alt here would just make a screen reader say it twice. */}
            <img className="lp-brand__mark" src="/images/cfa-logo.png" alt="" width={46} height={46} />
            <span className="lp-wordmark">
              <strong>Chick-fil-A</strong>
              <em>West Bryan</em>
            </span>
          </span>
          <nav className="lp-navlinks" aria-label="Team pages">
            <Destination to={LINKS.newsletter}>Newsletter</Destination>
            <Destination to={LINKS.training}>Training</Destination>
            <Destination to={LINKS.promotions}>Promotions</Destination>
            <Destination to={LINKS.scorecard}>Scorecard</Destination>
            <span className="lp-navlinks__sep" aria-hidden="true" />
            <Destination to={LINKS.restaurantInfo}>Restaurant info</Destination>
          </nav>
        </div>
      </header>

      <section className="lp-hero">
        <h1>Everything the team needs, in one place</h1>
        <p>Your training, the forms you need, and every page for the store — no logins, no searching.</p>
      </section>

      <div className="lp-quick">
        <Destination to={LINKS.uniform}>{icons.shirt}Uniform orders</Destination>
        <Destination to={LINKS.pathway}>{icons.route}Pathway</Destination>
        <Destination to={LINKS.breakMeal}>{icons.meal}Break meal policy</Destination>
      </div>

      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <h2>Find what you need</h2>
            <p className="lp-lead">Each of these has its own page that stays up to date on its own.</p>
          </div>
          <div className="lp-cards">
            <article className="lp-card">
              <div className="lp-card__panel">{icons.paper}</div>
              <div className="lp-card__body">
                <h3>Newsletter</h3>
                <p>The weekly update for the store, plus every issue that came before it.</p>
                <Destination to={LINKS.newsletter} className="lp-pill">Open the newsletter</Destination>
              </div>
            </article>

            <article className="lp-card lp-card--red">
              <div className="lp-card__panel lp-card__panel--photo">
                <img src="/images/team-meeting.png" alt="" width={600} height={300} />
              </div>
              <div className="lp-card__body">
                <h3>Training</h3>
                <p>Every assignment for your role, and the ones you have already finished.</p>
                <Destination to={LINKS.training} className="lp-pill">Go to training</Destination>
              </div>
            </article>

            <article className="lp-card">
              <div className="lp-card__panel lp-card__panel--photo">
                <img src="/images/smores-milkshake.png" alt="" width={399} height={501} style={{ objectPosition: "center 20%" }} />
              </div>
              <div className="lp-card__body">
                <h3>Promotions</h3>
                <p>Seasonal menu items, the builds for each one, and when they launch.</p>
                <Destination to={LINKS.promotions} className="lp-pill">See promotions</Destination>
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="lp-wrap">
        <section className="lp-split">
          <div className="lp-split__art lp-split__art--photo">
            <img src="/images/pos-training.png" alt="" width={734} height={418} style={{ objectPosition: "center 28%" }} />
          </div>
          <div>
            <h2>New here? Start with the basics</h2>
            <p className="lp-lead">
              Everything a new team member needs in week one — uniform and parking, how a shift runs,
              who to ask for what, and the words we use behind the counter.
            </p>
            <Destination to={LINKS.newTeamMember} className="lp-pill">Open the new team member guide</Destination>
          </div>
        </section>

        <section className="lp-split lp-split--flip">
          <div className="lp-split__art">{icons.chart}</div>
          <div>
            <h2>See how the store is doing</h2>
            <p className="lp-lead">
              Guest experience scores, the measures we track every month, and the one thing
              leadership is focused on next.
            </p>
            <Destination to={LINKS.scorecard} className="lp-pill">Open the scorecard</Destination>
          </div>
        </section>
      </div>

      <section className="lp-more">
        <div className="lp-wrap">
          <div className="lp-section-head"><h2>More for the team</h2></div>
          <div className="lp-more-grid">
            <Destination to={LINKS.timePunch}>
              <strong>Time punch correction</strong><span>Fix a missed or wrong clock-in</span>
            </Destination>
            <Destination to={LINKS.restaurantInfo}>
              <strong>Restaurant info</strong><span>Hours, address, and guest ordering</span>
            </Destination>
          </div>
        </div>
      </section>

      <footer className="lp-wrap">
        <div className="lp-foot">
          <strong>Chick-fil-A West Bryan</strong>
          <span>Bookmark this page or scan the break room code</span>
        </div>
      </footer>
    </div>
  );
}
