import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HomeView } from "../../components/HomeView";
import { getIssue } from "../../content/issues";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ issueKey: string }> }): Promise<Metadata> {
  const { issueKey } = await params;
  const issue = await getIssue(issueKey);
  if (!issue) return {};
  return {
    // The root layout's title template already appends "| CFA West Bryan".
    title: issue.title,
    // Archived issues are a courtesy for the team, not content worth indexing
    // or surfacing above the current live newsletter.
    robots: { index: false, follow: false },
  };
}

export default async function ArchiveIssuePage({ params }: { params: Promise<{ issueKey: string }> }) {
  const { issueKey } = await params;
  const issue = await getIssue(issueKey);
  if (!issue) notFound();

  return (
    <>
      <div className="archive-banner">
        <span>Viewing an archived issue — {issue.title}</span>
        <Link href="/archive">Back to past issues</Link>
      </div>
      <HomeView content={issue.content} archived />
    </>
  );
}
