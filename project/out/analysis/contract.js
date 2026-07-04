"use strict";
/**
 * Def-use contract builder — routes by language (TS/JS, Python, C/C++).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildContracts = buildContracts;
exports.buildContractsWorkspace = buildContractsWorkspace;
const ts_morph_1 = require("ts-morph");
const language_1 = require("../ingestion/language");
const workspace_1 = require("../ingestion/workspace");
const cross_file_1 = require("./cross-file");
const symbols_1 = require("../ingestion/symbols");
const write_sites_1 = require("./write-sites");
const use_sites_1 = require("./use-sites");
const python_contract_1 = require("./python-contract");
const cpp_contract_1 = require("./cpp-contract");
const contract_types_1 = require("./contract-types");
function buildTsContractsWorkspace(filePath, workspaceRoot) {
    const project = (0, workspace_1.createWorkspaceProject)(workspaceRoot, filePath);
    const contracts = [];
    const symbolTable = (0, symbols_1.extractSymbolTable)(filePath);
    const localWriteSites = (0, write_sites_1.findWriteSites)(filePath);
    const localUseSites = (0, use_sites_1.findUseSites)(filePath);
    const project2 = new ts_morph_1.Project({ compilerOptions: { allowJs: true } });
    const sourceFile = project2.addSourceFileAtPath(filePath);
    const targetNames = new Set();
    for (const ws of localWriteSites) {
        if (ws.variableName.startsWith('set') && ws.variableName.length > 3) {
            const stateName = ws.variableName.slice(3).charAt(0).toLowerCase() + ws.variableName.slice(4);
            targetNames.add(stateName);
        }
        else {
            targetNames.add(ws.variableName);
        }
    }
    for (const state of symbolTable.stateDeclarations) {
        targetNames.add(state.name);
    }
    for (const variable of symbolTable.variables) {
        if (variable.type === 'let' || variable.type === 'var') {
            targetNames.add(variable.name);
        }
    }
    for (const name of targetNames) {
        const crossUse = (0, cross_file_1.findCrossFileUseSites)(project, filePath, name);
        const crossWrite = (0, cross_file_1.findCrossFileWriteSites)(project, filePath, name);
        const writeSites = mergeWriteSites(localWriteSites, crossWrite, name);
        const useSites = mergeUseSites(localUseSites, crossUse, name);
        const triggers = extractTriggersForVariable(name, sourceFile);
        const contract = buildContractForVariable(name, symbolTable, writeSites, useSites, triggers);
        if (contract) {
            const validated = (0, contract_types_1.validateContract)(contract);
            if (validated) {
                contracts.push(validated);
            }
        }
    }
    return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}
function mergeUseSites(local, cross, varName) {
    const merged = new Map();
    for (const site of [...local, ...cross]) {
        if (site.variableName !== varName) {
            continue;
        }
        merged.set(`${site.file}:${site.line}:${site.column}`, site);
    }
    return [...merged.values()];
}
function mergeWriteSites(local, cross, varName) {
    const setter = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    const merged = new Map();
    for (const site of [...local, ...cross]) {
        if (site.variableName !== varName && site.variableName !== setter) {
            continue;
        }
        merged.set(`${site.file}:${site.line}:${site.column}`, site);
    }
    return [...merged.values()];
}
function buildTsContracts(filePath) {
    const contracts = [];
    const symbolTable = (0, symbols_1.extractSymbolTable)(filePath);
    const writeSites = (0, write_sites_1.findWriteSites)(filePath);
    const useSites = (0, use_sites_1.findUseSites)(filePath);
    // Initialize ts-morph project to analyze event triggers
    const project = new ts_morph_1.Project({
        compilerOptions: {
            allowJs: true,
        },
    });
    const sourceFile = project.addSourceFileAtPath(filePath);
    const targetNames = new Set();
    for (const ws of writeSites) {
        // If it is a setter like setCount, map it back to count
        if (ws.variableName.startsWith('set') && ws.variableName.length > 3) {
            const stateName = ws.variableName.slice(3).charAt(0).toLowerCase() + ws.variableName.slice(4);
            targetNames.add(stateName);
        }
        else {
            targetNames.add(ws.variableName);
        }
    }
    for (const state of symbolTable.stateDeclarations) {
        targetNames.add(state.name);
    }
    for (const variable of symbolTable.variables) {
        if (variable.type === 'let' || variable.type === 'var') {
            targetNames.add(variable.name);
        }
    }
    for (const name of targetNames) {
        const triggers = extractTriggersForVariable(name, sourceFile);
        const contract = buildContractForVariable(name, symbolTable, writeSites, useSites, triggers);
        if (contract) {
            const validated = (0, contract_types_1.validateContract)(contract);
            if (validated) {
                contracts.push(validated);
            }
        }
    }
    return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}
function buildContractForVariable(varName, symbolTable, allWriteSites, allUseSites, triggeredBy) {
    const setterName = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    const variableWriteSites = allWriteSites.filter(ws => ws.variableName === varName || ws.variableName === setterName);
    const variableUseSites = allUseSites.filter(us => us.variableName === varName);
    const decl = symbolTable.stateDeclarations.find(v => v.name === varName) ??
        symbolTable.variables.find(v => v.name === varName);
    if (!decl && variableWriteSites.length === 0) {
        return null;
    }
    const definedAt = decl
        ? { file: decl.file, line: decl.line, column: decl.column }
        : {
            file: variableWriteSites[0]?.file ?? '',
            line: variableWriteSites[0]?.line ?? 1,
            column: variableWriteSites[0]?.column ?? 1,
        };
    if (!definedAt.file) {
        return null;
    }
    return {
        variableName: varName,
        definedAt,
        writeSites: variableWriteSites.map(ws => ({
            ...ws,
            assignmentType: String(ws.assignmentType),
        })),
        useSites: variableUseSites,
        triggeredBy,
        source: 'inferred',
    };
}
/**
 * Extract event triggers for a specific state variable in TS/JS files
 */
function extractTriggersForVariable(varName, sourceFile) {
    const setterName = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
    const triggers = [];
    const seen = new Set();
    const addTrigger = (event, line) => {
        const key = `${event}:${line}`;
        if (!seen.has(key)) {
            seen.add(key);
            triggers.push({ event, line });
        }
    };
    // Find all binary expressions (assignments) to varName
    const binaryExpressions = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.BinaryExpression);
    for (const binaryExpr of binaryExpressions) {
        const left = binaryExpr.getLeft();
        if (left && left.getText() === varName) {
            const operatorKind = binaryExpr.getOperatorToken().getKind();
            if (isAssignmentOperator(operatorKind)) {
                findTriggersForNode(binaryExpr, sourceFile, addTrigger);
            }
        }
    }
    // Find all call expressions to setterName
    const callExpressions = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
        const expr = callExpr.getExpression();
        if (expr && expr.getText() === setterName) {
            findTriggersForNode(callExpr, sourceFile, addTrigger);
        }
    }
    return triggers.sort((a, b) => a.line - b.line);
}
function isAssignmentOperator(kind) {
    return kind === ts_morph_1.SyntaxKind.EqualsToken ||
        kind === ts_morph_1.SyntaxKind.PlusEqualsToken ||
        kind === ts_morph_1.SyntaxKind.MinusEqualsToken ||
        kind === ts_morph_1.SyntaxKind.AsteriskEqualsToken ||
        kind === ts_morph_1.SyntaxKind.SlashEqualsToken;
}
function findTriggersForNode(node, sourceFile, addTrigger) {
    // 1. Walk up the AST to see if it is inside an inline JSX handler
    let current = node;
    let inJsxAttribute = false;
    while (current) {
        if (current.getKind() === ts_morph_1.SyntaxKind.JsxAttribute) {
            const name = getJsxAttributeName(current);
            if (name.startsWith('on') && name.length > 2) {
                const start = current.getStart();
                const line = sourceFile.getLineAndColumnAtPos(start).line;
                addTrigger(name, line);
                inJsxAttribute = true;
                break;
            }
        }
        current = current.getParent();
    }
    if (inJsxAttribute)
        return;
    // 2. Otherwise find the enclosing function and trace references/calls to it
    const enclosingFnName = findEnclosingFunctionName(node);
    if (enclosingFnName && enclosingFnName !== 'module' && enclosingFnName !== '<anonymous>') {
        const fnsTriggers = getTriggersForFunction(enclosingFnName, sourceFile);
        for (const t of fnsTriggers) {
            addTrigger(t.event, t.line);
        }
    }
}
function findEnclosingFunctionName(node) {
    let current = node.getParent();
    while (current) {
        const kind = current.getKind();
        if (kind === ts_morph_1.SyntaxKind.FunctionDeclaration ||
            kind === ts_morph_1.SyntaxKind.FunctionExpression ||
            kind === ts_morph_1.SyntaxKind.ArrowFunction ||
            kind === ts_morph_1.SyntaxKind.MethodDeclaration) {
            const nameNode = current.getName ? current.getName() : null;
            if (nameNode) {
                return typeof nameNode === 'string' ? nameNode : nameNode.getText();
            }
            const parent = current.getParent();
            if (parent && parent.getKind() === ts_morph_1.SyntaxKind.VariableDeclaration) {
                return parent.getName();
            }
            return '<anonymous>';
        }
        current = current.getParent();
    }
    return 'module';
}
function getTriggersForFunction(fnName, sourceFile, visited = new Set()) {
    if (visited.has(fnName))
        return [];
    visited.add(fnName);
    const triggers = [];
    // Find JSX attributes that reference this function directly
    const jsxAttributes = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.JsxAttribute);
    for (const attr of jsxAttributes) {
        const name = getJsxAttributeName(attr);
        if (name.startsWith('on') && name.length > 2) {
            const initializer = attr.getInitializer();
            if (initializer && initializer.getKind() === ts_morph_1.SyntaxKind.JsxExpression) {
                const expression = initializer.getExpression();
                if (expression && expression.getKind() === ts_morph_1.SyntaxKind.Identifier && expression.getText() === fnName) {
                    const start = attr.getStart();
                    const line = sourceFile.getLineAndColumnAtPos(start).line;
                    triggers.push({ event: name, line });
                }
            }
        }
    }
    // Find other functions that call this function, and trace them
    const identifiers = sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.Identifier);
    for (const id of identifiers) {
        if (id.getText() === fnName) {
            const parent = id.getParent();
            if (parent && parent.getKind() === ts_morph_1.SyntaxKind.CallExpression && parent.getExpression() === id) {
                const enclosingFn = findEnclosingFunctionName(id);
                if (enclosingFn && enclosingFn !== 'module' && enclosingFn !== '<anonymous>') {
                    const parentTriggers = getTriggersForFunction(enclosingFn, sourceFile, visited);
                    triggers.push(...parentTriggers);
                }
            }
        }
    }
    return dedupeTriggers(triggers);
}
function getJsxAttributeName(attr) {
    if (!attr) {
        return '';
    }
    if (typeof attr.getName === 'function') {
        const name = attr.getName();
        if (typeof name === 'string') {
            return name;
        }
        if (name && typeof name.getText === 'function') {
            return name.getText();
        }
    }
    if (typeof attr.getNameNode === 'function') {
        const nameNode = attr.getNameNode();
        if (nameNode && typeof nameNode.getText === 'function') {
            return nameNode.getText();
        }
    }
    return '';
}
function dedupeTriggers(triggers) {
    const seen = new Set();
    const unique = [];
    for (const trigger of triggers) {
        const key = `${trigger.event}:${trigger.line}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(trigger);
        }
    }
    return unique.sort((a, b) => a.line - b.line || a.event.localeCompare(b.event));
}
/**
 * Build def-use contracts for all trackable mutable state in a source file.
 */
function buildContracts(filePath) {
    switch ((0, language_1.detectLanguage)(filePath)) {
        case 'python':
            return (0, python_contract_1.buildPythonContracts)(filePath);
        case 'cpp':
            return (0, cpp_contract_1.buildCppContracts)(filePath);
        case 'typescript':
            return buildTsContracts(filePath);
        default:
            return [];
    }
}
function buildContractsWorkspace(filePath, workspaceRoot) {
    switch ((0, language_1.detectLanguage)(filePath)) {
        case 'python':
            return (0, python_contract_1.buildPythonContracts)(filePath);
        case 'cpp':
            return (0, cpp_contract_1.buildCppContracts)(filePath);
        case 'typescript':
            return buildTsContractsWorkspace(filePath, workspaceRoot);
        default:
            return [];
    }
}
//# sourceMappingURL=contract.js.map