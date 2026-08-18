'use client';

import './designer/styles/app.css';
import { App } from './designer/ui/App';

/**
 * The full visual site designer, mounted inside the newsletter application.
 * Keeping it as a client component preserves its native canvas, drag/drop,
 * undo history, local autosave, and export behaviour.
 */
export function DesignerApp() {
  return <App />;
}
