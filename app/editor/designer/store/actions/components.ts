import { cloneSubtree, deepClone, newId, subtreeIds } from '../../model/blueprint';
import { canContain } from '../../model/registry';
import type { ElementNode, SiteDoc } from '../../model/types';
import { getDoc, mutate } from '../docStore';
import { useEditor } from '../editorStore';
import { attach, detach, removeSubtree, type InsertTarget, defaultInsertTarget } from './elements';

/**
 * Components are stored as a master subtree living outside any page.
 * An `instance` element points at the definition and renders the master, so
 * editing the master propagates to every instance automatically — there is
 * no copying and therefore nothing to keep in sync.
 */

export function createComponentFrom(elementId: string, name: string): string | null {
  const doc = getDoc();
  const source = doc.elements[elementId];
  if (!source?.parent) return null;

  const compId = newId('c');
  const master = cloneSubtree(doc.elements, elementId, null);
  const instanceId = newId();

  mutate('Create component', (draft) => {
    Object.assign(draft.elements, master.nodes);
    draft.elements[master.rootId].isMaster = true;
    draft.elements[master.rootId].name = name;
    draft.components[compId] = { id: compId, name, rootId: master.rootId, createdAt: Date.now() };

    const node = draft.elements[elementId];
    const parentId = node.parent!;
    const index = draft.elements[parentId].children.indexOf(elementId);

    const instance: ElementNode = {
      id: instanceId,
      type: 'instance',
      name,
      parent: null,
      children: [],
      styles: { base: {}, tablet: {}, mobile: {} },
      settings: {},
      componentId: compId,
    };
    draft.elements[instanceId] = instance;
    removeSubtree(draft, elementId);
    attach(draft, instanceId, parentId, index);
  });

  useEditor.getState().setSelection([instanceId]);
  useEditor.getState().toast(`“${name}” is now a component`, 'success');
  return compId;
}

export function insertComponentInstance(componentId: string, target?: InsertTarget | null): string | null {
  const doc = getDoc();
  const comp = doc.components[componentId];
  if (!comp) return null;

  const t = target ?? defaultInsertTarget('instance');
  if (!t) return null;
  const parent = doc.elements[t.parentId];
  if (!parent || !canContain(parent.type, 'instance')) return null;

  const id = newId();
  mutate(`Add ${comp.name}`, (draft) => {
    draft.elements[id] = {
      id,
      type: 'instance',
      name: comp.name,
      parent: null,
      children: [],
      styles: { base: {}, tablet: {}, mobile: {} },
      settings: {},
      componentId,
    };
    attach(draft, id, t.parentId, t.index);
  });

  useEditor.getState().setSelection([id]);
  useEditor.getState().setFlash([id]);
  return id;
}

/** Turn an instance into a plain, independently editable copy. */
export function detachInstance(instanceId: string): string | null {
  const doc = getDoc();
  const inst = doc.elements[instanceId];
  if (!inst || inst.type !== 'instance' || !inst.componentId) return null;
  const comp = doc.components[inst.componentId];
  if (!comp) return null;

  const parentId = inst.parent;
  if (!parentId) return null;
  const index = doc.elements[parentId].children.indexOf(instanceId);
  const copy = cloneSubtree(doc.elements, comp.rootId, parentId);

  mutate('Detach component', (draft) => {
    Object.assign(draft.elements, copy.nodes);
    const root = draft.elements[copy.rootId];
    delete root.isMaster;
    // Instance-level styles (position in its parent, etc.) survive the detach.
    root.styles = {
      base: { ...root.styles.base, ...inst.styles.base },
      tablet: { ...root.styles.tablet, ...inst.styles.tablet },
      mobile: { ...root.styles.mobile, ...inst.styles.mobile },
    };
    removeSubtree(draft, instanceId);
    attach(draft, copy.rootId, parentId, index);
  });

  useEditor.getState().setSelection([copy.rootId]);
  useEditor.getState().toast('Component detached — this copy is now independent', 'info');
  return copy.rootId;
}

export function renameComponent(componentId: string, name: string) {
  mutate('Rename component', (draft) => {
    const c = draft.components[componentId];
    if (!c) return;
    c.name = name;
    const root = draft.elements[c.rootId];
    if (root) root.name = name;
    for (const el of Object.values(draft.elements)) {
      if (el.type === 'instance' && el.componentId === componentId) el.name = name;
    }
  });
}

export function deleteComponent(componentId: string) {
  const doc = getDoc();
  const comp = doc.components[componentId];
  if (!comp) return;
  const instances = Object.values(doc.elements).filter(
    (e) => e.type === 'instance' && e.componentId === componentId,
  );

  // Clones are built from plain state before the draft opens — cloning a
  // draft node is not safe.
  const replacements = instances.map((inst) => ({
    inst,
    copy: cloneSubtree(doc.elements, comp.rootId, inst.parent),
  }));

  mutate('Delete component', (draft) => {
    // Instances become real content rather than vanishing.
    for (const { inst, copy } of replacements) {
      const parentId = inst.parent;
      if (!parentId) continue;
      const index = draft.elements[parentId].children.indexOf(inst.id);
      Object.assign(draft.elements, copy.nodes);
      delete draft.elements[copy.rootId].isMaster;
      removeSubtree(draft, inst.id);
      attach(draft, copy.rootId, parentId, index);
    }
    for (const id of subtreeIds(draft.elements, comp.rootId)) delete draft.elements[id];
    delete draft.components[componentId];
  });
}

export function countInstances(doc: SiteDoc, componentId: string): number {
  let n = 0;
  for (const el of Object.values(doc.elements)) {
    if (el.type === 'instance' && el.componentId === componentId) n++;
  }
  return n;
}

/** The component whose master subtree contains `id`, if any. */
export function owningComponent(doc: SiteDoc, id: string): string | null {
  let cur: string | null = id;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    for (const comp of Object.values(doc.components)) {
      if (comp.rootId === cur) return comp.id;
    }
    cur = doc.elements[cur]?.parent ?? null;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Saved sections                                                      */
/* ------------------------------------------------------------------ */

export function saveSectionPreset(elementId: string, name: string) {
  const doc = getDoc();
  const node = doc.elements[elementId];
  if (!node) return;
  const nodes: Record<string, ElementNode> = {};
  for (const id of subtreeIds(doc.elements, elementId)) nodes[id] = deepClone(doc.elements[id]);
  nodes[elementId].parent = null;

  mutate('Save section', (draft) => {
    draft.savedSections.push({
      id: newId('ss'),
      name,
      elements: nodes,
      rootId: elementId,
      createdAt: Date.now(),
    });
  });
  useEditor.getState().toast(`Saved “${name}” to your sections`, 'success');
}

export function insertSavedSection(sectionId: string, target?: InsertTarget | null): string | null {
  const doc = getDoc();
  const saved = doc.savedSections.find((s) => s.id === sectionId);
  if (!saved) return null;
  const rootType = saved.elements[saved.rootId]?.type ?? 'section';
  const t = target ?? defaultInsertTarget(rootType);
  if (!t) return null;

  const copy = cloneSubtree(saved.elements, saved.rootId, t.parentId);
  mutate(`Add ${saved.name}`, (draft) => {
    Object.assign(draft.elements, copy.nodes);
    attach(draft, copy.rootId, t.parentId, t.index);
  });
  useEditor.getState().setSelection([copy.rootId]);
  useEditor.getState().setFlash([copy.rootId]);
  return copy.rootId;
}

export function deleteSavedSection(sectionId: string) {
  mutate('Delete saved section', (draft: SiteDoc) => {
    draft.savedSections = draft.savedSections.filter((s) => s.id !== sectionId);
  });
}

/** Move a section up or down within its page. */
export function moveSection(id: string, direction: 'up' | 'down') {
  const doc = getDoc();
  const node = doc.elements[id];
  if (!node?.parent) return;
  const parent = doc.elements[node.parent];
  const i = parent.children.indexOf(id);
  const target = direction === 'up' ? i - 1 : i + 1;
  if (target < 0 || target >= parent.children.length) return;

  mutate(direction === 'up' ? 'Move section up' : 'Move section down', (draft) => {
    const p = draft.elements[node.parent!];
    detach(draft, id);
    attach(draft, id, p.id, target);
  });
}
