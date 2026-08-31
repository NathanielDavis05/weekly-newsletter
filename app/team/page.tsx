import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { LINKS, isLive, type Destination } from "./links";
import {
  META,
  BRAND,
  NAV,
  HERO,
  QUICK_LINKS,
  FIND_SECTION,
  CARDS,
  NEW_TEAM_MEMBER,
  SCORECARD_SECTION,
  MORE_GRID,
  FOOTER,
} from "./content";
import "./landing.css";

// Static by design: the landing page holds no dates, counts, or issue content,
// so there is nothing to fetch and nothing to revalidate. Declared explicitly
// because every other route here sets `dynamic`, and without it this page is
// the only one the build cannot classify.
export const dynamic = "force-static";

export const metadata: Metadata = META;

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
};

export default function TeamLanding() {
  return (
    <div className="lp">
      <header className="lp-header">
        <div className="lp-nav lp-wrap">
          <span className="lp-brand">
            {/* Decorative: the wordmark beside it already names the store, so an
                alt here would just make a screen reader say it twice. */}
            <img className="lp-brand__mark" src="/images/cfa-logo.png" alt="" width={46} height={46} />
            <span className="lp-wordmark">
              <strong>{BRAND.name}</strong>
              <em>{BRAND.location}</em>
            </span>
          </span>
          <nav className="lp-navlinks" aria-label="Team pages">
            <Destination to={LINKS.newsletter}>{NAV.newsletter}</Destination>
            <Destination to={LINKS.training}>{NAV.training}</Destination>
            <Destination to={LINKS.promotions}>{NAV.promotions}</Destination>
            <Destination to={LINKS.scorecard}>{NAV.scorecard}</Destination>
            <span className="lp-navlinks__sep" aria-hidden="true" />
            <Destination to={LINKS.restaurantInfo}>{NAV.restaurantInfo}</Destination>
            <Destination to={LINKS.newsletter} className="lp-pill">{NAV.thisWeek}</Destination>
          </nav>
        </div>
      </header>

      <section className="lp-hero">
        <p className="lp-kicker">{HERO.kicker}</p>
        <h1>{HERO.heading}</h1>
      </section>

      <div className="lp-quick">
        <Destination to={LINKS.uniform}>{icons.shirt}{QUICK_LINKS.uniform}</Destination>
        <Destination to={LINKS.pathway}>{icons.route}{QUICK_LINKS.pathway}</Destination>
        <Destination to={LINKS.breakMeal}>{icons.meal}{QUICK_LINKS.breakMeal}</Destination>
      </div>

      <section className="lp-section">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <h2>{FIND_SECTION.heading}</h2>
            <p className="lp-lead">{FIND_SECTION.lead}</p>
          </div>
          <div className="lp-cards">
            <article className="lp-card">
              <div className="lp-card__panel lp-card__panel--photo">
                <img src="/images/food-pattern-red.png" alt="" width={2400} height={1350} />
              </div>
              <div className="lp-card__body">
                <h3>{CARDS.newsletter.heading}</h3>
                <p>{CARDS.newsletter.body}</p>
                <Destination to={LINKS.newsletter} className="lp-pill">{CARDS.newsletter.cta}</Destination>
              </div>
            </article>

            <article className="lp-card lp-card--red">
              <div className="lp-card__panel lp-card__panel--photo">
                <img src="/images/team-meeting.png" alt="" width={600} height={300} />
              </div>
              <div className="lp-card__body">
                <h3>{CARDS.training.heading}</h3>
                <p>{CARDS.training.body}</p>
                <Destination to={LINKS.training} className="lp-pill">{CARDS.training.cta}</Destination>
              </div>
            </article>

            <article className="lp-card">
              <div className="lp-card__panel lp-card__panel--photo">
                <img src="/images/smores-milkshake.jpeg" alt="" width={589} height={492} style={{ objectPosition: "center 30%" }} />
              </div>
              <div className="lp-card__body">
                <h3>{CARDS.promotions.heading}</h3>
                <p>{CARDS.promotions.body}</p>
                <Destination to={LINKS.promotions} className="lp-pill">{CARDS.promotions.cta}</Destination>
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
            <h2>{NEW_TEAM_MEMBER.heading}</h2>
            <p className="lp-lead">{NEW_TEAM_MEMBER.lead}</p>
            <Destination to={LINKS.newTeamMember} className="lp-pill">{NEW_TEAM_MEMBER.cta}</Destination>
          </div>
        </section>

        <section className="lp-split lp-split--flip">
          <div className="lp-split__art lp-split__art--logo">
            <img src="/images/west-bryan-badge.jpg" alt="" width={440} height={440} />
          </div>
          <div>
            <h2>{SCORECARD_SECTION.heading}</h2>
            <p className="lp-lead">{SCORECARD_SECTION.lead}</p>
            <Destination to={LINKS.scorecard} className="lp-pill">{SCORECARD_SECTION.cta}</Destination>
          </div>
        </section>
      </div>

      <section className="lp-more">
        <div className="lp-wrap">
          <div className="lp-section-head"><h2>More for the team</h2></div>
          <div className="lp-more-grid">
            <Destination to={LINKS.timePunch}>
              <strong>{MORE_GRID.timePunch.heading}</strong><span>{MORE_GRID.timePunch.subheading}</span>
            </Destination>
            <Destination to={LINKS.hrRequest}>
              <strong>{MORE_GRID.hrRequest.heading}</strong><span>{MORE_GRID.hrRequest.subheading}</span>
            </Destination>
            <Destination to={LINKS.restaurantInfo}>
              <strong>{MORE_GRID.restaurantInfo.heading}</strong><span>{MORE_GRID.restaurantInfo.subheading}</span>
            </Destination>
          </div>
        </div>
      </section>

      <footer className="lp-wrap">
        <div className="lp-foot">
          <strong>{FOOTER.name}</strong>
          <span>{FOOTER.tagline}</span>
        </div>
      </footer>
    </div>
  );
}
