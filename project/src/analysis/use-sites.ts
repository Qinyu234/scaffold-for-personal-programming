/**
 * Use site scanner for TypeScript/JavaScript files
 * Based on PLAN.md Task 1.4: Use site scanner — find all read references
 * 
 * Tech: ts-morph Identifier.findReferences() — returns all reference nodes with read/write flag
 * 
 * Acceptance criteria:
 * - finds all identifier references that are reads (not writes)
 * - maps each reference to the enclosing function or module
 * - records location (file, line, column)
 */

import { Project, SyntaxKind } from 'ts-morph';

export interface UseSite {
  variableName: string;
  file: string;
  line: number;
  column: number;
  enclosingFunction: string;
}

/**
 * Find all use sites (read references) for variables in a source file
 * @param filePath - Path to the source file
 * @returns Array of use sites
 */
export function findUseSites(filePath: string): UseSite[] {
  const useSites: UseSite[] = [];

  try {
    const project = new Project({
      compilerOptions: {
        allowJs: true,
      },
    });

    const sourceFile = project.addSourceFileAtPath(filePath);

    // Get all identifiers in the file
    const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
    
    for (const identifier of identifiers) {
      // Check if this identifier is a reference (not a declaration)
      if (isReadReference(identifier)) {
        const varName = identifier.getText();
        
        const useSite = createUseSite(
          varName,
          identifier,
          filePath,
          sourceFile
        );
        
        if (useSite) {
          useSites.push(useSite);
        }
      }
    }

  } catch (error) {
    console.error('Error finding use sites:', error);
  }

  return useSites;
}

/**
 * Check if an identifier is a read reference (not a write or declaration)
 * @param identifier - ts-morph Identifier
 * @returns true if it's a read reference
 */
function isReadReference(identifier: any): boolean {
  try {
    // Get the parent to determine context
    const parent = identifier.getParent();
    if (!parent) return false;
    
    const parentKind = parent.getKind();
    
    // Skip if it's a declaration (variable declaration, function parameter, etc.)
    if (isDeclarationContext(identifier, parent, parentKind)) {
      return false;
    }
    
    // Skip if it's a write context (left side of assignment)
    if (isWriteContext(parent, parentKind)) {
      return false;
    }
    
    // Skip if it's an import/export statement
    if (isImportExportContext(parent, parentKind)) {
      return false;
    }
    
    // Otherwise, it's a read reference
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if the parent context is a declaration
 * @param identifier - The identifier node
 * @param parent - Parent node
 * @param parentKind - Parent node kind
 * @returns true if it's a declaration context
 */
function isDeclarationContext(identifier: any, parent: any, parentKind: SyntaxKind): boolean {
  // Only skip if this is the actual declaration name, not part of the initializer
  if (parentKind === SyntaxKind.VariableDeclaration) {
    // Check if this identifier is the variable name being declared
    const nameNode = parent.getNameNode();
    if (nameNode && nameNode.getText() === identifier.getText()) {
      return true;
    }
    return false;
  }
  
  return parentKind === SyntaxKind.Parameter ||
         parentKind === SyntaxKind.FunctionDeclaration ||
         parentKind === SyntaxKind.ClassDeclaration ||
         parentKind === SyntaxKind.InterfaceDeclaration ||
         parentKind === SyntaxKind.TypeAliasDeclaration ||
         parentKind === SyntaxKind.EnumDeclaration;
}

/**
 * Check if the parent context is a write operation
 * @param parent - Parent node
 * @param parentKind - Parent node kind
 * @returns true if it's a write context
 */
function isWriteContext(parent: any, parentKind: SyntaxKind): boolean {
  // Check if it's the left side of an assignment
  if (parentKind === SyntaxKind.BinaryExpression) {
    const left = parent.getLeft();
    const operatorKind = parent.getOperatorToken().getKind();
    
    // Only consider it a write if it's an assignment operator AND this is the left side
    if (operatorKind === SyntaxKind.EqualsToken ||
        operatorKind === SyntaxKind.PlusEqualsToken ||
        operatorKind === SyntaxKind.MinusEqualsToken ||
        operatorKind === SyntaxKind.AsteriskEqualsToken ||
        operatorKind === SyntaxKind.SlashEqualsToken) {
      if (left && left.getText() === parent.getText()) {
        return true;
      }
    }
  }
  
  // Check if it's a setState call (write operation)
  if (parentKind === SyntaxKind.CallExpression) {
    const exprText = parent.getText();
    if (exprText.startsWith('set') && exprText.length > 3) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if the parent context is an import/export statement
 * @param parent - Parent node
 * @param parentKind - Parent node kind
 * @returns true if it's an import/export context
 */
function isImportExportContext(parent: any, parentKind: SyntaxKind): boolean {
  return parentKind === SyntaxKind.ImportDeclaration ||
         parentKind === SyntaxKind.ExportDeclaration ||
         parentKind === SyntaxKind.ImportSpecifier ||
         parentKind === SyntaxKind.ExportSpecifier;
}

/**
 * Create a UseSite object from an identifier
 * @param varName - Variable name
 * @param identifier - ts-morph Identifier
 * @param filePath - Source file path
 * @param sourceFile - ts-morph SourceFile
 * @returns UseSite or null
 */
function createUseSite(
  varName: string,
  identifier: any,
  filePath: string,
  sourceFile: any
): UseSite | null {
  try {
    // Get position
    const start = identifier.getStart();
    const lineCol = sourceFile.getLineAndColumnAtPos(start);

    // Find enclosing function
    const enclosingFunction = findEnclosingFunction(identifier);

    return {
      variableName: varName,
      file: filePath,
      line: lineCol.line,
      column: lineCol.column,
      enclosingFunction,
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
