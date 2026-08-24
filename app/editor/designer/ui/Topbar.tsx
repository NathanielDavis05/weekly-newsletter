import { useRef, useState } from 'react';
import { BREAKPOINT_CANVAS_WIDTH } from '../model/types';
import type { Breakpoint } from '../model/types';
import { renameSite } from '../store/actions/pages';
import { useDoc } from '../store/docStore';
import { useEditor } from '../store/editorStore';
import { saveNow } from '../io/persistence';
import { refreshLiveNewsletter, sendDesignerCopyToDraft } from '../io/newsletterSync';
import { Icon } from './Icon';
import { Tooltip } from './controls/Tooltip';
import { Popover } from './controls/Popover';

const MOD = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform) ? '⌘' : 'Ctrl';

function SaveIndicator() {
  const status = useEditor((s) => s.saveStatus);
  const at = useEditor((s) => s.lastSavedAt);

  const text =
    status === 'saving'
      ? 'Saving…'
      : status === 'unsaved'
        ? 'Unsaved changes'
        : status === 'error'
          ? 'Save failed'
          : at
            ? `Saved ${new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
            : 'Saved';

  return (
    <Tooltip label={status === 'error' ? 'Browser storage is full' : 'Autosaves as you work'} shortcut={`${MOD}S`}>
      <button type="button" className="save-status" onClick={() => saveNow()}>
        <span className={`save-dot ${status}`} />
        {text}
      </button>
    </Tooltip>
  );
}

export function Topbar() {
  const doc = useDoc((s) => s.doc);
  const past = useDoc((s) => s.past);
  const future = useDoc((s) => s.future);
  const undo = useDoc((s) => s.undo);
  const redo = useDoc((s) => s.redo);

  const viewport = useEditor((s) => s.viewport);
  const setViewport = useEditor((s) => s.setViewport);
  const preview = useEditor((s) => s.preview);
  const setPreview = useEditor((s) => s.setPreview);
  const setModal = useEditor((s) => s.setModal);
  const setSelection = useEditor((s) => s.setSelection);
  const setActivePage = useEditor((s) => s.setActivePage);

  const [menu, setMenu] = useState<DOMRect | null>(null);
  const [syncing, setSyncing] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);

  const doUndo = () => {
    const entry = undo();
    if (entry) {
      if (entry.pageId) setActivePage(entry.pageId);
      setSelection(entry.selection.filter((id) => useDoc.getState().doc.elements[id]));
    }
  };
  const doRedo = () => {
    const entry = redo();
    if (entry?.pageId) setActivePage(entry.pageId);
  };
  const refreshLive = async () => {
    setSyncing(true);
    try { await refreshLiveNewsletter(); } catch (error) { useEditor.getState().toast(error instanceof Error ? error.message : 'Could not refresh the newsletter', 'error'); } finally { setSyncing(false); }
  };
  const sendToDraft = async () => {
    setSyncing(true);
    try { await sendDesignerCopyToDraft(); } catch (error) { useEditor.getState().toast(error instanceof Error ? error.message : 'Could not update the draft', 'error'); } finally { setSyncing(false); }
  };

  const viewports: { value: Breakpoint; icon: 'desktop' | 'tablet' | 'mobile'; tip: string }[] = [
    { value: 'base', icon: 'desktop', tip: `Desktop — ${BREAKPOINT_CANVAS_WIDTH.base}px` },
    { value: 'tablet', icon: 'tablet', tip: `Tablet — up to 991px` },
    { value: 'mobile', icon: 'mobile', tip: `Mobile — up to 599px` },
  ];

  return (
    <header className="topbar">
      <div className="topbar-group">
        <div className="brand">
          <button
            ref={menuBtn}
            type="button"
            className="brand-mark"
            onClick={() => setMenu(menuBtn.current!.getBoundingClientRect())}
            title="Site menu"
          >
            D
          </button>
          <input
            className="site-name"
            value={doc.name}
            onChange={(e) => renameSite(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Site name"
          />
        </div>
      </div>

      <div className="topbar-sep" />

      <div className="topbar-group">
        <Tooltip label="Undo" shortcut={`${MOD}Z`}>
          <button type="button" className="btn icon" disabled={!past.length} onClick={doUndo}>
            <Icon name="undo" size={15} />
          </button>
        </Tooltip>
        <Tooltip label="Redo" shortcut={`${MOD}⇧Z`}>
          <button type="button" className="btn icon" disabled={!future.length} onClick={doRedo}>
            <Icon name="redo" size={15} />
          </button>
        </Tooltip>
      </div>

      <div className="topbar-group grow">
        <div className="segmented">
          {viewports.map((v) => (
            <Tooltip key={v.value} label={v.tip}>
              <button
                type="button"
                className={viewport === v.value ? 'is-active' : ''}
                onClick={() => setViewport(v.value)}
              >
                <Icon name={v.icon} size={14} />
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      <div className="topbar-group">
        <Tooltip label="Pull the published newsletter into this visual canvas">
          <button type="button" className="btn" disabled={syncing} onClick={() => void refreshLive()}>
            <Icon name="refresh" size={14} /> Refresh live
          </button>
        </Tooltip>
        <Tooltip label="Send this canvas's shared copy to the /edit private draft">
          <button type="button" className="btn" disabled={syncing} onClick={() => void sendToDraft()}>
            <Icon name="upload" size={14} /> Update /edit
          </button>
        </Tooltip>
        <SaveIndicator />
        <div className="topbar-sep" />
        <Tooltip label="Version history">
          <button type="button" className="btn icon" onClick={() => setModal('history')}>
            <Icon name="history" size={15} />
          </button>
        </Tooltip>
        <Tooltip label="Export code">
          <button type="button" className="btn icon" onClick={() => setModal('export')}>
            <Icon name="code" size={15} />
          </button>
        </Tooltip>
        <Tooltip label={preview ? 'Back to editing' : 'Preview'} shortcut="P">
          <button type="button" className={`btn ${preview ? 'is-active' : ''}`} onClick={() => setPreview(!preview)}>
            <Icon name={preview ? 'settings' : 'play'} size={14} />
            {preview ? 'Edit' : 'Preview'}
          </button>
        </Tooltip>
        <button type="button" className="btn primary" onClick={() => setModal('publish')}>
          <Icon name="globe" size={14} />
          Publish
        </button>
      </div>

      {menu ? <SiteMenu anchor={menu} onClose={() => setMenu(null)} /> : null}
    </header>
  );
}

function SiteMenu({ anchor, onClose }: { anchor: DOMRect; onClose: () => void }) {
  const setModal = useEditor((s) => s.setModal);
  const toast = useEditor((s) => s.toast);

  return (
    <Popover anchor={anchor} onClose={onClose} width={214}>
      <button
        type="button"
        className="menu-item"
        onClick={() => {
          saveNow();
          toast('Saved', 'success');
          onClose();
        }}
      >
        <Icon name="save" size={13} /> Save now <span className="kbd">{MOD}S</span>
      </button>
      <button
        type="button"
        className="menu-item"
        onClick={() => {
          const label = window.prompt('Name this version', 'Milestone');
          if (label) {
            saveNow(label);
            toast(`Saved version “${label}”`, 'success');
          }
          onClose();
        }}
      >
        <Icon name="target" size={13} /> Save a named version
      </button>
      <button type="button" className="menu-item" onClick={() => { setModal('history'); onClose(); }}>
        <Icon name="history" size={13} /> Version history
      </button>
      <div className="menu-sep" />
      <button type="button" className="menu-item" onClick={() => { setModal('export'); onClose(); }}>
        <Icon name="download" size={13} /> Export HTML &amp; CSS
      </button>
      <button type="button" className="menu-item" onClick={() => { setModal('publish'); onClose(); }}>
        <Icon name="globe" size={13} /> Publishing
      </button>
      <div className="menu-sep" />
      <button type="button" className="menu-item" onClick={() => { setModal('newSite'); onClose(); }}>
        <Icon name="file" size={13} /> Start a new site…
      </button>
      <button type="button" className="menu-item" onClick={() => { setModal('shortcuts'); onClose(); }}>
        <Icon name="help" size={13} /> Keyboard shortcuts <span className="kbd">?</span>
      </button>
    </Popover>
  );
}
