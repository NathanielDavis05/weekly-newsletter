import Link from "next/link";
import type { LinkContent } from "../content/types";

export function SiteMenu({
  heading,
  links,
  inverted = false,
}: {
  heading: string;
  links: LinkContent[];
  inverted?: boolean;
}) {
  return (
    <details className={`site-menu${inverted ? " site-menu--inverted" : ""}`}>
      <summary aria-label="Open site menu">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </summary>
      <nav aria-label="Newsletter navigation">
        <p>{heading}</p>
        {links.map((link) => (
          <Link key={`${link.href}-${link.label}`} href={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
    </details>
  );
}
