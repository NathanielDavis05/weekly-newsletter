import type { Blueprint } from './blueprint';
import { styleSet } from './blueprint';
import { defaultTheme } from './theme';
import type { LinkTarget, Theme } from './types';

const CFA_ASSET_ROOT = 'https://newsletter.cfawestbryan.com/images';
const HERO_PATTERN = `${CFA_ASSET_ROOT}/food-pattern-red.png?v=20260726`;
const EVENTS_ICON = `${CFA_ASSET_ROOT}/weekly-events-icon.png`;
const REFERRAL_GIFT = `${CFA_ASSET_ROOT}/referral-gift.png`;

const text = (content: string, styles: Record<string, string> = {}): Blueprint => ({
  type: 'text',
  content,
  textStyle: 'body',
  styles: styleSet(styles),
});

const heading = (
  level: number,
  content: string,
  styles: Record<string, string> = {},
  mobile: Record<string, string> = {},
): Blueprint => ({
  type: 'heading',
  content,
  textStyle: `h${level}`,
  settings: { level },
  styles: styleSet(styles, {}, mobile),
});

const label = (content: string, color = 'var(--c-primary)'): Blueprint =>
  text(content, {
    color,
    fontSize: '13px',
    fontWeight: '700',
    letterSpacing: '0.12em',
    lineHeight: '1.2',
    textTransform: 'uppercase',
  });

const image = (
  src: string,
  alt: string,
  styles: Record<string, string>,
  mobile: Record<string, string> = {},
): Blueprint => ({
  type: 'image',
  name: alt,
  settings: { src, alt, objectFit: 'cover', objectPosition: 'center', loading: 'lazy' },
  styles: styleSet(styles, {}, mobile),
});

const icon = (name: string, styles: Record<string, string> = {}, size = 26): Blueprint => ({
  type: 'icon',
  settings: { icon: name, size },
  styles: styleSet(styles),
});

const button = (
  content: string,
  link: LinkTarget = { kind: 'none' },
  styles: Record<string, string> = {},
): Blueprint => ({
  type: 'button',
  content,
  settings: { buttonStyle: 'primary' },
  link,
  styles: styleSet(styles),
});

const divider = (color = 'var(--c-border)', extra: Record<string, string> = {}): Blueprint => ({
  type: 'divider',
  styles: styleSet({ width: '100%', height: '1px', backgroundColor: color, ...extra }),
});

const section = (
  name: string,
  children: Blueprint[],
  styles: Record<string, string> = {},
  mobile: Record<string, string> = {},
  tag = 'section',
  customId?: string,
): Blueprint => ({
  type: 'section',
  name,
  customId,
  settings: { tag },
  styles: styleSet(
    {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      paddingTop: '52px',
      paddingBottom: '52px',
      paddingLeft: '32px',
      paddingRight: '32px',
      ...styles,
    },
    {},
    {
      paddingTop: '34px',
      paddingBottom: '34px',
      paddingLeft: '20px',
      paddingRight: '20px',
      ...mobile,
    },
  ),
  children,
});

const container = (
  name: string,
  children: Blueprint[],
  styles: Record<string, string> = {},
  mobile: Record<string, string> = {},
): Blueprint => ({
  type: 'container',
  name,
  styles: styleSet(
    {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      maxWidth: '760px',
      ...styles,
    },
    {},
    mobile,
  ),
  children,
});

const iconBadge = (iconName: string, background: string, color: string, size = 28): Blueprint =>
  container(
    'Card icon',
    [icon(iconName, { color, flexShrink: '0' }, size)],
    {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: '0',
      width: '56px',
      height: '56px',
      backgroundColor: background,
      borderRadius: '999px',
    },
  );

const actionCard = (): Blueprint =>
  container(
    'Action required',
    [
      iconBadge('card', '#faedef', 'var(--c-secondary)', 30),
      container('Action copy', [
        label('Action required', '#647586'),
        heading(3, 'Fall seasonal items training', { fontSize: '20px', marginTop: '5px', marginBottom: '6px' }),
        text('All Front of House and Back of House team members: starts Monday, August 24.', {
          color: 'var(--c-muted)',
          fontSize: '16px',
          lineHeight: '1.5',
        }),
        text('Complete the Fall Promotion assignment in Pathway.', {
          color: 'var(--c-muted)',
          fontSize: '16px',
          lineHeight: '1.5',
          marginTop: '2px',
        }),
        button('Open Pathway training  →', { kind: 'url', url: 'https://newsletter.cfawestbryan.com/training' }, {
          color: 'var(--c-primary)',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '0px',
          paddingTop: '7px',
          paddingBottom: '0px',
          paddingLeft: '0px',
          paddingRight: '0px',
          fontWeight: '600',
          justifyContent: 'flex-start',
        }),
      ], { gap: '0px', maxWidth: 'none', minWidth: '0px' }),
    ],
    {
      display: 'grid',
      gridTemplateColumns: '56px minmax(0, 1fr)',
      alignItems: 'start',
      gap: '14px',
      maxWidth: '760px',
      paddingTop: '18px',
      paddingBottom: '18px',
      paddingLeft: '16px',
      paddingRight: '16px',
      backgroundColor: '#ffffff',
      borderTop: '4px solid var(--c-primary)',
      borderRight: '1px solid var(--c-border)',
      borderBottom: '1px solid var(--c-border)',
      borderLeft: '1px solid var(--c-border)',
      borderRadius: '18px',
      boxShadow: '0 4px 16px rgba(13, 34, 56, 0.04)',
    },
  );

const priorityCard = (
  name: string,
  labelText: string,
  title: string,
  body: string,
  badge: Blueprint,
  link: LinkTarget,
): Blueprint =>
  container(
    name,
    [
      badge,
      container('Priority copy', [
        label(labelText, '#647586'),
        heading(3, title, { fontSize: '20px', marginTop: '5px', marginBottom: '5px' }),
        text(body, { color: 'var(--c-muted)', fontSize: '16px', lineHeight: '1.45' }),
      ], { gap: '0px', maxWidth: 'none', minWidth: '0px' }),
      button('→', link, {
        alignSelf: 'center',
        color: 'var(--c-secondary)',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '0px',
        padding: '0px',
        fontSize: '24px',
        lineHeight: '1',
      }),
    ],
    {
      display: 'grid',
      gridTemplateColumns: '56px minmax(0, 1fr) 16px',
      alignItems: 'center',
      gap: '14px',
      maxWidth: '760px',
      minHeight: '108px',
      paddingTop: '16px',
      paddingBottom: '16px',
      paddingLeft: '16px',
      paddingRight: '16px',
      backgroundColor: '#ffffff',
      border: '1px solid var(--c-border)',
      borderRadius: '18px',
      boxShadow: '0 4px 16px rgba(13, 34, 56, 0.04)',
    },
  );

const celebrationCard = (title: string, entries: [string, string][]): Blueprint =>
  container(
    title,
    [
      label(title, '#647586'),
      ...entries.flatMap(([name, detail], index) => [
        container('Celebration', [
          heading(3, name, { fontSize: '16px', marginBottom: '3px' }),
          text(detail, { color: 'var(--c-muted)', fontSize: '15px' }),
        ], { gap: '0px', maxWidth: 'none' }),
        ...(index < entries.length - 1 ? [divider('#eadfd3', { marginTop: '14px', marginBottom: '14px' })] : []),
      ]),
    ],
    {
      gap: '14px',
      minHeight: '170px',
      padding: '18px',
      maxWidth: 'none',
      backgroundColor: 'rgba(255, 253, 248, 0.72)',
      border: '1px solid #edd5bd',
      borderRadius: '18px',
    },
  );

const eventRow = (date: string, event: string, featured = false): Blueprint =>
  container(
    event,
    [
      text(date, { color: featured ? 'var(--c-primary)' : 'var(--c-muted)', fontSize: '13px', fontWeight: '600' }),
      text(event, { color: featured ? 'var(--c-secondary)' : 'var(--c-text)', fontSize: '15px', fontWeight: featured ? '700' : '500' }),
    ],
    {
      display: 'grid',
      gridTemplateColumns: '88px minmax(0, 1fr)',
      alignItems: 'center',
      gap: '10px',
      minHeight: '56px',
      paddingTop: '13px',
      paddingBottom: '13px',
      paddingLeft: '16px',
      paddingRight: '16px',
      maxWidth: 'none',
      backgroundColor: featured ? 'var(--c-surface)' : '#ffffff',
      borderBottom: '1px solid #eae3d9',
    },
    { gridTemplateColumns: '80px minmax(0, 1fr)' },
  );

/**
 * A faithful structured recreation of the CFA West Bryan weekly newsletter.
 * It is assembled only from ordinary editor elements, so the layout, words,
 * live links, graphics, colors and mobile rules all remain editable after the
 * template is inserted.
 */
export function newsletterTemplate(): Blueprint[] {
  return [
    section(
      'CFA masthead',
      [
        image(HERO_PATTERN, 'CFA red food pattern', {
          position: 'absolute',
          inset: '0px',
          width: '100%',
          height: '100%',
          opacity: '0.68',
          pointerEvents: 'none',
        }),
        container('Masthead content', [
          {
            type: 'row',
            name: 'Masthead top row',
            styles: styleSet(
              {
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '18px',
                width: '100%',
              },
              {},
              { alignItems: 'flex-start' },
            ),
            children: [
              container('CFA brand', [
                {
                  type: 'logo',
                  name: 'CFA West Bryan',
                  content: 'CFA West Bryan',
                  settings: { mode: 'text', src: '' },
                  styles: styleSet({ color: '#ffffff', fontSize: '30px', fontWeight: '700', lineHeight: '1.05' }, {}, { fontSize: '22px' }),
                  link: { kind: 'none' },
                },
                label('Team newsletter', '#ffffff'),
              ], { gap: '4px', maxWidth: 'none' }),
              container('Menu button', [icon('menu', { color: '#ffffff' }, 19)], {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                border: '1px solid rgba(255,255,255,0.45)',
                borderRadius: '8px',
                maxWidth: '38px',
                flexShrink: '0',
              }),
            ],
          },
          container('Masthead copy', [
            label('Team update · Aug 17, 2026', '#ffffff'),
            heading(1, 'Overview of the Week', {
              color: '#ffffff',
              fontSize: '54px',
              fontWeight: '700',
              letterSpacing: '-0.035em',
              lineHeight: '1.02',
              marginTop: '7px',
            }, { fontSize: '40px' }),
          ], { gap: '0px', maxWidth: '720px', marginTop: '26px' }, { marginTop: '16px' }),
        ], {
          position: 'relative',
          zIndex: '1',
          maxWidth: '1080px',
          paddingTop: '20px',
          paddingBottom: '42px',
          paddingLeft: '38px',
          paddingRight: '38px',
        }, { paddingLeft: '20px', paddingRight: '20px', paddingBottom: '28px' }),
      ],
      {
        position: 'relative',
        overflow: 'hidden',
        minHeight: '250px',
        padding: '0px',
        backgroundColor: '#d80d37',
      },
      { minHeight: 'auto', padding: '0px' },
      'header',
      'top',
    ),

    section(
      'Overview and priorities',
      [
        container('Overview content', [
          actionCard(),
          priorityCard(
            'Upcoming event',
            'Tuesday–Wednesday',
            'New Student Conference (NSC)',
            'August 18–19',
            image(EVENTS_ICON, 'Calendar for New Student Conference', { width: '56px', height: '56px', borderRadius: '999px' }),
            { kind: 'section', sectionId: 'events' },
          ),
          priorityCard(
            'Customer shout-out',
            'Customer shout-out',
            'Ashley',
            'Mentioned in a guest comment this week',
            iconBadge('star', '#fff3d8', '#c98620', 27),
            { kind: 'section', sectionId: 'recognition' },
          ),
        ], { gap: '20px' }, { gap: '12px' }),
      ],
      { paddingTop: '30px', paddingBottom: '28px', backgroundColor: '#fbf7ef' },
      { paddingTop: '22px', paddingBottom: '20px' },
      'main',
      'action-required',
    ),

    section(
      'August scorecard',
      [
        container('Scorecard', [
          {
            type: 'columns',
            name: 'Scorecard summary',
            styles: styleSet(
              {
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.35fr) minmax(0, 0.65fr)',
                gap: '18px',
                width: '100%',
                alignItems: 'start',
              },
              {},
              { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))', gap: '14px' },
            ),
            children: [
              {
                type: 'column',
                styles: styleSet({ display: 'flex', flexDirection: 'column', gap: '0px', minWidth: '0px' }),
                children: [
                  label('August scorecard', '#4b8a72'),
                  heading(2, 'Guest experience', { fontSize: '32px', marginTop: '6px', marginBottom: '10px' }),
                  text('Guest feedback highlights clear opportunities in taste, fast service, order accuracy, and speed of service.', {
                    color: 'var(--c-secondary)',
                    fontSize: '17px',
                    lineHeight: '1.55',
                  }),
                ],
              },
              {
                type: 'column',
                styles: styleSet({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', minWidth: '0px' }),
                children: [
                  heading(2, '2', { fontSize: '60px', lineHeight: '0.95', color: 'var(--c-secondary)' }),
                  text('of 6 goals met', { color: 'var(--c-muted)', fontSize: '14px', fontWeight: '600' }),
                ],
              },
            ],
          },
          divider('#e4cfcf', { marginTop: '18px', marginBottom: '18px' }),
          label('Needs focus'),
          text('SOS (Total Time) · 3:33', { color: 'var(--c-primary)', fontSize: '16px', fontWeight: '700', marginTop: '8px' }),
          button('View August results', { kind: 'url', url: 'https://newsletter.cfawestbryan.com/results' }, {
            width: '100%',
            marginTop: '18px',
            backgroundColor: 'var(--c-secondary)',
            borderRadius: '12px',
            color: '#ffffff',
          }),
        ], {
          display: 'flex',
          flexDirection: 'column',
          gap: '0px',
          padding: '22px',
          backgroundImage: 'linear-gradient(145deg, #fffafa, #f8e8e7)',
          border: '1px solid #efc9c9',
          borderRadius: '22px',
          boxShadow: '0 12px 30px rgba(13, 34, 56, 0.08)',
        }),
      ],
      { paddingTop: '18px', paddingBottom: '54px', backgroundColor: '#fbf7ef' },
      { paddingTop: '14px', paddingBottom: '36px' },
      'section',
      'results',
    ),

    section(
      'Celebrations',
      [
        container('Celebrations content', [
          label('People make the place', '#c88620'),
          heading(2, 'Worth celebrating', { fontSize: '44px', marginTop: '8px', marginBottom: '22px' }, { fontSize: '34px' }),
          {
            type: 'columns',
            name: 'Celebration cards',
            styles: styleSet(
              { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px', width: '100%' },
              {},
              { gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' },
            ),
            children: [
              celebrationCard('Birthday', [['Fabian Canchola', 'August 17'], ['Aidan Plut', 'August 17']]),
              celebrationCard('Work anniversaries', [
                ['Ariana Aguilar — August 17', '1 year with CFA'],
                ['Esteban Duarte — August 19', '1 year with CFA'],
                ['Michelle van Rinsum — August 19', '1 year with CFA'],
              ]),
            ],
          },
          container('Guest recognition', [
            iconBadge('star', '#fff3d8', '#c98620', 27),
            container('Recognition copy', [
              heading(3, 'Shoutout from a Guest', { fontSize: '20px', marginBottom: '6px' }),
              text('Ashley was mentioned in a comment by a guest this week.', { color: 'var(--c-muted)', fontSize: '16px' }),
            ], { gap: '0px', maxWidth: 'none', minWidth: '0px' }),
          ], {
            display: 'grid',
            gridTemplateColumns: '56px minmax(0, 1fr)',
            alignItems: 'center',
            gap: '14px',
            padding: '18px',
            marginTop: '16px',
            backgroundColor: 'rgba(255,253,248,0.72)',
            border: '1px solid #edd5bd',
            borderRadius: '18px',
            maxWidth: 'none',
          }),
        ], { gap: '0px' }),
      ],
      { backgroundColor: '#fff6ed', paddingTop: '52px', paddingBottom: '52px' },
      { paddingTop: '36px', paddingBottom: '36px' },
      'section',
      'recognition',
    ),

    section(
      'Events',
      [
        container('Events content', [
          label('Plan ahead', '#c88620'),
          heading(2, 'What’s happening nearby', { fontSize: '44px', marginTop: '8px', marginBottom: '10px' }, { fontSize: '34px' }),
          text('Local events may bring extra traffic. Arrive ready and take care of one another.', {
            color: 'var(--c-muted)',
            fontSize: '17px',
            marginBottom: '22px',
          }),
          container('Event list', [
            eventRow('Aug 18–19', 'New Student Conference (NSC)', true),
            eventRow('Aug 18–22', 'BCS Classic @ Brazos County Expo'),
            eventRow('Aug 21', 'Maroon & White Night · 6 PM'),
            eventRow('Aug 21', 'Signature Member Tasting Event · 5–6 PM'),
            eventRow('Aug 22', 'TAMU Soccer v. Sam Houston · 8 PM'),
            eventRow('Aug 22', 'Sip & Shop Indoor Market 2026 · 10 AM–3 PM'),
          ], {
            gap: '0px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
            border: '1px solid var(--c-border)',
            borderRadius: '18px',
          }),
        ], { gap: '0px' }),
      ],
      { backgroundColor: '#fbf7ef', paddingTop: '52px', paddingBottom: '52px' },
      { paddingTop: '36px', paddingBottom: '36px' },
      'section',
      'events',
    ),

    section(
      'Leadership and referral',
      [
        container('Growth content', [
          container('Leadership card', [
            label('Grow with us', '#d3ef62'),
            heading(2, 'Interested in leadership?', { color: '#ffffff', fontSize: '32px', marginTop: '7px', marginBottom: '12px' }),
            text('Review the role and hour requirements, share your questions, and start a conversation with the leadership team.', {
              color: 'rgba(255,255,255,0.84)',
              fontSize: '17px',
              lineHeight: '1.55',
              maxWidth: '620px',
            }),
            button('View interest form', {
              kind: 'url',
              url: 'https://docs.google.com/forms/d/e/1FAIpQLScDaXKd52Bv2AMbXEJlszaiRcpihAoWcsJ9ZKbgN7MfJUx2bw/viewform',
            }, {
              width: 'fit-content',
              marginTop: '20px',
              backgroundColor: '#fbf7ef',
              color: 'var(--c-primary)',
              borderRadius: '12px',
            }),
          ], {
            gap: '0px',
            padding: '24px',
            backgroundColor: 'var(--c-secondary)',
            borderRadius: '22px',
          }),
          container('Referral bonus opportunity', [
            container('Referral badge', [
              image(REFERRAL_GIFT, 'Referral gift', { width: '42px', height: '42px', objectFit: 'contain' }),
            ], {
              position: 'absolute',
              top: '-34px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              padding: '0px',
              backgroundImage: 'linear-gradient(145deg, #ea633f, var(--c-primary))',
              border: '4px solid #fbf7ef',
              borderRadius: '999px',
              boxShadow: '0 8px 18px rgba(88, 18, 16, 0.28)',
              maxWidth: '64px',
            }),
            heading(3, '$200 Referral bonus opportunity:', { color: '#d3ef62', fontSize: '25px', textAlign: 'center', marginBottom: '10px' }, { fontSize: '21px' }),
            text('Know someone who would be a great fit? Ask a leader for current details.', {
              color: 'rgba(255,255,255,0.86)',
              fontSize: '16px',
              lineHeight: '1.5',
              textAlign: 'center',
              maxWidth: '560px',
            }),
          ], {
            position: 'relative',
            alignItems: 'center',
            gap: '0px',
            minHeight: '174px',
            marginTop: '54px',
            paddingTop: '48px',
            paddingBottom: '28px',
            paddingLeft: '32px',
            paddingRight: '32px',
            overflow: 'visible',
            backgroundImage: 'radial-gradient(circle, rgba(92,143,193,0.36) 1.2px, transparent 1.8px), linear-gradient(145deg, #102b46, #091c30)',
            backgroundSize: '16px 16px, auto',
            border: '1px solid #183c60',
            borderRadius: '22px',
            boxShadow: '0 12px 24px rgba(13,34,56,0.12)',
          }, { paddingLeft: '20px', paddingRight: '20px' }),
        ], { gap: '0px' }),
      ],
      { backgroundColor: '#fbf7ef', paddingTop: '52px', paddingBottom: '46px' },
      { paddingTop: '36px', paddingBottom: '32px' },
      'section',
      'grow',
    ),

    section(
      'CFA footer',
      [
        container('Footer content', [
          divider('rgba(13,34,56,0.16)'),
          {
            type: 'row',
            name: 'Footer row',
            styles: styleSet(
              {
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px',
                width: '100%',
                paddingTop: '28px',
              },
              {},
              { alignItems: 'flex-start' },
            ),
            children: [
              {
                type: 'logo',
                name: 'Footer brand',
                content: 'CFA West Bryan',
                settings: { mode: 'text', src: '' },
                styles: styleSet({ color: 'var(--c-secondary)', fontSize: '17px', fontWeight: '700' }),
                link: { kind: 'section', sectionId: 'top' },
              },
              text('Team newsletter · August 17, 2026', { color: 'var(--c-muted)', fontSize: '13px', textAlign: 'right' }),
            ],
          },
        ], { gap: '0px' }),
      ],
      { backgroundColor: '#fbf7ef', paddingTop: '0px', paddingBottom: '40px' },
      { paddingTop: '0px', paddingBottom: '30px' },
      'footer',
    ),
  ];
}

export function newsletterTheme(): Theme {
  const theme = defaultTheme();
  const colors: Record<string, string> = {
    'c-primary': '#bd1230',
    'c-secondary': '#0d2238',
    'c-accent': '#bf8219',
    'c-background': '#fbf7ef',
    'c-surface': '#f8e8e7',
    'c-text': '#0d2238',
    'c-muted': '#526477',
    'c-border': '#ddd4c7',
  };

  theme.colors = theme.colors.map((token) => ({ ...token, value: colors[token.varName] ?? token.value }));
  theme.fontFamilies = {
    ...theme.fontFamilies,
    heading: `'CFA Apercu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
    body: `'CFA Apercu', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`,
  };

  theme.typography = theme.typography.map((style) => {
    const next = { ...style, styles: styleSet(style.styles.base, style.styles.tablet, style.styles.mobile) };
    if (style.id.startsWith('h')) {
      next.styles.base.fontWeight = '700';
      next.styles.base.letterSpacing = '-0.02em';
    }
    if (style.id === 'body') next.styles.base.lineHeight = '1.5';
    return next;
  });

  const primary = theme.buttons.find((item) => item.id === 'primary');
  if (primary) {
    primary.styles.base.backgroundColor = 'var(--c-primary)';
    primary.styles.base.borderRadius = '12px';
    primary.styles.base.fontWeight = '600';
  }
  const secondary = theme.buttons.find((item) => item.id === 'secondary');
  if (secondary) secondary.styles.base.borderRadius = '12px';

  theme.containerWidths = { narrow: '620px', normal: '760px', wide: '1080px', full: '100%' };
  return theme;
}
