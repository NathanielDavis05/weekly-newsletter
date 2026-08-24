import type { Metadata } from 'next';
import { getEditorContent } from '../content/store';
import { requireEditorUser } from '../edit-auth';
import { DesignerApp } from './DesignerApp';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Newsletter designer',
  robots: { index: false, follow: false },
};

/**
 * The designer is protected by the same allowlisted ChatGPT sign-in used by
 * the existing editorial workspace at /edit.
 */
export default async function NewsletterDesignerPage() {
  await requireEditorUser('/editor');
  const { published } = await getEditorContent();
  return <DesignerApp liveContent={published} />;
}
