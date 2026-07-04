/**
 * Text-based contract extraction for Python sources.
 */

import * as fs from 'fs';
import { Contract, UseSite, WriteSite, validateContract } from './contract-types';

const KEYWORDS = new Set([
  'if', 'elif', 'else', 'for', 'while', 'def', 'class', 'return', 'import', 'from',
  'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'lambda',
  'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'global', 'nonlocal',
]);

const ASSIGN_RE = /^(\s*)([A-Za-z_]\w*)\s*(?:[+\-*\/%]?=)/;
const DEF_RE = /^(\s*)def\s+([A-Za-z_]\w*)\s*\(/;
const CLASS_RE = /^(\s*)class\s+([A-Za-z_]\w*)/;

function stripComment(line: string): string {
  const hash = line.indexOf('#');
  return hash >= 0 ? line.slice(0, hash) : line;
}

function enclosingFunction(lines: string[], lineIndex: number): string {
  let func = '<module>';
  for (let i = lineIndex; i >= 0; i--) {
    const defMatch = DEF_RE.exec(lines[i]);
    if (defMatch) {
      return defMatch[2];
    }
    const classMatch = CLASS_RE.exec(lines[i]);
    if (classMatch) {
      return classMatch[2];
    }
  }
  return func;
}

function isDefinitionLine(line: string, name: string): boolean {
  const stripped = stripComment(line).trim();
  const match = ASSIGN_RE.exec(stripped);
  return match?.[2] === name && !stripped.includes('==');
}

export function buildPythonContracts(filePath: string): Contract[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const lines = source.split(/\r?\n/);
  const writeSites: WriteSite[] = [];
  const useSites: UseSite[] = [];
  const definitions = new Map<string, { line: number; column: number }>();

  lines.forEach((rawLine, index) => {
    const line = stripComment(rawLine);
    const lineNo = index + 1;
    const assignMatch = ASSIGN_RE.exec(line.trimStart());
    if (assignMatch) {
      const name = assignMatch[2];
      if (KEYWORDS.has(name)) {
        return;
      }
      if (!definitions.has(name)) {
        definitions.set(name, { line: lineNo, column: assignMatch[1].length + 1 });
      }
      writeSites.push({
        variableName: name,
        file: filePath,
        line: lineNo,
        column: assignMatch[1].length + 1,
        enclosingFunction: enclosingFunction(lines, index),
        assignmentType: line.includes('+=') ? '+=' : '=',
      });
    }

    const readPattern = /\b([A-Za-z_]\w*)\b/g;
    let readMatch: RegExpExecArray | null;
    while ((readMatch = readPattern.exec(line)) !== null) {
      const name = readMatch[1];
      if (KEYWORDS.has(name)) {
        continue;
      }
      if (assignMatch && readMatch.index === assignMatch.index + assignMatch[1].length) {
        continue;
      }
      useSites.push({
        variableName: name,
        file: filePath,
        line: lineNo,
        column: readMatch.index + 1,
        enclosingFunction: enclosingFunction(lines, index),
      });
    }
  });

  const names = new Set<string>([
    ...writeSites.map(w => w.variableName),
    ...definitions.keys(),
  ]);

  const contracts: Contract[] = [];
  for (const name of names) {
    const def = definitions.get(name);
    if (!def) {
      continue;
    }
    const contract = validateContract({
      variableName: name,
      definedAt: { file: filePath, line: def.line, column: def.column },
      writeSites: writeSites.filter(w => w.variableName === name),
      useSites: useSites.filter(u => u.variableName === name),
      triggeredBy: [],
      source: 'inferred',
    });
    if (contract && (contract.writeSites.length > 0 || contract.useSites.length > 1)) {
      contracts.push(contract);
    }
  }

  return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}
