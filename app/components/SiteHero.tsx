import Link from "next/link";
import type { CSSProperties } from "react";
import type { NewsletterContent, VisualPageId } from "../content/types";
import { visualDocument } from "../content/visual";
import { SiteMenu } from "./SiteMenu";
import type { CanvasEditorState } from "./PageBlocks";

type HeroVars = CSSProperties & Record<`--${string}`, string | number>;

function colorWithOpacity(color: string, opacity: number) {
  const trimmed = color.trim();
  const short = /^#([\da-f])([\da-f])([\da-f])$/i.exec(trimmed);
  const full = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(trimmed);
  if (short) return `rgb(${parseInt(short[1] + short[1], 16)} ${parseInt(short[2] + short[2], 16)} ${parseInt(short[3] + short[3], 16)} / ${opacity})`;
  if (full) return `rgb(${parseInt(full[1], 16)} ${parseInt(full[2], 16)} ${parseInt(full[3], 16)} / ${opacity})`;
  return trimmed;
}

function safeCss(value: string): CSSProperties {
  const allowed = new Set(["box-shadow", "text-shadow", "filter", "backdrop-filter", "opacity", "transform", "background-repeat"]);
  const style: Record<string, string> = {};
  for (const declaration of value.split(";")) {
    const [rawKey, ...rawValue] = declaration.split(":");
    const key = rawKey?.trim().toLowerCase();
    const next = rawValue.join(":").trim();
    if (!key || !next || !allowed.has(key) || next.includes("url(") || next.includes("expression")) continue;
    const camel = key.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
    style[camel] = next;
  }
  return style as CSSProperties;
}

function safeImageUrl(value: string) {
  const url = value.trim();
  if (/^(https?:\/\/|\/|data:image\/)/i.test(url) && !/["'()\\]/.test(url)) return url;
  return "";
}

export function SiteHero({
  page,
  content,
  title,
  kicker,
  editor,
  detail = false,
}: {
  page: VisualPageId;
  content: NewsletterContent;
  title: string;
  kicker: string;
  editor?: CanvasEditorState;
  detail?: boolean;
}) {
  const { shared } = content;
  const header = visualDocument(content).headers[page];
  const imageUrl = safeImageUrl(header.imageUrl);
  const activeId = `hero-${page}`;
  const justify = (value: "left" | "center" | "right") => value === "left" ? "start" : value === "right" ? "end" : "center";
  const vertical = (value: "top" | "center" | "bottom") => value === "top" ? "start" : value === "bottom" ? "end" : "center";
  const vars: HeroVars = {
    "--hero-min-height": `${header.phone.minHeight}px`,
    "--hero-padding-top": `${header.phone.paddingTop}px`,
    "--hero-padding-right": `${header.phone.paddingRight}px`,
    "--hero-padding-bottom": `${header.phone.paddingBottom}px`,
    "--hero-padding-left": `${header.phone.paddingLeft}px`,
    "--hero-content-gap": `${header.phone.contentGap}px`,
    "--hero-content-width": `${header.phone.contentWidth}px`,
    "--hero-brand-size": `${header.phone.brandSize}px`,
    "--hero-title-size": `${header.phone.titleSize}px`,
    "--hero-kicker-size": `${header.phone.kickerSize}px`,
    "--hero-menu-size": `${header.phone.menuSize}px`,
    "--hero-desktop-min-height": `${header.desktop.minHeight}px`,
    "--hero-desktop-padding-top": `${header.desktop.paddingTop}px`,
    "--hero-desktop-padding-right": `${header.desktop.paddingRight}px`,
    "--hero-desktop-padding-bottom": `${header.desktop.paddingBottom}px`,
    "--hero-desktop-padding-left": `${header.desktop.paddingLeft}px`,
    "--hero-desktop-content-gap": `${header.desktop.contentGap}px`,
    "--hero-desktop-content-width": `${header.desktop.contentWidth}px`,
    "--hero-desktop-brand-size": `${header.desktop.brandSize}px`,
    "--hero-desktop-title-size": `${header.desktop.titleSize}px`,
    "--hero-desktop-kicker-size": `${header.desktop.kickerSize}px`,
    "--hero-desktop-menu-size": `${header.desktop.menuSize}px`,
    "--hero-content-align": header.phone.textAlign,
    "--hero-content-justify": justify(header.phone.textAlign),
    "--hero-desktop-content-align": header.desktop.textAlign,
    "--hero-desktop-content-justify": justify(header.desktop.textAlign),
    "--hero-content-position": vertical(header.phone.verticalAlign),
    "--hero-desktop-content-position": vertical(header.desktop.verticalAlign),
    "--hero-edge-depth": `${header.shapeDepth}px`,
    "--hero-edge-offset": `${header.shapeOffset}px`,
    "--hero-edge-position": `${header.shapePosition}px`,
    "--hero-transition": header.transitionColor,
    "--hero-bg": header.backgroundColor,
    "--hero-gradient-start": colorWithOpacity(header.gradientStart, Math.max(0, Math.min(100, header.gradientOpacity)) / 100),
    "--hero-gradient-end": colorWithOpacity(header.gradientEnd, Math.max(0, Math.min(100, header.gradientOpacity)) / 100),
    "--hero-image": imageUrl ? `url("${imageUrl}")` : "none",
    "--hero-image-position": header.imagePosition,
    "--hero-image-size": `${header.imageScale}% auto`,
    "--hero-image-opacity": String(header.imageOpacity / 100),
    "--hero-image-blend": header.imageBlend,
    "--hero-overlay": header.overlayColor,
    "--hero-overlay-opacity": String(header.overlayOpacity / 100),
    "--hero-overlay-rgba": colorWithOpacity(header.overlayColor, Math.max(0, Math.min(100, header.overlayOpacity)) / 100),
    "--hero-text": header.textColor,
    "--hero-kicker": header.kickerColor,
    "--hero-brand": header.brandColor,
    "--hero-menu": header.menuColor,
    "--hero-menu-bg": header.menuBackground,
    "--hero-menu-border": header.menuBorderColor,
    "--hero-title-weight": header.titleWeight,
    "--hero-title-tracking": `${header.titleLetterSpacing}px`,
    "--hero-kicker-tracking": `${header.kickerLetterSpacing}px`,
    ...safeCss(header.advancedCss),
  };
  const editable = Boolean(editor);
  const topItems = {
    back: detail ? <Link key="back" className="site-hero__back" href="/"><span aria-hidden="true">←</span> {shared.detailBackLabel}</Link> : null,
    brand: header.showBrand ? <Link key="brand" className="site-hero__brand" href="/" aria-label={`${shared.brandName} home`}><span>{shared.brandName}</span><small>{shared.brandTagline}</small></Link> : null,
    menu: header.showMenu ? <div key="menu"><SiteMenu heading={shared.navHeading} links={shared.navLinks} inverted /></div> : null,
  };
  const copyItems = {
    kicker: header.showKicker ? <p key="kicker">{kicker}</p> : null,
    title: header.showTitle ? <h1 key="title">{title}</h1> : null,
  };
  return (
    <header
      data-hero-shape={header.shape}
      className={`site-hero${detail ? " site-hero--detail" : ""}${editable ? " site-hero--editable" : ""}${editor?.selectedId === activeId ? " site-hero--selected" : ""}`}
      style={vars}
      onClick={editable ? () => editor?.onSelect?.(activeId) : undefined}
    >
      {editable ? <span className="site-hero__badge">Hero</span> : null}
      <span className="site-hero__overlay" aria-hidden="true" />
      <div className="site-hero__topline">
        {header.topOrder.map((item) => topItems[item])}
      </div>
      <div className="site-hero__copy">
        {header.copyOrder.map((item) => copyItems[item])}
      </div>
    </header>
  );
}
