import type { CSSProperties } from "react";
import { parseRichText, richTextToPlain, type RichText } from "./richtext";
import { BOX_SHADOWS, safeStyleColor } from "../edit/panels/blockStyles";
import { defaultTheme, parseTheme } from "./theme";
import type {
  BlockHighlight,
  BlockStatusItem,
  BlockStyle,
  BlockTableData,
  CustomPageMeta,
  HeaderDeviceStyle,
  HeaderStyle,
  NewsletterContent,
  ResponsiveLayout,
  VisualBlock,
  VisualDocument,
  VisualPageDocument,
  VisualPageId,
  VisualRow,
} from "./types";
import { SYSTEM_PAGE_IDS } from "./types";

type SeedItem = [id: string, label: string];

const pageSeeds: Record<VisualPageId, { items: SeedItem[]; rows: string[][] }> = {
  home: {
    items: [
      ["home-overview-intro", "This week at a glance"],
      ["home-action", "CommercePoint training"],
      ["home-event", "Cow Appreciation Day"],
      ["home-recognition-link", "Celebrate Catye & Richie"],
      ["home-scorecard", "June scorecard"],
      ["home-recognition-heading", "Recognition heading"],
      ["home-recognition-feature", "Team shout-out"],
      ["home-birthday", "Birthday"],
      ["home-anniversaries", "Anniversaries"],
      ["home-events", "Nearby events"],
      ["home-grow", "Grow with us"],
      ["home-footer", "Footer"],
      ["home-signin", "Reader sign-in"],
    ],
    rows: [
      ["home-overview-intro"], ["home-action"], ["home-event", "home-recognition-link"],
      ["home-scorecard"], ["home-recognition-heading"], ["home-recognition-feature"],
      ["home-birthday", "home-anniversaries"], ["home-events"], ["home-grow"], ["home-footer"],
      ["home-signin"],
    ],
  },
  training: {
    items: [
      ["training-intro", "Training overview"], ["training-status", "Training deadlines"],
      ["training-action", "Complete training"], ["training-alert", "Scheduling alert"],
      ["training-covers", "What training covers"], ["training-why", "Why it matters"],
      ["training-help", "Need a hand?"],
    ],
    rows: [["training-intro"], ["training-status"], ["training-action"], ["training-alert"], ["training-covers"], ["training-why"], ["training-help"]],
  },
  results: {
    items: [
      ["results-intro", "Results overview"], ["results-summary", "Goals met"],
      ["results-metric-0", "Overall satisfaction"], ["results-metric-1", "Taste of food"],
      ["results-metric-2", "Speed of service"], ["results-focus", "This month’s focus"],
      ["results-scorecard", "Three-month scorecard"], ["results-momentum", "Momentum note"],
    ],
    rows: [["results-intro"], ["results-summary"], ["results-metric-0", "results-metric-1"], ["results-metric-2"], ["results-focus"], ["results-scorecard"], ["results-momentum"]],
  },
};

const compactPhone: HeaderDeviceStyle = {
  minHeight: 156, paddingTop: 12, paddingRight: 18, paddingBottom: 24, paddingLeft: 18,
  contentGap: 14, contentWidth: 430, verticalAlign: "center", textAlign: "left",
  brandSize: 17, titleSize: 40, kickerSize: 12, menuSize: 44,
};

const compactDesktop: HeaderDeviceStyle = {
  minHeight: 194, paddingTop: 20, paddingRight: 38, paddingBottom: 30, paddingLeft: 38,
  contentGap: 26, contentWidth: 580, verticalAlign: "center", textAlign: "left",
  brandSize: 20, titleSize: 54, kickerSize: 13, menuSize: 46,
};

export function defaultHeader(page: VisualPageId): HeaderStyle {
  return {
    linked: true, phone: { ...compactPhone }, desktop: { ...compactDesktop },
    shape: page === "home" ? "curve" : "angled", shapeDepth: page === "home" ? 18 : 10,
    shapeOffset: 0, shapePosition: 0, transitionColor: "#fbf7ef",
    backgroundColor: page === "home" ? "#d80d37" : "#0d2238",
    gradientStart: page === "home" ? "#d80d37" : "#102a47", gradientEnd: page === "home" ? "#ad0527" : "#0d2238",
    gradientOpacity: 82, imageUrl: page === "home" ? "/images/food-pattern-red.png" : "",
    imagePosition: "center 45%", imageScale: 100, imageOpacity: page === "home" ? 68 : 0,
    imageBlend: "multiply", overlayColor: "#5d0019", overlayOpacity: page === "home" ? 28 : 18,
    textColor: "#ffffff", kickerColor: "#fff7e8", brandColor: "#ffffff", menuColor: "#ffffff",
    menuBackground: "rgba(255,255,255,.08)", menuBorderColor: "rgba(255,255,255,.6)",
    titleWeight: 700, titleLetterSpacing: -1.3, kickerLetterSpacing: 2,
    showBrand: true, showKicker: true, showTitle: page === "home", showMenu: true,
    advancedCss: "", topOrder: ["back", "brand", "menu"], copyOrder: ["kicker", "title"],
  };
}

/**
 * Custom pages have no seed — they start as an empty canvas the editor fills in
 * with freeform blocks, rather than the fixed native sections a system page has.
 */
function defaultPage(page: VisualPageId): VisualPageDocument {
  const seed = pageSeeds[page as keyof typeof pageSeeds] ?? { items: [], rows: [] };
  return {
    items: seed.items.map(([id, label]) => ({ id, kind: "native", nativeId: id, label })),
    rows: seed.rows.map((itemIds, index) => ({ id: `${page}-row-${index + 1}`, itemIds, gap: 16, align: "stretch", keepColumnsOnPhone: false })),
    background: "#fbf7ef", contentWidth: page === "home" ? 760 : 720, minHeight: 0,
    paddingTop: 30, paddingRight: 22, paddingBottom: 46, paddingLeft: 22, rowGap: 22,
  };
}

export function defaultVisualDocument(): VisualDocument {
  return {
    version: 9,
    pages: { home: defaultPage("home"), training: defaultPage("training"), results: defaultPage("results") },
    headers: { home: defaultHeader("home"), training: defaultHeader("training"), results: defaultHeader("results") },
    theme: defaultTheme(),
    richOverrides: {},
    customPages: [],
  };
}

// ---------------------------------------------------------------------------
// Custom pages
// ---------------------------------------------------------------------------

const RESERVED_SLUGS = new Set([
  "", "home", "training", "results", "edit", "api", "images", "fonts",
  "favicon.ico", "sitemap.xml", "robots.txt", "acknowledge", "archive",
]);

/** Lowercase, hyphenated, ASCII-only — safe to drop straight into a URL path. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Appends `-2`, `-3`, ... until the slug is not in `taken`. */
function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "page";
  if (!taken.has(root) && !RESERVED_SLUGS.has(root)) return root;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate) && !RESERVED_SLUGS.has(candidate)) return candidate;
  }
  return `${root}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Builds the metadata for a brand-new custom page with a unique id and slug. */
export function makeCustomPage(title: string, existing: CustomPageMeta[]): CustomPageMeta {
  const taken = new Set(existing.map((page) => page.slug));
  const slug = uniqueSlug(slugify(title) || "page", taken);
  return { id: `page-${crypto.randomUUID()}`, title: shortText(title, "New page"), slug, createdAt: new Date().toISOString() };
}

function isCustomPageMeta(value: unknown): value is CustomPageMeta {
  return Boolean(value && typeof value === "object" && "id" in value && "slug" in value && "title" in value);
}

/** Re-validates slugs on read so a hand-edited or migrated document cannot
 *  collide with a system route or with itself. */
function parseCustomPages(raw: unknown): CustomPageMeta[] {
  if (!Array.isArray(raw)) return [];
  const seenIds = new Set<string>(); const seenSlugs = new Set<string>();
  const out: CustomPageMeta[] = [];
  for (const value of raw) {
    if (!isCustomPageMeta(value)) continue;
    const id = shortText(value.id, "");
    if (!id || seenIds.has(id)) continue;
    const title = shortText(value.title, "Untitled page");
    const slug = uniqueSlug(slugify(value.slug) || slugify(title) || "page", seenSlugs);
    seenIds.add(id); seenSlugs.add(slug);
    out.push({ id, title, slug, createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString() });
  }
  return out.slice(0, 40);
}

const numberIn = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const shortText = (value: unknown, fallback: string) => typeof value === "string" ? value.trim().slice(0, 360) || fallback : fallback;
const shapes = new Set<HeaderStyle["shape"]>(["straight", "curve", "inverted-curve", "wave", "angled", "double-angle", "zigzag", "scallop", "rounded", "asymmetric"]);
const blends = new Set<HeaderStyle["imageBlend"]>(["normal", "multiply", "overlay", "soft-light", "screen"]);
const safeAdvancedProperties = new Set(["box-shadow", "text-shadow", "filter", "backdrop-filter", "opacity", "transform", "background-repeat"]);

function cleanAdvancedCss(value: unknown) {
  if (typeof value !== "string") return "";
  return value.split(";").map((declaration) => {
    const [rawKey, ...rawValue] = declaration.split(":"); const key = rawKey?.trim().toLowerCase(); const next = rawValue.join(":").trim();
    if (!key || !next || !safeAdvancedProperties.has(key) || /url\(|expression/i.test(next)) return "";
    return `${key}: ${next.slice(0, 320)}`;
  }).filter(Boolean).join("; ");
}

function normaliseDevice(value: Partial<HeaderDeviceStyle> | undefined, fallback: HeaderDeviceStyle): HeaderDeviceStyle {
  const source = value ?? {};
  return {
    minHeight: numberIn(source.minHeight, fallback.minHeight, 0, 900), paddingTop: numberIn(source.paddingTop, fallback.paddingTop, 0, 300),
    paddingRight: numberIn(source.paddingRight, fallback.paddingRight, 0, 300), paddingBottom: numberIn(source.paddingBottom, fallback.paddingBottom, 0, 300),
    paddingLeft: numberIn(source.paddingLeft, fallback.paddingLeft, 0, 300), contentGap: numberIn(source.contentGap, fallback.contentGap, 0, 240),
    contentWidth: numberIn(source.contentWidth, fallback.contentWidth, 120, 1100),
    verticalAlign: source.verticalAlign === "top" || source.verticalAlign === "bottom" || source.verticalAlign === "center" ? source.verticalAlign : fallback.verticalAlign,
    textAlign: source.textAlign === "left" || source.textAlign === "right" || source.textAlign === "center" ? source.textAlign : fallback.textAlign,
    brandSize: numberIn(source.brandSize, fallback.brandSize, 0, 80), titleSize: numberIn(source.titleSize, fallback.titleSize, 12, 160),
    kickerSize: numberIn(source.kickerSize, fallback.kickerSize, 8, 60), menuSize: numberIn(source.menuSize, fallback.menuSize, 32, 100),
  };
}

function normaliseHeader(value: HeaderStyle | undefined, fallback: HeaderStyle): HeaderStyle {
  if (!value || typeof value !== "object") return fallback;
  return {
    ...fallback, ...value, linked: typeof value.linked === "boolean" ? value.linked : fallback.linked,
    phone: normaliseDevice(value.phone, fallback.phone), desktop: normaliseDevice(value.desktop, fallback.desktop),
    shape: shapes.has(value.shape) ? value.shape : fallback.shape, shapeDepth: numberIn(value.shapeDepth, fallback.shapeDepth, 0, 180),
    shapeOffset: numberIn(value.shapeOffset, fallback.shapeOffset, -240, 240), shapePosition: numberIn(value.shapePosition, fallback.shapePosition, -180, 180),
    transitionColor: shortText(value.transitionColor, fallback.transitionColor), backgroundColor: shortText(value.backgroundColor, fallback.backgroundColor),
    gradientStart: shortText(value.gradientStart, fallback.gradientStart), gradientEnd: shortText(value.gradientEnd, fallback.gradientEnd),
    gradientOpacity: numberIn(value.gradientOpacity, fallback.gradientOpacity, 0, 100), imageUrl: shortText(value.imageUrl, ""),
    imagePosition: shortText(value.imagePosition, fallback.imagePosition), imageScale: numberIn(value.imageScale, fallback.imageScale, 10, 300),
    imageOpacity: numberIn(value.imageOpacity, fallback.imageOpacity, 0, 100), imageBlend: blends.has(value.imageBlend) ? value.imageBlend : fallback.imageBlend,
    overlayColor: shortText(value.overlayColor, fallback.overlayColor), overlayOpacity: numberIn(value.overlayOpacity, fallback.overlayOpacity, 0, 100),
    textColor: shortText(value.textColor, fallback.textColor), kickerColor: shortText(value.kickerColor, fallback.kickerColor),
    brandColor: shortText(value.brandColor, fallback.brandColor), menuColor: shortText(value.menuColor, fallback.menuColor),
    menuBackground: shortText(value.menuBackground, fallback.menuBackground), menuBorderColor: shortText(value.menuBorderColor, fallback.menuBorderColor),
    titleWeight: numberIn(value.titleWeight, fallback.titleWeight, 100, 900), titleLetterSpacing: numberIn(value.titleLetterSpacing, fallback.titleLetterSpacing, -10, 20),
    kickerLetterSpacing: numberIn(value.kickerLetterSpacing, fallback.kickerLetterSpacing, -2, 20),
    showBrand: typeof value.showBrand === "boolean" ? value.showBrand : fallback.showBrand, showKicker: typeof value.showKicker === "boolean" ? value.showKicker : fallback.showKicker,
    showTitle: typeof value.showTitle === "boolean" ? value.showTitle : fallback.showTitle, showMenu: typeof value.showMenu === "boolean" ? value.showMenu : fallback.showMenu,
    advancedCss: cleanAdvancedCss(value.advancedCss),
    topOrder: Array.isArray(value.topOrder) ? value.topOrder.filter((item): item is "back" | "brand" | "menu" => item === "back" || item === "brand" || item === "menu") : fallback.topOrder,
    copyOrder: Array.isArray(value.copyOrder) ? value.copyOrder.filter((item): item is "kicker" | "title" => item === "kicker" || item === "title") : fallback.copyOrder,
  };
}

function isBlock(value: unknown): value is VisualBlock {
  return Boolean(value && typeof value === "object" && "id" in value && "kind" in value && "label" in value);
}

function normaliseLayout(value: ResponsiveLayout | undefined): ResponsiveLayout | undefined {
  if (!value) return undefined;
  return {
    width: typeof value.width === "number" ? numberIn(value.width, 100, 10, 100) : undefined,
    minHeight: typeof value.minHeight === "number" ? numberIn(value.minHeight, 0, 0, 1600) : undefined,
    paddingTop: typeof value.paddingTop === "number" ? numberIn(value.paddingTop, 0, 0, 240) : undefined,
    paddingRight: typeof value.paddingRight === "number" ? numberIn(value.paddingRight, 0, 0, 240) : undefined,
    paddingBottom: typeof value.paddingBottom === "number" ? numberIn(value.paddingBottom, 0, 0, 240) : undefined,
    paddingLeft: typeof value.paddingLeft === "number" ? numberIn(value.paddingLeft, 0, 0, 240) : undefined,
    marginTop: typeof value.marginTop === "number" ? numberIn(value.marginTop, 0, -80, 240) : undefined,
    marginBottom: typeof value.marginBottom === "number" ? numberIn(value.marginBottom, 0, -80, 240) : undefined,
    align: value.align === "left" || value.align === "center" || value.align === "right" || value.align === "stretch" ? value.align : undefined,
    nudgeX: typeof value.nudgeX === "number" ? numberIn(value.nudgeX, 0, -48, 48) : undefined,
    nudgeY: typeof value.nudgeY === "number" ? numberIn(value.nudgeY, 0, -48, 48) : undefined,
  };
}

/**
 * v6 -> v7: freeform blocks stored `title`/`body` as plain strings. Rich text is
 * derived from those strings the first time a v6 document is read, so existing
 * drafts and published issues gain formatting support without a data backfill —
 * and the plain fields stay in sync so nothing that reads them breaks.
 */
function withRichText(block: VisualBlock): VisualBlock {
  if (block.kind === "native") return block;
  const next = { ...block };
  const upgrade = (rich: RichText | undefined, plain: string | undefined): RichText | undefined => {
    if (!rich && !plain) return undefined;
    return parseRichText(rich, plain ?? "");
  };
  const richTitle = upgrade(block.richTitle, block.title);
  const richBody = upgrade(block.richBody, block.body);
  if (richTitle) { next.richTitle = richTitle; next.title = richTextToPlain(richTitle); }
  else { delete next.richTitle; }
  if (richBody) { next.richBody = richBody; next.body = richTextToPlain(richBody); }
  else { delete next.richBody; }
  return next;
}

const MAX_TABLE_COLUMNS = 6;
const MAX_TABLE_ROWS = 30;
const MAX_STATUS_ITEMS = 30;

function normaliseTableData(value: unknown, fallback?: BlockTableData): BlockTableData | undefined {
  if (!value || typeof value !== "object") return fallback;
  const source = value as Partial<BlockTableData>;
  const columns = Array.isArray(source.columns) ? source.columns.map((column) => shortText(column, "")).slice(0, MAX_TABLE_COLUMNS) : fallback?.columns ?? ["Column"];
  const rows = Array.isArray(source.rows) ? source.rows.slice(0, MAX_TABLE_ROWS).map((row) => ({
    label: shortText((row as { label?: unknown })?.label, ""),
    values: Array.isArray((row as { values?: unknown })?.values) ? (row as { values: unknown[] }).values.map((cell) => shortText(cell, "")).slice(0, MAX_TABLE_COLUMNS) : [],
  })) : fallback?.rows ?? [];
  return { columns, rows };
}

function normaliseStatusItems(value: unknown, fallback?: BlockStatusItem[]): BlockStatusItem[] | undefined {
  if (!Array.isArray(value)) return fallback;
  return value.slice(0, MAX_STATUS_ITEMS).map((item) => {
    const source = (item ?? {}) as Partial<BlockStatusItem>;
    return {
      token: shortText(source.token, "•"), tokenRed: Boolean(source.tokenRed),
      label: shortText(source.label, ""), strongPrefix: shortText(source.strongPrefix, ""), strongEmphasis: shortText(source.strongEmphasis, ""),
    };
  });
}

const HIGHLIGHT_TONES = new Set<BlockHighlight["tone"]>(["green", "red", "navy"]);
function normaliseHighlight(value: unknown, fallback?: BlockHighlight): BlockHighlight | undefined {
  if (!value || typeof value !== "object") return fallback;
  const source = value as Partial<BlockHighlight>;
  return {
    value: shortText(source.value, "0"), unit: shortText(source.unit, ""), label: shortText(source.label, ""),
    tone: HIGHLIGHT_TONES.has(source.tone as BlockHighlight["tone"]) ? (source.tone as BlockHighlight["tone"]) : "navy",
  };
}

function normaliseBlock(block: VisualBlock): VisualBlock {
  const style = block.style ? {
    ...block.style,
    // Colours end up in an inline style attribute; anything unrecognised is
    // dropped rather than forwarded to the published page.
    background: safeStyleColor(block.style.background),
    color: safeStyleColor(block.style.color),
    borderColor: safeStyleColor(block.style.borderColor),
    shadow: typeof block.style.shadow === "string" && block.style.shadow in BOX_SHADOWS ? block.style.shadow : undefined,
    phone: normaliseLayout(block.style.phone),
    desktop: normaliseLayout(block.style.desktop),
  } : undefined;
  const next = withRichText({ ...block, id: shortText(block.id, crypto.randomUUID()), label: shortText(block.label, "Untitled item"), style });
  if (block.kind === "table") next.tableData = normaliseTableData(block.tableData, { columns: ["Column"], rows: [] });
  else delete next.tableData;
  if (block.kind === "status-list") next.statusItems = normaliseStatusItems(block.statusItems, []);
  else delete next.statusItems;
  if (block.kind === "highlight") next.highlight = normaliseHighlight(block.highlight, { value: "0", unit: "", label: "", tone: "navy" });
  else delete next.highlight;
  return next;
}

function normaliseRow(value: VisualRow, validIds: Set<string>, fallbackId: string): VisualRow | null {
  const itemIds = Array.isArray(value.itemIds) ? value.itemIds.filter((id) => validIds.has(id)).slice(0, 2) : [];
  if (!itemIds.length) return null;
  return { id: shortText(value.id, fallbackId), itemIds, gap: numberIn(value.gap, 16, 0, 96), align: value.align === "start" || value.align === "center" || value.align === "end" || value.align === "stretch" ? value.align : "stretch", keepColumnsOnPhone: Boolean(value.keepColumnsOnPhone) };
}

function migratePage(page: VisualPageId, incoming: unknown, fallback: VisualPageDocument): VisualPageDocument {
  const source = incoming && typeof incoming === "object" ? incoming as Record<string, unknown> : {};
  const rawItems = Array.isArray(source.items) ? source.items.filter(isBlock) : Array.isArray(source.blocks) ? source.blocks.filter(isBlock) : [];
  const currentNative = new Map(rawItems.filter((item) => item.kind === "native").map((item) => [item.nativeId ?? item.id, item]));
  const items = fallback.items.map((seed) => normaliseBlock({ ...seed, ...(currentNative.get(seed.nativeId ?? seed.id)?.style ? { style: currentNative.get(seed.nativeId ?? seed.id)?.style } : {}) }));
  for (const block of rawItems.filter((item) => item.kind !== "native")) items.push(normaliseBlock(block));
  const validIds = new Set(items.map((item) => item.id));
  const rawRows = Array.isArray(source.rows) ? source.rows as VisualRow[] : [];
  let rows = rawRows.map((row, index) => normaliseRow(row, validIds, `${page}-row-${index + 1}`)).filter((row): row is VisualRow => Boolean(row));
  if (!rows.length) rows = fallback.rows.map((row) => ({ ...row, itemIds: [...row.itemIds] }));
  const placed = new Set(rows.flatMap((row) => row.itemIds));
  for (const item of items) if (!placed.has(item.id)) rows.push({ id: `${page}-row-${rows.length + 1}-${item.id}`, itemIds: [item.id], gap: 16, align: "stretch", keepColumnsOnPhone: false });
  return {
    items, rows, background: shortText(source.background, fallback.background),
    contentWidth: numberIn(source.contentWidth, fallback.contentWidth, 320, 1400), minHeight: numberIn(source.minHeight, fallback.minHeight, 0, 12000),
    paddingTop: numberIn(source.paddingTop, fallback.paddingTop, 0, 240), paddingRight: numberIn(source.paddingRight, fallback.paddingRight, 0, 240),
    paddingBottom: numberIn(source.paddingBottom, fallback.paddingBottom, 0, 240), paddingLeft: numberIn(source.paddingLeft, fallback.paddingLeft, 0, 240),
    rowGap: numberIn(source.rowGap, fallback.rowGap, 0, 160),
  };
}

/** Normalises the override map, dropping anything that is not usable. */
function parseRichOverrides(raw: unknown): Record<string, RichText> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, RichText> = {};
  for (const [path, value] of Object.entries(raw as Record<string, unknown>)) {
    // Paths address real content fields; anything exotic is discarded rather
    // than trusted into the published page.
    if (!/^[a-zA-Z0-9_.]{1,120}$/.test(path)) continue;
    const doc = parseRichText(value);
    if (doc.blocks.some((block) => block.spans.length)) out[path] = doc;
  }
  return out;
}

export function visualDocument(content: NewsletterContent): VisualDocument {
  const fallback = defaultVisualDocument(); const candidate = content.visual as unknown as Record<string, unknown> | undefined;
  if (!candidate || !candidate.pages) return fallback;
  const pages = candidate.pages as Partial<Record<VisualPageId, unknown>>;
  const headers = candidate.headers as Partial<Record<VisualPageId, HeaderStyle>> | undefined;
  const customPages = parseCustomPages(candidate.customPages);
  // The three system pages always exist; custom pages are whatever the editor
  // has created. Both are migrated the same way — a custom page's "fallback" is
  // simply an empty canvas rather than one of the seeded layouts.
  const allIds: VisualPageId[] = [...SYSTEM_PAGE_IDS, ...customPages.map((page) => page.id)];
  const migratedPages: Record<VisualPageId, VisualPageDocument> = {};
  const migratedHeaders: Record<VisualPageId, HeaderStyle> = {};
  for (const id of allIds) {
    const fallbackPage = fallback.pages[id] ?? defaultPage(id);
    const fallbackHeader = fallback.headers[id] ?? defaultHeader(id);
    migratedPages[id] = migratePage(id, pages[id], fallbackPage);
    migratedHeaders[id] = normaliseHeader(headers?.[id], fallbackHeader);
  }
  return {
    version: 9,
    pages: migratedPages,
    headers: migratedHeaders,
    // v7 -> v8: documents saved before the theme existed adopt the brand
    // defaults, so nothing needs rebuilding by hand.
    theme: parseTheme(candidate.theme),
    // v8 -> v9: documents without overrides simply have none, and every native
    // field keeps rendering its plain string until someone formats it.
    richOverrides: parseRichOverrides(candidate.richOverrides),
    customPages,
  };
}

/** Adds a new custom page (empty canvas) and returns its metadata for callers
 *  that also need to add a nav link or select the new page. */
export function addCustomPage(doc: VisualDocument, title: string): CustomPageMeta {
  const meta = makeCustomPage(title, doc.customPages);
  doc.customPages.push(meta);
  doc.pages[meta.id] = defaultPage(meta.id);
  doc.headers[meta.id] = defaultHeader(meta.id);
  return meta;
}

export function renameCustomPage(doc: VisualDocument, id: string, title: string): void {
  const meta = doc.customPages.find((page) => page.id === id);
  if (meta) meta.title = shortText(title, meta.title);
}

/** Removes a custom page's metadata and its stored blocks/header. */
export function removeCustomPage(doc: VisualDocument, id: string): void {
  doc.customPages = doc.customPages.filter((page) => page.id !== id);
  delete doc.pages[id];
  delete doc.headers[id];
}

export function styleForBlock(style?: BlockStyle): CSSProperties | undefined {
  if (!style) return undefined; const px = (value: number | undefined) => typeof value === "number" ? `${value}px` : undefined;
  return {
    backgroundColor: safeStyleColor(style.background), color: safeStyleColor(style.color), borderColor: safeStyleColor(style.borderColor),
    borderWidth: px(style.borderWidth), borderStyle: style.borderWidth ? "solid" : undefined, borderRadius: px(style.borderRadius),
    boxShadow: style.shadow && style.shadow in BOX_SHADOWS ? BOX_SHADOWS[style.shadow] : undefined,
    fontSize: px(style.fontSize), fontWeight: style.fontWeight, textAlign: style.textAlign, maxWidth: px(style.maxWidth), display: style.hidden ? "none" : undefined,
    "--item-phone-width": style.phone?.width ? `${style.phone.width}%` : undefined,
    "--item-desktop-width": style.desktop?.width ? `${style.desktop.width}%` : undefined,
    "--item-phone-min-height": px(style.phone?.minHeight), "--item-desktop-min-height": px(style.desktop?.minHeight),
    "--item-phone-padding-top": px(style.phone?.paddingTop ?? style.paddingTop), "--item-phone-padding-right": px(style.phone?.paddingRight ?? style.paddingRight),
    "--item-phone-padding-bottom": px(style.phone?.paddingBottom ?? style.paddingBottom), "--item-phone-padding-left": px(style.phone?.paddingLeft ?? style.paddingLeft),
    "--item-desktop-padding-top": px(style.desktop?.paddingTop ?? style.paddingTop), "--item-desktop-padding-right": px(style.desktop?.paddingRight ?? style.paddingRight),
    "--item-desktop-padding-bottom": px(style.desktop?.paddingBottom ?? style.paddingBottom), "--item-desktop-padding-left": px(style.desktop?.paddingLeft ?? style.paddingLeft),
    "--item-phone-margin-top": px(style.phone?.marginTop ?? style.marginTop), "--item-phone-margin-bottom": px(style.phone?.marginBottom ?? style.marginBottom),
    "--item-desktop-margin-top": px(style.desktop?.marginTop ?? style.marginTop), "--item-desktop-margin-bottom": px(style.desktop?.marginBottom ?? style.marginBottom),
    "--item-phone-nudge-x": px(style.phone?.nudgeX), "--item-phone-nudge-y": px(style.phone?.nudgeY),
    "--item-desktop-nudge-x": px(style.desktop?.nudgeX), "--item-desktop-nudge-y": px(style.desktop?.nudgeY),
  } as CSSProperties;
}

export function withVisualDocument(content: NewsletterContent): NewsletterContent { return { ...content, visual: visualDocument(content) }; }
