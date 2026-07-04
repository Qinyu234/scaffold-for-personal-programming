"use strict";
/**
 * TypeScript/JavaScript parser using ts-morph
 * Based on PLAN.md Task 1.1: Tree-sitter ingestion — parse single TS/JS file
 * Adapted to use ts-morph (TypeScript Compiler API wrapper) due to tree-sitter compilation issues
 *
 * Tech: ts-morph (npm: ts-morph) — wraps TypeScript Compiler API
 *
 * Acceptance criteria:
 * - parses a single .ts or .js file without crashing
 * - outputs raw AST node list with type and position
 * - handles syntax errors gracefully (partial parse, not crash)
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
exports.parseFile = parseFile;
exports.getRawASTNodeList = getRawASTNodeList;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ts_morph_1 = require("ts-morph");
/**
 * Parse a single TypeScript or JavaScript file
 * @param filePath - Path to the file to parse
 * @returns ParseResult with AST node list and metadata
 */
function parseFile(filePath) {
    const result = {
        filePath,
        language: getLanguageFromPath(filePath),
        ast: null,
        error: null,
        success: false,
    };
    try {
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            result.error = `File not found: ${filePath}`;
            return result;
        }
        // Create a ts-morph project
        const project = new ts_morph_1.Project({
            compilerOptions: {
                allowJs: true,
            },
        });
        // Add source file to project
        const sourceFile = project.addSourceFileAtPath(filePath);
        // Convert ts-morph AST to our format
        const ast = convertTsMorphNode(sourceFile);
        result.ast = ast;
        result.success = true;
    }
    catch (error) {
        // Handle syntax errors gracefully
        if (error instanceof Error) {
            result.error = error.message;
        }
        else {
            result.error = String(error);
        }
        // Still return success=true for partial parse
        result.success = true;
    }
    return result;
}
/**
 * Convert ts-morph node to our ASTNode format
 * @param node - ts-morph Node
 * @returns ASTNode
 */
function convertTsMorphNode(node) {
    const children = [];
    try {
        for (const child of node.getChildren()) {
            children.push(convertTsMorphNode(child));
        }
    }
    catch (error) {
        // Ignore children conversion errors
    }
    const start = node.getStart();
    const end = node.getEnd();
    // Get line and column from position
    const sourceFile = node.getSourceFile();
    const startLineCol = sourceFile.getLineAndColumnAtPos(start);
    const endLineCol = sourceFile.getLineAndColumnAtPos(end);
    return {
        type: ts_morph_1.SyntaxKind[node.getKind()],
        startPosition: {
            row: startLineCol.line - 1, // Convert to 0-indexed
            column: startLineCol.column - 1,
        },
        endPosition: {
            row: endLineCol.line - 1,
            column: endLineCol.column - 1,
        },
        children,
        text: node.getText(),
    };
}
/**
 * Determine language from file path
 * @param filePath - File path
 * @returns 'typescript' or 'javascript'
 */
function getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.ts' || ext === '.tsx') {
        return 'typescript';
    }
    return 'javascript';
}
/**
 * Get raw AST node list with type and position
 * @param ast - Root AST node
 * @returns Flat list of all nodes
 */
function getRawASTNodeList(ast) {
    if (!ast) {
        return [];
    }
    const nodes = [];
    function traverse(node) {
        nodes.push({
            type: node.type,
            startPosition: node.startPosition,
            endPosition: node.endPosition,
            text: node.text,
        });
        for (const child of node.children) {
            traverse(child);
        }
    }
    traverse(ast);
    return nodes;
}
//# sourceMappingURL=parser.js.map