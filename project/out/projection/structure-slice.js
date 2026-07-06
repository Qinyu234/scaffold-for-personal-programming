"use strict";
/**
 * Structure View: module import dependencies (minimal; ts-morph / Python heuristic).
 * scopeId = module file stem (e.g. CartPanel).
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
exports.buildStructureSlice = buildStructureSlice;
exports.filePathForStructureNode = filePathForStructureNode;
exports.moduleNodeId = moduleNodeId;
exports.depNodeId = depNodeId;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ts_morph_1 = require("ts-morph");
const language_1 = require("../ingestion/language");
const import_resolve_1 = require("./import-resolve");
const PY_IMPORT = /^\s*(?:import\s+([\w.]+)|from\s+([\w.]+)\s+import)/;
function moduleStem(filePath) {
    return path.basename(filePath, path.extname(filePath));
}
function buildJsImports(filePath, moduleName) {
    const project = new ts_morph_1.Project({ compilerOptions: { allowJs: true } });
    const sourceFile = project.addSourceFileAtPath(filePath);
    const spans = [];
    const edges = [];
    const members = [];
    const modId = `mod:${moduleName}`;
    for (const imp of sourceFile.getImportDeclarations()) {
        const specifier = imp.getModuleSpecifierValue();
        const line = imp.getStartLineNumber();
        const resolved = (0, import_resolve_1.resolveImportPath)(filePath, specifier);
        members.push({ specifier, filePath: resolved, hop: 1 });
        spans.push({
            file: filePath,
            line,
            column: 1,
            enclosingFunction: '<module>',
            kind: 'import',
            variableName: specifier,
        });
        edges.push({
            source: modId,
            target: depNodeId(specifier),
            label: 'imports',
        });
    }
    return { spans, edges, members };
}
function buildPythonImports(filePath, moduleName) {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const spans = [];
    const edges = [];
    const members = [];
    const modId = `mod:${moduleName}`;
    lines.forEach((raw, index) => {
        const match = PY_IMPORT.exec(raw);
        if (!match) {
            return;
        }
        const specifier = match[1] ?? match[2];
        const line = index + 1;
        const resolved = (0, import_resolve_1.resolveImportPath)(filePath, specifier.replace(/\./g, '/'));
        members.push({ specifier, filePath: resolved, hop: 1 });
        spans.push({
            file: filePath,
            line,
            column: 1,
            enclosingFunction: '<module>',
            kind: 'import',
            variableName: specifier,
        });
        edges.push({
            source: modId,
            target: depNodeId(specifier),
            label: 'imports',
        });
    });
    return { spans, edges, members };
}
function buildStructureSlice(filePath) {
    const lang = (0, language_1.detectLanguage)(filePath);
    if (lang === 'unknown') {
        return null;
    }
    const moduleName = moduleStem(filePath);
    const built = lang === 'python' ? buildPythonImports(filePath, moduleName) : buildJsImports(filePath, moduleName);
    return {
        viewType: 'structure',
        scopeId: moduleName,
        moduleName,
        focalFilePath: path.resolve(filePath),
        members: built.members,
        spans: built.spans,
        edges: built.edges,
    };
}
function filePathForStructureNode(nodeId, slice) {
    if (nodeId === moduleNodeId(slice.moduleName)) {
        return slice.focalFilePath;
    }
    if (!nodeId.startsWith('dep:')) {
        return null;
    }
    const specifier = nodeId.slice(4);
    return slice.members.find(m => m.specifier === specifier)?.filePath ?? null;
}
function moduleNodeId(moduleName) {
    return `mod:${moduleName}`;
}
function depNodeId(specifier) {
    return `dep:${specifier}`;
}
//# sourceMappingURL=structure-slice.js.map