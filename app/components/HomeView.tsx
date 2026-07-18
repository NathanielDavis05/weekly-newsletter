import Link from "next/link";
import { Fragment } from "react";
import type { CSSProperties } from "react";
import type { NewsletterContent } from "../content/types";
import { SiteMenu } from "./SiteMenu";

export function HomeView({ content }: { content: NewsletterContent }) {
  const { shared, home } = content;
  const heroStyle: CSSProperties | undefined = home.heroImage
    ? ({ "--hero-image": `url("${home.heroImage}")` } as CSSProperties)
    : undefined;

  return (
    <div className="site-shell">
      <header className="home-hero" style={heroStyle}>
        <div className="hero-topline">
          <Link className="brand-lockup brand-lockup--light" href="/">
            <span>{shared.brandName}</span>
            <small>{shared.brandTagline}</small>
          </Link>
          <SiteMenu heading={shared.navHeading} links={shared.navLinks} inverted />
        </div>

        <div className="hero-copy">
          <p className="hero-kicker">{home.hero.kicker}</p>
          <h1>{home.hero.headline}</h1>
        </div>
      </header>

      <main id="main-content">
        <section className="section section--overview" aria-labelledby="overview-title">
          <p className="eyebrow">{home.overview.eyebrow}</p>
          <h2 id="overview-title">{home.overview.heading}</h2>
          <p className="section-intro">{home.overview.intro}</p>

          <div className="priority-stack">
            <article className="card priority-card priority-card--action">
              <div className="card-icon card-icon--red" aria-hidden="true">
                {home.overview.actionCard.icon}
              </div>
              <div className="card-body">
                <p className="urgent-label">{home.overview.actionCard.label}</p>
                <h3>{home.overview.actionCard.heading}</h3>
                <p>
                  {home.overview.actionCard.bodyPrefix}
                  <strong>{home.overview.actionCard.bodyEmphasis}</strong>
                </p>
                <p className="micro-copy">{home.overview.actionCard.micro}</p>
                <Link className="text-link text-link--arrow" href={home.overview.actionCard.linkHref}>
                  {home.overview.actionCard.linkLabel} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            <Link className="card priority-card priority-card--link" href={home.overview.eventCard.href}>
              <span className="card-icon card-icon--date" aria-hidden="true">
                {home.overview.eventCard.icon}
              </span>
              <span className="card-body">
                <span className="card-kicker">{home.overview.eventCard.kicker}</span>
                <strong>{home.overview.eventCard.title}</strong>
                <span className="deadline-copy">{home.overview.eventCard.detail}</span>
              </span>
              <span className="card-arrow" aria-hidden="true">→</span>
            </Link>

            <Link
              className="card priority-card priority-card--link"
              href={home.overview.recognitionCard.href}
            >
              <span className="card-icon card-icon--gold" aria-hidden="true">
                {home.overview.recognitionCard.icon}
              </span>
              <span className="card-body">
                <span className="card-kicker">{home.overview.recognitionCard.kicker}</span>
                <strong>{home.overview.recognitionCard.title}</strong>
                <span>{home.overview.recognitionCard.detail}</span>
              </span>
              <span className="card-arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className="section" aria-labelledby="results-teaser-title">
          <div className="score-teaser">
            <div>
              <p className="eyebrow eyebrow--green">{home.scorecard.eyebrow}</p>
              <h2 id="results-teaser-title">{home.scorecard.heading}</h2>
              <p>{home.scorecard.intro}</p>
            </div>
            <div className="score-teaser__result" aria-label={home.scorecard.resultAria}>
              <strong>
                {home.scorecard.resultValue} <span>{home.scorecard.resultUnit}</span>
              </strong>
              <small>{home.scorecard.resultLabel}</small>
            </div>
            <div className="score-teaser__focus">
              <span>{home.scorecard.focusLabel}</span>
              <strong>{home.scorecard.focusValue}</strong>
            </div>
            <Link className="button button--navy" href={home.scorecard.buttonHref}>
              {home.scorecard.buttonLabel}
            </Link>
          </div>
        </section>

        <section
          className="section section--recognition"
          id="recognition"
          aria-labelledby="recognition-title"
        >
          <p className="eyebrow eyebrow--gold">{home.recognition.eyebrow}</p>
          <h2 id="recognition-title">{home.recognition.heading}</h2>

          <div className="recognition-feature">
            <span className="recognition-star" aria-hidden="true">★</span>
            <div>
              <h3>{home.recognition.feature.heading}</h3>
              <p>{home.recognition.feature.body}</p>
            </div>
          </div>

          <div className="recognition-grid">
            <article className="mini-card">
              <p className="card-kicker">{home.recognition.birthday.kicker}</p>
              <h3>{home.recognition.birthday.name}</h3>
              <p>{home.recognition.birthday.date}</p>
            </article>
            <article className="mini-card">
              <p className="card-kicker">{home.recognition.anniversaries.kicker}</p>
              {home.recognition.anniversaries.entries.map((entry, index) => (
                <Fragment key={`${entry.name}-${index}`}>
                  {index > 0 ? <hr /> : null}
                  <h3>{entry.name}</h3>
                  <p>{entry.detail}</p>
                </Fragment>
              ))}
            </article>
          </div>
        </section>

        <section className="section" id="events" aria-labelledby="events-title">
          <p className="eyebrow">{home.events.eyebrow}</p>
          <h2 id="events-title">{home.events.heading}</h2>
          <p className="section-intro">{home.events.intro}</p>

          <div className="event-list">
            {home.events.items.map((event) => (
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
            <p className="eyebrow eyebrow--light">{home.grow.eyebrow}</p>
            <h2 id="grow-title">{home.grow.heading}</h2>
            <p>{home.grow.body}</p>
            <a
              className="button button--cream"
              href={home.grow.buttonHref}
              target="_blank"
              rel="noreferrer"
            >
              {home.grow.buttonLabel}
            </a>
          </div>
          <p className="referral-note">
            <strong>{home.grow.referralStrong}</strong> {home.grow.referralRest}
          </p>
        </section>
      </main>

      <footer className="site-footer">
        <strong>{home.footer.brand}</strong>
        <span>{home.footer.line}</span>
      </footer>
    </div>
  );
}
