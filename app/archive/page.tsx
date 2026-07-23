import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedContent } from "../content/store";
import { listIssues } from "../content/issues";

export const dynamic = "force-dynamic";

// The root layout's title template already appends "| CFA West Bryan".
export const metadata: Metadata = {
  title: "Past issues",
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default async function ArchivePage() {
  const [content, issues] = await Promise.all([getPublishedContent(), listIssues()]);

  return (
    <div className="site-shell site-shell--detail">
      <header className="detail-header">
        <Link className="back-link" href="/"><span aria-hidden="true">←</span> {content.shared.detailBackLabel}</Link>
        <Link className="detail-brand" href="/">{content.shared.brandName}</Link>
      </header>
      <main className="detail-main" id="main-content">
        <div className="detail-intro">
          <h1>Past issues</h1>
          <p className="detail-lead">Every previous week&rsquo;s newsletter, exactly as it was published.</p>
        </div>
        {issues.length ? (
          <ul className="archive-list">
            {issues.map((issue) => (
              <li key={issue.issueKey}>
                <Link className="archive-row" href={`/archive/${issue.issueKey}`}>
                  <span>
                    <span className="archive-row__title">{issue.title}</span>
                    <span className="archive-row__meta">Published {formatDate(issue.publishedAt)}</span>
                  </span>
                  <span className="archive-row__arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="section-intro">Nothing published yet — the archive fills in as issues go live.</p>
        )}
      </main>
    </div>
  );
}
