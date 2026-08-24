import type { Metadata } from 'next';
import { getEditorContent } from '../content/store';
import { requireEditorUser } from '../edit-auth';
import { Editor } from '../edit/Editor';
import '../edit/editor.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Newsletter designer',
  robots: { index: false, follow: false },
};

/**
 * `/editor` and `/edit` intentionally render the same persisted workspace.
 * This keeps the visual editor, weekly workflow, draft, and live issue in one
 * D1-backed source of truth instead of creating a second browser-only copy.
 */
export default async function NewsletterDesignerPage() {
  const user = await requireEditorUser('/editor');
  const { draft, published, revision } = await getEditorContent();
  return (
    <Editor
      initialDraft={draft}
      initialPublished={published}
      initialRevision={revision}
      userEmail={user.email}
    />
  );
}
