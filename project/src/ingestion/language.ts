/**
 * Detect source language from file extension.
 */

export type SourceLanguage = 'typescript' | 'python' | 'cpp' | 'unknown';

const TS_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const PY_EXT = new Set(['.py', '.pyw']);
const CPP_EXT = new Set(['.cpp', '.cc', '.cxx', '.c', '.h', '.hpp', '.hh']);

export function detectLanguage(filePath: string): SourceLanguage {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  if (TS_EXT.has(ext)) {
    return 'typescript';
  }
  if (PY_EXT.has(ext)) {
    return 'python';
  }
  if (CPP_EXT.has(ext)) {
    return 'cpp';
  }
  return 'unknown';
}

export function languageFenceTag(language: SourceLanguage): string {
  switch (language) {
    case 'typescript':
      return 'typescript';
    case 'python':
      return 'python';
    case 'cpp':
      return 'cpp';
    default:
      return 'text';
  }
}

export function isSupportedSourceFile(filePath: string): boolean {
  return detectLanguage(filePath) !== 'unknown';
}
