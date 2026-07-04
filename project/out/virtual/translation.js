"use strict";
/**
 * Translation Virtual File — one-way copy layout (Phase 2 scaffold).
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
exports.buildTranslationDocument = buildTranslationDocument;
exports.createTranslationSession = createTranslationSession;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uri_1 = require("./uri");
function readFileText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}
function placeholderCppFromPython(source, scopeId) {
    const lines = [
        `// Lucid translation (scaffold): Python → C++`,
        `// scope: ${scopeId}`,
        `// NOTE: subset mapping only — full py2cpp integration pending`,
        '',
        '// TODO: wire py2cpp / PyCer subprocess',
        `// --- source excerpt ---`,
        ...source.split(/\r?\n/).slice(0, 40).map(l => `// ${l}`),
    ];
    return lines.join('\n');
}
function buildTranslationDocument(req) {
    const source = readFileText(req.sourceFile);
    const text = req.targetLang === 'cpp'
        ? placeholderCppFromPython(source, req.scopeId)
        : `// unsupported target: ${req.targetLang}`;
    return {
        text,
        segments: [
            {
                id: `translation:${req.scopeId}`,
                kind: 'translation',
                sourceFile: req.sourceFile,
                sourceLine: 1,
                virtualStartLine: 1,
                virtualEndLine: text.split(/\r?\n/).length,
                collapsed: false,
                enclosingFunction: '<module>',
            },
        ],
    };
}
function createTranslationSession(req, _workspaceRoot) {
    const slice = {
        viewType: 'translation',
        scopeId: req.scopeId,
        spans: [],
    };
    const document = buildTranslationDocument(req);
    const virtualUri = (0, uri_1.buildTranslationUri)(req.targetLang, req.scopeId, req.sourceFile);
    const lineage = {
        virtualUri,
        sourceFile: path.resolve(req.sourceFile),
        viewType: 'translation',
        scopeId: req.scopeId,
    };
    return {
        viewType: 'translation',
        scopeId: req.scopeId,
        sourceFilePath: path.resolve(req.sourceFile),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: new Set(),
        selectedSegmentIds: new Set(['translation:' + req.scopeId]),
        lineage,
    };
}
//# sourceMappingURL=translation.js.map