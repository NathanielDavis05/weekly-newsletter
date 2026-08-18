import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { elClass, btnClass, tyClass } from '../../engine/css';
import { def } from '../../model/registry';
import type { ElementNode, LinkTarget, Page } from '../../model/types';
import { setContent } from '../../store/actions/elements';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';
import { Icon, type IconName } from '../Icon';
import { toEmbedUrl } from '../../engine/media';
import { useRender } from './RenderContext';

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

export function classesFor(node: ElementNode, extra?: string): string {
  const out = [elClass(node.id)];
  if (node.textStyle) out.push(tyClass(node.textStyle));
  const btn = node.settings?.buttonStyle as string | undefined;
  if (btn) out.push(btnClass(btn));
  if (node.classes?.length) out.push(...node.classes);
  if (extra) out.push(extra);
  return out.join(' ');
}

export function attrsFor(node: ElementNode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of node.attributes ?? []) {
    if (a.name && /^[a-zA-Z][\w:-]*$/.test(a.name) && !a.name.startsWith('on')) {
      out[a.name] = a.value;
    }
  }
  return out;
}

export function hrefFor(link: LinkTarget | undefined, pages: Record<string, Page>): string | undefined {
  if (!link || link.kind === 'none') return undefined;
  switch (link.kind) {
    case 'page':
      return link.pageId && pages[link.pageId] ? pages[link.pageId].slug : undefined;
    case 'url':
      return link.url || undefined;
    case 'section':
      return link.sectionId ? `#${link.sectionId}` : undefined;
    case 'email':
      return link.url ? `mailto:${link.url}` : undefined;
    case 'phone':
      return link.url ? `tel:${link.url}` : undefined;
    default:
      return undefined;
  }
}

/** Elements the user has not filled in yet get an honest placeholder. */
function Placeholder({ label, icon }: { label: string; icon: IconName }) {
  return (
    <span className="dw-placeholder">
      <Icon name={icon} size={16} />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Inline text editing                                                 */
/* ------------------------------------------------------------------ */

interface EditableProps {
  node: ElementNode;
  tag: keyof HTMLElementTagNameMap;
  className: string;
  attrs: Record<string, string>;
  children?: ReactNode;
}

/**
 * contentEditable is intentionally uncontrolled while focused: React must
 * not rewrite the DOM under the caret. The model is updated on input, and
 * the DOM is only re-synced when editing stops.
 */
function EditableText({ node, tag, className, attrs }: EditableProps) {
  const ref = useRef<HTMLElement | null>(null);
  const editing = useEditor((s) => s.editingTextId === node.id);
  const setEditingText = useEditor((s) => s.setEditingText);
  const Tag = tag as 'div';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (editing) {
      if (el.textContent !== (node.content ?? '')) el.textContent = node.content ?? '';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const commit = useCallback(() => {
    const el = ref.current;
    if (el) setContent(node.id, el.textContent ?? '');
    setEditingText(null);
  }, [node.id, setEditingText]);

  if (!editing) {
    return (
      <Tag ref={ref as never} className={className} {...attrs}>
        {node.content}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref as never}
      className={className}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-editing="true"
      style={{ outline: '2px solid #4d8dff', outlineOffset: 2, cursor: 'text' } as CSSProperties}
      onInput={(e: React.FormEvent<HTMLElement>) => setContent(node.id, e.currentTarget.textContent ?? '')}
      onBlur={commit}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Enter' && !e.shiftKey && node.type !== 'text') {
          e.preventDefault();
          commit();
        }
        e.stopPropagation();
      }}
      {...attrs}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Widgets                                                             */
/* ------------------------------------------------------------------ */

function ImageView({ node, className, attrs }: { node: ElementNode; className: string; attrs: Record<string, string> }) {
  const src = (node.settings.src as string) || '';
  const objectFit = (node.settings.objectFit as string) || 'cover';
  const objectPosition = (node.settings.objectPosition as string) || 'center';

  if (!src) {
    // The stand-in occupies the element's real box, so layout while designing
    // matches layout once the image is in.
    return (
      <div className={`${className} dw-placeholder`} {...attrs}>
        <Icon name="image" size={16} />
        Image
      </div>
    );
  }
  return (
    <img
      className={className}
      src={src}
      alt={(node.settings.alt as string) || ''}
      loading={(node.settings.loading as 'lazy' | 'eager') || 'lazy'}
      decoding="async"
      style={{ objectFit: objectFit as CSSProperties['objectFit'], objectPosition }}
      draggable={false}
      {...attrs}
    />
  );
}

function VideoView({ node, className, attrs }: { node: ElementNode; className: string; attrs: Record<string, string> }) {
  const url = (node.settings.url as string) || '';
  const source = (node.settings.source as string) || 'youtube';

  if (!url) {
    return (
      <div className={`${className} dw-placeholder`} {...attrs}>
        <Icon name="video" size={16} />
        Video
      </div>
    );
  }

  if (source === 'file') {
    return (
      <video
        className={className}
        src={url}
        controls={node.settings.controls !== false}
        autoPlay={!!node.settings.autoplay}
        loop={!!node.settings.loop}
        muted={node.settings.muted !== false}
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        {...attrs}
      />
    );
  }

  const embedUrl = toEmbedUrl(url, source);
  return (
    <div className={className} {...attrs}>
      <iframe
        src={embedUrl}
        title={(node.name as string) || 'Video'}
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

function IconView({ node, className, attrs }: { node: ElementNode; className: string; attrs: Record<string, string> }) {
  const name = ((node.settings.icon as string) || 'sparkle') as IconName;
  const size = Number(node.settings.size ?? 28);
  return (
    <span className={className} {...attrs} style={{ display: 'inline-flex', lineHeight: 0 }}>
      <Icon name={name} size={size} strokeWidth={1.5} />
    </span>
  );
}

function FieldShell({
  label,
  required,
  children,
  className,
  attrs,
}: {
  label?: string;
  required?: boolean;
  children: ReactNode;
  className: string;
  attrs: Record<string, string>;
}) {
  return (
    <div className={`${className} dw-field`} {...attrs}>
      {label ? (
        <label>
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      {children}
    </div>
  );
}

function InputView({ node, className, attrs, editing }: { node: ElementNode; className: string; attrs: Record<string, string>; editing: boolean }) {
  const s = node.settings;
  return (
    <FieldShell label={s.label as string} required={!!s.required} className={className} attrs={attrs}>
      <input
        type={(s.inputType as string) || 'text'}
        name={(s.name as string) || ''}
        placeholder={(s.placeholder as string) || ''}
        required={!!s.required}
        readOnly={editing}
        tabIndex={editing ? -1 : undefined}
      />
    </FieldShell>
  );
}

function TextareaView({ node, className, attrs, editing }: { node: ElementNode; className: string; attrs: Record<string, string>; editing: boolean }) {
  const s = node.settings;
  return (
    <FieldShell label={s.label as string} required={!!s.required} className={className} attrs={attrs}>
      <textarea
        name={(s.name as string) || ''}
        placeholder={(s.placeholder as string) || ''}
        rows={Number(s.rows ?? 5)}
        required={!!s.required}
        readOnly={editing}
        tabIndex={editing ? -1 : undefined}
      />
    </FieldShell>
  );
}

function SelectView({ node, className, attrs, editing }: { node: ElementNode; className: string; attrs: Record<string, string>; editing: boolean }) {
  const s = node.settings;
  const options = (s.options as string[]) ?? [];
  return (
    <FieldShell label={s.label as string} required={!!s.required} className={className} attrs={attrs}>
      <select name={(s.name as string) || ''} disabled={editing} defaultValue="">
        <option value="" disabled>
          Choose…
        </option>
        {options.map((o, i) => (
          <option key={i} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

function CheckboxView({ node, className, attrs, editing }: { node: ElementNode; className: string; attrs: Record<string, string>; editing: boolean }) {
  const s = node.settings;
  return (
    <label className={`${className} dw-choice`} {...attrs}>
      <input type="checkbox" name={(s.name as string) || ''} defaultChecked={!!s.checked} disabled={editing} />
      <span>{(s.label as string) || 'Checkbox'}</span>
    </label>
  );
}

function RadioView({ node, className, attrs, editing }: { node: ElementNode; className: string; attrs: Record<string, string>; editing: boolean }) {
  const s = node.settings;
  const options = (s.options as string[]) ?? [];
  const name = (s.name as string) || node.id;
  return (
    <div className={`${className} dw-field`} {...attrs}>
      {s.label ? <label>{s.label as string}</label> : null}
      {options.map((o, i) => (
        <label key={i} className="dw-choice">
          <input type="radio" name={name} value={o} defaultChecked={o === s.value} disabled={editing} />
          <span>{o}</span>
        </label>
      ))}
    </div>
  );
}

function SocialView({ node, className, attrs }: { node: ElementNode; className: string; attrs: Record<string, string> }) {
  const items = (node.settings.items as { network: string; url: string }[]) ?? [];
  const size = Number(node.settings.size ?? 20);
  const iconFor = (n: string): IconName =>
    n === 'linkedin' ? 'link' : n === 'instagram' ? 'image' : n === 'youtube' ? 'video' : n === 'github' ? 'code' : 'share';
  return (
    <div className={className} {...attrs}>
      {items.map((it, i) => (
        <a key={i} className="dw-social" href={it.url} target="_blank" rel="noreferrer noopener" aria-label={it.network}>
          <Icon name={iconFor(it.network)} size={size} strokeWidth={1.5} />
        </a>
      ))}
    </div>
  );
}

function BreadcrumbsView({ node, className, attrs }: { node: ElementNode; className: string; attrs: Record<string, string> }) {
  const items = (node.settings.items as string[]) ?? [];
  const sep = (node.settings.separator as string) || '/';
  return (
    <nav className={className} aria-label="Breadcrumb" {...attrs}>
      {items.map((it, i) => (
        <span key={i} style={{ display: 'inline-flex', gap: 8 }}>
          <span>{it}</span>
          {i < items.length - 1 ? <span className="dw-breadcrumb-sep">{sep}</span> : null}
        </span>
      ))}
    </nav>
  );
}

function EmbedView({ node, className, attrs, editing }: { node: ElementNode; className: string; attrs: Record<string, string>; editing: boolean }) {
  const html = (node.settings.html as string) || '';
  if (!html.trim()) {
    return (
      <div className={`${className} dw-placeholder`} {...attrs}>
        <Icon name="code" size={16} />
        Embed
      </div>
    );
  }
  return (
    <div
      className={className}
      {...attrs}
      style={editing ? { pointerEvents: 'none' } : undefined}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function MapView({ node, className, attrs }: { node: ElementNode; className: string; attrs: Record<string, string> }) {
  const query = (node.settings.query as string) || '';
  const zoom = Number(node.settings.zoom ?? 13);
  if (!query) {
    return (
      <div className={`${className} dw-placeholder`} {...attrs}>
        <Icon name="map" size={16} />
        Map
      </div>
    );
  }
  return (
    <div className={className} {...attrs}>
      <iframe
        title="Map"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
        loading="lazy"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive containers                                              */
/* ------------------------------------------------------------------ */

function AccordionView({ node, className, attrs, childIds }: { node: ElementNode; className: string; attrs: Record<string, string>; childIds: string[] }) {
  const allowMultiple = !!node.settings.allowMultiple;
  const [open, setOpen] = useState<string[]>([]);

  return (
    <div className={className} {...attrs}>
      {childIds.map((childId) => (
        <AccordionItemView
          key={childId}
          id={childId}
          open={open.includes(childId)}
          toggle={() =>
            setOpen((cur) =>
              cur.includes(childId)
                ? cur.filter((c) => c !== childId)
                : allowMultiple
                  ? [...cur, childId]
                  : [childId],
            )
          }
        />
      ))}
    </div>
  );
}

function AccordionItemView({ id, open, toggle }: { id: string; open: boolean; toggle: () => void }) {
  const node = useDoc((s) => s.doc.elements[id]);
  const { mode } = useRender();
  if (!node) return null;
  const cls = classesFor(node, 'dw-acc-item');

  return (
    <div className={cls} data-el-id={node.id} data-el-type={node.type} data-open={open} {...attrsFor(node)}>
      <button
        type="button"
        className="dw-acc-trigger"
        onClick={(e) => {
          if (mode === 'edit') e.preventDefault();
          toggle();
        }}
        aria-expanded={open}
      >
        <span>{node.content}</span>
        <span className="dw-acc-mark" aria-hidden />
      </button>
      <div className="dw-acc-panel" hidden={!open}>
        {node.children.map((c) => (
          <ElementView key={c} id={c} />
        ))}
      </div>
    </div>
  );
}

function TabsView({ node, className, attrs, childIds }: { node: ElementNode; className: string; attrs: Record<string, string>; childIds: string[] }) {
  const [active, setActive] = useState(Number(node.settings.active ?? 0));
  const labels = useDoc((s) => childIds.map((c) => s.doc.elements[c]?.content ?? '').join('\u0000'));
  const index = Math.min(active, Math.max(0, childIds.length - 1));
  const tabLabels = labels.split('\u0000');

  return (
    <div className={className} {...attrs}>
      <div className="dw-tablist" role="tablist">
        {childIds.map((childId, i) => (
          <button
            key={childId}
            type="button"
            role="tab"
            className="dw-tab"
            data-active={i === index}
            aria-selected={i === index}
            onClick={() => setActive(i)}
          >
            {tabLabels[i] || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {childIds.map((childId, i) => (
        <TabPanelView key={childId} id={childId} active={i === index} />
      ))}
    </div>
  );
}

function TabPanelView({ id, active }: { id: string; active: boolean }) {
  const node = useDoc((s) => s.doc.elements[id]);
  if (!node) return null;
  return (
    <div
      className={classesFor(node, 'dw-tabpanel')}
      data-el-id={node.id}
      data-el-type={node.type}
      data-active={active}
      role="tabpanel"
      hidden={!active}
      {...attrsFor(node)}
    >
      {node.children.map((c) => (
        <ElementView key={c} id={c} />
      ))}
    </div>
  );
}

function CarouselView({ node, className, attrs, childIds }: { node: ElementNode; className: string; attrs: Record<string, string>; childIds: string[] }) {
  const [index, setIndex] = useState(0);
  const count = childIds.length;
  const go = (d: number) => setIndex((i) => (count ? (i + d + count) % count : 0));

  return (
    <div className={`${className} dw-carousel`} {...attrs}>
      <div className="dw-carousel-track">
        <div
          style={{ display: 'flex', width: '100%', transform: `translateX(-${index * 100}%)`, transition: 'transform 340ms cubic-bezier(.4,0,.2,1)' }}
        >
          {childIds.map((c) => (
            <div className="dw-carousel-slide" key={c}>
              <ElementView id={c} />
            </div>
          ))}
        </div>
      </div>
      {node.settings.showArrows !== false && count > 1 ? (
        <>
          <button type="button" className="dw-carousel-nav prev" onClick={() => go(-1)} aria-label="Previous slide">
            <Icon name="chevronLeft" size={16} />
          </button>
          <button type="button" className="dw-carousel-nav next" onClick={() => go(1)} aria-label="Next slide">
            <Icon name="chevronRight" size={16} />
          </button>
        </>
      ) : null}
      {node.settings.showDots !== false && count > 1 ? (
        <div className="dw-carousel-dots">
          {childIds.map((c, i) => (
            <button key={c} type="button" className="dw-carousel-dot" data-active={i === index} onClick={() => setIndex(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function NavbarView({ node, className, attrs, childIds }: { node: ElementNode; className: string; attrs: Record<string, string>; childIds: string[] }) {
  const [open, setOpen] = useState(false);
  const mobileMenu = (node.settings.mobileMenu as string) || 'hamburger';
  // The logo stays put; everything after it collapses behind the hamburger.
  const logoIdx = useDoc((s) => childIds.findIndex((c) => s.doc.elements[c]?.type === 'logo'));

  return (
    <header
      className={`${className} dw-navbar`}
      data-mobile-menu={mobileMenu}
      data-sticky={node.settings.sticky !== false}
      data-transparent={!!node.settings.transparent}
      data-open={open}
      {...attrs}
    >
      {childIds.map((c, i) =>
        // The logo stays visible; everything else gets a wrapper the mobile
        // rules can collapse. The wrapper's `display: contents` lives in CSS,
        // not inline, so `display: none` can actually beat it.
        i === logoIdx ? (
          <ElementView key={c} id={c} />
        ) : (
          <div key={c} className="dw-collapsible">
            <ElementView id={c} />
          </div>
        ),
      )}
      {mobileMenu === 'hamburger' ? (
        <button
          type="button"
          className="dw-hamburger"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? 'x' : 'menu'} size={18} />
        </button>
      ) : null}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Component instances                                                 */
/* ------------------------------------------------------------------ */

function InstanceView({ node }: { node: ElementNode }) {
  const ctx = useRender();
  const comp = useDoc((s) => (node.componentId ? s.doc.components[node.componentId] : null));
  const masterExists = useDoc((s) => (comp ? !!s.doc.elements[comp.rootId] : false));

  if (!comp || !masterExists) {
    return (
      <div className={classesFor(node)} data-el-id={node.id} data-el-type="instance">
        <Placeholder label="Missing component" icon="component" />
      </div>
    );
  }
  if (ctx.instanceDepth > 8) return null;

  return (
    <div
      className={classesFor(node)}
      data-el-id={node.id}
      data-el-type="instance"
      data-instance-of={comp.id}
      style={{ display: 'contents' }}
    >
      <ElementView id={comp.rootId} instanceId={node.id} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

interface ElementViewProps {
  id: string;
  /** Set when rendering inside a component instance. */
  instanceId?: string;
}

function ElementViewInner({ id, instanceId }: ElementViewProps) {
  const node = useDoc((s) => s.doc.elements[id]);
  const editingHere = useEditor((s) => s.editingTextId === id);
  // `pages` only changes when pages are added/renamed, so link targets stay
  // fresh without subscribing to the whole document.
  const pages = useDoc((s) => s.doc.pages);
  const ctx = useRender();

  if (!node) return null;

  const d = def(node.type);
  const editing = ctx.mode === 'edit';
  const attrs: Record<string, string> = {
    ...attrsFor(node),
    'data-el-id': node.id,
    'data-el-type': node.type,
  };
  if (instanceId) attrs['data-in-instance'] = instanceId;
  if (node.customId) attrs.id = node.customId;
  else if (node.type === 'section') attrs.id = node.id;

  const className = classesFor(node);
  const children = node.children;

  switch (node.type) {
    case 'instance':
      return <InstanceView node={node} />;

    case 'image':
      return <ImageView node={node} className={className} attrs={attrs} />;

    case 'video':
      return <VideoView node={node} className={className} attrs={attrs} />;

    case 'icon':
      return <IconView node={node} className={className} attrs={attrs} />;

    case 'divider':
      return <hr className={className} {...attrs} />;

    case 'spacer':
      return <div className={className} {...attrs} aria-hidden />;

    case 'input':
      return <InputView node={node} className={className} attrs={attrs} editing={editing} />;
    case 'textarea':
      return <TextareaView node={node} className={className} attrs={attrs} editing={editing} />;
    case 'select':
      return <SelectView node={node} className={className} attrs={attrs} editing={editing} />;
    case 'checkbox':
      return <CheckboxView node={node} className={className} attrs={attrs} editing={editing} />;
    case 'radio':
      return <RadioView node={node} className={className} attrs={attrs} editing={editing} />;

    case 'socialLinks':
      return <SocialView node={node} className={className} attrs={attrs} />;
    case 'breadcrumbs':
      return <BreadcrumbsView node={node} className={className} attrs={attrs} />;
    case 'embed':
      return <EmbedView node={node} className={className} attrs={attrs} editing={editing} />;
    case 'map':
      return <MapView node={node} className={className} attrs={attrs} />;

    case 'accordion':
    case 'faq':
      return <AccordionView node={node} className={className} attrs={attrs} childIds={children} />;
    case 'tabs':
      return <TabsView node={node} className={className} attrs={attrs} childIds={children} />;
    case 'carousel':
      return <CarouselView node={node} className={className} attrs={attrs} childIds={children} />;
    case 'navbar':
      return <NavbarView node={node} className={className} attrs={attrs} childIds={children} />;

    case 'form': {
      return (
        <form
          className={className}
          {...attrs}
          onSubmit={(e) => {
            e.preventDefault();
            if (!editing) {
              const msg = (node.settings.successMessage as string) || 'Thanks!';
              const note = document.createElement('p');
              note.className = 'dw-form-note';
              note.textContent = msg;
              e.currentTarget.appendChild(note);
              e.currentTarget.querySelectorAll('input, textarea, select').forEach((el) => {
                (el as HTMLInputElement).value = '';
              });
            }
          }}
        >
          {children.map((c) => (
            <ElementView key={c} id={c} instanceId={instanceId} />
          ))}
        </form>
      );
    }

    case 'submit':
      return (
        <button type="submit" className={className} {...attrs} disabled={editing}>
          {node.content}
        </button>
      );

    case 'button':
    case 'navLink':
    case 'logo': {
      const href = hrefFor(node.link, pages);
      const isTextMode = node.type !== 'logo' || node.settings.mode !== 'image';

      const inner =
        node.type === 'logo' && node.settings.mode === 'image' ? (
          node.settings.src ? (
            <img src={node.settings.src as string} alt={node.content || 'Logo'} style={{ height: '100%', width: 'auto' }} />
          ) : (
            <Placeholder label="Logo" icon="logo" />
          )
        ) : (
          node.content
        );

      if (editingHere && isTextMode) {
        return <EditableText node={node} tag="a" className={className} attrs={attrs} />;
      }

      return (
        <a
          className={className}
          href={editing ? undefined : href}
          target={node.link?.newTab ? '_blank' : undefined}
          rel={node.link?.newTab ? 'noreferrer noopener' : undefined}
          onClick={(e) => {
            if (editing) {
              e.preventDefault();
              return;
            }
            if (node.link?.kind === 'page' && node.link.pageId) {
              e.preventDefault();
              ctx.navigate(node.link.pageId);
            }
          }}
          {...attrs}
        >
          {inner}
          {children.map((c) => (
            <ElementView key={c} id={c} instanceId={instanceId} />
          ))}
        </a>
      );
    }

    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.settings.level ?? 2)));
      const tag = `h${level}` as keyof HTMLElementTagNameMap;
      if (editingHere) return <EditableText node={node} tag={tag} className={className} attrs={attrs} />;
      const H = tag as 'h2';
      return (
        <H className={className} {...attrs}>
          {node.content}
        </H>
      );
    }

    case 'text':
      if (editingHere) return <EditableText node={node} tag="p" className={className} attrs={attrs} />;
      return (
        <p className={className} {...attrs}>
          {node.content}
        </p>
      );

    case 'featureItem': {
      const iconName = ((node.settings.icon as string) || 'check') as IconName;
      return (
        <li className={className} {...attrs}>
          <Icon name={iconName} size={17} style={{ flex: 'none', marginTop: 3, color: 'var(--c-primary)' }} />
          {editingHere ? (
            <EditableText node={node} tag="span" className="" attrs={{}} />
          ) : (
            <span>{node.content}</span>
          )}
        </li>
      );
    }

    case 'label':
      if (editingHere) return <EditableText node={node} tag="label" className={className} attrs={attrs} />;
      return (
        <label className={className} {...attrs}>
          {node.content}
        </label>
      );

    default: {
      // Generic container. `section` honours an optional semantic tag override.
      const tag =
        node.type === 'section' && node.settings.tag ? (node.settings.tag as string) : d.tag;
      const Tag = tag as 'div';
      // The page's own empty state is drawn by the canvas, not here.
      const isEmpty = !children.length && d.container && node.type !== 'page';

      return (
        <Tag className={className} {...attrs}>
          {children.map((c) => (
            <ElementView key={c} id={c} instanceId={instanceId} />
          ))}
          {isEmpty && editing ? <EmptyContainerHint type={node.type} /> : null}
        </Tag>
      );
    }
  }
}

function EmptyContainerHint({ type }: { type: string }) {
  return (
    <div
      data-empty-hint="true"
      style={{
        minHeight: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        border: '1px dashed rgba(125,135,150,0.4)',
        borderRadius: 6,
        color: 'rgba(110,120,135,0.85)',
        fontSize: 12,
        padding: 12,
        width: '100%',
        pointerEvents: 'none',
      }}
    >
      Empty {type} — drop elements here
    </div>
  );
}

export const ElementView = memo(ElementViewInner);
