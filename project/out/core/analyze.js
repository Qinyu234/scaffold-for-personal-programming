"use strict";
/**
 * Public analyze API — shared by CLI and VS Code extension.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeFile = analyzeFile;
const contract_1 = require("../analysis/contract");
function analyzeFile(filePath, variableFilter) {
    const contracts = (0, contract_1.buildContracts)(filePath);
    if (!variableFilter) {
        return contracts;
    }
    return contracts.filter(c => c.variableName === variableFilter);
}
//# sourceMappingURL=analyze.js.map