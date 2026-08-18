import type { Blueprint } from './blueprint';
import { styleSet } from './blueprint';
import type { ElementType } from './types';

export type ElementCategory = 'layout' | 'basics' | 'navigation' | 'content' | 'forms' | 'advanced';

export const CATEGORY_ORDER: ElementCategory[] = [
  'basics',
  'layout',
  'navigation',
  'content',
  'forms',
  'advanced',
];

export const CATEGORY_LABEL: Record<ElementCategory, string> = {
  basics: 'Basics',
  layout: 'Layout',
  navigation: 'Navigation',
  content: 'Content',
  forms: 'Forms',
  advanced: 'Advanced',
};

/** Inspector groups a given element type supports. Keeps panels relevant. */
export type InspectorGroup =
  | 'content'
  | 'layout'
  | 'size'
  | 'spacing'
  | 'typography'
  | 'background'
  | 'border'
  | 'effects'
  | 'position'
  | 'overflow'
  | 'image'
  | 'video'
  | 'link'
  | 'icon'
  | 'form'
  | 'embed'
  | 'nav'
  | 'menu'
  | 'grid'
  | 'section';

export interface CreateContext {
  pages?: { id: string; name: string }[];
}

export interface ElementDef {
  type: ElementType;
  label: string;
  category: ElementCategory;
  icon: string;
  /** Semantic tag used by the renderer and exporter. */
  tag: string;
  /** Accepts child elements. */
  container: boolean;
  /** Has directly editable inline text. */
  textual: boolean;
  /** Cannot have children and renders as a void tag. */
  selfClosing?: boolean;
  resize: 'both' | 'width' | 'height' | 'none';
  inspector: InspectorGroup[];
  /** Not offered in the Add panel (created only as part of a parent). */
  internal?: boolean;
  /** Type ids this element will only accept as direct children. */
  accepts?: ElementType[];
  /** Parent types this element may be dropped into. */
  onlyIn?: ElementType[];
  keywords?: string[];
  create: (ctx?: CreateContext) => Blueprint;
}

const BOX: InspectorGroup[] = ['size', 'spacing', 'background', 'border', 'effects', 'position'];

/* ------------------------------------------------------------------ */

const heading = (level: number, text: string): Blueprint => ({
  type: 'heading',
  content: text,
  textStyle: `h${level}`,
  settings: { level },
});

const bodyText = (text: string): Blueprint => ({
  type: 'text',
  content: text,
  textStyle: 'body',
});

const primaryButton = (label: string): Blueprint => ({
  type: 'button',
  content: label,
  settings: { buttonStyle: 'primary' },
  link: { kind: 'none' },
});

/* ------------------------------------------------------------------ */

export const ELEMENT_DEFS: Record<ElementType, ElementDef> = {
  /* ---------------- structural ---------------- */
  page: {
    type: 'page',
    label: 'Page',
    category: 'layout',
    icon: 'file',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'none',
    internal: true,
    inspector: ['background'],
    create: () => ({
      type: 'page',
      styles: styleSet({ display: 'flex', flexDirection: 'column', minHeight: '100%' }),
    }),
  },

  section: {
    type: 'section',
    label: 'Section',
    category: 'layout',
    icon: 'section',
    tag: 'section',
    container: true,
    textual: false,
    resize: 'height',
    onlyIn: ['page'],
    keywords: ['band', 'strip'],
    inspector: ['layout', 'size', 'spacing', 'background', 'border', 'effects', 'overflow', 'section'],
    create: () => ({
      type: 'section',
      name: 'Section',
      styles: styleSet(
        {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '96px',
          paddingBottom: '96px',
          paddingLeft: '32px',
          paddingRight: '32px',
          width: '100%',
        },
        {},
        { paddingTop: '56px', paddingBottom: '56px', paddingLeft: '20px', paddingRight: '20px' },
      ),
      children: [
        {
          type: 'container',
          children: [heading(2, 'Section heading'), bodyText('Describe what makes this section worth reading.')],
        },
      ],
    }),
  },

  container: {
    type: 'container',
    label: 'Container',
    category: 'layout',
    icon: 'container',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    keywords: ['wrapper', 'div', 'box'],
    inspector: ['layout', ...BOX, 'overflow'],
    create: () => ({
      type: 'container',
      name: 'Container',
      styles: styleSet({
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '1120px',
      }),
    }),
  },

  stack: {
    type: 'stack',
    label: 'Stack',
    category: 'layout',
    icon: 'stack',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    keywords: ['vertical', 'vstack'],
    inspector: ['layout', ...BOX, 'overflow'],
    create: () => ({
      type: 'stack',
      name: 'Stack',
      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }),
    }),
  },

  row: {
    type: 'row',
    label: 'Row',
    category: 'layout',
    icon: 'row',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    keywords: ['horizontal', 'hstack'],
    inspector: ['layout', ...BOX, 'overflow'],
    create: () => ({
      type: 'row',
      name: 'Row',
      styles: styleSet(
        { display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', width: '100%' },
        {},
        { flexDirection: 'column', alignItems: 'stretch' },
      ),
    }),
  },

  columns: {
    type: 'columns',
    label: 'Columns',
    category: 'layout',
    icon: 'columns',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    accepts: ['column'],
    keywords: ['split', '2 column', '3 column'],
    inspector: ['layout', ...BOX],
    create: () => ({
      type: 'columns',
      name: 'Columns',
      styles: styleSet(
        {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '24px',
          width: '100%',
        },
        { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
      ),
      children: [
        { type: 'column', children: [heading(3, 'Column one'), bodyText('Supporting copy.')] },
        { type: 'column', children: [heading(3, 'Column two'), bodyText('Supporting copy.')] },
        { type: 'column', children: [heading(3, 'Column three'), bodyText('Supporting copy.')] },
      ],
    }),
  },

  column: {
    type: 'column',
    label: 'Column',
    category: 'layout',
    icon: 'column',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'none',
    internal: true,
    onlyIn: ['columns'],
    inspector: ['layout', ...BOX, 'grid'],
    create: () => ({
      type: 'column',
      name: 'Column',
      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '0px' }),
    }),
  },

  grid: {
    type: 'grid',
    label: 'Grid',
    category: 'layout',
    icon: 'grid',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX, 'overflow'],
    create: () => ({
      type: 'grid',
      name: 'Grid',
      styles: styleSet(
        {
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '24px',
          width: '100%',
        },
        { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
      ),
      children: [
        { type: 'container', styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '8px' }) },
        { type: 'container', styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '8px' }) },
        { type: 'container', styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '8px' }) },
      ],
    }),
  },

  flex: {
    type: 'flex',
    label: 'Flex container',
    category: 'layout',
    icon: 'flex',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX, 'overflow'],
    create: () => ({
      type: 'flex',
      name: 'Flex',
      styles: styleSet({
        display: 'flex',
        flexDirection: 'row',
        gap: '16px',
        alignItems: 'stretch',
        flexWrap: 'wrap',
        width: '100%',
      }),
    }),
  },

  /* ---------------- basics ---------------- */
  heading: {
    type: 'heading',
    label: 'Heading',
    category: 'basics',
    icon: 'heading',
    tag: 'h2',
    container: false,
    textual: true,
    resize: 'width',
    keywords: ['h1', 'h2', 'title'],
    inspector: ['content', 'typography', 'size', 'spacing', 'background', 'border', 'effects', 'position', 'link'],
    create: () => heading(2, 'Your heading here'),
  },

  text: {
    type: 'text',
    label: 'Text',
    category: 'basics',
    icon: 'text',
    tag: 'p',
    container: false,
    textual: true,
    resize: 'width',
    keywords: ['paragraph', 'body', 'copy'],
    inspector: ['content', 'typography', 'size', 'spacing', 'background', 'border', 'effects', 'position', 'link'],
    create: () => bodyText('Write something worth reading. Double-click to edit this text directly on the canvas.'),
  },

  button: {
    type: 'button',
    label: 'Button',
    category: 'basics',
    icon: 'button',
    tag: 'a',
    container: false,
    textual: true,
    resize: 'both',
    keywords: ['cta', 'link button'],
    inspector: ['content', 'link', 'typography', 'size', 'spacing', 'background', 'border', 'effects', 'position'],
    create: () => primaryButton('Get started'),
  },

  image: {
    type: 'image',
    label: 'Image',
    category: 'basics',
    icon: 'image',
    tag: 'img',
    container: false,
    textual: false,
    selfClosing: true,
    resize: 'both',
    keywords: ['photo', 'picture', 'img'],
    inspector: ['image', 'size', 'spacing', 'border', 'effects', 'position', 'link'],
    create: () => ({
      type: 'image',
      name: 'Image',
      settings: {
        src: '',
        alt: '',
        objectFit: 'cover',
        objectPosition: 'center',
        loading: 'lazy',
      },
      styles: styleSet({ width: '100%', height: 'auto', borderRadius: '8px' }),
    }),
  },

  video: {
    type: 'video',
    label: 'Video',
    category: 'basics',
    icon: 'video',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'both',
    keywords: ['youtube', 'vimeo', 'mp4'],
    inspector: ['video', 'size', 'spacing', 'border', 'effects', 'position'],
    create: () => ({
      type: 'video',
      name: 'Video',
      settings: { url: '', source: 'youtube', autoplay: false, loop: false, muted: true, controls: true },
      styles: styleSet({ width: '100%', aspectRatio: '16 / 9', borderRadius: '10px', overflow: 'hidden' }),
    }),
  },

  icon: {
    type: 'icon',
    label: 'Icon',
    category: 'basics',
    icon: 'star',
    tag: 'span',
    container: false,
    textual: false,
    resize: 'none',
    inspector: ['icon', 'size', 'spacing', 'effects', 'position', 'link'],
    create: () => ({
      type: 'icon',
      name: 'Icon',
      settings: { icon: 'sparkle', size: 28 },
      styles: styleSet({ color: 'var(--c-primary)' }),
    }),
  },

  divider: {
    type: 'divider',
    label: 'Divider',
    category: 'basics',
    icon: 'divider',
    tag: 'hr',
    container: false,
    textual: false,
    selfClosing: true,
    resize: 'width',
    keywords: ['line', 'separator', 'rule'],
    inspector: ['size', 'spacing', 'border', 'background', 'position'],
    create: () => ({
      type: 'divider',
      name: 'Divider',
      styles: styleSet({
        width: '100%',
        height: '1px',
        backgroundColor: 'var(--c-border)',
        border: 'none',
      }),
    }),
  },

  spacer: {
    type: 'spacer',
    label: 'Spacer',
    category: 'basics',
    icon: 'spacer',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'height',
    keywords: ['gap', 'space'],
    inspector: ['size'],
    create: () => ({
      type: 'spacer',
      name: 'Spacer',
      styles: styleSet({ width: '100%', height: '48px', flexShrink: '0' }, {}, { height: '32px' }),
    }),
  },

  /* ---------------- navigation ---------------- */
  navbar: {
    type: 'navbar',
    label: 'Navbar',
    category: 'navigation',
    icon: 'navbar',
    tag: 'header',
    container: true,
    textual: false,
    resize: 'height',
    keywords: ['header', 'navigation', 'menu bar'],
    inspector: ['nav', 'layout', 'size', 'spacing', 'background', 'border', 'effects'],
    create: (ctx) => ({
      type: 'navbar',
      name: 'Navbar',
      settings: { sticky: true, transparent: false, mobileMenu: 'hamburger', hideOnScroll: false },
      styles: styleSet({
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingTop: '16px',
        paddingBottom: '16px',
        paddingLeft: '32px',
        paddingRight: '32px',
        backgroundColor: 'var(--c-background)',
        borderBottom: '1px solid var(--c-border)',
      }, {}, { paddingLeft: '20px', paddingRight: '20px' }),
      children: [
        {
          type: 'logo',
          content: 'Studio',
          link: { kind: 'page', pageId: ctx?.pages?.[0]?.id },
        },
        {
          type: 'navLinks',
          name: 'Menu',
          styles: styleSet({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '28px' }),
          children: (ctx?.pages ?? [{ id: '', name: 'Home' }]).slice(0, 5).map((p) => ({
            type: 'navLink' as const,
            content: p.name,
            textStyle: 'link',
            link: { kind: 'page' as const, pageId: p.id },
          })),
        },
        {
          type: 'button',
          content: 'Contact',
          settings: { buttonStyle: 'primary' },
          styles: styleSet({ paddingTop: '10px', paddingBottom: '10px', paddingLeft: '18px', paddingRight: '18px', fontSize: '15px' }),
          link: { kind: 'none' },
        },
      ],
    }),
  },

  navLinks: {
    type: 'navLinks',
    label: 'Menu',
    category: 'navigation',
    icon: 'menu',
    tag: 'nav',
    container: true,
    textual: false,
    resize: 'none',
    accepts: ['navLink'],
    keywords: ['links', 'nav links'],
    inspector: ['menu', 'layout', 'size', 'spacing', 'typography'],
    create: (ctx) => ({
      type: 'navLinks',
      name: 'Menu',
      styles: styleSet({ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '28px' }),
      children: (ctx?.pages ?? [{ id: '', name: 'Home' }]).slice(0, 5).map((p) => ({
        type: 'navLink' as const,
        content: p.name,
        link: { kind: 'page' as const, pageId: p.id },
      })),
    }),
  },

  navLink: {
    type: 'navLink',
    label: 'Menu link',
    category: 'navigation',
    icon: 'link',
    tag: 'a',
    container: true,
    textual: true,
    resize: 'none',
    internal: true,
    accepts: ['navLinks'],
    inspector: ['content', 'link', 'typography', 'spacing', 'background', 'border'],
    create: () => ({
      type: 'navLink',
      content: 'Link',
      textStyle: 'link',
      link: { kind: 'none' },
    }),
  },

  logo: {
    type: 'logo',
    label: 'Logo',
    category: 'navigation',
    icon: 'logo',
    tag: 'a',
    container: false,
    textual: true,
    resize: 'none',
    keywords: ['brand', 'wordmark'],
    inspector: ['content', 'image', 'link', 'typography', 'size', 'spacing'],
    create: () => ({
      type: 'logo',
      name: 'Logo',
      content: 'Studio',
      settings: { mode: 'text', src: '' },
      styles: styleSet({
        fontSize: '20px',
        fontWeight: '650',
        letterSpacing: '-0.02em',
        color: 'var(--c-text)',
        textDecoration: 'none',
      }),
      link: { kind: 'none' },
    }),
  },

  breadcrumbs: {
    type: 'breadcrumbs',
    label: 'Breadcrumbs',
    category: 'navigation',
    icon: 'chevronRight',
    tag: 'nav',
    container: false,
    textual: false,
    resize: 'none',
    inspector: ['typography', 'spacing', 'size'],
    create: () => ({
      type: 'breadcrumbs',
      name: 'Breadcrumbs',
      settings: { separator: '/', items: ['Home', 'Section', 'Current page'] },
      styles: styleSet({ fontSize: '14px', color: 'var(--c-muted)', display: 'flex', gap: '8px' }),
    }),
  },

  /* ---------------- content ---------------- */
  card: {
    type: 'card',
    label: 'Card',
    category: 'content',
    icon: 'card',
    tag: 'article',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX, 'overflow'],
    create: () => ({
      type: 'card',
      name: 'Card',
      styles: styleSet({
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '28px',
        backgroundColor: 'var(--c-surface)',
        borderRadius: '12px',
        border: '1px solid var(--c-border)',
      }),
      children: [heading(3, 'Card title'), bodyText('A short supporting description for this card.')],
    }),
  },

  gallery: {
    type: 'gallery',
    label: 'Gallery',
    category: 'content',
    icon: 'gallery',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX],
    create: () => ({
      type: 'gallery',
      name: 'Gallery',
      styles: styleSet(
        { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', width: '100%' },
        { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
        { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
      ),
      children: [1, 2, 3, 4, 5, 6].map(() => ({
        type: 'image' as const,
        settings: { src: '', alt: '', objectFit: 'cover', loading: 'lazy' },
        styles: styleSet({ width: '100%', aspectRatio: '4 / 3', borderRadius: '8px' }),
      })),
    }),
  },

  carousel: {
    type: 'carousel',
    label: 'Carousel',
    category: 'content',
    icon: 'carousel',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    keywords: ['slider', 'slideshow'],
    inspector: ['layout', ...BOX],
    create: () => ({
      type: 'carousel',
      name: 'Carousel',
      settings: { autoplay: false, interval: 5000, showArrows: true, showDots: true, loop: true },
      styles: styleSet({ width: '100%' }),
      children: [1, 2, 3].map((n) => ({
        type: 'container' as const,
        name: `Slide ${n}`,
        styles: styleSet({
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '320px',
          backgroundColor: 'var(--c-surface)',
          borderRadius: '12px',
          padding: '32px',
        }),
        children: [heading(3, `Slide ${n}`), bodyText('Swap this for any content you like.')],
      })),
    }),
  },

  accordion: {
    type: 'accordion',
    label: 'Accordion',
    category: 'content',
    icon: 'accordion',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'width',
    accepts: ['accordionItem'],
    inspector: ['layout', 'size', 'spacing', 'border'],
    create: () => ({
      type: 'accordion',
      name: 'Accordion',
      settings: { allowMultiple: false },
      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%' }),
      children: ['First question', 'Second question', 'Third question'].map((q) => ({
        type: 'accordionItem' as const,
        content: q,
        settings: { open: false },
        children: [bodyText('Answer the question clearly and concisely here.')],
      })),
    }),
  },

  accordionItem: {
    type: 'accordionItem',
    label: 'Accordion item',
    category: 'content',
    icon: 'accordion',
    tag: 'div',
    container: true,
    textual: true,
    resize: 'none',
    internal: true,
    onlyIn: ['accordion', 'faq'],
    inspector: ['content', 'typography', 'spacing', 'border', 'background'],
    create: () => ({
      type: 'accordionItem',
      content: 'Question',
      settings: { open: false },
      children: [bodyText('Answer goes here.')],
    }),
  },

  tabs: {
    type: 'tabs',
    label: 'Tabs',
    category: 'content',
    icon: 'tabs',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    accepts: ['tabItem'],
    inspector: ['layout', 'size', 'spacing', 'border', 'background'],
    create: () => ({
      type: 'tabs',
      name: 'Tabs',
      settings: { active: 0 },
      styles: styleSet({ width: '100%' }),
      children: ['Overview', 'Details', 'Pricing'].map((t) => ({
        type: 'tabItem' as const,
        content: t,
        children: [heading(3, t), bodyText('Tab panel content.')],
      })),
    }),
  },

  tabItem: {
    type: 'tabItem',
    label: 'Tab',
    category: 'content',
    icon: 'tabs',
    tag: 'div',
    container: true,
    textual: true,
    resize: 'none',
    internal: true,
    onlyIn: ['tabs'],
    inspector: ['content', 'spacing', 'background'],
    create: () => ({ type: 'tabItem', content: 'Tab', children: [bodyText('Tab content.')] }),
  },

  testimonial: {
    type: 'testimonial',
    label: 'Testimonial',
    category: 'content',
    icon: 'quote',
    tag: 'figure',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX],
    create: () => ({
      type: 'testimonial',
      name: 'Testimonial',
      styles: styleSet({
        display: 'flex',
        flexDirection: 'column',
        gap: '18px',
        padding: '32px',
        backgroundColor: 'var(--c-surface)',
        borderRadius: '14px',
        border: '1px solid var(--c-border)',
      }),
      children: [
        {
          type: 'text',
          content: '“This changed how our whole team ships work. We moved faster in a week than the previous quarter.”',
          styles: styleSet({ fontSize: '20px', lineHeight: '1.5', color: 'var(--c-text)' }),
        },
        {
          type: 'row',
          styles: styleSet({ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }),
          children: [
            {
              type: 'image',
              settings: { src: '', alt: '', objectFit: 'cover' },
              styles: styleSet({ width: '44px', height: '44px', borderRadius: '999px', flexShrink: '0' }),
            },
            {
              type: 'stack',
              styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '2px' }),
              children: [
                { type: 'text', content: 'Avery Chen', styles: styleSet({ fontWeight: '600', fontSize: '15px' }) },
                { type: 'text', content: 'Head of Design, Northwind', styles: styleSet({ fontSize: '14px', color: 'var(--c-muted)' }) },
              ],
            },
          ],
        },
      ],
    }),
  },

  featureList: {
    type: 'featureList',
    label: 'Feature list',
    category: 'content',
    icon: 'list',
    tag: 'ul',
    container: true,
    textual: false,
    resize: 'width',
    accepts: ['featureItem'],
    inspector: ['layout', 'size', 'spacing', 'typography'],
    create: () => ({
      type: 'featureList',
      name: 'Feature list',
      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }),
      children: [
        'Unlimited projects and collaborators',
        'Version history with one-click restore',
        'Export clean HTML and CSS at any time',
      ].map((t) => ({ type: 'featureItem' as const, content: t })),
    }),
  },

  featureItem: {
    type: 'featureItem',
    label: 'Feature',
    category: 'content',
    icon: 'check',
    tag: 'li',
    container: false,
    textual: true,
    resize: 'none',
    internal: true,
    onlyIn: ['featureList'],
    inspector: ['content', 'typography', 'spacing', 'icon'],
    create: () => ({
      type: 'featureItem',
      content: 'A benefit worth calling out',
      settings: { icon: 'check' },
      styles: styleSet({ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '17px' }),
    }),
  },

  pricingCard: {
    type: 'pricingCard',
    label: 'Pricing card',
    category: 'content',
    icon: 'price',
    tag: 'article',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX],
    create: () => ({
      type: 'pricingCard',
      name: 'Pricing card',
      styles: styleSet({
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '32px',
        backgroundColor: 'var(--c-background)',
        border: '1px solid var(--c-border)',
        borderRadius: '14px',
      }),
      children: [
        { type: 'text', content: 'Studio', styles: styleSet({ fontSize: '15px', fontWeight: '600', color: 'var(--c-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }) },
        { type: 'heading', content: '$29', textStyle: 'h2', settings: { level: 3 }, styles: styleSet({ fontSize: '44px' }) },
        {
          type: 'featureList',
          styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '10px' }),
          children: ['Everything in Starter', 'Custom domains', 'Priority support'].map((t) => ({
            type: 'featureItem' as const,
            content: t,
            settings: { icon: 'check' },
            styles: styleSet({ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '16px' }),
          })),
        },
        primaryButton('Choose plan'),
      ],
    }),
  },

  stat: {
    type: 'stat',
    label: 'Stat',
    category: 'content',
    icon: 'stat',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'both',
    inspector: ['layout', ...BOX],
    create: () => ({
      type: 'stat',
      name: 'Stat',
      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '4px' }),
      children: [
        { type: 'heading', content: '98%', textStyle: 'h2', settings: { level: 3 }, styles: styleSet({ fontSize: '48px', letterSpacing: '-0.03em' }) },
        { type: 'text', content: 'Customer retention', styles: styleSet({ fontSize: '15px', color: 'var(--c-muted)' }) },
      ],
    }),
  },

  faq: {
    type: 'faq',
    label: 'FAQ',
    category: 'content',
    icon: 'help',
    tag: 'div',
    container: true,
    textual: false,
    resize: 'width',
    accepts: ['accordionItem'],
    inspector: ['layout', 'size', 'spacing', 'border'],
    create: () => ({
      type: 'faq',
      name: 'FAQ',
      settings: { allowMultiple: false },
      styles: styleSet({ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '760px' }),
      children: [
        'How long does setup take?',
        'Can I export my site?',
        'Do you support custom domains?',
        'What happens if I cancel?',
      ].map((q) => ({
        type: 'accordionItem' as const,
        content: q,
        settings: { open: false },
        children: [bodyText('A clear, direct answer that removes the objection.')],
      })),
    }),
  },

  /* ---------------- forms ---------------- */
  form: {
    type: 'form',
    label: 'Contact form',
    category: 'forms',
    icon: 'form',
    tag: 'form',
    container: true,
    textual: false,
    resize: 'width',
    keywords: ['contact', 'signup'],
    inspector: ['form', 'layout', ...BOX],
    create: () => ({
      type: 'form',
      name: 'Contact form',
      settings: { action: '', method: 'POST', successMessage: 'Thanks — we’ll be in touch shortly.' },
      styles: styleSet({
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '520px',
      }),
      children: [
        { type: 'input', settings: { label: 'Name', name: 'name', placeholder: 'Your name', inputType: 'text', required: true } },
        { type: 'input', settings: { label: 'Email', name: 'email', placeholder: 'you@company.com', inputType: 'email', required: true } },
        { type: 'textarea', settings: { label: 'Message', name: 'message', placeholder: 'How can we help?', rows: 5, required: false } },
        { type: 'submit', content: 'Send message' },
      ],
    }),
  },

  input: {
    type: 'input',
    label: 'Input',
    category: 'forms',
    icon: 'input',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'width',
    inspector: ['form', 'size', 'spacing', 'typography', 'border', 'background'],
    create: () => ({
      type: 'input',
      name: 'Input',
      settings: { label: 'Label', name: 'field', placeholder: 'Placeholder', inputType: 'text', required: false },
      styles: styleSet({ width: '100%' }),
    }),
  },

  textarea: {
    type: 'textarea',
    label: 'Textarea',
    category: 'forms',
    icon: 'textarea',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'both',
    inspector: ['form', 'size', 'spacing', 'typography', 'border', 'background'],
    create: () => ({
      type: 'textarea',
      name: 'Textarea',
      settings: { label: 'Message', name: 'message', placeholder: 'Your message', rows: 5, required: false },
      styles: styleSet({ width: '100%' }),
    }),
  },

  checkbox: {
    type: 'checkbox',
    label: 'Checkbox',
    category: 'forms',
    icon: 'checkbox',
    tag: 'label',
    container: false,
    textual: false,
    resize: 'none',
    inspector: ['form', 'typography', 'spacing'],
    create: () => ({
      type: 'checkbox',
      name: 'Checkbox',
      settings: { label: 'Subscribe to updates', name: 'subscribe', checked: false },
      styles: styleSet({ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '15px' }),
    }),
  },

  radio: {
    type: 'radio',
    label: 'Radio group',
    category: 'forms',
    icon: 'radio',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'none',
    inspector: ['form', 'typography', 'spacing'],
    create: () => ({
      type: 'radio',
      name: 'Radio group',
      settings: { label: 'Plan', name: 'plan', options: ['Starter', 'Studio', 'Enterprise'], value: 'Starter' },
      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '15px' }),
    }),
  },

  select: {
    type: 'select',
    label: 'Dropdown',
    category: 'forms',
    icon: 'select',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'width',
    inspector: ['form', 'size', 'spacing', 'typography', 'border', 'background'],
    create: () => ({
      type: 'select',
      name: 'Dropdown',
      settings: { label: 'Budget', name: 'budget', options: ['Under $5k', '$5k – $20k', '$20k+'], required: false },
      styles: styleSet({ width: '100%' }),
    }),
  },

  submit: {
    type: 'submit',
    label: 'Submit button',
    category: 'forms',
    icon: 'send',
    tag: 'button',
    container: false,
    textual: true,
    resize: 'both',
    inspector: ['content', 'typography', 'size', 'spacing', 'background', 'border', 'effects'],
    create: () => ({
      type: 'submit',
      name: 'Submit',
      content: 'Submit',
      settings: { buttonStyle: 'primary' },
    }),
  },

  label: {
    type: 'label',
    label: 'Label',
    category: 'forms',
    icon: 'text',
    tag: 'label',
    container: false,
    textual: true,
    resize: 'none',
    internal: true,
    inspector: ['content', 'typography', 'spacing'],
    create: () => ({
      type: 'label',
      content: 'Label',
      styles: styleSet({ fontSize: '14px', fontWeight: '550', color: 'var(--c-text)' }),
    }),
  },

  /* ---------------- advanced ---------------- */
  embed: {
    type: 'embed',
    label: 'Embed',
    category: 'advanced',
    icon: 'code',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'both',
    keywords: ['html', 'iframe', 'script'],
    inspector: ['embed', 'size', 'spacing', 'border', 'position'],
    create: () => ({
      type: 'embed',
      name: 'Embed',
      settings: { html: '<div style="padding:24px;text-align:center">Paste your embed code</div>' },
      styles: styleSet({ width: '100%' }),
    }),
  },

  map: {
    type: 'map',
    label: 'Map',
    category: 'advanced',
    icon: 'map',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'both',
    inspector: ['embed', 'size', 'spacing', 'border', 'effects'],
    create: () => ({
      type: 'map',
      name: 'Map',
      settings: { query: 'San Francisco, CA', zoom: 13 },
      styles: styleSet({ width: '100%', height: '360px', borderRadius: '12px', overflow: 'hidden' }),
    }),
  },

  socialLinks: {
    type: 'socialLinks',
    label: 'Social links',
    category: 'advanced',
    icon: 'share',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'none',
    inspector: ['embed', 'layout', 'spacing', 'size'],
    create: () => ({
      type: 'socialLinks',
      name: 'Social links',
      settings: {
        size: 20,
        items: [
          { network: 'x', url: 'https://x.com' },
          { network: 'linkedin', url: 'https://linkedin.com' },
          { network: 'instagram', url: 'https://instagram.com' },
        ],
      },
      styles: styleSet({ display: 'flex', flexDirection: 'row', gap: '16px', color: 'var(--c-muted)' }),
    }),
  },

  instance: {
    type: 'instance',
    label: 'Component',
    category: 'advanced',
    icon: 'component',
    tag: 'div',
    container: false,
    textual: false,
    resize: 'none',
    internal: true,
    inspector: ['size', 'spacing', 'position'],
    create: () => ({ type: 'instance', name: 'Component' }),
  },
};

export const def = (type: ElementType): ElementDef => ELEMENT_DEFS[type] ?? ELEMENT_DEFS.container;

export const elementLabel = (type: ElementType) => def(type).label;

/** Element types offered in the Add panel, grouped by category. */
export function addPanelItems(): Record<ElementCategory, ElementDef[]> {
  const out = {} as Record<ElementCategory, ElementDef[]>;
  for (const c of CATEGORY_ORDER) out[c] = [];
  for (const d of Object.values(ELEMENT_DEFS)) {
    if (d.internal) continue;
    out[d.category].push(d);
  }
  return out;
}

/** Can `childType` be placed inside `parentType`? */
export function canContain(parentType: ElementType, childType: ElementType): boolean {
  const parent = def(parentType);
  const child = def(childType);
  if (!parent.container) return false;
  if (parent.accepts && !parent.accepts.includes(childType)) return false;
  if (child.onlyIn && !child.onlyIn.includes(parentType)) return false;
  return true;
}
