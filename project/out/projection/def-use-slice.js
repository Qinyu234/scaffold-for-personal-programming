"use strict";
/**
 * Def-Use View: filter IR to one state, cut spans for Projection Slice.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contractToSpans = contractToSpans;
exports.buildDefUseSlice = buildDefUseSlice;
exports.buildDefUseSliceWorkspace = buildDefUseSliceWorkspace;
const analyze_1 = require("../core/analyze");
const contract_1 = require("../analysis/contract");
function contractToSpans(contract, filePath) {
    const spans = [];
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
function buildDefUseSlice(filePath, stateName) {
    const contracts = (0, analyze_1.analyzeFile)(filePath, stateName);
    if (contracts.length === 0) {
        return null;
    }
    return {
        viewType: 'def-use',
        scopeId: stateName,
        spans: contractToSpans(contracts[0], filePath),
    };
}
function buildDefUseSliceWorkspace(filePath, stateName, workspaceRoot) {
    const contracts = (0, contract_1.buildContractsWorkspace)(filePath, workspaceRoot).filter(c => c.variableName === stateName);
    if (contracts.length === 0) {
        return null;
    }
    return {
        viewType: 'def-use',
        scopeId: stateName,
        spans: contractToSpans(contracts[0], filePath),
    };
}
//# sourceMappingURL=def-use-slice.js.map