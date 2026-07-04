"use strict";
/**
 * Event Flow View (JS/TS): static event triggers → state → write/use sites.
 * scopeId = state variable name (DESIGN.md Phase 1).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEventFlowSlice = buildEventFlowSlice;
exports.listEventFlowStates = listEventFlowStates;
exports.statesWithTriggers = statesWithTriggers;
exports.triggerNodeId = triggerNodeId;
exports.stateNodeId = stateNodeId;
exports.siteNodeId = siteNodeId;
const analyze_1 = require("../core/analyze");
const def_use_slice_1 = require("./def-use-slice");
const language_1 = require("../ingestion/language");
function isJsFamily(filePath) {
    return (0, language_1.detectLanguage)(filePath) === 'typescript';
}
function buildEdges(stateName, spans) {
    const edges = [];
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
function orderSpans(spans) {
    const rank = { define: 0, trigger: 1, write: 2, use: 3 };
    return [...spans].sort((a, b) => {
        const dr = (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9);
        if (dr !== 0) {
            return dr;
        }
        return a.line - b.line || a.column - b.column;
    });
}
function buildEventFlowSlice(filePath, stateName) {
    if (!isJsFamily(filePath)) {
        return null;
    }
    const contracts = (0, analyze_1.analyzeFile)(filePath, stateName);
    if (contracts.length === 0) {
        return null;
    }
    const contract = contracts[0];
    const spans = orderSpans((0, def_use_slice_1.contractToSpans)(contract, filePath));
    return {
        viewType: 'event-flow',
        scopeId: stateName,
        stateName,
        spans,
        edges: buildEdges(stateName, spans),
        flowOrder: ['define', 'trigger', 'write', 'use'],
    };
}
function listEventFlowStates(filePath) {
    if (!isJsFamily(filePath)) {
        return [];
    }
    const contracts = (0, analyze_1.analyzeFile)(filePath);
    return contracts
        .filter(c => c.writeSites.length > 0 || c.triggeredBy.length > 0)
        .map(c => c.variableName)
        .sort();
}
function statesWithTriggers(filePath) {
    return (0, analyze_1.analyzeFile)(filePath)
        .filter(c => c.triggeredBy.length > 0)
        .map(c => c.variableName)
        .sort();
}
function triggerNodeId(span) {
    return `trigger:${span.line}:${span.event ?? 'event'}`;
}
function stateNodeId(stateName) {
    return `state:${stateName}`;
}
function siteNodeId(span) {
    return `${span.kind}:${span.line}:${span.column}`;
}
//# sourceMappingURL=event-flow-slice.js.map