import type {
  BlockStyle,
  NewsletterContent,
  VisualBlock,
  VisualDocument,
  VisualPageId,
  HeaderDeviceStyle,
  HeaderStyle,
} from "./types";
import type { CSSProperties } from "react";

const nativeBlocks: Record<VisualPageId, Array<[string, string]>> = {
  home: [
    ["home-overview", "This week at a glance"],
    ["home-scorecard", "June scorecard"],
    ["home-recognition", "Recognition"],
    ["home-events", "Nearby events"],
    ["home-grow", "Grow with us"],
  ],
  training: [
    ["training-intro", "Training overview"],
    ["training-status", "Training deadlines"],
    ["training-action", "Training action"],
    ["training-alert", "Scheduling alert"],
    ["training-covers", "What training covers"],
    ["training-why", "Why it matters"],
    ["training-help", "Need a hand?"],
  ],
  results: [
    ["results-intro", "Results overview"],
    ["results-summary", "Goals met"],
    ["results-metrics", "Headline metrics"],
    ["results-focus", "This month’s focus"],
    ["results-scorecard", "Three-month scorecard"],
    ["results-momentum", "Momentum note"],
  ],
};

export function defaultVisualDocument(): VisualDocument {
  return {
    version: 2,
    pages: {
      home: { blocks: nativeBlocks.home.map(nativeBlock) },
      training: { blocks: nativeBlocks.training.map(nativeBlock) },
      results: { blocks: nativeBlocks.results.map(nativeBlock) },
    },
    headers: {
      home: defaultHeader("home"),
      training: defaultHeader("training"),
      results: defaultHeader("results"),
    },
  };
}

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
    linked: true,
    phone: { ...compactPhone },
    desktop: { ...compactDesktop },
    shape: page === "home" ? "curve" : "angled",
    shapeDepth: page === "home" ? 18 : 10,
    shapeOffset: 0,
    transitionColor: "#fbf7ef",
    backgroundColor: page === "home" ? "#d80d37" : "#0d2238",
    gradientStart: page === "home" ? "#d80d37" : "#102a47",
    gradientEnd: page === "home" ? "#ad0527" : "#0d2238",
    gradientOpacity: 82,
    imageUrl: page === "home" ? "/images/food-pattern-red.png" : "",
    imagePosition: "center 45%",
    imageScale: 100,
    imageOpacity: page === "home" ? 68 : 0,
    imageBlend: "multiply",
    overlayColor: "#5d0019",
    overlayOpacity: page === "home" ? 28 : 18,
    textColor: "#ffffff",
    kickerColor: "#fff7e8",
    brandColor: "#ffffff",
    menuColor: "#ffffff",
    menuBackground: "rgba(255,255,255,.08)",
    menuBorderColor: "rgba(255,255,255,.6)",
    titleWeight: 700,
    titleLetterSpacing: -1.3,
    kickerLetterSpacing: 2,
    showBrand: true,
    showKicker: true,
    showTitle: page === "home",
    showMenu: true,
    advancedCss: "",
    topOrder: ["back", "brand", "menu"],
    copyOrder: ["kicker", "title"],
  };
}

function nativeBlock([nativeId, label]: [string, string]): VisualBlock {
  return { id: nativeId, kind: "native", nativeId, label };
}

export function visualDocument(content: NewsletterContent): VisualDocument {
  const fallback = defaultVisualDocument();
  const candidate = content.visual;
  if (!candidate || !candidate.pages) return fallback;

  return {
    version: 2,
    pages: {
      home: normalisePage(candidate.pages.home?.blocks, fallback.pages.home.blocks),
      training: normalisePage(candidate.pages.training?.blocks, fallback.pages.training.blocks),
      results: normalisePage(candidate.pages.results?.blocks, fallback.pages.results.blocks),
    },
    headers: {
      home: normaliseHeader(candidate.headers?.home, fallback.headers.home),
      training: normaliseHeader(candidate.headers?.training, fallback.headers.training),
      results: normaliseHeader(candidate.headers?.results, fallback.headers.results),
    },
  };
}

const shapes = new Set<HeaderStyle["shape"]>(["straight", "curve", "inverted-curve", "wave", "angled", "double-angle", "zigzag", "scallop", "rounded", "asymmetric"]);
const blends = new Set<HeaderStyle["imageBlend"]>(["normal", "multiply", "overlay", "soft-light", "screen"]);
const safeAdvancedProperties = new Set(["box-shadow", "text-shadow", "filter", "backdrop-filter", "opacity", "transform", "background-repeat"]);

const numberIn = (value: unknown, fallback: number, min: number, max: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
const shortText = (value: unknown, fallback: string) => typeof value === "string" ? value.trim().slice(0, 360) || fallback : fallback;

function cleanAdvancedCss(value: unknown) {
  if (typeof value !== "string") return "";
  return value.split(";").map((declaration) => {
    const [rawKey, ...rawValue] = declaration.split(":");
    const key = rawKey?.trim().toLowerCase();
    const next = rawValue.join(":").trim();
    if (!key || !next || !safeAdvancedProperties.has(key) || /url\(|expression/i.test(next)) return "";
    return `${key}: ${next.slice(0, 320)}`;
  }).filter(Boolean).join("; ");
}

function normaliseDevice(value: Partial<HeaderDeviceStyle> | undefined, fallback: HeaderDeviceStyle): HeaderDeviceStyle {
  const source = value ?? {};
  return {
    minHeight: numberIn(source.minHeight, fallback.minHeight, 0, 900),
    paddingTop: numberIn(source.paddingTop, fallback.paddingTop, 0, 300),
    paddingRight: numberIn(source.paddingRight, fallback.paddingRight, 0, 300),
    paddingBottom: numberIn(source.paddingBottom, fallback.paddingBottom, 0, 300),
    paddingLeft: numberIn(source.paddingLeft, fallback.paddingLeft, 0, 300),
    contentGap: numberIn(source.contentGap, fallback.contentGap, 0, 240),
    contentWidth: numberIn(source.contentWidth, fallback.contentWidth, 120, 1100),
    verticalAlign: source.verticalAlign === "top" || source.verticalAlign === "bottom" || source.verticalAlign === "center" ? source.verticalAlign : fallback.verticalAlign,
    textAlign: source.textAlign === "left" || source.textAlign === "right" || source.textAlign === "center" ? source.textAlign : fallback.textAlign,
    brandSize: numberIn(source.brandSize, fallback.brandSize, 0, 80),
    titleSize: numberIn(source.titleSize, fallback.titleSize, 12, 160),
    kickerSize: numberIn(source.kickerSize, fallback.kickerSize, 8, 60),
    menuSize: numberIn(source.menuSize, fallback.menuSize, 32, 100),
  };
}

function normaliseHeader(value: HeaderStyle | undefined, fallback: HeaderStyle): HeaderStyle {
  if (!value || typeof value !== "object") return fallback;
  return {
    ...fallback,
    ...value,
    linked: typeof value.linked === "boolean" ? value.linked : fallback.linked,
    phone: normaliseDevice(value.phone, fallback.phone),
    desktop: normaliseDevice(value.desktop, fallback.desktop),
    shape: shapes.has(value.shape) ? value.shape : fallback.shape,
    shapeDepth: numberIn(value.shapeDepth, fallback.shapeDepth, 0, 180),
    shapeOffset: numberIn(value.shapeOffset, fallback.shapeOffset, -240, 240),
    transitionColor: shortText(value.transitionColor, fallback.transitionColor),
    backgroundColor: shortText(value.backgroundColor, fallback.backgroundColor),
    gradientStart: shortText(value.gradientStart, fallback.gradientStart),
    gradientEnd: shortText(value.gradientEnd, fallback.gradientEnd),
    gradientOpacity: numberIn(value.gradientOpacity, fallback.gradientOpacity, 0, 100),
    imageUrl: shortText(value.imageUrl, ""),
    imagePosition: shortText(value.imagePosition, fallback.imagePosition),
    imageScale: numberIn(value.imageScale, fallback.imageScale, 10, 300),
    imageOpacity: numberIn(value.imageOpacity, fallback.imageOpacity, 0, 100),
    imageBlend: blends.has(value.imageBlend) ? value.imageBlend : fallback.imageBlend,
    overlayColor: shortText(value.overlayColor, fallback.overlayColor),
    overlayOpacity: numberIn(value.overlayOpacity, fallback.overlayOpacity, 0, 100),
    textColor: shortText(value.textColor, fallback.textColor),
    kickerColor: shortText(value.kickerColor, fallback.kickerColor),
    brandColor: shortText(value.brandColor, fallback.brandColor),
    menuColor: shortText(value.menuColor, fallback.menuColor),
    menuBackground: shortText(value.menuBackground, fallback.menuBackground),
    menuBorderColor: shortText(value.menuBorderColor, fallback.menuBorderColor),
    titleWeight: numberIn(value.titleWeight, fallback.titleWeight, 100, 900),
    titleLetterSpacing: numberIn(value.titleLetterSpacing, fallback.titleLetterSpacing, -10, 20),
    kickerLetterSpacing: numberIn(value.kickerLetterSpacing, fallback.kickerLetterSpacing, -2, 20),
    showBrand: typeof value.showBrand === "boolean" ? value.showBrand : fallback.showBrand,
    showKicker: typeof value.showKicker === "boolean" ? value.showKicker : fallback.showKicker,
    showTitle: typeof value.showTitle === "boolean" ? value.showTitle : fallback.showTitle,
    showMenu: typeof value.showMenu === "boolean" ? value.showMenu : fallback.showMenu,
    advancedCss: cleanAdvancedCss(value.advancedCss),
    topOrder: Array.isArray(value.topOrder) ? value.topOrder.filter((item): item is "back" | "brand" | "menu" => item === "back" || item === "brand" || item === "menu") : fallback.topOrder,
    copyOrder: Array.isArray(value.copyOrder) ? value.copyOrder.filter((item): item is "kicker" | "title" => item === "kicker" || item === "title") : fallback.copyOrder,
  };
}

function normalisePage(
  incoming: VisualBlock[] | undefined,
  fallback: VisualBlock[],
): { blocks: VisualBlock[] } {
  const blocks = Array.isArray(incoming) ? incoming.filter(isVisualBlock) : [];
  const seen = new Set(blocks.filter((block) => block.kind === "native").map((block) => block.nativeId));
  return {
    blocks: [
      ...blocks,
      ...fallback.filter((block) => !seen.has(block.nativeId)),
    ],
  };
}

function isVisualBlock(value: unknown): value is VisualBlock {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "kind" in value &&
      "label" in value,
  );
}

export function styleForBlock(style?: BlockStyle): CSSProperties | undefined {
  if (!style) return undefined;
  const px = (value: number | undefined) => (typeof value === "number" ? `${value}px` : undefined);
  return {
    paddingTop: px(style.paddingTop),
    paddingRight: px(style.paddingRight),
    paddingBottom: px(style.paddingBottom),
    paddingLeft: px(style.paddingLeft),
    marginTop: px(style.marginTop),
    marginBottom: px(style.marginBottom),
    "--block-padding-top": px(style.paddingTop),
    "--block-padding-right": px(style.paddingRight),
    "--block-padding-bottom": px(style.paddingBottom),
    "--block-padding-left": px(style.paddingLeft),
    "--block-margin-top": px(style.marginTop),
    "--block-margin-bottom": px(style.marginBottom),
    backgroundColor: style.background || undefined,
    color: style.color || undefined,
    borderColor: style.borderColor || undefined,
    borderWidth: px(style.borderWidth),
    borderStyle: style.borderWidth ? "solid" : undefined,
    borderRadius: px(style.borderRadius),
    fontSize: px(style.fontSize),
    fontWeight: style.fontWeight,
    textAlign: style.textAlign,
    maxWidth: px(style.maxWidth),
    "--block-phone-width": style.phone?.width ? `${style.phone.width}%` : undefined,
    "--block-phone-min-height": px(style.phone?.minHeight),
    "--block-phone-padding-top": px(style.phone?.paddingTop),
    "--block-phone-padding-right": px(style.phone?.paddingRight),
    "--block-phone-padding-bottom": px(style.phone?.paddingBottom),
    "--block-phone-padding-left": px(style.phone?.paddingLeft),
    "--block-phone-margin-top": px(style.phone?.marginTop),
    "--block-phone-margin-bottom": px(style.phone?.marginBottom),
    "--block-phone-align": style.phone?.align,
    "--block-desktop-width": style.desktop?.width ? `${style.desktop.width}%` : undefined,
    "--block-desktop-min-height": px(style.desktop?.minHeight),
    "--block-desktop-padding-top": px(style.desktop?.paddingTop),
    "--block-desktop-padding-right": px(style.desktop?.paddingRight),
    "--block-desktop-padding-bottom": px(style.desktop?.paddingBottom),
    "--block-desktop-padding-left": px(style.desktop?.paddingLeft),
    "--block-desktop-margin-top": px(style.desktop?.marginTop),
    "--block-desktop-margin-bottom": px(style.desktop?.marginBottom),
    "--block-desktop-align": style.desktop?.align,
    display: style.hidden ? "none" : undefined,
  } as CSSProperties;
}

export function withVisualDocument(content: NewsletterContent): NewsletterContent {
  return { ...content, visual: visualDocument(content) };
}
