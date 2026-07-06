/**
 * Cytoscape graph spec from Lucid IR / Projection Slice.
 */

import * as path from 'path';
import { Contract } from '../analysis/contract';
import { contractToSpans, ProjectionSlice } from './def-use-slice';
import {
  DataFlowSlice,
  dataNodeId,
  dataTypeNodeId,
  spanNodeId,
} from './data-flow-slice';
import { EntryPointSlice, functionNodeId } from './entry-point-slice';
import {
  EventFlowSlice,
  siteNodeId,
  stateNodeId,
  triggerNodeId,
} from './event-flow-slice';
import { ImpactSlice, impactSiteNodeId, impactStateNodeId } from './impact-slice';
import { StructureSlice, depNodeId, moduleNodeId } from './structure-slice';

export interface GraphNode {
  id: string;
  label: string;
  kind: 'state' | 'write' | 'use' | 'trigger' | 'function' | 'module' | 'data' | 'import';
  /** Tier-1 cluster: absolute path when node maps to a workspace file. */
  filePath?: string;
  hop?: number;
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
  layout?: 'breadthfirst' | 'dagre';
  /** Tier-1 aggregation: 0 = full detail … 3 = focal only (+ count). */
  collapseLevel?: number;
  tier?: 'aggregation' | 'semantic';
}

export function graphFromEntryPointSlice(slice: EntryPointSlice): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (const name of slice.callOrder) {
    nodes.push({
      id: functionNodeId(name),
      label: name === slice.entryFunction ? `${name} (entry)` : name,
      kind: 'function',
    });
  }

  for (const edge of slice.edges) {
    edges.push({
      id: `e:${edge.caller}:${edge.callee}:${edge.callLine}`,
      source: functionNodeId(edge.caller),
      target: functionNodeId(edge.callee),
      label: 'calls',
    });
  }

  return {
    viewType: 'entry-point',
    scopeId: slice.scopeId,
    nodes,
    edges,
    layout: 'breadthfirst',
  };
}

export function graphFromEventFlowSlice(slice: EventFlowSlice): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const stId = stateNodeId(slice.stateName);

  nodes.push({ id: stId, label: slice.stateName, kind: 'state' });

  for (const span of slice.spans) {
    if (span.kind === 'define') {
      continue;
    }
    const nodeId =
      span.kind === 'trigger' ? triggerNodeId(span) : siteNodeId(span);
    if (!nodes.find(n => n.id === nodeId)) {
      const label =
        span.kind === 'trigger'
          ? `${span.event ?? 'event'} L${span.line}`
          : `${span.kind} L${span.line}`;
      nodes.push({
        id: nodeId,
        label,
        kind: span.kind === 'trigger' ? 'trigger' : span.kind,
      });
    }
  }

  for (const edge of slice.edges) {
    edges.push({
      id: `e:${edge.source}:${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    });
  }

  return {
    viewType: 'event-flow',
    scopeId: slice.scopeId,
    nodes,
    edges,
    layout: 'breadthfirst',
  };
}

export function graphFromImpactSlice(slice: ImpactSlice): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const stId = impactStateNodeId(slice.stateName);
  nodes.push({ id: stId, label: slice.stateName, kind: 'state' });

  for (const span of slice.spans) {
    if (span.kind === 'define') {
      continue;
    }
    const nodeId = impactSiteNodeId(span);
    if (!nodes.find(n => n.id === nodeId)) {
      nodes.push({
        id: nodeId,
        label: `${span.kind} L${span.line}`,
        kind: span.kind === 'import' ? 'import' : span.kind,
      });
    }
  }

  for (const edge of slice.edges) {
    edges.push({
      id: `e:${edge.source}:${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    });
  }

  return { viewType: 'impact', scopeId: slice.scopeId, nodes, edges, layout: 'breadthfirst' };
}

export function graphFromStructureSlice(slice: StructureSlice, collapseLevel = 0): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const modId = moduleNodeId(slice.moduleName);
  nodes.push({
    id: modId,
    label: slice.moduleName,
    kind: 'module',
    filePath: slice.focalFilePath,
    hop: 0,
  });

  for (const member of slice.members) {
    const dep = depNodeId(member.specifier);
    if (!nodes.find(n => n.id === dep)) {
      const baseLabel = member.filePath
        ? path.basename(member.filePath)
        : member.specifier;
      nodes.push({
        id: dep,
        label: baseLabel,
        kind: member.filePath ? 'module' : 'import',
        filePath: member.filePath ?? undefined,
        hop: member.hop,
      });
    }
  }

  for (const edge of slice.edges) {
    edges.push({
      id: `e:${edge.source}:${edge.target}`,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    });
  }

  return {
    viewType: 'structure',
    scopeId: slice.scopeId,
    nodes,
    edges,
    layout: 'breadthfirst',
    collapseLevel,
    tier: 'aggregation',
  };
}

export function graphFromDataFlowSlice(slice: DataFlowSlice): GraphSpec {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const typeId = dataTypeNodeId(slice.dataType);
  const dataId = dataNodeId(slice.scopeId);

  nodes.push({
    id: typeId,
    label: `${slice.dataType.label} (${slice.dataType.length})`,
    kind: 'data',
  });
  nodes.push({ id: dataId, label: slice.scopeId, kind: 'data' });
  edges.push({ id: `e:${typeId}:${dataId}`, source: typeId, target: dataId, label: 'interpret' });

  for (const span of slice.spans) {
    const nodeId = spanNodeId(span);
    if (!nodes.find(n => n.id === nodeId)) {
      nodes.push({
        id: nodeId,
        label: `${span.kind} L${span.line}`,
        kind: span.kind === 'write' ? 'write' : span.kind === 'use' ? 'use' : 'state',
      });
    }
    const edgeLabel = span.kind === 'write' ? 'mutate' : span.kind === 'use' ? 'read' : 'define';
    const source = span.kind === 'write' ? nodeId : dataId;
    const target = span.kind === 'write' ? dataId : nodeId;
    edges.push({
      id: `e:${source}:${target}:${span.kind}`,
      source,
      target,
      label: edgeLabel,
    });
  }

  return { viewType: 'data-flow', scopeId: slice.scopeId, nodes, edges };
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
