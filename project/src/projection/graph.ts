/**
 * Cytoscape graph spec from Lucid IR / Projection Slice.
 */

import { Contract } from '../analysis/contract';
import { contractToSpans, ProjectionSlice } from './def-use-slice';

export interface GraphNode {
  id: string;
  label: string;
  kind: 'state' | 'write' | 'use' | 'trigger' | 'function' | 'module' | 'data';
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface GraphSpec {
  viewType: string;
  scopeId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export function graphFromDefUseSlice(slice: ProjectionSlice): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const stateId = `state:${slice.scopeId}`;
  nodes.push({ id: stateId, label: slice.scopeId, kind: 'state' });

  for (const span of slice.spans) {
    const nodeId = `${span.kind}:${span.line}:${span.column}`;
    if (!nodes.find(n => n.id === nodeId)) {
      nodes.push({
        id: nodeId,
        label: `${span.kind} L${span.line}`,
        kind: span.kind as GraphNode['kind'],
      });
    }
    edges.push({
      id: `e:${stateId}:${nodeId}`,
      source: stateId,
      target: nodeId,
      label: span.enclosingFunction,
    });
  }

  return { viewType: slice.viewType, scopeId: slice.scopeId, nodes, edges };
}

export function graphFromContract(contract: Contract, filePath: string, viewType: string): GraphSpec {
  const slice: ProjectionSlice = {
    viewType,
    scopeId: contract.variableName,
    spans: contractToSpans(contract, filePath),
  };
  return graphFromDefUseSlice(slice);
}

export function graphEntryPointStub(scopeId: string): GraphSpec {
  return {
    viewType: 'entry-point',
    scopeId,
    nodes: [
      { id: 'entry', label: scopeId, kind: 'function' },
      { id: 'callee:1', label: 'callee…', kind: 'function' },
    ],
    edges: [{ id: 'e1', source: 'entry', target: 'callee:1', label: 'calls' }],
  };
}

export function graphImpactStub(scopeId: string): GraphSpec {
  return {
    viewType: 'impact',
    scopeId,
    nodes: [
      { id: 'change', label: scopeId, kind: 'state' },
      { id: 'impact:1', label: 'downstream', kind: 'use' },
    ],
    edges: [{ id: 'i1', source: 'change', target: 'impact:1', label: 'affects' }],
  };
}

export function graphStructureStub(scopeId: string): GraphSpec {
  return {
    viewType: 'structure',
    scopeId,
    nodes: [
      { id: 'mod', label: scopeId, kind: 'module' },
      { id: 'dep:1', label: 'import', kind: 'module' },
    ],
    edges: [{ id: 's1', source: 'mod', target: 'dep:1' }],
  };
}

export function graphEventFlowStub(scopeId: string): GraphSpec {
  return {
    viewType: 'event-flow',
    scopeId,
    nodes: [
      { id: 'ev', label: 'onClick', kind: 'trigger' },
      { id: 'st', label: scopeId, kind: 'state' },
    ],
    edges: [{ id: 'ef1', source: 'ev', target: 'st' }],
  };
}

export function graphDataFlowStub(scopeId: string): GraphSpec {
  return {
    viewType: 'data-flow',
    scopeId,
    nodes: [
      { id: 'data', label: scopeId, kind: 'data' },
      { id: 'type', label: 'int32', kind: 'data' },
    ],
    edges: [{ id: 'df1', source: 'type', target: 'data', label: 'interpret' }],
  };
}

export const VIEW_GRAPH_BUILDERS: Record<string, (scopeId: string) => GraphSpec> = {
  'entry-point': graphEntryPointStub,
  impact: graphImpactStub,
  structure: graphStructureStub,
  'event-flow': graphEventFlowStub,
  'data-flow': graphDataFlowStub,
};
