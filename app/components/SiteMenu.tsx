import Link from "next/link";

export function SiteMenu({ inverted = false }: { inverted?: boolean }) {
  return (
    <details className={`site-menu${inverted ? " site-menu--inverted" : ""}`}>
      <summary aria-label="Open site menu">
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </summary>
      <nav aria-label="Newsletter navigation">
        <p>Explore this week</p>
        <Link href="/">Home</Link>
        <Link href="/training">Action required</Link>
        <Link href="/results">Results</Link>
        <Link href="/#events">Events</Link>
        <Link href="/#recognition">Recognition</Link>
        <Link href="/#grow">Grow with us</Link>
      </nav>
    </details>
  );
}
