/**
 * Def-use contract builder — routes by language (TS/JS, Python, C/C++).
 */

import { Project, SyntaxKind } from 'ts-morph';
import { detectLanguage } from '../ingestion/language';
import { createWorkspaceProject } from '../ingestion/workspace';
import { findCrossFileUseSites, findCrossFileWriteSites } from './cross-file';
import { extractSymbolTable } from '../ingestion/symbols';
import { findWriteSites } from './write-sites';
import { findUseSites } from './use-sites';
import { buildPythonContracts } from './python-contract';
import { buildCppContracts } from './cpp-contract';
import {
  Contract,
  validateContract,
  WriteSite,
  UseSite,
  TriggeredBy,
} from './contract-types';

export type { Contract, WriteSite, UseSite } from './contract-types';

function buildTsContractsWorkspace(filePath: string, workspaceRoot: string): Contract[] {
  const project = createWorkspaceProject(workspaceRoot, filePath);
  const contracts: Contract[] = [];
  const symbolTable = extractSymbolTable(filePath);
  const localWriteSites = findWriteSites(filePath);
  const localUseSites = findUseSites(filePath);

  const project2 = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project2.addSourceFileAtPath(filePath);

  const targetNames = new Set<string>();
  for (const ws of localWriteSites) {
    if (ws.variableName.startsWith('set') && ws.variableName.length > 3) {
      const stateName = ws.variableName.slice(3).charAt(0).toLowerCase() + ws.variableName.slice(4);
      targetNames.add(stateName);
    } else {
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
    const crossUse = findCrossFileUseSites(project, filePath, name);
    const crossWrite = findCrossFileWriteSites(project, filePath, name);
    const writeSites = mergeWriteSites(localWriteSites, crossWrite, name);
    const useSites = mergeUseSites(localUseSites, crossUse, name);
    const triggers = extractTriggersForVariable(name, sourceFile);
    const contract = buildContractForVariable(name, symbolTable, writeSites, useSites, triggers);
    if (contract) {
      const validated = validateContract(contract);
      if (validated) {
        contracts.push(validated);
      }
    }
  }

  return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}

function mergeUseSites(local: UseSite[], cross: UseSite[], varName: string): UseSite[] {
  const merged = new Map<string, UseSite>();
  for (const site of [...local, ...cross]) {
    if (site.variableName !== varName) {
      continue;
    }
    merged.set(`${site.file}:${site.line}:${site.column}`, site);
  }
  return [...merged.values()];
}

function mergeWriteSites(local: WriteSite[], cross: WriteSite[], varName: string): WriteSite[] {
  const setter = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
  const merged = new Map<string, WriteSite>();
  for (const site of [...local, ...cross]) {
    if (site.variableName !== varName && site.variableName !== setter) {
      continue;
    }
    merged.set(`${site.file}:${site.line}:${site.column}`, site);
  }
  return [...merged.values()];
}

function buildTsContracts(filePath: string): Contract[] {
  const contracts: Contract[] = [];
  const symbolTable = extractSymbolTable(filePath);
  const writeSites = findWriteSites(filePath);
  const useSites = findUseSites(filePath);

  // Initialize ts-morph project to analyze event triggers
  const project = new Project({
    compilerOptions: {
      allowJs: true,
    },
  });
  const sourceFile = project.addSourceFileAtPath(filePath);

  const targetNames = new Set<string>();
  for (const ws of writeSites) {
    // If it is a setter like setCount, map it back to count
    if (ws.variableName.startsWith('set') && ws.variableName.length > 3) {
      const stateName = ws.variableName.slice(3).charAt(0).toLowerCase() + ws.variableName.slice(4);
      targetNames.add(stateName);
    } else {
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
      const validated = validateContract(contract);
      if (validated) {
        contracts.push(validated);
      }
    }
  }

  return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}

function buildContractForVariable(
  varName: string,
  symbolTable: ReturnType<typeof extractSymbolTable>,
  allWriteSites: WriteSite[],
  allUseSites: UseSite[],
  triggeredBy: TriggeredBy[]
): Contract | null {
  const setterName = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
  const variableWriteSites = allWriteSites.filter(
    ws => ws.variableName === varName || ws.variableName === setterName
  );
  const variableUseSites = allUseSites.filter(us => us.variableName === varName);

  const decl =
    symbolTable.stateDeclarations.find(v => v.name === varName) ??
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
function extractTriggersForVariable(
  varName: string,
  sourceFile: any
): TriggeredBy[] {
  const setterName = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
  const triggers: TriggeredBy[] = [];
  const seen = new Set<string>();

  const addTrigger = (event: string, line: number) => {
    const key = `${event}:${line}`;
    if (!seen.has(key)) {
      seen.add(key);
      triggers.push({ event, line });
    }
  };

  // Find all binary expressions (assignments) to varName
  const binaryExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression);
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
  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  for (const callExpr of callExpressions) {
    const expr = callExpr.getExpression();
    if (expr && expr.getText() === setterName) {
      findTriggersForNode(callExpr, sourceFile, addTrigger);
    }
  }

  return triggers.sort((a, b) => a.line - b.line);
}

function isAssignmentOperator(kind: SyntaxKind): boolean {
  return kind === SyntaxKind.EqualsToken ||
         kind === SyntaxKind.PlusEqualsToken ||
         kind === SyntaxKind.MinusEqualsToken ||
         kind === SyntaxKind.AsteriskEqualsToken ||
         kind === SyntaxKind.SlashEqualsToken;
}

function findTriggersForNode(
  node: any,
  sourceFile: any,
  addTrigger: (event: string, line: number) => void
): void {
  // 1. Walk up the AST to see if it is inside an inline JSX handler
  let current = node;
  let inJsxAttribute = false;
  while (current) {
    if (current.getKind() === SyntaxKind.JsxAttribute) {
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

  if (inJsxAttribute) return;

  // 2. Otherwise find the enclosing function and trace references/calls to it
  const enclosingFnName = findEnclosingFunctionName(node);
  if (enclosingFnName && enclosingFnName !== 'module' && enclosingFnName !== '<anonymous>') {
    const fnsTriggers = getTriggersForFunction(enclosingFnName, sourceFile);
    for (const t of fnsTriggers) {
      addTrigger(t.event, t.line);
    }
  }
}

function findEnclosingFunctionName(node: any): string {
  let current = node.getParent();
  while (current) {
    const kind = current.getKind();
    if (kind === SyntaxKind.FunctionDeclaration ||
        kind === SyntaxKind.FunctionExpression ||
        kind === SyntaxKind.ArrowFunction ||
        kind === SyntaxKind.MethodDeclaration) {
      const nameNode = current.getName ? current.getName() : null;
      if (nameNode) {
        return typeof nameNode === 'string' ? nameNode : nameNode.getText();
      }

      const parent = current.getParent();
      if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
        return parent.getName();
      }
      return '<anonymous>';
    }
    current = current.getParent();
  }
  return 'module';
}

function getTriggersForFunction(
  fnName: string,
  sourceFile: any,
  visited: Set<string> = new Set()
): TriggeredBy[] {
  if (visited.has(fnName)) return [];
  visited.add(fnName);

  const triggers: TriggeredBy[] = [];

  // Find JSX attributes that reference this function directly
  const jsxAttributes = sourceFile.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttributes) {
    const name = getJsxAttributeName(attr);
    if (name.startsWith('on') && name.length > 2) {
      const initializer = attr.getInitializer();
      if (initializer && initializer.getKind() === SyntaxKind.JsxExpression) {
        const expression = initializer.getExpression();
        if (expression && expression.getKind() === SyntaxKind.Identifier && expression.getText() === fnName) {
          const start = attr.getStart();
          const line = sourceFile.getLineAndColumnAtPos(start).line;
          triggers.push({ event: name, line });
        }
      }
    }
  }

  // Find other functions that call this function, and trace them
  const identifiers = sourceFile.getDescendantsOfKind(SyntaxKind.Identifier);
  for (const id of identifiers) {
    if (id.getText() === fnName) {
      const parent = id.getParent();
      if (parent && parent.getKind() === SyntaxKind.CallExpression && parent.getExpression() === id) {
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

function getJsxAttributeName(attr: any): string {
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

function dedupeTriggers(triggers: TriggeredBy[]): TriggeredBy[] {
  const seen = new Set<string>();
  const unique: TriggeredBy[] = [];

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
export function buildContracts(filePath: string): Contract[] {
  switch (detectLanguage(filePath)) {
    case 'python':
      return buildPythonContracts(filePath);
    case 'cpp':
      return buildCppContracts(filePath);
    case 'typescript':
      return buildTsContracts(filePath);
    default:
      return [];
  }
}

export function buildContractsWorkspace(filePath: string, workspaceRoot: string): Contract[] {
  switch (detectLanguage(filePath)) {
    case 'python':
      return buildPythonContracts(filePath);
    case 'cpp':
      return buildCppContracts(filePath);
    case 'typescript':
      return buildTsContractsWorkspace(filePath, workspaceRoot);
    default:
      return [];
  }
}
