import type { Blueprint } from './blueprint';
import { instantiate, newId } from './blueprint';
import { def } from './registry';
import { ctaSection, featuresSection, footerSection, heroSection } from './sections';
import { newsletterTemplate, newsletterTheme } from './templates';
import { defaultTheme } from './theme';
import type { ElementNode, Page, SiteDoc } from './types';

export interface NewSiteOptions {
  name?: string;
  /** Blank, general starter, or the CFA West Bryan team-newsletter template. */
  kind?: 'blank' | 'starter' | 'newsletter';
}

function makePage(
  elements: Record<string, ElementNode>,
  name: string,
  slug: string,
  children: Blueprint[],
): Page {
  const { nodes, rootId } = instantiate({ ...def('page').create(), children });
  Object.assign(elements, nodes);
  return {
    id: newId('p'),
    name,
    slug,
    rootId,
    seo: { title: name, description: '' },
    showInNav: true,
  };
}

export function createSite(opts: NewSiteOptions = {}): SiteDoc {
  const { name = 'Untitled site', kind = 'starter' } = opts;
  const elements: Record<string, ElementNode> = {};

  const homeChildren: Blueprint[] =
    kind === 'blank'
      ? []
      : kind === 'newsletter'
        ? newsletterTemplate()
        : [heroSection(), featuresSection(), ctaSection(), footerSection()];

  const home = makePage(elements, 'Home', '/', homeChildren);

  const pages: Record<string, Page> = { [home.id]: home };
  const pageOrder = [home.id];

  const doc: SiteDoc = {
    id: newId('site'),
    name,
    pages,
    pageOrder,
    homePageId: home.id,
    elements,
    components: {},
    assets: {},
    savedSections: [],
    theme: kind === 'newsletter' ? newsletterTheme() : defaultTheme(),
    rev: 0,
  };

  if (kind === 'starter') {
    // A navbar is added as a component instance so editing it on one page
    // updates it everywhere — the behaviour people expect from site chrome.
    const navBlueprint = def('navbar').create({ pages: [{ id: home.id, name: 'Home' }] });
    const { nodes, rootId } = instantiate(navBlueprint);
    nodes[rootId].isMaster = true;
    Object.assign(doc.elements, nodes);

    const compId = newId('c');
    doc.components[compId] = { id: compId, name: 'Navbar', rootId, createdAt: Date.now() };

    const instanceNode: ElementNode = {
      id: newId(),
      type: 'instance',
      name: 'Navbar',
      parent: home.rootId,
      children: [],
      styles: { base: { width: '100%' }, tablet: {}, mobile: {} },
      settings: {},
      componentId: compId,
    };
    doc.elements[instanceNode.id] = instanceNode;
    doc.elements[home.rootId].children.unshift(instanceNode.id);
  }

  if (kind === 'newsletter') {
    home.name = 'Team update';
    home.seo = {
      title: 'CFA West Bryan — Team newsletter',
      description: 'A weekly team update for CFA West Bryan.',
    };
  }

  return doc;
}
