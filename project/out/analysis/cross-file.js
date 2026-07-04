"use strict";
/**
 * Cross-file use/write discovery via ts-morph findReferences on a workspace Project.
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
exports.findCrossFileUseSites = findCrossFileUseSites;
exports.findCrossFileWriteSites = findCrossFileWriteSites;
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
function findEnclosingFunction(node) {
    let current = node;
    while (current) {
        const kind = current.getKind();
        if (kind === ts_morph_1.SyntaxKind.FunctionDeclaration ||
            kind === ts_morph_1.SyntaxKind.FunctionExpression ||
            kind === ts_morph_1.SyntaxKind.ArrowFunction ||
            kind === ts_morph_1.SyntaxKind.MethodDeclaration) {
            const nameNode = current.getName?.();
            if (nameNode) {
                return nameNode;
            }
            const parent = current.getParent();
            if (parent?.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration) {
                return parent.getName();
            }
            return '<anonymous>';
        }
        current = current.getParent();
    }
    return '<module>';
}
function isWriteReference(node) {
    const parent = node.getParent();
    if (!parent) {
        return false;
    }
    const kind = parent.getKind();
    if (kind === ts_morph_1.SyntaxKind.BinaryExpression) {
        const op = parent.getOperatorToken().getKind();
        if (op === ts_morph_1.SyntaxKind.EqualsToken ||
            op === ts_morph_1.SyntaxKind.PlusEqualsToken ||
            op === ts_morph_1.SyntaxKind.MinusEqualsToken) {
            return parent.getLeft() === node;
        }
    }
    if (kind === ts_morph_1.SyntaxKind.CallExpression) {
        const text = parent.getExpression().getText();
        if (text.startsWith('set') && text.length > 3) {
            return true;
        }
    }
    return false;
}
function declarationNodesForVariable(sourceFile, varName) {
    const nodes = [];
    for (const decl of sourceFile.getVariableDeclarations()) {
        if (decl.getName() === varName) {
            nodes.push(decl.getNameNode());
        }
    }
    const setter = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    for (const call of sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.CallExpression)) {
        const expr = call.getExpression().getText();
        if (expr === setter) {
            nodes.push(call.getExpression());
        }
    }
    for (const binding of sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.ArrayBindingPattern)) {
        const parent = binding.getParent();
        if (parent?.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration) {
            const elements = binding.getElements();
            for (let i = 0; i < elements.length; i++) {
                if (elements[i].getName() === varName) {
                    nodes.push(elements[i]);
                }
            }
        }
    }
    return nodes;
}
function findCrossFileUseSites(project, entryFile, varName) {
    const resolvedEntry = path.resolve(entryFile);
    const sourceFile = project.getSourceFile(resolvedEntry);
    if (!sourceFile) {
        return [];
    }
    const sites = [];
    const seen = new Set();
    const declNodes = declarationNodesForVariable(sourceFile, varName);
    for (const declNode of declNodes) {
        const refs = declNode.findReferencesAsNodes();
        for (const ref of refs) {
            const refFile = ref.getSourceFile();
            const filePath = refFile.getFilePath();
            const start = ref.getStart();
            const { line, column } = refFile.getLineAndColumnAtPos(start);
            const key = `${filePath}:${line}:${column}`;
            if (seen.has(key)) {
                continue;
            }
            if (isWriteReference(ref)) {
                continue;
            }
            const parent = ref.getParent();
            if (parent?.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration && parent.getNameNode() === ref) {
                continue;
            }
            seen.add(key);
            sites.push({
                variableName: varName,
                file: path.resolve(filePath),
                line,
                column: column - 1,
                enclosingFunction: findEnclosingFunction(ref),
            });
        }
    }
    return sites.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
function findCrossFileWriteSites(project, entryFile, varName) {
    const resolvedEntry = path.resolve(entryFile);
    const sourceFile = project.getSourceFile(resolvedEntry);
    if (!sourceFile) {
        return [];
    }
    const sites = [];
    const seen = new Set();
    const setter = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    const declNodes = declarationNodesForVariable(sourceFile, varName);
    for (const declNode of declNodes) {
        const refs = declNode.findReferencesAsNodes();
        for (const ref of refs) {
            if (!isWriteReference(ref)) {
                continue;
            }
            const refFile = ref.getSourceFile();
            const filePath = refFile.getFilePath();
            const start = ref.getStart();
            const { line, column } = refFile.getLineAndColumnAtPos(start);
            const key = `${filePath}:${line}:${column}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            const text = ref.getText();
            sites.push({
                variableName: text === setter ? setter : varName,
                file: path.resolve(filePath),
                line,
                column: column - 1,
                enclosingFunction: findEnclosingFunction(ref),
                assignmentType: text === setter ? 'setState' : '=',
            });
        }
    }
    return sites.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
//# sourceMappingURL=cross-file.js.map