import { BREAKPOINT_MAX } from '../model/types';
import { CANVAS_CONTAINER, type QueryMode } from './css';

/**
 * Behavioural utilities shared by the editor canvas and exported sites:
 * mobile navigation, accordion, tabs and carousel. Kept tiny and generated
 * from the same breakpoint constants as everything else.
 */
export function runtimeCss(scope: string, mode: QueryMode): string {
  const mq = (max: number) =>
    mode === 'container' ? `@container ${CANVAS_CONTAINER} (max-width: ${max}px)` : `@media (max-width: ${max}px)`;

  return `
${scope} .dw-hamburger { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 6px; border: 1px solid var(--c-border); background: transparent; cursor: pointer; color: inherit; flex: none; }
/* Transparent wrapper: its children lay out as if it weren't there, until the
   mobile rules collapse it. */
${scope} .dw-collapsible { display: contents; }

${mq(BREAKPOINT_MAX.mobile!)} {
  ${scope} .dw-navbar[data-mobile-menu="hamburger"] .dw-hamburger { display: inline-flex; }
  ${scope} .dw-navbar[data-mobile-menu="hamburger"] > .dw-collapsible { display: none; }
  ${scope} .dw-navbar[data-mobile-menu="hamburger"][data-open="true"] { flex-wrap: wrap; }
  ${scope} .dw-navbar[data-mobile-menu="hamburger"][data-open="true"] > .dw-collapsible {
    display: flex; flex-direction: column; align-items: stretch; width: 100%; gap: 14px; padding-top: 18px;
  }
}

${scope} .dw-navbar[data-sticky="true"] { position: sticky; top: 0; z-index: 50; }
${scope} .dw-navbar[data-transparent="true"] { background: transparent; border-bottom-color: transparent; }

${scope} .dw-acc-item { border-bottom: 1px solid var(--c-border); }
${scope} .dw-acc-trigger { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; padding: 18px 0; background: none; border: none; text-align: left; cursor: pointer; font: inherit; color: inherit; font-size: 17px; font-weight: 550; }
${scope} .dw-acc-mark { flex: none; width: 14px; height: 14px; position: relative; opacity: 0.55; }
${scope} .dw-acc-mark::before, ${scope} .dw-acc-mark::after { content: ''; position: absolute; background: currentColor; border-radius: 1px; }
${scope} .dw-acc-mark::before { left: 0; right: 0; top: 6px; height: 2px; }
${scope} .dw-acc-mark::after { top: 0; bottom: 0; left: 6px; width: 2px; transition: transform 180ms ease; }
${scope} .dw-acc-item[data-open="true"] .dw-acc-mark::after { transform: scaleY(0); }
${scope} .dw-acc-panel { padding-bottom: 20px; }
${scope} .dw-acc-item[data-open="false"] .dw-acc-panel { display: none; }

${scope} .dw-tablist { display: flex; gap: 4px; border-bottom: 1px solid var(--c-border); margin-bottom: 22px; flex-wrap: wrap; }
${scope} .dw-tab { padding: 11px 15px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; cursor: pointer; font: inherit; font-size: 15px; font-weight: 550; color: var(--c-muted); }
${scope} .dw-tab[data-active="true"] { color: var(--c-text); border-bottom-color: var(--c-primary); }
${scope} .dw-tabpanel[data-active="false"] { display: none; }

${scope} .dw-carousel { position: relative; }
${scope} .dw-carousel-track { display: flex; overflow: hidden; }
${scope} .dw-carousel-slide { flex: 0 0 100%; min-width: 0; }
${scope} .dw-carousel-nav { position: absolute; top: 50%; transform: translateY(-50%); width: 38px; height: 38px; border-radius: 999px; border: 1px solid var(--c-border); background: var(--c-background); cursor: pointer; display: grid; place-items: center; color: var(--c-text); }
${scope} .dw-carousel-nav.prev { left: 10px; }
${scope} .dw-carousel-nav.next { right: 10px; }
${scope} .dw-carousel-dots { display: flex; gap: 7px; justify-content: center; margin-top: 16px; }
${scope} .dw-carousel-dot { width: 7px; height: 7px; border-radius: 999px; border: none; padding: 0; background: var(--c-border); cursor: pointer; }
${scope} .dw-carousel-dot[data-active="true"] { background: var(--c-primary); }

${scope} .dw-field { display: flex; flex-direction: column; gap: 7px; width: 100%; }
${scope} .dw-field > label { font-size: 14px; font-weight: 550; color: var(--c-text); }
${scope} .dw-field input, ${scope} .dw-field textarea, ${scope} .dw-field select {
  width: 100%; padding: 12px 13px; font: inherit; font-size: 16px; color: var(--c-text);
  background: var(--c-background); border: 1px solid var(--c-border); border-radius: 8px; outline: none;
}
${scope} .dw-field input:focus, ${scope} .dw-field textarea:focus, ${scope} .dw-field select:focus { border-color: var(--c-primary); }
${scope} .dw-field textarea { resize: vertical; min-height: 96px; }
${scope} .dw-choice { display: flex; align-items: center; gap: 9px; cursor: pointer; }
${scope} .dw-form-note { font-size: 15px; color: var(--c-primary); }

${scope} .dw-placeholder {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: repeating-linear-gradient(45deg, rgba(125,135,150,0.07) 0 10px, rgba(125,135,150,0.13) 10px 20px);
  border: 1px dashed var(--c-border); color: var(--c-muted); font-size: 13px; min-height: 60px; border-radius: inherit;
}
${scope} .dw-social { display: inline-flex; align-items: center; justify-content: center; }
${scope} .dw-breadcrumb-sep { opacity: 0.5; }
`.trim();
}
