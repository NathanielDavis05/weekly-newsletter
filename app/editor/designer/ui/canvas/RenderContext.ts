import { createContext, useContext } from 'react';

export interface RenderCtx {
  mode: 'edit' | 'preview';
  /** Follow an internal link (preview mode). */
  navigate: (pageId: string) => void;
  /** Depth of component-master recursion, used to stop cycles. */
  instanceDepth: number;
}

/**
 * Deliberately does NOT carry the document. Context updates re-render every
 * consumer, and every element consumes this one — putting the doc here would
 * defeat the per-element memoization and re-render the whole page on each
 * style tweak. Components read the slices they need via store selectors.
 */
export const RenderContext = createContext<RenderCtx | null>(null);

export function useRender(): RenderCtx {
  const ctx = useContext(RenderContext);
  if (!ctx) throw new Error('RenderContext missing');
  return ctx;
}
