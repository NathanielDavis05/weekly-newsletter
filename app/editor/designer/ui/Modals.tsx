import { useEffect, useMemo, useState } from 'react';
import { createSite } from '../model/defaults';
import type { PublishedSite, SiteVersion } from '../model/types';
import { exportSinglePage, exportSite } from '../io/exporter';
import {
  deleteVersion,
  loadPublished,
  loadVersions,
  publishSite,
  pushVersion,
  renameVersion,
  saveNow,
  unpublishSite,
} from '../io/persistence';
import { createZip, downloadBlob } from '../io/zip';
import { useDoc } from '../store/docStore';
import { useEditor } from '../store/editorStore';
import { Icon } from './Icon';

function Modal({
  title,
  children,
  footer,
  onClose,
  small,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onClose: () => void;
  small?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${small ? 'sm' : ''}`}>
        <div className="modal-head">
          <span className="modal-title">{title}</span>
          <button type="button" className="btn icon" onClick={onClose}>
            <Icon name="x" size={14} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Modals() {
  const modal = useEditor((s) => s.modal);
  const setModal = useEditor((s) => s.setModal);
  if (!modal) return null;
  const close = () => setModal(null);

  switch (modal) {
    case 'export':
      return <ExportModal onClose={close} />;
    case 'publish':
      return <PublishModal onClose={close} />;
    case 'history':
      return <HistoryModal onClose={close} />;
    case 'shortcuts':
      return <ShortcutsModal onClose={close} />;
    case 'newSite':
      return <NewSiteModal onClose={close} />;
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */

function ExportModal({ onClose }: { onClose: () => void }) {
  const doc = useDoc((s) => s.doc);
  const toast = useEditor((s) => s.toast);
  const files = useMemo(() => exportSite(doc), [doc]);
  const [active, setActive] = useState(files[0]?.path ?? '');
  const current = files.find((f) => f.path === active) ?? files[0];

  const slug = doc.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';

  return (
    <Modal
      title="Export site"
      onClose={onClose}
      footer={
        <>
          <span className="hint">
            {files.length} files · clean semantic HTML, one stylesheet, and only the JavaScript this site
            actually uses.
          </span>
          <div className="spacer" />
          <button
            type="button"
            className="btn outline"
            onClick={() => {
              void navigator.clipboard.writeText(current?.contents ?? '');
              toast(`Copied ${current?.path}`, 'success');
            }}
          >
            <Icon name="copy" size={13} /> Copy file
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              downloadBlob(createZip(files, new Date()), `${slug}.zip`);
              toast('Downloaded site archive', 'success');
            }}
          >
            <Icon name="download" size={13} /> Download .zip
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 10, minHeight: 340 }}>
        <div style={{ width: 170, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {files.map((f) => (
            <button
              key={f.path}
              type="button"
              className={`lrow ${active === f.path ? 'is-selected' : ''}`}
              onClick={() => setActive(f.path)}
            >
              <Icon name={f.type === 'css' ? 'palette' : f.type === 'js' ? 'code' : 'file'} size={12} className="layer-icon" />
              <span className="lrow-name" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                {f.path}
              </span>
            </button>
          ))}
          <div className="menu-sep" />
          <button
            type="button"
            className="btn sm outline"
            onClick={() => {
              const pageId = useEditor.getState().activePageId ?? doc.homePageId;
              const html = exportSinglePage(doc, pageId);
              const blob = new Blob([html], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              setTimeout(() => URL.revokeObjectURL(url), 20000);
            }}
          >
            <Icon name="external" size={11} /> Open standalone
          </button>
        </div>
        <pre className="code-block" style={{ flex: 1, maxHeight: 440 }}>
          {current?.contents}
        </pre>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function PublishModal({ onClose }: { onClose: () => void }) {
  const doc = useDoc((s) => s.doc);
  const toast = useEditor((s) => s.toast);
  const setPreview = useEditor((s) => s.setPreview);
  const [published, setPublished] = useState<PublishedSite | null>(() => loadPublished());
  const [busy, setBusy] = useState(false);

  const isStale = published && published.doc.rev !== doc.rev;

  const doPublish = () => {
    setBusy(true);
    // Publishing snapshots the document: the live site never changes because
    // someone kept editing in another tab.
    saveNow();
    const next = publishSite(doc);
    pushVersion(doc, 'Published', false);
    setPublished(next);
    setBusy(false);
    toast('Site published', 'success');
  };

  return (
    <Modal
      title="Publish"
      onClose={onClose}
      small
      footer={
        <>
          <button type="button" className="btn outline" onClick={() => { setPreview(true); onClose(); }}>
            <Icon name="play" size={13} /> Preview first
          </button>
          <div className="spacer" />
          <button type="button" className="btn primary" disabled={busy} onClick={doPublish}>
            <Icon name="globe" size={13} /> {published ? 'Republish' : 'Publish site'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {published ? (
          <>
            <div>
              <div className="menu-label" style={{ padding: '0 0 4px' }}>
                Published address
              </div>
              <div className="field">
                <input readOnly value={published.url} style={{ fontFamily: 'var(--font-mono)' }} />
                <button
                  type="button"
                  className="prefix"
                  style={{ cursor: 'pointer', width: 26 }}
                  onClick={() => {
                    void navigator.clipboard.writeText(published.url);
                    toast('Address copied', 'success');
                  }}
                >
                  <Icon name="copy" size={12} />
                </button>
              </div>
              <div className="hint" style={{ marginTop: 5 }}>
                Last published {new Date(published.publishedAt).toLocaleString()}.
                {isStale ? ' You have unpublished changes.' : ' The live site matches your editor.'}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 9,
                borderRadius: 6,
                background: isStale ? 'rgba(226,160,63,0.1)' : 'rgba(63,192,122,0.1)',
                border: `1px solid ${isStale ? 'rgba(226,160,63,0.3)' : 'rgba(63,192,122,0.3)'}`,
                color: isStale ? 'var(--ui-override)' : 'var(--ui-ok)',
                fontSize: 11.5,
              }}
            >
              <Icon name={isStale ? 'warn' : 'check'} size={14} />
              {isStale ? 'Editor and live site have drifted — republish to sync.' : 'Live site is up to date.'}
            </div>

            <button
              type="button"
              className="btn outline block danger"
              onClick={() => {
                unpublishSite();
                setPublished(null);
                toast('Site unpublished', 'info');
              }}
            >
              <Icon name="eyeOff" size={13} /> Unpublish
            </button>
          </>
        ) : (
          <div className="hint" style={{ fontSize: 12, lineHeight: 1.6 }}>
            Publishing takes a snapshot of the current document and serves that. Your editor stays
            independent — you can keep working without changing the live site until you republish.
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--ui-border)', paddingTop: 10 }}>
          <div className="menu-label" style={{ padding: '0 0 4px' }}>
            Custom domain
          </div>
          <div className="hint">
            Domains map onto the published snapshot, so connecting one later will not require
            re-publishing or changing how the site is built.
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function HistoryModal({ onClose }: { onClose: () => void }) {
  const [versions, setVersions] = useState<SiteVersion[]>(() => loadVersions());
  const replaceDoc = useDoc((s) => s.replaceDoc);
  const doc = useDoc((s) => s.doc);
  const toast = useEditor((s) => s.toast);
  const setActivePage = useEditor((s) => s.setActivePage);

  const restore = (v: SiteVersion) => {
    // Snapshot the current state first, so restoring is itself reversible.
    pushVersion(doc, 'Before restore', true);
    replaceDoc(structuredClone(v.doc));
    const first = v.doc.homePageId ?? v.doc.pageOrder[0];
    setActivePage(first);
    saveNow();
    setVersions(loadVersions());
    toast(`Restored “${v.label}”`, 'success');
    onClose();
  };

  return (
    <Modal
      title="Version history"
      onClose={onClose}
      footer={
        <>
          <span className="hint">Snapshots are taken automatically while you work, and on every publish.</span>
          <div className="spacer" />
          <button
            type="button"
            className="btn outline"
            onClick={() => {
              const label = window.prompt('Name this version', 'Milestone');
              if (label) {
                setVersions(pushVersion(doc, label, false));
                toast('Version saved', 'success');
              }
            }}
          >
            <Icon name="plus" size={13} /> Save current as version
          </button>
        </>
      }
    >
      {versions.length ? (
        versions.map((v) => (
          <div key={v.id} className="ver-row">
            <Icon name={v.auto ? 'refresh' : 'target'} size={14} style={{ color: v.auto ? 'var(--ui-text-faint)' : 'var(--ui-accent)', flex: 'none' }} />
            <div className="meta">
              <div className="name">{v.label}</div>
              <div className="when">
                {new Date(v.createdAt).toLocaleString()} · {Object.keys(v.doc.pages).length} page
                {Object.keys(v.doc.pages).length === 1 ? '' : 's'} · {Object.keys(v.doc.elements).length} elements
              </div>
            </div>
            <button
              type="button"
              className="btn sm outline"
              onClick={() => {
                const label = window.prompt('Rename version', v.label);
                if (label) setVersions(renameVersion(v.id, label));
              }}
            >
              Rename
            </button>
            <button type="button" className="btn sm outline" onClick={() => restore(v)}>
              Restore
            </button>
            <button
              type="button"
              className="btn sm icon danger"
              onClick={() => setVersions(deleteVersion(v.id))}
            >
              <Icon name="trash" size={12} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty-note">
          No versions yet. One is captured automatically every few minutes while you edit, and whenever
          you publish.
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

const MOD = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl';

const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: 'Editing',
    items: [
      [`${MOD} Z`, 'Undo'],
      [`${MOD} ⇧ Z`, 'Redo'],
      [`${MOD} C / V / X`, 'Copy, paste, cut'],
      [`${MOD} D`, 'Duplicate'],
      ['Delete', 'Delete selection'],
      [`${MOD} S`, 'Save now'],
    ],
  },
  {
    group: 'Selection',
    items: [
      ['Click', 'Select element'],
      ['Shift click', 'Add to selection'],
      ['Double click', 'Edit text in place'],
      ['Escape', 'Select parent / exit editing'],
      ['Enter', 'Edit selected text'],
      [`${MOD} A`, 'Select all sections'],
    ],
  },
  {
    group: 'Arrange',
    items: [
      [`${MOD} G`, 'Group'],
      [`${MOD} ⇧ G`, 'Ungroup'],
      [`${MOD} ]`, 'Bring forward'],
      [`${MOD} [`, 'Send backward'],
      [`${MOD} L`, 'Lock / unlock'],
      [`${MOD} ⇧ H`, 'Hide at this breakpoint'],
      ['Arrows', 'Nudge positioned elements'],
    ],
  },
  {
    group: 'View',
    items: [
      ['1 / 2 / 3', 'Desktop, tablet, mobile'],
      ['P', 'Toggle preview'],
      ['?', 'This dialog'],
    ],
  },
];

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
        {SHORTCUTS.map((g) => (
          <div key={g.group}>
            <div className="menu-label" style={{ padding: '0 0 6px' }}>
              {g.group}
            </div>
            {g.items.map(([key, label]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 24 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    color: 'var(--ui-text)',
                    background: 'var(--ui-panel-3)',
                    border: '1px solid var(--ui-border)',
                    borderRadius: 3,
                    padding: '2px 6px',
                    minWidth: 74,
                    textAlign: 'center',
                  }}
                >
                  {key}
                </span>
                <span style={{ color: 'var(--ui-text-dim)', fontSize: 11.5 }}>{label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="hint" style={{ marginTop: 16 }}>
        Shortcuts never fire while you are typing into a text field or editing text on the canvas.
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function NewSiteModal({ onClose }: { onClose: () => void }) {
  const replaceDoc = useDoc((s) => s.replaceDoc);
  const doc = useDoc((s) => s.doc);
  const setActivePage = useEditor((s) => s.setActivePage);
  const toast = useEditor((s) => s.toast);
  const [name, setName] = useState('New site');

  const create = (kind: 'blank' | 'starter' | 'newsletter') => {
    pushVersion(doc, 'Before new site', true);
    const next = createSite({ name, kind });
    replaceDoc(next);
    setActivePage(next.homePageId);
    saveNow();
    toast('Created a new site — the previous one is in version history', 'success');
    onClose();
  };

  return (
    <Modal title="Start a new site" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div className="menu-label" style={{ padding: '0 0 4px' }}>
            Site name
          </div>
          <div className="field">
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
        </div>
        <div className="hint">
          Your current site is saved to version history first, so this is reversible.
        </div>
        <div className="template-grid">
          <button type="button" className="template-card" onClick={() => create('blank')}>
            <span className="template-preview blank">
              <span />
            </span>
            <span className="template-card-copy">
              <strong>Blank site</strong>
              <small>Start with an empty canvas</small>
            </span>
          </button>
          <button type="button" className="template-card" onClick={() => create('starter')}>
            <span className="template-preview starter">
              <i />
              <b />
              <em />
            </span>
            <span className="template-card-copy">
              <strong>Starter site</strong>
              <small>Hero, features, CTA, and footer</small>
            </span>
          </button>
          <button type="button" className="template-card featured" onClick={() => create('newsletter')}>
            <span className="template-preview newsletter">
              <span className="newsletter-mark">CFA WEST BRYAN</span>
              <span className="newsletter-rule" />
              <span className="newsletter-layout">
                <i />
                <b />
              </span>
              <span className="newsletter-band" />
            </span>
            <span className="template-card-copy">
              <strong>Team newsletter</strong>
              <small>CFA West Bryan weekly update</small>
            </span>
            <span className="template-badge">New</span>
          </button>
        </div>
        <div className="hint">Every template uses native editor elements, so text, images, layout, colors, links, forms, and responsive styles all stay editable.</div>
      </div>
    </Modal>
  );
}
