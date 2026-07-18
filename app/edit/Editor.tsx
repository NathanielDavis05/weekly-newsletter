"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { HomeView } from "../components/HomeView";
import { ResultsView } from "../components/ResultsView";
import { TrainingView } from "../components/TrainingView";
import type { CanvasEditorState } from "../components/PageBlocks";
import type {
  BlockStyle,
  HeaderDeviceStyle,
  HeaderStyle,
  NewsletterContent,
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

const blockKinds: Array<{ kind: Exclude<VisualBlockKind, "native">; label: string }> = [
  { kind: "text", label: "Text" },
  { kind: "image", label: "Image" },
  { kind: "button", label: "Button" },
  { kind: "divider", label: "Divider" },
  { kind: "container", label: "Container" },
];

function id() {
  return globalThis.crypto?.randomUUID?.() ?? `block-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeBlock(kind: Exclude<VisualBlockKind, "native">): VisualBlock {
  const base = { id: id(), kind, label: kind[0].toUpperCase() + kind.slice(1) } as VisualBlock;
  if (kind === "text") return { ...base, title: "New section", body: "Add your message here." };
  if (kind === "image") return { ...base, label: "Image", alt: "Newsletter image" };
  if (kind === "button") return { ...base, label: "Button", title: "Learn more", href: "https://" };
  if (kind === "container") return { ...base, label: "Container", title: "New callout", body: "Add supporting copy here." };
  return { ...base, label: "Divider" };
}

function SortableCanvasBlock({ block, children }: { block: VisualBlock; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  return (
    <div
      ref={setNodeRef}
      className={`canvas-sortable${isDragging ? " canvas-sortable--dragging" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <button type="button" className="canvas-sortable__handle" aria-label={`Move ${block.label}`} {...attributes} {...listeners}>⠿</button>
      {children}
    </div>
  );
}

function StyleNumber({ label, value, onChange, min = 0, max = 160 }: {
  label: string; value?: number; onChange: (value: number | undefined) => void; min?: number; max?: number;
}) {
  return <label className="visual-control"><span>{label}</span><input type="number" min={min} max={max} value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? undefined : Number(event.target.value))} /></label>;
}

function StyleColor({ label, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return <label className="visual-control"><span>{label}</span><span className="visual-color"><input type="color" value={value || "#ffffff"} onChange={(event) => onChange(event.target.value)} /><input value={value ?? ""} placeholder="Default" onChange={(event) => onChange(event.target.value || undefined)} /></span></label>;
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const document = useMemo(() => visualDocument(content), [content]);
  const blocks = document.pages[page].blocks;
  const selected = blocks.find((block) => block.id === selectedId) ?? null;
  const header = document.headers[page];
  const heroSelected = selectedId === `hero-${page}`;
  const isDirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(savedDraft), [content, savedDraft]);

  const edit = useCallback((mutator: (draft: NewsletterContent) => void) => {
    setContent((previous) => { const next = structuredClone(previous); mutator(next); next.visual = visualDocument(next); return next; });
  }, []);

  const patchBlock = useCallback((blockId: string, patch: Partial<VisualBlock>) => {
    edit((draft) => {
      const block = visualDocument(draft).pages[page].blocks.find((candidate) => candidate.id === blockId);
      if (block) Object.assign(block, patch);
      draft.visual = visualDocument(draft);
    });
  }, [edit, page]);

  const patchStyle = useCallback((key: keyof BlockStyle, value: BlockStyle[keyof BlockStyle]) => {
    if (!selected) return;
    patchBlock(selected.id, { style: { ...selected.style, [key]: value } });
  }, [patchBlock, selected]);

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

  const addBlock = (kind: Exclude<VisualBlockKind, "native">) => {
    const block = makeBlock(kind);
    edit((draft) => { visualDocument(draft).pages[page].blocks.push(block); draft.visual = visualDocument(draft); });
    setSelectedId(block.id);
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    edit((draft) => {
      const pageBlocks = visualDocument(draft).pages[page].blocks;
      const oldIndex = pageBlocks.findIndex((block) => block.id === active.id);
      const newIndex = pageBlocks.findIndex((block) => block.id === over.id);
      if (oldIndex >= 0 && newIndex >= 0) pageBlocks.splice(0, pageBlocks.length, ...arrayMove(pageBlocks, oldIndex, newIndex));
      draft.visual = visualDocument(draft);
    });
  };

  const request = useCallback(async (url: string, init?: RequestInit) => {
    const response = await fetch(url, { headers: { "content-type": "application/json" }, ...init });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Could not save your changes.");
    return data as { draft?: NewsletterContent; published?: NewsletterContent };
  }, []);

  const run = (task: () => Promise<void>, message: string) => {
    setBusy(true); setStatus("");
    task().then(() => setStatus(message)).catch((error) => setStatus(error instanceof Error ? error.message : "Something went wrong.")).finally(() => setBusy(false));
  };
  const save = () => run(async () => { await request("/api/content", { method: "PUT", body: JSON.stringify(content) }); setSavedDraft(content); }, "Draft saved.");
  const publish = () => run(async () => { await request("/api/content", { method: "PUT", body: JSON.stringify(content) }); await request("/api/content/publish", { method: "POST" }); setSavedDraft(content); setPublished(content); }, "Published — the live site is updated.");
  const reset = () => run(async () => { const data = await request("/api/content/reset", { method: "POST", body: JSON.stringify({ target: "published" }) }); if (data.draft) { const next = { ...data.draft, visual: visualDocument(data.draft) }; setContent(next); setSavedDraft(next); } }, "Reverted to the published version.");

  const uploadImage = async (file: File) => {
    if (!selected) return;
    setBusy(true); setStatus("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image upload failed.");
      patchBlock(selected.id, { imageUrl: data.url, alt: selected.alt || file.name });
      setStatus("Image added to the block.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Image upload failed."); } finally { setBusy(false); }
  };

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
    renderBlock: (block, inner) => <SortableCanvasBlock key={block.id} block={block}>{inner}</SortableCanvasBlock>,
  };

  return <div className="visual-editor">
    <header className="visual-editor__bar">
      <div><strong>Newsletter canvas</strong><span>Signed in as {userEmail}</span></div>
      <div className="visual-editor__bar-actions">
        <span className={isDirty ? "visual-dirty" : "visual-status"}>{isDirty ? "● Unsaved changes" : status || "All changes saved"}</span>
        <button type="button" onClick={() => setContent(savedDraft)} disabled={!isDirty || busy}>Discard</button>
        <button type="button" onClick={reset} disabled={busy}>Undo to published</button>
        <button type="button" onClick={save} disabled={busy || !isDirty}>Save draft</button>
        <button type="button" className="visual-button--primary" onClick={publish} disabled={busy}>Publish</button>
      </div>
    </header>

    <div className="visual-editor__workspace">
      <aside className="visual-editor__rail">
        <p className="visual-kicker">Pages</p>
        <div className="visual-pages">{pages.map((item) => <button key={item.id} type="button" className={page === item.id ? "is-active" : ""} onClick={() => { setPage(item.id); setSelectedId(null); }}>{item.label}</button>)}</div>
        <button type="button" className="visual-hero-button" onClick={() => setSelectedId(`hero-${page}`)}>✦ Edit {page} hero</button>
        <p className="visual-kicker">Add a block</p>
        <div className="visual-library">{blockKinds.map((item) => <button key={item.kind} type="button" onClick={() => addBlock(item.kind)}>+ {item.label}</button>)}</div>
        <p className="visual-help">Drag the ⠿ handle on the canvas to reorder. Click any block to style it.</p>
      </aside>

      <main className="visual-editor__main">
        <div className="visual-canvas-toolbar"><span>Live canvas</span><div><button type="button" className={device === "phone" ? "is-active" : ""} onClick={() => setDevice("phone")}>Phone</button><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")}>Desktop</button></div></div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            <div className={`visual-canvas visual-canvas--${device}`}>
              {page === "home" ? <HomeView content={content} editor={editor} /> : null}
              {page === "training" ? <TrainingView content={content} editor={editor} /> : null}
              {page === "results" ? <ResultsView content={content} editor={editor} /> : null}
            </div>
          </SortableContext>
        </DndContext>
      </main>

      <aside className="visual-editor__inspector">
        {heroSelected ? <HeroInspector page={page} header={header} onChange={patchHeader} onDeviceChange={patchHeaderDevice} onLinkChange={setHeaderLinked} onReset={resetHeader} onUpload={uploadHeroImage} /> : selected ? <>
          <div className="inspector-heading"><p className="visual-kicker">Selected block</p><h2>{selected.label}</h2>{selected.kind !== "native" ? <button type="button" className="inspector-delete" onClick={() => { edit((draft) => { const pageBlocks = visualDocument(draft).pages[page].blocks; const index = pageBlocks.findIndex((block) => block.id === selected.id); if (index >= 0) pageBlocks.splice(index, 1); draft.visual = visualDocument(draft); }); setSelectedId(null); }}>Delete block</button> : null}</div>
          <label className="visual-control"><span>Block label</span><input value={selected.label} onChange={(event) => patchBlock(selected.id, { label: event.target.value })} /></label>
          {selected.kind !== "native" ? <>
            {(selected.kind === "text" || selected.kind === "container" || selected.kind === "button") ? <label className="visual-control"><span>Heading / button text</span><input value={selected.title ?? ""} onChange={(event) => patchBlock(selected.id, { title: event.target.value })} /></label> : null}
            {(selected.kind === "text" || selected.kind === "container") ? <label className="visual-control"><span>Copy</span><textarea value={selected.body ?? ""} onChange={(event) => patchBlock(selected.id, { body: event.target.value })} /></label> : null}
            {(selected.kind === "button") ? <label className="visual-control"><span>Link</span><input value={selected.href ?? ""} onChange={(event) => patchBlock(selected.id, { href: event.target.value })} /></label> : null}
            {selected.kind === "image" ? <><label className="visual-control"><span>Image URL</span><input value={selected.imageUrl ?? ""} placeholder="https://…" onChange={(event) => patchBlock(selected.id, { imageUrl: event.target.value })} /></label><label className="visual-control"><span>Alt text</span><input value={selected.alt ?? ""} onChange={(event) => patchBlock(selected.id, { alt: event.target.value })} /></label><label className="visual-upload"><span>Upload image</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0]; if (file) uploadImage(file); }} /></label></> : null}
          </> : <NativeCopyFields blockId={selected.nativeId ?? ""} content={content} edit={edit} />}
          <details className="inspector-section" open><summary>Spacing</summary><div className="inspector-grid"><StyleNumber label="Top padding" value={selected.style?.paddingTop} onChange={(v) => patchStyle("paddingTop", v)} /><StyleNumber label="Bottom padding" value={selected.style?.paddingBottom} onChange={(v) => patchStyle("paddingBottom", v)} /><StyleNumber label="Side padding" value={selected.style?.paddingLeft} onChange={(v) => { patchStyle("paddingLeft", v); patchStyle("paddingRight", v); }} /><StyleNumber label="Top margin" value={selected.style?.marginTop} onChange={(v) => patchStyle("marginTop", v)} /><StyleNumber label="Bottom margin" value={selected.style?.marginBottom} onChange={(v) => patchStyle("marginBottom", v)} /></div><div className="spacing-presets"><button type="button" onClick={() => patchBlock(selected.id, { style: { ...selected.style, paddingTop: 16, paddingRight: 16, paddingBottom: 16, paddingLeft: 16 } })}>Small</button><button type="button" onClick={() => patchBlock(selected.id, { style: { ...selected.style, paddingTop: 32, paddingRight: 24, paddingBottom: 32, paddingLeft: 24 } })}>Medium</button><button type="button" onClick={() => patchBlock(selected.id, { style: { ...selected.style, paddingTop: 56, paddingRight: 32, paddingBottom: 56, paddingLeft: 32 } })}>Large</button></div></details>
          <details className="inspector-section"><summary>Appearance</summary><div className="inspector-grid"><StyleColor label="Background" value={selected.style?.background} onChange={(v) => patchStyle("background", v)} /><StyleColor label="Text color" value={selected.style?.color} onChange={(v) => patchStyle("color", v)} /><StyleColor label="Border color" value={selected.style?.borderColor} onChange={(v) => patchStyle("borderColor", v)} /><StyleNumber label="Border width" value={selected.style?.borderWidth} onChange={(v) => patchStyle("borderWidth", v)} max={12} /><StyleNumber label="Corner radius" value={selected.style?.borderRadius} onChange={(v) => patchStyle("borderRadius", v)} max={80} /><StyleNumber label="Font size" value={selected.style?.fontSize} onChange={(v) => patchStyle("fontSize", v)} min={10} max={80} /><StyleNumber label="Font weight" value={selected.style?.fontWeight} onChange={(v) => patchStyle("fontWeight", v)} min={100} max={900} /></div><label className="visual-control"><span>Text alignment</span><select value={selected.style?.textAlign ?? "left"} onChange={(event) => patchStyle("textAlign", event.target.value as BlockStyle["textAlign"])}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><button type="button" className="inspector-reset" onClick={() => patchBlock(selected.id, { style: undefined })}>Reset block styling</button></details>
        </> : <div className="inspector-empty"><p className="visual-kicker">Inspector</p><h2>Choose a block</h2><p>Click a section in the canvas to adjust its space, colors, typography, borders, and content.</p></div>}
      </aside>
    </div>
  </div>;
}
