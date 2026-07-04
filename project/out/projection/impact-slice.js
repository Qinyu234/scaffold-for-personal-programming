"use strict";
/**
 * Impact View: state change → downstream read/write sites (IR propagation).
 * scopeId = state variable name.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildImpactSlice = buildImpactSlice;
exports.listImpactStates = listImpactStates;
exports.impactStateNodeId = impactStateNodeId;
exports.impactSiteNodeId = impactSiteNodeId;
const analyze_1 = require("../core/analyze");
const def_use_slice_1 = require("./def-use-slice");
const language_1 = require("../ingestion/language");
const python_contract_1 = require("../analysis/python-contract");
function isSupported(filePath) {
    const lang = (0, language_1.detectLanguage)(filePath);
    return lang === 'typescript' || lang === 'python';
}
function orderImpactSpans(spans) {
    const rank = { define: 0, write: 1, use: 2 };
    return [...spans].filter(s => s.kind !== 'trigger').sort((a, b) => {
        const dr = (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9);
        return dr !== 0 ? dr : a.line - b.line || a.column - b.column;
    });
}
function buildEdges(stateName, spans) {
    const stateId = `state:${stateName}`;
    const edges = [];
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
function buildImpactSlice(filePath, stateName) {
    if (!isSupported(filePath)) {
        return null;
    }
    let spans;
    if ((0, language_1.detectLanguage)(filePath) === 'python') {
        const contract = (0, python_contract_1.buildPythonContracts)(filePath).find(c => c.variableName === stateName);
        if (!contract) {
            return null;
        }
        spans = orderImpactSpans((0, def_use_slice_1.contractToSpans)(contract, filePath));
    }
    else {
        const contracts = (0, analyze_1.analyzeFile)(filePath, stateName);
        if (contracts.length === 0) {
            return null;
        }
        spans = orderImpactSpans((0, def_use_slice_1.contractToSpans)(contracts[0], filePath));
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
function listImpactStates(filePath) {
    if (!isSupported(filePath)) {
        return [];
    }
    if ((0, language_1.detectLanguage)(filePath) === 'python') {
        return (0, python_contract_1.buildPythonContracts)(filePath)
            .filter(c => c.useSites.length > 0 || c.writeSites.length > 0)
            .map(c => c.variableName)
            .sort();
    }
    return (0, analyze_1.analyzeFile)(filePath)
        .filter(c => c.useSites.length > 0 || c.writeSites.length > 0)
        .map(c => c.variableName)
        .sort();
}
function impactStateNodeId(stateName) {
    return `state:${stateName}`;
}
function impactSiteNodeId(span) {
    return `${span.kind}:${span.line}:${span.column}`;
}
//# sourceMappingURL=impact-slice.js.map