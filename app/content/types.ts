// Structured content model for the newsletter. Every user-facing string that
// used to be hard-coded in the page components now lives here so the editor can
// change it without touching layout code. The shapes intentionally mirror the
// existing JSX structure (including split fields for emphasized fragments) so
// the rendered output stays byte-for-byte identical to the original pages.

import type { RichText } from "./richtext";
import type { SiteTheme } from "./theme";

export interface LinkContent {
  label: string;
  href: string;
}

export interface EventItem {
  date: string;
  name: string;
  featured?: boolean;
}

export interface AnniversaryEntry {
  name: string;
  detail: string;
}

export interface HomeActionCard {
  icon: string;
  label: string;
  heading: string;
  bodyPrefix: string;
  bodyEmphasis: string;
  micro: string;
  linkLabel: string;
  linkHref: string;
}

export interface HomeLinkCard {
  icon: string;
  kicker: string;
  title: string;
  detail: string;
  href: string;
}

export interface HomeContent {
  hero: {
    kicker: string;
    headline: string;
  };
  overview: {
    eyebrow: string;
    heading: string;
    intro: string;
    actionCard: HomeActionCard;
    eventCard: HomeLinkCard;
    recognitionCard: HomeLinkCard;
  };
  scorecard: {
    eyebrow: string;
    heading: string;
    intro: string;
    resultAria: string;
    resultValue: string;
    resultUnit: string;
    resultLabel: string;
    focusLabel: string;
    focusValue: string;
    buttonLabel: string;
    buttonHref: string;
  };
  recognition: {
    eyebrow: string;
    heading: string;
    feature: {
      heading: string;
      body: string;
    };
    birthday: {
      kicker: string;
      name: string;
      date: string;
    };
    anniversaries: {
      kicker: string;
      entries: AnniversaryEntry[];
    };
  };
  events: {
    eyebrow: string;
    heading: string;
    intro: string;
    items: EventItem[];
  };
  grow: {
    eyebrow: string;
    heading: string;
    body: string;
    buttonLabel: string;
    buttonHref: string;
    referralStrong: string;
    referralRest: string;
  };
  footer: {
    brand: string;
    line: string;
  };
  /** Optional override for the hero background photo (URL). Empty = default. */
  heroImage: string;
}

export interface TrainingStatusRow {
  token: string;
  tokenRed: boolean;
  label: string;
  strongPrefix: string;
  strongEmphasis: string;
}

export interface TrainingContent {
  badge: string;
  heading: string;
  lead: string;
  statusRows: TrainingStatusRow[];
  primaryButton: LinkContent;
  helpLink: LinkContent;
  alert: {
    kicker: string;
    body: string;
  };
  covers: {
    eyebrow: string;
    heading: string;
    items: string[];
  };
  why: {
    eyebrow: string;
    heading: string;
    paragraphs: string[];
  };
  help: {
    mark: string;
    heading: string;
    body: string;
  };
}

export type ResultTone = "green" | "yellow" | "red" | "white";

export interface HeadlineMetric {
  label: string;
  value: string;
  goal: string;
  status: string;
  positive: boolean;
  /** Controls the visual emphasis of this Guest experience result row. */
  tone?: ResultTone;
}

export interface ScorecardRow {
  label: string;
  goal: string;
  april: string;
  may: string;
  june: string;
  /** Green, yellow, or red visual assessment for this scorecard result. */
  tone?: ResultTone;
}

export interface ResultsContent {
  eyebrow: string;
  heading: string;
  lead: string;
  summaryAria: string;
  summaryValue: string;
  summaryUnit: string;
  summaryLabel: string;
  /** Green, red, or yellow treatment for the goals-met summary. */
  summaryTone?: "green" | "red" | "yellow";
  headlineMetrics: HeadlineMetric[];
  focus: {
    label: string;
    heading: string;
    body: string;
  };
  scorecard: {
    eyebrow: string;
    heading: string;
    headerMeasure: string;
    headerGoal: string;
    headerApr: string;
    headerMay: string;
    headerJun: string;
    rows: ScorecardRow[];
  };
  momentum: {
    heading: string;
    body: string;
    /** Selects the encouraging or needs-more-work callout treatment. */
    tone?: "celebrate" | "needs-work";
  };
}

export interface SharedContent {
  brandName: string;
  brandTagline: string;
  navHeading: string;
  navLinks: LinkContent[];
  detailBackLabel: string;
  scorecard: {
    /** Overall status treatment for the Guest experience card on the home page. */
    homeTone?: "green" | "yellow" | "red";
    eyebrow: string;
    heading: string;
    intro: string;
    resultAria: string;
    resultValue: string;
    resultUnit: string;
    resultLabel: string;
    focusLabel: string;
    focusValue: string;
    buttonLabel: string;
    buttonHref: string;
    table: {
      eyebrow: string;
      heading: string;
      headerMeasure: string;
      headerGoal: string;
      headerApr: string;
      headerMay: string;
      headerJun: string;
      rows: ScorecardRow[];
    };
  };
}

export interface NewsletterContent {
  shared: SharedContent;
  home: HomeContent;
  training: TrainingContent;
  results: ResultsContent;
  /**
   * Editor-owned layout data. The copy above remains the source of truth for
   * the native newsletter sections, while this document controls their order,
   * presentation, and any freeform blocks added in the visual editor.
   */
  visual?: VisualDocument;
}

export type VisualPageId = "home" | "training" | "results";

export type VisualBlockKind =
  | "native"
  | "text"
  | "subsection"
  | "image"
  | "button"
  | "divider"
  | "container"
  | "table"
  | "status-list"
  | "highlight";

export interface BlockStyle {
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginBottom?: number;
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  maxWidth?: number;
  shadow?: "soft" | "medium" | "strong" | "inset";
  /** Responsive visual sizing, persisted for both the canvas and public page. */
  phone?: ResponsiveLayout;
  desktop?: ResponsiveLayout;
  linkedDevices?: boolean;
  hidden?: boolean;
}

export interface ResponsiveLayout {
  width?: number;
  minHeight?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginBottom?: number;
  align?: "left" | "center" | "right" | "stretch";
  nudgeX?: number;
  nudgeY?: number;
}

/** Independent styling and geometry for one piece of text inside a block. */
export interface TextFrameStyle {
  background?: string;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  rotation?: number;
  phone?: TextFrameLayout;
  desktop?: TextFrameLayout;
  linkedDevices?: boolean;
}

/** Per-device text-frame position and dimensions. Width is a percentage of its block. */
export interface TextFrameLayout {
  width?: number;
  minHeight?: number;
  x?: number;
  y?: number;
}

export interface TableRow {
  label: string;
  values: string[];
}

export interface VisualBlock {
  id: string;
  kind: VisualBlockKind;
  label: string;
  style?: BlockStyle;
  nativeId?: string;
  /**
   * Plain-text mirrors of `richTitle` / `richBody`. These stay populated so that
   * anything reading the document without a rich-text renderer — validation,
   * search, older published payloads — keeps working. `rich*` is authoritative
   * when present; these are derived on save.
   */
  title?: string;
  body?: string;
  /** Formatted title. Added in visual document v7. */
  richTitle?: RichText;
  /** Formatted body copy. Added in visual document v7. */
  richBody?: RichText;
  href?: string;
  imageUrl?: string;
  alt?: string;
  tableData?: { columns: string[]; rows: TableRow[] };
  statusItems?: TrainingStatusRow[];
  highlight?: { value: string; unit: string; label: string; tone: "navy" | "green" | "red" | "gold" };
  /** A subsection bar can be pinned directly beneath another block. */
  attachedTo?: string;
}

export interface VisualPageDocument {
  items: VisualBlock[];
  rows: VisualRow[];
  background: string;
  contentWidth: number;
  minHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  rowGap: number;
}

/**
 * A saved design preset: a full snapshot of the site theme under a name, so the
 * whole newsletter's look can be swapped in one click. Applying a Look replaces
 * `VisualDocument.theme` wholesale.
 */
export interface Look {
  id: string;
  name: string;
  theme: SiteTheme;
}

/**
 * A reusable block template. Stores a freeform block (with its style) so it can
 * be dropped into any issue. The stored `block.id` is a template id; a fresh id
 * is generated each time the block is inserted.
 */
export interface SavedBlock {
  id: string;
  name: string;
  block: VisualBlock;
}

export interface VisualDocument {
  /**
   * v7 introduced rich text on freeform blocks, v8 the site theme, v9
   * formatting overrides for the native sections, and v10 saved Looks and
   * reusable blocks. Older documents are upgraded on read by `visualDocument()`
   * — nothing is rewritten in D1 until the next save.
   */
  version: 10;
  pages: Record<VisualPageId, VisualPageDocument>;
  headers: Record<VisualPageId, HeaderStyle>;
  /** Brand palette and global text styles shared by every page. */
  theme: SiteTheme;
  /**
   * Rich-text formatting for the native newsletter sections, keyed by the
   * dotted content path of the field it formats (e.g. "training.heading").
   * The plain string in NewsletterContent stays authoritative for the words;
   * this only adds formatting. Absent key = render the plain string.
   */
  richOverrides: Record<string, RichText>;
  /** Saved design presets. Applying one swaps the whole site's look. */
  looks: Look[];
  /** The Look most recently applied, for highlighting in the design panel. */
  activeLookId?: string;
  /** Reusable block templates, insertable into any page. */
  savedBlocks: SavedBlock[];
  /**
   * Independent frames for every editable string. Native fields use their
   * dotted content path; freeform fields use `<block id>:<rich field>`.
   */
  textFrames: Record<string, TextFrameStyle>;
}

export interface VisualRow {
  id: string;
  itemIds: string[];
  gap: number;
  align: "start" | "center" | "end" | "stretch";
  keepColumnsOnPhone: boolean;
}

export interface FreeformLayout {
  x: number;
  y: number;
  width?: number;
  widthPx?: number;
  height?: number;
  minHeight?: number;
  rotation?: number;
}

export interface FreeformItemStyle {
  linked: boolean;
  phone: FreeformLayout;
  desktop: FreeformLayout;
  zIndex: number;
  opacity: number;
  locked: boolean;
  hidden: boolean;
  text?: string;
  href?: string;
  fontSize?: number;
  fontWeight?: number;
  textAlign?: "left" | "center" | "right";
  color?: string;
  background?: string;
  borderRadius?: number;
  padding?: number;
  overflow?: "visible" | "hidden" | "auto";
  position?: "flow" | "absolute";
}

export type HeroShape =
  | "straight"
  | "curve"
  | "inverted-curve"
  | "wave"
  | "angled"
  | "double-angle"
  | "zigzag"
  | "scallop"
  | "rounded"
  | "asymmetric";

export interface HeaderDeviceStyle {
  minHeight: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  contentGap: number;
  contentWidth: number;
  verticalAlign: "top" | "center" | "bottom";
  textAlign: "left" | "center" | "right";
  brandSize: number;
  titleSize: number;
  kickerSize: number;
  menuSize: number;
}

export interface HeaderStyle {
  linked: boolean;
  phone: HeaderDeviceStyle;
  desktop: HeaderDeviceStyle;
  shape: HeroShape;
  shapeDepth: number;
  shapeOffset: number;
  /** Moves the lower edge independently of the hero content and height. */
  shapePosition: number;
  transitionColor: string;
  backgroundColor: string;
  gradientStart: string;
  gradientEnd: string;
  gradientOpacity: number;
  imageUrl: string;
  imagePosition: string;
  imageScale: number;
  imageOpacity: number;
  imageBlend: "normal" | "multiply" | "overlay" | "soft-light" | "screen";
  overlayColor: string;
  overlayOpacity: number;
  textColor: string;
  kickerColor: string;
  brandColor: string;
  menuColor: string;
  menuBackground: string;
  menuBorderColor: string;
  titleWeight: number;
  titleLetterSpacing: number;
  kickerLetterSpacing: number;
  showBrand: boolean;
  showKicker: boolean;
  showTitle: boolean;
  showMenu: boolean;
  advancedCss: string;
  topOrder: Array<"back" | "brand" | "menu">;
  copyOrder: Array<"kicker" | "title">;
}
