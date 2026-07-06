/**
 * Resolve relative import specifiers to workspace file paths (1-hop cluster).
 */

import * as fs from 'fs';
import * as path from 'path';

const TRY_SUFFIXES = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '/index.ts',
  '/index.tsx',
  '/index.js',
];

export function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith('.') || specifier.startsWith('/');
}

/** Returns absolute path when a local file exists; null for packages / unresolved. */
export function resolveImportPath(fromFile: string, specifier: string): string | null {
  if (!isRelativeSpecifier(specifier)) {
    return null;
  }
  const base = path.dirname(path.resolve(fromFile));
  const raw = path.resolve(base, specifier);
  for (const suffix of TRY_SUFFIXES) {
    const candidate = raw + suffix;
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return path.normalize(candidate);
      }
    } catch {
      // skip
    }
  }
  return null;
}
