import type { Metadata } from "next";
import { TrainingView } from "../components/TrainingView";
import { getPublishedContent } from "../content/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "CommercePoint training | CFA West Bryan",
  description:
    "Front of House CommercePoint Pathway training details and July 28 deadline.",
};

export default async function TrainingPage() {
  const content = await getPublishedContent();
  return <TrainingView content={content} />;
}
