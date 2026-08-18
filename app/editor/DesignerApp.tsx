'use client';

import dynamic from 'next/dynamic';
import './designer/styles/app.css';

// Creating an editor document generates IDs. Keep that work entirely in the
// browser: Cloudflare Workers forbid crypto-backed random values during server
// module initialization.
const Designer = dynamic(
  () => import('./designer/ui/App').then((module) => module.App),
  { ssr: false },
);

/**
 * The full visual site designer, mounted inside the newsletter application.
 * Keeping it as a client component preserves its native canvas, drag/drop,
 * undo history, local autosave, and export behaviour.
 */
export function DesignerApp() {
  return <Designer />;
}
