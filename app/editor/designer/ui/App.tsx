import { useEffect, useRef, useState } from 'react';
import { useDragController } from '../dnd/useDragController';
import { loadSite, loadUiPrefs, startAutosave } from '../io/persistence';
import { applyNewsletterContent } from '../io/newsletterBridge';
import type { NewsletterContent } from '../../../content/types';
import type { Breakpoint } from '../model/types';
import { useDoc } from '../store/docStore';
import { useEditor, type LeftTab } from '../store/editorStore';
import { Canvas } from './canvas/Canvas';
import { DragGhost } from './canvas/Overlays';
import { ContextMenu } from './ContextMenu';
import { Icon, type IconName } from './Icon';
import { Inspector } from './inspector/Inspector';
import { Modals } from './Modals';
import { AddPanel } from './panels/AddPanel';
import { AssetsPanel } from './panels/AssetsPanel';
import { ComponentsPanel } from './panels/ComponentsPanel';
import { LayersPanel } from './panels/LayersPanel';
import { PagesPanel } from './panels/PagesPanel';
import { SectionsPanel } from './panels/SectionsPanel';
import { SiteStylesPanel } from './panels/SiteStylesPanel';
import { Topbar } from './Topbar';
import { Tooltip } from './controls/Tooltip';
import { useKeyboard } from './useKeyboard';

const RAIL: { tab: LeftTab; icon: IconName; label: string }[] = [
  { tab: 'add', icon: 'add', label: 'Add' },
  { tab: 'pages', icon: 'pages', label: 'Pages' },
  { tab: 'sections', icon: 'sectionsIcon', label: 'Sections' },
  { tab: 'layers', icon: 'layers', label: 'Layers' },
  { tab: 'components', icon: 'component', label: 'Components' },
  { tab: 'assets', icon: 'assets', label: 'Assets' },
  { tab: 'styles', icon: 'palette', label: 'Site styles' },
];

function LeftPanelBody({ tab }: { tab: LeftTab }) {
  switch (tab) {
    case 'add':
      return <AddPanel />;
    case 'pages':
      return <PagesPanel />;
    case 'sections':
      return <SectionsPanel />;
    case 'layers':
      return <LayersPanel />;
    case 'components':
      return <ComponentsPanel />;
    case 'assets':
      return <AssetsPanel />;
    case 'styles':
      return <SiteStylesPanel />;
  }
}

/** Drag handle that resizes a side panel. */
function PanelResizer({ side, onResize }: { side: 'left' | 'right'; onResize: (w: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const panel = ref.current?.parentElement;
    const startW = panel?.getBoundingClientRect().width ?? 264;
    ref.current?.classList.add('is-dragging');

    const onMove = (ev: PointerEvent) => {
      const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX;
      onResize(Math.max(200, Math.min(460, startW + delta)));
    };
    const onUp = () => {
      ref.current?.classList.remove('is-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return <div ref={ref} className="panel-resizer" onPointerDown={start} />;
}

function Toasts() {
  const toasts = useEditor((s) => s.toasts);
  const dismiss = useEditor((s) => s.dismissToast);
  if (!toasts.length) return null;

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <Icon
            name={t.tone === 'success' ? 'check' : t.tone === 'error' ? 'warn' : 'info'}
            size={13}
            style={{ color: t.tone === 'success' ? 'var(--ui-ok)' : t.tone === 'error' ? 'var(--ui-danger)' : 'var(--ui-accent)' }}
          />
          <span>{t.message}</span>
          {t.action ? (
            <button type="button" className="btn sm" onClick={() => { t.action!.run(); dismiss(t.id); }}>
              {t.action.label}
            </button>
          ) : null}
          <button type="button" className="btn icon sm" onClick={() => dismiss(t.id)}>
            <Icon name="x" size={11} />
          </button>
        </div>
      ))}
    </div>
  );
}

function PreviewBar() {
  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);
  const setPreview = useEditor((s) => s.setPreview);

  return (
    <div className="preview-bar">
      <span className="label">Preview</span>
      <div className="segmented">
        {(['base', 'tablet', 'mobile'] as Breakpoint[]).map((bp) => (
          <button
            key={bp}
            type="button"
            className={viewport === bp ? 'is-active' : ''}
            onClick={() => setViewport(bp)}
          >
            <Icon name={bp === 'base' ? 'desktop' : bp === 'tablet' ? 'tablet' : 'mobile'} size={14} />
          </button>
        ))}
      </div>
      <button type="button" className="btn primary" onClick={() => setPreview(false)}>
        <Icon name="x" size={13} /> Exit preview
      </button>
    </div>
  );
}

export function App({ liveContent }: { liveContent: NewsletterContent }) {
  const leftTab = useEditor((s) => s.leftTab);
  const setLeftTab = useEditor((s) => s.setLeftTab);
  const rightPanelOpen = useEditor((s) => s.rightPanelOpen);
  const toggleRightPanel = useEditor((s) => s.toggleRightPanel);
  const preview = useEditor((s) => s.preview);
  const activePageId = useEditor((s) => s.activePageId);
  const setActivePage = useEditor((s) => s.setActivePage);
  const doc = useDoc((s) => s.doc);

  const [leftW, setLeftW] = useState(264);
  const [rightW, setRightW] = useState(282);

  useDragController();
  useKeyboard();

  /* ---- boot: restore the saved document and UI state ---- */
  useEffect(() => {
    const saved = loadSite();
    // Preserve the familiar visual document and its layout, then bring its
    // newsletter fields forward to exactly what readers see on the live site.
    useDoc.getState().replaceDoc(applyNewsletterContent(saved ?? useDoc.getState().doc, liveContent));

    const prefs = loadUiPrefs();
    const current = useDoc.getState().doc;
    const pageId =
      prefs.activePageId && current.pages[prefs.activePageId] ? prefs.activePageId : current.homePageId;

    useEditor.setState({
      activePageId: pageId,
      viewport: (prefs.viewport as Breakpoint) ?? 'base',
      leftTab: (prefs.leftTab as LeftTab) ?? 'add',
      rightPanelOpen: prefs.rightPanelOpen ?? true,
      canvasFit: prefs.canvasFit ?? true,
      canvasWidth: prefs.canvasWidth ?? 1280,
      saveStatus: 'saved',
    });

    return startAutosave();
  }, [liveContent]);

  /* Keep the active page valid if it gets deleted or restored away. */
  useEffect(() => {
    if (activePageId && !doc.pages[activePageId]) {
      setActivePage(doc.homePageId ?? doc.pageOrder[0]);
    }
  }, [activePageId, doc, setActivePage]);

  return (
    <div className={`app ${preview ? 'is-preview' : ''}`}>
      {!preview ? <Topbar /> : null}

      <div className="app-body">
        {!preview ? (
          <>
            <nav className="rail">
              {RAIL.map((r) => (
                <Tooltip key={r.tab} label={r.label} side="right">
                  <button
                    type="button"
                    className={`rail-btn ${leftTab === r.tab ? 'is-active' : ''}`}
                    onClick={() => setLeftTab(leftTab === r.tab ? null : r.tab)}
                  >
                    <Icon name={r.icon} size={17} />
                  </button>
                </Tooltip>
              ))}
              <div className="rail-spacer" />
              <Tooltip label={rightPanelOpen ? 'Hide properties' : 'Show properties'} side="right">
                <button type="button" className="rail-btn" onClick={toggleRightPanel}>
                  <Icon name={rightPanelOpen ? 'chevronRight' : 'chevronLeft'} size={16} />
                </button>
              </Tooltip>
            </nav>

            {leftTab ? (
              <aside className="panel left" style={{ width: leftW }}>
                <LeftPanelBody tab={leftTab} />
                <PanelResizer side="left" onResize={setLeftW} />
              </aside>
            ) : (
              <div />
            )}
          </>
        ) : null}

        <Canvas />

        {!preview && rightPanelOpen ? (
          <aside className="panel right" style={{ width: rightW }}>
            <Inspector />
            <PanelResizer side="right" onResize={setRightW} />
          </aside>
        ) : null}
      </div>

      {preview ? <PreviewBar /> : null}
      <DragGhost />
      <ContextMenu />
      <Modals />
      <Toasts />
    </div>
  );
}
