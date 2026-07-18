"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from "react";
import { HomeView } from "../components/HomeView";
import { ResultsView } from "../components/ResultsView";
import { TrainingView } from "../components/TrainingView";
import type { CanvasEditorState } from "../components/PageBlocks";
import type {
  BlockStyle,
  HeaderDeviceStyle,
  HeaderStyle,
  FreeformItemStyle,
  FreeformLayout,
  NewsletterContent,
  ResponsiveLayout,
  VisualBlock,
  VisualBlockKind,
  VisualPageId,
} from "../content/types";
import { visualDocument } from "../content/visual";

const pages: Array<{ id: VisualPageId; label: string }> = [
  { id: "home", label: "Home" },
  { id: "training", label: "Training" },
  { id: "results", label: "Results" },
];

type BlockTemplate = { id: string; kind: Exclude<VisualBlockKind, "native">; label: string; icon: string; title?: string; body?: string; href?: string; style?: BlockStyle; width: number; height?: number };
const blockTemplates: BlockTemplate[] = [
  { id: "heading", kind: "text", label: "Heading", icon: "T", title: "New heading", width: 300, style: { background: "transparent", paddingTop: 6, paddingRight: 6, paddingBottom: 6, paddingLeft: 6, fontSize: 34, fontWeight: 700 } },
  { id: "paragraph", kind: "text", label: "Text", icon: "¶", body: "Add your message here.", width: 300, style: { background: "transparent", paddingTop: 8, paddingRight: 8, paddingBottom: 8, paddingLeft: 8, fontSize: 16 } },
  { id: "primary-button", kind: "button", label: "Red button", icon: "↗", title: "Learn more", href: "https://", width: 210, height: 48 },
  { id: "info-card", kind: "container", label: "Info card", icon: "▣", title: "Important update", body: "Add supporting details here.", width: 320, style: { background: "#fffdf8", borderColor: "#ddd3c4", borderWidth: 1, borderRadius: 18, paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20 } },
  { id: "recognition", kind: "container", label: "Recognition", icon: "★", title: "Team shout-out", body: "Celebrate a team member here.", width: 320, style: { background: "#fff4d9", color: "#0d2238", borderRadius: 18, paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20 } },
  { id: "stat", kind: "container", label: "Stat card", icon: "5", title: "5 of 6", body: "goals met", width: 240, style: { background: "#edf8f0", color: "#08733d", borderRadius: 18, paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20, textAlign: "center" } },
  { id: "image", kind: "image", label: "Image", icon: "▧", width: 320 },
  { id: "divider", kind: "divider", label: "Divider", icon: "—", width: 320, height: 24 },
];

function id() {
  return globalThis.crypto?.randomUUID?.() ?? `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeBlock(template: BlockTemplate): VisualBlock {
  return { id: id(), kind: template.kind, label: template.label, title: template.title, body: template.body, href: template.href, alt: template.kind === "image" ? "Newsletter image" : undefined, style: template.style ? structuredClone(template.style) : undefined };
}

function StyleNumber({ label, value, onChange, min = 0, max = 160 }: {
  label: string; value?: number; onChange: (value: number | undefined) => void; min?: number; max?: number;
}) {
  return <label className="visual-control"><span>{label}</span><input type="number" min={min} max={max} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} /></label>;
}

function StyleColor({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <label className="visual-control"><span>{label}</span><span className="visual-color"><input type="color" value={value || "#ffffff"} onChange={(event) => onChange(event.target.value)} /><input value={value ?? ""} placeholder="Default" onChange={(event) => onChange(event.target.value || undefined)} /></span></label>;
}

const blankFreeform = (): FreeformItemStyle => ({ linked: true, phone: { x: 0, y: 0 }, desktop: { x: 0, y: 0 }, zIndex: 1, opacity: 100, locked: false, hidden: false });

function FreeformInspector({ item, layer, block, device, onLayout, onStyle, onBlockChange, onDelete, onUploadImage, onReset }: {
  item: FreeformItemStyle;
  layer?: { id: string; label: string; tag: string; textEditable: boolean; text?: string; href?: string };
  block?: VisualBlock | null;
  device: "phone" | "desktop";
  onLayout: (patch: Partial<FreeformLayout>) => void;
  onStyle: (patch: Partial<FreeformItemStyle>) => void;
  onBlockChange?: (patch: Partial<VisualBlock>) => void;
  onDelete?: () => void;
  onUploadImage?: (file: File) => void;
  onReset: () => void;
}) {
  const layout = item[device];
  const isButtonLike = layer?.tag === "a" || layer?.tag === "button";
  return <>
    <div className="inspector-heading"><p className="visual-kicker">Freeform item</p><h2>{layer?.label || "Selected item"}</h2><p className="visual-native-note">Drag to move. Use any side to change one dimension or a corner to change width and height together. Click text inside a card to edit that exact line.</p></div>
    {layer?.textEditable ? <label className="visual-control"><span>Text</span><textarea value={item.text ?? layer.text ?? layer.label} onChange={(event) => onStyle({ text: event.target.value })} /></label> : null}
    {layer?.tag === "a" ? <label className="visual-control"><span>Link</span><input value={item.href ?? layer.href ?? ""} onChange={(event) => onStyle({ href: event.target.value })} /></label> : null}
    {block ? <details className="inspector-section" open><summary>Block content</summary>{block.kind === "text" || block.kind === "container" || block.kind === "button" ? <label className="visual-control"><span>{block.kind === "button" ? "Button text" : "Heading"}</span><input value={block.title ?? ""} onChange={(event) => onBlockChange?.({ title: event.target.value })} /></label> : null}{block.kind === "text" || block.kind === "container" ? <label className="visual-control"><span>Body text</span><textarea value={block.body ?? ""} onChange={(event) => onBlockChange?.({ body: event.target.value })} /></label> : null}{block.kind === "button" ? <label className="visual-control"><span>Button link</span><input value={block.href ?? ""} onChange={(event) => onBlockChange?.({ href: event.target.value })} /></label> : null}{block.kind === "image" ? <><label className="visual-control"><span>Image URL</span><input value={block.imageUrl ?? ""} onChange={(event) => onBlockChange?.({ imageUrl: event.target.value })} /></label><label className="visual-control"><span>Alt text</span><input value={block.alt ?? ""} onChange={(event) => onBlockChange?.({ alt: event.target.value })} /></label><label className="visual-upload"><span>Upload image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUploadImage?.(file); }} /></label></> : null}<button type="button" className="inspector-delete" onClick={onDelete}>Delete block</button></details> : null}
    {isButtonLike ? <details className="inspector-section" open><summary>Button sizing</summary><p className="visual-native-note">These presets keep buttons easy to tap while letting cards expand sideways.</p><div className="size-actions"><button type="button" onClick={() => onLayout({ width: undefined, widthPx: undefined, height: undefined, minHeight: undefined })}>Fit content</button><button type="button" onClick={() => onLayout({ width: 100, widthPx: undefined })}>Full width</button><button type="button" onClick={() => { onLayout({ height: 44, minHeight: undefined }); onStyle({ padding: 10, borderRadius: 12, overflow: "hidden" }); }}>Compact</button><button type="button" onClick={() => { onLayout({ height: 64, minHeight: undefined }); onStyle({ padding: 14, borderRadius: 16, overflow: "hidden" }); }}>Comfortable</button></div></details> : null}
    <details className="inspector-section" open><summary>Position & size</summary><label className="visual-switch"><input type="checkbox" checked={item.linked} onChange={(event) => onStyle({ linked: event.target.checked, desktop: event.target.checked ? { ...item.phone } : item.desktop })} /> Link phone & desktop</label><div className="inspector-grid">
      <StyleNumber label="X position" value={layout.x} onChange={(v) => onLayout({ x: v ?? 0 })} min={-4000} max={4000} />
      <StyleNumber label="Y position" value={layout.y} onChange={(v) => onLayout({ y: v ?? 0 })} min={-4000} max={4000} />
      <StyleNumber label="Width (px)" value={layout.widthPx} onChange={(v) => onLayout({ widthPx: v, width: v == null ? layout.width : undefined })} min={20} max={2400} />
      <StyleNumber label="Height (px)" value={layout.height} onChange={(v) => onLayout({ height: v, minHeight: v == null ? layout.minHeight : undefined })} min={20} max={2400} />
      <StyleNumber label="Width %" value={layout.width} onChange={(v) => onLayout({ width: v, widthPx: v == null ? layout.widthPx : undefined })} min={5} max={200} />
      <StyleNumber label="Rotation" value={layout.rotation} onChange={(v) => onLayout({ rotation: v })} min={-180} max={180} />
    </div><div className="size-actions"><button type="button" onClick={() => onLayout({ width: undefined, widthPx: undefined, height: undefined, minHeight: undefined })}>Fit content</button><button type="button" onClick={() => onLayout({ width: 100, widthPx: undefined })}>Full width</button><button type="button" onClick={() => onLayout({ x: 0, y: 0, width: undefined, widthPx: undefined, height: undefined, minHeight: undefined, rotation: 0 })}>Reset size & position</button></div></details>
    <details className="inspector-section" open><summary>Layers & visibility</summary><div className="inspector-grid"><StyleNumber label="Layer order" value={item.zIndex} onChange={(v) => onStyle({ zIndex: v ?? 1 })} max={999} /><StyleNumber label="Opacity %" value={item.opacity} onChange={(v) => onStyle({ opacity: v ?? 100 })} max={100} /></div><div className="spacing-presets"><button type="button" onClick={() => onStyle({ zIndex: Math.min(999, item.zIndex + 1) })}>Bring forward</button><button type="button" onClick={() => onStyle({ zIndex: Math.max(0, item.zIndex - 1) })}>Send backward</button></div><label className="visual-switch"><input type="checkbox" checked={item.locked} onChange={(event) => onStyle({ locked: event.target.checked })} /> Lock item</label><label className="visual-switch"><input type="checkbox" checked={item.hidden} onChange={(event) => onStyle({ hidden: event.target.checked })} /> Hide item</label></details>
    <details className="inspector-section"><summary>Appearance</summary><div className="inspector-grid"><StyleNumber label="Font size" value={item.fontSize} onChange={(v) => onStyle({ fontSize: v })} min={8} max={240} /><StyleNumber label="Font weight" value={item.fontWeight} onChange={(v) => onStyle({ fontWeight: v })} min={100} max={900} /><StyleNumber label="Padding" value={item.padding} onChange={(v) => onStyle({ padding: v })} max={300} /><StyleNumber label="Corner radius" value={item.borderRadius} onChange={(v) => onStyle({ borderRadius: v })} max={300} /><StyleColor label="Text color" value={item.color} onChange={(v) => onStyle({ color: v })} /><StyleColor label="Background" value={item.background} onChange={(v) => onStyle({ background: v })} /></div><div className="visual-control"><span>Text alignment</span><div className="alignment-buttons" role="group" aria-label="Text alignment">{(["left", "center", "right"] as const).map((alignment) => <button key={alignment} type="button" className={(item.textAlign ?? "left") === alignment ? "is-active" : ""} aria-label={`Align text ${alignment}`} onClick={() => onStyle({ textAlign: alignment })}>{alignment === "left" ? "☰" : alignment === "center" ? "≡" : "☷"}<small>{alignment === "center" ? "Middle" : alignment[0].toUpperCase() + alignment.slice(1)}</small></button>)}</div></div><label className="visual-control"><span>When content is larger than height</span><select value={item.overflow ?? "visible"} onChange={(event) => onStyle({ overflow: event.target.value as FreeformItemStyle["overflow"] })}><option value="visible">Show it</option><option value="hidden">Clip it</option><option value="auto">Scroll inside</option></select></label></details>
    <button type="button" className="inspector-reset" onClick={onReset}>Reset this item</button>
  </>;
}

function NativeCopyFields({ blockId, content, edit }: { blockId: string; content: NewsletterContent; edit: (mutator: (draft: NewsletterContent) => void) => void }) {
  const field = (label: string, value: string, change: (draft: NewsletterContent, next: string) => void) => <label className="visual-control" key={label}><span>{label}</span><input value={value} onChange={(event) => edit((draft) => change(draft, event.target.value))} /></label>;
  if (blockId === "home-overview") return <div className="native-copy-fields">{field("Section heading", content.home.overview.heading, (d, v) => { d.home.overview.heading = v; })}{field("Intro", content.home.overview.intro, (d, v) => { d.home.overview.intro = v; })}{field("Action card", content.home.overview.actionCard.heading, (d, v) => { d.home.overview.actionCard.heading = v; })}</div>;
  if (blockId === "home-scorecard") return <div className="native-copy-fields">{field("Section heading", content.home.scorecard.heading, (d, v) => { d.home.scorecard.heading = v; })}{field("Score result", content.home.scorecard.resultValue, (d, v) => { d.home.scorecard.resultValue = v; })}{field("Focus", content.home.scorecard.focusValue, (d, v) => { d.home.scorecard.focusValue = v; })}</div>;
  if (blockId === "home-recognition") return <div className="native-copy-fields">{field("Section heading", content.home.recognition.heading, (d, v) => { d.home.recognition.heading = v; })}{field("Shout-out heading", content.home.recognition.feature.heading, (d, v) => { d.home.recognition.feature.heading = v; })}{field("Shout-out message", content.home.recognition.feature.body, (d, v) => { d.home.recognition.feature.body = v; })}</div>;
  if (blockId === "home-events") return <div className="native-copy-fields">{field("Section heading", content.home.events.heading, (d, v) => { d.home.events.heading = v; })}{field("Intro", content.home.events.intro, (d, v) => { d.home.events.intro = v; })}</div>;
  if (blockId === "home-grow") return <div className="native-copy-fields">{field("Section heading", content.home.grow.heading, (d, v) => { d.home.grow.heading = v; })}{field("Message", content.home.grow.body, (d, v) => { d.home.grow.body = v; })}{field("Button label", content.home.grow.buttonLabel, (d, v) => { d.home.grow.buttonLabel = v; })}</div>;
  if (blockId === "training-intro") return <div className="native-copy-fields">{field("Badge", content.training.badge, (d, v) => { d.training.badge = v; })}{field("Heading", content.training.heading, (d, v) => { d.training.heading = v; })}{field("Lead", content.training.lead, (d, v) => { d.training.lead = v; })}</div>;
  if (blockId === "training-action") return <div className="native-copy-fields">{field("Button label", content.training.primaryButton.label, (d, v) => { d.training.primaryButton.label = v; })}{field("Button link", content.training.primaryButton.href, (d, v) => { d.training.primaryButton.href = v; })}{field("Help label", content.training.helpLink.label, (d, v) => { d.training.helpLink.label = v; })}</div>;
  if (blockId === "training-alert") return <div className="native-copy-fields">{field("Alert heading", content.training.alert.kicker, (d, v) => { d.training.alert.kicker = v; })}{field("Alert message", content.training.alert.body, (d, v) => { d.training.alert.body = v; })}</div>;
  if (blockId === "results-intro") return <div className="native-copy-fields">{field("Eyebrow", content.results.eyebrow, (d, v) => { d.results.eyebrow = v; })}{field("Heading", content.results.heading, (d, v) => { d.results.heading = v; })}{field("Lead", content.results.lead, (d, v) => { d.results.lead = v; })}</div>;
  if (blockId === "results-focus") return <div className="native-copy-fields">{field("Label", content.results.focus.label, (d, v) => { d.results.focus.label = v; })}{field("Heading", content.results.focus.heading, (d, v) => { d.results.focus.heading = v; })}{field("Message", content.results.focus.body, (d, v) => { d.results.focus.body = v; })}</div>;
  if (blockId === "results-momentum") return <div className="native-copy-fields">{field("Heading", content.results.momentum.heading, (d, v) => { d.results.momentum.heading = v; })}{field("Message", content.results.momentum.body, (d, v) => { d.results.momentum.body = v; })}</div>;
  return <p className="visual-native-note">This section keeps its detailed cards and rows intact. Drag it, style it, or select another block to edit its primary copy.</p>;
}

function HeroInspector({
  page,
  header,
  onChange,
  onDeviceChange,
  onLinkChange,
  onReset,
  onUpload,
}: {
  page: VisualPageId;
  header: HeaderStyle;
  onChange: (patch: Partial<HeaderStyle>) => void;
  onDeviceChange: (device: "phone" | "desktop", key: keyof HeaderDeviceStyle, value: number | HeaderDeviceStyle["verticalAlign"] | HeaderDeviceStyle["textAlign"]) => void;
  onLinkChange: (linked: boolean) => void;
  onReset: () => void;
  onUpload: (file: File) => void;
}) {
  const deviceFields = (device: "phone" | "desktop", label: string) => {
    const value = header[device];
    return <details className="inspector-section" open={device === "phone"}><summary>{label} layout</summary><div className="inspector-grid">
      <StyleNumber label="Min height" value={value.minHeight} onChange={(v) => onDeviceChange(device, "minHeight", v ?? 0)} max={900} />
      <StyleNumber label="Content width" value={value.contentWidth} onChange={(v) => onDeviceChange(device, "contentWidth", v ?? 0)} max={1100} />
      <StyleNumber label="Top padding" value={value.paddingTop} onChange={(v) => onDeviceChange(device, "paddingTop", v ?? 0)} max={300} />
      <StyleNumber label="Right padding" value={value.paddingRight} onChange={(v) => onDeviceChange(device, "paddingRight", v ?? 0)} max={300} />
      <StyleNumber label="Bottom padding" value={value.paddingBottom} onChange={(v) => onDeviceChange(device, "paddingBottom", v ?? 0)} max={300} />
      <StyleNumber label="Left padding" value={value.paddingLeft} onChange={(v) => onDeviceChange(device, "paddingLeft", v ?? 0)} max={300} />
      <StyleNumber label="Copy gap" value={value.contentGap} onChange={(v) => onDeviceChange(device, "contentGap", v ?? 0)} max={240} />
      <StyleNumber label="Brand size" value={value.brandSize} onChange={(v) => onDeviceChange(device, "brandSize", v ?? 0)} max={80} />
      <StyleNumber label="Heading size" value={value.titleSize} onChange={(v) => onDeviceChange(device, "titleSize", v ?? 0)} max={160} />
      <StyleNumber label="Kicker size" value={value.kickerSize} onChange={(v) => onDeviceChange(device, "kickerSize", v ?? 0)} max={60} />
      <StyleNumber label="Menu size" value={value.menuSize} onChange={(v) => onDeviceChange(device, "menuSize", v ?? 0)} max={100} />
    </div><label className="visual-control"><span>Vertical position</span><select value={value.verticalAlign} onChange={(event) => onDeviceChange(device, "verticalAlign", event.target.value as HeaderDeviceStyle["verticalAlign"])}><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></label><label className="visual-control"><span>Text alignment</span><select value={value.textAlign} onChange={(event) => onDeviceChange(device, "textAlign", event.target.value as HeaderDeviceStyle["textAlign"])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></details>;
  };
  const setVisible = (key: "showBrand" | "showKicker" | "showTitle" | "showMenu") => <label className="visual-switch" key={key}><input type="checkbox" checked={header[key]} onChange={(event) => onChange({ [key]: event.target.checked } as Partial<HeaderStyle>)} /> {key.replace("show", "Show ")}</label>;
  return <>
    <div className="inspector-heading"><p className="visual-kicker">Header design</p><h2>{page[0].toUpperCase() + page.slice(1)} Hero</h2><p className="visual-native-note">Click the header any time to return here. Every change is saved with this page.</p></div>
    <details className="inspector-section" open><summary>Quick presets</summary><div className="spacing-presets"><button type="button" onClick={() => onChange({ linked: true, phone: { ...header.phone, minHeight: 128, paddingTop: 10, paddingRight: 16, paddingBottom: 16, paddingLeft: 16, contentGap: 8 }, desktop: { ...header.desktop, minHeight: 168, paddingTop: 16, paddingRight: 28, paddingBottom: 20, paddingLeft: 28, contentGap: 14 } })}>Very compact</button><button type="button" onClick={() => onChange({ linked: true, phone: { ...header.phone, minHeight: 212, paddingTop: 22, paddingRight: 22, paddingBottom: 32, paddingLeft: 22, contentGap: 28 }, desktop: { ...header.desktop, minHeight: 292, paddingTop: 34, paddingRight: 46, paddingBottom: 48, paddingLeft: 46, contentGap: 50 } })}>Spacious</button></div><button type="button" className="inspector-reset" onClick={onReset}>Reset header</button></details>
    <details className="inspector-section" open><summary>Edge shape</summary><label className="visual-control"><span>Lower edge</span><select value={header.shape} onChange={(event) => onChange({ shape: event.target.value as HeaderStyle["shape"] })}><option value="straight">Straight</option><option value="curve">Curve</option><option value="inverted-curve">Inverted curve</option><option value="wave">Wave</option><option value="angled">Angled</option><option value="double-angle">Double angle</option><option value="zigzag">Zig-zag</option><option value="scallop">Scallop</option><option value="rounded">Rounded</option><option value="asymmetric">Asymmetric</option></select></label><div className="inspector-grid"><StyleNumber label="Shape depth" value={header.shapeDepth} onChange={(v) => onChange({ shapeDepth: v ?? 0 })} max={180} /><StyleNumber label="Side offset" value={header.shapeOffset} onChange={(v) => onChange({ shapeOffset: v ?? 0 })} min={-240} max={240} /><StyleColor label="Transition color" value={header.transitionColor} onChange={(v) => onChange({ transitionColor: v || "#fbf7ef" })} /></div></details>
    <details className="inspector-section"><summary>Background & image</summary><div className="inspector-grid"><StyleColor label="Base color" value={header.backgroundColor} onChange={(v) => onChange({ backgroundColor: v || "#d80d37" })} /><StyleColor label="Gradient start" value={header.gradientStart} onChange={(v) => onChange({ gradientStart: v || "#d80d37" })} /><StyleColor label="Gradient end" value={header.gradientEnd} onChange={(v) => onChange({ gradientEnd: v || "#ad0527" })} /><StyleNumber label="Gradient opacity" value={header.gradientOpacity} onChange={(v) => onChange({ gradientOpacity: v ?? 100 })} max={100} /><StyleColor label="Overlay color" value={header.overlayColor} onChange={(v) => onChange({ overlayColor: v || "#5d0019" })} /><StyleNumber label="Overlay opacity" value={header.overlayOpacity} onChange={(v) => onChange({ overlayOpacity: v ?? 0 })} max={100} /><StyleNumber label="Image opacity" value={header.imageOpacity} onChange={(v) => onChange({ imageOpacity: v ?? 0 })} max={100} /><StyleNumber label="Image scale" value={header.imageScale} onChange={(v) => onChange({ imageScale: v ?? 100 })} min={10} max={300} /></div><label className="visual-control"><span>Image URL</span><input value={header.imageUrl} placeholder="Upload or paste a URL" onChange={(event) => onChange({ imageUrl: event.target.value })} /></label><label className="visual-upload"><span>Upload hero image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); }} /></label><label className="visual-control"><span>Image position</span><input value={header.imagePosition} placeholder="center 45%" onChange={(event) => onChange({ imagePosition: event.target.value })} /></label><label className="visual-control"><span>Image blend</span><select value={header.imageBlend} onChange={(event) => onChange({ imageBlend: event.target.value as HeaderStyle["imageBlend"] })}><option value="normal">Normal</option><option value="multiply">Multiply</option><option value="overlay">Overlay</option><option value="soft-light">Soft light</option><option value="screen">Screen</option></select></label></details>
    <details className="inspector-section"><summary>Text, brand & menu</summary><div className="visual-switches">{setVisible("showBrand")}{setVisible("showKicker")}{setVisible("showTitle")}{setVisible("showMenu")}</div><div className="inspector-grid"><StyleColor label="Title color" value={header.textColor} onChange={(v) => onChange({ textColor: v || "#ffffff" })} /><StyleColor label="Kicker color" value={header.kickerColor} onChange={(v) => onChange({ kickerColor: v || "#fff7e8" })} /><StyleColor label="Brand color" value={header.brandColor} onChange={(v) => onChange({ brandColor: v || "#ffffff" })} /><StyleColor label="Menu lines" value={header.menuColor} onChange={(v) => onChange({ menuColor: v || "#ffffff" })} /><StyleNumber label="Heading weight" value={header.titleWeight} onChange={(v) => onChange({ titleWeight: v ?? 700 })} min={100} max={900} /><StyleNumber label="Title tracking" value={header.titleLetterSpacing} onChange={(v) => onChange({ titleLetterSpacing: v ?? 0 })} min={-10} max={20} /><StyleNumber label="Kicker tracking" value={header.kickerLetterSpacing} onChange={(v) => onChange({ kickerLetterSpacing: v ?? 0 })} min={-2} max={20} /></div><label className="visual-control"><span>Menu background</span><input value={header.menuBackground} onChange={(event) => onChange({ menuBackground: event.target.value })} /></label><label className="visual-control"><span>Menu border</span><input value={header.menuBorderColor} onChange={(event) => onChange({ menuBorderColor: event.target.value })} /></label></details>
    <label className="visual-switch"><input type="checkbox" checked={header.linked} onChange={(event) => onLinkChange(event.target.checked)} /> Link phone & desktop settings <span className="visual-switch__hint">(copies phone settings when enabled)</span></label>
    {deviceFields("phone", "Phone")}{deviceFields("desktop", "Desktop")}
    <details className="inspector-section"><summary>Advanced header CSS</summary><p className="visual-native-note">Safe properties: box-shadow, text-shadow, filter, backdrop-filter, opacity, transform, and background-repeat.</p><textarea className="advanced-css" value={header.advancedCss} placeholder="box-shadow: 0 12px 30px rgba(0,0,0,.2);" onChange={(event) => onChange({ advancedCss: event.target.value })} /></details>
  </>;
}

export function Editor({ initialDraft, initialPublished, userEmail }: {
  initialDraft: NewsletterContent; initialPublished: NewsletterContent; userEmail: string;
}) {
  const [content, setContent] = useState<NewsletterContent>(() => ({ ...initialDraft, visual: visualDocument(initialDraft) }));
  const [savedDraft, setSavedDraft] = useState<NewsletterContent>(() => ({ ...initialDraft, visual: visualDocument(initialDraft) }));
  const [published, setPublished] = useState<NewsletterContent>(() => ({ ...initialPublished, visual: visualDocument(initialPublished) }));
  const [page, setPage] = useState<VisualPageId>("home");
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [layers, setLayers] = useState<Array<{ id: string; label: string; tag: string; textEditable: boolean; text?: string; href?: string }>>([]);
  const [history, setHistory] = useState<NewsletterContent[]>([]);
  const [future, setFuture] = useState<NewsletterContent[]>([]);
  const [busy, setBusy] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [autoSaveBlocked, setAutoSaveBlocked] = useState(false);
  const [status, setStatus] = useState("");
  const autoSavePromise = useRef<Promise<void> | null>(null);

  const document = useMemo(() => visualDocument(content), [content]);
  const blocks = document.pages[page].blocks;
  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const selectedFreeformId = selectedId?.startsWith("freeform:") ? selectedId.slice("freeform:".length) : null;
  const selectedFreeform = selectedFreeformId ? document.freeform[page][selectedFreeformId] ?? blankFreeform() : null;
  const selectedLayer = selectedFreeformId ? layers.find((item) => item.id === selectedFreeformId) : undefined;
  const selectedFreeBlock = selectedFreeformId?.startsWith("block:") ? blocks.find((block) => block.id === selectedFreeformId.slice("block:".length)) ?? null : null;
  const header = document.headers[page];
  const heroSelected = selectedId === `hero-${page}` || selectedId?.startsWith(`hero:${page}:`);
  const isDirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(savedDraft), [content, savedDraft]);

  const edit = useCallback((mutator: (draft: NewsletterContent) => void) => {
    setAutoSaveBlocked(false);
    setContent((previous) => {
      const next = structuredClone(previous); mutator(next); next.visual = visualDocument(next);
      setHistory((entries) => [...entries, previous].slice(-50)); setFuture([]);
      return next;
    });
  }, []);

  const undoLocal = () => setHistory((entries) => {
    const previous = entries.at(-1); if (!previous) return entries;
    setContent((current) => { setFuture((next) => [current, ...next].slice(0, 50)); return previous; });
    return entries.slice(0, -1);
  });
  const redoLocal = () => setFuture((entries) => {
    const next = entries[0]; if (!next) return entries;
    setContent((current) => { setHistory((previous) => [...previous, current].slice(-50)); return next; });
    return entries.slice(1);
  });

  const patchBlock = useCallback((blockId: string, patch: Partial<VisualBlock>) => {
    edit((draft) => {
      const next = visualDocument(draft); const block = next.pages[page].blocks.find((candidate) => candidate.id === blockId);
      if (block) Object.assign(block, patch);
      draft.visual = next;
    });
  }, [edit, page]);

  const patchStyle = useCallback((key: keyof BlockStyle, value: BlockStyle[keyof BlockStyle]) => {
    if (!selected) return;
    patchBlock(selected.id, { style: { ...selected.style, [key]: value } });
  }, [patchBlock, selected]);

  const patchResponsiveLayout = useCallback((blockId: string, device: "phone" | "desktop", patch: Partial<ResponsiveLayout>) => {
    const block = blocks.find((candidate) => candidate.id === blockId);
    if (!block) return;
    const style = block.style ?? {};
    const next = { ...style, [device]: { ...style[device], ...patch } } as BlockStyle;
    if (style.linkedDevices) next[device === "phone" ? "desktop" : "phone"] = { ...style[device === "phone" ? "desktop" : "phone"], ...patch };
    patchBlock(blockId, { style: next });
  }, [blocks, patchBlock]);

  const patchFreeform = useCallback((itemId: string, target: "phone" | "desktop", patch: Partial<FreeformLayout>) => {
    edit((draft) => {
      const next = visualDocument(draft); const current = next.freeform[page][itemId] ?? blankFreeform();
      const updated = { ...current, phone: { ...current.phone }, desktop: { ...current.desktop } };
      updated[target] = { ...updated[target], ...patch };
      if (updated.linked) updated[target === "phone" ? "desktop" : "phone"] = { ...updated[target === "phone" ? "desktop" : "phone"], ...patch };
      next.freeform[page][itemId] = updated; draft.visual = next;
    });
  }, [edit, page]);

  const patchFreeformStyle = useCallback((itemId: string, patch: Partial<FreeformItemStyle>) => {
    edit((draft) => {
      const next = visualDocument(draft); const current = next.freeform[page][itemId] ?? blankFreeform();
      next.freeform[page][itemId] = { ...current, ...patch, phone: patch.phone ? { ...patch.phone } : { ...current.phone }, desktop: patch.desktop ? { ...patch.desktop } : { ...current.desktop } };
      draft.visual = next;
    });
  }, [edit, page]);

  const resetFreeform = useCallback((itemId: string) => {
    edit((draft) => { const next = visualDocument(draft); delete next.freeform[page][itemId]; draft.visual = next; });
  }, [edit, page]);

  const deleteFreeBlock = useCallback((blockId: string) => {
    edit((draft) => { const next = visualDocument(draft); next.pages[page].blocks = next.pages[page].blocks.filter((block) => block.id !== blockId); delete next.freeform[page][`block:${blockId}`]; draft.visual = next; });
    setSelectedId(null);
  }, [edit, page]);

  const patchCanvasHeight = useCallback((target: "phone" | "desktop", height: number) => {
    edit((draft) => { const next = visualDocument(draft); next.canvas[page][target] = Math.max(500, Math.min(12000, Math.round(height))); draft.visual = next; });
  }, [edit, page]);

  const discoverFreeform = useCallback((items: Array<{ id: string; label: string; tag: string; textEditable: boolean; text?: string; href?: string }>) => {
    setLayers((previous) => JSON.stringify(previous) === JSON.stringify(items) ? previous : items);
  }, []);

  const patchHeader = useCallback((patch: Partial<HeaderStyle>) => {
    edit((draft) => {
      const current = visualDocument(draft).headers[page];
      draft.visual = visualDocument(draft);
      draft.visual.headers[page] = { ...current, ...patch };
      draft.visual = visualDocument(draft);
    });
  }, [edit, page]);

  const patchHeaderDevice = useCallback((device: "phone" | "desktop", key: keyof HeaderDeviceStyle, value: number | HeaderDeviceStyle["verticalAlign"] | HeaderDeviceStyle["textAlign"]) => {
    edit((draft) => {
      const current = visualDocument(draft).headers[page];
      const next = structuredClone(current);
      next[device][key] = value as never;
      if (current.linked) {
        const other = device === "phone" ? "desktop" : "phone";
        next[other][key] = value as never;
      }
      draft.visual = visualDocument(draft);
      draft.visual.headers[page] = next;
      draft.visual = visualDocument(draft);
    });
  }, [edit, page]);

  const setHeaderLinked = useCallback((linked: boolean) => {
    edit((draft) => {
      const current = visualDocument(draft).headers[page];
      const next = { ...current, linked, desktop: linked ? { ...current.phone } : { ...current.desktop } };
      draft.visual = visualDocument(draft);
      draft.visual.headers[page] = next;
      draft.visual = visualDocument(draft);
    });
  }, [edit, page]);

  const resetHeader = useCallback(() => {
    edit((draft) => {
      const fallback = visualDocument({ ...draft, visual: undefined }).headers[page];
      draft.visual = visualDocument(draft);
      draft.visual.headers[page] = fallback;
    });
  }, [edit, page]);

  const addBlock = (templateId: string, placement?: { x: number; y: number }) => {
    const template = blockTemplates.find((candidate) => candidate.id === templateId); if (!template) return;
    const block = makeBlock(template); const layerId = `block:${block.id}`;
    const existing = blocks.filter((candidate) => candidate.kind !== "native").length;
    const x = Math.max(0, Math.round(placement?.x ?? 28 + (existing % 4) * 18));
    const y = Math.max(0, Math.round(placement?.y ?? 180 + existing * 34));
    edit((draft) => {
      const next = visualDocument(draft); next.pages[page].blocks.push(block);
      const base = blankFreeform(); const layout = { x, y, widthPx: template.width, height: template.height };
      next.freeform[page][layerId] = { ...base, position: "absolute", linked: true, phone: { ...layout }, desktop: { ...layout } };
      next.canvas[page][device] = Math.max(next.canvas[page][device], y + (template.height ?? 180) + 160);
      draft.visual = next;
    });
    setSelectedId(`freeform:${layerId}`);
  };

  const dragTemplate = (event: ReactDragEvent<HTMLButtonElement>, templateId: string) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-newsletter-template", templateId); };
  const dropTemplate = (event: ReactDragEvent<HTMLDivElement>) => {
    const templateId = event.dataTransfer.getData("application/x-newsletter-template"); if (!templateId) return;
    event.preventDefault(); const surface = event.currentTarget.querySelector<HTMLElement>(".freeform-surface"); const rect = surface?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect(); addBlock(templateId, { x: event.clientX - rect.left, y: event.clientY - rect.top });
  };
  const resizePageHeight = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault(); const start = event.clientY; const initial = document.canvas[page][device];
    const move = (next: globalThis.PointerEvent) => patchCanvasHeight(device, initial + next.clientY - start);
    const end = () => { globalThis.removeEventListener("pointermove", move); globalThis.removeEventListener("pointerup", end); };
    globalThis.addEventListener("pointermove", move); globalThis.addEventListener("pointerup", end);
  };

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not save your changes.");
    return data as { draft?: NewsletterContent; published?: NewsletterContent };
  }, []);

  useEffect(() => {
    if (!isDirty || busy || autoSaving || autoSaveBlocked) return;
    const snapshot = structuredClone(content);
    const timer = globalThis.setTimeout(() => {
      const task = (async () => {
        setAutoSaving(true); setStatus("Saving draft…");
        try {
          await request("/api/content", { method: "PUT", body: JSON.stringify(snapshot) });
          setSavedDraft(snapshot); setStatus("Draft autosaved.");
        } catch (error) { setAutoSaveBlocked(true); setStatus(error instanceof Error ? error.message : "Autosave failed. Try Save draft."); }
        finally { setAutoSaving(false); autoSavePromise.current = null; }
      })();
      autoSavePromise.current = task;
    }, 900);
    return () => globalThis.clearTimeout(timer);
  }, [autoSaveBlocked, autoSaving, busy, content, isDirty, request]);

  useEffect(() => {
    const saveOnLeave = () => { if (isDirty) void fetch("/api/content", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(content), keepalive: true }); };
    globalThis.addEventListener("pagehide", saveOnLeave);
    return () => globalThis.removeEventListener("pagehide", saveOnLeave);
  }, [content, isDirty]);

  const run = (task: () => Promise<void>, message: string) => {
    setBusy(true); setStatus("");
    task().then(() => setStatus(message)).catch((error) => setStatus(error instanceof Error ? error.message : "Something went wrong.")).finally(() => setBusy(false));
  };
  const save = () => run(async () => { await autoSavePromise.current?.catch(() => undefined); await request("/api/content", { method: "PUT", body: JSON.stringify(content) }); setAutoSaveBlocked(false); setSavedDraft(content); }, "Draft saved.");
  const publish = () => run(async () => { await autoSavePromise.current?.catch(() => undefined); await request("/api/content", { method: "PUT", body: JSON.stringify(content) }); await request("/api/content/publish", { method: "POST" }); setAutoSaveBlocked(false); setSavedDraft(content); setPublished(content); }, "Published — the live site is updated.");
  const reset = () => run(async () => { const data = await request("/api/content/reset", { method: "POST", body: JSON.stringify({ target: "published" }) }); if (data.draft) { const next = { ...data.draft, visual: visualDocument(data.draft) }; setContent(next); setSavedDraft(next); } }, "Reverted to the published version.");

  const uploadImageForBlock = async (blockId: string, file: File) => {
    setBusy(true); setStatus("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image upload failed.");
      const block = blocks.find((candidate) => candidate.id === blockId);
      patchBlock(blockId, { imageUrl: data.url, alt: block?.alt || file.name });
      setStatus("Image added to the block.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Image upload failed."); } finally { setBusy(false); }
  };
  const uploadImage = async (file: File) => { if (selected) await uploadImageForBlock(selected.id, file); };

  const uploadHeroImage = async (file: File) => {
    setBusy(true); setStatus("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Hero image upload failed.");
      patchHeader({ imageUrl: data.url });
      setStatus("Hero image uploaded.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Hero image upload failed."); } finally { setBusy(false); }
  };

  const editor: CanvasEditorState = {
    selectedId,
    onSelect: setSelectedId,
    device,
    onFreeformChange: patchFreeform,
    onFreeformStyleChange: patchFreeformStyle,
    onFreeformDiscover: discoverFreeform,
    onCanvasHeightChange: patchCanvasHeight,
  };

  return <div className="visual-editor">
    <header className="visual-editor__bar">
      <div><strong>Newsletter canvas</strong><span>Signed in as {userEmail}</span></div>
      <div className="visual-editor__bar-actions">
        <span className={isDirty || autoSaving ? "visual-dirty" : "visual-status"}>{autoSaving ? "Saving draft…" : isDirty ? "● Autosave pending" : status || "All changes saved"}</span>
        <button type="button" onClick={undoLocal} disabled={!history.length || busy}>Undo</button>
        <button type="button" onClick={redoLocal} disabled={!future.length || busy}>Redo</button>
        <button type="button" onClick={() => setContent(savedDraft)} disabled={!isDirty || busy}>Discard</button>
        <button type="button" onClick={reset} disabled={busy}>Undo to published</button>
        <button type="button" onClick={save} disabled={busy || !isDirty}>Save draft</button>
        <button type="button" className="visual-button--primary" onClick={publish} disabled={busy}>Publish</button>
      </div>
    </header>

    <div className="visual-editor__workspace">
      <aside className="visual-editor__rail">
        <p className="visual-kicker">Pages</p>
        <div className="visual-pages">{pages.map((item) => <button key={item.id} type="button" className={page === item.id ? "is-active" : ""} onClick={() => { setPage(item.id); setSelectedId(null); setLayers([]); }}>{item.label}</button>)}</div>
        <button type="button" className="visual-hero-button" onClick={() => setSelectedId(`hero-${page}`)}>✦ Hero background & shape</button>
        <p className="visual-kicker">Template blocks</p>
        <div className="visual-library">{blockTemplates.map((item) => <button key={item.id} type="button" draggable onDragStart={(event) => dragTemplate(event, item.id)} onClick={() => addBlock(item.id)}><span className="template-icon">{item.icon}</span><span>{item.label}</span><small>Drag onto page</small></button>)}</div>
        <p className="visual-help"><strong>Google Slides-style:</strong> drag any item freely. Blue guides align centers and edges; hold Alt while dragging to temporarily disable snapping.</p>
        <p className="visual-kicker">Layers</p>
        <div className="freeform-layers">{layers.map((item) => <button key={item.id} type="button" className={selectedFreeformId === item.id ? "is-active" : ""} onClick={() => setSelectedId(`freeform:${item.id}`)}><span>{item.tag}</span>{item.label || "Untitled item"}</button>)}</div>
      </aside>

      <main className="visual-editor__main">
        <div className="visual-canvas-toolbar"><span>Live canvas</span><label className="canvas-height-control">Page height <input type="number" min="500" max="12000" step="100" value={document.canvas[page][device]} onChange={(event) => patchCanvasHeight(device, Number(event.target.value) || 500)} /></label><div><button type="button" className={device === "phone" ? "is-active" : ""} onClick={() => setDevice("phone")}>Phone</button><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")}>Desktop</button></div></div>
        <div className={`visual-canvas visual-canvas--${device}`} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={dropTemplate}>
          {page === "home" ? <HomeView content={content} editor={editor} /> : null}
          {page === "training" ? <TrainingView content={content} editor={editor} /> : null}
          {page === "results" ? <ResultsView content={content} editor={editor} /> : null}
          <button type="button" className="canvas-page-resize" aria-label="Resize page height" onPointerDown={resizePageHeight}><span>Page height</span></button>
        </div>
      </main>

      <aside className="visual-editor__inspector">
        {selectedFreeform && selectedFreeformId ? <FreeformInspector item={selectedFreeform} layer={selectedLayer} block={selectedFreeBlock} device={device} onLayout={(patch) => patchFreeform(selectedFreeformId, device, patch)} onStyle={(patch) => patchFreeformStyle(selectedFreeformId, patch)} onBlockChange={selectedFreeBlock ? (patch) => patchBlock(selectedFreeBlock.id, patch) : undefined} onDelete={selectedFreeBlock ? () => deleteFreeBlock(selectedFreeBlock.id) : undefined} onUploadImage={selectedFreeBlock ? (file) => uploadImageForBlock(selectedFreeBlock.id, file) : undefined} onReset={() => resetFreeform(selectedFreeformId)} /> : heroSelected ? <HeroInspector page={page} header={header} onChange={patchHeader} onDeviceChange={patchHeaderDevice} onLinkChange={setHeaderLinked} onReset={resetHeader} onUpload={uploadHeroImage} /> : selected ? <>
          <div className="inspector-heading"><p className="visual-kicker">Selected block</p><h2>{selected.label}</h2>{selected.kind !== "native" ? <button type="button" className="inspector-delete" onClick={() => deleteFreeBlock(selected.id)}>Delete block</button> : null}</div>
          <label className="visual-control"><span>Block label</span><input value={selected.label} onChange={(event) => patchBlock(selected.id, { label: event.target.value })} /></label>
          {selected.kind !== "native" ? <>
            {(selected.kind === "text" || selected.kind === "container" || selected.kind === "button") ? <label className="visual-control"><span>Heading / button text</span><input value={selected.title ?? ""} onChange={(event) => patchBlock(selected.id, { title: event.target.value })} /></label> : null}
            {(selected.kind === "text" || selected.kind === "container") ? <label className="visual-control"><span>Copy</span><textarea value={selected.body ?? ""} onChange={(event) => patchBlock(selected.id, { body: event.target.value })} /></label> : null}
            {(selected.kind === "button") ? <label className="visual-control"><span>Link</span><input value={selected.href ?? ""} onChange={(event) => patchBlock(selected.id, { href: event.target.value })} /></label> : null}
            {selected.kind === "image" ? <><label className="visual-control"><span>Image URL</span><input value={selected.imageUrl ?? ""} placeholder="https://…" onChange={(event) => patchBlock(selected.id, { imageUrl: event.target.value })} /></label><label className="visual-control"><span>Alt text</span><input value={selected.alt ?? ""} onChange={(event) => patchBlock(selected.id, { alt: event.target.value })} /></label><label className="visual-upload"><span>Upload image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file); }} /></label></> : null}
          </> : <NativeCopyFields blockId={selected.nativeId ?? ""} content={content} edit={edit} />}
          <details className="inspector-section" open><summary>Resize & spacing</summary><p className="visual-native-note">Drag the right or bottom handle on the selected block, or use exact values below.</p><label className="visual-switch"><input type="checkbox" checked={selected.style?.linkedDevices ?? true} onChange={(event) => patchBlock(selected.id, { style: { ...selected.style, linkedDevices: event.target.checked } })} /> Link phone & desktop layout</label><div className="inspector-grid"><StyleNumber label={`${device === "phone" ? "Phone" : "Desktop"} width %`} value={selected.style?.[device]?.width} onChange={(v) => patchResponsiveLayout(selected.id, device, { width: v })} min={20} max={100} /><StyleNumber label="Min height" value={selected.style?.[device]?.minHeight} onChange={(v) => patchResponsiveLayout(selected.id, device, { minHeight: v })} max={900} /><StyleNumber label="Top padding" value={selected.style?.[device]?.paddingTop ?? selected.style?.paddingTop} onChange={(v) => patchResponsiveLayout(selected.id, device, { paddingTop: v })} max={300} /><StyleNumber label="Bottom padding" value={selected.style?.[device]?.paddingBottom ?? selected.style?.paddingBottom} onChange={(v) => patchResponsiveLayout(selected.id, device, { paddingBottom: v })} max={300} /><StyleNumber label="Side padding" value={selected.style?.[device]?.paddingLeft ?? selected.style?.paddingLeft} onChange={(v) => patchResponsiveLayout(selected.id, device, { paddingLeft: v, paddingRight: v })} max={300} /><StyleNumber label="Top margin" value={selected.style?.[device]?.marginTop ?? selected.style?.marginTop} onChange={(v) => patchResponsiveLayout(selected.id, device, { marginTop: v })} max={300} /></div><div className="spacing-presets"><button type="button" onClick={() => patchResponsiveLayout(selected.id, device, { paddingTop: 12, paddingRight: 12, paddingBottom: 12, paddingLeft: 12 })}>Small</button><button type="button" onClick={() => patchResponsiveLayout(selected.id, device, { paddingTop: 24, paddingRight: 20, paddingBottom: 24, paddingLeft: 20 })}>Medium</button><button type="button" onClick={() => patchResponsiveLayout(selected.id, device, { paddingTop: 48, paddingRight: 32, paddingBottom: 48, paddingLeft: 32 })}>Large</button></div></details>
          <details className="inspector-section"><summary>Appearance</summary><div className="inspector-grid"><StyleColor label="Background" value={selected.style?.background} onChange={(v) => patchStyle("background", v)} /><StyleColor label="Text color" value={selected.style?.color} onChange={(v) => patchStyle("color", v)} /><StyleColor label="Border color" value={selected.style?.borderColor} onChange={(v) => patchStyle("borderColor", v)} /><StyleNumber label="Border width" value={selected.style?.borderWidth} onChange={(v) => patchStyle("borderWidth", v)} max={12} /><StyleNumber label="Corner radius" value={selected.style?.borderRadius} onChange={(v) => patchStyle("borderRadius", v)} max={80} /><StyleNumber label="Font size" value={selected.style?.fontSize} onChange={(v) => patchStyle("fontSize", v)} min={10} max={80} /><StyleNumber label="Font weight" value={selected.style?.fontWeight} onChange={(v) => patchStyle("fontWeight", v)} min={100} max={900} /></div><label className="visual-control"><span>Text alignment</span><select value={selected.style?.textAlign ?? "left"} onChange={(event) => patchStyle("textAlign", event.target.value as BlockStyle["textAlign"])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><button type="button" className="inspector-reset" onClick={() => patchBlock(selected.id, { style: undefined })}>Reset block styling</button></details>
        </> : <div className="inspector-empty"><p className="visual-kicker">Inspector</p><h2>Choose any item</h2><p>Click any heading, paragraph, button, card, row, menu, or Hero item to move, resize, rotate, layer, lock, hide, and style it.</p></div>}
      </aside>
    </div>
  </div>;
}
