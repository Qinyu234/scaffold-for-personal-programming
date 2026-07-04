/**
 * Impact View: state change → downstream read/write sites (IR propagation).
 * scopeId = state variable name.
 */

import { analyzeFile } from '../core/analyze';
import { SourceSpan } from '../analysis/span';
import { contractToSpans, ProjectionSlice } from './def-use-slice';
import { detectLanguage } from '../ingestion/language';
import { buildPythonContracts } from '../analysis/python-contract';

export interface ImpactEdge {
  source: string;
  target: string;
  label: string;
}

export interface ImpactSlice extends ProjectionSlice {
  viewType: 'impact';
  stateName: string;
  edges: ImpactEdge[];
}

function isSupported(filePath: string): boolean {
  const lang = detectLanguage(filePath);
  return lang === 'typescript' || lang === 'python';
}

function orderImpactSpans(spans: SourceSpan[]): SourceSpan[] {
  const rank: Record<string, number> = { define: 0, write: 1, use: 2 };
  return [...spans].filter(s => s.kind !== 'trigger').sort((a, b) => {
    const dr = (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9);
    return dr !== 0 ? dr : a.line - b.line || a.column - b.column;
  });
}

function buildEdges(stateName: string, spans: SourceSpan[]): ImpactEdge[] {
  const stateId = `state:${stateName}`;
  const edges: ImpactEdge[] = [];
  for (const span of spans) {
    if (span.kind === 'write') {
      edges.push({
        source: stateId,
        target: `write:${span.line}:${span.column}`,
        label: 'mutates',
      });
    }
    if (span.kind === 'use') {
      edges.push({
        source: stateId,
        target: `use:${span.line}:${span.column}`,
        label: 'affects',
      });
    }
  }
  return edges;
}

export function buildImpactSlice(filePath: string, stateName: string): ImpactSlice | null {
  if (!isSupported(filePath)) {
    return null;
  }

  let spans: SourceSpan[];
  if (detectLanguage(filePath) === 'python') {
    const contract = buildPythonContracts(filePath).find(c => c.variableName === stateName);
    if (!contract) {
      return null;
    }
    spans = orderImpactSpans(contractToSpans(contract, filePath));
  } else {
    const contracts = analyzeFile(filePath, stateName);
    if (contracts.length === 0) {
      return null;
    }
    spans = orderImpactSpans(contractToSpans(contracts[0], filePath));
  }

  if (spans.length === 0) {
    return null;
  }

  return {
    viewType: 'impact',
    scopeId: stateName,
    stateName,
    spans,
    edges: buildEdges(stateName, spans),
  };
}

export function listImpactStates(filePath: string): string[] {
  if (!isSupported(filePath)) {
    return [];
  }
  if (detectLanguage(filePath) === 'python') {
    return buildPythonContracts(filePath)
      .filter(c => c.useSites.length > 0 || c.writeSites.length > 0)
      .map(c => c.variableName)
      .sort();
  }
  return analyzeFile(filePath)
    .filter(c => c.useSites.length > 0 || c.writeSites.length > 0)
    .map(c => c.variableName)
    .sort();
}

export function impactStateNodeId(stateName: string): string {
  return `state:${stateName}`;
}

export function impactSiteNodeId(span: SourceSpan): string {
  return `${span.kind}:${span.line}:${span.column}`;
}
