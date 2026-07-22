// Mounts the site theme as CSS custom properties.
//
// Server-safe (no "use client"): the editor canvas, the draft preview and the
// published newsletter all render this, which is what makes a theme change show
// up identically in all three. Text styles are consumed by the `rt-style--*`
// classes in globals.css rather than being inlined per element, so restyling a
// global style repaints every linked block without touching the document.

import type { SiteTheme } from "../content/theme";
import { themeToCssVars } from "../content/theme";

export function ThemeStyles({ theme, children }: { theme: SiteTheme; children: React.ReactNode }) {
  return (
    <div className="theme-root" style={themeToCssVars(theme) as React.CSSProperties}>
      {children}
    </div>
  );
}
