/**
 * Event Flow View (JS/TS): static event triggers → state → write/use sites.
 * scopeId = state variable name (DESIGN.md Phase 1).
 */

import { analyzeFile } from '../core/analyze';
import { SourceSpan } from '../analysis/span';
import { contractToSpans, ProjectionSlice } from './def-use-slice';
import { detectLanguage } from '../ingestion/language';

export interface EventFlowEdge {
  source: string;
  target: string;
  label: string;
}

export interface EventFlowSlice extends ProjectionSlice {
  viewType: 'event-flow';
  stateName: string;
  edges: EventFlowEdge[];
  flowOrder: Array<'define' | 'trigger' | 'write' | 'use'>;
}

function isJsFamily(filePath: string): boolean {
  return detectLanguage(filePath) === 'typescript';
}

function buildEdges(stateName: string, spans: SourceSpan[]): EventFlowEdge[] {
  const edges: EventFlowEdge[] = [];
  const stateId = `state:${stateName}`;

  for (const span of spans) {
    if (span.kind === 'trigger') {
      const triggerId = `trigger:${span.line}:${span.event ?? 'event'}`;
      edges.push({
        source: triggerId,
        target: stateId,
        label: span.event ?? 'event',
      });
    }
    if (span.kind === 'write') {
      edges.push({
        source: stateId,
        target: `write:${span.line}:${span.column}`,
        label: 'mutate',
      });
    }
    if (span.kind === 'use') {
      edges.push({
        source: stateId,
        target: `use:${span.line}:${span.column}`,
        label: 'read',
      });
    }
  }

  return edges;
}

function orderSpans(spans: SourceSpan[]): SourceSpan[] {
  const rank: Record<string, number> = { define: 0, trigger: 1, write: 2, use: 3 };
  return [...spans].sort((a, b) => {
    const dr = (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9);
    if (dr !== 0) {
      return dr;
    }
    return a.line - b.line || a.column - b.column;
  });
}

export function buildEventFlowSlice(filePath: string, stateName: string): EventFlowSlice | null {
  if (!isJsFamily(filePath)) {
    return null;
  }

  const contracts = analyzeFile(filePath, stateName);
  if (contracts.length === 0) {
    return null;
  }

  const contract = contracts[0];
  const spans = orderSpans(contractToSpans(contract, filePath));

  return {
    viewType: 'event-flow',
    scopeId: stateName,
    stateName,
    spans,
    edges: buildEdges(stateName, spans),
    flowOrder: ['define', 'trigger', 'write', 'use'],
  };
}

export function listEventFlowStates(filePath: string): string[] {
  if (!isJsFamily(filePath)) {
    return [];
  }
  const contracts = analyzeFile(filePath);
  return contracts
    .filter(c => c.writeSites.length > 0 || c.triggeredBy.length > 0)
    .map(c => c.variableName)
    .sort();
}

export function statesWithTriggers(filePath: string): string[] {
  return analyzeFile(filePath)
    .filter(c => c.triggeredBy.length > 0)
    .map(c => c.variableName)
    .sort();
}

export function triggerNodeId(span: SourceSpan): string {
  return `trigger:${span.line}:${span.event ?? 'event'}`;
}

export function stateNodeId(stateName: string): string {
  return `state:${stateName}`;
}

export function siteNodeId(span: SourceSpan): string {
  return `${span.kind}:${span.line}:${span.column}`;
}
