"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUseSites = findUseSites;
const ts_morph_1 = require("ts-morph");
/**
 * Find all use sites (read references) for variables in a source file
 * @param filePath - Path to the source file
 * @returns Array of use sites
 */
function findUseSites(filePath) {
    const useSites = [];
    try {
        const project = new ts_morph_1.Project({
            compilerOptions: {
                allowJs: true,
            },
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        // Get all identifiers in the file
        const identifiers = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.Identifier);
        for (const identifier of identifiers) {
            // Check if this identifier is a reference (not a declaration)
            if (isReadReference(identifier)) {
                const varName = identifier.getText();
                const useSite = createUseSite(varName, identifier, filePath, sourceFile);
                if (useSite) {
                    useSites.push(useSite);
                }
            }
        }
    }
    catch (error) {
        console.error('Error finding use sites:', error);
    }
    return useSites;
}
/**
 * Check if an identifier is a read reference (not a write or declaration)
 * @param identifier - ts-morph Identifier
 * @returns true if it's a read reference
 */
function isReadReference(identifier) {
    try {
        // Get the parent to determine context
        const parent = identifier.getParent();
        if (!parent)
            return false;
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
    }
    catch (error) {
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
function isDeclarationContext(identifier, parent, parentKind) {
    // Only skip if this is the actual declaration name, not part of the initializer
    if (parentKind === ts_morph_1.SyntaxKind.VariableDeclaration) {
        // Check if this identifier is the variable name being declared
        const nameNode = parent.getNameNode();
        if (nameNode && nameNode.getText() === identifier.getText()) {
            return true;
        }
        return false;
    }
    return parentKind === ts_morph_1.SyntaxKind.Parameter ||
        parentKind === ts_morph_1.SyntaxKind.FunctionDeclaration ||
        parentKind === ts_morph_1.SyntaxKind.ClassDeclaration ||
        parentKind === ts_morph_1.SyntaxKind.InterfaceDeclaration ||
        parentKind === ts_morph_1.SyntaxKind.TypeAliasDeclaration ||
        parentKind === ts_morph_1.SyntaxKind.EnumDeclaration;
}
/**
 * Check if the parent context is a write operation
 * @param parent - Parent node
 * @param parentKind - Parent node kind
 * @returns true if it's a write context
 */
function isWriteContext(parent, parentKind) {
    // Check if it's the left side of an assignment
    if (parentKind === ts_morph_1.SyntaxKind.BinaryExpression) {
        const left = parent.getLeft();
        const operatorKind = parent.getOperatorToken().getKind();
        // Only consider it a write if it's an assignment operator AND this is the left side
        if (operatorKind === ts_morph_1.SyntaxKind.EqualsToken ||
            operatorKind === ts_morph_1.SyntaxKind.PlusEqualsToken ||
            operatorKind === ts_morph_1.SyntaxKind.MinusEqualsToken ||
            operatorKind === ts_morph_1.SyntaxKind.AsteriskEqualsToken ||
            operatorKind === ts_morph_1.SyntaxKind.SlashEqualsToken) {
            if (left && left.getText() === parent.getText()) {
                return true;
            }
        }
    }
    // Check if it's a setState call (write operation)
    if (parentKind === ts_morph_1.SyntaxKind.CallExpression) {
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
function isImportExportContext(parent, parentKind) {
    return parentKind === ts_morph_1.SyntaxKind.ImportDeclaration ||
        parentKind === ts_morph_1.SyntaxKind.ExportDeclaration ||
        parentKind === ts_morph_1.SyntaxKind.ImportSpecifier ||
        parentKind === ts_morph_1.SyntaxKind.ExportSpecifier;
}
/**
 * Create a UseSite object from an identifier
 * @param varName - Variable name
 * @param identifier - ts-morph Identifier
 * @param filePath - Source file path
 * @param sourceFile - ts-morph SourceFile
 * @returns UseSite or null
 */
function createUseSite(varName, identifier, filePath, sourceFile) {
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
    }
    catch (error) {
        return null;
    }
}
/**
 * Find the enclosing function for a node
 * @param node - ts-morph node
 * @returns Function name or 'module' if not in a function
 */
function findEnclosingFunction(node) {
    try {
        // Traverse up to find function declaration
        let current = node;
        while (current) {
            const kind = current.getKind();
            if (kind === ts_morph_1.SyntaxKind.FunctionDeclaration ||
                kind === ts_morph_1.SyntaxKind.FunctionExpression ||
                kind === ts_morph_1.SyntaxKind.ArrowFunction ||
                kind === ts_morph_1.SyntaxKind.MethodDeclaration) {
                // Try to get the function name
                const nameNode = current.getName();
                if (nameNode) {
                    return nameNode;
                }
                // For arrow functions without names, try to get from parent variable
                const parent = current.getParent();
                if (parent && parent.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration) {
                    return parent.getName();
                }
                // Fallback to anonymous
                return '<anonymous>';
            }
            current = current.getParent();
        }
        return 'module';
    }
    catch (error) {
        return 'module';
    }
}
//# sourceMappingURL=use-sites.js.map