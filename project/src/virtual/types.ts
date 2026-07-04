/**
 * Virtual File session types (runtime artifacts, not Lucid IR).
 */

import { ProjectionSlice } from '../projection/def-use-slice';

export interface DocumentSegment {
  id: string;
  kind: string;
  sourceFile: string;
  sourceLine: number;
  virtualStartLine: number;
  virtualEndLine: number;
  collapsed: boolean;
  enclosingFunction: string;
}

export interface VirtualDocument {
  text: string;
  segments: DocumentSegment[];
}

export interface Lineage {
  virtualUri: string;
  sourceFile: string;
  viewType: string;
  scopeId: string;
  forkOf?: string;
  forkTarget?: string;
}

export interface VirtualSession {
  viewType: string;
  scopeId: string;
  sourceFilePath: string;
  slice: ProjectionSlice;
  document: VirtualDocument;
  pulledSnapshot: string;
  collapsedFunctions: Set<string>;
  selectedSegmentIds: Set<string>;
  lineage: Lineage;
}

export interface PushResult {
  updatedFiles: string[];
  updatedLines: number;
}

export interface ForkResult {
  targetPath: string;
  kind: 'function' | 'file';
}
