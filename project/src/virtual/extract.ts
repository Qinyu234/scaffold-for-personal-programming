/**
 * Read source lines for Projection Slice Cut.
 */

import * as fs from 'fs';

export function readSourceLines(filePath: string): string[] {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw.split(/\r?\n/);
}

export function getLineContent(lines: string[], lineNumber: number): string {
  if (lineNumber < 1 || lineNumber > lines.length) {
    return '';
  }
  return lines[lineNumber - 1];
}

export function writeSourceLines(filePath: string, lines: string[]): void {
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

export function replaceSourceLine(filePath: string, lineNumber: number, newContent: string): void {
  const lines = readSourceLines(filePath);
  if (lineNumber < 1 || lineNumber > lines.length) {
    return;
  }
  lines[lineNumber - 1] = newContent;
  writeSourceLines(filePath, lines);
}

export function replaceSourceRange(
  filePath: string,
  startLine: number,
  endLine: number,
  newLines: string[],
): void {
  const lines = readSourceLines(filePath);
  if (startLine < 1 || endLine < startLine || startLine > lines.length) {
    return;
  }
  const end = Math.min(endLine, lines.length);
  lines.splice(startLine - 1, end - startLine + 1, ...newLines);
  writeSourceLines(filePath, lines);
}
