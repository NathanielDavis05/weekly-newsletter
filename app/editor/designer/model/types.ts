/**
 * Core document model.
 *
 * The site is a normalized graph: every element lives in `SiteDoc.elements`
 * keyed by id, and structure is expressed with `parent` / `children`.
 * Nothing in the system stores rendered HTML — HTML/CSS is derived from
 * this model by the rendering engine.
 */

export type Breakpoint = 'base' | 'tablet' | 'mobile';

export const BREAKPOINTS: Breakpoint[] = ['base', 'tablet', 'mobile'];

/** Max width at which a breakpoint's overrides apply. `base` is unbounded. */
export const BREAKPOINT_MAX: Record<Breakpoint, number | null> = {
  base: null,
  tablet: 991,
  mobile: 599,
};

export const BREAKPOINT_LABEL: Record<Breakpoint, string> = {
  base: 'Desktop',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

/** Canvas width used when a viewport is picked from the toolbar. */
export const BREAKPOINT_CANVAS_WIDTH: Record<Breakpoint, number> = {
  base: 1280,
  tablet: 820,
  mobile: 420,
};

/**
 * A style layer. Keys are camelCased CSS properties, values are raw CSS
 * strings ("64px", "1.4", "var(--c-primary)"). Keeping values as strings
 * means the CSS generator is a pure, lossless transform.
 */
export type StyleLayer = Record<string, string>;

export interface StyleSet {
  base: StyleLayer;
  tablet: StyleLayer;
  mobile: StyleLayer;
}

export type PerBreakpoint<T> = Partial<Record<Breakpoint, T>>;

export type ElementType =
  // structural
  | 'page'
  | 'section'
  | 'container'
  | 'stack'
  | 'row'
  | 'columns'
  | 'column'
  | 'grid'
  | 'flex'
  // basics
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'video'
  | 'icon'
  | 'divider'
  | 'spacer'
  // navigation
  | 'navbar'
  | 'navLinks'
  | 'navLink'
  | 'logo'
  | 'breadcrumbs'
  // content
  | 'card'
  | 'gallery'
  | 'carousel'
  | 'accordion'
  | 'accordionItem'
  | 'tabs'
  | 'tabItem'
  | 'testimonial'
  | 'featureList'
  | 'featureItem'
  | 'pricingCard'
  | 'stat'
  | 'faq'
  // forms
  | 'form'
  | 'input'
  | 'textarea'
  | 'checkbox'
  | 'radio'
  | 'select'
  | 'submit'
  | 'label'
  // advanced
  | 'embed'
  | 'map'
  | 'socialLinks'
  | 'instance';

export interface LinkTarget {
  kind: 'none' | 'page' | 'url' | 'section' | 'email' | 'phone';
  pageId?: string;
  url?: string;
  sectionId?: string;
  newTab?: boolean;
}

export type InteractionTrigger = 'hover' | 'click' | 'load' | 'scrollIntoView';

export interface InteractionEffect {
  opacity?: number;
  scale?: number;
  x?: number;
  y?: number;
  rotate?: number;
  color?: string;
  backgroundColor?: string;
  visible?: boolean;
}

export interface Interaction {
  id: string;
  trigger: InteractionTrigger;
  effect: InteractionEffect;
  duration: number; // ms
  delay: number; // ms
  easing: string;
  enabled: boolean;
}

export interface CustomAttribute {
  id: string;
  name: string;
  value: string;
}

export interface ElementNode {
  id: string;
  type: ElementType;
  /** User-facing name shown in Layers. Falls back to the type label. */
  name?: string;
  parent: string | null;
  children: string[];

  /** Inline text content for text-bearing elements. */
  content?: string;

  styles: StyleSet;

  /** Non-style, type-specific configuration (src, alt, level, columns, ...). */
  settings: Record<string, unknown>;

  /** Per-breakpoint visibility. Absent = visible. */
  hidden?: PerBreakpoint<boolean>;

  locked?: boolean;
  /** Collapsed in the Layers panel (persisted so trees stay where you left them). */
  collapsed?: boolean;

  link?: LinkTarget;
  interactions?: Interaction[];

  /** Named typography style ("h1", "body", ...) this element follows. */
  textStyle?: string;

  /* --- component system --- */
  /** Set on `instance` elements: which component definition to render. */
  componentId?: string;
  /** True on the root of a component master subtree. */
  isMaster?: boolean;

  /* --- escape hatch --- */
  customId?: string;
  classes?: string[];
  customCss?: string;
  attributes?: CustomAttribute[];
}

export interface PageSeo {
  title?: string;
  description?: string;
  ogImage?: string;
  noIndex?: boolean;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  rootId: string;
  seo: PageSeo;
  showInNav: boolean;
}

export interface ComponentDef {
  id: string;
  name: string;
  /** Root element id of the master subtree (lives in `elements`, unparented). */
  rootId: string;
  createdAt: number;
}

export interface Asset {
  id: string;
  name: string;
  /** data: URL or remote URL. */
  src: string;
  type: 'image' | 'video' | 'file';
  width?: number;
  height?: number;
  size?: number;
  createdAt: number;
}

export interface SavedSection {
  id: string;
  name: string;
  /** Detached element subtree, serialized. */
  elements: Record<string, ElementNode>;
  rootId: string;
  createdAt: number;
}

/* ------------------------------------------------------------------ */
/* Design system                                                       */
/* ------------------------------------------------------------------ */

export interface ColorToken {
  id: string;
  name: string;
  /** CSS variable name without the leading `--`. */
  varName: string;
  value: string;
}

export interface TypographyStyle {
  id: string;
  name: string;
  tag: string; // semantic tag used when rendering
  styles: StyleSet;
}

export interface ShadowToken {
  id: string;
  name: string;
  value: string;
}

export interface RadiusToken {
  id: string;
  name: string;
  value: string;
}

export interface SpacingToken {
  id: string;
  name: string;
  value: string;
}

export interface ButtonStyleDef {
  id: string;
  name: string;
  styles: StyleSet;
  hover: StyleLayer;
}

export interface Theme {
  colors: ColorToken[];
  typography: TypographyStyle[];
  fontFamilies: { heading: string; body: string; mono: string };
  radii: RadiusToken[];
  shadows: ShadowToken[];
  spacing: SpacingToken[];
  buttons: ButtonStyleDef[];
  containerWidths: { narrow: string; normal: string; wide: string; full: string };
  customCss?: string;
}

/* ------------------------------------------------------------------ */
/* Site                                                                */
/* ------------------------------------------------------------------ */

export interface SiteDoc {
  id: string;
  name: string;
  pages: Record<string, Page>;
  pageOrder: string[];
  homePageId: string;
  elements: Record<string, ElementNode>;
  components: Record<string, ComponentDef>;
  assets: Record<string, Asset>;
  savedSections: SavedSection[];
  theme: Theme;
  /** Bumped on every mutation; used for cheap change detection. */
  rev: number;
}

export interface SiteVersion {
  id: string;
  label: string;
  createdAt: number;
  auto: boolean;
  doc: SiteDoc;
}

export interface PublishedSite {
  publishedAt: number;
  url: string;
  doc: SiteDoc;
}
