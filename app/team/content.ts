/**
 * Every piece of copy on the landing page, in one place.
 *
 * The page itself (page.tsx) only lays out structure, icons, and images —
 * headings, descriptions, button labels, and the footer text all live in
 * `site-content.json`. That JSON is the single source of truth: it is also
 * what the web editor at /edit reads and writes, so a save there is the same
 * file a code edit would touch. Compare `links.ts`, which reads the same
 * JSON's `links` section.
 */
import site from "./site-content.json";

export const META = site.meta;
export const BRAND = site.brand;
export const NAV = site.nav;
export const HERO = site.hero;
export const QUICK_LINKS = site.quickLinks;
export const FIND_SECTION = site.findSection;
export const CARDS = site.cards;
export const NEW_TEAM_MEMBER = site.newTeamMember;
export const SCORECARD_SECTION = site.scorecardSection;
export const MORE_GRID = site.moreGrid;
export const FOOTER = site.footer;
