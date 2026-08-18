import { useState } from 'react';
import { def, type InspectorGroup } from '../../model/registry';
import { BREAKPOINT_LABEL } from '../../model/types';
import { overriddenBreakpoints } from '../../engine/styles';
import { clearBreakpoint, renameElement } from '../../store/actions/elements';
import { createComponentFrom } from '../../store/actions/components';
import { useDoc } from '../../store/docStore';
import { useEditor, type InspectorTab } from '../../store/editorStore';
import { Icon, type IconName } from '../Icon';
import { Tooltip } from '../controls/Tooltip';
import { AdvancedPanel } from './AdvancedPanel';
import { InteractionsPanel } from './InteractionsPanel';
import {
  BackgroundSection,
  BorderSection,
  EffectsSection,
  GridChildSection,
  LayoutSection,
  PositionSection,
  SizeSection,
  SpacingSection,
  TypographySection,
  VisibilitySection,
} from './StyleSections';
import {
  ContentSection,
  EmbedSection,
  FormSection,
  IconSection,
  ImageSection,
  InstanceSection,
  LinkSection,
  MenuSection,
  NavSection,
  SectionSettings,
  VideoSection,
} from './SettingsSections';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'design', label: 'Design' },
  { id: 'settings', label: 'Settings' },
  { id: 'interactions', label: 'Motion' },
  { id: 'advanced', label: 'Advanced' },
];

export function Inspector() {
  const selection = useEditor((s) => s.selection);
  const tab = useEditor((s) => s.inspectorTab);
  const setTab = useEditor((s) => s.setInspectorTab);
  const viewport = useEditor((s) => s.viewport);
  const doc = useDoc((s) => s.doc);

  const id = selection[selection.length - 1];
  const node = id ? doc.elements[id] : null;

  if (!node) {
    return (
      <>
        <div className="panel-head">
          <span className="panel-title">Properties</span>
        </div>
        <div className="empty-note">
          <Icon name="target" size={22} style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 10 }}>Select an element on the canvas to edit it.</div>
          <div style={{ marginTop: 14, opacity: 0.75 }}>
            Click to select · double-click text to edit it in place · drag to move.
          </div>
        </div>
      </>
    );
  }

  const d = def(node.type);
  const groups = new Set<InspectorGroup>(d.inspector);
  const parent = node.parent ? doc.elements[node.parent] : null;
  const parentIsGrid =
    parent && (parent.styles.base.display?.includes('grid') || parent.type === 'columns' || parent.type === 'grid');

  const overrides = overriddenBreakpoints(node);
  const hasOverrideHere = viewport !== 'base' && node.styles[viewport] && Object.keys(node.styles[viewport]).length > 0;

  return (
    <>
      <InspectorHeader node={node} count={selection.length} />

      <div className="insp-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`insp-tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {viewport !== 'base' ? (
        <div className="bp-banner">
          <Icon name={viewport === 'tablet' ? 'tablet' : 'mobile'} size={12} />
          <span>
            Editing <strong>{BREAKPOINT_LABEL[viewport]}</strong> — changes here don’t affect wider screens
          </span>
          {hasOverrideHere ? (
            <button type="button" className="btn sm" onClick={() => clearBreakpoint(selection, viewport)}>
              Reset all
            </button>
          ) : null}
        </div>
      ) : overrides.length ? (
        <div className="bp-banner" style={{ background: 'rgba(77,141,255,0.08)', borderColor: 'rgba(77,141,255,0.2)', color: '#8fb6ff' }}>
          <Icon name="responsive" size={12} />
          <span>
            Has {overrides.map((b) => BREAKPOINT_LABEL[b]).join(' & ')} override{overrides.length > 1 ? 's' : ''}
          </span>
        </div>
      ) : null}

      <div className="panel-body">
        {tab === 'design' ? (
          <>
            {groups.has('layout') ? <LayoutSection /> : null}
            {parentIsGrid ? <GridChildSection /> : null}
            {groups.has('size') ? <SizeSection node={node} /> : null}
            {groups.has('spacing') ? <SpacingSection /> : null}
            {groups.has('typography') ? <TypographySection node={node} /> : null}
            {groups.has('background') ? <BackgroundSection /> : null}
            {groups.has('border') ? <BorderSection /> : null}
            {groups.has('effects') ? <EffectsSection /> : null}
            {groups.has('position') ? <PositionSection /> : null}
            <VisibilitySection node={node} />
          </>
        ) : null}

        {tab === 'settings' ? (
          <>
            {node.type === 'instance' ? <InstanceSection node={node} /> : null}
            {groups.has('content') ? <ContentSection node={node} /> : null}
            {groups.has('link') ? <LinkSection node={node} /> : null}
            {groups.has('image') ? <ImageSection node={node} /> : null}
            {groups.has('video') ? <VideoSection node={node} /> : null}
            {groups.has('icon') ? <IconSection node={node} /> : null}
            {groups.has('form') ? <FormSection node={node} /> : null}
            {groups.has('embed') ? <EmbedSection node={node} /> : null}
            {groups.has('menu') ? <MenuSection node={node} /> : null}
            {groups.has('nav') ? <NavSection node={node} /> : null}
            {groups.has('section') ? <SectionSettings node={node} /> : null}
            <ComponentActions nodeId={node.id} isInstance={node.type === 'instance'} />
          </>
        ) : null}

        {tab === 'interactions' ? <InteractionsPanel node={node} /> : null}
        {tab === 'advanced' ? <AdvancedPanel node={node} /> : null}
      </div>
    </>
  );
}

function InspectorHeader({ node, count }: { node: { id: string; type: string; name?: string; locked?: boolean }; count: number }) {
  const [renaming, setRenaming] = useState(false);
  const d = def(node.type as never);

  return (
    <div className="insp-head">
      <div className="insp-type">
        <Icon name={d.icon as IconName} size={14} style={{ color: 'var(--ui-text-faint)', flex: 'none' }} />
        {renaming ? (
          <input
            className="rename"
            autoFocus
            onFocus={(e) => e.target.select()}
            defaultValue={node.name ?? d.label}
            onBlur={(e) => {
              renameElement(node.id, e.target.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') setRenaming(false);
            }}
          />
        ) : (
          <button type="button" className="insp-name" onDoubleClick={() => setRenaming(true)} title="Double-click to rename">
            {node.name || d.label}
          </button>
        )}
      </div>
      {count > 1 ? <span className="badge-pill">{count} selected</span> : <span className="insp-kind">{d.label}</span>}
    </div>
  );
}

function ComponentActions({ nodeId, isInstance }: { nodeId: string; isInstance: boolean }) {
  const doc = useDoc((s) => s.doc);
  const node = doc.elements[nodeId];
  if (!node || isInstance || !node.parent) return null;

  return (
    <div style={{ padding: 8, borderTop: '1px solid var(--ui-border-soft)' }}>
      <Tooltip label="Reuse this across pages; editing the master updates every copy">
        <button
          type="button"
          className="btn outline block"
          onClick={() => {
            const name = window.prompt('Name this component', node.name || def(node.type).label);
            if (name) createComponentFrom(nodeId, name);
          }}
        >
          <Icon name="component" size={12} /> Create component
        </button>
      </Tooltip>
    </div>
  );
}
