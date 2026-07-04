"use strict";
/**
 * Text-based contract extraction for C/C++ sources.
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
exports.buildCppContracts = buildCppContracts;
const fs = __importStar(require("fs"));
const contract_types_1 = require("./contract-types");
const KEYWORDS = new Set([
    'if', 'else', 'for', 'while', 'switch', 'case', 'return', 'break', 'continue',
    'class', 'struct', 'namespace', 'using', 'template', 'typename', 'public',
    'private', 'protected', 'virtual', 'override', 'const', 'static', 'void',
    'int', 'float', 'double', 'bool', 'char', 'auto', 'new', 'delete', 'sizeof',
]);
const DECL_RE = /^\s*(?:const\s+)?(?:static\s+)?(?:auto\s+)?(?:[\w:<>,\s*&]+?\s+)([A-Za-z_]\w*)\s*(?:=\s*[^;]+)?\s*;/;
const ASSIGN_RE = /\b([A-Za-z_]\w*)\s*(?:[+\-*\/%]?=)/;
const FUNC_RE = /^\s*(?:[\w:<>,\s*&]+?\s+)?([A-Za-z_]\w*)\s*\([^;]*\)\s*(?:const\s*)?\{?\s*$/;
function stripComment(line) {
    const slash = line.indexOf('//');
    return slash >= 0 ? line.slice(0, slash) : line;
}
function enclosingFunction(lines, lineIndex) {
    for (let i = lineIndex; i >= 0; i--) {
        const match = FUNC_RE.exec(lines[i]);
        if (match && !KEYWORDS.has(match[1])) {
            return match[1];
        }
    }
    return '<global>';
}
function buildCppContracts(filePath) {
    const source = fs.readFileSync(filePath, 'utf-8');
    const lines = source.split(/\r?\n/);
    const writeSites = [];
    const useSites = [];
    const definitions = new Map();
    lines.forEach((rawLine, index) => {
        const line = stripComment(rawLine);
        const lineNo = index + 1;
        const declMatch = DECL_RE.exec(line);
        if (declMatch) {
            const name = declMatch[1];
            if (!KEYWORDS.has(name) && !definitions.has(name)) {
                definitions.set(name, { line: lineNo, column: (declMatch.index ?? 0) + 1 });
            }
        }
        const assignMatch = ASSIGN_RE.exec(line);
        if (assignMatch) {
            const name = assignMatch[1];
            if (KEYWORDS.has(name) || line.includes('==') || line.includes('!=')) {
                return;
            }
            if (!definitions.has(name)) {
                definitions.set(name, { line: lineNo, column: (assignMatch.index ?? 0) + 1 });
            }
            writeSites.push({
                variableName: name,
                file: filePath,
                line: lineNo,
                column: (assignMatch.index ?? 0) + 1,
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
        if (contract && contract.writeSites.length > 0) {
            contracts.push(contract);
        }
    }
    return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}
//# sourceMappingURL=cpp-contract.js.map