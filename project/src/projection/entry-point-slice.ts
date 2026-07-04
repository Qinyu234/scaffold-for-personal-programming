/**
 * Entry Point View (JS/TS): call tree from a function via ts-morph.
 * scopeId = entry function name; layout order = call discovery order (DESIGN.md).
 */

import { Project, SyntaxKind, FunctionDeclaration, SourceFile } from 'ts-morph';
import { detectLanguage } from '../ingestion/language';
import { SourceSpan } from '../analysis/span';
import { ProjectionSlice } from './def-use-slice';

export interface CallEdge {
  caller: string;
  callee: string;
  callLine: number;
}

export interface FunctionSpan {
  name: string;
  file: string;
  startLine: number;
  endLine: number;
  order: number;
}

export interface EntryPointSlice extends ProjectionSlice {
  viewType: 'entry-point';
  entryFunction: string;
  callOrder: string[];
  edges: CallEdge[];
  functions: FunctionSpan[];
}

const BUILTIN_CALLEES = new Set([
  'useState',
  'useEffect',
  'useCallback',
  'useMemo',
  'useRef',
  'useContext',
  'useReducer',
  'console',
  'Math',
  'JSON',
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'parseInt',
  'parseFloat',
  'require',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
]);

function isJsFamily(filePath: string): boolean {
  const lang = detectLanguage(filePath);
  return lang === 'typescript';
}

function calleeName(expr: { getKind(): SyntaxKind; getText(): string; getName?(): string }): string | null {
  const kind = expr.getKind();
  if (kind === SyntaxKind.Identifier) {
    return expr.getText();
  }
  if (kind === SyntaxKind.PropertyAccessExpression && typeof expr.getName === 'function') {
    return expr.getName();
  }
  return null;
}

function findFunctionByName(sourceFile: SourceFile, name: string): FunctionDeclaration | undefined {
  for (const fn of sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)) {
    if (fn.getName() === name) {
      return fn;
    }
  }
  return undefined;
}

function buildFunctionIndex(sourceFile: SourceFile, filePath: string): Map<string, FunctionDeclaration> {
  const index = new Map<string, FunctionDeclaration>();
  for (const fn of sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration)) {
    const name = fn.getName();
    if (name && !index.has(name)) {
      index.set(name, fn);
    }
  }
  return index;
}

function directCallees(fn: FunctionDeclaration): { name: string; line: number }[] {
  const body = fn.getBody();
  if (!body) {
    return [];
  }
  const out: { name: string; line: number }[] = [];
  for (const call of body.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const name = calleeName(call.getExpression());
    if (!name || BUILTIN_CALLEES.has(name) || (name.startsWith('set') && name.length > 3)) {
      continue;
    }
    out.push({ name, line: call.getStartLineNumber() });
  }
  return out;
}

export function listEntryPointFunctions(filePath: string): string[] {
  if (!isJsFamily(filePath)) {
    return [];
  }
  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);
  return [...buildFunctionIndex(sourceFile, filePath).keys()].sort();
}

export function buildEntryPointSlice(filePath: string, entryName: string): EntryPointSlice | null {
  if (!isJsFamily(filePath)) {
    return null;
  }

  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);
  const fnIndex = buildFunctionIndex(sourceFile, filePath);
  const entryFn = fnIndex.get(entryName);
  if (!entryFn) {
    return null;
  }

  const callOrder: string[] = [];
  const edges: CallEdge[] = [];
  const seen = new Set<string>();
  const queue: string[] = [entryName];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (seen.has(current)) {
      continue;
    }
    seen.add(current);
    callOrder.push(current);

    const fn = fnIndex.get(current);
    if (!fn) {
      continue;
    }
    for (const { name, line } of directCallees(fn)) {
      if (!fnIndex.has(name)) {
        continue;
      }
      edges.push({ caller: current, callee: name, callLine: line });
      if (!seen.has(name)) {
        queue.push(name);
      }
    }
  }

  const functions: FunctionSpan[] = callOrder.map((name, order) => {
    const fn = fnIndex.get(name)!;
    return {
      name,
      file: filePath,
      startLine: fn.getStartLineNumber(),
      endLine: fn.getEndLineNumber(),
      order,
    };
  });

  const spans: SourceSpan[] = functions.map(f => ({
    file: f.file,
    line: f.startLine,
    column: 1,
    enclosingFunction: f.name,
    kind: 'define' as const,
    variableName: f.name,
  }));

  return {
    viewType: 'entry-point',
    scopeId: entryName,
    entryFunction: entryName,
    callOrder,
    edges,
    functions,
    spans,
  };
}

export function functionNodeId(name: string): string {
  return `fn:${name}`;
}
