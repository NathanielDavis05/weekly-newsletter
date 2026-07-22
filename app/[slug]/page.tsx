import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomPageView } from "../components/CustomPageView";
import { getPublishedContent } from "../content/store";
import { visualDocument } from "../content/visual";

export const dynamic = "force-dynamic";

// Static routes (app/training, app/results, app/edit, app/api, ...) are matched
// by Next.js before this dynamic segment, so a custom page can never shadow one
// — page creation additionally avoids those slugs (see RESERVED_SLUGS in
// app/content/visual.ts) purely so authors don't get a confusing collision.

async function findPage(slug: string) {
  const content = await getPublishedContent();
  const doc = visualDocument(content);
  const meta = doc.customPages.find((page) => page.slug === slug);
  return meta ? { content, meta } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const found = await findPage(slug);
  if (!found) return {};
  return { title: `${found.meta.title} | CFA West Bryan` };
}

export default async function CustomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const found = await findPage(slug);
  if (!found) notFound();
  return <CustomPageView content={found.content} page={found.meta.id} title={found.meta.title} />;
}
