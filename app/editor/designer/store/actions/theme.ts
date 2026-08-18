import { deepClone, newId, styleSet } from '../../model/blueprint';
import type { Asset, Breakpoint, ColorToken } from '../../model/types';
import { getDoc, mutate } from '../docStore';
import { useEditor } from '../editorStore';

/* ---------------- colors ---------------- */

export function setColorToken(id: string, patch: Partial<ColorToken>) {
  mutate('Change brand color', (draft) => {
    const c = draft.theme.colors.find((x) => x.id === id);
    if (c) Object.assign(c, patch);
  }, { mergeKey: `color:${id}` });
}

export function addColorToken(name = 'New color', value = '#666666'): string {
  const id = newId('col');
  const varName = `c-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'custom'}-${id.slice(-4)}`;
  mutate('Add color', (draft) => {
    draft.theme.colors.push({ id, name, varName, value });
  });
  return id;
}

export function deleteColorToken(id: string) {
  const doc = getDoc();
  const token = doc.theme.colors.find((c) => c.id === id);
  if (!token) return;
  // Core tokens are referenced by the reset and element defaults.
  if (['c_primary', 'c_background', 'c_text', 'c_border', 'c_surface'].includes(id)) {
    useEditor.getState().toast('Core brand colors can be changed but not removed', 'error');
    return;
  }
  mutate('Delete color', (draft) => {
    draft.theme.colors = draft.theme.colors.filter((c) => c.id !== id);
  });
}

/* ---------------- typography ---------------- */

export function setTypographyStyle(
  styleId: string,
  patch: Record<string, string | undefined>,
  bp: Breakpoint,
  opts: { mergeKey?: string } = {},
) {
  mutate('Change text style', (draft) => {
    const t = draft.theme.typography.find((x) => x.id === styleId);
    if (!t) return;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') delete t.styles[bp][k];
      else t.styles[bp][k] = v;
    }
  }, { mergeKey: opts.mergeKey });
}

export function clearTypographyOverride(styleId: string, props: string[], bp: Breakpoint) {
  mutate('Reset text style override', (draft) => {
    const t = draft.theme.typography.find((x) => x.id === styleId);
    if (!t) return;
    for (const p of props) delete t.styles[bp][p];
  });
}

export function setFontFamily(role: 'heading' | 'body' | 'mono', value: string) {
  mutate('Change font', (draft) => {
    draft.theme.fontFamilies[role] = value;
  });
}

/* ---------------- buttons ---------------- */

export function setButtonStyle(
  buttonId: string,
  patch: Record<string, string | undefined>,
  bp: Breakpoint,
  opts: { mergeKey?: string } = {},
) {
  mutate('Change button style', (draft) => {
    const b = draft.theme.buttons.find((x) => x.id === buttonId);
    if (!b) return;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') delete b.styles[bp][k];
      else b.styles[bp][k] = v;
    }
  }, { mergeKey: opts.mergeKey });
}

export function setButtonHover(buttonId: string, patch: Record<string, string | undefined>) {
  mutate('Change button hover', (draft) => {
    const b = draft.theme.buttons.find((x) => x.id === buttonId);
    if (!b) return;
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') delete b.hover[k];
      else b.hover[k] = v;
    }
  }, { mergeKey: `btnhover:${buttonId}` });
}

export function addButtonStyle(name = 'New button'): string {
  const id = newId('btn');
  mutate('Add button style', (draft) => {
    const base = draft.theme.buttons[0];
    draft.theme.buttons.push({
      id,
      name,
      styles: base ? deepClone(base.styles) : styleSet({}),
      hover: {},
    });
  });
  return id;
}

/* ---------------- scale tokens ---------------- */

export function setToken(kind: 'radii' | 'shadows' | 'spacing', id: string, patch: { name?: string; value?: string }) {
  mutate('Change token', (draft) => {
    const t = draft.theme[kind].find((x) => x.id === id);
    if (t) Object.assign(t, patch);
  }, { mergeKey: `token:${kind}:${id}` });
}

export function setContainerWidth(key: 'narrow' | 'normal' | 'wide' | 'full', value: string) {
  mutate('Change container width', (draft) => {
    draft.theme.containerWidths[key] = value;
  }, { mergeKey: `cw:${key}` });
}

export function setSiteCustomCss(css: string) {
  mutate('Edit custom CSS', (draft) => {
    draft.theme.customCss = css;
  }, { mergeKey: 'siteCss' });
}

/* ---------------- assets ---------------- */

export function addAsset(asset: Omit<Asset, 'id' | 'createdAt'>): string {
  const id = newId('a');
  mutate('Add asset', (draft) => {
    draft.assets[id] = { ...asset, id, createdAt: Date.now() };
  });
  return id;
}

export function deleteAsset(id: string) {
  mutate('Delete asset', (draft) => {
    delete draft.assets[id];
  });
}

export function renameAsset(id: string, name: string) {
  mutate('Rename asset', (draft) => {
    const a = draft.assets[id];
    if (a) a.name = name;
  });
}
