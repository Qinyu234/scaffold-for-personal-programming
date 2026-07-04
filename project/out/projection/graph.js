"use strict";
/**
 * Cytoscape graph spec from Lucid IR / Projection Slice.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIEW_GRAPH_BUILDERS = void 0;
exports.graphFromDefUseSlice = graphFromDefUseSlice;
exports.graphFromContract = graphFromContract;
exports.graphEntryPointStub = graphEntryPointStub;
exports.graphImpactStub = graphImpactStub;
exports.graphStructureStub = graphStructureStub;
exports.graphEventFlowStub = graphEventFlowStub;
exports.graphDataFlowStub = graphDataFlowStub;
const def_use_slice_1 = require("./def-use-slice");
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