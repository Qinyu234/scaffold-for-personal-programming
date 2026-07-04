/**
 * Text-based contract extraction for C/C++ sources.
 */

import * as fs from 'fs';
import { Contract, UseSite, WriteSite, validateContract } from './contract-types';

const KEYWORDS = new Set([
  'if', 'else', 'for', 'while', 'switch', 'case', 'return', 'break', 'continue',
  'class', 'struct', 'namespace', 'using', 'template', 'typename', 'public',
  'private', 'protected', 'virtual', 'override', 'const', 'static', 'void',
  'int', 'float', 'double', 'bool', 'char', 'auto', 'new', 'delete', 'sizeof',
]);

const DECL_RE =
  /^\s*(?:const\s+)?(?:static\s+)?(?:auto\s+)?(?:[\w:<>,\s*&]+?\s+)([A-Za-z_]\w*)\s*(?:=\s*[^;]+)?\s*;/;
const ASSIGN_RE = /\b([A-Za-z_]\w*)\s*(?:[+\-*\/%]?=)/;
const FUNC_RE = /^\s*(?:[\w:<>,\s*&]+?\s+)?([A-Za-z_]\w*)\s*\([^;]*\)\s*(?:const\s*)?\{?\s*$/;

function stripComment(line: string): string {
  const slash = line.indexOf('//');
  return slash >= 0 ? line.slice(0, slash) : line;
}

function enclosingFunction(lines: string[], lineIndex: number): string {
  for (let i = lineIndex; i >= 0; i--) {
    const match = FUNC_RE.exec(lines[i]);
    if (match && !KEYWORDS.has(match[1])) {
      return match[1];
    }
  }
  return '<global>';
}

export function buildCppContracts(filePath: string): Contract[] {
  const source = fs.readFileSync(filePath, 'utf-8');
  const lines = source.split(/\r?\n/);
  const writeSites: WriteSite[] = [];
  const useSites: UseSite[] = [];
  const definitions = new Map<string, { line: number; column: number }>();

  lines.forEach((rawLine, index) => {
    const line = stripComment(rawLine);
    const lineNo = index + 1;

    const declMatch = DECL_RE.exec(line);
    if (declMatch) {
      const name = declMatch[1];
      if (!KEYWORDS.has(name) && !definitions.has(name)) {
        definitions.set(name, { line: lineNo, column: (declMatch.index ?? 0) + 1 });
      }
    }

    const assignMatch = ASSIGN_RE.exec(line);
    if (assignMatch) {
      const name = assignMatch[1];
      if (KEYWORDS.has(name) || line.includes('==') || line.includes('!=')) {
        return;
      }
      if (!definitions.has(name)) {
        definitions.set(name, { line: lineNo, column: (assignMatch.index ?? 0) + 1 });
      }
      writeSites.push({
        variableName: name,
        file: filePath,
        line: lineNo,
        column: (assignMatch.index ?? 0) + 1,
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
    if (contract && contract.writeSites.length > 0) {
      contracts.push(contract);
    }
  }

  return contracts.sort((a, b) => a.variableName.localeCompare(b.variableName));
}
