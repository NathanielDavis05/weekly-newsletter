import { useCallback, useMemo } from 'react';
import { styleInfo, type StyleOrigin } from '../../engine/styles';
import type { Breakpoint } from '../../model/types';
import { clearStyle, setStyle, setStyles } from '../../store/actions/elements';
import { useDoc } from '../../store/docStore';
import { useEditor } from '../../store/editorStore';

export interface StyleProp {
  value: string | undefined;
  origin: StyleOrigin;
  from?: Breakpoint;
  /** Selected elements disagree on this property. */
  mixed: boolean;
  viewport: Breakpoint;
  ids: string[];
  set: (value: string | undefined, opts?: { mergeKey?: string; label?: string }) => void;
  clear: () => void;
}

/** Reads one CSS property across the selection with full cascade context. */
export function useStyleProp(prop: string): StyleProp {
  const ids = useEditor((s) => s.selection);
  const viewport = useEditor((s) => s.viewport);
  const doc = useDoc((s) => s.doc);

  const info = useMemo(() => {
    const infos = ids.map((id) => {
      const node = doc.elements[id];
      return node ? styleInfo(node, prop, viewport, doc.theme) : null;
    });
    const present = infos.filter(Boolean) as ReturnType<typeof styleInfo>[];
    if (!present.length) return { value: undefined, origin: 'default' as StyleOrigin, mixed: false };
    const first = present[0];
    const mixed = present.some((i) => i.value !== first.value);
    return { ...first, mixed };
  }, [ids, prop, viewport, doc]);

  const set = useCallback(
    (value: string | undefined, opts?: { mergeKey?: string; label?: string }) => {
      setStyle(ids, prop, value, viewport, opts);
    },
    [ids, prop, viewport],
  );

  const clear = useCallback(() => clearStyle(ids, [prop], viewport), [ids, prop, viewport]);

  return { ...info, viewport, ids, set, clear };
}

/** Same idea for several properties edited together (e.g. padding shorthand). */
export function useStyleProps(props: string[]) {
  const ids = useEditor((s) => s.selection);
  const viewport = useEditor((s) => s.viewport);
  const doc = useDoc((s) => s.doc);
  const propsKey = props.join(',');

  const infos = useMemo(() => {
    const out: Record<string, ReturnType<typeof styleInfo>> = {};
    const node = ids.length ? doc.elements[ids[ids.length - 1]] : null;
    for (const p of propsKey ? propsKey.split(',') : []) {
      out[p] = node
        ? styleInfo(node, p, viewport, doc.theme)
        : { value: undefined, origin: 'default' };
    }
    return out;
  }, [ids, propsKey, viewport, doc]);

  const setMany = useCallback(
    (patch: Record<string, string | undefined>, opts?: { mergeKey?: string; label?: string }) => {
      setStyles(ids, patch, viewport, opts);
    },
    [ids, viewport],
  );

  const clearMany = useCallback((list: string[]) => clearStyle(ids, list, viewport), [ids, viewport]);

  return { infos, setMany, clearMany, viewport, ids };
}
