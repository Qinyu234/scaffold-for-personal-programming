/**
 * Def-Use View: filter IR to one state, cut spans for Projection Slice.
 */

import { analyzeFile } from '../core/analyze';
import { buildContractsWorkspace } from '../analysis/contract';
import { Contract } from '../analysis/contract';
import { SourceSpan } from '../analysis/span';

export interface ProjectionSlice {
  viewType: string;
  scopeId: string;
  spans: SourceSpan[];
}

export function contractToSpans(contract: Contract, filePath: string): SourceSpan[] {
  const spans: SourceSpan[] = [];

  spans.push({
    file: contract.definedAt.file,
    line: contract.definedAt.line,
    column: contract.definedAt.column,
    enclosingFunction: '<module>',
    kind: 'define',
    variableName: contract.variableName,
  });

  for (const ws of contract.writeSites) {
    spans.push({
      file: ws.file,
      line: ws.line,
      column: ws.column,
      enclosingFunction: ws.enclosingFunction,
      kind: 'write',
      variableName: ws.variableName,
    });
  }

  for (const us of contract.useSites) {
    spans.push({
      file: us.file,
      line: us.line,
      column: us.column,
      enclosingFunction: us.enclosingFunction,
      kind: 'use',
      variableName: us.variableName,
    });
  }

  for (const tr of contract.triggeredBy) {
    spans.push({
      file: filePath,
      line: tr.line,
      column: 0,
      enclosingFunction: '<module>',
      kind: 'trigger',
      variableName: contract.variableName,
      event: tr.event,
    });
  }

  return spans;
}

export function buildDefUseSlice(filePath: string, stateName: string): ProjectionSlice | null {
  const contracts = analyzeFile(filePath, stateName);
  if (contracts.length === 0) {
    return null;
  }
  return {
    viewType: 'def-use',
    scopeId: stateName,
    spans: contractToSpans(contracts[0], filePath),
  };
}

export function buildDefUseSliceWorkspace(
  filePath: string,
  stateName: string,
  workspaceRoot: string,
): ProjectionSlice | null {
  const contracts = buildContractsWorkspace(filePath, workspaceRoot).filter(
    c => c.variableName === stateName,
  );
  if (contracts.length === 0) {
    return null;
  }
  return {
    viewType: 'def-use',
    scopeId: stateName,
    spans: contractToSpans(contracts[0], filePath),
  };
}
