"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, ReactNode } from "react";
import { HomeView } from "../components/HomeView";
import type { CanvasEditorState, ContentFieldRequest, TextFieldRequest } from "../components/ItemCanvas";
import { ResultsView } from "../components/ResultsView";
import { TrainingView } from "../components/TrainingView";
import type { BlockStyle, HeaderDeviceStyle, HeaderStyle, Look, NewsletterContent, ResponsiveLayout, ResultTone, SavedBlock, VisualBlock, VisualBlockKind, VisualPageId } from "../content/types";
import { richTextFromPlain, richTextToPlain } from "../content/richtext";
import { setByPath } from "../content/paths";
import { defaultTheme, defaultTextStyles, withRecentColor, type ColorToken, type SiteTheme, type TextStyleDef, type TextStyleId } from "../content/theme";
import { defaultHeader, visualDocument } from "../content/visual";
import { GuideLayer, type GuideLayerHandle } from "./canvas/GuideLayer";
import { useDragReorder } from "./canvas/useDragReorder";
import { useResize } from "./canvas/useResize";
import * as ops from "./commands/documentOps";
import { History } from "./commands/history";
import { HistoryPanel } from "./panels/HistoryPanel";
import { MediaPanel, type MediaAsset } from "./panels/MediaPanel";
import { PublishChecklist } from "./panels/PublishChecklist";
import { SiteDesignPanel } from "./panels/SiteDesignPanel";
import { SavedBlocksPanel } from "./panels/SavedBlocksPanel";
import { CommandPalette, type Command, type CommandAction } from "./CommandPalette";
import { buildSections, WeeklyMode } from "./panels/WeeklyMode";
import { createNextIssue } from "./publishing/nextIssue";
import { validateNewsletter, type ValidationIssue } from "./publishing/validation";
import { RichTextEditor } from "./richtext/RichTextEditor";

const pages: Array<{ id: VisualPageId; label: string }> = [{ id: "home", label: "Home" }, { id: "training", label: "Training" }, { id: "results", label: "Results" }];
type Template = { id: string; kind: Exclude<VisualBlockKind, "native">; label: string; icon: string; title?: string; body?: string; href?: string; imageUrl?: string; style?: BlockStyle };
const templates: Template[] = [
  { id: "heading", kind: "text", label: "Heading", icon: "T", title: "New heading", style: { fontSize: 34, fontWeight: 700, phone: { width: 100 }, desktop: { width: 80 } } },
  { id: "paragraph", kind: "text", label: "Paragraph", icon: "¶", body: "Add your message here.", style: { fontSize: 16, phone: { width: 100 }, desktop: { width: 80 } } },
  { id: "button", kind: "button", label: "Primary button", icon: "↗", title: "Learn more", href: "https://", style: { phone: { width: 100 }, desktop: { width: 42 } } },
  { id: "card", kind: "container", label: "Info card", icon: "▣", title: "Important update", body: "Add supporting details here.", style: { background: "#fffdf8", borderColor: "#ddd3c4", borderWidth: 1, borderRadius: 18, paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20, phone: { width: 100 }, desktop: { width: 70 } } },
  { id: "recognition", kind: "container", label: "Recognition", icon: "★", title: "Team shout-out", body: "Celebrate a team member here.", style: { background: "#fff4d9", borderRadius: 18, paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20, phone: { width: 100 }, desktop: { width: 60 } } },
  { id: "stat", kind: "container", label: "Stat card", icon: "5", title: "5 of 6", body: "goals met", style: { background: "#edf8f0", color: "#08733d", borderRadius: 18, textAlign: "center", paddingTop: 20, paddingRight: 20, paddingBottom: 20, paddingLeft: 20, phone: { width: 100 }, desktop: { width: 48 } } },
  { id: "image", kind: "image", label: "Image", icon: "▧", style: { phone: { width: 100 }, desktop: { width: 70 } } },
  { id: "divider", kind: "divider", label: "Divider", icon: "—", style: { phone: { width: 100 }, desktop: { width: 100 } } },
];

const uid = () => globalThis.crypto?.randomUUID?.() ?? `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const makeItem = (template: Template): VisualBlock => ({ id: uid(), kind: template.kind, label: template.label, title: template.title, body: template.body, href: template.href, imageUrl: template.imageUrl, alt: template.kind === "image" ? "Newsletter image" : undefined, style: template.style ? structuredClone(template.style) : undefined });

function DeferredNumber({ value, onCommit, min, max }: { value?: number; onCommit: (value: number | undefined) => void; min?: number; max?: number }) {
  const shown = value == null ? "" : String(value); const [draft, setDraft] = useState(shown); const editing = useRef(false);
  useEffect(() => { if (!editing.current) setDraft(shown); }, [shown]);
  const commit = () => { editing.current = false; if (!draft.trim()) return onCommit(undefined); const parsed = Number(draft); if (!Number.isFinite(parsed)) return setDraft(shown); onCommit(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, parsed))); };
  return <input type="number" value={draft} min={min} max={max} onFocus={() => { editing.current = true; }} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(shown); event.currentTarget.blur(); } }} />;
}
function NumberField(props: { label: string; value?: number; onCommit: (value: number | undefined) => void; min?: number; max?: number }) { return <label className="visual-control"><span>{props.label}</span><DeferredNumber {...props} /></label>; }
function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) { return <label className="visual-control"><span>{label}</span><span className="visual-color"><input type="color" value={/^#[0-9a-f]{6}$/i.test(value ?? "") ? value : "#ffffff"} onChange={(event) => onChange(event.target.value)} /><input value={value ?? ""} onChange={(event) => onChange(event.target.value)} /></span></label>; }

function TextField({ label, value, onChange, area = false, placeholder }: { label: string; value: string; onChange: (value: string) => void; area?: boolean; placeholder?: string }) {
  return <label className="visual-control"><span>{label}</span>{area
    ? <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    : <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;
}
function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="visual-switch"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /> {label}</label>;
}
type PerformanceTone = "green" | "yellow" | "red";
const performanceTones: Array<{ value: PerformanceTone; label: string }> = [{ value: "green", label: "Good" }, { value: "yellow", label: "Poor" }, { value: "red", label: "Bad" }];
function PerformanceToneControl({ label, value, onChange }: { label: string; value: PerformanceTone; onChange: (value: PerformanceTone) => void }) {
  return <fieldset className="status-picker"><legend>{label}</legend><div className="status-picker__choices" role="radiogroup" aria-label={label}>{performanceTones.map((tone) => <button key={tone.value} type="button" role="radio" aria-checked={value === tone.value} className={`status-picker__option status-picker__option--${tone.value}${value === tone.value ? " is-active" : ""}`} onClick={() => onChange(tone.value)}><span className="status-picker__check" aria-hidden="true">{value === tone.value ? "✓" : ""}</span>{tone.label}</button>)}</div></fieldset>;
}
function CalloutTemplateControl({ value, onChange }: { value: "celebrate" | "needs-work"; onChange: (value: "celebrate" | "needs-work") => void }) {
  return <fieldset className="status-picker"><legend>Callout template</legend><div className="status-picker__choices status-picker__choices--two" role="radiogroup" aria-label="Callout template"><button type="button" role="radio" aria-checked={value === "celebrate"} className={`status-picker__option status-picker__option--celebrate${value === "celebrate" ? " is-active" : ""}`} onClick={() => onChange("celebrate")}><span className="status-picker__check" aria-hidden="true">{value === "celebrate" ? "✓" : ""}</span>Great work</button><button type="button" role="radio" aria-checked={value === "needs-work"} className={`status-picker__option status-picker__option--needs-work${value === "needs-work" ? " is-active" : ""}`} onClick={() => onChange("needs-work")}><span className="status-picker__check" aria-hidden="true">{value === "needs-work" ? "✓" : ""}</span>Needs work</button></div></fieldset>;
}
function ListItemFrame({ index, count, onMove, onRemove, children }: { index: number; count: number; onMove: (dir: number) => void; onRemove: () => void; children: ReactNode }) {
  return <div className="list-item">
    <div className="list-item__head"><span>#{index + 1}</span><span className="list-item__buttons">
      <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move up">↑</button>
      <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move down">↓</button>
      <button type="button" className="danger" onClick={onRemove} aria-label="Remove">✕</button>
    </span></div>
    {children}
  </div>;
}

function SharedEditor({ content, change }: { content: NewsletterContent; change: (mutator: (draft: NewsletterContent) => void) => void }) {
  const shared = content.shared; const links = shared.navLinks;
  const move = (index: number, dir: number) => change((draft) => { const list = draft.shared.navLinks; const next = index + dir; if (next < 0 || next >= list.length) return; const item = list[index]; list[index] = list[next]; list[next] = item; });
  return <details className="inspector-section"><summary>Brand &amp; navigation</summary>
    <TextField label="Brand name" value={shared.brandName} onChange={(value) => change((draft) => { draft.shared.brandName = value; })} />
    <TextField label="Tagline" value={shared.brandTagline} onChange={(value) => change((draft) => { draft.shared.brandTagline = value; })} />
    <TextField label="Menu heading" value={shared.navHeading} onChange={(value) => change((draft) => { draft.shared.navHeading = value; })} />
    <TextField label="Back-link label" value={shared.detailBackLabel} onChange={(value) => change((draft) => { draft.shared.detailBackLabel = value; })} />
    <p className="inspector-device-note">Menu links</p>
    <div className="inspector-list">{links.map((link, index) => <ListItemFrame key={index} index={index} count={links.length} onMove={(dir) => move(index, dir)} onRemove={() => change((draft) => { draft.shared.navLinks.splice(index, 1); })}>
      <TextField label="Label" value={link.label} onChange={(value) => change((draft) => { draft.shared.navLinks[index].label = value; })} />
      <TextField label="Link" value={link.href} onChange={(value) => change((draft) => { draft.shared.navLinks[index].href = value; })} />
    </ListItemFrame>)}</div>
    <button type="button" className="list-add" onClick={() => change((draft) => { draft.shared.navLinks.push({ label: "New link", href: "/" }); })}>+ Add menu link</button>
  </details>;
}

function NativeEditor({ id, content, change }: { id: string; content: NewsletterContent; change: (mutator: (draft: NewsletterContent) => void) => void }) {
  const text = (label: string, value: string, apply: (draft: NewsletterContent, value: string) => void, area = false) => <TextField key={label} label={label} value={value} area={area} onChange={(value) => change((draft) => apply(draft, value))} />;
  const listOps = <T,>(get: (draft: NewsletterContent) => T[]) => ({
    field: (index: number, apply: (item: T, value: string) => void) => (value: string) => change((draft) => { apply(get(draft)[index], value); }),
    flag: (index: number, apply: (item: T, value: boolean) => void) => (value: boolean) => change((draft) => { apply(get(draft)[index], value); }),
    add: (blank: T) => change((draft) => { get(draft).push(structuredClone(blank)); }),
    remove: (index: number) => change((draft) => { get(draft).splice(index, 1); }),
    move: (index: number, dir: number) => change((draft) => { const list = get(draft); const next = index + dir; if (next < 0 || next >= list.length) return; const item = list[index]; list[index] = list[next]; list[next] = item; }),
  });
  const h = content.home; const t = content.training; const r = content.results;

  if (id === "home-overview-intro") return <>{text("Eyebrow", h.overview.eyebrow, (d, v) => { d.home.overview.eyebrow = v; })}{text("Heading", h.overview.heading, (d, v) => { d.home.overview.heading = v; })}{text("Introduction", h.overview.intro, (d, v) => { d.home.overview.intro = v; }, true)}</>;
  if (id === "home-action") { const c = h.overview.actionCard; return <>{text("Icon", c.icon, (d, v) => { d.home.overview.actionCard.icon = v; })}{text("Label", c.label, (d, v) => { d.home.overview.actionCard.label = v; })}{text("Heading", c.heading, (d, v) => { d.home.overview.actionCard.heading = v; })}{text("Body", c.bodyPrefix, (d, v) => { d.home.overview.actionCard.bodyPrefix = v; }, true)}{text("Body emphasis", c.bodyEmphasis, (d, v) => { d.home.overview.actionCard.bodyEmphasis = v; })}{text("Micro note", c.micro, (d, v) => { d.home.overview.actionCard.micro = v; })}{text("Link text", c.linkLabel, (d, v) => { d.home.overview.actionCard.linkLabel = v; })}{text("Link", c.linkHref, (d, v) => { d.home.overview.actionCard.linkHref = v; })}</>; }
  if (id === "home-event" || id === "home-recognition-link") { const key: "eventCard" | "recognitionCard" = id === "home-event" ? "eventCard" : "recognitionCard"; const card = h.overview[key]; return <>{text("Icon", card.icon, (d, v) => { d.home.overview[key].icon = v; })}{text("Kicker", card.kicker, (d, v) => { d.home.overview[key].kicker = v; })}{text("Title", card.title, (d, v) => { d.home.overview[key].title = v; })}{text("Detail", card.detail, (d, v) => { d.home.overview[key].detail = v; })}{text("Link", card.href, (d, v) => { d.home.overview[key].href = v; })}</>; }
  if (id === "home-scorecard") { const s = content.shared.scorecard; return <>{text("Eyebrow", s.eyebrow, (d, v) => { d.shared.scorecard.eyebrow = v; })}{text("Heading", s.heading, (d, v) => { d.shared.scorecard.heading = v; })}{text("Summary", s.intro, (d, v) => { d.shared.scorecard.intro = v; }, true)}<div className="inspector-grid">{text("Result value", s.resultValue, (d, v) => { d.shared.scorecard.resultValue = v; })}{text("Result unit", s.resultUnit, (d, v) => { d.shared.scorecard.resultUnit = v; })}</div>{text("Result label", s.resultLabel, (d, v) => { d.shared.scorecard.resultLabel = v; })}{text("Focus label", s.focusLabel, (d, v) => { d.shared.scorecard.focusLabel = v; })}{text("Focus value", s.focusValue, (d, v) => { d.shared.scorecard.focusValue = v; })}<PerformanceToneControl label="Card status" value={s.homeTone ?? "green"} onChange={(value) => change((d) => { d.shared.scorecard.homeTone = value; })} /><div className="inspector-grid">{text("Button text", s.buttonLabel, (d, v) => { d.shared.scorecard.buttonLabel = v; })}{text("Button link", s.buttonHref, (d, v) => { d.shared.scorecard.buttonHref = v; })}</div></>; }
  if (id === "home-recognition-heading") return <>{text("Eyebrow", h.recognition.eyebrow, (d, v) => { d.home.recognition.eyebrow = v; })}{text("Heading", h.recognition.heading, (d, v) => { d.home.recognition.heading = v; })}</>;
  if (id === "home-recognition-feature") return <>{text("Heading", h.recognition.feature.heading, (d, v) => { d.home.recognition.feature.heading = v; })}{text("Message", h.recognition.feature.body, (d, v) => { d.home.recognition.feature.body = v; }, true)}</>;
  if (id === "home-birthday") return <>{text("Kicker", h.recognition.birthday.kicker, (d, v) => { d.home.recognition.birthday.kicker = v; })}{text("Name", h.recognition.birthday.name, (d, v) => { d.home.recognition.birthday.name = v; })}{text("Date", h.recognition.birthday.date, (d, v) => { d.home.recognition.birthday.date = v; })}</>;
  if (id === "home-anniversaries") { const a = h.recognition.anniversaries; const ops = listOps((d) => d.home.recognition.anniversaries.entries); return <>{text("Kicker", a.kicker, (d, v) => { d.home.recognition.anniversaries.kicker = v; })}<div className="inspector-list">{a.entries.map((entry, index) => <ListItemFrame key={index} index={index} count={a.entries.length} onMove={(dir) => ops.move(index, dir)} onRemove={() => ops.remove(index)}><TextField label="Name" value={entry.name} onChange={ops.field(index, (it, v) => { it.name = v; })} /><TextField label="Detail" value={entry.detail} onChange={ops.field(index, (it, v) => { it.detail = v; })} /></ListItemFrame>)}</div><button type="button" className="list-add" onClick={() => ops.add({ name: "New teammate", detail: "1 year at CFA" })}>+ Add anniversary</button></>; }
  if (id === "home-events") { const ops = listOps((d) => d.home.events.items); return <>{text("Eyebrow", h.events.eyebrow, (d, v) => { d.home.events.eyebrow = v; })}{text("Heading", h.events.heading, (d, v) => { d.home.events.heading = v; })}{text("Introduction", h.events.intro, (d, v) => { d.home.events.intro = v; }, true)}<div className="inspector-list">{h.events.items.map((event, index) => <ListItemFrame key={index} index={index} count={h.events.items.length} onMove={(dir) => ops.move(index, dir)} onRemove={() => ops.remove(index)}><TextField label="Date" value={event.date} onChange={ops.field(index, (it, v) => { it.date = v; })} /><TextField label="Name" value={event.name} onChange={ops.field(index, (it, v) => { it.name = v; })} /><ToggleField label="Featured" checked={Boolean(event.featured)} onChange={ops.flag(index, (it, v) => { it.featured = v; })} /></ListItemFrame>)}</div><button type="button" className="list-add" onClick={() => ops.add({ date: "Jul 1", name: "New event" })}>+ Add event</button></>; }
  if (id === "home-grow") return <>{text("Eyebrow", h.grow.eyebrow, (d, v) => { d.home.grow.eyebrow = v; })}{text("Heading", h.grow.heading, (d, v) => { d.home.grow.heading = v; })}{text("Message", h.grow.body, (d, v) => { d.home.grow.body = v; }, true)}<div className="inspector-grid">{text("Button text", h.grow.buttonLabel, (d, v) => { d.home.grow.buttonLabel = v; })}{text("Button link", h.grow.buttonHref, (d, v) => { d.home.grow.buttonHref = v; })}</div>{text("Referral heading", h.grow.referralStrong, (d, v) => { d.home.grow.referralStrong = v; })}{text("Referral detail", h.grow.referralRest, (d, v) => { d.home.grow.referralRest = v; }, true)}</>;
  if (id === "home-footer") return <>{text("Brand", h.footer.brand, (d, v) => { d.home.footer.brand = v; })}{text("Footer line", h.footer.line, (d, v) => { d.home.footer.line = v; })}</>;

  if (id === "training-intro") return <>{text("Badge", t.badge, (d, v) => { d.training.badge = v; })}{text("Heading", t.heading, (d, v) => { d.training.heading = v; })}{text("Introduction", t.lead, (d, v) => { d.training.lead = v; }, true)}</>;
  if (id === "training-status") { const ops = listOps((d) => d.training.statusRows); return <><p className="inspector-hint">Each row shows a badge token beside a fact or deadline.</p><div className="inspector-list">{t.statusRows.map((row, index) => <ListItemFrame key={index} index={index} count={t.statusRows.length} onMove={(dir) => ops.move(index, dir)} onRemove={() => ops.remove(index)}><div className="inspector-grid"><TextField label="Token" value={row.token} onChange={ops.field(index, (it, v) => { it.token = v; })} /><TextField label="Label" value={row.label} onChange={ops.field(index, (it, v) => { it.label = v; })} /></div><TextField label="Text" value={row.strongPrefix} onChange={ops.field(index, (it, v) => { it.strongPrefix = v; })} /><TextField label="Emphasis (optional)" value={row.strongEmphasis} onChange={ops.field(index, (it, v) => { it.strongEmphasis = v; })} /><ToggleField label="Red badge" checked={row.tokenRed} onChange={ops.flag(index, (it, v) => { it.tokenRed = v; })} /></ListItemFrame>)}</div><button type="button" className="list-add" onClick={() => ops.add({ token: "00", tokenRed: false, label: "Label", strongPrefix: "Detail", strongEmphasis: "" })}>+ Add deadline row</button></>; }
  if (id === "training-action") return <>{text("Button text", t.primaryButton.label, (d, v) => { d.training.primaryButton.label = v; })}{text("Button link", t.primaryButton.href, (d, v) => { d.training.primaryButton.href = v; })}{text("Help text", t.helpLink.label, (d, v) => { d.training.helpLink.label = v; })}{text("Help link", t.helpLink.href, (d, v) => { d.training.helpLink.href = v; })}</>;
  if (id === "training-alert") return <>{text("Label", t.alert.kicker, (d, v) => { d.training.alert.kicker = v; })}{text("Message", t.alert.body, (d, v) => { d.training.alert.body = v; }, true)}</>;
  if (id === "training-covers") { const ops = listOps((d) => d.training.covers.items); return <>{text("Eyebrow", t.covers.eyebrow, (d, v) => { d.training.covers.eyebrow = v; })}{text("Heading", t.covers.heading, (d, v) => { d.training.covers.heading = v; })}<p className="inspector-device-note">Checklist items</p><div className="inspector-list">{t.covers.items.map((item, index) => <ListItemFrame key={index} index={index} count={t.covers.items.length} onMove={(dir) => ops.move(index, dir)} onRemove={() => ops.remove(index)}><TextField label={`Item ${index + 1}`} value={item} area onChange={(value) => change((draft) => { draft.training.covers.items[index] = value; })} /></ListItemFrame>)}</div><button type="button" className="list-add" onClick={() => ops.add("New checklist item")}>+ Add item</button></>; }
  if (id === "training-why") return <>{text("Eyebrow", t.why.eyebrow, (d, v) => { d.training.why.eyebrow = v; })}{text("Heading", t.why.heading, (d, v) => { d.training.why.heading = v; })}{text("Paragraphs (blank line between)", t.why.paragraphs.join("\n\n"), (d, v) => { d.training.why.paragraphs = v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean); }, true)}</>;
  if (id === "training-help") return <>{text("Mark", t.help.mark, (d, v) => { d.training.help.mark = v; })}{text("Heading", t.help.heading, (d, v) => { d.training.help.heading = v; })}{text("Message", t.help.body, (d, v) => { d.training.help.body = v; }, true)}</>;

  if (id === "results-intro") return <>{text("Eyebrow", r.eyebrow, (d, v) => { d.results.eyebrow = v; })}{text("Heading", r.heading, (d, v) => { d.results.heading = v; })}{text("Introduction", r.lead, (d, v) => { d.results.lead = v; }, true)}</>;
  if (id === "results-summary") return <><div className="inspector-grid">{text("Value", r.summaryValue, (d, v) => { d.results.summaryValue = v; })}{text("Unit", r.summaryUnit, (d, v) => { d.results.summaryUnit = v; })}</div>{text("Label", r.summaryLabel, (d, v) => { d.results.summaryLabel = v; })}<PerformanceToneControl label="Goals met" value={r.summaryTone ?? "green"} onChange={(value) => change((d) => { d.results.summaryTone = value; })} /></>;
  if (id.startsWith("results-metric-")) { const index = Number(id.at(-1)); const metric = r.headlineMetrics[index]; const tone: PerformanceTone = metric?.tone === "yellow" ? "yellow" : metric?.tone === "green" || metric?.positive ? "green" : "red"; return metric ? <>{text("Label", metric.label, (d, v) => { d.results.headlineMetrics[index].label = v; })}<div className="inspector-grid">{text("Value", metric.value, (d, v) => { d.results.headlineMetrics[index].value = v; })}{text("Goal", metric.goal, (d, v) => { d.results.headlineMetrics[index].goal = v; })}</div>{text("Status", metric.status, (d, v) => { d.results.headlineMetrics[index].status = v; })}<PerformanceToneControl label="Result" value={tone} onChange={(value) => change((d) => { d.results.headlineMetrics[index].tone = value as ResultTone; d.results.headlineMetrics[index].positive = value === "green"; })} /></> : null; }
  if (id === "results-focus") return <>{text("Label", r.focus.label, (d, v) => { d.results.focus.label = v; })}{text("Heading", r.focus.heading, (d, v) => { d.results.focus.heading = v; })}{text("Message", r.focus.body, (d, v) => { d.results.focus.body = v; }, true)}</>;
  if (id === "results-scorecard") { const card = content.shared.scorecard; const sc = card.table; const ops = listOps((d) => d.shared.scorecard.table.rows); return <>{text("Eyebrow", sc.eyebrow, (d, v) => { d.shared.scorecard.table.eyebrow = v; })}{text("Heading", sc.heading, (d, v) => { d.shared.scorecard.table.heading = v; })}<p className="inspector-device-note">Column headers</p><div className="inspector-grid">{text("Measure", sc.headerMeasure, (d, v) => { d.shared.scorecard.table.headerMeasure = v; })}{text("Goal", sc.headerGoal, (d, v) => { d.shared.scorecard.table.headerGoal = v; })}{text("Col 3", sc.headerApr, (d, v) => { d.shared.scorecard.table.headerApr = v; })}{text("Col 4", sc.headerMay, (d, v) => { d.shared.scorecard.table.headerMay = v; })}{text("Col 5", sc.headerJun, (d, v) => { d.shared.scorecard.table.headerJun = v; })}</div><p className="inspector-device-note">Rows</p><div className="inspector-list">{sc.rows.map((row, index) => <ListItemFrame key={index} index={index} count={sc.rows.length} onMove={(dir) => ops.move(index, dir)} onRemove={() => ops.remove(index)}><TextField label="Measure" value={row.label} onChange={ops.field(index, (it, v) => { it.label = v; })} /><div className="inspector-grid"><TextField label="Goal" value={row.goal} onChange={ops.field(index, (it, v) => { it.goal = v; })} /><TextField label="Apr" value={row.april} onChange={ops.field(index, (it, v) => { it.april = v; })} /><TextField label="May" value={row.may} onChange={ops.field(index, (it, v) => { it.may = v; })} /><TextField label="Jun" value={row.june} onChange={ops.field(index, (it, v) => { it.june = v; })} /></div><PerformanceToneControl label="Result" value={row.tone === "green" || row.tone === "red" ? row.tone : "yellow"} onChange={(value) => change((d) => { d.shared.scorecard.table.rows[index].tone = value; })} /></ListItemFrame>)}</div><button type="button" className="list-add" onClick={() => ops.add({ label: "New measure", goal: "", april: "", may: "", june: "", tone: "yellow" })}>+ Add row</button></>; }
  if (id === "results-momentum") return <><CalloutTemplateControl value={r.momentum.tone ?? "celebrate"} onChange={(value) => change((d) => { const needsWork = value === "needs-work"; d.results.momentum.tone = value; d.results.momentum.heading = needsWork ? "More work needed, team." : "Great work, team."; d.results.momentum.body = needsWork ? "We are behind in several areas. Let’s focus on the basics, support one another, and turn these gaps into next month’s progress." : "Five goals met is worth celebrating. Let’s keep the momentum going."; })} /><p className="inspector-hint">Choosing a template replaces the heading and message; you can edit both below.</p>{text("Heading", r.momentum.heading, (d, v) => { d.results.momentum.heading = v; })}{text("Message", r.momentum.body, (d, v) => { d.results.momentum.body = v; }, true)}</>;
  return <p className="inspector-note">Edit this item’s layout and appearance below.</p>;
}

function HeroInspector({ page, header, content, patch, patchDevice, upload, change }: { page: VisualPageId; header: HeaderStyle; content: NewsletterContent; patch: (next: Partial<HeaderStyle>) => void; patchDevice: (device: "phone" | "desktop", next: Partial<HeaderDeviceStyle>) => void; upload: (file: File) => void; change: (mutator: (draft: NewsletterContent) => void) => void }) {
  const deviceFields = (device: "phone" | "desktop") => { const d = header[device]; return <div className="inspector-grid">
    <NumberField label="Min height" value={d.minHeight} min={0} max={900} onCommit={(value) => patchDevice(device, { minHeight: value ?? 0 })} />
    <NumberField label="Title size" value={d.titleSize} min={12} max={160} onCommit={(value) => patchDevice(device, { titleSize: value ?? 40 })} />
    <NumberField label="Brand size" value={d.brandSize} min={0} max={80} onCommit={(value) => patchDevice(device, { brandSize: value ?? 0 })} />
    <NumberField label="Kicker size" value={d.kickerSize} min={8} max={60} onCommit={(value) => patchDevice(device, { kickerSize: value ?? 12 })} />
    <NumberField label="Top padding" value={d.paddingTop} min={0} max={300} onCommit={(value) => patchDevice(device, { paddingTop: value ?? 0 })} />
    <NumberField label="Bottom padding" value={d.paddingBottom} min={0} max={300} onCommit={(value) => patchDevice(device, { paddingBottom: value ?? 0 })} />
  </div>; };
  return <div className="editor-inspector-form"><div className="inspector-heading"><p className="visual-kicker">Hero</p><h2>{pages.find((item) => item.id === page)?.label} header</h2></div>
    <div className="inspector-actions"><button type="button" onClick={() => patch(defaultHeader(page))}>Reset Hero</button></div>
    <TextField label="Header title" value={page === "home" ? content.home.hero.headline : page === "training" ? content.training.heading : content.results.heading} onChange={(value) => change((draft) => { if (page === "home") draft.home.hero.headline = value; else if (page === "training") draft.training.heading = value; else draft.results.heading = value; })} />
    <TextField label="Header kicker" value={page === "home" ? content.home.hero.kicker : page === "training" ? content.training.badge : content.results.eyebrow} onChange={(value) => change((draft) => { if (page === "home") draft.home.hero.kicker = value; else if (page === "training") draft.training.badge = value; else draft.results.eyebrow = value; })} />
    <label className="visual-control"><span>Lower edge</span><select value={header.shape} onChange={(event) => patch({ shape: event.target.value as HeaderStyle["shape"] })}>{["straight", "curve", "inverted-curve", "wave", "angled", "double-angle", "zigzag", "scallop", "rounded", "asymmetric"].map((shape) => <option value={shape} key={shape}>{shape.replaceAll("-", " ")}</option>)}</select></label>
    <div className="inspector-grid"><NumberField label="Edge depth" value={header.shapeDepth} min={0} max={180} onCommit={(value) => patch({ shapeDepth: value ?? 0 })} /><NumberField label="Edge position" value={header.shapePosition} min={-180} max={180} onCommit={(value) => patch({ shapePosition: value ?? 0 })} /></div>
    <ColorField label="Background" value={header.backgroundColor} onChange={(value) => patch({ backgroundColor: value })} /><ColorField label="Transition color" value={header.transitionColor} onChange={(value) => patch({ transitionColor: value })} />
    <label className="visual-control"><span>Pattern or image URL</span><input value={header.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} /></label><label className="visual-upload"><span>Upload background</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); }} /></label>
    <div className="inspector-grid"><NumberField label="Image opacity" value={header.imageOpacity} min={0} max={100} onCommit={(value) => patch({ imageOpacity: value ?? 0 })} /><NumberField label="Image scale" value={header.imageScale} min={10} max={300} onCommit={(value) => patch({ imageScale: value ?? 100 })} /></div>
    <label className="visual-switch"><input type="checkbox" checked={header.linked} onChange={(event) => patch({ linked: event.target.checked })} /> Link phone &amp; desktop sizing</label>
    <details className="inspector-section" open><summary>Phone layout</summary>{deviceFields("phone")}</details>
    <details className="inspector-section"><summary>Desktop layout</summary>{deviceFields("desktop")}</details>
    <details className="inspector-section"><summary>Text &amp; colors</summary><ColorField label="Title color" value={header.textColor} onChange={(value) => patch({ textColor: value })} /><ColorField label="Kicker color" value={header.kickerColor} onChange={(value) => patch({ kickerColor: value })} /><ColorField label="Brand color" value={header.brandColor} onChange={(value) => patch({ brandColor: value })} /><ColorField label="Menu color" value={header.menuColor} onChange={(value) => patch({ menuColor: value })} /><div className="inspector-grid"><NumberField label="Title weight" value={header.titleWeight} min={100} max={900} onCommit={(value) => patch({ titleWeight: value ?? 700 })} /><NumberField label="Title tracking" value={header.titleLetterSpacing} min={-10} max={20} onCommit={(value) => patch({ titleLetterSpacing: value ?? 0 })} /></div></details>
    <details className="inspector-section"><summary>Visibility</summary><label className="visual-switch"><input type="checkbox" checked={header.showBrand} onChange={(event) => patch({ showBrand: event.target.checked })} /> Show brand</label><label className="visual-switch"><input type="checkbox" checked={header.showKicker} onChange={(event) => patch({ showKicker: event.target.checked })} /> Show kicker</label><label className="visual-switch"><input type="checkbox" checked={header.showTitle} onChange={(event) => patch({ showTitle: event.target.checked })} /> Show title</label><label className="visual-switch"><input type="checkbox" checked={header.showMenu} onChange={(event) => patch({ showMenu: event.target.checked })} /> Show menu</label></details>
    <SharedEditor content={content} change={change} />
  </div>;
}

export function Editor({ initialDraft, initialPublished, initialRevision, userEmail }: { initialDraft: NewsletterContent; initialPublished: NewsletterContent; initialRevision: number; userEmail: string }) {
  const normalized = (value: NewsletterContent) => ({ ...value, visual: visualDocument(value) });
  const [content, setContent] = useState<NewsletterContent>(() => normalized(initialDraft)); const [saved, setSaved] = useState<NewsletterContent>(() => normalized(initialDraft)); const [, setPublished] = useState<NewsletterContent>(() => normalized(initialPublished));
  const [revision, setRevision] = useState(initialRevision); const revisionRef = useRef(initialRevision);
  const [page, setPage] = useState<VisualPageId>("home"); const [device, setDevice] = useState<"phone" | "desktop">("phone");
  // Selection is an array so shift-click can extend it. The first entry is the
  // primary selection and drives the inspector.
  const [selectedIds, setSelectedIds] = useState<string[]>([]); const selectedId = selectedIds[0] ?? null;
  const [drawer, setDrawer] = useState<"add" | "layers" | "design" | "weekly" | "history" | "media" | "blocks" | null>("weekly");
  // The ⌘K command palette is a modal overlay, independent of the drawers.
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Weekly mode is the default: routine updates are the common case, and the
  // full design canvas is a deliberate step up rather than the starting point.
  const [mode, setMode] = useState<"weekly" | "design">("weekly");
  const [checklistOpen, setChecklistOpen] = useState(false);
  // Phones get a different shell: the inspector is a dismissible sheet rather
  // than a permanent panel, so the canvas stays visible while editing.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const query = globalThis.matchMedia("(max-width: 900px)");
    const sync = () => setIsMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  // The phone sheet is tracked separately from the desktop panel rather than
  // sharing one flag: on a phone the inspector covers the canvas, so it must
  // start closed and open only when explicitly asked for.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [query, setQuery] = useState(""); const [busy, setBusy] = useState(false); const [saving, setSaving] = useState(false); const [status, setStatus] = useState("All changes saved"); const [conflict, setConflict] = useState(false);
  const autosaveRef = useRef<Promise<void> | null>(null); const clipboard = useRef<VisualBlock | null>(null);
  // Command history. Continuous gestures (drag, resize) open a transaction so
  // the whole interaction collapses into one undo step.
  // Held in state (not a ref) purely so it is created once without reading a
  // ref during render; the instance itself never changes.
  const [history] = useState(() => new History<NewsletterContent>());
  const [historyState, setHistoryState] = useState<ReturnType<History<NewsletterContent>["snapshot"]>>({ canUndo: false, canRedo: false, undoLabel: null, redoLabel: null, depth: 0 });
  useEffect(() => history.subscribe(() => setHistoryState(history.snapshot())), [history]);
  // Mirrors `content` synchronously so history and rapid successive edits always
  // see the newest document without waiting for a React commit.
  const contentRef = useRef(content);
  const surfaceRef = useRef<HTMLElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const guidesRef = useRef<GuideLayerHandle | null>(null);
  const document = useMemo(() => visualDocument(content), [content]); const theme = document.theme; const pageDocument = document.pages[page]; const selected = pageDocument.items.find((item) => item.id === selectedId) ?? null; const selectedRow = pageDocument.rows.find((row) => row.itemIds.includes(selectedId ?? ""));
  const dirty = useMemo(() => JSON.stringify(content) !== JSON.stringify(saved), [content, saved]);

  // Every mutation runs through here. Computing the next document outside the
  // setState updater keeps the updater pure — React may call it twice, which
  // would otherwise record duplicate history entries.
  const edit = useCallback((mutator: (draft: NewsletterContent) => void, options?: { label?: string; coalesceKey?: string }) => {
    setConflict(false);
    const previous = contentRef.current;
    const next = structuredClone(previous);
    mutator(next);
    next.visual = visualDocument(next);
    contentRef.current = next;
    history.record(previous, next, { label: options?.label ?? "Edit", coalesceKey: options?.coalesceKey });
    setContent(next);
  }, [history]);
  const updateVisual = useCallback((mutator: (doc: ReturnType<typeof visualDocument>) => void, options?: { label?: string; coalesceKey?: string }) => edit((draft) => { const next = visualDocument(draft); mutator(next); draft.visual = next; }, options), [edit]);
  /** Replaces the whole visual document — used by the pure ops in documentOps. */
  const applyOp = useCallback((label: string, op: (doc: ReturnType<typeof visualDocument>) => ReturnType<typeof visualDocument>) => {
    edit((draft) => { draft.visual = op(visualDocument(draft)); }, { label });
  }, [edit]);
  const beginGesture = useCallback((label: string) => history.begin(contentRef.current, label), [history]);
  const endGesture = useCallback(() => history.commit(contentRef.current), [history]);
  const patchItem = useCallback((id: string, patch: Partial<VisualBlock>) => updateVisual((doc) => { const item = doc.pages[page].items.find((candidate) => candidate.id === id); if (item) Object.assign(item, patch); }), [page, updateVisual]);
  const patchLayout = useCallback((id: string, patch: Partial<ResponsiveLayout>) => updateVisual((doc) => { const item = doc.pages[page].items.find((candidate) => candidate.id === id); if (!item) return; const style = item.style ?? {}; const target = device; item.style = { ...style, [target]: { ...style[target], ...patch } }; if (style.linkedDevices) item.style[target === "phone" ? "desktop" : "phone"] = { ...style[target === "phone" ? "desktop" : "phone"], ...patch }; }), [device, page, updateVisual]);
  const patchPage = (patch: Partial<typeof pageDocument>) => updateVisual((doc) => Object.assign(doc.pages[page], patch));

  const moveItem = useCallback((itemId: string, targetRowId: string, zone: ops.DropZone) => applyOp("Move item", (doc) => ops.moveItem(doc, page, itemId, targetRowId, zone)), [applyOp, page]);
  // Arrow-key nudges coalesce: holding a key is one undo step, not forty.
  const nudge = useCallback((id: string, dx: number, dy: number) => edit((draft) => { draft.visual = ops.nudgeItem(visualDocument(draft), page, id, device, dx, dy); }, { label: "Nudge", coalesceKey: `nudge:${id}` }), [device, edit, page]);

  const addTemplate = useCallback((templateId: string) => { const template = templates.find((item) => item.id === templateId); if (!template) return; const item = makeItem(template); updateVisual((doc) => { doc.pages[page].items.push(item); doc.pages[page].rows.push({ id: `${page}-row-${uid()}`, itemIds: [item.id], gap: 16, align: "stretch", keepColumnsOnPhone: false }); }); setSelectedIds([item.id]); setDrawer(null); setInspectorOpen(true); }, [page, updateVisual]);
  const duplicate = useCallback((id: string) => {
    const result = ops.duplicateItem(visualDocument(contentRef.current), page, id);
    if (!result.newId) return;
    applyOp("Duplicate", () => result.doc);
    setSelectedIds([result.newId]);
  }, [applyOp, page]);
  // Native newsletter sections are hidden rather than deleted — their copy lives
  // in NewsletterContent and must survive.
  const remove = useCallback((id: string) => { applyOp("Delete", (doc) => ops.removeItem(doc, page, id)); setSelectedIds([]); }, [applyOp, page]);
  const hideItem = useCallback((id: string) => { applyOp("Hide", (doc) => ops.setHidden(doc, page, id, true)); setSelectedIds([]); }, [applyOp, page]);
  const removeSelected = useCallback((item: VisualBlock) => remove(item.id), [remove]);

  // --- multi-selection commands -------------------------------------------
  const groupSelected = useCallback(() => applyOp("Group", (doc) => ops.groupItems(doc, page, selectedIds)), [applyOp, page, selectedIds]);
  const ungroupSelected = useCallback(() => applyOp("Ungroup", (doc) => ops.ungroupItems(doc, page, selectedIds)), [applyOp, page, selectedIds]);
  const alignSelected = useCallback((align: ops.AlignMode) => applyOp("Align", (doc) => ops.alignItems(doc, page, selectedIds, align, device)), [applyOp, device, page, selectedIds]);
  const matchSelected = useCallback((dimension: ops.SizeDimension) => applyOp("Match size", (doc) => ops.matchSize(doc, page, selectedIds, dimension, device)), [applyOp, device, page, selectedIds]);
  const distributeSelected = useCallback(() => applyOp("Distribute", (doc) => ops.distributeWidths(doc, page, selectedIds, device)), [applyOp, device, page, selectedIds]);

  const undo = useCallback(() => { const state = history.undo(); if (state) { contentRef.current = state; setContent(state); } }, [history]);
  const redo = useCallback(() => { const state = history.redo(); if (state) { contentRef.current = state; setContent(state); } }, [history]);

  type ApiData = { draft?: NewsletterContent; published?: NewsletterContent; revision?: number; error?: string };
  const api = useCallback(async (url: string, init: RequestInit) => { const controller = new AbortController(); const timer = globalThis.setTimeout(() => controller.abort(), 20000); try { const response = await fetch(url, { headers: { "content-type": "application/json" }, signal: controller.signal, ...init }); const data = await response.json().catch(() => ({})) as ApiData; if (!response.ok) { const error = new Error(data.error || "Could not save changes.") as Error & { status?: number; revision?: number }; error.status = response.status; error.revision = data.revision; throw error; } return data; } catch (error) { if (error instanceof DOMException && error.name === "AbortError") throw new Error("Saving timed out. Your changes remain in this tab; try Save again."); throw error; } finally { globalThis.clearTimeout(timer); } }, []);
  const acceptSaved = useCallback((data: ApiData, snapshot: NewsletterContent) => { const next = normalized(data.draft ?? snapshot); const nextRevision = data.revision ?? revisionRef.current; revisionRef.current = nextRevision; setRevision(nextRevision); setSaved(next); setContent((current) => { const adopted = JSON.stringify(current) === JSON.stringify(snapshot) ? next : current; contentRef.current = adopted; return adopted; }); }, []);
  const persist = useCallback(async (snapshot: NewsletterContent, label?: string) => { const data = await api("/api/content", { method: "PUT", body: JSON.stringify({ content: snapshot, expectedRevision: revisionRef.current, label }) }); acceptSaved(data, snapshot); }, [acceptSaved, api]);

  useEffect(() => { if (!dirty || busy || saving || conflict) return; const snapshot = structuredClone(content); const timer = globalThis.setTimeout(() => { const task = (async () => { setSaving(true); setStatus("Saving draft…"); try { await persist(snapshot); setStatus("Draft autosaved"); } catch (error) { const typed = error as Error & { status?: number }; if (typed.status === 409) setConflict(true); setStatus(typed.message); } finally { setSaving(false); autosaveRef.current = null; } })(); autosaveRef.current = task; }, 1000); return () => globalThis.clearTimeout(timer); }, [busy, conflict, content, dirty, persist, saving]);

  const saveNow = async () => { setBusy(true); try { await autosaveRef.current?.catch(() => undefined); const snapshot = structuredClone(content); await persist(snapshot, "Manual save"); setConflict(false); setStatus("Draft saved"); } catch (error) { const typed = error as Error & { status?: number }; if (typed.status === 409) setConflict(true); setStatus(typed.message); } finally { setBusy(false); } };
  const publishNow = async () => { setBusy(true); try { await autosaveRef.current?.catch(() => undefined); let snapshot = structuredClone(content); if (JSON.stringify(snapshot) !== JSON.stringify(saved)) { const data = await api("/api/content", { method: "PUT", body: JSON.stringify({ content: snapshot, expectedRevision: revisionRef.current }) }); acceptSaved(data, snapshot); snapshot = normalized(data.draft ?? snapshot); } const result = await api("/api/content/publish", { method: "POST", body: JSON.stringify({ expectedRevision: revisionRef.current }) }); const nextRevision = result.revision ?? revisionRef.current; revisionRef.current = nextRevision; setRevision(nextRevision); setPublished(normalized(result.published ?? snapshot)); setSaved(snapshot); contentRef.current = snapshot; setContent(snapshot); setStatus("Published — live site updated"); setConflict(false); } catch (error) { const typed = error as Error & { status?: number }; if (typed.status === 409) setConflict(true); setStatus(typed.message); } finally { setBusy(false); } };

  const upload = async (file: File, hero = false) => { setBusy(true); try { const form = new FormData(); form.append("file", file); const response = await fetch("/api/media", { method: "POST", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Upload failed"); if (hero) patchHeader({ imageUrl: data.url }); else if (selected) patchItem(selected.id, { imageUrl: data.url, alt: selected.alt || file.name }); setStatus("Image uploaded"); } catch (error) { setStatus(error instanceof Error ? error.message : "Upload failed"); } finally { setBusy(false); } };
  const patchHeader = (patch: Partial<HeaderStyle>) => updateVisual((doc) => { doc.headers[page] = { ...doc.headers[page], ...patch }; });
  const patchHeaderDevice = (target: "phone" | "desktop", patch: Partial<HeaderDeviceStyle>) => updateVisual((doc) => { const header = doc.headers[page]; header[target] = { ...header[target], ...patch }; if (header.linked) header[target === "phone" ? "desktop" : "phone"] = { ...header[target === "phone" ? "desktop" : "phone"], ...patch }; });

  useEffect(() => {
    const keys = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      // Never hijack keys while a form field or the rich-text editor has focus.
      if (/INPUT|TEXTAREA|SELECT/.test(target.tagName) || target.isContentEditable) return;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); return; }
      if (event.key === "Escape") { event.preventDefault(); setSelectedIds([]); return; }

      if (mod && key === "g" && selectedIds.length > 1) {
        event.preventDefault();
        if (event.shiftKey) ungroupSelected(); else groupSelected();
        return;
      }
      if (mod && key === "d" && selected) { event.preventDefault(); duplicate(selected.id); return; }
      if (mod && key === "c" && selected) { clipboard.current = structuredClone(selected); return; }
      if (mod && key === "v" && clipboard.current) {
        event.preventDefault();
        const copy = structuredClone(clipboard.current);
        copy.id = uid();
        applyOp("Paste", (doc) => ops.insertItem(doc, page, copy, selected?.id));
        setSelectedIds([copy.id]);
        return;
      }
      if (selected && (event.key === "Backspace" || event.key === "Delete")) { event.preventDefault(); removeSelected(selected); return; }

      // Arrow keys nudge; shift makes it ten pixels.
      if (selected && event.key.startsWith("Arrow")) {
        const amount = event.shiftKey ? 10 : 1;
        const deltas: Record<string, [number, number]> = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] };
        const delta = deltas[event.key];
        if (delta) { event.preventDefault(); nudge(selected.id, delta[0], delta[1]); }
      }
    };
    globalThis.addEventListener("keydown", keys);
    return () => globalThis.removeEventListener("keydown", keys);
  }, [applyOp, duplicate, groupSelected, nudge, page, redo, removeSelected, selected, selectedIds.length, undo, ungroupSelected]);

  const moveRow = useCallback((itemId: string, dir: number) => updateVisual((doc) => { const rows = doc.pages[page].rows; const index = rows.findIndex((row) => row.itemIds.includes(itemId)); if (index < 0) return; const next = index + dir; if (next < 0 || next >= rows.length) return; const [row] = rows.splice(index, 1); rows.splice(next, 0, row); }), [page, updateVisual]);
  const setHeroText = useCallback((field: "title" | "kicker", value: string) => edit((draft) => {
    if (page === "home") { if (field === "title") draft.home.hero.headline = value; else draft.home.hero.kicker = value; }
    else if (page === "training") { if (field === "title") draft.training.heading = value; else draft.training.badge = value; }
    else { if (field === "title") draft.results.heading = value; else draft.results.eyebrow = value; }
  }), [edit, page]);
  // Rich text edits write both the formatted document and its plain-text mirror
  // so `title`/`body` stay usable by anything that has not been taught about
  // rich text yet (validation, search, the inspector's own summaries).
  const renderText = useCallback((request: TextFieldRequest) => (
    <RichTextEditor
      key={`${request.itemId}-${request.field}`}
      value={request.doc}
      theme={theme}
      className={request.className}
      placeholder={request.placeholder}
      singleLine={request.singleLine}
      ariaLabel={request.placeholder}
      onChange={(next) => patchItem(request.itemId, {
        [request.field]: next,
        [request.field === "richTitle" ? "title" : "body"]: richTextToPlain(next),
      })}
    />
  ), [patchItem, theme]);

  // Gestures write to the DOM while the pointer is down and commit once on
  // release, wrapped in a history transaction.
  const startResize = useResize({
    onBegin: () => beginGesture("Resize"),
    onCommit: (itemId, patch) => patchLayout(itemId, patch),
    onEnd: () => endGesture(),
    guides: guidesRef,
    surface: surfaceRef,
  });
  const canPair = useCallback((rowId: string, itemId: string) => {
    const row = visualDocument(contentRef.current).pages[page].rows.find((candidate) => candidate.id === rowId);
    if (!row) return false;
    return row.itemIds.includes(itemId) ? row.itemIds.length <= ops.MAX_ITEMS_PER_ROW : row.itemIds.length < ops.MAX_ITEMS_PER_ROW;
  }, [page]);
  const startDrag = useDragReorder({
    onBegin: () => beginGesture("Move item"),
    onDrop: moveItem,
    onEnd: () => endGesture(),
    guides: guidesRef,
    surface: surfaceRef,
    scroller: scrollerRef,
    canPair,
  });

  /** Scrolls the canvas to an item — used when selecting from the layers list. */
  const revealOnCanvas = useCallback((id: string) => {
    requestAnimationFrame(() => {
      surfaceRef.current
        ?.querySelector(`[data-item-id="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, []);

  // --- site theme ---------------------------------------------------------
  const patchTheme = useCallback((label: string, mutate: (draft: SiteTheme) => SiteTheme) => {
    updateVisual((doc) => { doc.theme = mutate(doc.theme); }, { label });
  }, [updateVisual]);

  const patchTextStyle = useCallback((id: TextStyleId, patch: Partial<TextStyleDef>) => {
    patchTheme("Text style", (draft) => {
      const next = { ...draft, textStyles: { ...draft.textStyles, [id]: { ...draft.textStyles[id], ...patch } } };
      // A colour chosen here becomes a recent colour everywhere.
      return typeof patch.color === "string" ? withRecentColor(next, patch.color) : next;
    });
  }, [patchTheme]);

  const patchToken = useCallback((id: string, patch: Partial<ColorToken>) => {
    patchTheme("Brand colour", (draft) => {
      const next = { ...draft, palette: draft.palette.map((token) => token.id === id ? { ...token, ...patch } : token) };
      return typeof patch.value === "string" ? withRecentColor(next, patch.value) : next;
    });
  }, [patchTheme]);

  const resetTextStyle = useCallback((id: TextStyleId) => {
    patchTheme("Reset text style", (draft) => ({ ...draft, textStyles: { ...draft.textStyles, [id]: defaultTextStyles()[id] } }));
  }, [patchTheme]);

  const resetTheme = useCallback(() => patchTheme("Reset theme", (draft) => ({ ...defaultTheme(), recentColors: draft.recentColors })), [patchTheme]);

  // --- Looks (whole-design presets) ---------------------------------------
  // Applying a Look swaps the theme through one op, so it is a single undo step.
  const applyLook = useCallback((look: Look) => { applyOp(`Apply look: ${look.name}`, (doc) => ops.applyLook(doc, look)); setStatus(`Applied “${look.name}”`); }, [applyOp]);
  const saveLook = useCallback((name: string) => { updateVisual((doc) => { doc.looks = [...doc.looks, { id: uid(), name: name || "New look", theme: structuredClone(doc.theme) }]; }, { label: "Save look" }); setStatus("Look saved"); }, [updateVisual]);
  const renameLook = useCallback((id: string, name: string) => updateVisual((doc) => { const look = doc.looks.find((entry) => entry.id === id); if (look) look.name = name; }, { label: "Rename look", coalesceKey: `look-name:${id}` }), [updateVisual]);
  const duplicateLook = useCallback((id: string) => updateVisual((doc) => { const look = doc.looks.find((entry) => entry.id === id); if (look) doc.looks.push({ id: uid(), name: `${look.name} copy`, theme: structuredClone(look.theme) }); }, { label: "Duplicate look" }), [updateVisual]);
  const deleteLook = useCallback((id: string) => updateVisual((doc) => { doc.looks = doc.looks.filter((entry) => entry.id !== id); if (doc.activeLookId === id) delete doc.activeLookId; }, { label: "Delete look" }), [updateVisual]);

  // --- Saved blocks (reusable across issues) ------------------------------
  const saveBlock = useCallback((name: string) => { if (!selected || selected.kind === "native") return; const block = structuredClone(selected); updateVisual((doc) => { doc.savedBlocks = [...doc.savedBlocks, { id: uid(), name: name || selected.label, block }]; }, { label: "Save block" }); setStatus("Block saved to library"); }, [selected, updateVisual]);
  const insertSavedBlock = useCallback((entry: SavedBlock) => { const instance = ops.makeBlockInstance(entry.block); applyOp("Insert block", (doc) => ops.insertItem(doc, page, instance, selected?.id)); setSelectedIds([instance.id]); setInspectorOpen(true); setStatus(`Inserted “${entry.name}”`); }, [applyOp, page, selected]);
  const renameSavedBlock = useCallback((id: string, name: string) => updateVisual((doc) => { const block = doc.savedBlocks.find((entry) => entry.id === id); if (block) block.name = name; }, { label: "Rename block", coalesceKey: `block-name:${id}` }), [updateVisual]);
  const deleteSavedBlock = useCallback((id: string) => updateVisual((doc) => { doc.savedBlocks = doc.savedBlocks.filter((entry) => entry.id !== id); }, { label: "Delete block" }), [updateVisual]);

  /** How many rich-text blocks link to each global style, shown in the panel. */
  const styleUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const target of Object.values(document.pages)) {
      for (const item of target.items) {
        for (const doc of [item.richTitle, item.richBody]) {
          for (const block of doc?.blocks ?? []) {
            if (block.styleId) counts[block.styleId] = (counts[block.styleId] ?? 0) + 1;
          }
        }
      }
    }
    return counts;
  }, [document]);

  const select = useCallback((id: string, additive?: boolean) => {
    setSelectedIds((previous) => {
      if (!additive) return [id];
      return previous.includes(id) ? previous.filter((candidate) => candidate !== id) : [...previous, id];
    });
    setInspectorOpen(true);
  }, []);

  /**
   * Formatting for the fixed newsletter copy. The words stay in
   * NewsletterContent (so nothing that reads those fields breaks) while the
   * formatting lives in the visual document's override map, keyed by field path.
   * Both are written together on every edit.
   */
  const renderField = useCallback((request: ContentFieldRequest) => (
    <RichTextEditor
      key={request.path}
      value={request.doc ?? richTextFromPlain(request.value)}
      theme={theme}
      inline={!request.block}
      singleLine={!request.block}
      className={request.className}
      placeholder={request.placeholder}
      ariaLabel={`Edit ${request.path.split(".").pop() ?? "text"}`}
      fieldPath={request.path}
      onChange={(next) => edit((draft) => {
        const doc = visualDocument(draft);
        doc.richOverrides = { ...doc.richOverrides, [request.path]: next };
        draft.visual = doc;
        // Keep the plain field authoritative for the words themselves.
        setByPath(draft, request.path, richTextToPlain(next));
      }, { label: "Edit text", coalesceKey: `field:${request.path}` })}
    />
  ), [edit, theme]);

  // Validation feeds both the publish checklist and the weekly section list, so
  // the two can never disagree about what is wrong.
  const validation = useMemo(
    () => validateNewsletter(content, document, { dirty }),
    [content, document, dirty],
  );
  const weeklySections = useMemo(
    () => buildSections(content, document, page, [...validation.errors, ...validation.warnings]),
    [content, document, page, validation],
  );

  const jumpToIssue = useCallback((issue: ValidationIssue) => {
    setChecklistOpen(false);
    if (issue.page && issue.page !== page) setPage(issue.page);
    if (issue.itemId) {
      setSelectedIds([issue.itemId]);
      revealOnCanvas(issue.itemId);
      return;
    }
    if (issue.path) {
      // Content-path issues live in a native section; focus its field directly.
      //
      // The checklist is still unmounting when this runs, and when the button
      // the user clicked disappears the browser bounces focus back to <body> —
      // clobbering ours. Rather than guess how many frames React needs, retry
      // until the focus sticks (or give up after a few frames).
      const path = issue.path;
      const target = () => globalThis.document.querySelector<HTMLElement>(`[data-field-path="${CSS.escape(path)}"]`);
      target()?.scrollIntoView({ block: "center", behavior: "smooth" });
      let attempts = 0;
      const settle = () => {
        const field = target();
        if (!field || attempts > 12) return;
        field.focus();
        attempts += 1;
        if (globalThis.document.activeElement !== field) requestAnimationFrame(settle);
      };
      requestAnimationFrame(settle);
    }
  }, [page, revealOnCanvas]);

  const startNextIssue = useCallback(() => {
    const result = createNextIssue(contentRef.current, visualDocument(contentRef.current));
    const confirmed = globalThis.confirm(
      `Create next issue?\n\n${result.summary.map((line) => `• ${line}`).join("\n")}\n\nThis updates your draft only. The live newsletter stays as it is until you publish.`,
    );
    if (!confirmed) return;
    edit((draft) => {
      Object.assign(draft, result.content);
    }, { label: "Create next issue" });
    setSelectedIds([]);
    setStatus("Next issue drafted — the live newsletter is unchanged");
  }, [edit]);

  const editor: CanvasEditorState = { selectedId, selectedIds, device,
    renderField,
    onDeselect: () => setSelectedIds([]),
    onStartDrag: startDrag,
    onStartResize: startResize,
    surfaceRef,
    overlay: <GuideLayer ref={guidesRef} />, onSelect: select, onMoveItem: moveItem, onResizeItem: (id, patch) => patchLayout(id, patch), onNudgeItem: nudge, onFreeTextChange: patchItem, onHeroTextChange: setHeroText, renderText };
  const filteredTemplates = templates.filter((item) => `${item.label} ${item.kind}`.toLowerCase().includes(query.toLowerCase()));

  // ⌘K opens the command palette from anywhere, including while a field has
  // focus — it is the one shortcut that must not be swallowed by inputs.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen((open) => !open); }
    };
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  }, []);

  // The palette's command list — pure data (pages, panels, templates, Looks,
  // saved blocks, and every section on the current page). No ref-reading
  // closures live here; `runCommand` performs the action from an event handler.
  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];
    for (const item of pages) list.push({ id: `page-${item.id}`, group: "Pages", label: `Go to ${item.label} page`, action: { kind: "page", page: item.id } });
    list.push({ id: "panel-add", group: "Panels", label: "Add an item…", action: { kind: "drawer", drawer: "add" } });
    list.push({ id: "panel-design", group: "Panels", label: "Open Site design & Looks", action: { kind: "drawer", drawer: "design" } });
    list.push({ id: "panel-blocks", group: "Panels", label: "Open Saved blocks", action: { kind: "drawer", drawer: "blocks" } });
    list.push({ id: "panel-media", group: "Panels", label: "Open Media library", action: { kind: "drawer", drawer: "media" } });
    list.push({ id: "panel-history", group: "Panels", label: "Open History", action: { kind: "drawer", drawer: "history" } });
    for (const template of templates) list.push({ id: `tmpl-${template.id}`, group: "Add a block", label: `Add ${template.label}`, hint: "template", action: { kind: "template", templateId: template.id } });
    for (const look of document.looks) list.push({ id: `look-${look.id}`, group: "Looks", label: `Apply Look: ${look.name}`, action: { kind: "look", lookId: look.id } });
    for (const block of document.savedBlocks) list.push({ id: `savedblock-${block.id}`, group: "Saved blocks", label: `Insert ${block.name}`, action: { kind: "block", blockId: block.id } });
    const pageLabel = pages.find((item) => item.id === page)?.label;
    for (const id of pageDocument.rows.flatMap((row) => row.itemIds)) {
      const item = pageDocument.items.find((candidate) => candidate.id === id);
      if (item) list.push({ id: `jump-${id}`, group: "Sections", label: `Edit ${item.label}`, hint: pageLabel, action: { kind: "jump", itemId: id } });
    }
    return list;
  }, [document.looks, document.savedBlocks, page, pageDocument]);

  const runCommand = useCallback((action: CommandAction) => {
    switch (action.kind) {
      case "page": setPage(action.page); setSelectedIds([]); return;
      case "drawer": setDrawer(action.drawer); return;
      case "template": addTemplate(action.templateId); return;
      case "look": { const look = contentRef.current.visual?.looks?.find((entry) => entry.id === action.lookId); if (look) applyLook(look); return; }
      case "block": { const block = contentRef.current.visual?.savedBlocks?.find((entry) => entry.id === action.blockId); if (block) insertSavedBlock(block); return; }
      case "jump": select(action.itemId); revealOnCanvas(action.itemId); setInspectorOpen(true); return;
    }
  }, [addTemplate, applyLook, insertSavedBlock, revealOnCanvas, select]);
  const dropTemplate = (event: ReactDragEvent<HTMLDivElement>) => { const id = event.dataTransfer.getData("application/x-newsletter-template"); if (id) { event.preventDefault(); addTemplate(id); } };
  const selectedStyle = selected?.style ?? {}; const currentLayout = selectedStyle[device] ?? {}; const heroSelected = selectedId === `hero-${page}`;
  const previewHref = page === "home" ? "/edit/preview" : `/edit/preview/${page}`;
  const changePage = (nextPage: VisualPageId) => {
    if (nextPage === page) return;
    setPage(nextPage);
    setSelectedIds([]);
    setDrawer(null);
    setSheetOpen(false);
  };

  return <div className="builder">
    <header className="builder-toolbar"><div className="builder-brand"><strong>Newsletter builder</strong><span>{userEmail}</span></div><div className="toolbar-group toolbar-group--content"><button type="button" className="toolbar-cmdk" title="Command palette (⌘K)" onClick={() => setPaletteOpen(true)}>⌘K</button><button type="button" className={drawer === "add" ? "is-active" : ""} onClick={() => setDrawer(drawer === "add" ? null : "add")}>＋ Add item</button><button type="button" onClick={() => setDrawer(drawer === "layers" ? null : "layers")}>View</button><button type="button" className={drawer === "design" ? "is-active" : ""} onClick={() => setDrawer(drawer === "design" ? null : "design")}>Design</button><button type="button" className={drawer === "blocks" ? "is-active" : ""} onClick={() => setDrawer(drawer === "blocks" ? null : "blocks")}>Blocks</button><button type="button" className={drawer === "media" ? "is-active" : ""} onClick={() => setDrawer(drawer === "media" ? null : "media")}>Media</button><button type="button" className={drawer === "history" ? "is-active" : ""} onClick={() => setDrawer(drawer === "history" ? null : "history")}>History</button></div><div className="device-switch mode-switch"><button type="button" className={mode === "weekly" ? "is-active" : ""} onClick={() => { setMode("weekly"); setDrawer("weekly"); }}>Weekly</button><button type="button" className={mode === "design" ? "is-active" : ""} onClick={() => { setMode("design"); setDrawer(null); }}>Design mode</button></div><div className="device-switch"><button type="button" className={device === "phone" ? "is-active" : ""} onClick={() => setDevice("phone")}>Phone</button><button type="button" className={device === "desktop" ? "is-active" : ""} onClick={() => setDevice("desktop")}>Desktop</button></div><div className="toolbar-group toolbar-group--undo"><button type="button" title={historyState.undoLabel ? `Undo ${historyState.undoLabel} (\u2318Z)` : "Undo (\u2318Z)"} aria-label="Undo" disabled={!historyState.canUndo || busy} onClick={undo}>↶</button><button type="button" title={historyState.redoLabel ? `Redo ${historyState.redoLabel} (\u2318\u21e7Z)` : "Redo (\u2318\u21e7Z)"} aria-label="Redo" disabled={!historyState.canRedo || busy} onClick={redo}>↷</button></div><span className={`save-state${conflict ? " save-state--error" : ""}`}>{saving ? "Saving…" : dirty ? "Autosave pending" : status} <small>r{revision}</small></span><a className="toolbar-link" href={previewHref} target="_blank">Preview</a><button type="button" onClick={saveNow} disabled={busy || conflict}>Save</button><button type="button" className="publish-button" onClick={() => setChecklistOpen(true)} disabled={busy || conflict}>Publish</button><button type="button" aria-label="Toggle inspector" onClick={() => (isMobile ? setSheetOpen(!sheetOpen) : setInspectorOpen(!inspectorOpen))}>☰</button></header>
    <nav className="editor-page-tabs" aria-label="Newsletter pages" role="tablist">
      {pages.map((item) => <button key={item.id} type="button" role="tab" aria-selected={page === item.id} className={page === item.id ? "is-active" : ""} onClick={() => changePage(item.id)}>{item.label}</button>)}
    </nav>
    {paletteOpen ? <CommandPalette commands={commands} onRun={runCommand} onClose={() => setPaletteOpen(false)} /> : null}
    {checklistOpen ? <PublishChecklist
      result={validation}
      busy={busy}
      onPublish={() => { setChecklistOpen(false); void publishNow(); }}
      onClose={() => setChecklistOpen(false)}
      onJump={jumpToIssue}
    /> : null}
    {conflict ? <div className="stale-banner"><strong>Newer changes exist in another tab.</strong><span>Your current tab has stopped autosaving to protect them.</span><button type="button" onClick={() => globalThis.location.reload()}>Reload latest draft</button></div> : null}
    <div className={`builder-workspace${inspectorOpen ? "" : " builder-workspace--wide"}`}>
      {drawer ? <aside className="builder-drawer">{drawer === "media" ? <MediaPanel
        onClose={() => setDrawer(null)}
        onUse={selected?.kind === "image" ? (asset: MediaAsset) => {
          patchItem(selected.id, { imageUrl: asset.url, alt: asset.altText ?? selected.alt ?? "" });
          setStatus("Image placed");
        } : null}
      /> : drawer === "weekly" ? <WeeklyMode
        sections={weeklySections}
        selectedId={selectedId}
        onEdit={(itemId) => { select(itemId); revealOnCanvas(itemId); }}
        onToggleHidden={(itemId, hidden) => applyOp(hidden ? "Hide" : "Show", (doc) => ops.setHidden(doc, page, itemId, hidden))}
        onMove={(itemId, direction) => moveRow(itemId, direction)}
        onCreateNextIssue={startNextIssue}
        onOpenChecklist={() => setChecklistOpen(true)}
      /> : drawer === "history" ? <HistoryPanel
        onClose={() => setDrawer(null)}
        onRestored={(nextRevision) => { revisionRef.current = nextRevision; globalThis.location.reload(); }}
      /> : drawer === "design" ? <SiteDesignPanel
        theme={theme}
        usage={styleUsage}
        onPatchStyle={patchTextStyle}
        onPatchToken={patchToken}
        onResetStyle={resetTextStyle}
        onResetTheme={resetTheme}
        onClose={() => setDrawer(null)}
        looks={document.looks}
        activeLookId={document.activeLookId}
        onApplyLook={applyLook}
        onSaveLook={saveLook}
        onRenameLook={renameLook}
        onDuplicateLook={duplicateLook}
        onDeleteLook={deleteLook}
      /> : drawer === "blocks" ? <SavedBlocksPanel
        blocks={document.savedBlocks}
        canSaveSelection={Boolean(selected && selected.kind !== "native")}
        onSaveSelection={saveBlock}
        onInsert={insertSavedBlock}
        onRename={renameSavedBlock}
        onDelete={deleteSavedBlock}
        onClose={() => setDrawer(null)}
      /> : drawer === "add" ? <><div className="drawer-heading"><h2>Add an item</h2><button type="button" onClick={() => setDrawer(null)}>×</button></div><input className="template-search" type="search" placeholder="Search templates" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="template-list">{filteredTemplates.map((item) => <button key={item.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-newsletter-template", item.id); }} onClick={() => addTemplate(item.id)}><span>{item.icon}</span><strong>{item.label}</strong><small>Click or drag to canvas</small></button>)}</div></> : <><div className="drawer-heading"><h2>Items</h2><button type="button" onClick={() => setDrawer(null)}>×</button></div><button type="button" className="layer-item" onClick={() => { setSelectedIds([`hero-${page}`]); setInspectorOpen(true); setDrawer(null); }}>Hero</button>{pageDocument.rows.flatMap((row) => row.itemIds).map((id, index, ids) => { const item = pageDocument.items.find((candidate) => candidate.id === id); return item ? <div className={`layer-row${selectedIds.includes(id) ? " is-active" : ""}`} key={id}><button type="button" className="layer-row__select" onClick={(event) => { select(id, event.shiftKey); revealOnCanvas(id); }}>{item.label}{item.style?.hidden ? <em> · hidden</em> : null}</button><button type="button" className="layer-row__move" onClick={() => (item.style?.hidden ? applyOp("Show", (doc) => ops.setHidden(doc, page, id, false)) : hideItem(id))} aria-label={item.style?.hidden ? `Show ${item.label}` : `Hide ${item.label}`} title={item.style?.hidden ? "Show" : "Hide"}>{item.style?.hidden ? "◌" : "◉"}</button><button type="button" className="layer-row__move" onClick={() => moveRow(id, -1)} disabled={index === 0} aria-label="Move up">↑</button><button type="button" className="layer-row__move" onClick={() => moveRow(id, 1)} disabled={index === ids.length - 1} aria-label="Move down">↓</button></div> : null; })}</>}</aside> : null}
      <main className="builder-stage"><div className="stage-top"><span>{pages.find((item) => item.id === page)?.label} · {device}</span><button type="button" onClick={() => { setSelectedIds([`hero-${page}`]); setInspectorOpen(true); }}>Edit Hero</button></div><div ref={scrollerRef} className={`builder-canvas builder-canvas--${device}`} style={{ background: pageDocument.background }} onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-newsletter-template")) event.preventDefault(); }} onDrop={dropTemplate}>{page === "home" ? <HomeView content={content} editor={editor} /> : page === "training" ? <TrainingView content={content} editor={editor} /> : <ResultsView content={content} editor={editor} />}</div></main>
      {isMobile ? <>
        {selected && !sheetOpen ? (
          <div className="mobile-selection" role="status">
            <span className="mobile-selection__name">{selected.label}</span>
            <button type="button" onClick={() => setSheetOpen(true)}>Edit</button>
            <button type="button" aria-label="Deselect" onClick={() => setSelectedIds([])}>×</button>
          </div>
        ) : null}
        <nav className="mobile-nav" aria-label="Editor navigation">
          <button type="button" className={drawer === "weekly" ? "is-active" : ""} onClick={() => setDrawer(drawer === "weekly" ? null : "weekly")}>
            <span aria-hidden="true">☰</span>Sections
          </button>
          <button type="button" className={drawer === "add" ? "is-active" : ""} onClick={() => setDrawer(drawer === "add" ? null : "add")}>
            <span aria-hidden="true">＋</span>Add
          </button>
          <a href={previewHref} target="_blank" rel="noreferrer">
            <span aria-hidden="true">👁</span>Preview
          </a>
          <button type="button" className="mobile-nav__publish" onClick={() => setChecklistOpen(true)} disabled={busy || conflict}>
            <span aria-hidden="true">↑</span>Publish
          </button>
        </nav>
      </> : null}
      {(isMobile ? sheetOpen : inspectorOpen) ? <aside className="builder-inspector">{isMobile ? <button type="button" className="inspector-close" onClick={() => setSheetOpen(false)} aria-label="Close panel"><span aria-hidden="true" /></button> : null}{selectedIds.length > 1 ? <div className="multi-actions">
        <p className="visual-kicker">{selectedIds.length} items selected</p>
        <div className="multi-actions__row">
          <button type="button" onClick={groupSelected} title="Group (⌘G)">Group</button>
          <button type="button" onClick={ungroupSelected} title="Ungroup (⌘⇧G)">Ungroup</button>
        </div>
        <div className="multi-actions__row">
          <button type="button" onClick={() => alignSelected("left")}>Align left</button>
          <button type="button" onClick={() => alignSelected("center")}>Centre</button>
          <button type="button" onClick={() => alignSelected("right")}>Align right</button>
        </div>
        <div className="multi-actions__row">
          <button type="button" onClick={() => matchSelected("width")}>Match width</button>
          <button type="button" onClick={() => matchSelected("height")}>Match height</button>
          <button type="button" onClick={() => matchSelected("both")}>Match both</button>
        </div>
        <div className="multi-actions__row">
          <button type="button" onClick={distributeSelected}>Distribute widths</button>
        </div>
        <p className="inspector-note">Sizes apply to the <strong>{device}</strong> layout. Shift-click on the canvas or in Items to change the selection.</p>
      </div> : heroSelected ? <HeroInspector page={page} header={document.headers[page]} content={content} patch={patchHeader} patchDevice={patchHeaderDevice} upload={(file) => void upload(file, true)} change={edit} /> : selected ? <div className="editor-inspector-form"><div className="inspector-heading"><p className="visual-kicker">Selected item</p><h2>{selected.label}</h2></div>{selected.kind !== "native" ? <><label className="visual-control"><span>Label</span><input value={selected.label} onChange={(event) => patchItem(selected.id, { label: event.target.value })} /></label>{selected.kind === "text" || selected.kind === "container" || selected.kind === "button" ? <label className="visual-control"><span>{selected.kind === "button" ? "Button text" : "Heading"}</span><input value={selected.title ?? ""} onChange={(event) => patchItem(selected.id, { title: event.target.value })} /></label> : null}{selected.kind === "text" || selected.kind === "container" ? <label className="visual-control"><span>Text</span><textarea value={selected.body ?? ""} onChange={(event) => patchItem(selected.id, { body: event.target.value })} /></label> : null}{selected.kind === "button" ? <label className="visual-control"><span>Link</span><input value={selected.href ?? ""} onChange={(event) => patchItem(selected.id, { href: event.target.value })} /></label> : null}{selected.kind === "image" ? <><label className="visual-control"><span>Image URL</span><input value={selected.imageUrl ?? ""} onChange={(event) => patchItem(selected.id, { imageUrl: event.target.value })} /></label><label className="visual-upload"><span>Upload image</span><input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label></> : null}</> : <p className="inspector-note">This newsletter item keeps its existing structured copy. Its layout and appearance use the same renderer on the canvas and live site.</p>}
        {selected.kind === "native" ? <NativeEditor id={selected.nativeId ?? selected.id} content={content} change={edit} /> : null}
        <details className="inspector-section" open><summary>Size · {device}</summary>
          <div className="segmented" role="group" aria-label="Width"><button type="button" onClick={() => patchLayout(selected.id, { width: 100 })}>Full</button><button type="button" onClick={() => patchLayout(selected.id, { width: 50 })}>Half</button><button type="button" onClick={() => patchLayout(selected.id, { width: undefined })}>Auto</button></div>
          <div className="inspector-grid"><NumberField label={`Width % (${device})`} value={currentLayout.width} min={10} max={100} onCommit={(value) => patchLayout(selected.id, { width: value })} /><NumberField label={`Min height px (${device})`} value={currentLayout.minHeight} min={0} max={1600} onCommit={(value) => patchLayout(selected.id, { minHeight: value })} /></div>
          <p className="inspector-device-note">Drag the blue handles on the canvas — right edge for width, bottom for height. Sizing saves per device; you’re editing <strong>{device}</strong>.</p>
        </details>
        {selectedRow ? <details className="inspector-section"><summary>Arrangement</summary>
          <label className="visual-control"><span>Align items in row</span><select value={selectedRow.align} onChange={(event) => updateVisual((doc) => { const row = doc.pages[page].rows.find((candidate) => candidate.id === selectedRow.id); if (row) row.align = event.target.value as "start" | "center" | "end" | "stretch"; })}>{["stretch", "start", "center", "end"].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <NumberField label="Gap between columns" value={selectedRow.gap} min={0} max={96} onCommit={(value) => updateVisual((doc) => { const row = doc.pages[page].rows.find((candidate) => candidate.id === selectedRow.id); if (row) row.gap = value ?? 16; })} />
          {selectedRow.itemIds.length >= 2 ? <><label className="visual-switch"><input type="checkbox" checked={selectedRow.keepColumnsOnPhone} onChange={(event) => updateVisual((doc) => { const row = doc.pages[page].rows.find((candidate) => candidate.id === selectedRow.id); if (row) row.keepColumnsOnPhone = event.target.checked; })} /> Keep side-by-side on phone</label><p className="inspector-device-note">Off by default: paired items stack on phones and sit side-by-side on desktop.</p></> : null}
        </details> : null}
        <details className="inspector-section"><summary>Spacing · {device}</summary><p className="inspector-device-note">Space above this item</p><div className="segmented" role="group" aria-label="Space above"><button type="button" onClick={() => patchLayout(selected.id, { marginTop: -12 })}>Tight</button><button type="button" onClick={() => patchLayout(selected.id, { marginTop: 0 })}>Snug</button><button type="button" onClick={() => patchLayout(selected.id, { marginTop: 16 })}>Normal</button><button type="button" onClick={() => patchLayout(selected.id, { marginTop: 40 })}>Roomy</button></div><div className="inspector-grid"><NumberField label="Top padding" value={currentLayout.paddingTop ?? selectedStyle.paddingTop} min={0} max={240} onCommit={(value) => patchLayout(selected.id, { paddingTop: value })} /><NumberField label="Bottom padding" value={currentLayout.paddingBottom ?? selectedStyle.paddingBottom} min={0} max={240} onCommit={(value) => patchLayout(selected.id, { paddingBottom: value })} /><NumberField label="Left padding" value={currentLayout.paddingLeft ?? selectedStyle.paddingLeft} min={0} max={240} onCommit={(value) => patchLayout(selected.id, { paddingLeft: value })} /><NumberField label="Right padding" value={currentLayout.paddingRight ?? selectedStyle.paddingRight} min={0} max={240} onCommit={(value) => patchLayout(selected.id, { paddingRight: value })} /></div><div className="inspector-grid"><NumberField label="Space above" value={currentLayout.marginTop} min={-80} max={240} onCommit={(value) => patchLayout(selected.id, { marginTop: value })} /><NumberField label="Space below" value={currentLayout.marginBottom} min={-80} max={240} onCommit={(value) => patchLayout(selected.id, { marginBottom: value })} /></div></details>
        <details className="inspector-section"><summary>Style</summary><div className="alignment-buttons"><button type="button" onClick={() => patchItem(selected.id, { style: { ...selectedStyle, textAlign: "left" } })}>Left</button><button type="button" onClick={() => patchItem(selected.id, { style: { ...selectedStyle, textAlign: "center" } })}>Middle</button><button type="button" onClick={() => patchItem(selected.id, { style: { ...selectedStyle, textAlign: "right" } })}>Right</button></div><ColorField label="Background" value={selectedStyle.background} onChange={(value) => patchItem(selected.id, { style: { ...selectedStyle, background: value } })} /><ColorField label="Text color" value={selectedStyle.color} onChange={(value) => patchItem(selected.id, { style: { ...selectedStyle, color: value } })} /><div className="inspector-grid"><NumberField label="Corner radius" value={selectedStyle.borderRadius} min={0} max={160} onCommit={(value) => patchItem(selected.id, { style: { ...selectedStyle, borderRadius: value } })} /><NumberField label="Font size" value={selectedStyle.fontSize} min={8} max={160} onCommit={(value) => patchItem(selected.id, { style: { ...selectedStyle, fontSize: value } })} /></div><div className="inspector-grid"><ColorField label="Border color" value={selectedStyle.borderColor} onChange={(value) => patchItem(selected.id, { style: { ...selectedStyle, borderColor: value } })} /><NumberField label="Border width" value={selectedStyle.borderWidth} min={0} max={20} onCommit={(value) => patchItem(selected.id, { style: { ...selectedStyle, borderWidth: value } })} /></div></details>
        <details className="inspector-section"><summary>Advanced</summary><label className="visual-switch"><input type="checkbox" checked={selectedStyle.linkedDevices ?? false} onChange={(event) => patchItem(selected.id, { style: { ...selectedStyle, linkedDevices: event.target.checked } })} /> Link phone &amp; desktop sizing</label><label className="visual-switch"><input type="checkbox" checked={selectedStyle.hidden ?? false} onChange={(event) => patchItem(selected.id, { style: { ...selectedStyle, hidden: event.target.checked } })} /> Hide on canvas &amp; live site</label><div className="inspector-grid"><NumberField label="Fine nudge X" value={currentLayout.nudgeX} min={-48} max={48} onCommit={(value) => patchLayout(selected.id, { nudgeX: value })} /><NumberField label="Fine nudge Y" value={currentLayout.nudgeY} min={-48} max={48} onCommit={(value) => patchLayout(selected.id, { nudgeY: value })} /></div></details>
        <div className="inspector-actions"><button type="button" onClick={() => duplicate(selected.id)}>Duplicate</button>{selected.kind !== "native" ? <button type="button" onClick={() => saveBlock(selected.label)}>Save as block</button> : null}<button type="button" className="danger" onClick={() => removeSelected(selected)}>{selected.kind === "native" ? "Remove section" : "Delete"}</button></div></div> : <div className="editor-inspector-form"><div className="inspector-heading"><p className="visual-kicker">Page</p><h2>{pages.find((item) => item.id === page)?.label} settings</h2></div><ColorField label="Page background" value={pageDocument.background} onChange={(value) => patchPage({ background: value })} /><div className="inspector-grid"><NumberField label="Content width" value={pageDocument.contentWidth} min={320} max={1400} onCommit={(value) => patchPage({ contentWidth: value ?? 760 })} /><NumberField label="Row spacing" value={pageDocument.rowGap} min={0} max={160} onCommit={(value) => patchPage({ rowGap: value ?? 22 })} /></div><NumberField label="Minimum page height" value={pageDocument.minHeight} min={0} max={12000} onCommit={(value) => patchPage({ minHeight: value ?? 0 })} /><details className="inspector-section"><summary>Page padding</summary><div className="inspector-grid"><NumberField label="Top" value={pageDocument.paddingTop} min={0} max={240} onCommit={(value) => patchPage({ paddingTop: value ?? 0 })} /><NumberField label="Bottom" value={pageDocument.paddingBottom} min={0} max={240} onCommit={(value) => patchPage({ paddingBottom: value ?? 0 })} /><NumberField label="Left" value={pageDocument.paddingLeft} min={0} max={240} onCommit={(value) => patchPage({ paddingLeft: value ?? 0 })} /><NumberField label="Right" value={pageDocument.paddingRight} min={0} max={240} onCommit={(value) => patchPage({ paddingRight: value ?? 0 })} /></div></details><p className="inspector-note">The page grows automatically. Select any item to edit content, size, spacing, and style. Paired items stack on phone automatically.</p></div>}</aside> : null}
    </div>
  </div>;
}
