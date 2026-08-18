import { useState } from 'react';
import {
  addPage,
  deletePage,
  duplicatePage,
  renamePage,
  reorderPages,
  setHomePage,
  setPageInNav,
  setPageSeo,
  setPageSlug,
} from '../../store/actions/pages';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon } from '../Icon';
import { Popover } from '../controls/Popover';
import { Tooltip } from '../controls/Tooltip';
import { Check, TextField } from '../controls/Fields';
import { Section } from '../inspector/PropRow';

export function PagesPanel() {
  const doc = useDoc((s) => s.doc);
  const activePageId = useEditor((s) => s.activePageId);
  const setActivePage = useEditor((s) => s.setActivePage);
  const [menu, setMenu] = useState<{ rect: DOMRect; pageId: string } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [settingsFor, setSettingsFor] = useState<string | null>(null);

  return (
    <>
      <div className="panel-head">
        <span className="panel-title">Pages</span>
        <Tooltip label="New page">
          <button type="button" className="btn icon" onClick={() => addPage('New page')}>
            <Icon name="plus" size={14} />
          </button>
        </Tooltip>
      </div>

      <div className="panel-body">
        <div className="list">
          {doc.pageOrder.map((id, i) => {
            const page = doc.pages[id];
            if (!page) return null;
            const isHome = doc.homePageId === id;

            return (
              <div
                key={id}
                className={`lrow ${activePageId === id ? 'is-selected' : ''}`}
                onClick={() => setActivePage(id)}
                onDoubleClick={() => setRenaming(id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ rect: new DOMRect(e.clientX, e.clientY, 0, 0), pageId: id });
                }}
              >
                <Icon name={isHome ? 'home' : 'file'} size={13} className="layer-icon" />
                {renaming === id ? (
                  <input
                    className="rename"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    defaultValue={page.name}
                    onClick={(e) => e.stopPropagation()}
                    onBlur={(e) => {
                      renamePage(id, e.target.value);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                  />
                ) : (
                  <>
                    <span className="lrow-name">{page.name}</span>
                    <span className="lrow-sub">{page.slug}</span>
                  </>
                )}
                <span className="lrow-actions">
                  <Tooltip label="Move up">
                    <button
                      type="button"
                      disabled={i === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (i > 0) reorderPages(i, i - 1);
                      }}
                    >
                      <Icon name="arrowUp" size={11} />
                    </button>
                  </Tooltip>
                  <Tooltip label="Page settings">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsFor(settingsFor === id ? null : id);
                        setActivePage(id);
                      }}
                    >
                      <Icon name="settings" size={12} />
                    </button>
                  </Tooltip>
                  <Tooltip label="More">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenu({ rect: (e.currentTarget as HTMLElement).getBoundingClientRect(), pageId: id });
                      }}
                    >
                      <Icon name="more" size={12} />
                    </button>
                  </Tooltip>
                </span>
              </div>
            );
          })}
        </div>

        {settingsFor && doc.pages[settingsFor] ? <PageSettings pageId={settingsFor} /> : null}
      </div>

      {menu ? (
        <Popover anchor={menu.rect} onClose={() => setMenu(null)} width={196}>
          <button
            type="button"
            className="menu-item"
            onClick={() => {
              setRenaming(menu.pageId);
              setMenu(null);
            }}
          >
            <Icon name="text" size={13} /> Rename
          </button>
          <button type="button" className="menu-item" onClick={() => { duplicatePage(menu.pageId); setMenu(null); }}>
            <Icon name="duplicate" size={13} /> Duplicate
          </button>
          <button
            type="button"
            className="menu-item"
            disabled={doc.homePageId === menu.pageId}
            onClick={() => { setHomePage(menu.pageId); setMenu(null); }}
          >
            <Icon name="home" size={13} /> Set as homepage
          </button>
          <div className="menu-sep" />
          <button
            type="button"
            className="menu-item danger"
            disabled={doc.pageOrder.length <= 1}
            onClick={() => {
              if (window.confirm(`Delete “${doc.pages[menu.pageId]?.name}”? This cannot be undone from here.`)) {
                deletePage(menu.pageId);
              }
              setMenu(null);
            }}
          >
            <Icon name="trash" size={13} /> Delete page
          </button>
        </Popover>
      ) : null}
    </>
  );
}

function PageSettings({ pageId }: { pageId: string }) {
  const page = useDoc((s) => s.doc.pages[pageId]);
  const isHome = useDoc((s) => s.doc.homePageId === pageId);
  if (!page) return null;

  return (
    <div style={{ borderTop: '1px solid var(--ui-border)' }}>
      <Section title="Page settings" id="page-basic">
        <div className="row wide">
          <span className="row-label">Name</span>
          <TextField value={page.name} onChange={() => {}} onCommit={(v) => renamePage(pageId, v)} />
        </div>
        <div className="row wide">
          <span className="row-label">URL slug</span>
          <TextField
            value={page.slug}
            onChange={() => {}}
            onCommit={(v) => setPageSlug(pageId, v)}
            mono
            placeholder="/about"
          />
        </div>
        <Check checked={page.showInNav} onChange={(v) => setPageInNav(pageId, v)} label="Show in navigation menus" />
        {isHome ? <div className="hint">This is the homepage — it is served at the site root.</div> : null}
      </Section>

      <Section title="SEO" id="page-seo" defaultOpen={false}>
        <div className="row wide">
          <span className="row-label">Title tag</span>
          <TextField
            value={page.seo.title ?? ''}
            onChange={() => {}}
            onCommit={(v) => setPageSeo(pageId, { title: v })}
            placeholder={page.name}
          />
        </div>
        <div className="row wide">
          <span className="row-label">Meta description</span>
          <textarea
            className="textarea"
            defaultValue={page.seo.description ?? ''}
            placeholder="A one-sentence summary for search results"
            onBlur={(e) => setPageSeo(pageId, { description: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
        <div className="row wide">
          <span className="row-label">Social share image URL</span>
          <TextField
            value={page.seo.ogImage ?? ''}
            onChange={() => {}}
            onCommit={(v) => setPageSeo(pageId, { ogImage: v })}
            placeholder="https://…"
          />
        </div>
        <Check
          checked={!!page.seo.noIndex}
          onChange={(v) => setPageSeo(pageId, { noIndex: v })}
          label="Hide from search engines"
        />
      </Section>
    </div>
  );
}
