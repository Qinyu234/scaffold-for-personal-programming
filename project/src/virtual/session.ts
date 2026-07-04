/**
 * Create and pull Virtual File sessions.
 */

import * as path from 'path';
import { buildDefUseSlice, buildDefUseSliceWorkspace } from '../projection/def-use-slice';
import { layoutDefUseDocument } from './layout';
import { loadFoldState } from './fold-store';
import { VirtualSession } from './types';

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

export function pullSession(session: VirtualSession, workspaceRoot: string): VirtualSession {
  const collapsed = loadFoldState(workspaceRoot, session.scopeId);
  const document = layoutDefUseDocument(session.slice, session.sourceFilePath, collapsed);
  return {
    ...session,
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
  const document = layoutDefUseDocument(session.slice, session.sourceFilePath, collapsed);
  return {
    ...session,
    document,
    collapsedFunctions: collapsed,
  };
}
