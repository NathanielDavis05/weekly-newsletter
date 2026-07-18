import { ResultsView } from "../../../components/ResultsView";
import { getDraftContent } from "../../../content/store";
import { requireEditorUser } from "../../../edit-auth";

export const dynamic = "force-dynamic";

export default async function ResultsPreview() {
  await requireEditorUser("/edit");
  const content = await getDraftContent();
  return <ResultsView content={content} />;
}
