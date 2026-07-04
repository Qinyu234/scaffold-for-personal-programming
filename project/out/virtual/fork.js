"use strict";
/**
 * push fork — sibling function or file in same directory.
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
exports.suggestForkName = suggestForkName;
exports.forkFunctionInFile = forkFunctionInFile;
exports.forkFileInDirectory = forkFileInDirectory;
exports.forkPythonFileCopy = forkPythonFileCopy;
exports.insertFunctionAfter = insertFunctionAfter;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
const language_1 = require("../ingestion/language");
const extract_1 = require("./extract");
function suggestForkName(baseName, kind) {
    if (kind === 'function') {
        return `${baseName}Prime`;
    }
    const ext = path.extname(baseName);
    const stem = path.basename(baseName, ext);
    return `${stem}.prime${ext}`;
}
function forkFunctionInFile(filePath, functionName, newFunctionName) {
    const lang = (0, language_1.detectLanguage)(filePath);
    if (lang !== 'typescript') {
        return null;
    }
    const project = new ts_morph_1.Project({ compilerOptions: { allowJs: true } });
    const sourceFile = project.addSourceFileAtPath(filePath);
    const fn = sourceFile.getFunction(functionName);
    if (!fn) {
        return null;
    }
    const text = fn.getText();
    const renamed = text.replace(new RegExp(`\\bfunction\\s+${escapeRegExp(functionName)}\\b`), `function ${newFunctionName}`);
    sourceFile.addStatements(`\n${renamed}\n`);
    sourceFile.saveSync();
    return { targetPath: filePath, kind: 'function' };
}
function forkFileInDirectory(sourceFilePath, newFileName) {
    const dir = path.dirname(sourceFilePath);
    const ext = path.extname(sourceFilePath);
    const targetName = newFileName ?? suggestForkName(sourceFilePath, 'file');
    const targetPath = path.join(dir, targetName.endsWith(ext) ? targetName : `${targetName}${ext}`);
    if (fs.existsSync(targetPath)) {
        return null;
    }
    const content = fs.readFileSync(sourceFilePath, 'utf8');
    fs.writeFileSync(targetPath, content, 'utf8');
    return { targetPath, kind: 'file' };
}
/** Python: copy whole file as .prime sibling (dataflow review copy). */
function forkPythonFileCopy(sourceFilePath, newBaseName) {
    const lang = (0, language_1.detectLanguage)(sourceFilePath);
    if (lang !== 'python') {
        return null;
    }
    const dir = path.dirname(sourceFilePath);
    const ext = path.extname(sourceFilePath);
    const stem = path.basename(sourceFilePath, ext);
    const targetPath = path.join(dir, `${newBaseName ?? `${stem}.prime`}${ext}`);
    if (fs.existsSync(targetPath)) {
        return null;
    }
    fs.writeFileSync(targetPath, fs.readFileSync(sourceFilePath, 'utf8'), 'utf8');
    return { targetPath, kind: 'file' };
}
function insertFunctionAfter(filePath, afterFunctionName, newFunctionSource) {
    const lines = (0, extract_1.readSourceLines)(filePath);
    const project = new ts_morph_1.Project({ compilerOptions: { allowJs: true } });
    const sf = project.addSourceFileAtPath(filePath);
    const fn = sf.getFunction(afterFunctionName);
    if (!fn) {
        return false;
    }
    const endLine = fn.getEndLineNumber();
    lines.splice(endLine, 0, '', newFunctionSource);
    (0, extract_1.writeSourceLines)(filePath, lines);
    return true;
}
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=fork.js.map