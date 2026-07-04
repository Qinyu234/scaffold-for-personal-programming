"use strict";
/**
 * Read source lines for Projection Slice Cut.
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
exports.readSourceLines = readSourceLines;
exports.getLineContent = getLineContent;
exports.writeSourceLines = writeSourceLines;
exports.replaceSourceLine = replaceSourceLine;
exports.replaceSourceRange = replaceSourceRange;
const fs = __importStar(require("fs"));
function readSourceLines(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw.split(/\r?\n/);
}
function getLineContent(lines, lineNumber) {
    if (lineNumber < 1 || lineNumber > lines.length) {
        return '';
    }
    return lines[lineNumber - 1];
}
function writeSourceLines(filePath, lines) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}
function replaceSourceLine(filePath, lineNumber, newContent) {
    const lines = readSourceLines(filePath);
    if (lineNumber < 1 || lineNumber > lines.length) {
        return;
    }
    lines[lineNumber - 1] = newContent;
    writeSourceLines(filePath, lines);
}
function replaceSourceRange(filePath, startLine, endLine, newLines) {
    const lines = readSourceLines(filePath);
    if (startLine < 1 || endLine < startLine || startLine > lines.length) {
        return;
    }
    const end = Math.min(endLine, lines.length);
    lines.splice(startLine - 1, end - startLine + 1, ...newLines);
    writeSourceLines(filePath, lines);
}
//# sourceMappingURL=extract.js.map