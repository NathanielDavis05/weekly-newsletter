import type { Blueprint } from './blueprint';
import { styleSet } from './blueprint';

/**
 * Prebuilt section layouts. These are ordinary blueprints — once inserted
 * every part is a normal, fully editable element. Nothing is locked.
 */

export interface SectionPreset {
  id: string;
  name: string;
  group: string;
  /** Tiny abstract preview drawn in the Sections panel. */
  preview: string;
  create: () => Blueprint;
}

const sectionShell = (children: Blueprint[], extra: Record<string, string> = {}): Blueprint => ({
  type: 'section',
  name: 'Section',
  styles: styleSet(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      paddingTop: '96px',
      paddingBottom: '96px',
      paddingLeft: '32px',
      paddingRight: '32px',
      ...extra,
    },
    {},
    { paddingTop: '56px', paddingBottom: '56px', paddingLeft: '20px', paddingRight: '20px' },
  ),
  children,
});

const inner = (children: Blueprint[], extra: Record<string, string> = {}): Blueprint => ({
  type: 'container',
  name: 'Container',
  styles: styleSet({
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    width: '100%',
    maxWidth: 'var(--width-normal)',
    ...extra,
  }),
  children,
});

const h = (level: number, content: string, styles?: Record<string, string>, mobile?: Record<string, string>): Blueprint => ({
  type: 'heading',
  content,
  textStyle: `h${level}`,
  settings: { level },
  styles: styles || mobile ? styleSet(styles ?? {}, {}, mobile ?? {}) : undefined,
});

const p = (content: string, styles?: Record<string, string>): Blueprint => ({
  type: 'text',
  content,
  textStyle: 'body',
  styles: styles ? styleSet(styles) : undefined,
});

const btn = (content: string, style: 'primary' | 'secondary' | 'ghost' = 'primary'): Blueprint => ({
  type: 'button',
  content,
  settings: { buttonStyle: style },
  link: { kind: 'none' },
});

const img = (styles: Record<string, string>, mobile: Record<string, string> = {}): Blueprint => ({
  type: 'image',
  settings: { src: '', alt: '', objectFit: 'cover', objectPosition: 'center', loading: 'lazy' },
  styles: styleSet(styles, {}, mobile),
});

const eyebrow = (content: string): Blueprint => ({
  type: 'text',
  content,
  styles: styleSet({
    fontSize: '13px',
    fontWeight: '600',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--c-primary)',
  }),
});

/* ------------------------------------------------------------------ */

export const heroSection = (): Blueprint =>
  sectionShell(
    [
      inner(
        [
          {
            type: 'container',
            name: 'Hero copy',
            styles: styleSet({
              display: 'flex',
              flexDirection: 'column',
              gap: '22px',
              maxWidth: '720px',
              alignItems: 'flex-start',
            }),
            children: [
              eyebrow('New — version 2.0'),
              h(1, 'Design a website that actually looks designed'),
              p('Build every page visually, control each breakpoint precisely, and ship clean semantic markup. No templates you have to fight.', {
                fontSize: '19px',
                color: 'var(--c-muted)',
                maxWidth: '58ch',
              }),
              {
                type: 'row',
                name: 'Actions',
                styles: styleSet(
                  { display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' },
                  {},
                  { flexDirection: 'column', alignItems: 'stretch', width: '100%' },
                ),
                children: [btn('Start building'), btn('See how it works', 'secondary')],
              },
            ],
          },
          img({ width: '100%', height: '420px', borderRadius: '14px', marginTop: '24px' }, { height: '240px' }),
        ],
        { gap: '8px', alignItems: 'flex-start' },
      ),
    ],
    { paddingTop: '112px' },
  );

export const featuresSection = (): Blueprint =>
  sectionShell([
    inner([
      {
        type: 'container',
        name: 'Heading group',
        styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '640px' }),
        children: [eyebrow('Features'), h(2, 'Everything you need, nothing you don’t'), p('Three things our customers tell us matter most.', { color: 'var(--c-muted)' })],
      },
      {
        type: 'columns',
        name: 'Feature columns',
        styles: styleSet(
          { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '28px', width: '100%', marginTop: '28px' },
          { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: '20px' },
        ),
        children: [
          ['Visual first', 'Edit directly on the page. What you see is what visitors get.'],
          ['Truly responsive', 'Override any property per breakpoint without breaking the others.'],
          ['Clean output', 'Semantic HTML and a real stylesheet — not a pile of divs.'],
        ].map(([title, body]) => ({
          type: 'column' as const,
          styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0px' }),
          children: [
            { type: 'icon' as const, settings: { icon: 'sparkle', size: 26 }, styles: styleSet({ color: 'var(--c-primary)' }) },
            h(3, title),
            p(body, { color: 'var(--c-muted)', fontSize: '16px' }),
          ],
        })),
      },
    ]),
  ]);

export const aboutSection = (): Blueprint =>
  sectionShell([
    inner([
      {
        type: 'columns',
        name: 'About split',
        styles: styleSet(
          { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '56px', width: '100%', alignItems: 'center' },
          { gap: '36px' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: '28px' },
        ),
        children: [
          {
            type: 'column',
            styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '0px' }),
            children: [
              eyebrow('About us'),
              h(2, 'A small studio with a long attention span'),
              p('We have spent a decade building products for teams who care about craft. We take on a handful of projects a year so each one gets our full attention.', { color: 'var(--c-muted)' }),
              {
                type: 'featureList',
                styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }),
                children: ['Founded in 2014', 'Fully remote, eight people', 'Design and engineering under one roof'].map((t) => ({
                  type: 'featureItem' as const,
                  content: t,
                  settings: { icon: 'check' },
                  styles: styleSet({ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '16px' }),
                })),
              },
            ],
          },
          {
            type: 'column',
            styles: styleSet({ display: 'flex', minWidth: '0px' }),
            children: [img({ width: '100%', height: '440px', borderRadius: '14px' }, { height: '260px' })],
          },
        ],
      },
    ]),
  ]);

export const gallerySection = (): Blueprint =>
  sectionShell([
    inner([
      h(2, 'Selected work'),
      {
        type: 'gallery',
        name: 'Gallery',
        styles: styleSet(
          { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '16px', width: '100%', marginTop: '20px' },
          { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
        ),
        children: [1, 2, 3, 4, 5, 6].map(() =>
          img({ width: '100%', aspectRatio: '4 / 3', borderRadius: '10px' }),
        ),
      },
    ]),
  ]);

export const testimonialsSection = (): Blueprint =>
  sectionShell([
    inner([
      h(2, 'What people say'),
      {
        type: 'columns',
        styles: styleSet(
          { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', width: '100%', marginTop: '24px' },
          { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
        ),
        children: [
          ['“They rebuilt our marketing site in three weeks and conversions went up 40%.”', 'Dana Whitfield', 'CMO, Latitude'],
          ['“The clearest design process we have been through. No guessing, no drama.”', 'Marcus Bell', 'Founder, Overtone'],
          ['“Our team can finally update the site without filing a ticket.”', 'Priya Raman', 'Ops Lead, Fernpath'],
        ].map(([quote, name, role]) => ({
          type: 'column' as const,
          styles: styleSet({ display: 'flex', minWidth: '0px' }),
          children: [
            {
              type: 'testimonial' as const,
              styles: styleSet({
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                padding: '28px',
                backgroundColor: 'var(--c-surface)',
                borderRadius: '14px',
                border: '1px solid var(--c-border)',
                width: '100%',
              }),
              children: [
                { type: 'text' as const, content: quote, styles: styleSet({ fontSize: '17px', lineHeight: '1.55' }) },
                {
                  type: 'row' as const,
                  styles: styleSet({ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }),
                  children: [
                    img({ width: '40px', height: '40px', borderRadius: '999px', flexShrink: '0' }),
                    {
                      type: 'stack' as const,
                      styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '1px' }),
                      children: [
                        { type: 'text' as const, content: name, styles: styleSet({ fontWeight: '600', fontSize: '15px' }) },
                        { type: 'text' as const, content: role, styles: styleSet({ fontSize: '14px', color: 'var(--c-muted)' }) },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        })),
      },
    ]),
  ]);

export const pricingSection = (): Blueprint =>
  sectionShell([
    inner([
      {
        type: 'container',
        styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '620px' }),
        children: [eyebrow('Pricing'), h(2, 'Simple, honest pricing'), p('No seat minimums. Cancel any time.', { color: 'var(--c-muted)' })],
      },
      {
        type: 'columns',
        styles: styleSet(
          { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '20px', width: '100%', marginTop: '28px', alignItems: 'stretch' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
        ),
        children: [
          ['Starter', '$0', ['One project', 'Community support', 'Editor access']],
          ['Studio', '$29', ['Unlimited projects', 'Custom domains', 'Version history']],
          ['Agency', '$89', ['Everything in Studio', 'Client handoff', 'Priority support']],
        ].map(([plan, price, feats]) => ({
          type: 'column' as const,
          styles: styleSet({ display: 'flex', minWidth: '0px' }),
          children: [
            {
              type: 'pricingCard' as const,
              styles: styleSet({
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                padding: '30px',
                border: '1px solid var(--c-border)',
                borderRadius: '14px',
                width: '100%',
              }),
              children: [
                { type: 'text' as const, content: plan as string, styles: styleSet({ fontSize: '14px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--c-muted)' }) },
                { type: 'heading' as const, content: price as string, textStyle: 'h2', settings: { level: 3 }, styles: styleSet({ fontSize: '42px' }) },
                {
                  type: 'featureList' as const,
                  styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '9px', marginTop: '2px' }),
                  children: (feats as string[]).map((t) => ({
                    type: 'featureItem' as const,
                    content: t,
                    settings: { icon: 'check' },
                    styles: styleSet({ display: 'flex', gap: '9px', alignItems: 'flex-start', fontSize: '15px' }),
                  })),
                },
                { ...btn('Choose plan', plan === 'Studio' ? 'primary' : 'secondary'), styles: styleSet({ marginTop: 'auto' }) },
              ],
            },
          ],
        })),
      },
    ]),
  ]);

export const faqSection = (): Blueprint =>
  sectionShell([
    inner([
      h(2, 'Frequently asked'),
      {
        type: 'faq',
        styles: styleSet({ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '760px', marginTop: '16px' }),
        children: [
          ['How long does a project take?', 'Most marketing sites run four to six weeks from kickoff to launch.'],
          ['Can I edit the site myself afterwards?', 'Yes. Everything stays editable in the visual editor, no code required.'],
          ['Do you handle hosting?', 'We can, or we hand off clean HTML and CSS you can host anywhere.'],
          ['What if I need changes later?', 'Retainers are available, but most clients handle updates themselves.'],
        ].map(([q, a]) => ({
          type: 'accordionItem' as const,
          content: q,
          settings: { open: false },
          children: [p(a, { color: 'var(--c-muted)' })],
        })),
      },
    ]),
  ]);

export const ctaSection = (): Blueprint =>
  sectionShell(
    [
      inner(
        [
          h(2, 'Ready to build something good?', { color: 'inherit', textAlign: 'center', maxWidth: '18ch' }),
          p('Start free. Upgrade when your site goes live.', { color: 'inherit', opacity: '0.78', textAlign: 'center' }),
          {
            type: 'row',
            styles: styleSet(
              { display: 'flex', flexDirection: 'row', gap: '12px', marginTop: '10px' },
              {},
              { flexDirection: 'column', width: '100%' },
            ),
            children: [
              { ...btn('Start free'), styles: styleSet({ backgroundColor: 'var(--c-background)', color: 'var(--c-text)' }) },
              { ...btn('Talk to us', 'secondary'), styles: styleSet({ color: 'inherit', borderColor: 'currentColor' }) },
            ],
          },
        ],
        { alignItems: 'center', maxWidth: '680px' },
      ),
    ],
    { backgroundColor: 'var(--c-secondary)', color: '#ffffff' },
  );

export const contactSection = (): Blueprint =>
  sectionShell([
    inner([
      {
        type: 'columns',
        styles: styleSet(
          { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '56px', width: '100%' },
          { gap: '32px' },
          { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: '28px' },
        ),
        children: [
          {
            type: 'column',
            styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '0px' }),
            children: [
              eyebrow('Contact'),
              h(2, 'Tell us about your project'),
              p('We reply to every enquiry within one business day.', { color: 'var(--c-muted)' }),
            ],
          },
          {
            type: 'column',
            styles: styleSet({ display: 'flex', minWidth: '0px' }),
            children: [
              {
                type: 'form',
                name: 'Contact form',
                settings: { action: '', method: 'POST', successMessage: 'Thanks — we’ll be in touch shortly.' },
                styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }),
                children: [
                  { type: 'input', settings: { label: 'Name', name: 'name', placeholder: 'Your name', inputType: 'text', required: true } },
                  { type: 'input', settings: { label: 'Email', name: 'email', placeholder: 'you@company.com', inputType: 'email', required: true } },
                  { type: 'select', settings: { label: 'Budget', name: 'budget', options: ['Under $5k', '$5k – $20k', '$20k+'] } },
                  { type: 'textarea', settings: { label: 'Project details', name: 'message', placeholder: 'What are you building?', rows: 5 } },
                  { type: 'submit', content: 'Send enquiry', settings: { buttonStyle: 'primary' } },
                ],
              },
            ],
          },
        ],
      },
    ]),
  ]);

export const footerSection = (): Blueprint => ({
  type: 'section',
  name: 'Footer',
  settings: { tag: 'footer' },
  styles: styleSet(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      paddingTop: '56px',
      paddingBottom: '56px',
      paddingLeft: '32px',
      paddingRight: '32px',
      borderTop: '1px solid var(--c-border)',
      backgroundColor: 'var(--c-background)',
    },
    {},
    { paddingLeft: '20px', paddingRight: '20px' },
  ),
  children: [
    inner(
      [
        {
          type: 'row',
          name: 'Footer row',
          styles: styleSet(
            { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '24px' },
            {},
            { flexDirection: 'column', alignItems: 'flex-start', gap: '20px' },
          ),
          children: [
            { type: 'logo', content: 'Studio', settings: { mode: 'text', src: '' }, styles: styleSet({ fontSize: '18px', fontWeight: '650' }), link: { kind: 'none' } },
            {
              type: 'navLinks',
              styles: styleSet({ display: 'flex', flexDirection: 'row', gap: '24px' }),
              children: ['Privacy', 'Terms', 'Careers'].map((t) => ({
                type: 'navLink' as const,
                content: t,
                textStyle: 'link',
                styles: styleSet({ fontSize: '15px', color: 'var(--c-muted)' }),
                link: { kind: 'none' as const },
              })),
            },
            {
              type: 'socialLinks',
              settings: {
                size: 18,
                items: [
                  { network: 'x', url: 'https://x.com' },
                  { network: 'linkedin', url: 'https://linkedin.com' },
                  { network: 'instagram', url: 'https://instagram.com' },
                ],
              },
              styles: styleSet({ display: 'flex', flexDirection: 'row', gap: '14px', color: 'var(--c-muted)' }),
            },
          ],
        },
        {
          type: 'text',
          content: '© 2026 Studio. All rights reserved.',
          styles: styleSet({ fontSize: '14px', color: 'var(--c-muted)', marginTop: '28px' }),
        },
      ],
      { gap: '0px' },
    ),
  ],
});

export const SECTION_PRESETS: SectionPreset[] = [
  { id: 'hero', name: 'Hero', group: 'Above the fold', preview: 'hero', create: heroSection },
  { id: 'features', name: 'Features', group: 'Content', preview: 'cols3', create: featuresSection },
  { id: 'about', name: 'About', group: 'Content', preview: 'split', create: aboutSection },
  { id: 'gallery', name: 'Gallery', group: 'Content', preview: 'grid', create: gallerySection },
  { id: 'testimonials', name: 'Testimonials', group: 'Social proof', preview: 'cols3', create: testimonialsSection },
  { id: 'pricing', name: 'Pricing', group: 'Conversion', preview: 'cols3', create: pricingSection },
  { id: 'faq', name: 'FAQ', group: 'Content', preview: 'list', create: faqSection },
  { id: 'cta', name: 'Call to action', group: 'Conversion', preview: 'center', create: ctaSection },
  { id: 'contact', name: 'Contact', group: 'Conversion', preview: 'split', create: contactSection },
  { id: 'footer', name: 'Footer', group: 'Structure', preview: 'footer', create: footerSection },
];
