/**
 * Cross-file use/write discovery via ts-morph findReferences on a workspace Project.
 */

import * as path from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import { UseSite } from './use-sites';
import { WriteSite } from './write-sites';

function findEnclosingFunction(node: any): string {
  let current = node;
  while (current) {
    const kind = current.getKind();
    if (
      kind === SyntaxKind.FunctionDeclaration ||
      kind === SyntaxKind.FunctionExpression ||
      kind === SyntaxKind.ArrowFunction ||
      kind === SyntaxKind.MethodDeclaration
    ) {
      const nameNode = current.getName?.();
      if (nameNode) {
        return nameNode;
      }
      const parent = current.getParent();
      if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
        return parent.getName();
      }
      return '<anonymous>';
    }
    current = current.getParent();
  }
  return '<module>';
}

function isWriteReference(node: any): boolean {
  const parent = node.getParent();
  if (!parent) {
    return false;
  }
  const kind = parent.getKind();
  if (kind === SyntaxKind.BinaryExpression) {
    const op = parent.getOperatorToken().getKind();
    if (
      op === SyntaxKind.EqualsToken ||
      op === SyntaxKind.PlusEqualsToken ||
      op === SyntaxKind.MinusEqualsToken
    ) {
      return parent.getLeft() === node;
    }
  }
  if (kind === SyntaxKind.CallExpression) {
    const text = parent.getExpression().getText();
    if (text.startsWith('set') && text.length > 3) {
      return true;
    }
  }
  return false;
}

function declarationNodesForVariable(sourceFile: any, varName: string): any[] {
  const nodes: any[] = [];
  for (const decl of sourceFile.getVariableDeclarations()) {
    if (decl.getName() === varName) {
      nodes.push(decl.getNameNode());
    }
  }
  const setter = `set${varName.charAt(0).toUpperCase()}${varName.slice(1)}`;
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = call.getExpression().getText();
    if (expr === setter) {
      nodes.push(call.getExpression());
    }
  }
  for (const binding of sourceFile.getDescendantsOfKind(SyntaxKind.ArrayBindingPattern)) {
    const parent = binding.getParent();
    if (parent?.getKind() === SyntaxKind.VariableDeclaration) {
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

export function findCrossFileUseSites(
  project: Project,
  entryFile: string,
  varName: string,
): UseSite[] {
  const resolvedEntry = path.resolve(entryFile);
  const sourceFile = project.getSourceFile(resolvedEntry);
  if (!sourceFile) {
    return [];
  }

  const sites: UseSite[] = [];
  const seen = new Set<string>();
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
      if (parent?.getKind() === SyntaxKind.VariableDeclaration && parent.getNameNode() === ref) {
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

export function findCrossFileWriteSites(
  project: Project,
  entryFile: string,
  varName: string,
): WriteSite[] {
  const resolvedEntry = path.resolve(entryFile);
  const sourceFile = project.getSourceFile(resolvedEntry);
  if (!sourceFile) {
    return [];
  }

  const sites: WriteSite[] = [];
  const seen = new Set<string>();
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
