/**
 * Persistence. The editor writes a structured document, never HTML.
 *
 * - `dw:site`      current editor document (autosaved)
 * - `dw:versions`  rolling version history for recovery
 * - `dw:published` the published snapshot, kept separate from editor state
 * - `dw:ui`        small UI preferences (active page, viewport, panels)
 */

import { newId } from '../model/blueprint';
import type { PublishedSite, SiteDoc, SiteVersion } from '../model/types';
import { useDoc } from '../store/docStore';
import { useEditor } from '../store/editorStore';

const KEY_SITE = 'dw:site';
const KEY_VERSIONS = 'dw:versions';
const KEY_PUBLISHED = 'dw:published';
const KEY_UI = 'dw:ui';

const AUTOSAVE_DELAY = 700;
const MAX_VERSIONS = 40;
/** Take an automatic recovery snapshot at most this often. */
const AUTO_VERSION_INTERVAL = 5 * 60 * 1000;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn(`[persistence] could not read ${key}`, err);
    return null;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`[persistence] could not write ${key}`, err);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Site document                                                       */
/* ------------------------------------------------------------------ */

export function loadSite(): SiteDoc | null {
  const doc = read<SiteDoc>(KEY_SITE);
  if (!doc || !doc.elements || !doc.pages) return null;
  return migrate(doc);
}

/** Forward-compatibility shim so older saved docs keep opening. */
function migrate(doc: SiteDoc): SiteDoc {
  doc.savedSections ??= [];
  doc.components ??= {};
  doc.assets ??= {};
  doc.rev ??= 0;
  for (const el of Object.values(doc.elements)) {
    el.styles ??= { base: {}, tablet: {}, mobile: {} };
    el.styles.tablet ??= {};
    el.styles.mobile ??= {};
    el.settings ??= {};
    el.children ??= [];
  }
  return doc;
}

export function saveSite(doc: SiteDoc): boolean {
  return write(KEY_SITE, doc);
}

export interface UiPrefs {
  activePageId?: string | null;
  viewport?: string;
  leftTab?: string | null;
  rightPanelOpen?: boolean;
  canvasFit?: boolean;
  canvasWidth?: number;
}

export const loadUiPrefs = () => read<UiPrefs>(KEY_UI) ?? {};
export const saveUiPrefs = (p: UiPrefs) => write(KEY_UI, p);

/* ------------------------------------------------------------------ */
/* Versions                                                            */
/* ------------------------------------------------------------------ */

export const loadVersions = (): SiteVersion[] => read<SiteVersion[]>(KEY_VERSIONS) ?? [];

export function pushVersion(doc: SiteDoc, label: string, auto: boolean): SiteVersion[] {
  const versions = loadVersions();
  const entry: SiteVersion = {
    id: newId('v'),
    label,
    createdAt: Date.now(),
    auto,
    doc: structuredClone(doc),
  };
  let next = [entry, ...versions];

  // Keep every named version; trim automatic ones first.
  if (next.length > MAX_VERSIONS) {
    const named = next.filter((v) => !v.auto);
    const autos = next.filter((v) => v.auto).slice(0, Math.max(0, MAX_VERSIONS - named.length));
    next = [...named, ...autos].sort((a, b) => b.createdAt - a.createdAt);
  }

  if (!write(KEY_VERSIONS, next)) {
    // Storage full — drop the oldest automatic snapshots and retry once.
    const trimmed = next.filter((v) => !v.auto).slice(0, 10);
    write(KEY_VERSIONS, trimmed);
    return trimmed;
  }
  return next;
}

export function renameVersion(id: string, label: string): SiteVersion[] {
  const next = loadVersions().map((v) => (v.id === id ? { ...v, label, auto: false } : v));
  write(KEY_VERSIONS, next);
  return next;
}

export function deleteVersion(id: string): SiteVersion[] {
  const next = loadVersions().filter((v) => v.id !== id);
  write(KEY_VERSIONS, next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Published snapshot                                                  */
/* ------------------------------------------------------------------ */

export const loadPublished = (): PublishedSite | null => read<PublishedSite>(KEY_PUBLISHED);

export function publishSite(doc: SiteDoc): PublishedSite {
  const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
  const published: PublishedSite = {
    publishedAt: Date.now(),
    // A stable, domain-shaped address. Custom domains would map onto this
    // same record without changing the publish pipeline.
    url: `https://${slug}.published.site`,
    doc: structuredClone(doc),
  };
  write(KEY_PUBLISHED, published);
  return published;
}

export function unpublishSite() {
  localStorage.removeItem(KEY_PUBLISHED);
}

/* ------------------------------------------------------------------ */
/* Autosave wiring                                                     */
/* ------------------------------------------------------------------ */

let timer: number | undefined;
let lastAutoVersion = 0;

export function startAutosave() {
  const flush = () => {
    const doc = useDoc.getState().doc;
    const ed = useEditor.getState();
    ed.setSaveStatus('saving');
    const ok = saveSite(doc);
    if (ok) {
      ed.setSaveStatus('saved', Date.now());
      if (Date.now() - lastAutoVersion > AUTO_VERSION_INTERVAL) {
        lastAutoVersion = Date.now();
        pushVersion(doc, 'Autosave', true);
      }
    } else {
      ed.setSaveStatus('error');
      ed.toast('Could not save — browser storage is full', 'error');
    }
  };

  const unsubDoc = useDoc.subscribe((state, prev) => {
    if (state.dirty === prev.dirty) return;
    useEditor.getState().setSaveStatus('unsaved');
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, AUTOSAVE_DELAY);
  });

  const unsubUi = useEditor.subscribe((s, prev) => {
    if (
      s.activePageId === prev.activePageId &&
      s.viewport === prev.viewport &&
      s.leftTab === prev.leftTab &&
      s.rightPanelOpen === prev.rightPanelOpen &&
      s.canvasFit === prev.canvasFit &&
      s.canvasWidth === prev.canvasWidth
    ) {
      return;
    }
    saveUiPrefs({
      activePageId: s.activePageId,
      viewport: s.viewport,
      leftTab: s.leftTab,
      rightPanelOpen: s.rightPanelOpen,
      canvasFit: s.canvasFit,
      canvasWidth: s.canvasWidth,
    });
  });

  // Last-chance save: never lose work to a refresh or tab close.
  const onHide = () => {
    if (useEditor.getState().saveStatus !== 'saved') {
      window.clearTimeout(timer);
      flush();
    }
  };
  window.addEventListener('beforeunload', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });

  return () => {
    unsubDoc();
    unsubUi();
    window.removeEventListener('beforeunload', onHide);
  };
}

export function saveNow(label?: string) {
  const doc = useDoc.getState().doc;
  const ed = useEditor.getState();
  ed.setSaveStatus('saving');
  if (saveSite(doc)) {
    ed.setSaveStatus('saved', Date.now());
    if (label) pushVersion(doc, label, false);
    return true;
  }
  ed.setSaveStatus('error');
  return false;
}
