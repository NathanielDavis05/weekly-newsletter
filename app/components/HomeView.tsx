import Link from "next/link";
import { Fragment } from "react";
import type { NewsletterContent } from "../content/types";
import { visualDocument } from "../content/visual";
import { ItemCanvas, type CanvasEditorState } from "./ItemCanvas";
import { ReaderSignin } from "./ReaderSignin";
import { RichField } from "./RichField";
import { SiteHero } from "./SiteHero";

export function HomeView({ content, editor, archived }: { content: NewsletterContent; editor?: CanvasEditorState; archived?: boolean }) {
  const { home } = content;
  const scorecard = content.shared.scorecard;
  // Formatting overrides for the fixed copy, keyed by content path.
  const overrides = visualDocument(content).richOverrides;
  /** A formattable field. Inline by default so surrounding markup is untouched. */
  const f = (path: string, value: string, block?: boolean) => (
    <RichField path={path} value={value} overrides={overrides} editor={editor} block={block} />
  );

  const native = {
    "home-overview-intro": <section className="section section--overview">
      <p className="eyebrow">{f("home.overview.eyebrow", home.overview.eyebrow)}</p>
      <h2>{f("home.overview.heading", home.overview.heading)}</h2>
      <p className="section-intro">{f("home.overview.intro", home.overview.intro)}</p>
    </section>,

    "home-action": <article className="card priority-card priority-card--action">
      <div className="card-icon card-icon--red" aria-hidden="true">{home.overview.actionCard.icon}</div>
      <div className="card-body">
        <p className="urgent-label">{f("home.overview.actionCard.label", home.overview.actionCard.label)}</p>
        <h3>{f("home.overview.actionCard.heading", home.overview.actionCard.heading)}</h3>
        <p>
          {f("home.overview.actionCard.bodyPrefix", home.overview.actionCard.bodyPrefix)}
          <strong>{f("home.overview.actionCard.bodyEmphasis", home.overview.actionCard.bodyEmphasis)}</strong>
        </p>
        <p className="micro-copy">{f("home.overview.actionCard.micro", home.overview.actionCard.micro)}</p>
        <Link className="text-link text-link--arrow" href={home.overview.actionCard.linkHref}>
          {f("home.overview.actionCard.linkLabel", home.overview.actionCard.linkLabel)} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>,

    "home-event": <Link className="card priority-card priority-card--link" href={home.overview.eventCard.href}>
      <span className="card-icon card-icon--date" aria-hidden="true">{home.overview.eventCard.icon}</span>
      <span className="card-body">
        <span className="card-kicker">{f("home.overview.eventCard.kicker", home.overview.eventCard.kicker)}</span>
        <strong>{f("home.overview.eventCard.title", home.overview.eventCard.title)}</strong>
        <span className="deadline-copy">{f("home.overview.eventCard.detail", home.overview.eventCard.detail)}</span>
      </span>
      <span className="card-arrow" aria-hidden="true">→</span>
    </Link>,

    "home-recognition-link": <Link className="card priority-card priority-card--link" href={home.overview.recognitionCard.href}>
      <span className="card-icon card-icon--gold" aria-hidden="true">{home.overview.recognitionCard.icon}</span>
      <span className="card-body">
        <span className="card-kicker">{f("home.overview.recognitionCard.kicker", home.overview.recognitionCard.kicker)}</span>
        <strong>{f("home.overview.recognitionCard.title", home.overview.recognitionCard.title)}</strong>
        <span>{f("home.overview.recognitionCard.detail", home.overview.recognitionCard.detail)}</span>
      </span>
      <span className="card-arrow" aria-hidden="true">→</span>
    </Link>,

    "home-scorecard": <section className="score-teaser">
      <div>
        <p className="eyebrow eyebrow--green">{f("shared.scorecard.eyebrow", scorecard.eyebrow)}</p>
        <h2>{f("shared.scorecard.heading", scorecard.heading)}</h2>
        <p>{f("shared.scorecard.intro", scorecard.intro)}</p>
      </div>
      <div className="score-teaser__result" aria-label={scorecard.resultAria}>
        <strong>{f("shared.scorecard.resultValue", scorecard.resultValue)} <span className="unit">{f("shared.scorecard.resultUnit", scorecard.resultUnit)}</span></strong>
        <small>{f("shared.scorecard.resultLabel", scorecard.resultLabel)}</small>
      </div>
      <div className="score-teaser__focus">
        <span>{f("shared.scorecard.focusLabel", scorecard.focusLabel)}</span>
        <strong>{f("shared.scorecard.focusValue", scorecard.focusValue)}</strong>
      </div>
      <Link className="button button--navy" href={scorecard.buttonHref}>{f("shared.scorecard.buttonLabel", scorecard.buttonLabel)}</Link>
    </section>,

    "home-recognition-heading": <section id="recognition">
      <p className="eyebrow eyebrow--gold">{f("home.recognition.eyebrow", home.recognition.eyebrow)}</p>
      <h2>{f("home.recognition.heading", home.recognition.heading)}</h2>
    </section>,

    "home-recognition-feature": <section className="recognition-feature">
      <span className="recognition-star" aria-hidden="true">★</span>
      <div>
        <h3>{f("home.recognition.feature.heading", home.recognition.feature.heading)}</h3>
        <p>{f("home.recognition.feature.body", home.recognition.feature.body)}</p>
      </div>
    </section>,

    "home-birthday": <article className="mini-card">
      <p className="card-kicker">{f("home.recognition.birthday.kicker", home.recognition.birthday.kicker)}</p>
      <h3>{f("home.recognition.birthday.name", home.recognition.birthday.name)}</h3>
      <p>{f("home.recognition.birthday.date", home.recognition.birthday.date)}</p>
    </article>,

    "home-anniversaries": <article className="mini-card">
      <p className="card-kicker">{f("home.recognition.anniversaries.kicker", home.recognition.anniversaries.kicker)}</p>
      {home.recognition.anniversaries.entries.map((entry, index) => <Fragment key={index}>
        {index > 0 ? <hr /> : null}
        <h3>{f(`home.recognition.anniversaries.entries.${index}.name`, entry.name)}</h3>
        <p>{f(`home.recognition.anniversaries.entries.${index}.detail`, entry.detail)}</p>
      </Fragment>)}
    </article>,

    "home-events": <section id="events">
      <p className="eyebrow">{f("home.events.eyebrow", home.events.eyebrow)}</p>
      <h2>{f("home.events.heading", home.events.heading)}</h2>
      <p className="section-intro">{f("home.events.intro", home.events.intro)}</p>
      <div className="event-list">
        {home.events.items.map((event, index) => <div className={`event-row${event.featured ? " event-row--featured" : ""}`} key={index}>
          <time>{f(`home.events.items.${index}.date`, event.date)}</time>
          <span>{f(`home.events.items.${index}.name`, event.name)}</span>
        </div>)}
      </div>
    </section>,

    "home-grow": <section id="grow">
      <div className="grow-card">
        <p className="eyebrow eyebrow--light">{f("home.grow.eyebrow", home.grow.eyebrow)}</p>
        <h2>{f("home.grow.heading", home.grow.heading)}</h2>
        <p>{f("home.grow.body", home.grow.body)}</p>
        <a className="button button--cream" href={home.grow.buttonHref} target="_blank" rel="noreferrer">{f("home.grow.buttonLabel", home.grow.buttonLabel)}</a>
      </div>
      <p className="referral-note">
        <strong>{f("home.grow.referralStrong", home.grow.referralStrong)}</strong> {f("home.grow.referralRest", home.grow.referralRest)}
      </p>
    </section>,

    "home-footer": <footer className="site-footer">
      <strong>{f("home.footer.brand", home.footer.brand)}</strong>
      <span>{f("home.footer.line", home.footer.line)}</span>
    </footer>,

    // Omitted entirely when viewing an archived issue: signing into a past
    // week's newsletter would be meaningless, and ItemCanvas skips a row
    // whose native entry is undefined.
    "home-signin": archived ? undefined : <ReaderSignin
      editing={Boolean(editor)}
      eyebrow={f("home.signin.eyebrow", home.signin.eyebrow)}
      heading={f("home.signin.heading", home.signin.heading)}
      lead={f("home.signin.lead", home.signin.lead)}
      buttonLabel={f("home.signin.buttonLabel", home.signin.buttonLabel)}
      doneHeading={f("home.signin.doneHeading", home.signin.doneHeading)}
      doneBody={f("home.signin.doneBody", home.signin.doneBody)}
    />,
  };

  return <div className="site-shell">
    <SiteHero page="home" content={content} title={home.hero.headline} kicker={home.hero.kicker} editor={editor} />
    <main id="main-content"><ItemCanvas content={content} page="home" native={native} editor={editor} /></main>
  </div>;
}
