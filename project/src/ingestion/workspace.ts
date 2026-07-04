/**
 * Workspace-scoped ts-morph Project for cross-file analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Project } from 'ts-morph';

const SOURCE_GLOBS = ['**/*.{ts,tsx,js,jsx}'];

export function findNearestTsConfig(startDir: string): string | null {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    if (dir === root) {
      return null;
    }
    dir = path.dirname(dir);
  }
}

export function createWorkspaceProject(workspaceRoot: string, entryFile?: string): Project {
  const root = path.resolve(workspaceRoot);
  const project = new Project({
    compilerOptions: {
      allowJs: true,
      esModuleInterop: true,
    },
  });

  const startDir = entryFile ? path.dirname(path.resolve(entryFile)) : root;
  const tsConfig = findNearestTsConfig(startDir);

  if (tsConfig) {
    project.addSourceFilesFromTsConfig(tsConfig);
    project.resolveSourceFileDependencies();
  } else {
    for (const pattern of SOURCE_GLOBS) {
      project.addSourceFilesAtPaths(path.join(root, pattern).replace(/\\/g, '/'));
    }
  }

  return project;
}
