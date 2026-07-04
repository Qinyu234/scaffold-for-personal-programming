"use strict";
/**
 * Text-based contract extraction for Python sources.
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
exports.buildPythonContracts = buildPythonContracts;
const fs = __importStar(require("fs"));
const contract_types_1 = require("./contract-types");
const KEYWORDS = new Set([
    'if', 'elif', 'else', 'for', 'while', 'def', 'class', 'return', 'import', 'from',
    'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'lambda',
    'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'global', 'nonlocal',
]);
const ASSIGN_RE = /^(\s*)([A-Za-z_]\w*)\s*(?:[+\-*\/%]?=)/;
const DEF_RE = /^(\s*)def\s+([A-Za-z_]\w*)\s*\(/;
const CLASS_RE = /^(\s*)class\s+([A-Za-z_]\w*)/;
function stripComment(line) {
    const hash = line.indexOf('#');
    return hash >= 0 ? line.slice(0, hash) : line;
}
function enclosingFunction(lines, lineIndex) {
    let func = '<module>';
    for (let i = lineIndex; i >= 0; i--) {
        const defMatch = DEF_RE.exec(lines[i]);
        if (defMatch) {
            return defMatch[2];
        }
        const classMatch = CLASS_RE.exec(lines[i]);
        if (classMatch) {
            return classMatch[2];
        }
    }
    return func;
}
function isDefinitionLine(line, name) {
    const stripped = stripComment(line).trim();
    const match = ASSIGN_RE.exec(stripped);
    return match?.[2] === name && !stripped.includes('==');
}
function buildPythonContracts(filePath) {
    const source = fs.readFileSync(filePath, 'utf-8');
    const lines = source.split(/\r?\n/);
    const writeSites = [];
    const useSites = [];
    const definitions = new Map();
    lines.forEach((rawLine, index) => {
        const line = stripComment(rawLine);
        const lineNo = index + 1;
        const assignMatch = ASSIGN_RE.exec(line.trimStart());
        if (assignMatch) {
            const name = assignMatch[2];
            if (KEYWORDS.has(name)) {
                return;
            }
            if (!definitions.has(name)) {
                definitions.set(name, { line: lineNo, column: assignMatch[1].length + 1 });
            }
            writeSites.push({
                variableName: name,
                file: filePath,
                line: lineNo,
                column: assignMatch[1].length + 1,
                enclosingFunction: enclosingFunction(lines, index),
                assignmentType: line.includes('+=') ? '+=' : '=',
            });
        }
        const readPattern = /\b([A-Za-z_]\w*)\b/g;
        let readMatch;
        while ((readMatch = readPattern.exec(line)) !== null) {
            const name = readMatch[1];
            if (KEYWORDS.has(name)) {
                continue;
            }
            if (assignMatch && readMatch.index === assignMatch.index + assignMatch[1].length) {
                continue;
            }
            useSites.push({
                variableName: name,
                file: filePath,
                line: lineNo,
                column: readMatch.index + 1,
                enclosingFunction: enclosingFunction(lines, index),
            });
        }
    });
    const names = new Set([
        ...writeSites.map(w => w.variableName),
        ...definitions.keys(),
    ]);
    const contracts = [];
    for (const name of names) {
        const def = definitions.get(name);
        if (!def) {
            continue;
        }
        const contract = (0, contract_types_1.validateContract)({
            variableName: name,
            definedAt: { file: filePath, line: def.line, column: def.column },
            writeSites: writeSites.filter(w => w.variableName === name),
            useSites: useSites.filter(u => u.variableName === name),
            triggeredBy: [],
            source: 'inferred',
        });
        if (contract && (contract.writeSites.length > 0 || contract.useSites.length > 1)) {
            contracts.push(contract);
        }
    }
    return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}
//# sourceMappingURL=python-contract.js.map