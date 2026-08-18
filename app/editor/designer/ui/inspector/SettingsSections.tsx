import { PICKABLE_ICONS, Icon, type IconName } from '../Icon';
import type { ElementNode, LinkTarget } from '../../model/types';
import { deleteElements, insertBlueprint, setContent, setLink, setSetting } from '../../store/actions/elements';
import { detachInstance } from '../../store/actions/components';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Check, SelectField, Segmented, TextField, UnitField } from '../controls/Fields';
import { Section } from './PropRow';

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

export function ContentSection({ node }: { node: ElementNode }) {
  const setEditingText = useEditor((s) => s.setEditingText);
  const ids = useEditor((s) => s.selection);

  return (
    <Section title="Content" id="i-content">
      <div className="row wide">
        <textarea
          className="textarea"
          value={node.content ?? ''}
          onChange={(e) => setContent(node.id, e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Text content"
        />
      </div>
      <button type="button" className="btn sm outline block" onClick={() => setEditingText(node.id)}>
        <Icon name="text" size={11} /> Edit on canvas
      </button>

      {node.type === 'heading' ? (
        <div className="row">
          <span className="row-label">Level</span>
          <Segmented
            value={String(node.settings.level ?? 2)}
            onChange={(v) => setSetting(ids, 'level', Number(v), { label: 'Change heading level' })}
            options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `H${n}` }))}
            stretch
          />
        </div>
      ) : null}
      {node.type === 'heading' ? (
        <div className="hint">
          The level sets the semantic tag in the exported HTML. Use the text style above to change how
          it looks.
        </div>
      ) : null}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Link                                                                */
/* ------------------------------------------------------------------ */

export function LinkSection({ node }: { node: ElementNode }) {
  const doc = useDoc((s) => s.doc);
  const ids = useEditor((s) => s.selection);
  const link = node.link ?? { kind: 'none' as const };

  const update = (patch: Partial<LinkTarget>) => setLink(ids, { ...link, ...patch } as LinkTarget);

  const sections = Object.values(doc.elements).filter((e) => e.type === 'section');

  return (
    <Section title="Link" id="i-link">
      <div className="row">
        <span className="row-label">Links to</span>
        <SelectField
          value={link.kind}
          onChange={(v) => update({ kind: v as LinkTarget['kind'] })}
          options={[
            { value: 'none', label: 'Nothing' },
            { value: 'page', label: 'A page' },
            { value: 'url', label: 'Web address' },
            { value: 'section', label: 'Section on this page' },
            { value: 'email', label: 'Email' },
            { value: 'phone', label: 'Phone' },
          ]}
        />
      </div>

      {link.kind === 'page' ? (
        <div className="row">
          <span className="row-label">Page</span>
          <SelectField
            value={link.pageId ?? ''}
            onChange={(v) => update({ pageId: v })}
            options={doc.pageOrder.map((id) => ({ value: id, label: doc.pages[id].name }))}
            placeholder="Choose a page"
          />
        </div>
      ) : null}

      {link.kind === 'section' ? (
        <div className="row">
          <span className="row-label">Section</span>
          <SelectField
            value={link.sectionId ?? ''}
            onChange={(v) => update({ sectionId: v })}
            options={sections.map((s) => ({ value: s.id, label: s.name || 'Section' }))}
            placeholder="Choose a section"
          />
        </div>
      ) : null}

      {link.kind === 'url' || link.kind === 'email' || link.kind === 'phone' ? (
        <div className="row wide">
          <TextField
            value={link.url ?? ''}
            onChange={() => {}}
            onCommit={(v) => update({ url: v })}
            placeholder={link.kind === 'url' ? 'https://example.com' : link.kind === 'email' ? 'hello@example.com' : '+1 555 000 0000'}
          />
        </div>
      ) : null}

      {link.kind === 'url' ? (
        <Check checked={!!link.newTab} onChange={(v) => update({ newTab: v })} label="Open in a new tab" />
      ) : null}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Image                                                               */
/* ------------------------------------------------------------------ */

export function ImageSection({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);
  const assets = useDoc((s) => s.doc.assets);
  const setLeftTab = useEditor((s) => s.setLeftTab);
  const s = node.settings;

  const set = (key: string, value: unknown) => setSetting(ids, key, value, { label: 'Change image' });

  return (
    <Section title="Image" id="i-image">
      <div className="row wide">
        <TextField value={(s.src as string) ?? ''} onChange={() => {}} onCommit={(v) => set('src', v)} placeholder="Image URL" />
      </div>

      <div className="row-fields">
        <button type="button" className="btn sm outline" style={{ flex: 1 }} onClick={() => setLeftTab('assets')}>
          <Icon name="assets" size={11} /> {Object.keys(assets).length ? 'Choose from assets' : 'Upload'}
        </button>
        {s.src ? (
          <button type="button" className="btn sm outline" onClick={() => set('src', '')}>
            Clear
          </button>
        ) : null}
      </div>

      {s.src ? (
        <div
          style={{
            marginTop: 4,
            height: 82,
            borderRadius: 5,
            border: '1px solid var(--ui-border)',
            overflow: 'hidden',
            background: '#0e1014',
          }}
        >
          <img
            src={s.src as string}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: (s.objectFit as 'cover') ?? 'cover',
              objectPosition: (s.objectPosition as string) ?? 'center',
            }}
          />
        </div>
      ) : null}

      <div className="row">
        <span className="row-label">Fit</span>
        <Segmented
          value={(s.objectFit as string) ?? 'cover'}
          onChange={(v) => set('objectFit', v)}
          options={[
            { value: 'cover', label: 'Crop' },
            { value: 'contain', label: 'Fit' },
            { value: 'fill', label: 'Stretch' },
            { value: 'none', label: 'None' },
          ]}
          stretch
        />
      </div>

      <div className="row">
        <span className="row-label">Focus</span>
        <SelectField
          value={(s.objectPosition as string) ?? 'center'}
          onChange={(v) => set('objectPosition', v)}
          options={['center', 'top', 'bottom', 'left', 'right', 'top left', 'top right', 'bottom left', 'bottom right'].map((p) => ({
            value: p,
            label: p,
          }))}
        />
      </div>

      <div className="row wide">
        <span className="row-label">Alt text</span>
        <TextField
          value={(s.alt as string) ?? ''}
          onChange={() => {}}
          onCommit={(v) => set('alt', v)}
          placeholder="Describe the image"
        />
        <div className="hint">Used by screen readers and search engines. Leave empty only for decoration.</div>
      </div>

      <Check
        checked={(s.loading ?? 'lazy') === 'lazy'}
        onChange={(v) => set('loading', v ? 'lazy' : 'eager')}
        label="Lazy load"
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Video / icon / embed / form / nav                                   */
/* ------------------------------------------------------------------ */

export function VideoSection({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);
  const s = node.settings;
  const set = (k: string, v: unknown) => setSetting(ids, k, v, { label: 'Change video' });

  return (
    <Section title="Video" id="i-video">
      <div className="row">
        <span className="row-label">Source</span>
        <SelectField
          value={(s.source as string) ?? 'youtube'}
          onChange={(v) => set('source', v)}
          options={[
            { value: 'youtube', label: 'YouTube' },
            { value: 'vimeo', label: 'Vimeo' },
            { value: 'file', label: 'Direct file' },
          ]}
        />
      </div>
      <div className="row wide">
        <TextField value={(s.url as string) ?? ''} onChange={() => {}} onCommit={(v) => set('url', v)} placeholder="Video URL" />
      </div>
      <Check checked={!!s.autoplay} onChange={(v) => set('autoplay', v)} label="Autoplay" />
      <Check checked={s.muted !== false} onChange={(v) => set('muted', v)} label="Muted" />
      <Check checked={!!s.loop} onChange={(v) => set('loop', v)} label="Loop" />
      <Check checked={s.controls !== false} onChange={(v) => set('controls', v)} label="Show controls" />
    </Section>
  );
}

export function IconSection({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);
  const current = (node.settings.icon as string) ?? 'sparkle';

  return (
    <Section title="Icon" id="i-icon">
      <div className="row">
        <span className="row-label">Size</span>
        <UnitField
          value={`${node.settings.size ?? 28}px`}
          onChange={(v) => setSetting(ids, 'size', parseInt(v ?? '28', 10) || 28, { mergeKey: 'iconsize' })}
          min={8}
          max={200}
        />
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 3,
          maxHeight: 150,
          overflowY: 'auto',
          padding: 3,
          background: 'var(--ui-panel-2)',
          border: '1px solid var(--ui-border)',
          borderRadius: 4,
        }}
      >
        {PICKABLE_ICONS.map((n) => (
          <button
            key={n}
            type="button"
            title={n}
            onClick={() => setSetting(ids, 'icon', n, { label: 'Change icon' })}
            style={{
              aspectRatio: '1',
              display: 'grid',
              placeItems: 'center',
              borderRadius: 3,
              background: current === n ? 'var(--ui-accent)' : 'transparent',
              color: current === n ? '#fff' : 'var(--ui-text-dim)',
            }}
          >
            <Icon name={n as IconName} size={14} />
          </button>
        ))}
      </div>
    </Section>
  );
}

export function EmbedSection({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);

  if (node.type === 'map') {
    return (
      <Section title="Map" id="i-map">
        <div className="row wide">
          <span className="row-label">Location</span>
          <TextField
            value={(node.settings.query as string) ?? ''}
            onChange={() => {}}
            onCommit={(v) => setSetting(ids, 'query', v)}
            placeholder="123 Main St, Springfield"
          />
        </div>
        <div className="row">
          <span className="row-label">Zoom</span>
          <UnitField
            value={String(node.settings.zoom ?? 13)}
            onChange={(v) => setSetting(ids, 'zoom', parseInt(v ?? '13', 10) || 13)}
            units={['']}
            defaultUnit=""
            min={1}
            max={20}
          />
        </div>
      </Section>
    );
  }

  if (node.type === 'socialLinks') {
    const items = (node.settings.items as { network: string; url: string }[]) ?? [];
    return (
      <Section title="Social links" id="i-social">
        {items.map((it, i) => (
          <div key={i} className="row split" style={{ gridTemplateColumns: '76px 1fr 22px' }}>
            <SelectField
              value={it.network}
              onChange={(v) => {
                const next = items.map((x, j) => (i === j ? { ...x, network: v } : x));
                setSetting(ids, 'items', next);
              }}
              options={['x', 'linkedin', 'instagram', 'youtube', 'github', 'facebook'].map((n) => ({ value: n, label: n }))}
            />
            <TextField
              value={it.url}
              onChange={() => {}}
              onCommit={(v) => setSetting(ids, 'items', items.map((x, j) => (i === j ? { ...x, url: v } : x)))}
            />
            <button
              type="button"
              className="btn icon sm"
              onClick={() => setSetting(ids, 'items', items.filter((_, j) => j !== i))}
            >
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn sm outline block"
          onClick={() => setSetting(ids, 'items', [...items, { network: 'x', url: '' }])}
        >
          <Icon name="plus" size={11} /> Add link
        </button>
      </Section>
    );
  }

  return (
    <Section title="Embed code" id="i-embed">
      <textarea
        className="textarea code"
        defaultValue={(node.settings.html as string) ?? ''}
        style={{ minHeight: 120 }}
        placeholder="<iframe src=…></iframe>"
        onBlur={(e) => setSetting(ids, 'html', e.target.value)}
        onKeyDown={(e) => e.stopPropagation()}
      />
      <div className="hint">Rendered as-is on the published site. Interactions are disabled while editing.</div>
    </Section>
  );
}

export function FormSection({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);
  const s = node.settings;
  const set = (k: string, v: unknown) => setSetting(ids, k, v, { label: 'Change field' });

  if (node.type === 'form') {
    return (
      <Section title="Form" id="i-form">
        <div className="row wide">
          <span className="row-label">Submit to (URL)</span>
          <TextField value={(s.action as string) ?? ''} onChange={() => {}} onCommit={(v) => set('action', v)} placeholder="https://…" />
        </div>
        <div className="row">
          <span className="row-label">Method</span>
          <Segmented
            value={(s.method as string) ?? 'POST'}
            onChange={(v) => set('method', v)}
            options={[
              { value: 'POST', label: 'POST' },
              { value: 'GET', label: 'GET' },
            ]}
            stretch
          />
        </div>
        <div className="row wide">
          <span className="row-label">Success message</span>
          <TextField value={(s.successMessage as string) ?? ''} onChange={() => {}} onCommit={(v) => set('successMessage', v)} />
        </div>
      </Section>
    );
  }

  const hasOptions = node.type === 'select' || node.type === 'radio';
  const options = (s.options as string[]) ?? [];

  return (
    <Section title="Field" id="i-field">
      <div className="row wide">
        <span className="row-label">Label</span>
        <TextField value={(s.label as string) ?? ''} onChange={() => {}} onCommit={(v) => set('label', v)} />
      </div>
      <div className="row wide">
        <span className="row-label">Name (sent with the form)</span>
        <TextField value={(s.name as string) ?? ''} onChange={() => {}} onCommit={(v) => set('name', v)} mono />
      </div>
      {node.type === 'input' || node.type === 'textarea' ? (
        <div className="row wide">
          <span className="row-label">Placeholder</span>
          <TextField value={(s.placeholder as string) ?? ''} onChange={() => {}} onCommit={(v) => set('placeholder', v)} />
        </div>
      ) : null}
      {node.type === 'input' ? (
        <div className="row">
          <span className="row-label">Type</span>
          <SelectField
            value={(s.inputType as string) ?? 'text'}
            onChange={(v) => set('inputType', v)}
            options={['text', 'email', 'tel', 'url', 'number', 'date', 'password'].map((t) => ({ value: t, label: t }))}
          />
        </div>
      ) : null}
      {node.type === 'textarea' ? (
        <div className="row">
          <span className="row-label">Rows</span>
          <UnitField value={String(s.rows ?? 5)} onChange={(v) => set('rows', parseInt(v ?? '5', 10) || 5)} units={['']} defaultUnit="" min={2} max={20} />
        </div>
      ) : null}
      {hasOptions ? (
        <div className="row wide">
          <span className="row-label">Options (one per line)</span>
          <textarea
            className="textarea"
            defaultValue={options.join('\n')}
            onBlur={(e) => set('options', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))}
            onKeyDown={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
      <Check checked={!!s.required} onChange={(v) => set('required', v)} label="Required" />
    </Section>
  );
}

/**
 * Menu editor. Linking navigation to pages is one of the things people come
 * to a site builder for, so it gets a direct list rather than making users
 * duplicate a link and retarget it by hand.
 */
export function MenuSection({ node }: { node: ElementNode }) {
  const doc = useDoc((s) => s.doc);
  const select = useEditor((s) => s.select);

  const linked = new Set(
    node.children
      .map((c) => doc.elements[c])
      .filter((c) => c?.link?.kind === 'page')
      .map((c) => c!.link!.pageId),
  );

  const addLink = (pageId?: string) => {
    const page = pageId ? doc.pages[pageId] : null;
    insertBlueprint(
      {
        type: 'navLink',
        content: page?.name ?? 'New link',
        textStyle: 'link',
        link: page ? { kind: 'page', pageId: page.id } : { kind: 'none' },
      },
      { parentId: node.id, index: node.children.length },
      { label: 'Add menu link' },
    );
  };

  return (
    <Section title="Menu links" id="i-menu">
      {node.children.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 4 }}>
          {node.children.map((cid) => {
            const child = doc.elements[cid];
            if (!child) return null;
            const target =
              child.link?.kind === 'page'
                ? (doc.pages[child.link.pageId ?? '']?.name ?? 'Missing page')
                : child.link?.kind === 'url'
                  ? child.link.url || 'No URL'
                  : 'No link';
            return (
              <div key={cid} className="lrow" onClick={() => select(cid)}>
                <Icon name="link" size={11} className="layer-icon" />
                <span className="lrow-name">{child.content}</span>
                <span className="lrow-sub">{target}</span>
                <span className="lrow-actions">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteElements([cid]);
                    }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="menu-label" style={{ padding: '2px 0 3px' }}>
        Link to a page
      </div>
      {doc.pageOrder
        .filter((id) => !linked.has(id))
        .map((id) => (
          <button key={id} type="button" className="btn sm outline block" onClick={() => addLink(id)}>
            <Icon name="plus" size={11} /> {doc.pages[id].name}
          </button>
        ))}
      {doc.pageOrder.every((id) => linked.has(id)) ? (
        <div className="hint">Every page is already in this menu.</div>
      ) : null}
      <button type="button" className="btn sm outline block" onClick={() => addLink()} style={{ marginTop: 4 }}>
        <Icon name="plus" size={11} /> Custom link
      </button>
    </Section>
  );
}

export function NavSection({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);
  const s = node.settings;
  const set = (k: string, v: unknown) => setSetting(ids, k, v, { label: 'Change navigation' });

  return (
    <Section title="Navigation" id="i-nav">
      <Check checked={s.sticky !== false} onChange={(v) => set('sticky', v)} label="Stick to the top when scrolling" />
      <Check checked={!!s.transparent} onChange={(v) => set('transparent', v)} label="Transparent background" />
      <div className="row">
        <span className="row-label">On mobile</span>
        <SelectField
          value={(s.mobileMenu as string) ?? 'hamburger'}
          onChange={(v) => set('mobileMenu', v)}
          options={[
            { value: 'hamburger', label: 'Collapse to a menu button' },
            { value: 'inline', label: 'Keep links visible' },
          ]}
        />
      </div>
      <div className="hint">
        Switch the canvas to Mobile to style the collapsed menu — its layout is a separate breakpoint
        override, not a separate page.
      </div>
    </Section>
  );
}

export function SectionSettings({ node }: { node: ElementNode }) {
  const ids = useEditor((s) => s.selection);
  return (
    <Section title="Section" id="i-section" defaultOpen={false}>
      <div className="row">
        <span className="row-label">HTML tag</span>
        <SelectField
          value={(node.settings.tag as string) ?? 'section'}
          onChange={(v) => setSetting(ids, 'tag', v, { label: 'Change tag' })}
          options={[
            { value: 'section', label: '<section>' },
            { value: 'header', label: '<header>' },
            { value: 'main', label: '<main>' },
            { value: 'footer', label: '<footer>' },
            { value: 'aside', label: '<aside>' },
            { value: 'div', label: '<div>' },
          ]}
        />
      </div>
      <div className="hint">Choosing the right tag improves accessibility and SEO in the exported site.</div>
    </Section>
  );
}

export function InstanceSection({ node }: { node: ElementNode }) {
  const comp = useDoc((s) => (node.componentId ? s.doc.components[node.componentId] : null));
  const select = useEditor((s) => s.select);
  if (!comp) return null;

  return (
    <Section title="Component" id="i-instance">
      <div className="hint" style={{ marginBottom: 4 }}>
        This is an instance of <strong style={{ color: 'var(--ui-global)' }}>{comp.name}</strong>. Editing
        its contents changes every instance across the site.
      </div>
      <button type="button" className="btn sm outline block" onClick={() => select(comp.rootId)}>
        <Icon name="target" size={11} /> Edit the master
      </button>
      <button type="button" className="btn sm outline block" onClick={() => detachInstance(node.id)}>
        <Icon name="unlink" size={11} /> Detach this copy
      </button>
      <div className="hint">Detaching makes an independent copy that stops following the master.</div>
    </Section>
  );
}
