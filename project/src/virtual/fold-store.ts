/**
 * Persist fold state under .lucid/state/{stateName}/
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FoldStateFile {
  scopeId: string;
  collapsedFunctions: string[];
}

export function foldStatePath(workspaceRoot: string, stateName: string): string {
  return path.join(workspaceRoot, '.lucid', 'state', stateName, 'fold.json');
}

export function loadFoldState(workspaceRoot: string, stateName: string): Set<string> {
  const filePath = foldStatePath(workspaceRoot, stateName);
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FoldStateFile;
    return new Set(data.collapsedFunctions ?? []);
  } catch {
    return new Set();
  }
}

export function saveFoldState(workspaceRoot: string, stateName: string, collapsed: Set<string>): void {
  const filePath = foldStatePath(workspaceRoot, stateName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const payload: FoldStateFile = {
    scopeId: stateName,
    collapsedFunctions: [...collapsed],
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
}
