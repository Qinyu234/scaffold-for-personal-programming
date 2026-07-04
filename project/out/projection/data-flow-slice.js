"use strict";
/**
 * Data Flow View (Python): filter IR to one data name + (length, interpretation).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDataFlowSlice = buildDataFlowSlice;
exports.listPythonDataNames = listPythonDataNames;
exports.dataTypeNodeId = dataTypeNodeId;
exports.dataNodeId = dataNodeId;
exports.spanNodeId = spanNodeId;
const analyze_1 = require("../core/analyze");
const data_type_1 = require("../analysis/data-type");
const def_use_slice_1 = require("./def-use-slice");
const language_1 = require("../ingestion/language");
function buildDataFlowSlice(filePath, dataName) {
    if ((0, language_1.detectLanguage)(filePath) !== 'python') {
        return null;
    }
    const contracts = (0, analyze_1.analyzeFile)(filePath, dataName);
    if (contracts.length === 0) {
        return null;
    }
    const contract = contracts[0];
    const dataType = (0, data_type_1.inferPythonDataType)(filePath, contract);
    const spans = (0, def_use_slice_1.contractToSpans)(contract, filePath);
    return {
        viewType: 'data-flow',
        scopeId: dataName,
        dataType,
        spans,
    };
}
function listPythonDataNames(filePath) {
    if ((0, language_1.detectLanguage)(filePath) !== 'python') {
        return [];
    }
    return (0, analyze_1.analyzeFile)(filePath).map(c => c.variableName);
}
function dataTypeNodeId(dataType) {
    return `type:${dataType.label}:${dataType.length}`;
}
function dataNodeId(scopeId) {
    return `data:${scopeId}`;
}
function spanNodeId(span) {
    return `${span.kind}:${span.line}:${span.column}`;
}
//# sourceMappingURL=data-flow-slice.js.map