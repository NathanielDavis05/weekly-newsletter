import type { CSSProperties } from 'react';

/**
 * One 16px stroke system for the whole editor. Consistent geometry matters
 * more than variety here — mismatched icon weights are the fastest way to
 * make a tool look amateur.
 */

const P = {
  /* chrome */
  undo: 'M3 8h7.5a3.5 3.5 0 0 1 0 7H8M3 8l3-3M3 8l3 3',
  redo: 'M13 8H5.5a3.5 3.5 0 0 0 0 7H8M13 8l-3-3M13 8l-3 3',
  eye: 'M1.5 8s2.4-4.2 6.5-4.2S14.5 8 14.5 8s-2.4 4.2-6.5 4.2S1.5 8 1.5 8Z|circle:8,8,1.8',
  eyeOff: 'M6.2 3.9A6.9 6.9 0 0 1 8 3.8c4.1 0 6.5 4.2 6.5 4.2a12 12 0 0 1-2 2.5M4 4.9A11.6 11.6 0 0 0 1.5 8S3.9 12.2 8 12.2a6.6 6.6 0 0 0 2.6-.5M2.5 2.5l11 11',
  play: 'M4.5 3.2v9.6l8-4.8Z',
  globe: 'circle:8,8,6|M2 8h12M8 2c1.8 2 1.8 10 0 12M8 2c-1.8 2-1.8 10 0 12',
  plus: 'M8 3.5v9M3.5 8h9',
  minus: 'M3.5 8h9',
  search: 'circle:7.2,7.2,4.2|M10.4 10.4 13.5 13.5',
  x: 'M4 4l8 8M12 4l-8 8',
  check: 'M3.5 8.5 6.5 11.5 12.5 4.8',
  trash: 'M3 4.5h10M6.2 4.5V3.2h3.6v1.3M4.4 4.5l.6 8.3h6l.6-8.3M6.6 6.8v3.8M9.4 6.8v3.8',
  copy: 'M5.5 5.5h7.2v7.2H5.5zM3.3 10.5V3.3h7.2',
  duplicate: 'M3.3 3.3h6.4v6.4H3.3zM6.3 12.7h6.4V6.3',
  lock: 'M4.2 7.3h7.6v5.5H4.2zM5.9 7.3V5.6a2.1 2.1 0 0 1 4.2 0v1.7',
  unlock: 'M4.2 7.3h7.6v5.5H4.2zM5.9 7.3V5.6a2.1 2.1 0 0 1 4.1-.5',
  more: 'circle:3.5,8,1|circle:8,8,1|circle:12.5,8,1',
  moreV: 'circle:8,3.5,1|circle:8,8,1|circle:8,12.5,1',
  settings: 'circle:8,8,2.1|M8 1.8v1.6M8 12.6v1.6M14.2 8h-1.6M3.4 8H1.8M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1M12.4 12.4l-1.1-1.1M4.7 4.7 3.6 3.6',
  code: 'M5.6 4.4 2 8l3.6 3.6M10.4 4.4 14 8l-3.6 3.6',
  chevronRight: 'M6.2 3.8 10.4 8l-4.2 4.2',
  chevronLeft: 'M9.8 3.8 5.6 8l4.2 4.2',
  chevronDown: 'M3.8 6.2 8 10.4l4.2-4.2',
  chevronUp: 'M3.8 9.8 8 5.6l4.2 4.2',
  arrowUp: 'M8 13V3M8 3 4.4 6.6M8 3l3.6 3.6',
  arrowDown: 'M8 3v10M8 13l-3.6-3.6M8 13l3.6-3.6',
  arrowLeft: 'M13 8H3M3 8l3.6-3.6M3 8l3.6 3.6',
  arrowRight: 'M3 8h10M13 8 9.4 4.4M13 8l-3.6 3.6',
  external: 'M12.5 8.8v3.7H3.5V3.5h3.7M9.6 3.5h2.9v2.9M7.2 8.8l5.3-5.3',
  refresh: 'M13 8a5 5 0 1 1-1.6-3.7M13 3v2.6h-2.6',
  history: 'M3 8a5 5 0 1 0 1.6-3.7M3 3v2.6h2.6M8 5.4V8l2 1.4',
  download: 'M8 2.5v7.8M8 10.3 5 7.3M8 10.3l3-3M3 12.4h10',
  upload: 'M8 10.3V2.5M8 2.5 5 5.5M8 2.5l3 3M3 12.4h10',
  save: 'M3.2 3.2h7.3l2.3 2.3v7.3H3.2zM5.6 3.2v3.4h4.2V3.2M5.6 12.8V9.4h4.8v3.4',
  grip: 'circle:6,4,0.9|circle:10,4,0.9|circle:6,8,0.9|circle:10,8,0.9|circle:6,12,0.9|circle:10,12,0.9',
  gripV: 'M6.5 3v10M9.5 3v10',
  reset: 'M3.4 8a4.6 4.6 0 1 1 1.4 3.3M3.4 5.2v2.9h2.9',
  warn: 'M8 2.6 14 13H2ZM8 6.6v3M8 11.1v.1',
  info: 'circle:8,8,6|M8 7.4v3.6M8 5.2v.1',

  /* devices */
  desktop: 'M2 3.4h12v7.2H2zM6 13h4M8 10.6V13',
  tablet: 'M4 2.4h8v11.2H4zM7.2 11.8h1.6',
  mobile: 'M5 2.4h6v11.2H5zM7.2 11.9h1.6',
  responsive: 'M1.8 4h8.4v6H1.8zM11.6 6.4h2.6v6.2h-2.6zM4.6 12.4h3',

  /* panels */
  add: 'M8 3.5v9M3.5 8h9|circle:8,8,6.3',
  pages: 'M3.4 2.6h6l3.2 3.2v7.6H3.4zM9.2 2.6v3.4h3.4',
  sectionsIcon: 'M2.4 2.8h11.2v3.4H2.4zM2.4 7.6h11.2v5.6H2.4z',
  layers: 'M8 2.4 14 5.6 8 8.8 2 5.6ZM2 8.8l6 3.2 6-3.2M2 11.6l6 3.2 6-3.2',
  component: 'M8 2.2 10.6 4.8 8 7.4 5.4 4.8ZM4.8 5.4 7.4 8l-2.6 2.6L2.2 8ZM11.2 5.4 13.8 8l-2.6 2.6L8.6 8ZM8 8.6l2.6 2.6L8 13.8l-2.6-2.6Z',
  assets: 'M2.4 3.4h11.2v9.2H2.4zM2.4 10l3.2-3 2.6 2.4 2.4-2.2 3 2.8|circle:5.8,6.2,1',
  palette: 'M8 2.2a5.8 5.8 0 0 0 0 11.6c.8 0 1.2-.5 1.2-1.1 0-.7-.6-1-.6-1.6 0-.5.4-.9 1-.9h1.2a3 3 0 0 0 3-3c0-2.8-2.6-5-5.8-5Z|circle:5.5,6.2,0.8|circle:8.4,5,0.8|circle:11,7,0.8',

  /* elements */
  text: 'M2.8 4.4h10.4M4.6 8h7.2M4.6 11.6h5',
  heading: 'M4 3.2v9.6M11 3.2v9.6M4 8h7',
  button: 'M2.4 5.4h11.2v5.2H2.4zM5.4 8h5.2',
  image: 'M2.4 3.4h11.2v9.2H2.4zM2.4 10.2l3-2.8 2.5 2.2 2.3-2 3.4 3.2|circle:5.6,6.1,1',
  video: 'M2.4 3.6h11.2v8.8H2.4zM6.6 6.2 10.4 8l-3.8 1.8Z',
  star: 'M8 2.4 9.7 6l4 .5-2.9 2.7.8 3.9L8 11.3l-3.6 1.8.8-3.9L2.3 6.5l4-.5Z',
  sparkle: 'M8 2.2 9.2 6.3 13.3 7.5 9.2 8.7 8 12.8 6.8 8.7 2.7 7.5 6.8 6.3ZM12.4 2.2l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5Z',
  divider: 'M2 8h12M4.6 4.4h6.8M4.6 11.6h6.8',
  spacer: 'M2.4 3.2h11.2M2.4 12.8h11.2M8 5.4v5.2M8 5.4 6.2 7.2M8 5.4l1.8 1.8M8 10.6 6.2 8.8M8 10.6l1.8-1.8',
  container: 'M2.4 2.8h11.2v10.4H2.4zM5 5.4h6v5.2H5z',
  section: 'M1.8 3.4h12.4v9.2H1.8zM1.8 6.2h12.4',
  stack: 'M3 3h10v2.6H3zM3 6.7h10v2.6H3zM3 10.4h10V13H3z',
  row: 'M3 3.4h2.8v9.2H3zM6.6 3.4h2.8v9.2H6.6zM10.2 3.4H13v9.2h-2.8z',
  column: 'M5.4 2.6h5.2v10.8H5.4z',
  columns: 'M2.4 3.4h3.4v9.2H2.4zM10.2 3.4h3.4v9.2h-3.4zM6.6 3.4h2.8v9.2H6.6z',
  grid: 'M2.4 2.8h4.4v4.4H2.4zM9.2 2.8h4.4v4.4H9.2zM2.4 8.8h4.4v4.4H2.4zM9.2 8.8h4.4v4.4H9.2z',
  flex: 'M1.8 3h12.4v10H1.8zM4.4 5.4h2.4v5.2H4.4zM9.2 5.4h2.4v5.2H9.2z',
  navbar: 'M1.8 3.2h12.4v3.4H1.8zM3.6 4.9h2.6M9,4.9h1.4M11.4 4.9h1.2M1.8 8.4h12.4v4.4H1.8z',
  menu: 'M2.6 4.6h10.8M2.6 8h10.8M2.6 11.4h10.8',
  logo: 'circle:5.4,8,2.6|M9.4 5.6h4M9.4 8h3M9.4 10.4h4',
  link: 'M6.6 9.4a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.9.9M9.4 6.6a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.9-.9',
  unlink: 'M6.6 9.4a2.6 2.6 0 0 0 2 .7M11.4 6.6a2.6 2.6 0 0 0-1.8-2.6M4.6 7.6l-.9.9a2.6 2.6 0 0 0 3.7 3.7l.9-.9M2.5 2.5l11 11',
  card: 'M2.4 3h11.2v10H2.4zM2.4 8h11.2M4.6 10.2h4.4',
  gallery: 'M2.2 3h5v4.4h-5zM8.8 3h5v4.4h-5zM2.2 8.6h5V13h-5zM8.8 8.6h5V13h-5z',
  carousel: 'M4.6 3.6h6.8v8.8H4.6zM2.2 5.8v6.4M13.8 5.8v6.4',
  accordion: 'M2.4 3h11.2v3H2.4zM2.4 7.4h11.2v3H2.4zM11 4.5h1M11 8.9h1M2.4 11.8h11.2',
  tabs: 'M2.2 5.2h3.6V3h4.4v2.2h3.6M2.2 5.2h11.6V13H2.2zM5.8 3h4.4v2.2H5.8z',
  quote: 'M3 9.4c0-3 1.6-4.6 3.6-5M3 9.4h2.8v3H3zM9 9.4c0-3 1.6-4.6 3.6-5M9 9.4h2.8v3H9z',
  list: 'M6 4.4h7.4M6 8h7.4M6 11.6h7.4|circle:3,4.4,1|circle:3,8,1|circle:3,11.6,1',
  price: 'M2.6 8.6 8.6 2.6l4.8.6.6 4.8-6 6ZM11 5v.1',
  stat: 'M2.6 12.8V9.2M6.2 12.8V4.6M9.8 12.8V7.2M13.4 12.8V2.8',
  help: 'circle:8,8,6|M6.4 6.4a1.7 1.7 0 1 1 2 1.8v1.1M8 11.6v.1',
  form: 'M2.6 2.8h10.8v10.4H2.6zM5 6h6M5 8.6h6M5 11h3',
  input: 'M2 5.8h12v4.4H2zM4.4 8h.1M6 6.8v2.4',
  textarea: 'M2 3.6h12v8.8H2zM4.2 6h7.6M4.2 8.4h7.6M4.2 10.8h4M12.4 12l1.6-1.6',
  checkbox: 'M3 3.4h10v9.2H3zM5.4 8 7.2 9.8 10.6 6.2',
  radio: 'circle:8,8,5.4|circle:8,8,2.2',
  select: 'M2 5.4h12v5.2H2zM11 7.4 12 8.6 13 7.4',
  send: 'M14 2 2 7.2l4.8 1.9L8.7 14Z',
  map: 'M2.6 4 6.4 2.6l3.2 1.4L13.4 2.6v9.4l-3.8 1.4-3.2-1.4L2.6 13.4ZM6.4 2.6v9.4M9.6 4v9.4',
  share: 'circle:4,8,2|circle:12,4.4,2|circle:12,11.6,2|M5.8 7 10.2 5M5.8 9l4.4 2',
  file: 'M3.6 2.6h5.2l3.6 3.6v7.2H3.6zM8.6 2.6v3.8h3.8',
  folder: 'M2.4 4h4l1.4 1.6h5.8v7.4H2.4z',
  home: 'M2.6 7.4 8 2.8l5.4 4.6v5.8H2.6ZM6.4 13.2V9.4h3.2v3.8',

  /* alignment */
  alignLeft: 'M3 3v10M5.4 5.6h7M5.4 10.4h4',
  alignCenterH: 'M8 3v10M4 5.6h8M5.6 10.4h4.8',
  alignRight: 'M13 3v10M3.6 5.6h7M6.6 10.4h4',
  alignTop: 'M3 3h10M5.6 5.4v7M10.4 5.4v4',
  alignMiddle: 'M3 8h10M5.6 4v8M10.4 5.6v4.8',
  alignBottom: 'M3 13h10M5.6 3.6v7M10.4 6.6v4',
  alignStretch: 'M3 3h10M3 13h10M6 5.4h4v5.2H6z',
  spaceBetween: 'M2.6 3v10M13.4 3v10M4.8 6h2.2v4H4.8zM9 6h2.2v4H9z',
  spaceAround: 'M2.6 3v10M13.4 3v10M5.4 6h1.8v4H5.4zM8.8 6h1.8v4H8.8z',

  /* text */
  bold: 'M4.6 3h4a2.5 2.5 0 0 1 0 5h-4zM4.6 8h4.6a2.5 2.5 0 0 1 0 5H4.6z',
  italic: 'M10.4 3H6.6M9.4 13H5.6M9.2 3 6.8 13',
  underline: 'M4.6 2.8v4.8a3.4 3.4 0 0 0 6.8 0V2.8M3.6 13.4h8.8',
  strike: 'M2.6 8h10.8M11.4 4.6C10.8 3.6 9.6 3 8 3 6 3 4.8 4 4.8 5.4c0 1 .6 1.8 2 2.3M4.8 10.6c.5 1.3 1.7 2 3.4 2 2 0 3.2-1 3.2-2.4 0-.8-.3-1.4-1-1.8',
  caseUpper: 'M2.4 12 5.4 4l3 8M3.4 9.6h4M9.6 12l2.4-6.4L14.4 12M10.4 10.2h3.2',
  lineHeight: 'M2.6 3.4h.1M2.6 8h.1M2.6 12.6h.1M5.4 3.4h8M5.4 8h8M5.4 12.6h8',
  letterSpacing: 'M2.4 3.6v8.8M13.6 3.6v8.8M5.6 10.2 8 5l2.4 5.2M6.4 8.6h3.2',
  maxWidth: 'M2.4 3.6v8.8M13.6 3.6v8.8M5 8h6M5 8l1.6-1.6M5 8l1.6 1.6M11 8 9.4 6.4M11 8l-1.6 1.6',

  /* misc editor */
  corner: 'M3 13V6.4A3.4 3.4 0 0 1 6.4 3H13',
  shadow: 'M2.6 2.6h7.6v7.6H2.6z|M5.8 12.8h7.4V5.6',
  opacity: 'circle:8,8,5.6|M8 2.4v11.2M10.4 3.6 4.4 12.6M12.4 5.6 5.6 12.8M13.4 8.6l-4 4',
  blur: 'circle:8,8,5.6|M8 2.6v.1M10.6 3.4v.1M12.6 5.4v.1M13.4 8v.1',
  overflow: 'M3 3h10v10H3zM6 6h9M6 6v9',
  position: 'circle:8,8,1.6|M8 1.8v2.6M8 11.6v2.6M1.8 8h2.6M11.6 8h2.6|M3 3h2v2H3zM11 11h2v2h-2z',
  zIndex: 'M2.6 5.6 8 2.8l5.4 2.8L8 8.4ZM2.6 8.8 8 11.6l5.4-2.8M2.6 11.4 8 14.2l5.4-2.8',
  gap: 'M2.4 3h4.2v10H2.4zM9.4 3h4.2v10H9.4zM8 4.6v6.8',
  padding: 'M2.4 2.6h11.2v10.8H2.4zM5 5.2h6v5.6H5z',
  wand: 'M11.4 2.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7ZM9 6.6 2.6 13M9 6.6l1.4 1.4L4 14.4 2.6 13Z',
  target: 'circle:8,8,5.6|circle:8,8,2.2|M8 1v1.4M8 13.6V15M1 8h1.4M13.6 8H15',
  frame: 'M4.4 1.8v12.4M11.6 1.8v12.4M1.8 4.4h12.4M1.8 11.6h12.4',
} as const;

export type IconName = keyof typeof P;

interface Props {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  fill?: boolean;
}

export function Icon({ name, size = 15, className, style, strokeWidth = 1.4, fill }: Props) {
  const raw = P[name] ?? P.info;
  const parts = raw.split('|');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {parts.map((part, i) => {
        if (part.startsWith('circle:')) {
          const [cx, cy, r] = part.slice(7).split(',').map(Number);
          return <circle key={i} cx={cx} cy={cy} r={r} />;
        }
        return <path key={i} d={part} fill={fill ? 'currentColor' : 'none'} />;
      })}
    </svg>
  );
}

/** Icons offered in the icon picker for `icon` elements and feature bullets. */
export const PICKABLE_ICONS: IconName[] = [
  'sparkle', 'star', 'check', 'heart' as IconName, 'target', 'wand', 'globe', 'send',
  'shield' as IconName, 'zap' as IconName, 'lock', 'search', 'settings', 'code',
  'layers', 'grid', 'image', 'video', 'map', 'share', 'help', 'info', 'stat', 'price',
  'file', 'folder', 'home', 'menu', 'link', 'refresh', 'history', 'download', 'upload',
].filter((n) => n in P) as IconName[];
