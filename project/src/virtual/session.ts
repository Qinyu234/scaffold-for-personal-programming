/**
 * Create and pull Virtual File sessions.
 */

import * as path from 'path';
import { buildDefUseSlice, buildDefUseSliceWorkspace } from '../projection/def-use-slice';
import { buildDataFlowSlice } from '../projection/data-flow-slice';
import { buildEntryPointSlice } from '../projection/entry-point-slice';
import { buildEventFlowSlice } from '../projection/event-flow-slice';
import { buildImpactSlice } from '../projection/impact-slice';
import { buildStructureSlice } from '../projection/structure-slice';
import {
  layoutDataFlowDocument,
  layoutDefUseDocument,
  layoutEntryPointDocument,
  layoutEventFlowDocument,
  layoutImpactDocument,
  layoutStructureDocument,
} from './layout';
import { loadFoldState } from './fold-store';
import { VirtualSession } from './types';
import { mergeTraceOverlay } from '../analysis/trace-overlay';
import { buildTranslationDocument, TranslationRequest, TranslationTarget } from './translation';

function withTrace(slice: import('../projection/def-use-slice').ProjectionSlice, session: VirtualSession) {
  if (session.traceEvents && session.traceEvents.length > 0) {
    return mergeTraceOverlay(slice, session.traceEvents);
  }
  return slice;
}

function refreshSlice(session: VirtualSession, workspaceRoot: string) {
  if (session.viewType === 'def-use') {
    return (
      buildDefUseSliceWorkspace(session.sourceFilePath, session.scopeId, workspaceRoot) ??
      buildDefUseSlice(session.sourceFilePath, session.scopeId)
    );
  }
  if (session.viewType === 'data-flow') {
    return buildDataFlowSlice(session.sourceFilePath, session.scopeId);
  }
  if (session.viewType === 'entry-point') {
    return buildEntryPointSlice(session.sourceFilePath, session.scopeId);
  }
  if (session.viewType === 'event-flow') {
    return buildEventFlowSlice(session.sourceFilePath, session.scopeId);
  }
  if (session.viewType === 'impact') {
    return buildImpactSlice(session.sourceFilePath, session.scopeId);
  }
  if (session.viewType === 'structure') {
    return buildStructureSlice(session.sourceFilePath);
  }
  if (session.viewType === 'translation') {
    const parts = session.lineage.virtualUri.match(/lucid:\/\/translation\/([^/]+)\//);
    const targetLang = (parts?.[1] ?? 'cpp') as TranslationTarget;
    const req: TranslationRequest = {
      sourceFile: session.sourceFilePath,
      scopeId: session.scopeId,
      targetLang,
    };
    return {
      viewType: 'translation',
      scopeId: session.scopeId,
      spans: [],
    };
  }
  return session.slice;
}

export function relayoutSession(session: VirtualSession, workspaceRoot: string): VirtualSession {
  const collapsed = loadFoldState(workspaceRoot, session.scopeId);
  let slice = session.slice;
  if (session.viewType === 'translation') {
    const parts = session.lineage.virtualUri.match(/lucid:\/\/translation\/([^/]+)\//);
    const targetLang = (parts?.[1] ?? 'cpp') as TranslationTarget;
    const document = buildTranslationDocument({
      sourceFile: session.sourceFilePath,
      scopeId: session.scopeId,
      targetLang,
    });
    return { ...session, document, pulledSnapshot: document.text, collapsedFunctions: collapsed };
  }
  const document = layoutSessionDocument({ ...session, slice }, collapsed);
  return {
    ...session,
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
  };
}

export function createDefUseSession(
  sourceFilePath: string,
  stateName: string,
  workspaceRoot: string,
): VirtualSession | null {
  const slice =
    buildDefUseSliceWorkspace(sourceFilePath, stateName, workspaceRoot) ??
    buildDefUseSlice(sourceFilePath, stateName);
  if (!slice) {
    return null;
  }

  const collapsed = loadFoldState(workspaceRoot, stateName);
  const document = layoutDefUseDocument(slice, sourceFilePath, collapsed);

  return {
    viewType: 'def-use',
    scopeId: stateName,
    sourceFilePath: path.resolve(sourceFilePath),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
    selectedSegmentIds: new Set(),
    lineage: {
      virtualUri: `lucid://view/def-use/${stateName}`,
      sourceFile: path.resolve(sourceFilePath),
      viewType: 'def-use',
      scopeId: stateName,
    },
  };
}

function layoutSessionDocument(session: VirtualSession, collapsed: Set<string>) {
  if (session.viewType === 'data-flow') {
    return layoutDataFlowDocument(
      session.slice as import('../projection/data-flow-slice').DataFlowSlice,
      session.sourceFilePath,
      collapsed,
    );
  }
  if (session.viewType === 'entry-point') {
    return layoutEntryPointDocument(
      session.slice as import('../projection/entry-point-slice').EntryPointSlice,
      session.sourceFilePath,
      collapsed,
    );
  }
  if (session.viewType === 'event-flow') {
    return layoutEventFlowDocument(
      session.slice as import('../projection/event-flow-slice').EventFlowSlice,
      session.sourceFilePath,
      collapsed,
    );
  }
  if (session.viewType === 'impact') {
    return layoutImpactDocument(
      session.slice as import('../projection/impact-slice').ImpactSlice,
      session.sourceFilePath,
      collapsed,
    );
  }
  if (session.viewType === 'structure') {
    return layoutStructureDocument(
      session.slice as import('../projection/structure-slice').StructureSlice,
      session.sourceFilePath,
      collapsed,
    );
  }
  return layoutDefUseDocument(session.slice, session.sourceFilePath, collapsed);
}

export function createDataFlowSession(
  sourceFilePath: string,
  dataName: string,
  workspaceRoot: string,
): VirtualSession | null {
  const slice = buildDataFlowSlice(sourceFilePath, dataName);
  if (!slice) {
    return null;
  }

  const collapsed = loadFoldState(workspaceRoot, dataName);
  const document = layoutDataFlowDocument(slice, sourceFilePath, collapsed);

  return {
    viewType: 'data-flow',
    scopeId: dataName,
    sourceFilePath: path.resolve(sourceFilePath),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
    selectedSegmentIds: new Set(),
    lineage: {
      virtualUri: `lucid://view/data-flow/${dataName}`,
      sourceFile: path.resolve(sourceFilePath),
      viewType: 'data-flow',
      scopeId: dataName,
    },
  };
}

export function createImpactSession(
  sourceFilePath: string,
  stateName: string,
  workspaceRoot: string,
): VirtualSession | null {
  const slice = buildImpactSlice(sourceFilePath, stateName);
  if (!slice) {
    return null;
  }
  const collapsed = loadFoldState(workspaceRoot, stateName);
  const document = layoutImpactDocument(slice, sourceFilePath, collapsed);
  return {
    viewType: 'impact',
    scopeId: stateName,
    sourceFilePath: path.resolve(sourceFilePath),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
    selectedSegmentIds: new Set(),
    lineage: {
      virtualUri: `lucid://view/impact/${stateName}`,
      sourceFile: path.resolve(sourceFilePath),
      viewType: 'impact',
      scopeId: stateName,
    },
  };
}

export function createStructureSession(
  sourceFilePath: string,
  workspaceRoot: string,
): VirtualSession | null {
  const slice = buildStructureSlice(sourceFilePath);
  if (!slice) {
    return null;
  }
  const collapsed = loadFoldState(workspaceRoot, slice.scopeId);
  const document = layoutStructureDocument(slice, sourceFilePath, collapsed);
  return {
    viewType: 'structure',
    scopeId: slice.scopeId,
    sourceFilePath: path.resolve(sourceFilePath),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
    selectedSegmentIds: new Set(),
    lineage: {
      virtualUri: `lucid://view/structure/${slice.scopeId}`,
      sourceFile: path.resolve(sourceFilePath),
      viewType: 'structure',
      scopeId: slice.scopeId,
    },
  };
}

export function createEventFlowSession(
  sourceFilePath: string,
  stateName: string,
  workspaceRoot: string,
): VirtualSession | null {
  const slice = buildEventFlowSlice(sourceFilePath, stateName);
  if (!slice) {
    return null;
  }

  const collapsed = loadFoldState(workspaceRoot, stateName);
  const document = layoutEventFlowDocument(slice, sourceFilePath, collapsed);

  return {
    viewType: 'event-flow',
    scopeId: stateName,
    sourceFilePath: path.resolve(sourceFilePath),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
    selectedSegmentIds: new Set(),
    lineage: {
      virtualUri: `lucid://view/event-flow/${stateName}`,
      sourceFile: path.resolve(sourceFilePath),
      viewType: 'event-flow',
      scopeId: stateName,
    },
  };
}

export function createEntryPointSession(
  sourceFilePath: string,
  entryName: string,
  workspaceRoot: string,
): VirtualSession | null {
  const slice = buildEntryPointSlice(sourceFilePath, entryName);
  if (!slice) {
    return null;
  }

  const collapsed = loadFoldState(workspaceRoot, entryName);
  const document = layoutEntryPointDocument(slice, sourceFilePath, collapsed);

  return {
    viewType: 'entry-point',
    scopeId: entryName,
    sourceFilePath: path.resolve(sourceFilePath),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
    selectedSegmentIds: new Set(),
    lineage: {
      virtualUri: `lucid://view/entry-point/${entryName}`,
      sourceFile: path.resolve(sourceFilePath),
      viewType: 'entry-point',
      scopeId: entryName,
    },
  };
}

export function pullSession(session: VirtualSession, workspaceRoot: string): VirtualSession {
  const collapsed = loadFoldState(workspaceRoot, session.scopeId);
  const refreshed = refreshSlice(session, workspaceRoot);
  let slice = refreshed ?? session.slice;
  if (session.viewType === 'def-use' && refreshed) {
    slice = withTrace(refreshed, session);
  }
  const next = { ...session, slice };
  if (session.viewType === 'translation') {
    return relayoutSession(next, workspaceRoot);
  }
  const document = layoutSessionDocument(next, collapsed);
  return {
    ...next,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: collapsed,
  };
}

export function toggleFunctionFold(session: VirtualSession, functionName: string): VirtualSession {
  const collapsed = new Set(session.collapsedFunctions);
  if (collapsed.has(functionName)) {
    collapsed.delete(functionName);
  } else {
    collapsed.add(functionName);
  }
  const document = layoutSessionDocument(session, collapsed);
  return {
    ...session,
    document,
    collapsedFunctions: collapsed,
  };
}
