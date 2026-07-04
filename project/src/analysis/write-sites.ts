/**
 * Write site scanner for TypeScript/JavaScript files
 * Based on PLAN.md Task 1.3: Write site scanner — find all assignment operations
 * 
 * Tech: ts-morph BinaryExpression (kind: EqualsToken), CallExpression for setState
 * 
 * Acceptance criteria:
 * - finds all assignment expressions (=, +=, setState calls)
 * - maps each assignment to the enclosing function or module
 * - records location (file, line, column)
 * - does not false-positive on declarations (only mutations)
 */

import { Project, SyntaxKind } from 'ts-morph';

export interface WriteSite {
  variableName: string;
  file: string;
  line: number;
  column: number;
  enclosingFunction: string;
  assignmentType: '=' | '+=' | '-=' | '*=' | '/=' | 'setState';
}

/**
 * Find all write sites (assignment operations) in a source file
 * @param filePath - Path to the source file
 * @returns Array of write sites
 */
export function findWriteSites(filePath: string): WriteSite[] {
  const writeSites: WriteSite[] = [];

  try {
    const project = new Project({
      compilerOptions: {
        allowJs: true,
      },
    });

    const sourceFile = project.addSourceFileAtPath(filePath);

    // Find all binary expressions (assignments)
    const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
    
    for (const binaryExpr of binaryExpressions) {
      const operatorToken = binaryExpr.getOperatorToken();
      const operatorKind = operatorToken.getKind();
      
      // Check if it's an assignment operator
      if (isAssignmentOperator(operatorKind)) {
        const left = binaryExpr.getLeft();
        if (left) {
          const varName = left.getText();
          
          // Skip if this is a declaration (parent is VariableDeclaration)
          const parent = binaryExpr.getParent();
          if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
            continue; // Skip declarations
          }
          
          const writeSite = createWriteSite(
            varName,
            getOperatorText(operatorKind),
            binaryExpr,
            filePath,
            sourceFile
          );
          
          if (writeSite) {
            writeSites.push(writeSite);
          }
        }
      }
    }

    // Find setState calls
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    for (const callExpr of callExpressions) {
      // Get the expression being called
      const expr = callExpr.getExpression();
      if (!expr) continue;
      
      const exprText = expr.getText();
      
      // Check if it's a setState call (ends with 'setState' or starts with 'set' and is likely a setter)
      if (exprText.endsWith('setState') || (exprText.startsWith('set') && exprText.length > 3)) {
        const varName = exprText;
        
        const writeSite = createWriteSite(
          varName,
          'setState',
          callExpr,
          filePath,
          sourceFile
        );
        
        if (writeSite) {
          writeSites.push(writeSite);
        }
      }
    }

  } catch (error) {
    console.error('Error finding write sites:', error);
  }

  return writeSites;
}

/**
 * Check if a syntax kind is an assignment operator
 * @param kind - SyntaxKind
 * @returns true if it's an assignment operator
 */
function isAssignmentOperator(kind: SyntaxKind): boolean {
  return kind === SyntaxKind.EqualsToken ||
         kind === SyntaxKind.PlusEqualsToken ||
         kind === SyntaxKind.MinusEqualsToken ||
         kind === SyntaxKind.AsteriskEqualsToken ||
         kind === SyntaxKind.SlashEqualsToken;
}

/**
 * Get the text representation of an assignment operator
 * @param kind - SyntaxKind
 * @returns Operator text
 */
function getOperatorText(kind: SyntaxKind): '=' | '+=' | '-=' | '*=' | '/=' {
  switch (kind) {
    case SyntaxKind.EqualsToken:
      return '=';
    case SyntaxKind.PlusEqualsToken:
      return '+=';
    case SyntaxKind.MinusEqualsToken:
      return '-=';
    case SyntaxKind.AsteriskEqualsToken:
      return '*=';
    case SyntaxKind.SlashEqualsToken:
      return '/=';
    default:
      return '=';
  }
}

/**
 * Create a WriteSite object from a node
 * @param varName - Variable name
 * @param assignmentType - Type of assignment
 * @param node - ts-morph node
 * @param filePath - Source file path
 * @param sourceFile - ts-morph SourceFile
 * @returns WriteSite or null
 */
function createWriteSite(
  varName: string,
  assignmentType: '=' | '+=' | '-=' | '*=' | '/=' | 'setState',
  node: any,
  filePath: string,
  sourceFile: any
): WriteSite | null {
  try {
    // Get position
    const start = node.getStart();
    const lineCol = sourceFile.getLineAndColumnAtPos(start);

    // Find enclosing function
    const enclosingFunction = findEnclosingFunction(node);

    return {
      variableName: varName,
      file: filePath,
      line: lineCol.line,
      column: lineCol.column,
      enclosingFunction,
      assignmentType: assignmentType as any,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Find the enclosing function for a node
 * @param node - ts-morph node
 * @returns Function name or 'module' if not in a function
 */
function findEnclosingFunction(node: any): string {
  try {
    // Traverse up to find function declaration
    let current = node;
    while (current) {
      const kind = current.getKind();
      
      if (kind === SyntaxKind.FunctionDeclaration ||
          kind === SyntaxKind.FunctionExpression ||
          kind === SyntaxKind.ArrowFunction ||
          kind === SyntaxKind.MethodDeclaration) {
        // Try to get the function name
        const nameNode = current.getName();
        if (nameNode) {
          return nameNode;
        }
        
        // For arrow functions without names, try to get from parent variable
        const parent = current.getParent();
        if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
          return parent.getName();
        }
        
        // Fallback to anonymous
        return '<anonymous>';
      }
      
      current = current.getParent();
    }
    
    return 'module';
  } catch (error) {
    return 'module';
  }
}
