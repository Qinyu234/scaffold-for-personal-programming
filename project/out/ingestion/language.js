"use strict";
/**
 * Detect source language from file extension.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectLanguage = detectLanguage;
exports.languageFenceTag = languageFenceTag;
exports.isSupportedSourceFile = isSupportedSourceFile;
const TS_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const PY_EXT = new Set(['.py', '.pyw']);
const CPP_EXT = new Set(['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hh']);
function detectLanguage(filePath) {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    if (TS_EXT.has(ext)) {
        return 'typescript';
    }
    if (PY_EXT.has(ext)) {
        return 'python';
    }
    if (CPP_EXT.has(ext)) {
        return 'cpp';
    }
    return 'unknown';
}
function languageFenceTag(language) {
    switch (language) {
        case 'typescript':
            return 'typescript';
        case 'python':
            return 'python';
        case 'cpp':
            return 'cpp';
        default:
            return 'text';
    }
}
function isSupportedSourceFile(filePath) {
    return detectLanguage(filePath) !== 'unknown';
}
//# sourceMappingURL=language.js.map