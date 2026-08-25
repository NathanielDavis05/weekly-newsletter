/**
 * Every outbound destination on the landing page, in one place.
 *
 * The page itself carries no dates, counts, or issue content — it is a
 * permanent directory, so the only thing that ever needs editing is this file.
 *
 * `PENDING` marks a destination that has not been decided yet. The page renders
 * those as disabled rather than as links that go nowhere, so a half-wired page
 * is honest about which doors are not open yet instead of failing silently in
 * the break room.
 */

export const PENDING = "" as const;

export interface Destination {
  href: string;
  /** True when the link leaves the site, so the markup can set rel/target. */
  external?: boolean;
}

const d = (href: string, external = false): Destination => ({ href, external });

/**
 * The newsletter and its inner pages (training, promotions, results) are all
 * routes of the newsletter app, which lives on its own subdomain. They are
 * absolute URLs rather than local paths because this landing page is the only
 * thing served from the apex domain.
 */
const NEWSLETTER = "https://newsletter.cfawestbryan.com";

export const LINKS = {
  newsletter: d(NEWSLETTER, true),
  training: d(`${NEWSLETTER}/training`, true),
  promotions: d(`${NEWSLETTER}/promotion`, true),
  scorecard: d(`${NEWSLETTER}/results`, true),

  /** The three most-reached-for links, surfaced as cards over the hero. */
  uniform: d(
    "https://docs.google.com/forms/d/e/1FAIpQLSf1iJwRX9I0qjrrLWZOGeYivFIblE12tM9DOyqbn3k1R0JcVg/viewform",
    true,
  ),
  pathway: d("https://www.pathway.cfahome.com/plans/my-plans", true),
  breakMeal: d("https://drive.google.com/file/d/12fH6Ian9jJa4Z7Ae9_DVEoZDCBbC_1Jh/view", true),

  timePunch: d(
    "https://docs.google.com/forms/d/e/1FAIpQLSchwdEPUWnWsvMjBFdAFDQD0gqng8GsYpFMMOj5ihC7-cCJ1g/viewform",
    true,
  ),
  restaurantInfo: d("https://www.chick-fil-a.com/locations/tx/west-bryan", true),

  /** Still needs a page built — renders inert until it has one. */
  newTeamMember: d(PENDING),
} satisfies Record<string, Destination>;

/** A destination is live once it has somewhere to point. */
export const isLive = (destination: Destination): boolean => destination.href !== PENDING;

/** Count of destinations still waiting on a real URL. */
export const pendingCount = (): number =>
  Object.values(LINKS).filter((destination) => !isLive(destination)).length;
