import { cloneSubtree, deepClone, instantiate, newId, subtreeIds } from '../../model/blueprint';
import { def } from '../../model/registry';
import type { Blueprint } from '../../model/blueprint';
import type { PageSeo } from '../../model/types';
import { getDoc, mutate } from '../docStore';
import { useEditor } from '../editorStore';

export function slugify(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s ? `/${s}` : '/page';
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function addPage(name = 'New page', children: Blueprint[] = []): string {
  const doc = getDoc();
  const taken = new Set(Object.values(doc.pages).map((p) => p.slug));
  const slug = uniqueSlug(slugify(name), taken);
  const { nodes, rootId } = instantiate({ ...def('page').create(), children });
  const pageId = newId('p');

  mutate('Add page', (draft) => {
    Object.assign(draft.elements, nodes);
    draft.pages[pageId] = {
      id: pageId,
      name,
      slug,
      rootId,
      seo: { title: name, description: '' },
      showInNav: true,
    };
    draft.pageOrder.push(pageId);
  });

  useEditor.getState().setActivePage(pageId);
  return pageId;
}

export function duplicatePage(pageId: string): string | null {
  const doc = getDoc();
  const src = doc.pages[pageId];
  if (!src) return null;

  const taken = new Set(Object.values(doc.pages).map((p) => p.slug));
  const name = `${src.name} copy`;
  const slug = uniqueSlug(slugify(name), taken);
  const newPageId = newId('p');
  const { nodes, rootId } = cloneSubtree(doc.elements, src.rootId, null);

  mutate('Duplicate page', (draft) => {
    Object.assign(draft.elements, nodes);
    draft.pages[newPageId] = { ...deepClone(src), id: newPageId, name, slug, rootId };
    draft.pageOrder.splice(draft.pageOrder.indexOf(pageId) + 1, 0, newPageId);
  });

  useEditor.getState().setActivePage(newPageId);
  return newPageId;
}

export function deletePage(pageId: string) {
  const doc = getDoc();
  if (doc.pageOrder.length <= 1) return;
  const page = doc.pages[pageId];
  if (!page) return;

  const ids = subtreeIds(doc.elements, page.rootId);
  const remaining = doc.pageOrder.filter((p) => p !== pageId);

  mutate('Delete page', (draft) => {
    for (const id of ids) delete draft.elements[id];
    delete draft.pages[pageId];
    draft.pageOrder = remaining;
    if (draft.homePageId === pageId) draft.homePageId = remaining[0];
    // Links pointing at the deleted page fall back to inert.
    for (const el of Object.values(draft.elements)) {
      if (el.link?.kind === 'page' && el.link.pageId === pageId) el.link = { kind: 'none' };
    }
  });

  if (useEditor.getState().activePageId === pageId) {
    useEditor.getState().setActivePage(remaining[0]);
  }
}

export function renamePage(pageId: string, name: string) {
  const doc = getDoc();
  const page = doc.pages[pageId];
  if (!page) return;
  const clean = name.trim() || 'Untitled';

  // If the URL is still the one derived from the old name, follow the rename.
  // A slug the user has deliberately set is left alone — changing a live URL
  // behind their back breaks links.
  const wasAuto = page.slug === slugify(page.name);
  const taken = new Set(Object.values(doc.pages).filter((p) => p.id !== pageId).map((p) => p.slug));
  const nextSlug = wasAuto && page.id !== doc.homePageId ? uniqueSlug(slugify(clean), taken) : page.slug;

  mutate('Rename page', (draft) => {
    const p = draft.pages[pageId];
    if (!p) return;
    p.name = clean;
    p.slug = nextSlug;
  });
}

export function setPageSlug(pageId: string, slug: string) {
  const doc = getDoc();
  const taken = new Set(Object.values(doc.pages).filter((p) => p.id !== pageId).map((p) => p.slug));
  const normalized = slug.startsWith('/') ? slug : `/${slug}`;
  const clean = uniqueSlug(normalized.replace(/\s+/g, '-').toLowerCase(), taken);
  mutate('Change page URL', (draft) => {
    const p = draft.pages[pageId];
    if (p) p.slug = clean;
  });
}

export function setPageSeo(pageId: string, seo: Partial<PageSeo>) {
  mutate('Edit SEO', (draft) => {
    const p = draft.pages[pageId];
    if (p) p.seo = { ...p.seo, ...seo };
  }, { mergeKey: `seo:${pageId}` });
}

export function setHomePage(pageId: string) {
  mutate('Set homepage', (draft) => {
    if (draft.pages[pageId]) draft.homePageId = pageId;
  });
}

export function setPageInNav(pageId: string, show: boolean) {
  mutate('Change nav visibility', (draft) => {
    const p = draft.pages[pageId];
    if (p) p.showInNav = show;
  });
}

export function reorderPages(from: number, to: number) {
  mutate('Reorder pages', (draft) => {
    const [moved] = draft.pageOrder.splice(from, 1);
    draft.pageOrder.splice(to, 0, moved);
  });
}

export function renameSite(name: string) {
  mutate('Rename site', (draft) => {
    draft.name = name.trim() || 'Untitled site';
  }, { mergeKey: 'siteName' });
}
