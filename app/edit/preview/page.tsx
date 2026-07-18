import { HomeView } from "../../components/HomeView";
import { getDraftContent } from "../../content/store";
import { requireEditorUser } from "../../edit-auth";

export const dynamic = "force-dynamic";

export default async function HomePreview() {
  await requireEditorUser("/edit");
  const content = await getDraftContent();
  return <HomeView content={content} />;
}
