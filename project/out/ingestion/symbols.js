"use strict";
/**
 * Symbol table extraction for TypeScript/JavaScript files
 * Based on PLAN.md Task 1.2: Symbol table extraction — find all variable and state declarations
 *
 * Tech: ts-morph (npm: ts-morph) — wraps TypeScript Compiler API
 *
 * Acceptance criteria:
 * - detects all variable declarations (const, let, var)
 * - detects useState() calls and extracts state name
 * - records definition site (file, line, column)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractSymbolTable = extractSymbolTable;
const ts_morph_1 = require("ts-morph");
/**
 * Extract symbol table from a source file
 * @param filePath - Path to the source file
 * @returns SymbolTable with variable and state declarations
 */
function extractSymbolTable(filePath) {
    const symbolTable = {
        variables: [],
        stateDeclarations: [],
    };
    try {
        const project = new ts_morph_1.Project({
            compilerOptions: {
                allowJs: true,
            },
        });
        const sourceFile = project.addSourceFileAtPath(filePath);
        // Extract variable declarations
        const variableDeclarations = sourceFile.getVariableStatements();
        for (const varStmt of variableDeclarations) {
            const decls = varStmt.getDeclarations();
            for (const varDecl of decls) {
                const decl = extractVariableDeclaration(varDecl, filePath);
                if (decl) {
                    symbolTable.variables.push(decl);
                    // Check if it's a useState call
                    if (decl.isState) {
                        symbolTable.stateDeclarations.push(decl);
                    }
                }
            }
        }
        // Also check for useState in function bodies (e.g., inside React components)
        const callExpressions = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.CallExpression);
        for (const callExpr of callExpressions) {
            const stateDecl = extractUseStateDeclaration(callExpr, filePath);
            if (stateDecl) {
                // Check if we already have this variable
                const existing = symbolTable.variables.find(v => v.name === stateDecl.name);
                if (!existing) {
                    symbolTable.variables.push(stateDecl);
                }
                symbolTable.stateDeclarations.push(stateDecl);
            }
        }
    }
    catch (error) {
        console.error('Error extracting symbol table:', error);
    }
    return symbolTable;
}
/**
 * Extract variable declaration information from ts-morph VariableDeclaration
 * @param varDecl - ts-morph VariableDeclaration
 * @param filePath - Source file path
 * @returns VariableDeclaration or null
 */
function extractVariableDeclaration(varDecl, filePath) {
    try {
        const name = varDecl.getName();
        // Get the parent variable statement to determine the type (const/let/var)
        const parent = varDecl.getParent();
        if (!parent)
            return null;
        const parentText = parent.getFullText().trim();
        let varType = 'const';
        if (parentText.startsWith('let '))
            varType = 'let';
        else if (parentText.startsWith('var '))
            varType = 'var';
        // Get position
        const sourceFile = varDecl.getSourceFile();
        const start = varDecl.getStart();
        const lineCol = sourceFile.getLineAndColumnAtPos(start);
        // Check if it's a useState call
        const initializer = varDecl.getInitializer();
        let isState = false;
        let stateName;
        if (initializer && initializer.getKind() === ts_morph_1.SyntaxKind.CallExpression) {
            const exprText = initializer.getText();
            if (exprText.startsWith('useState(') || exprText.startsWith('React.useState(')) {
                isState = true;
                stateName = name;
            }
        }
        return {
            name,
            type: varType,
            file: filePath,
            line: lineCol.line,
            column: lineCol.column,
            isState,
            stateName,
        };
    }
    catch (error) {
        return null;
    }
}
/**
 * Extract useState declaration from a CallExpression
 * @param callExpr - ts-morph CallExpression
 * @param filePath - Source file path
 * @returns VariableDeclaration or null
 */
function extractUseStateDeclaration(callExpr, filePath) {
    try {
        const exprText = callExpr.getText();
        // Check if it's a useState call (more flexible matching)
        if (!exprText.includes('useState')) {
            return null;
        }
        // Find the parent variable declaration
        const parent = callExpr.getParent();
        if (!parent)
            return null;
        // Check if parent is a variable declaration or array binding pattern
        const parentKind = parent.getKind();
        if (parentKind !== ts_morph_1.SyntaxKind.VariableDeclaration && parentKind !== ts_morph_1.SyntaxKind.ArrayBindingPattern) {
            return null;
        }
        let name;
        let varDecl;
        let varType = 'const';
        // If it's an array binding pattern, extract the first element (the state variable)
        if (parentKind === ts_morph_1.SyntaxKind.ArrayBindingPattern) {
            const elements = parent.getElements();
            if (elements.length === 0)
                return null;
            // Get the first element (the state variable)
            const firstElement = elements[0];
            name = firstElement.getText();
            // Find the variable declaration parent
            const grandParent = parent.getParent();
            if (!grandParent || grandParent.getKind() !== ts_morph_1.SyntaxKind.VariableDeclaration) {
                return null;
            }
            varDecl = grandParent;
        }
        else {
            // Direct variable declaration - might be array destructuring
            varDecl = parent;
            const rawName = varDecl.getName();
            // Check if it's array destructuring pattern like "[count, setCount]"
            if (rawName.startsWith('[') && rawName.endsWith(']')) {
                // Parse the array to get the first element
                const match = rawName.match(/\[(.*?)\]/);
                if (match && match[1]) {
                    const elements = match[1].split(',').map((e) => e.trim());
                    if (elements.length > 0) {
                        name = elements[0];
                    }
                    else {
                        return null;
                    }
                }
                else {
                    return null;
                }
            }
            else {
                name = rawName;
            }
        }
        // Get the parent variable statement to determine the type
        const varStmt = varDecl.getParent();
        if (!varStmt)
            return null;
        const parentText = varStmt.getFullText().trim();
        if (parentText.startsWith('let '))
            varType = 'let';
        else if (parentText.startsWith('var '))
            varType = 'var';
        // Get position
        const sourceFile = varDecl.getSourceFile();
        const start = varDecl.getStart();
        const lineCol = sourceFile.getLineAndColumnAtPos(start);
        return {
            name,
            type: varType,
            file: filePath,
            line: lineCol.line,
            column: lineCol.column,
            isState: true,
            stateName: name,
        };
    }
    catch (error) {
        return null;
    }
}
//# sourceMappingURL=symbols.js.map