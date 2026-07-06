/**
 * Structure View: module import dependencies (minimal; ts-morph / Python heuristic).
 * scopeId = module file stem (e.g. CartPanel).
 */

import * as path from 'path';
import * as fs from 'fs';
import { Project } from 'ts-morph';
import { SourceSpan } from '../analysis/span';
import { ProjectionSlice } from './def-use-slice';
import { detectLanguage } from '../ingestion/language';
import { resolveImportPath } from './import-resolve';

export interface ImportEdge {
  source: string;
  target: string;
  label: string;
}

/** One import edge in the focal file's dependency cluster (tier-1 aggregation). */
export interface ClusterMember {
  specifier: string;
  filePath: string | null;
  hop: number;
}

export interface StructureSlice extends ProjectionSlice {
  viewType: 'structure';
  moduleName: string;
  focalFilePath: string;
  members: ClusterMember[];
  edges: ImportEdge[];
}

const PY_IMPORT = /^\s*(?:import\s+([\w.]+)|from\s+([\w.]+)\s+import)/;

function moduleStem(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

function buildJsImports(filePath: string, moduleName: string): { spans: SourceSpan[]; edges: ImportEdge[]; members: ClusterMember[] } {
  const project = new Project({ compilerOptions: { allowJs: true } });
  const sourceFile = project.addSourceFileAtPath(filePath);
  const spans: SourceSpan[] = [];
  const edges: ImportEdge[] = [];
  const members: ClusterMember[] = [];
  const modId = `mod:${moduleName}`;

  for (const imp of sourceFile.getImportDeclarations()) {
    const specifier = imp.getModuleSpecifierValue();
    const line = imp.getStartLineNumber();
    const resolved = resolveImportPath(filePath, specifier);
    members.push({ specifier, filePath: resolved, hop: 1 });
    spans.push({
      file: filePath,
      line,
      column: 1,
      enclosingFunction: '<module>',
      kind: 'import',
      variableName: specifier,
    });
    edges.push({
      source: modId,
      target: depNodeId(specifier),
      label: 'imports',
    });
  }

  return { spans, edges, members };
}

function buildPythonImports(filePath: string, moduleName: string): { spans: SourceSpan[]; edges: ImportEdge[]; members: ClusterMember[] } {
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const spans: SourceSpan[] = [];
  const edges: ImportEdge[] = [];
  const members: ClusterMember[] = [];
  const modId = `mod:${moduleName}`;

  lines.forEach((raw, index) => {
    const match = PY_IMPORT.exec(raw);
    if (!match) {
      return;
    }
    const specifier = match[1] ?? match[2];
    const line = index + 1;
    const resolved = resolveImportPath(filePath, specifier.replace(/\./g, '/'));
    members.push({ specifier, filePath: resolved, hop: 1 });
    spans.push({
      file: filePath,
      line,
      column: 1,
      enclosingFunction: '<module>',
      kind: 'import',
      variableName: specifier,
    });
    edges.push({
      source: modId,
      target: depNodeId(specifier),
      label: 'imports',
    });
  });

  return { spans, edges, members };
}

export function buildStructureSlice(filePath: string): StructureSlice | null {
  const lang = detectLanguage(filePath);
  if (lang === 'unknown') {
    return null;
  }

  const moduleName = moduleStem(filePath);
  const built =
    lang === 'python' ? buildPythonImports(filePath, moduleName) : buildJsImports(filePath, moduleName);

  return {
    viewType: 'structure',
    scopeId: moduleName,
    moduleName,
    focalFilePath: path.resolve(filePath),
    members: built.members,
    spans: built.spans,
    edges: built.edges,
  };
}

export function filePathForStructureNode(nodeId: string, slice: StructureSlice): string | null {
  if (nodeId === moduleNodeId(slice.moduleName)) {
    return slice.focalFilePath;
  }
  if (!nodeId.startsWith('dep:')) {
    return null;
  }
  const specifier = nodeId.slice(4);
  return slice.members.find(m => m.specifier === specifier)?.filePath ?? null;
}

export function moduleNodeId(moduleName: string): string {
  return `mod:${moduleName}`;
}

export function depNodeId(specifier: string): string {
  return `dep:${specifier}`;
}
