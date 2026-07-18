import { HomeView } from "./components/HomeView";
import { getPublishedContent } from "./content/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await getPublishedContent();
  return <HomeView content={content} />;
}
