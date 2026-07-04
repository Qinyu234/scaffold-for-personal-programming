/**
 * push fork — sibling function or file in same directory.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind } from 'ts-morph';
import { detectLanguage } from '../ingestion/language';
import { readSourceLines, writeSourceLines } from './extract';
import { ForkResult } from './types';

export function suggestForkName(baseName: string, kind: 'function' | 'file'): string {
  if (kind === 'function') {
    return `${baseName}Prime`;
  }
  const ext = path.extname(baseName);
  const stem = path.basename(baseName, ext);
  return `${stem}.prime${ext}`;
}

export function forkFunctionInFile(
  filePath: string,
  functionName: string,
  newFunctionName: string,
): ForkResult | null {
  const lang = detectLanguage(filePath);
  if (lang !== 'typescript') {
    return null;
  }

  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);
  const fn = sourceFile.getFunction(functionName);
  if (!fn) {
    return null;
  }

  const text = fn.getText();
  const renamed = text.replace(
    new RegExp(`\\bfunction\\s+${escapeRegExp(functionName)}\\b`),
    `function ${newFunctionName}`,
  );
  sourceFile.addStatements(`\n${renamed}\n`);
  sourceFile.saveSync();

  return { targetPath: filePath, kind: 'function' };
}

export function forkFileInDirectory(sourceFilePath: string, newFileName?: string): ForkResult | null {
  const dir = path.dirname(sourceFilePath);
  const ext = path.extname(sourceFilePath);
  const targetName = newFileName ?? suggestForkName(sourceFilePath, 'file');
  const targetPath = path.join(dir, targetName.endsWith(ext) ? targetName : `${targetName}${ext}`);

  if (fs.existsSync(targetPath)) {
    return null;
  }

  const content = fs.readFileSync(sourceFilePath, 'utf8');
  fs.writeFileSync(targetPath, content, 'utf8');
  return { targetPath, kind: 'file' };
}

/** Python: copy whole file as .prime sibling (dataflow review copy). */
export function forkPythonFileCopy(sourceFilePath: string, newBaseName?: string): ForkResult | null {
  const lang = detectLanguage(sourceFilePath);
  if (lang !== 'python') {
    return null;
  }
  const dir = path.dirname(sourceFilePath);
  const ext = path.extname(sourceFilePath);
  const stem = path.basename(sourceFilePath, ext);
  const targetPath = path.join(dir, `${newBaseName ?? `${stem}.prime`}${ext}`);
  if (fs.existsSync(targetPath)) {
    return null;
  }
  fs.writeFileSync(targetPath, fs.readFileSync(sourceFilePath, 'utf8'), 'utf8');
  return { targetPath, kind: 'file' };
}

export function insertFunctionAfter(
  filePath: string,
  afterFunctionName: string,
  newFunctionSource: string,
): boolean {
  const lines = readSourceLines(filePath);
  const project = new Project({ compilerOptions: { allowJs: true } });
  const sf = project.addSourceFileAtPath(filePath);
  const fn = sf.getFunction(afterFunctionName);
  if (!fn) {
    return false;
  }
  const endLine = fn.getEndLineNumber();
  lines.splice(endLine, 0, '', newFunctionSource);
  writeSourceLines(filePath, lines);
  return true;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
