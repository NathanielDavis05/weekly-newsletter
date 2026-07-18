import { TrainingView } from "../../../components/TrainingView";
import { getDraftContent } from "../../../content/store";
import { requireEditorUser } from "../../../edit-auth";

export const dynamic = "force-dynamic";

export default async function TrainingPreview() {
  await requireEditorUser("/edit");
  const content = await getDraftContent();
  return <TrainingView content={content} />;
}
