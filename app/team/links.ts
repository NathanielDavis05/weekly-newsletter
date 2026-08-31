/**
 * Every outbound destination on the landing page, in one place.
 *
 * The URLs themselves live in `site-content.json`'s `links` section — that
 * JSON is what the web editor at /edit reads and writes, so a save there
 * updates the same values a code edit would. This file just wraps them as
 * `Destination`s and adds the `external` flag the markup needs for rel/target.
 *
 * `PENDING` marks a destination that has not been decided yet. The page renders
 * those as disabled rather than as links that go nowhere, so a half-wired page
 * is honest about which doors are not open yet instead of failing silently in
 * the break room.
 */
import site from "./site-content.json";

export const PENDING = "" as const;

export interface Destination {
  href: string;
  /** True when the link leaves the site, so the markup can set rel/target. */
  external?: boolean;
}

const d = (href: string, external = false): Destination => ({ href, external });

export const LINKS = {
  newsletter: d(site.links.newsletter, true),
  training: d(site.links.training, true),
  promotions: d(site.links.promotions, true),
  scorecard: d(site.links.scorecard, true),

  /** The three most-reached-for links, surfaced as cards over the hero. */
  uniform: d(site.links.uniform, true),
  pathway: d(site.links.pathway, true),
  breakMeal: d(site.links.breakMeal, true),

  timePunch: d(site.links.timePunch, true),
  hrRequest: d(site.links.hrRequest, true),
  restaurantInfo: d(site.links.restaurantInfo, true),

  /** Renders inert until the editor gives it a real URL. */
  newTeamMember: d(site.links.newTeamMember),
} satisfies Record<string, Destination>;

/** A destination is live once it has somewhere to point. */
export const isLive = (destination: Destination): boolean => destination.href !== PENDING;

/** Count of destinations still waiting on a real URL. */
export const pendingCount = (): number =>
  Object.values(LINKS).filter((destination) => !isLive(destination)).length;
