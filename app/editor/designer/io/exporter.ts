/**
 * Static site exporter.
 *
 * Walks the same document model the canvas renders and emits semantic HTML
 * plus one shared stylesheet. Nothing about the editor leaks into the output:
 * no wrapper divs, no inline style soup, and a single small script that only
 * ships if the page actually uses an interactive component.
 */

import { buildCss, elClass, tyClass, btnClass } from '../engine/css';
import { runtimeCss } from '../engine/runtimeCss';
import { toEmbedUrl } from '../engine/media';
import { def } from '../model/registry';
import type { ElementNode, Page, SiteDoc } from '../model/types';

export interface ExportedFile {
  path: string;
  contents: string;
  type: 'html' | 'css' | 'js' | 'asset';
}

const VOID_TAGS = new Set(['img', 'hr', 'br', 'input', 'meta', 'link', 'source']);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escAttr = (s: string) => esc(s).replace(/'/g, '&#39;');

function indent(depth: number) {
  return '  '.repeat(depth);
}

function classAttr(node: ElementNode, extra?: string): string {
  const cls = [elClass(node.id)];
  if (node.textStyle) cls.push(tyClass(node.textStyle));
  const btn = node.settings?.buttonStyle as string | undefined;
  if (btn) cls.push(btnClass(btn));
  if (node.classes?.length) cls.push(...node.classes);
  if (extra) cls.push(extra);
  return ` class="${cls.join(' ')}"`;
}

function customAttrs(node: ElementNode): string {
  let out = '';
  if (node.customId) out += ` id="${escAttr(node.customId)}"`;
  else if (node.type === 'section') out += ` id="${escAttr(node.id)}"`;
  for (const a of node.attributes ?? []) {
    if (a.name && /^[a-zA-Z][\w:-]*$/.test(a.name) && !a.name.toLowerCase().startsWith('on')) {
      out += ` ${a.name}="${escAttr(a.value)}"`;
    }
  }
  return out;
}

function hrefFor(node: ElementNode, doc: SiteDoc): string {
  const link = node.link;
  if (!link || link.kind === 'none') return '';
  switch (link.kind) {
    case 'page': {
      const page = link.pageId ? doc.pages[link.pageId] : null;
      if (!page) return '';
      return page.id === doc.homePageId ? 'index.html' : `${page.slug.replace(/^\//, '')}.html`;
    }
    case 'url':
      return link.url ?? '';
    case 'section':
      return link.sectionId ? `#${link.sectionId}` : '';
    case 'email':
      return link.url ? `mailto:${link.url}` : '';
    case 'phone':
      return link.url ? `tel:${link.url}` : '';
    default:
      return '';
  }
}

interface RenderState {
  usesInteractive: boolean;
}

function renderNode(doc: SiteDoc, id: string, depth: number, state: RenderState): string {
  const node = doc.elements[id];
  if (!node) return '';
  const pad = indent(depth);
  const kids = () => node.children.map((c) => renderNode(doc, c, depth + 1, state)).filter(Boolean).join('\n');

  switch (node.type) {
    case 'instance': {
      const comp = node.componentId ? doc.components[node.componentId] : null;
      if (!comp || !doc.elements[comp.rootId]) return '';
      return renderNode(doc, comp.rootId, depth, state);
    }

    case 'image': {
      const src = (node.settings.src as string) || '';
      if (!src) return `${pad}<div${classAttr(node)}${customAttrs(node)}></div>`;
      const fit = (node.settings.objectFit as string) || 'cover';
      const posn = (node.settings.objectPosition as string) || 'center';
      return `${pad}<img${classAttr(node)} src="${escAttr(src)}" alt="${escAttr((node.settings.alt as string) || '')}" loading="${
        (node.settings.loading as string) || 'lazy'
      }" decoding="async" style="object-fit:${fit};object-position:${posn}"${customAttrs(node)}>`;
    }

    case 'video': {
      const url = (node.settings.url as string) || '';
      if (!url) return `${pad}<div${classAttr(node)}${customAttrs(node)}></div>`;
      if (node.settings.source === 'file') {
        const attrs = [
          node.settings.controls !== false ? 'controls' : '',
          node.settings.autoplay ? 'autoplay' : '',
          node.settings.loop ? 'loop' : '',
          node.settings.muted !== false ? 'muted' : '',
          'playsinline',
        ]
          .filter(Boolean)
          .join(' ');
        return `${pad}<video${classAttr(node)} src="${escAttr(url)}" ${attrs}${customAttrs(node)}></video>`;
      }
      const embed = toEmbedUrl(url, (node.settings.source as string) || 'youtube');
      return `${pad}<div${classAttr(node)}${customAttrs(node)}>\n${indent(depth + 1)}<iframe src="${escAttr(
        embed,
      )}" title="Video" loading="lazy" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>\n${pad}</div>`;
    }

    case 'divider':
      return `${pad}<hr${classAttr(node)}${customAttrs(node)}>`;

    case 'spacer':
      return `${pad}<div${classAttr(node)} aria-hidden="true"${customAttrs(node)}></div>`;

    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.settings.level ?? 2)));
      return `${pad}<h${level}${classAttr(node)}${customAttrs(node)}>${esc(node.content ?? '')}</h${level}>`;
    }

    case 'text':
      return `${pad}<p${classAttr(node)}${customAttrs(node)}>${esc(node.content ?? '')}</p>`;

    case 'button':
    case 'navLink':
    case 'logo': {
      const href = hrefFor(node, doc);
      const target = node.link?.newTab ? ' target="_blank" rel="noreferrer noopener"' : '';
      if (node.type === 'logo' && node.settings.mode === 'image' && node.settings.src) {
        return `${pad}<a${classAttr(node)}${href ? ` href="${escAttr(href)}"` : ''}${target}${customAttrs(
          node,
        )}><img src="${escAttr(node.settings.src as string)}" alt="${escAttr(node.content ?? 'Logo')}" style="height:100%;width:auto"></a>`;
      }
      return `${pad}<a${classAttr(node)}${href ? ` href="${escAttr(href)}"` : ''}${target}${customAttrs(node)}>${esc(
        node.content ?? '',
      )}</a>`;
    }

    case 'submit':
      return `${pad}<button type="submit"${classAttr(node)}${customAttrs(node)}>${esc(node.content ?? 'Submit')}</button>`;

    case 'featureItem': {
      return `${pad}<li${classAttr(node)}${customAttrs(node)}><span aria-hidden="true">✓</span><span>${esc(
        node.content ?? '',
      )}</span></li>`;
    }

    case 'label':
      return `${pad}<label${classAttr(node)}${customAttrs(node)}>${esc(node.content ?? '')}</label>`;

    case 'input': {
      const s = node.settings;
      const name = escAttr((s.name as string) || 'field');
      return `${pad}<div${classAttr(node, 'dw-field')}${customAttrs(node)}>
${indent(depth + 1)}<label for="${name}">${esc((s.label as string) || '')}${s.required ? ' *' : ''}</label>
${indent(depth + 1)}<input id="${name}" name="${name}" type="${escAttr((s.inputType as string) || 'text')}" placeholder="${escAttr(
        (s.placeholder as string) || '',
      )}"${s.required ? ' required' : ''}>
${pad}</div>`;
    }

    case 'textarea': {
      const s = node.settings;
      const name = escAttr((s.name as string) || 'message');
      return `${pad}<div${classAttr(node, 'dw-field')}${customAttrs(node)}>
${indent(depth + 1)}<label for="${name}">${esc((s.label as string) || '')}${s.required ? ' *' : ''}</label>
${indent(depth + 1)}<textarea id="${name}" name="${name}" rows="${Number(s.rows ?? 5)}" placeholder="${escAttr(
        (s.placeholder as string) || '',
      )}"${s.required ? ' required' : ''}></textarea>
${pad}</div>`;
    }

    case 'select': {
      const s = node.settings;
      const name = escAttr((s.name as string) || 'choice');
      const options = ((s.options as string[]) ?? [])
        .map((o) => `${indent(depth + 2)}<option value="${escAttr(o)}">${esc(o)}</option>`)
        .join('\n');
      return `${pad}<div${classAttr(node, 'dw-field')}${customAttrs(node)}>
${indent(depth + 1)}<label for="${name}">${esc((s.label as string) || '')}</label>
${indent(depth + 1)}<select id="${name}" name="${name}"${s.required ? ' required' : ''}>
${options}
${indent(depth + 1)}</select>
${pad}</div>`;
    }

    case 'checkbox': {
      const s = node.settings;
      return `${pad}<label${classAttr(node, 'dw-choice')}${customAttrs(node)}><input type="checkbox" name="${escAttr(
        (s.name as string) || 'check',
      )}"${s.checked ? ' checked' : ''}><span>${esc((s.label as string) || '')}</span></label>`;
    }

    case 'radio': {
      const s = node.settings;
      const name = escAttr((s.name as string) || 'choice');
      const opts = ((s.options as string[]) ?? [])
        .map(
          (o) =>
            `${indent(depth + 1)}<label class="dw-choice"><input type="radio" name="${name}" value="${escAttr(o)}"${
              o === s.value ? ' checked' : ''
            }><span>${esc(o)}</span></label>`,
        )
        .join('\n');
      return `${pad}<div${classAttr(node, 'dw-field')}${customAttrs(node)}>
${indent(depth + 1)}<span>${esc((s.label as string) || '')}</span>
${opts}
${pad}</div>`;
    }

    case 'form': {
      const action = (node.settings.action as string) || '';
      const method = (node.settings.method as string) || 'POST';
      return `${pad}<form${classAttr(node)}${action ? ` action="${escAttr(action)}"` : ''} method="${escAttr(
        method,
      )}"${customAttrs(node)}>\n${kids()}\n${pad}</form>`;
    }

    case 'accordion':
    case 'faq': {
      state.usesInteractive = true;
      const items = node.children
        .map((cid) => {
          const item = doc.elements[cid];
          if (!item) return '';
          const inner = item.children.map((c) => renderNode(doc, c, depth + 3, state)).filter(Boolean).join('\n');
          return `${indent(depth + 1)}<div${classAttr(item, 'dw-acc-item')} data-open="${!!item.settings.open}"${customAttrs(item)}>
${indent(depth + 2)}<button type="button" class="dw-acc-trigger" aria-expanded="${!!item.settings.open}"><span>${esc(
            item.content ?? '',
          )}</span><span class="dw-acc-mark" aria-hidden="true"></span></button>
${indent(depth + 2)}<div class="dw-acc-panel">
${inner}
${indent(depth + 2)}</div>
${indent(depth + 1)}</div>`;
        })
        .filter(Boolean)
        .join('\n');
      return `${pad}<div${classAttr(node)} data-accordion data-multiple="${!!node.settings.allowMultiple}"${customAttrs(
        node,
      )}>\n${items}\n${pad}</div>`;
    }

    case 'tabs': {
      state.usesInteractive = true;
      const active = Number(node.settings.active ?? 0);
      const list = node.children
        .map(
          (cid, i) =>
            `${indent(depth + 2)}<button type="button" role="tab" class="dw-tab" data-active="${
              i === active
            }" aria-selected="${i === active}">${esc(doc.elements[cid]?.content ?? '')}</button>`,
        )
        .join('\n');
      const panels = node.children
        .map((cid, i) => {
          const panel = doc.elements[cid];
          if (!panel) return '';
          const inner = panel.children.map((c) => renderNode(doc, c, depth + 2, state)).filter(Boolean).join('\n');
          return `${indent(depth + 1)}<div${classAttr(panel, 'dw-tabpanel')} role="tabpanel" data-active="${
            i === active
          }"${customAttrs(panel)}>\n${inner}\n${indent(depth + 1)}</div>`;
        })
        .filter(Boolean)
        .join('\n');
      return `${pad}<div${classAttr(node)} data-tabs${customAttrs(node)}>
${indent(depth + 1)}<div class="dw-tablist" role="tablist">
${list}
${indent(depth + 1)}</div>
${panels}
${pad}</div>`;
    }

    case 'carousel': {
      state.usesInteractive = true;
      const slides = node.children
        .map(
          (cid) =>
            `${indent(depth + 3)}<div class="dw-carousel-slide">\n${renderNode(doc, cid, depth + 4, state)}\n${indent(
              depth + 3,
            )}</div>`,
        )
        .join('\n');
      const dots = node.children
        .map((_, i) => `${indent(depth + 2)}<button type="button" class="dw-carousel-dot" data-active="${i === 0}" aria-label="Slide ${i + 1}"></button>`)
        .join('\n');
      return `${pad}<div${classAttr(node, 'dw-carousel')} data-carousel${customAttrs(node)}>
${indent(depth + 1)}<div class="dw-carousel-track">
${indent(depth + 2)}<div class="dw-carousel-inner" style="display:flex;width:100%;transition:transform .34s cubic-bezier(.4,0,.2,1)">
${slides}
${indent(depth + 2)}</div>
${indent(depth + 1)}</div>
${node.settings.showArrows !== false ? `${indent(depth + 1)}<button type="button" class="dw-carousel-nav prev" aria-label="Previous">‹</button>\n${indent(depth + 1)}<button type="button" class="dw-carousel-nav next" aria-label="Next">›</button>` : ''}
${node.settings.showDots !== false ? `${indent(depth + 1)}<div class="dw-carousel-dots">\n${dots}\n${indent(depth + 1)}</div>` : ''}
${pad}</div>`;
    }

    case 'navbar': {
      state.usesInteractive = true;
      const logoIdx = node.children.findIndex((c) => doc.elements[c]?.type === 'logo');
      const kidsHtml = node.children
        .map((c, i) => {
          const html = renderNode(doc, c, depth + 2, state);
          if (!html) return '';
          if (i === logoIdx) return html;
          return `${indent(depth + 1)}<div class="dw-collapsible">\n${html}\n${indent(depth + 1)}</div>`;
        })
        .filter(Boolean)
        .join('\n');
      const hamburger =
        (node.settings.mobileMenu ?? 'hamburger') === 'hamburger'
          ? `${indent(depth + 1)}<button type="button" class="dw-hamburger" aria-label="Toggle menu" aria-expanded="false">☰</button>`
          : '';
      return `${pad}<header${classAttr(node, 'dw-navbar')} data-mobile-menu="${escAttr(
        (node.settings.mobileMenu as string) ?? 'hamburger',
      )}" data-sticky="${node.settings.sticky !== false}" data-transparent="${!!node.settings.transparent}" data-open="false"${customAttrs(
        node,
      )}>
${kidsHtml}
${hamburger}
${pad}</header>`;
    }

    case 'socialLinks': {
      const items = (node.settings.items as { network: string; url: string }[]) ?? [];
      const links = items
        .map(
          (it) =>
            `${indent(depth + 1)}<a class="dw-social" href="${escAttr(it.url)}" target="_blank" rel="noreferrer noopener" aria-label="${escAttr(
              it.network,
            )}">${esc(it.network)}</a>`,
        )
        .join('\n');
      return `${pad}<div${classAttr(node)}${customAttrs(node)}>\n${links}\n${pad}</div>`;
    }

    case 'breadcrumbs': {
      const items = (node.settings.items as string[]) ?? [];
      const sep = (node.settings.separator as string) || '/';
      const inner = items
        .map((it, i) => `<span>${esc(it)}</span>${i < items.length - 1 ? `<span class="dw-breadcrumb-sep">${esc(sep)}</span>` : ''}`)
        .join('');
      return `${pad}<nav${classAttr(node)} aria-label="Breadcrumb"${customAttrs(node)}>${inner}</nav>`;
    }

    case 'embed':
      return `${pad}<div${classAttr(node)}${customAttrs(node)}>${(node.settings.html as string) || ''}</div>`;

    case 'map': {
      const q = (node.settings.query as string) || '';
      if (!q) return `${pad}<div${classAttr(node)}${customAttrs(node)}></div>`;
      return `${pad}<div${classAttr(node)}${customAttrs(node)}><iframe title="Map" loading="lazy" style="width:100%;height:100%;border:0;display:block" src="https://maps.google.com/maps?q=${encodeURIComponent(
        q,
      )}&z=${Number(node.settings.zoom ?? 13)}&output=embed"></iframe></div>`;
    }

    case 'icon':
      return `${pad}<span${classAttr(node)} aria-hidden="true"${customAttrs(node)}></span>`;

    default: {
      const tag = node.type === 'section' && node.settings.tag ? (node.settings.tag as string) : def(node.type).tag;
      if (VOID_TAGS.has(tag)) return `${pad}<${tag}${classAttr(node)}${customAttrs(node)}>`;
      const inner = kids();
      if (!inner) return `${pad}<${tag}${classAttr(node)}${customAttrs(node)}></${tag}>`;
      return `${pad}<${tag}${classAttr(node)}${customAttrs(node)}>\n${inner}\n${pad}</${tag}>`;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Page + site assembly                                                */
/* ------------------------------------------------------------------ */

function pageFileName(doc: SiteDoc, page: Page): string {
  return page.id === doc.homePageId ? 'index.html' : `${page.slug.replace(/^\//, '') || page.id}.html`;
}

export function renderPageHtml(doc: SiteDoc, page: Page, opts: { cssHref?: string; inlineCss?: string } = {}): string {
  const state: RenderState = { usesInteractive: false };
  const root = doc.elements[page.rootId];
  const body = root ? root.children.map((c) => renderNode(doc, c, 2, state)).filter(Boolean).join('\n') : '';

  const head: string[] = [
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${esc(page.seo.title || `${page.name} — ${doc.name}`)}</title>`,
  ];
  if (page.seo.description) head.push(`  <meta name="description" content="${escAttr(page.seo.description)}">`);
  if (page.seo.noIndex) head.push('  <meta name="robots" content="noindex">');
  head.push(`  <meta property="og:title" content="${escAttr(page.seo.title || page.name)}">`);
  if (page.seo.description) head.push(`  <meta property="og:description" content="${escAttr(page.seo.description)}">`);
  if (page.seo.ogImage) head.push(`  <meta property="og:image" content="${escAttr(page.seo.ogImage)}">`);
  if (opts.cssHref) head.push(`  <link rel="stylesheet" href="${opts.cssHref}">`);
  if (opts.inlineCss) head.push(`  <style>\n${opts.inlineCss}\n  </style>`);

  const script = state.usesInteractive ? '  <script src="site.js" defer></script>\n' : '';

  // The page root becomes <body> rather than an extra wrapper div, so page
  // level styling (background, min-height, column layout) survives export
  // without adding a node to the tree.
  const bodyClass = root ? ` class="${elClass(root.id)}"` : '';

  return `<!doctype html>
<html lang="en">
<head>
${head.join('\n')}
</head>
<body${bodyClass}>
${body}
${script}</body>
</html>
`;
}

export function buildSiteCss(doc: SiteDoc): string {
  return [
    '/* Generated by Design Web. Edit the site, not this file. */',
    runtimeCss('body', 'media'),
    buildCss(doc, { scope: 'body', mode: 'media', selectorPrefix: '' }),
  ].join('\n\n');
}

/** Small progressive-enhancement script; only shipped when it is needed. */
export const SITE_JS = `(function () {
  'use strict';

  document.querySelectorAll('[data-accordion]').forEach(function (acc) {
    var multiple = acc.dataset.multiple === 'true';
    acc.addEventListener('click', function (e) {
      var trigger = e.target.closest('.dw-acc-trigger');
      if (!trigger || !acc.contains(trigger)) return;
      var item = trigger.closest('.dw-acc-item');
      var open = item.dataset.open === 'true';
      if (!multiple) {
        acc.querySelectorAll('.dw-acc-item').forEach(function (i) {
          i.dataset.open = 'false';
          i.querySelector('.dw-acc-trigger').setAttribute('aria-expanded', 'false');
        });
      }
      item.dataset.open = String(!open);
      trigger.setAttribute('aria-expanded', String(!open));
    });
  });

  document.querySelectorAll('[data-tabs]').forEach(function (tabs) {
    var buttons = tabs.querySelectorAll('.dw-tab');
    var panels = tabs.querySelectorAll('.dw-tabpanel');
    buttons.forEach(function (btn, i) {
      btn.addEventListener('click', function () {
        buttons.forEach(function (b, j) {
          b.dataset.active = String(i === j);
          b.setAttribute('aria-selected', String(i === j));
        });
        panels.forEach(function (p, j) {
          p.dataset.active = String(i === j);
        });
      });
    });
  });

  document.querySelectorAll('[data-carousel]').forEach(function (car) {
    var inner = car.querySelector('.dw-carousel-inner');
    var slides = car.querySelectorAll('.dw-carousel-slide');
    var dots = car.querySelectorAll('.dw-carousel-dot');
    var index = 0;
    function go(n) {
      index = (n + slides.length) % slides.length;
      inner.style.transform = 'translateX(-' + index * 100 + '%)';
      dots.forEach(function (d, i) { d.dataset.active = String(i === index); });
    }
    var prev = car.querySelector('.prev');
    var next = car.querySelector('.next');
    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
  });

  document.querySelectorAll('.dw-navbar').forEach(function (nav) {
    var toggle = nav.querySelector('.dw-hamburger');
    if (!toggle) return;
    toggle.addEventListener('click', function () {
      var open = nav.dataset.open === 'true';
      nav.dataset.open = String(!open);
      toggle.setAttribute('aria-expanded', String(!open));
    });
  });
})();
`;

export function exportSite(doc: SiteDoc): ExportedFile[] {
  const files: ExportedFile[] = [];

  files.push({ path: 'styles.css', contents: buildSiteCss(doc), type: 'css' });

  let anyInteractive = false;
  for (const pageId of doc.pageOrder) {
    const page = doc.pages[pageId];
    if (!page) continue;
    const html = renderPageHtml(doc, page, { cssHref: 'styles.css' });
    if (html.includes('site.js')) anyInteractive = true;
    files.push({ path: pageFileName(doc, page), contents: html, type: 'html' });
  }

  if (anyInteractive) files.push({ path: 'site.js', contents: SITE_JS, type: 'js' });

  return files;
}

/** Single self-contained file — handy for a quick share or a preview tab. */
export function exportSinglePage(doc: SiteDoc, pageId: string): string {
  const page = doc.pages[pageId];
  if (!page) return '';
  const css = buildSiteCss(doc)
    .split('\n')
    .map((l) => (l ? `    ${l}` : l))
    .join('\n');
  const html = renderPageHtml(doc, page, { inlineCss: css });
  const inlineScript = `  <script>\n${SITE_JS.split('\n')
    .map((l) => (l ? `    ${l}` : l))
    .join('\n')}\n  </script>\n`;
  // Drop the external reference; everything is inlined in this variant.
  return html.replace('  <script src="site.js" defer></script>\n', '').replace('</body>', `${inlineScript}</body>`);
}
