// Structured content model for the newsletter. Every user-facing string that
// used to be hard-coded in the page components now lives here so the editor can
// change it without touching layout code. The shapes intentionally mirror the
// existing JSX structure (including split fields for emphasized fragments) so
// the rendered output stays byte-for-byte identical to the original pages.

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

export interface HeadlineMetric {
  label: string;
  value: string;
  goal: string;
  status: string;
  positive: boolean;
}

export interface ScorecardRow {
  label: string;
  goal: string;
  april: string;
  may: string;
  june: string;
}

export interface ResultsContent {
  eyebrow: string;
  heading: string;
  lead: string;
  summaryAria: string;
  summaryValue: string;
  summaryUnit: string;
  summaryLabel: string;
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
  };
}

export interface SharedContent {
  brandName: string;
  brandTagline: string;
  navHeading: string;
  navLinks: LinkContent[];
  detailBackLabel: string;
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
  | "image"
  | "button"
  | "divider"
  | "container";

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
  hidden?: boolean;
}

export interface VisualBlock {
  id: string;
  kind: VisualBlockKind;
  label: string;
  style?: BlockStyle;
  nativeId?: string;
  title?: string;
  body?: string;
  href?: string;
  imageUrl?: string;
  alt?: string;
}

export interface VisualPageDocument {
  blocks: VisualBlock[];
}

export interface VisualDocument {
  version: 1;
  pages: Record<VisualPageId, VisualPageDocument>;
}
