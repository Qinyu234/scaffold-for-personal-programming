"use strict";
/**
 * Cytoscape graph spec from Lucid IR / Projection Slice.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEW_GRAPH_BUILDERS = void 0;
exports.graphFromEntryPointSlice = graphFromEntryPointSlice;
exports.graphFromEventFlowSlice = graphFromEventFlowSlice;
exports.graphFromImpactSlice = graphFromImpactSlice;
exports.graphFromStructureSlice = graphFromStructureSlice;
exports.graphFromDataFlowSlice = graphFromDataFlowSlice;
exports.graphFromDefUseSlice = graphFromDefUseSlice;
exports.graphFromContract = graphFromContract;
exports.graphEntryPointStub = graphEntryPointStub;
exports.graphImpactStub = graphImpactStub;
exports.graphStructureStub = graphStructureStub;
exports.graphEventFlowStub = graphEventFlowStub;
exports.graphDataFlowStub = graphDataFlowStub;
const path = __importStar(require("path"));
const def_use_slice_1 = require("./def-use-slice");
const data_flow_slice_1 = require("./data-flow-slice");
const entry_point_slice_1 = require("./entry-point-slice");
const event_flow_slice_1 = require("./event-flow-slice");
const impact_slice_1 = require("./impact-slice");
const structure_slice_1 = require("./structure-slice");
function graphFromEntryPointSlice(slice) {
    const nodes = [];
    const edges = [];
    for (const name of slice.callOrder) {
        nodes.push({
            id: (0, entry_point_slice_1.functionNodeId)(name),
            label: name === slice.entryFunction ? `${name} (entry)` : name,
            kind: 'function',
        });
    }
    for (const edge of slice.edges) {
        edges.push({
            id: `e:${edge.caller}:${edge.callee}:${edge.callLine}`,
            source: (0, entry_point_slice_1.functionNodeId)(edge.caller),
            target: (0, entry_point_slice_1.functionNodeId)(edge.callee),
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
function graphFromEventFlowSlice(slice) {
    const nodes = [];
    const edges = [];
    const stId = (0, event_flow_slice_1.stateNodeId)(slice.stateName);
    nodes.push({ id: stId, label: slice.stateName, kind: 'state' });
    for (const span of slice.spans) {
        if (span.kind === 'define') {
            continue;
        }
        const nodeId = span.kind === 'trigger' ? (0, event_flow_slice_1.triggerNodeId)(span) : (0, event_flow_slice_1.siteNodeId)(span);
        if (!nodes.find(n => n.id === nodeId)) {
            const label = span.kind === 'trigger'
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
function graphFromImpactSlice(slice) {
    const nodes = [];
    const edges = [];
    const stId = (0, impact_slice_1.impactStateNodeId)(slice.stateName);
    nodes.push({ id: stId, label: slice.stateName, kind: 'state' });
    for (const span of slice.spans) {
        if (span.kind === 'define') {
            continue;
        }
        const nodeId = (0, impact_slice_1.impactSiteNodeId)(span);
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
function graphFromStructureSlice(slice, collapseLevel = 0) {
    const nodes = [];
    const edges = [];
    const modId = (0, structure_slice_1.moduleNodeId)(slice.moduleName);
    nodes.push({
        id: modId,
        label: slice.moduleName,
        kind: 'module',
        filePath: slice.focalFilePath,
        hop: 0,
    });
    for (const member of slice.members) {
        const dep = (0, structure_slice_1.depNodeId)(member.specifier);
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
function graphFromDataFlowSlice(slice) {
    const nodes = [];
    const edges = [];
    const typeId = (0, data_flow_slice_1.dataTypeNodeId)(slice.dataType);
    const dataId = (0, data_flow_slice_1.dataNodeId)(slice.scopeId);
    nodes.push({
        id: typeId,
        label: `${slice.dataType.label} (${slice.dataType.length})`,
        kind: 'data',
    });
    nodes.push({ id: dataId, label: slice.scopeId, kind: 'data' });
    edges.push({ id: `e:${typeId}:${dataId}`, source: typeId, target: dataId, label: 'interpret' });
    for (const span of slice.spans) {
        const nodeId = (0, data_flow_slice_1.spanNodeId)(span);
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
function graphFromDefUseSlice(slice) {
    const nodes = [];
    const edges = [];
    const stateId = `state:${slice.scopeId}`;
    nodes.push({ id: stateId, label: slice.scopeId, kind: 'state' });
    for (const span of slice.spans) {
        const nodeId = `${span.kind}:${span.line}:${span.column}`;
        if (!nodes.find(n => n.id === nodeId)) {
            nodes.push({
                id: nodeId,
                label: `${span.kind} L${span.line}`,
                kind: span.kind,
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
function graphFromContract(contract, filePath, viewType) {
    const slice = {
        viewType,
        scopeId: contract.variableName,
        spans: (0, def_use_slice_1.contractToSpans)(contract, filePath),
    };
    return graphFromDefUseSlice(slice);
}
function graphEntryPointStub(scopeId) {
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
function graphImpactStub(scopeId) {
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
function graphStructureStub(scopeId) {
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
function graphEventFlowStub(scopeId) {
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
function graphDataFlowStub(scopeId) {
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
exports.VIEW_GRAPH_BUILDERS = {
    'entry-point': graphEntryPointStub,
    impact: graphImpactStub,
    structure: graphStructureStub,
    'event-flow': graphEventFlowStub,
    'data-flow': graphDataFlowStub,
};
//# sourceMappingURL=graph.js.map