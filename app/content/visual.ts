import type {
  BlockStyle,
  NewsletterContent,
  VisualBlock,
  VisualDocument,
  VisualPageId,
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
    version: 1,
    pages: {
      home: { blocks: nativeBlocks.home.map(nativeBlock) },
      training: { blocks: nativeBlocks.training.map(nativeBlock) },
      results: { blocks: nativeBlocks.results.map(nativeBlock) },
    },
  };
}

function nativeBlock([nativeId, label]: [string, string]): VisualBlock {
  return { id: nativeId, kind: "native", nativeId, label };
}

export function visualDocument(content: NewsletterContent): VisualDocument {
  const fallback = defaultVisualDocument();
  const candidate = content.visual;
  if (!candidate || candidate.version !== 1 || !candidate.pages) return fallback;

  return {
    version: 1,
    pages: {
      home: normalisePage(candidate.pages.home?.blocks, fallback.pages.home.blocks),
      training: normalisePage(candidate.pages.training?.blocks, fallback.pages.training.blocks),
      results: normalisePage(candidate.pages.results?.blocks, fallback.pages.results.blocks),
    },
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
    display: style.hidden ? "none" : undefined,
  };
}

export function withVisualDocument(content: NewsletterContent): NewsletterContent {
  return { ...content, visual: visualDocument(content) };
}
