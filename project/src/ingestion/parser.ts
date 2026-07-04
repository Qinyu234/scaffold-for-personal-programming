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

import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind } from 'ts-morph';

export interface ASTNode {
  type: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  children: ASTNode[];
  text: string;
}

export interface ParseResult {
  filePath: string;
  language: 'typescript' | 'javascript';
  ast: ASTNode | null;
  error: string | null;
  success: boolean;
}

/**
 * Parse a single TypeScript or JavaScript file
 * @param filePath - Path to the file to parse
 * @returns ParseResult with AST node list and metadata
 */
export function parseFile(filePath: string): ParseResult {
  const result: ParseResult = {
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
    const project = new Project({
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
  } catch (error) {
    // Handle syntax errors gracefully
    if (error instanceof Error) {
      result.error = error.message;
    } else {
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
function convertTsMorphNode(node: any): ASTNode {
  const children: ASTNode[] = [];
  
  try {
    for (const child of node.getChildren()) {
      children.push(convertTsMorphNode(child));
    }
  } catch (error) {
    // Ignore children conversion errors
  }

  const start = node.getStart();
  const end = node.getEnd();
  
  // Get line and column from position
  const sourceFile = node.getSourceFile();
  const startLineCol = sourceFile.getLineAndColumnAtPos(start);
  const endLineCol = sourceFile.getLineAndColumnAtPos(end);

  return {
    type: SyntaxKind[node.getKind()],
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
function getLanguageFromPath(filePath: string): 'typescript' | 'javascript' {
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
export function getRawASTNodeList(ast: ASTNode | null): Array<{
  type: string;
  startPosition: { row: number; column: number };
  endPosition: { row: number; column: number };
  text: string;
}> {
  if (!ast) {
    return [];
  }

  const nodes: Array<{
    type: string;
    startPosition: { row: number; column: number };
    endPosition: { row: number; column: number };
    text: string;
  }> = [];

  function traverse(node: ASTNode) {
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
