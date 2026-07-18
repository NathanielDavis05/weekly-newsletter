import type { Metadata } from "next";
import { ResultsView } from "../components/ResultsView";
import { getPublishedContent } from "../content/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "June results | CFA West Bryan",
  description: "CFA West Bryan June guest experience scorecard.",
};

export default async function ResultsPage() {
  const content = await getPublishedContent();
  return <ResultsView content={content} />;
}
